"use client";

import { Battle, Card } from "../types";
import CardImage from "./CardImage";

const formatGameMode = (mode: string) => {
  switch (mode) {
    case 'trail': 
    case 'PvP': return 'Trophy Road';
    case 'pathOfLegend':
    case 'pathOfLegends': return 'Ranked';
    case 'riverRaceDuel':
    case 'riverRaceDuelColosseum': return 'River Race Duel';
    case 'riverRacePvP': return 'River Race Battle';
    default:
      return mode
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
  }
};

const DeckGrid = ({ cards }: { cards: Card[] }) => {
  const safeCards = [...(cards || []), ...Array(8)].slice(0, 8);

  return (
    <div className="grid grid-cols-4 gap-1 w-full max-w-[180px]">
      {safeCards.map((card, i) => (
        <div key={i} className="relative aspect-[3/4] bg-gray-800 rounded-sm overflow-hidden border border-gray-700">
          {card ? (
            <CardImage 
              name={card.name}
              evolutionLevel={card.evolution_level}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full" />
          )}
        </div>
      ))}
    </div>
  );
};

export default function MatchHistory({ battles }: { battles: Battle[] }) {
  return (
    <div className="space-y-3">
      {battles.map((battle) => {
        const isWin = battle.result === "victory";
        const myCrowns = battle.match_data.my_crowns ?? 0;
        const oppCrowns = battle.match_data.opponent_crowns ?? 0;

        return (
          <div 
            key={`${battle.player_tag}-${battle.battle_time}-${battle.round_id}`}
            className={`flex flex-col md:flex-row items-center gap-4 p-3 rounded-xl border-l-4 shadow-sm transition-all hover:bg-gray-800/50 ${
              isWin 
                ? "bg-gray-900 border-l-green-500" 
                : "bg-gray-900 border-l-red-500"
            }`}
          >
            <div className="flex flex-row md:flex-col justify-between md:justify-center items-center md:items-start w-full md:w-24 shrink-0 gap-1">
              <span className={`text-sm font-black uppercase tracking-wider ${
                isWin ? "text-green-400" : "text-red-400"
              }`}>
                {isWin ? "Victory" : "Defeat"}
              </span>
              <span className="text-xs text-gray-500" suppressHydrationWarning>
                {new Date(battle.battle_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-[10px] text-gray-600 font-mono" suppressHydrationWarning>
                {new Date(battle.battle_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="flex flex-1 items-center justify-between gap-4 w-full">
              
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold">You</span>
                <DeckGrid cards={battle.match_data.my_cards} />
              </div>

              <div className="flex flex-col items-center justify-center px-2">
                <div className="text-2xl font-black text-white flex items-center gap-2">
                  <span className={isWin ? "text-green-400" : "text-gray-400"}>{myCrowns}</span>
                  <span className="text-gray-700 text-sm">-</span>
                  <span className={!isWin ? "text-red-400" : "text-gray-400"}>{oppCrowns}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-bold uppercase mt-1 text-center max-w-[100px] leading-tight">
                  {formatGameMode(battle.game_mode)}
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold truncate max-w-[80px]">
                  {battle.opponent_tag}
                </span>
                <DeckGrid cards={battle.match_data.opponent_cards} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}