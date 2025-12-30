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
  // Находим текущий узел для определения соседей
  const currentNode = MAP_NODES_DATA.find(n => n.id === currentNodeId);
  const neighbors = currentNode?.neighbors || [];
  const [optimisticNode, setOptimisticNode] = useState<string | null>(null);
  
  const handleNodeClick = async (nodeId: string) => {
	if (!neighbors.includes(nodeId)) return;
	setOptimisticNode(nodeId); // Мгновенно "передвигаем" фишку
	const res = await movePlayer(gameId, playerId, nodeId);
	  
	if (!res.success) {
	  setOptimisticNode(null); // Откатываем, если сервер запретил
	  alert(res.message);
	}
  };
  const handleNodeClick = async (nodeId: string) => {
    if (!neighbors.includes(nodeId)) return;
    await movePlayer(gameId, playerId, nodeId);
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
              {/* Метка узла */}
              <text
                x={node.pos[0]} y={node.pos[1] - 3}
                fontSize="1.5"
                fill="#666"
                textAnchor="middle"
                className="pointer-events-none font-mono"
              >
                {node.id}
              </text>

              {/* Индикатор врага */}
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
      
      {/* Наложение HUD для атмосферы */}
      <div className="absolute top-2 right-4 pointer-events-none">
        <div className="text-[10px] font-mono text-green-500/50 uppercase tracking-tighter">
          Neural-Link Map v1.0.4<br/>
          Facility: Fazbear Pizza
        </div>
      </div>
    </div>
  );
}