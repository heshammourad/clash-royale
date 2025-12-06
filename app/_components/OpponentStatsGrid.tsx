"use client";

import { useState, useMemo } from "react";
import { Battle } from "../types";
import CardImage from "./CardImage";

interface CardStat {
  name: string;
  evolutionLevel: number;
  encounters: number; 
  wins: number;       
  winRate: number;    
  usageRate: number;  
}

export default function OpponentStatsGrid({ battles }: { battles: Battle[] }) {
  const [sortMetric, setSortMetric] = useState<"usage" | "winRate">("usage");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // 1. Aggregate Data
  const stats = useMemo(() => {
    const cardMap = new Map<string, { name: string; evolutionLevel: number; encounters: number; wins: number }>();
    const totalBattles = battles.length;

    battles.forEach((battle) => {
      const isWin = battle.result === "victory";
      const uniqueCardsInDeck = new Set<string>();

      battle.match_data?.opponent_cards?.forEach((c) => {
        const key = `${c.name}|${c.evolution_level || 0}`;
        uniqueCardsInDeck.add(key);
      });

      uniqueCardsInDeck.forEach((key) => {
        const [name, levelStr] = key.split('|');
        const evolutionLevel = parseInt(levelStr, 10);

        const current = cardMap.get(key) || { name, evolutionLevel, encounters: 0, wins: 0 };
        
        cardMap.set(key, {
          name, 
          evolutionLevel, 
          encounters: current.encounters + 1,
          wins: current.wins + (isWin ? 1 : 0),
        });
      });
    });

    const statsArray: CardStat[] = [];
    cardMap.forEach((data) => {
      statsArray.push({
        name: data.name,
        evolutionLevel: data.evolutionLevel,
        encounters: data.encounters,
        wins: data.wins,
        winRate: (data.wins / data.encounters) * 100,
        usageRate: (data.encounters / totalBattles) * 100,
      });
    });

    return statsArray;
  }, [battles]);

  // 2. Sort Data
  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      const primaryA = sortMetric === "usage" ? a.usageRate : a.winRate;
      const primaryB = sortMetric === "usage" ? b.usageRate : b.winRate;

      if (primaryA !== primaryB) {
        return sortDirection === "desc" ? primaryB - primaryA : primaryA - primaryB;
      }

      // Secondary sort: by encounters, always descending (more frequent first)
      return b.encounters - a.encounters;
    });
  }, [stats, sortMetric, sortDirection]);

  const handleSort = (metric: "usage" | "winRate") => {
    if (sortMetric === metric) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
    } else {
      setSortMetric(metric);
      setSortDirection("desc");
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-100">Opponent Card Stats</h2>
        <div className="flex gap-2 text-sm">
          <button onClick={() => handleSort("usage")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${sortMetric === "usage" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            Sort by Usage {sortMetric === "usage" && (sortDirection === "desc" ? "↓" : "↑")}
          </button>
          <button onClick={() => handleSort("winRate")} className={`px-4 py-2 rounded-lg font-medium transition-colors ${sortMetric === "winRate" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            Sort by Win Rate {sortMetric === "winRate" && (sortDirection === "desc" ? "↓" : "↑")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {sortedStats.map((stat) => {
          const isEvo = stat.evolutionLevel === 1;
          const isHero = stat.evolutionLevel === 2;

          return (
            <div 
              key={`${stat.name}-${stat.evolutionLevel}`} 
              className={`flex flex-col items-center p-3 rounded-lg border transition-all relative overflow-hidden ${
                  isHero
                  ? "bg-amber-900/20 border-amber-500/50 hover:border-amber-400"
                  : isEvo 
                  ? "bg-purple-900/20 border-purple-500/50 hover:border-purple-400" 
                  : "bg-gray-800 border-gray-700 hover:border-gray-500"
              }`}
            >
              {isEvo && <div className="absolute -top-6 -right-6 w-12 h-12 bg-purple-500 blur-xl opacity-40"></div>}
              {isHero && <div className="absolute -top-6 -right-6 w-12 h-12 bg-amber-500 blur-xl opacity-40"></div>}

              <div className={`relative w-16 h-20 mb-2 ${(isEvo || isHero) ? "scale-110" : ""}`}>
                <CardImage
                  name={stat.name}
                  evolutionLevel={stat.evolutionLevel}
                  className="w-full h-full"
                />
              </div>

              <div className="w-full mb-1 z-10">
                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5 uppercase font-bold tracking-wider">
                  <span>Usage</span>
                  <span>{Math.round(stat.usageRate)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${stat.usageRate}%` }} />
                </div>
                <div className="text-[9px] text-gray-500 text-right mt-0.5">{stat.encounters}/{battles.length}</div>
              </div>

              <div className="w-full z-10">
                <div className="flex justify-between text-[10px] text-gray-400 mb-0.5 uppercase font-bold tracking-wider">
                  <span>Win</span>
                  <span className={stat.winRate >= 50 ? "text-green-400" : "text-red-400"}>{Math.round(stat.winRate)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${stat.winRate >= 50 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${stat.winRate}%` }} />
                </div>
                <div className="text-[9px] text-gray-500 text-right mt-0.5">{stat.wins}/{stat.encounters}</div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}