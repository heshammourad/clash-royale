"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Battle, Card } from "../types";
import OpponentStatsGrid from "./OpponentStatsGrid";
import CardPairStats from "./CardPairStats";
import MatchHistory from "./MatchHistory";
import CardImage from "./CardImage";
import { CardAssetsProvider } from "../_context/CardAssetsContext";

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
  const [cardNameFilter, setCardNameFilter] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [cardTypeFilters, setCardTypeFilters] = useState({
    regular: false,
    evo: false,
    hero: false,
  });
  const [historyPage, setHistoryPage] = useState(1);
  const MATCHES_PER_PAGE = 10;

  // Helper: Generates a deterministic ID for a deck based on content (Alphabetical)
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

  // Helper: Sorts cards for visual display (Evo -> Hero -> Regular)
  const sortCardsForDisplay = (cards: Card[]) => {
    return [...cards].sort((a, b) => {
      const getPriority = (level?: number) => {
        if (level === 1) return 0; // Evo First
        if (level === 2) return 1; // Hero Second
        return 2;                  // Regular Last
      };

      const pA = getPriority(a.evolution_level);
      const pB = getPriority(b.evolution_level);
      
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name);
    });
  };

  // 1. Identify Unique Decks
  const myDecks = useMemo(() => {
    const deckMap = new Map<string, DeckStat>();

    battles.forEach((battle) => {
      const myCards = battle.match_data.my_cards || [];
      if (myCards.length === 0) return;

      const deckId = getDeckId(myCards);
      
      // Store the properly sorted cards for visual display
      const sortedCards = sortCardsForDisplay(myCards);

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

  // Get a sorted list of all possible opponent cards (including evolutions) for the filter dropdown
  const opponentCardOptions = useMemo(() => {
    const noTypesSelected = !cardTypeFilters.regular && !cardTypeFilters.evo && !cardTypeFilters.hero;
    const isTypeActive = (level: number) => {
      if (level === 1) return cardTypeFilters.evo;
      if (level === 2) return cardTypeFilters.hero;
      return cardTypeFilters.regular;
    };

    const allCards = new Map<string, { name: string; evolutionLevel: number }>();
    battles.forEach(b => {
      b.match_data.opponent_cards?.forEach(c => {
        const level = c.evolution_level || 0;
        if (noTypesSelected || isTypeActive(level)) {
          const key = `${c.name}|${level}`;
          if (!allCards.has(key)) {
            allCards.set(key, { name: c.name, evolutionLevel: level });
          }
        }
      });
    });

    return Array.from(allCards.values()).sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;
      return a.evolutionLevel - b.evolutionLevel;
    });
  }, [battles, cardTypeFilters]);

  // 2. Filter Battles
  const filteredBattles = useMemo(() => {
    if (!selectedDeckId) return battles;
    return battles.filter(b => {
      const myCards = b.match_data.my_cards || [];
      return getDeckId(myCards) === selectedDeckId;
    });
  }, [battles, selectedDeckId]);
  
  // 2b. Filter for Match History (based on opponent cards)
  const historyFilteredBattles = useMemo(() => {
    let battlesToFilter = filteredBattles;

    // Apply card name filter first
    if (cardNameFilter.trim()) {
      const [name, levelStr] = cardNameFilter.split('|');
      const level = parseInt(levelStr, 10);
      battlesToFilter = battlesToFilter.filter(b => 
        b.match_data.opponent_cards?.some(card => card.name === name && (card.evolution_level || 0) === level)
      );
    }

    // Then apply card type filters
    const noTypesSelected = !cardTypeFilters.regular && !cardTypeFilters.evo && !cardTypeFilters.hero;
    if (noTypesSelected) {
      return battlesToFilter;
    }

    return battlesToFilter.filter(b => 
      b.match_data.opponent_cards?.some(card => {
        const level = card.evolution_level || 0;
        return (cardTypeFilters.regular && level === 0) || (cardTypeFilters.evo && level === 1) || (cardTypeFilters.hero && level === 2);
      })
    );
  }, [filteredBattles, cardNameFilter, cardTypeFilters]);

  // 3. Stats logic
  const overallStats = useMemo(() => {
    let wins = 0; let losses = 0; let draws = 0;
    // Note: Overall stats should reflect the match history filter
    historyFilteredBattles.forEach(b => {
      if (b.result === 'victory') wins++;
      else if (b.result === 'defeat') losses++;
      else draws++;
    });
    const total = wins + losses + draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { wins, losses, draws, winRate };
  }, [historyFilteredBattles]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * MATCHES_PER_PAGE;
    return historyFilteredBattles.slice(start, start + MATCHES_PER_PAGE);
  }, [historyFilteredBattles, historyPage]);

  const totalPages = Math.ceil(historyFilteredBattles.length / MATCHES_PER_PAGE);

  const handleDeckSelect = (deckId: string | null) => {
    setSelectedDeckId(deckId);
    // Reset other filters for a clean slate
    setHistoryPage(1);
  };

  const handleCardTypeFilterChange = (type: 'regular' | 'evo' | 'hero') => {
    setCardTypeFilters(prev => ({ ...prev, [type]: !prev[type] }));
    // When type filters change, the single card filter might become invalid
    setCardNameFilter('');
    // Reset other filters for a clean slate
    setHistoryPage(1);
  };

  const handleResetFilters = () => {
    setSelectedDeckId(null);
    setCardNameFilter('');
    setCardTypeFilters({
      regular: false,
      evo: false,
      hero: false,
    });
    setHistoryPage(1);
  };

  const handleFilterSelect = (value: string) => {
    setCardNameFilter(value);
    setIsFilterOpen(false);
  };

  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = useMemo(() => {
    if (!cardNameFilter) return null;
    const [name, levelStr] = cardNameFilter.split('|');
    const level = parseInt(levelStr, 10);
    return opponentCardOptions.find(opt => opt.name === name && opt.evolutionLevel === level);
  }, [cardNameFilter, opponentCardOptions]);

  return (
    <CardAssetsProvider images={cardImages}>
      <div className="space-y-8">

        <nav className="sticky top-0 bg-gray-950/80 backdrop-blur-sm py-3 z-30 border-b border-gray-800 -mx-6 px-6">
          <div className="flex justify-center items-center gap-4 sm:gap-8">
            <a href="#deck-filter" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Decks</a>
            <a href="#opponent-stats" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Opponent Stats</a>
            <a href="#synergy-analysis" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Synergy</a>
            <a href="#match-history" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">History</a>
          </div>
        </nav>
        
        <section 
          id="deck-filter" 
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 overflow-x-auto"
          style={{ scrollMarginTop: '80px' }} // Offset for sticky nav
        >
          <h2 className="text-xl font-bold text-white mb-4 sticky left-0">
            Filter by Your Deck
          </h2>
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
                          className="w-full h-full"
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

        <div className="flex flex-col md:flex-row md:items-end gap-4 pb-4 border-b border-gray-800">
          <div className="flex-grow">
            <h2 className="text-2xl font-bold text-white">
              {selectedDeckId ? "Deck Performance" : "Overall Performance"}
            </h2>
            <div className="mt-2 flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-72 z-20" ref={filterRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                >
                  {selectedOption ? (
                    <div className="flex items-center gap-2">
                      <div className="relative w-6 h-8">
                        <CardImage name={selectedOption.name} evolutionLevel={selectedOption.evolutionLevel} className="w-full h-full" />
                      </div>
                      <span>
                        {selectedOption.name}
                        {selectedOption.evolutionLevel === 1 ? ' (Evo)' : ''}
                        {selectedOption.evolutionLevel === 2 ? ' (Hero)' : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Filter by opponent card...</span>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20" className={`w-5 h-5 text-gray-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 8l4 4 4-4"/></svg>
                </button>

                {isFilterOpen && (
                  <div className="absolute top-full mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg z-10 max-h-80 overflow-y-auto shadow-lg">
                    <ul>
                      <li 
                        onClick={() => handleFilterSelect('')}
                        className="px-4 py-2 text-gray-400 hover:bg-gray-700 cursor-pointer"
                      >
                        - Clear Filter -
                      </li>
                      {opponentCardOptions.map(card => (
                        <li
                          key={`${card.name}|${card.evolutionLevel}`}
                          onClick={() => handleFilterSelect(`${card.name}|${card.evolutionLevel}`)}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-blue-600 cursor-pointer rounded-md m-1"
                        >
                          <div className="relative w-8 h-10 shrink-0">
                            <CardImage
                              name={card.name}
                              evolutionLevel={card.evolutionLevel}
                              className="w-full h-full"
                            />
                          </div>
                          <span className="text-white font-medium">
                            {card.name}
                            {card.evolutionLevel === 1 ? ' (Evo)' : ''}
                            {card.evolutionLevel === 2 ? ' (Hero)' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 pt-2">
                {(['regular', 'evo', 'hero'] as const).map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
                    <input type="checkbox" checked={cardTypeFilters[type]} onChange={() => handleCardTypeFilterChange(type)} className="form-checkbox h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500" />
                    <span className="capitalize">{type === 'hero' ? 'Heroes' : `${type}s`}</span>
                  </label>
                ))}
              </div>
              <div className="pt-2">
                <button onClick={handleResetFilters} className="text-sm text-gray-400 hover:text-white hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors">Reset Filters</button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 bg-gray-900 px-3 py-1 rounded-full border border-gray-800">
              {historyFilteredBattles.length} Matches
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

        <section 
          id="opponent-stats" 
          className="relative z-10"
          style={{ scrollMarginTop: '80px' }} // Offset for sticky nav
        >
          <OpponentStatsGrid battles={filteredBattles} cardNameFilter={cardNameFilter} cardTypeFilters={cardTypeFilters} />
        </section>

        <section 
          id="synergy-analysis" 
          className="bg-gray-900/50 p-6 rounded-xl border border-gray-800"
          style={{ scrollMarginTop: '80px' }} // Offset for sticky nav
        >
          <h2 className="text-2xl font-bold text-white mb-6">Synergy Analysis</h2>
          <CardPairStats battles={filteredBattles} cardNameFilter={cardNameFilter} cardTypeFilters={cardTypeFilters} />
        </section>

        <section 
          id="match-history"
          style={{ scrollMarginTop: '80px' }} // Offset for sticky nav
        >
          <h2 className="text-2xl font-bold text-white mb-6">Match History</h2>
          <MatchHistory battles={paginatedHistory} />
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={historyPage === 1} className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-bold disabled:opacity-50 hover:bg-gray-700 transition-colors">Previous</button>
              <span className="text-sm text-gray-400">Page {historyPage} of {totalPages}</span>
              <button onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))} disabled={historyPage === totalPages} className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-bold disabled:opacity-50 hover:bg-gray-700 transition-colors">Next</button>
            </div>
          )}
        </section>

      </div>
    </CardAssetsProvider>
  );
}