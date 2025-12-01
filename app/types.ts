export interface Card {
  name: string;
  level: number;
  evolution_level?: number;
}

export interface Battle {
  battle_time: string;
  result: string;
  game_mode: string;
  player_tag: string;
  opponent_tag: string;
  match_data: {
    opponent_cards: Card[];
  };
}