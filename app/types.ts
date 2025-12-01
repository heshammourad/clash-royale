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
    my_cards: Card[];       // <-- Added this to fix the error
    opponent_cards: Card[];
    my_crowns?: number;     // Optional but available in your DB
    opponent_crowns?: number;
  };
}