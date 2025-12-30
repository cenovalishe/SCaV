'use client'

import { useTransition } from 'react';
import { movePlayer } from '@/app/actions/gameActions';
import clsx from 'clsx'; // Рекомендую установить: npm i clsx

interface MapNodeProps {
  nodeId: string;
  label: string;
  isCurrent: boolean;
  isNeighbor: boolean; // Для тумана войны: true, если узел соседний
  gameId: string;
  playerId: string;
}

export default function MapNode({ nodeId, label, isCurrent, isNeighbor, gameId, playerId }: MapNodeProps) {
  const [isPending, startTransition] = useTransition();

  const handleMove = () => {
    if (!isNeighbor || isPending) return;

    startTransition(async () => {
      const result = await movePlayer(gameId, playerId, nodeId);
      if (result.success) {
        alert(`${result.message}. Event: ${result.event}`);
        if(result.loot) alert(`You found: ${result.loot}`);
      } else {
        alert(result.message);
      }
    });
  };

  // Стилизация состояний
  const baseStyles = "w-24 h-24 rounded-full flex items-center justify-center border-4 font-bold transition-all duration-300 relative";
  
  const stateStyles = clsx({
    "bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.8)] z-10": isCurrent,
    "bg-gray-800 border-green-500 text-green-400 cursor-pointer hover:scale-110 hover:shadow-[0_0_15px_rgba(34,197,94,0.6)]": isNeighbor && !isCurrent,
    "bg-gray-900 border-gray-700 text-gray-600 opacity-50 cursor-not-allowed": !isNeighbor && !isCurrent, // Туман войны (неактивный)
    "animate-pulse": isPending // Эффект загрузки
  });

  return (
    <button 
      onClick={handleMove}
      disabled={!isNeighbor || isPending}
      className={`${baseStyles} ${stateStyles}`}
    >
      {/* Иконка или текст */}
      <span className="z-10">{label}</span>
      
      {/* Декоративный эффект сканера, если это соседний узел */}
      {isNeighbor && !isCurrent && (
        <span className="absolute inset-0 rounded-full border border-green-500/30 animate-ping"></span>
      )}
    </button>
  );
}