'use client'

import React from 'react';
import { MAP_ROOMS, MAP_NODES_DATA, MAP_EDGES, MAP_DOORS, ANIMATRONIC_ZONES } from '@/lib/mapData';
import { movePlayer } from '@/app/actions/gameActions';

interface GameMapProps {
  currentNodeId: string;
  gameId: string;
  playerId: string;
  allPlayers: any[];
  enemies: any[];
}

// Вспомогательная функция для отрисовки стрелки
const Arrow = ({ x1, y1, x2, y2, color = "#ef4444", strokeWidth = 0.3 }: any) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const arrowSize = 1.5;

  // Точка стрелки чуть перед концом линии
  const arrowX = x2 - Math.cos(angle) * 2;
  const arrowY = y2 - Math.sin(angle) * 2;

  // Две точки для треугольника стрелки
  const leftX = arrowX - arrowSize * Math.cos(angle - Math.PI / 6);
  const leftY = arrowY - arrowSize * Math.sin(angle - Math.PI / 6);
  const rightX = arrowX - arrowSize * Math.cos(angle + Math.PI / 6);
  const rightY = arrowY - arrowSize * Math.sin(angle + Math.PI / 6);

  return (
    <polygon
      points={`${arrowX},${arrowY} ${leftX},${leftY} ${rightX},${rightY}`}
      fill={color}
    />
  );
};

// Функция для получения цвета узла по типу
const getNodeColor = (type: string, color?: string) => {
  if (color) {
    const colorMap: Record<string, string> = {
      'Purple': '#8b5cf6',
      'Blue': '#3b82f6',
      'Red': '#ef4444',
      'Green': '#22c55e',
    };
    return colorMap[color] || '#3f3f46';
  }

  const typeColorMap: Record<string, string> = {
    'START_FINISH': '#8b5cf6',
    'LOOP_DISTRIBUTOR': '#3b82f6',
    'LOOP_END': '#3b82f6',
    'POI_EVENT': '#ef4444',
    'WAYPOINT': '#22c55e',
  };
  return typeColorMap[type] || '#3f3f46';
};

export default function GameMap({ currentNodeId, gameId, playerId, allPlayers = [], enemies }: GameMapProps) {
  const currentNode = MAP_NODES_DATA.find(n => n.id === currentNodeId);
  const neighbors = currentNode?.neighbors || [];

  const handleNodeClick = async (nodeId: string) => {
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
    <div className="relative w-full aspect-square max-w-[900px] bg-black border-4 border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          {/* Определяем паттерн для пунктирной линии */}
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
          </marker>
        </defs>

        {/* СЛОЙ 0: Комнаты с подписями */}
        {MAP_ROOMS.map(room => {
          const width = room.box[2] - room.box[0];
          const height = room.box[3] - room.box[1];
          const centerX = room.box[0] + width / 2;
          const centerY = room.box[1] + height / 2;

          return (
            <g key={room.id}>
              {/* Стена комнаты */}
              <rect
                x={room.box[0]}
                y={room.box[1]}
                width={width}
                height={height}
                fill="rgba(20, 20, 20, 0.5)"
                stroke="#444"
                strokeWidth="0.4"
              />

              {/* Название комнаты */}
              <text
                x={centerX}
                y={centerY}
                fontSize="1.5"
                fill="#333"
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono font-bold select-none pointer-events-none"
                style={{ userSelect: 'none' }}
              >
                {room.label}
              </text>
            </g>
          );
        })}

        {/* СЛОЙ 0.5: Двери и проходы */}
        {MAP_DOORS.map((door, idx) => {
          if (door.axis === "X") {
            // Горизонтальный проход
            return (
              <line
                key={`door-${idx}`}
                x1={door.pos[0] - door.width / 2}
                y1={door.pos[1]}
                x2={door.pos[0] + door.width / 2}
                y2={door.pos[1]}
                stroke="#666"
                strokeWidth="0.6"
              />
            );
          } else {
            // Вертикальный проход
            return (
              <line
                key={`door-${idx}`}
                x1={door.pos[0]}
                y1={door.pos[1] - door.width / 2}
                x2={door.pos[0]}
                y2={door.pos[1] + door.width / 2}
                stroke="#666"
                strokeWidth="0.6"
              />
            );
          }
        })}

        {/* СЛОЙ 1: Маркеры зон аниматроников (маленькие точки) */}
        {Object.entries(ANIMATRONIC_ZONES).map(([name, zone]) =>
          zone.nodes.map(nodeId => {
            const node = MAP_NODES_DATA.find(n => n.id === nodeId);
            if (!node) return null;

            // Определяем смещение для каждого аниматроника
            const offsetMap: Record<string, [number, number]> = {
              'Foxy': [-2.5, -2.5],
              'Bonnie': [2.5, -2.5],
              'Chica': [-2.5, 2.5],
              'Freddy': [2.5, 2.5],
              'All': [0, 0]
            };

            const offset = offsetMap[name] || [0, 0];

            return (
              <circle
                key={`animatronic-${name}-${nodeId}`}
                cx={node.pos[0] + offset[0]}
                cy={node.pos[1] + offset[1]}
                r="0.6"
                fill={zone.color}
                opacity="0.7"
              />
            );
          })
        )}

        {/* СЛОЙ 2: Линии путей (Edges) со стрелками */}
        {MAP_EDGES.map((edge, idx) => {
          const fromNode = MAP_NODES_DATA.find(n => n.id === edge.from);
          const toNode = MAP_NODES_DATA.find(n => n.id === edge.to);
          if (!fromNode || !toNode) return null;

          const isActive = (edge.from === currentNodeId && neighbors.includes(edge.to));
          const color = isActive ? "#22c55e" : "#666";
          const strokeWidth = isActive ? 0.5 : 0.3;

          return (
            <g key={`edge-${idx}`}>
              <line
                x1={fromNode.pos[0]}
                y1={fromNode.pos[1]}
                x2={toNode.pos[0]}
                y2={toNode.pos[1]}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={edge.type === "DASHED" ? "1.5 1" : "0"}
                opacity={edge.type === "DASHED" ? 0.8 : 1}
              />
              <Arrow
                x1={fromNode.pos[0]}
                y1={fromNode.pos[1]}
                x2={toNode.pos[0]}
                y2={toNode.pos[1]}
                color={color}
              />
            </g>
          );
        })}

        {/* СЛОЙ 3: Узлы (Nodes) */}
        {MAP_NODES_DATA.map(node => {
          const isCurrent = node.id === currentNodeId;
          const isNeighbor = neighbors.includes(node.id);
          const enemyInNode = enemies.find(e => e.currentNode === node.id);
          const playersHere = allPlayers.filter(p => p.currentNode === node.id);

          const nodeColor = isCurrent ? "#8b5cf6" : isNeighbor ? "#22c55e" : getNodeColor(node.type, node.color);

          return (
            <g
              key={node.id}
              className={`transition-all ${isNeighbor ? "cursor-pointer" : "cursor-default"}`}
              onClick={(e) => {
                e.stopPropagation();
                if (isNeighbor) handleNodeClick(node.id);
              }}
            >
              {/* Увеличенная область клика */}
              <circle
                cx={node.pos[0]}
                cy={node.pos[1]}
                r="4"
                fill="transparent"
                className="hover:fill-white/5"
              />

              {/* Видимый круг узла */}
              <circle
                cx={node.pos[0]}
                cy={node.pos[1]}
                r={isCurrent ? 2.2 : isNeighbor ? 1.5 : 1.2}
                fill={nodeColor}
                stroke={isNeighbor ? "#4ade80" : isCurrent ? "#a78bfa" : "none"}
                strokeWidth="0.5"
                className={isNeighbor ? "animate-pulse" : ""}
              />

              {/* Текст метки узла */}
              <text
                x={node.pos[0]}
                y={node.pos[1] - 3.5}
                fontSize="2.2"
                fill={isNeighbor || isCurrent ? "#fff" : "#999"}
                textAnchor="middle"
                className="font-mono font-bold select-none pointer-events-none"
                style={{ userSelect: 'none' }}
              >
                {node.label}
              </text>

              {/* Отрисовка игроков */}
              {playersHere.map((p, idx) => (
                <circle
                  key={p.id}
                  cx={node.pos[0] - 1.5 + (idx * 1.5)}
                  cy={node.pos[1] + 2.5}
                  r="1"
                  fill={p.id === playerId ? "#A855F7" : "#3B82F6"}
                  className="transition-all duration-500"
                />
              ))}

              {/* Индикатор врага */}
              {enemyInNode && (
                <circle
                  cx={node.pos[0] + 2}
                  cy={node.pos[1] - 2}
                  r="0.9"
                  fill="#ef4444"
                  filter="drop-shadow(0 0 1px rgba(239, 68, 68, 0.5))"
                >
                  <animate
                    attributeName="r"
                    values="0.7;1.1;0.7"
                    dur={`${1.5 + Math.random()}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.6;1;0.6"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Легенда */}
      <div className="absolute bottom-2 left-2 bg-black/80 p-2 rounded text-xs text-white font-mono space-y-1">
        <div className="font-bold mb-1">ЛЕГЕНДА:</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-600"></div>
          <span>Старт/Финиш & Текущая</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          <span>Петли (X, Y)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600"></div>
          <span>Точки интереса</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-600"></div>
          <span>Маршрутные точки</span>
        </div>
        <div className="border-t border-gray-600 my-1"></div>
        <div className="text-[10px] space-y-0.5">
          <div><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>Foxy</div>
          <div><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1"></span>Bonnie</div>
          <div><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>Chica</div>
          <div><span className="inline-block w-2 h-2 rounded-full bg-yellow-700 mr-1"></span>Freddy</div>
        </div>
      </div>
    </div>
  );
}