"use client";

import { useState, useMemo } from "react";
import { Battle, Card } from "../types";
import OpponentStatsGrid from "./OpponentStatsGrid";
import CardPairStats from "./CardPairStats";
import MatchHistory from "./MatchHistory";
import CardImage from "./CardImage";

interface DeckStat {
  id: string; 
  cards: Card[];
  games: number;
  wins: number;
  winRate: number;
}

export default function BattleDashboard({ 
  battles, 
  cardImages 
}: { 
  battles: Battle[], 
  cardImages: Record<string, string> 
}) {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const MATCHES_PER_PAGE = 10;

  const getDeckId = (cards: Card[]) => {
    return [...cards]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => {
        if (c.evolution_level === 1) return `${c.name}(Evo)`;
        if (c.evolution_level === 2) return `${c.name}(Hero)`;
        return c.name;
      })
      .join(',');
  };

  const myDecks = useMemo(() => {
    const deckMap = new Map<string, DeckStat>();

    battles.forEach((battle) => {
      const myCards = battle.match_data.my_cards || [];
      if (myCards.length === 0) return;

      const deckId = getDeckId(myCards);
      
      // Custom Sort: Evo (1) -> Hero (2) -> Regular (0) -> Alphabetical
      const sortedCards = [...myCards].sort((a, b) => {
        const getPriority = (level?: number) => {
          if (level === 1) return 0; // Evo First
          if (level === 2) return 1; // Hero Second
          return 2;                  // Regular Last
        };

        const priorityA = getPriority(a.evolution_level);
        const priorityB = getPriority(b.evolution_level);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        
        return a.name.localeCompare(b.name);
      });

      const current = deckMap.get(deckId) || { 
        id: deckId, 
        cards: sortedCards, 
        games: 0, 
        wins: 0, 
        winRate: 0 
      };

      current.games += 1;
      if (battle.result === 'victory') current.wins += 1;
      deckMap.set(deckId, current);
    });

    return Array.from(deckMap.values())
      .map(d => ({ ...d, winRate: Math.round((d.wins / d.games) * 100) }))
      .sort((a, b) => b.games - a.games);
  }, [battles]);

  const filteredBattles = useMemo(() => {
    if (!selectedDeckId) return battles;
    return battles.filter(b => {
      const myCards = b.match_data.my_cards || [];
      return getDeckId(myCards) === selectedDeckId;
    });
  }, [battles, selectedDeckId]);

  const overallStats = useMemo(() => {
    let wins = 0; let losses = 0; let draws = 0;
    filteredBattles.forEach(b => {
      if (b.result === 'victory') wins++;
      else if (b.result === 'defeat') losses++;
      else draws++;
    });
    const total = wins + losses + draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { wins, losses, draws, winRate };
  }, [filteredBattles]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * MATCHES_PER_PAGE;
    return filteredBattles.slice(start, start + MATCHES_PER_PAGE);
  }, [filteredBattles, historyPage]);

  const totalPages = Math.ceil(filteredBattles.length / MATCHES_PER_PAGE);

  const handleDeckSelect = (deckId: string | null) => {
    setSelectedDeckId(deckId);
    setHistoryPage(1);
  };

  return (
    <div className="space-y-8">
      
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 overflow-x-auto">
        <h2 className="text-xl font-bold text-white mb-4 sticky left-0">Filter by Your Deck</h2>
        <div className="flex gap-4 min-w-min">
          <button
            onClick={() => handleDeckSelect(null)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all w-32 shrink-0 ${
              selectedDeckId === null
                ? "bg-blue-900/20 border-blue-500 text-white"
                : "bg-gray-800 border-transparent text-gray-400 hover:bg-gray-700"
            }`}
          >
            <span className="text-lg font-bold">All Decks</span>
            <span className="text-xs mt-1">{battles.length} Games</span>
          </button>

          {myDecks.slice(0, 10).map((deck) => (
            <button
              key={deck.id}
              onClick={() => handleDeckSelect(deck.id)}
              className={`relative group flex flex-col p-3 rounded-xl border-2 transition-all shrink-0 ${
                selectedDeckId === deck.id
                  ? "bg-blue-900/20 border-blue-500"
                  : "bg-gray-800 border-transparent hover:bg-gray-750"
              }`}
            >
              <div className="grid grid-cols-4 gap-1 mb-2 w-32">
                {deck.cards.map((card, i) => (
                  <div key={i} className="relative w-7 h-9 bg-black/50 rounded overflow-hidden">
                     <CardImage
                        name={card.name}
                        evolutionLevel={card.evolution_level}
                        cardImages={cardImages}
                        className="w-full h-full"
                        withRing
                     />
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center w-full px-1">
                <span className={`text-xs font-bold ${deck.winRate >= 50 ? "text-green-400" : "text-red-400"}`}>
                  {deck.winRate}% WR
                </span>
                <span className="text-[10px] text-gray-500">{deck.games} Games</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-end gap-4 pb-4 border-b border-gray-800">
        <h2 className="text-2xl font-bold text-white">
          {selectedDeckId ? "Deck Performance" : "Overall Performance"}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
            {filteredBattles.length} Matches
          </span>
          <span className="text-sm font-bold bg-gray-900 px-4 py-1 rounded-full border border-gray-800 flex items-center gap-1.5 shadow-sm">
            <span className={`mr-2 ${overallStats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
              {overallStats.winRate}%
            </span>
            <span className="text-green-400">{overallStats.wins}W</span>
            <span className="text-gray-600">-</span>
            <span className="text-red-400">{overallStats.losses}L</span>
            {overallStats.draws > 0 && <span className="text-gray-500 ml-1 border-l border-gray-700 pl-2">{overallStats.draws}D</span>}
          </span>
        </div>
      </div>

      <section>
        <OpponentStatsGrid battles={filteredBattles} cardImages={cardImages} />
      </section>

      <section className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-6">Synergy Analysis</h2>
        <CardPairStats battles={filteredBattles} cardImages={cardImages} />
      </section>

      <section>
        <h3 className="text-xl font-bold text-white mb-4">Match History</h3>
        <MatchHistory battles={paginatedHistory} cardImages={cardImages} />
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage === 1} className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-bold disabled:opacity-50 hover:bg-gray-700 transition-colors">Previous</button>
            <span className="text-sm text-gray-400">Page {historyPage} of {totalPages}</span>
            <button onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))} disabled={historyPage === totalPages} className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-bold disabled:opacity-50 hover:bg-gray-700 transition-colors">Next</button>
          </div>
        )}
      </section>

    </div>
  );
}