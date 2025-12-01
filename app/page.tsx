import { sql } from "@vercel/postgres";
import BattleDashboard from "./_components/BattleDashboard"; // The new wrapper
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
    // Fetch last 30 days of battles
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
      <div className="max-w-7xl mx-auto">
        
        {/* Main Header */}
        <div className="mb-8 pb-6 border-b border-gray-800">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Battle <span className="text-blue-500">Log</span>
          </h1>
          <p className="text-gray-500 mt-2">
            Welcome back, Challenger.
          </p>
        </div>

        {/* The Interactive Dashboard that handles filtering */}
        <BattleDashboard battles={rows} cardImages={cardImages} />

      </div>
    </main>
  );
}