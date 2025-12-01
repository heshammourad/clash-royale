"use client";

import { useState, useMemo } from "react";
import { Battle } from "../types";

// Local interface for the calculated stat
interface CardStat {
  name: string;
  isEvo: boolean;
  encounters: number; 
  wins: number;       
  winRate: number;    
  usageRate: number;  
}

export default function OpponentStatsGrid({ battles, cardImages = {} }: { battles: Battle[], cardImages?: Record<string, string> }) {
  const [sortMetric, setSortMetric] = useState<"usage" | "winRate">("usage");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // 1. Aggregate Data
  const stats = useMemo(() => {
    const cardMap = new Map<string, { encounters: number; wins: number; isEvo: boolean }>();
    const totalBattles = battles.length;

    battles.forEach((battle) => {
      const isWin = battle.result === "victory";
      
      const uniqueCardsInDeck = new Set<string>();

      battle.match_data?.opponent_cards?.forEach((c) => {
        const keyName = (c.evolution_level && c.evolution_level > 0) 
          ? `${c.name} (Evo)` 
          : c.name;
        uniqueCardsInDeck.add(keyName);
      });

      uniqueCardsInDeck.forEach((keyName) => {
        const isEvo = keyName.endsWith("(Evo)");
        const current = cardMap.get(keyName) || { encounters: 0, wins: 0, isEvo };
        
        cardMap.set(keyName, {
          encounters: current.encounters + 1,
          wins: current.wins + (isWin ? 1 : 0),
          isEvo
        });
      });
    });

    const statsArray: CardStat[] = [];
    cardMap.forEach((data, name) => {
      statsArray.push({
        name,
        isEvo: data.isEvo,
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
      let valA = sortMetric === "usage" ? a.usageRate : a.winRate;
      let valB = sortMetric === "usage" ? b.usageRate : b.winRate;

      if (valA === valB) {
        valA = a.encounters;
        valB = b.encounters;
      }

      return sortDirection === "desc" ? valB - valA : valA - valB;
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
          <button
            onClick={() => handleSort("usage")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              sortMetric === "usage" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Sort by Usage {sortMetric === "usage" && (sortDirection === "desc" ? "↓" : "↑")}
          </button>
          <button
            onClick={() => handleSort("winRate")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              sortMetric === "winRate" 
                ? "bg-blue-600 text-white" 
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Sort by Win Rate {sortMetric === "winRate" && (sortDirection === "desc" ? "↓" : "↑")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {sortedStats.map((stat) => (
          <div 
            key={stat.name} 
            className={`flex flex-col items-center p-3 rounded-lg border transition-all relative overflow-hidden ${
                stat.isEvo 
                ? "bg-purple-900/20 border-purple-500/50 hover:border-purple-400" 
                : "bg-gray-800 border-gray-700 hover:border-gray-500"
            }`}
          >
            {stat.isEvo && (
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-purple-500 blur-xl opacity-40"></div>
            )}

            <div className={`relative w-16 h-20 mb-2 ${stat.isEvo ? "scale-110" : ""}`}>
              {cardImages[stat.name] ? (
                <img
                  src={cardImages[stat.name]}
                  alt={stat.name}
                  className="object-contain drop-shadow-md w-full h-full"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded">
                  <span className="text-[10px] text-gray-500 text-center px-1 break-words">
                    {stat.name}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full mb-1 z-10">
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5 uppercase font-bold tracking-wider">
                <span>Usage</span>
                <span>{Math.round(stat.usageRate)}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${stat.usageRate}%` }} 
                />
              </div>
              <div className="text-[9px] text-gray-500 text-right mt-0.5">
                {stat.encounters}/{battles.length}
              </div>
            </div>

            <div className="w-full z-10">
              <div className="flex justify-between text-[10px] text-gray-400 mb-0.5 uppercase font-bold tracking-wider">
                <span>Win</span>
                <span className={stat.winRate >= 50 ? "text-green-400" : "text-red-400"}>
                  {Math.round(stat.winRate)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    stat.winRate >= 50 ? "bg-green-500" : "bg-red-500"
                  }`}
                  style={{ width: `${stat.winRate}%` }} 
                />
              </div>
              <div className="text-[9px] text-gray-500 text-right mt-0.5">
                {stat.wins}/{stat.encounters}
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}