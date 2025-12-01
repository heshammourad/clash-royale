export interface Card {
  name: string;
  level: number;
  evolution_level?: number;
}

export interface Battle {
  battle_time: string;
  round_id: number;
  result: string;
  game_mode: string;
  player_tag: string;
  opponent_tag: string;
  match_data: {
    my_cards: Card[];
    opponent_cards: Card[];
    my_crowns?: number;
    opponent_crowns?: number;
  };
}