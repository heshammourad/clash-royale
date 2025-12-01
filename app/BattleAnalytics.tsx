"use client"; // <--- This marks it as a Client Component

import { useState, useMemo } from "react";

// Define the shape of our data roughly
interface Card {
  name: string;
  level: number;
}

interface MatchData {
  opponent_cards: Card[];
  my_cards: Card[];
  my_crowns: number;
  opponent_crowns: number;
}

interface Battle {
  battle_time: Date;
  result: string;
  game_mode: string;
  opponent_tag: string;
  match_data: MatchData; // The JSONB column
}

export default function BattleAnalytics({ battles }: { battles: any[] }) {
  const [selectedCard, setSelectedCard] = useState<string>("");

  // 1. Extract all unique cards opponents have played against you
  const uniqueOpponentCards = useMemo(() => {
    const cards = new Set<string>();
    battles.forEach((b) => {
      // Safety check: ensure match_data exists
      if (b.match_data && b.match_data.opponent_cards) {
        b.match_data.opponent_cards.forEach((card: Card) => {
          cards.add(card.name);
        });
      }
    });
    return Array.from(cards).sort();
  }, [battles]);

  // 2. Filter battles based on the selection
  const filteredBattles = useMemo(() => {
    if (!selectedCard) return battles;

    return battles.filter((b) => {
      const oppCards = b.match_data?.opponent_cards || [];
      return oppCards.some((c: Card) => c.name === selectedCard);
    });
  }, [selectedCard, battles]);

  // 3. Calculate Stats
  const stats = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let draws = 0;

    filteredBattles.forEach((b) => {
      if (b.result === "victory") wins++;
      else if (b.result === "defeat") losses++;
      else draws++;
    });

    const total = wins + losses + draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return { wins, losses, draws, total, winRate };
  }, [filteredBattles]);

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
      <h2 className="text-xl font-bold mb-4 text-blue-300">
        Performance Analysis
      </h2>

      {/* Card Selector */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">
          Filter by Opponent Card:
        </label>
        <select
          className="w-full md:w-1/2 p-2 bg-gray-900 border border-gray-600 rounded text-white"
          value={selectedCard}
          onChange={(e) => setSelectedCard(e.target.value)}
        >
          <option value="">-- All Battles --</option>
          {uniqueOpponentCards.map((card) => (
            <option key={card} value={card}>
              {card}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatBox label="Total Games" value={stats.total} />
        <StatBox label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? "text-green-400" : "text-red-400"} />
        <StatBox label="Wins" value={stats.wins} color="text-green-400" />
        <StatBox label="Losses" value={stats.losses} color="text-red-400" />
      </div>

      {selectedCard && (
        <p className="text-sm text-gray-400 text-center">
          Showing results for battles against decks containing <span className="text-white font-bold">{selectedCard}</span>
        </p>
      )}
    </div>
  );
}

// Helper component for layout
function StatBox({ label, value, color = "text-white" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-gray-900 p-4 rounded text-center">
      <div className="text-gray-500 text-xs uppercase mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}