from datetime import datetime
import json
import requests
import os
import psycopg2
from typing import List, Dict, Any

# --- CONFIGURATION ---
API_TOKEN = os.getenv("API_TOKEN")
PLAYER_TAG = os.getenv("PLAYER_TAG")
DB_CONNECTION_STRING = os.getenv("DB_CONNECTION_STRING")

CARD_MODIFIERS = {
    "common": 0,
    "rare": 2,
    "epic": 5,
    "legendary": 8,
    "champion": 10,
}


class Card:

  def __init__(self,
               name: str,
               level: int,
               rarity: str,
               evolution_level: int = 0):
    self.name = name
    self.rarity = rarity
    self.level = level
    self.evolution_level = evolution_level
    self.true_level = self._calculate_true_level()

  def _calculate_true_level(self) -> int:
    modifier = CARD_MODIFIERS.get(self.rarity, 0)
    return self.level + modifier

  def to_dict(self) -> Dict:
    return {
        "name": self.name,
        "true_level": self.true_level,
        "evolution_level": self.evolution_level
    }


class Match:

  def __init__(self, battle_time: datetime, round_id: int, game_mode: str,
               my_crowns: int, opponent_crowns: int, my_cards: List[Card],
               opponent_cards: List[Card], opponent_tag: str):
    self.battle_time = battle_time
    self.round_id = round_id
    self.game_mode = game_mode
    self.my_crowns = my_crowns
    self.opponent_crowns = opponent_crowns
    self.my_cards = my_cards
    self.opponent_cards = opponent_cards
    self.opponent_tag = opponent_tag

    # Calculate result immediately
    if my_crowns > opponent_crowns:
      self.result = "victory"
    elif my_crowns < opponent_crowns:
      self.result = "defeat"
    else:
      self.result = "draw"

  def to_dict(self) -> Dict[str, Any]:
    return {
        "my_crowns": self.my_crowns,
        "opponent_crowns": self.opponent_crowns,
        "my_cards": [card.to_dict() for card in self.my_cards],
        "opponent_cards": [card.to_dict() for card in self.opponent_cards]
    }


def process_card_list(card_data_list: List[Dict[str, Any]]) -> List[Card]:
  cards = []
  for card_data in card_data_list:
    # Handle cases where card level might be missing (sometimes happens in draft)
    if "name" not in card_data:
      continue

    card = Card(name=card_data.get("name", "Unknown"),
                level=card_data.get("level", 1),
                rarity=card_data.get("rarity", "common"),
                evolution_level=card_data.get("evolutionLevel", 0))
    cards.append(card)
  return cards


def format_time(iso_time):
  try:
    return datetime.strptime(iso_time, "%Y%m%dT%H%M%S.%fZ")
  except ValueError:
    return None


def fetch_battle_log():
  if not PLAYER_TAG:
    raise ValueError("PLAYER_TAG environment variable is not set.")
  formatted_tag = PLAYER_TAG.replace("#", "%23")
  url = f"https://proxy.royaleapi.dev/v1/players/{formatted_tag}/battlelog"
  headers = {"Authorization": f"Bearer {API_TOKEN}"}

  response = requests.get(url, headers=headers)
  if response.status_code == 200:
    return response.json()
  return []


def save_to_db(matches: List[Match]):
  try:
    conn = psycopg2.connect(DB_CONNECTION_STRING)
    cur = conn.cursor()
    new_records = 0

    insert_query = """
            INSERT INTO battles 
            (battle_time, round_id, player_tag, opponent_tag, result, game_mode, match_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (player_tag, battle_time, round_id) DO NOTHING;
        """

    for match in matches:
      cur.execute(
          insert_query,
          (
              match.battle_time,
              match.round_id,
              PLAYER_TAG,
              match.opponent_tag,
              match.result,
              match.game_mode,
              json.dumps(match.to_dict())  # Storing your CLEANED data
          ))
      if cur.rowcount > 0:
        new_records += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Inserted {new_records} new matches.")
  except Exception as e:
    print(f"Database Error: {e}")


def run_ingestion():
  raw_data = fetch_battle_log()
  matches = []

  for battle in raw_data:
    # 1. Skip boat battles
    if battle.get("type") == "boatBattle":
      continue

    battle_time = format_time(battle.get("battleTime"))
    if battle_time is None:
      continue  # Skip battles with invalid or missing battleTime
    game_mode = battle.get("type", "Unknown")

    # Determine which team is "us"
    # The API usually puts the authenticated player in team[0] if searching by that player,
    # but checking tags is safer.
    team = battle["team"][0]
    opponent = battle["opponent"][0]

    # Double check that team[0] is actually us
    if team.get("tag") != PLAYER_TAG:
      # If we are not team 0, swap.
      team = battle["opponent"][0]
      opponent = battle["team"][0]

    # 2. Handle River Race Duels
    if battle.get("type").startswith("riverRaceDuel"):
      for i, round_data in enumerate(team.get("rounds", [])):
        try:
          opp_round = opponent["rounds"][i]

          matches.append(
              Match(
                  battle_time=battle_time,
                  round_id=i,  # 0, 1, 2
                  game_mode=game_mode,
                  my_crowns=round_data.get("crowns", 0),
                  opponent_crowns=opp_round.get("crowns", 0),
                  my_cards=process_card_list(round_data["cards"]),
                  opponent_cards=process_card_list(opp_round["cards"]),
                  opponent_tag=opponent.get("tag")))
        except IndexError:
          continue  # Handle cases where round data might be incomplete

    # 3. Handle Single Matches
    else:
      matches.append(
          Match(battle_time=battle_time,
                round_id=0,
                game_mode=game_mode,
                my_crowns=team.get("crowns", 0),
                opponent_crowns=opponent.get("crowns", 0),
                my_cards=process_card_list(team["cards"]),
                opponent_cards=process_card_list(opponent["cards"]),
                opponent_tag=opponent.get("tag")))

  save_to_db(matches)


# This is the "Entry Point" Google Cloud will look for
def cloud_trigger(request):
  """
    HTTP Cloud Function.
    Args:
        request (flask.Request): The request object.
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`.
    """
  print("Cloud Function Triggered!")
  try:
    run_ingestion()
    return "Ingestion Successful", 200
  except Exception as e:
    print(f"Error: {e}")
    return f"Error: {e}", 500


# Keep this for local testing if you want
if __name__ == "__main__":
  run_ingestion()
