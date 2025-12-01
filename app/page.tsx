import { sql } from "@vercel/postgres";
import BattleAnalytics from "./BattleAnalytics";

export default async function Home() {
  // Fetch last 100 battles for better analytics
  const { rows } = await sql`
    SELECT * FROM battles 
    ORDER BY battle_time DESC 
    LIMIT 100;
  `;

  return (
    <main className="min-h-screen p-8 bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-blue-400">
          Clash Royale Dashboard
        </h1>
        
        {/* Pass data to Client Component */}
        <BattleAnalytics battles={rows} />

        <h2 className="text-xl font-semibold mb-4 text-gray-300">
          Recent Battle History
        </h2>
        
        <div className="space-y-4">
          {rows.slice(0, 10).map((battle) => (
             // Reuse your existing list UI here...
             <div 
             key={`${battle.player_tag}-${battle.battle_time}`}
             className="p-4 rounded-lg bg-gray-800 border border-gray-700 flex justify-between items-center"
           >
             <div>
               <p className="font-semibold text-lg">{battle.game_mode}</p>
               <p className="text-gray-400 text-sm">
                 {new Date(battle.battle_time).toLocaleString()}
               </p>
               <p className="text-xs text-gray-500">
                 vs {battle.opponent_tag}
               </p>
             </div>
             
             <div className={`px-4 py-2 rounded font-bold uppercase tracking-wide text-sm ${
               battle.result === 'victory' ? 'bg-green-600/20 text-green-400 border border-green-600' : 
               battle.result === 'defeat' ? 'bg-red-600/20 text-red-400 border border-red-600' : 
               'bg-yellow-600/20 text-yellow-400 border border-yellow-600'
             }`}>
               {battle.result}
             </div>
           </div>
          ))}
        </div>
      </div>
    </main>
  );
}