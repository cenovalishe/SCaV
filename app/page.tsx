'use client'

// 1. ВАЖНО: Импортируем useState
import { useState } from 'react';
import MapNode from '@/components/MapNode';
import { MAP_NODES } from '@/lib/gameConfig';
import { useGame } from '@/hooks/useGame';
import SecurityCamera from '@/components/SecurityCamera';
import Inventory from '@/components/Inventory';
import CombatEncounter from '@/components/CombatEncounter';
import GameMap from '@/components/GameMap';

const GAME_ID = 'game_alpha';
const PLAYER_ID = 'player_1';

// 2. Картинки объявляем вне компонента (статика), исправлена скобка
const ROOM_IMAGES: Record<string, string> = {
  "node_02": "https://i.pinimg.com/originals/80/c8/3c/80c83c3f46801c46cb326965d6a012d5.jpg",
  "node_04": "https://i.ytimg.com/vi/Bh5f_q9VJ9o/maxresdefault.jpg",
};

export default function GameBoard() {
  const [activeCam, setActiveCam] = useState<string | null>("node_04");
  const { player, enemies, isCombat, loading } = useGame(GAME_ID, PLAYER_ID);
  
  if (loading || !player) return <div className="text-white text-center mt-20 font-mono">INITIALIZING NEURAL LINK...</div>;

  const combatEnemy = enemies.find(e => e.currentNode === player.currentNode);

  return (
    <main className="min-h-screen bg-black text-white p-5 relative overflow-x-hidden flex flex-col items-center">
      
      {/* ОСТАВЛЯЕМ ТОЛЬКО ОДИН БЛОК СТАТУСА */}
      <div className="fixed top-5 left-5 z-30 bg-gray-900/90 p-4 border border-blue-500/30 rounded backdrop-blur-sm w-64 shadow-2xl">
        <h2 className="text-lg font-bold text-blue-400 mb-2 font-mono">SYSTEM STATUS</h2>
        
        <div className="mb-4 space-y-2 font-mono">
           <div className="text-[10px] flex justify-between uppercase"><span>Integrity</span> <span>{player.stats.hp}%</span></div>
           <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden border border-white/5">
             <div className="bg-red-600 h-full transition-all duration-1000" style={{ width: `${player.stats.hp}%` }}></div>
           </div>

           <div className="text-[10px] flex justify-between uppercase"><span>Neural Stability</span> <span>{player.stats.san}%</span></div>
           <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden border border-white/5">
             <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${player.stats.san}%` }}></div>
           </div>
        </div>

        <div className="border-t border-gray-800 pt-2">
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
      <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full max-w-7xl">
  
		  {/* Левая колонка: Карта */}
		  <div className="flex-1 w-full flex justify-center">
			<GameMap 
			  gameId={GAME_ID}
			  playerId={PLAYER_ID}
			  currentNodeId={player.currentNode}
			  enemies={enemies}
			/>
		  </div>

		  {/* Правая колонка: Камеры и Статы */}
		  <div className="w-full lg:w-80 flex flex-col gap-4">
			<div className="bg-zinc-900 p-4 border border-white/10 rounded">
				{/* Твой компонент Stats и Inventory */}
			</div>
			{/* Камеры */}
		  </div>
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