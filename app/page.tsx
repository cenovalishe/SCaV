'use client'

// 1. ВАЖНО: Импортируем useState
import { useState } from 'react';
import MapNode from '@/components/MapNode';
import { MAP_NODES } from '@/lib/gameConfig';
import { useGame } from '@/hooks/useGame';
import SecurityCamera from '@/components/SecurityCamera';
import Inventory from '@/components/Inventory';
import CombatEncounter from '@/components/CombatEncounter';

const GAME_ID = 'game_alpha';
const PLAYER_ID = 'player_1';

// 2. Картинки объявляем вне компонента (статика), исправлена скобка
const ROOM_IMAGES: Record<string, string> = {
  "node_02": "https://i.pinimg.com/originals/80/c8/3c/80c83c3f46801c46cb326965d6a012d5.jpg",
  "node_04": "https://i.ytimg.com/vi/Bh5f_q9VJ9o/maxresdefault.jpg",
};

export default function GameBoard() {
  // 3. ВАЖНО: useState вызываем ВНУТРИ компонента
  const [activeCam, setActiveCam] = useState<string | null>("node_04");
  
  const { player, enemies, isCombat, loading } = useGame(GAME_ID, PLAYER_ID);
  
  const combatEnemy = enemies.find(e => e.currentNode === player?.currentNode);

  if (loading || !player) return <div className="text-white text-center mt-20">Connecting to Neural Link...</div>;

  const currentNodeConfig = MAP_NODES[player.currentNode as keyof typeof MAP_NODES];

  return (
    <main className="min-h-screen bg-black text-white p-5 relative overflow-hidden flex flex-col items-center">
      
      {/* --- STATS --- */}
      <div className="fixed top-5 left-5 z-20 bg-gray-900/80 p-4 border border-blue-500/30 rounded font-mono text-sm">
        <h2 className="text-xl font-bold text-blue-400 mb-2">STATUS</h2>
        <p>HP: <span className="text-green-400">{player.stats.hp}</span></p>
        <p>SAN: <span className="text-purple-400">{player.stats.san}</span></p>
        <p className="mt-2 text-gray-400">LOC: {player.currentNode}</p>
      </div>
	  
	  {/* --- UI LAYER: Stats & Inventory --- */}
      <div className="fixed top-5 left-5 z-20 bg-gray-900/90 p-4 border border-blue-500/30 rounded backdrop-blur-sm max-w-xs">
        <h2 className="text-xl font-bold text-blue-400 mb-2">STATUS</h2>
        
        {/* Бары здоровья */}
        <div className="mb-4 space-y-2">
           <div className="text-xs flex justify-between"><span>HP</span> <span>{player.stats.hp}%</span></div>
           <div className="w-full bg-gray-700 h-2 rounded overflow-hidden">
             <div className="bg-red-600 h-full transition-all duration-500" style={{ width: `${player.stats.hp}%` }}></div>
           </div>

           <div className="text-xs flex justify-between"><span>SANITY</span> <span>{player.stats.san}%</span></div>
           <div className="w-full bg-gray-700 h-2 rounded overflow-hidden">
             <div className="bg-blue-400 h-full transition-all duration-500" style={{ width: `${player.stats.san}%` }}></div>
           </div>
        </div>

        <div className="border-t border-gray-700 pt-2">
           <h3 className="text-xs text-gray-400 mb-1">INVENTORY</h3>
           <Inventory items={player.inventory} gameId={GAME_ID} playerId={PLAYER_ID} />
        </div>
      </div>
	  
	  {/* --- UI LAYER: Combat Overlay --- */}
      {isCombat && combatEnemy && (
        <CombatEncounter 
          gameId={GAME_ID}
          playerId={PLAYER_ID}
          enemyId={combatEnemy.id}
          enemyHp={combatEnemy.hp}
        />
      )}
	 

      <h1 className="text-2xl mb-8 mt-4 text-gray-500 tracking-widest">SECTOR MAP</h1>

      {/* --- MAP --- */}
      <div className="grid grid-cols-3 gap-12 mb-12">
        {Object.values(MAP_NODES).map((node) => {
          const isCurrent = node.id === player.currentNode;
          const isNeighbor = currentNodeConfig?.neighbors.includes(node.id);
          const isVisible = isCurrent || isNeighbor;
          const enemyHere = enemies.find(e => e.currentNode === node.id);

          return (
            <div key={node.id} className="relative">
              {isVisible ? (
                <>
                  <MapNode
                    nodeId={node.id}
                    label={node.label}
                    isCurrent={isCurrent}
                    isNeighbor={isNeighbor}
                    gameId={GAME_ID}
                    playerId={PLAYER_ID}
                  />
                  {enemyHere && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full animate-bounce border-2 border-white flex items-center justify-center font-bold text-xs z-20">
                      !
                    </div>
                  )}
                </>
              ) : (
                <div className="w-24 h-24 rounded-full border-2 border-gray-800 bg-black/50 flex items-center justify-center text-gray-900 text-2xl font-bold">
                  ?
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* --- SURVEILLANCE SYSTEM (CAMERAS) --- */}
      <div className="w-full max-w-5xl border-t border-gray-800 pt-8 pb-20">
        <h2 className="text-xl mb-6 text-center text-gray-500 tracking-widest">SECURITY FEED</h2>
        
        <div className="flex justify-center flex-wrap gap-6">
          {["node_02", "node_04"].map((nodeId) => {
              const enemiesHere = enemies
                .filter(e => e.currentNode === nodeId)
                .map(e => e.type);

              return (
                <SecurityCamera
                  key={nodeId}
                  roomLabel={MAP_NODES[nodeId]?.label || nodeId}
                  imgSrc={ROOM_IMAGES[nodeId]}
                  isActive={activeCam === nodeId}
                  onActivate={() => setActiveCam(nodeId)}
                  enemiesHere={enemiesHere}
                />
              );
          })}
        </div>
      </div>

    </main>
  );
}