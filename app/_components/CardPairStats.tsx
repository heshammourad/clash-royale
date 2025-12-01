"use client";

import { useMemo } from "react";
import { Battle } from "../types";

interface PairStat {
  cardA: string;
  cardB: string;
  encounters: number;
  wins: number;
  winRate: number;
}

export default function CardPairStats({ battles, cardImages = {} }: { battles: Battle[], cardImages?: Record<string, string> }) {
  
  const pairStats = useMemo(() => {
    const pairMap = new Map<string, { cardA: string; cardB: string; encounters: number; wins: number }>();

    battles.forEach((battle) => {
      const isWin = battle.result === "victory";
      
      const uniqueCards = new Set<string>();
      battle.match_data?.opponent_cards?.forEach((c) => {
        const name = (c.evolution_level && c.evolution_level > 0) ? `${c.name} (Evo)` : c.name;
        uniqueCards.add(name);
      });

      const cards = Array.from(uniqueCards).sort(); 

      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const cardA = cards[i];
          const cardB = cards[j];
          const key = `${cardA}|${cardB}`;

          const current = pairMap.get(key) || { cardA, cardB, encounters: 0, wins: 0 };
          
          pairMap.set(key, {
            cardA, 
            cardB,
            encounters: current.encounters + 1,
            wins: current.wins + (isWin ? 1 : 0),
          });
        }
      }
    });

    const minEncounters = Math.max(3, Math.floor(battles.length * 0.02)); 

    return Array.from(pairMap.values())
      .map(stat => ({
        ...stat,
        winRate: (stat.wins / stat.encounters) * 100
      }))
      .filter(stat => stat.encounters >= minEncounters)
      .sort((a, b) => b.winRate - a.winRate); 

  }, [battles]);

  const bestMatchups = pairStats.slice(0, 10);
  const worstMatchups = [...pairStats].sort((a, b) => a.winRate - b.winRate).slice(0, 10);

  const MatchupRow = ({ stat, rank }: { stat: PairStat, rank: number }) => (
    <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 mb-2">
      <div className="flex items-center gap-3">
        <span className="text-gray-500 font-mono text-sm w-4">#{rank}</span>
        
        <div className="flex -space-x-3">
          {[stat.cardA, stat.cardB].map((name) => (
            <div key={name} className="relative w-10 h-12 z-0 first:z-10 hover:z-20 transition-all hover:scale-110">
              {cardImages[name] ? (
                <img 
                  src={cardImages[name]} 
                  alt={name} 
                  className="object-contain w-full h-full drop-shadow-md"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full bg-gray-700 rounded flex items-center justify-center text-[8px] text-center">
                  {name.split(' ')[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="text-right">
        <div className={`font-bold ${
          stat.winRate >= 50 ? "text-green-400" : "text-red-400"
        }`}>
          {Math.round(stat.winRate)}%
        </div>
        <div className="text-xs text-gray-500">
          {stat.wins}-{stat.encounters - stat.wins} ({stat.encounters})
        </div>
      </div>
    </div>
  );

  if (pairStats.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
      <div>
        <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
          <span>🛡️ Best Matchups</span>
          <span className="text-xs font-normal text-gray-500 bg-gray-900 px-2 py-1 rounded">Highest Win %</span>
        </h3>
        <div className="space-y-1">
          {bestMatchups.map((stat, i) => (
            <MatchupRow key={`${stat.cardA}-${stat.cardB}`} stat={stat} rank={i + 1} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
          <span>💀 Hardest Counters</span>
          <span className="text-xs font-normal text-gray-500 bg-gray-900 px-2 py-1 rounded">Lowest Win %</span>
        </h3>
        <div className="space-y-1">
          {worstMatchups.map((stat, i) => (
            <MatchupRow key={`${stat.cardA}-${stat.cardB}`} stat={stat} rank={i + 1} />
          ))}
        </div>
      </div>

    </div>
  );
}