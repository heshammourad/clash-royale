import { sql } from "@vercel/postgres";
import OpponentStatsGrid from "./_components/OpponentStatsGrid";
import CardPairStats from "./_components/CardPairStats";
import { fetchCardImages } from "./lib/api";
import { Battle } from "./types"; 
import type { Metadata } from "next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Clash Royale Dashboard",
  description: "Analyze your battle history, win rates, and opponent card synergies.",
};

export default async function Home() {
  const [battleData, cardImages] = await Promise.all([
    sql<Battle>`
      SELECT * FROM battles 
      WHERE battle_time >= NOW() - INTERVAL '30 days'
      ORDER BY battle_time DESC;
    `,
    fetchCardImages()
  ]);

  const { rows } = battleData;

  return (
    <main className="min-h-screen p-4 md:p-8 bg-black text-gray-200">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Battle <span className="text-blue-500">Log</span>
            </h1>
            <p className="text-gray-500 mt-2">
              Analyzing {rows.length} battles from the last 30 days
            </p>
          </div>
        </div>

        {/* Section 1: Individual Card Stats */}
        <section>
          <OpponentStatsGrid battles={rows} cardImages={cardImages} />
        </section>

        {/* Section 2: Pair Synergies */}
        <section className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6">Synergy Analysis</h2>
          <CardPairStats battles={rows} cardImages={cardImages} />
        </section>

        {/* Section 3: Recent History */}
        <section>
          <h3 className="text-xl font-bold text-white mb-4">Recent Matches</h3>
          <div className="space-y-4">
            {rows.slice(0, 5).map((battle) => (
              <div 
                key={`${battle.player_tag}-${battle.battle_time}`}
                className="p-4 rounded-lg bg-gray-900 border border-gray-800 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-white">{battle.game_mode}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(battle.battle_time).toLocaleString()}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded text-sm font-bold uppercase ${
                  battle.result === 'victory' ? 'bg-green-900/30 text-green-400' : 
                  battle.result === 'defeat' ? 'bg-red-900/30 text-red-400' : 
                  'bg-yellow-900/30 text-yellow-400'
                }`}>
                  {battle.result}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}