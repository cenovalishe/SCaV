'use client'

import React from 'react';
import { MAP_ROOMS, MAP_NODES_DATA } from '@/lib/mapData';
import { movePlayer } from '@/app/actions/gameActions';

interface GameMapProps {
  currentNodeId: string;
  gameId: string;
  playerId: string;
  enemies: any[];
}

export default function GameMap({ currentNodeId, gameId, playerId, enemies }: GameMapProps) {
  // 1. Находим текущий узел и его соседей
  const currentNode = MAP_NODES_DATA.find(n => n.id === currentNodeId);
  const neighbors = currentNode?.neighbors || [];

  // 2. ФУНКЦИЯ ОБРАБОТКИ КЛИКА (ДОЛЖНА БЫТЬ ОДНА)
  const handleNodeClick = async (nodeId: string) => {
    // Проверяем, является ли узел соседом текущего
    if (!neighbors.includes(nodeId)) {
        console.log("Движение невозможно: узлы не связаны");
        return;
    }

    try {
      const res = await movePlayer(gameId, playerId, nodeId);
      if (res && !res.success) {
        alert(res.message);
      }
    } catch (error) {
      console.error("Ошибка при перемещении:", error);
    }
  };

  return (
    <div className="relative w-full aspect-square max-w-[800px] bg-black border-4 border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Слой 0: Стены комнат */}
        {MAP_ROOMS.map(room => (
          <rect
            key={room.id}
            x={room.box[0]}
            y={room.box[1]}
            width={room.box[2] - room.box[0]}
            height={room.box[3] - room.box[1]}
            fill="none"
            stroke="#333"
            strokeWidth="0.5"
          />
        ))}

        {/* Слой 1: Линии путей (Edges) */}
        {MAP_NODES_DATA.map(node => 
          node.neighbors.map(neighborId => {
            const neighbor = MAP_NODES_DATA.find(n => n.id === neighborId);
            if (!neighbor) return null;
            return (
              <line
                key={`${node.id}-${neighborId}`}
                x1={node.pos[0]} y1={node.pos[1]}
                x2={neighbor.pos[0]} y2={neighbor.pos[1]}
                stroke={neighbors.includes(neighbor.id) && node.id === currentNodeId ? "#22c55e" : "#444"}
                strokeWidth="0.3"
                strokeDasharray={node.type === "LOOP_DISTRIBUTOR" ? "1 1" : "0"}
              />
            );
          })
        )}

        {/* Слой 2: Узлы (Nodes) */}
        {MAP_NODES_DATA.map(node => {
          const isCurrent = node.id === currentNodeId;
          const isNeighbor = neighbors.includes(node.id);
          const enemyInNode = enemies.find(e => e.currentNode === node.id);

          return (
            <g 
              key={node.id} 
              className="cursor-pointer transition-all"
              onClick={() => handleNodeClick(node.id)}
            >
              <circle
                cx={node.pos[0]} cy={node.pos[1]}
                r={isCurrent ? 2 : 1.2}
                fill={isCurrent ? "#8b5cf6" : isNeighbor ? "#22c55e" : "#18181b"}
                stroke={isNeighbor ? "#4ade80" : "#3f3f46"}
                strokeWidth="0.2"
                className={isNeighbor ? "animate-pulse" : ""}
              />
              <text
                x={node.pos[0]} y={node.pos[1] - 3}
                fontSize="1.5"
                fill="#666"
                textAnchor="middle"
                className="pointer-events-none font-mono"
              >
                {node.id}
              </text>
              {enemyInNode && (
                <circle
                  cx={node.pos[0] + 1.5} cy={node.pos[1] - 1.5}
                  r="0.8"
                  fill="#ef4444"
                  className="animate-bounce"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}