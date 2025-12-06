"use client";

import { useMemo } from "react";
import { Battle } from "../types";
import CardImage from "./CardImage";

interface CardId {
  name: string;
  evolutionLevel: number;
}

interface PairStat {
  cardA: CardId;
  cardB: CardId;
  encounters: number;
  wins: number;
  winRate: number;
}

export default function CardPairStats({ 
  battles,
  cardNameFilter,
  cardTypeFilters
}: { 
  battles: Battle[],
  cardNameFilter: string,
  cardTypeFilters: {
    regular: boolean;
    evo: boolean;
    hero: boolean;
  }
}) {
  const pairStats = useMemo(() => {
    const pairMap = new Map<string, { cardA: CardId; cardB: CardId; encounters: number; wins: number }>();

    battles.forEach((battle) => {
      const isWin = battle.result === "victory";
      const uniqueCards = new Set<string>();
      
      battle.match_data?.opponent_cards?.forEach((c) => {
        uniqueCards.add(`${c.name}|${c.evolution_level || 0}`);
      });

      const cards: CardId[] = Array.from(uniqueCards)
        .map(key => {
          const [name, levelStr] = key.split('|');
          return { name, evolutionLevel: parseInt(levelStr, 10) };
        })
        .sort((a, b) => {
          const nameCompare = a.name.localeCompare(b.name);
          if (nameCompare !== 0) return nameCompare;
          return a.evolutionLevel - b.evolutionLevel;
        });

      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const cardA = cards[i];
          const cardB = cards[j];
          const pairKey = `${cardA.name}|${cardA.evolutionLevel}__${cardB.name}|${cardB.evolutionLevel}`;

          const current = pairMap.get(pairKey) || { cardA, cardB, encounters: 0, wins: 0 };
          
          pairMap.set(pairKey, {
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
      .filter(stat => stat.encounters >= minEncounters);

  }, [battles]);

  const filteredPairStats = useMemo(() => {
    let results = pairStats;

    // Apply card name filter
    if (cardNameFilter.trim()) {
      const [name, levelStr] = cardNameFilter.split('|');
      const level = parseInt(levelStr, 10);
      results = results.filter(pair => 
        (pair.cardA.name === name && pair.cardA.evolutionLevel === level) || (pair.cardB.name === name && pair.cardB.evolutionLevel === level)
      );
    }

    // Apply card type filters
    const noTypesSelected = !cardTypeFilters.regular && !cardTypeFilters.evo && !cardTypeFilters.hero;
    if (!noTypesSelected) {
      results = results.filter(pair => {
        const isTypeA = (cardTypeFilters.regular && pair.cardA.evolutionLevel === 0) || (cardTypeFilters.evo && pair.cardA.evolutionLevel === 1) || (cardTypeFilters.hero && pair.cardA.evolutionLevel === 2);
        const isTypeB = (cardTypeFilters.regular && pair.cardB.evolutionLevel === 0) || (cardTypeFilters.evo && pair.cardB.evolutionLevel === 1) || (cardTypeFilters.hero && pair.cardB.evolutionLevel === 2);
        return isTypeA && isTypeB;
      });
    }

    return results;
  }, [pairStats, cardNameFilter, cardTypeFilters]);


  const bestMatchups = [...filteredPairStats].sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.wins - a.wins;
  }).slice(0, 10);

  const worstMatchups = [...filteredPairStats].sort((a, b) => {
    if (a.winRate !== b.winRate) return a.winRate - b.winRate;
    const lossesA = a.encounters - a.wins;
    const lossesB = b.encounters - b.wins;
    return lossesB - lossesA;
  }).slice(0, 10);

  const MatchupRow = ({ stat, rank }: { stat: PairStat, rank: number }) => (
    <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700 mb-2">
      <div className="flex items-center gap-3">
        <span className="text-gray-500 font-mono text-sm w-4">#{rank}</span>
        
        <div className="flex gap-2">
          {[stat.cardA, stat.cardB].map((card) => {
            return (
              <div 
                key={`${card.name}-${card.evolutionLevel}`} 
                className="relative w-10 h-12 transition-all hover:scale-110 rounded-sm bg-gray-900"
              >
                <CardImage
                  name={card.name}
                  evolutionLevel={card.evolutionLevel}
                  withRing={true} 
                  className="w-full h-full"
                />
              </div>
            );
          })}
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

  if (filteredPairStats.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
          <span>🛡️ Best Matchups</span>
          <span className="text-xs font-normal text-gray-500 bg-gray-900 px-2 py-1 rounded">Highest Win %</span>
        </h3>
        <div className="space-y-1">
          {bestMatchups.map((stat, i) => (
            <MatchupRow key={`${stat.cardA.name}-${stat.cardB.name}`} stat={stat} rank={i + 1} />
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
            <MatchupRow key={`${stat.cardA.name}-${stat.cardB.name}`} stat={stat} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}