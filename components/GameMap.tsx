/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/GameMap.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Интерактивная карта пиццерии (REDESIGNED v2.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES                                                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Точка 2 отмечается КРАСНЫМ                                               │
 * │ - При нажатии на ЛЮБУЮ точку переключается камера                          │
 * │ - Улучшенная визуализация и анимации                                       │
 * │ - Стилизованный UI                                                         │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState } from 'react';
import { MAP_ROOMS, MAP_NODES_DATA, MAP_JOINTS, DANGER_COLORS, MapNodeData, ANIMATRONIC_SPAWNS } from '@/lib/mapData';
import { movePlayer } from '@/app/actions/gameActions';

// Цвета для аниматроников
const ANIMATRONIC_COLORS: Record<string, string> = {
  'foxy': '#EF4444',
  'bonnie': '#3B82F6',
  'chica': '#EAB308',
  'freddy': '#92400E',
  'default': '#EF4444'
};

// Цвета для игроков
const PLAYER_COLORS = [
  '#A855F7', '#22C55E', '#F97316', '#06B6D4', '#EC4899', '#84CC16',
];

interface GameMapProps {
  currentNodeId: string;
  gameId: string;
  playerId: string;
  allPlayers: any[];
  enemies: any[];
  selectedNode: MapNodeData | null;
  onNodeSelect: (node: MapNodeData) => void;
  onCameraSwitch?: (node: MapNodeData) => void; // ★ Новый callback для переключения камеры
  currentStamina: number;
  maxStamina: number;
  onMoveRequest?: (targetNode: MapNodeData, staminaCost: number) => void;
}

const BASE_MOVE_COST = 1;

export default function GameMap({
  currentNodeId,
  gameId,
  playerId,
  allPlayers = [],
  enemies,
  selectedNode,
  onNodeSelect,
  onCameraSwitch, // ★ Новый prop
  currentStamina = 4,
  maxStamina = 7,
  onMoveRequest
}: GameMapProps) {
  const [pendingMove, setPendingMove] = useState<MapNodeData | null>(null);

  const currentNode = MAP_NODES_DATA.find(n => n.id === currentNodeId);
  const neighbors = currentNode?.neighbors || [];

  const getMoveCost = (node: MapNodeData): number => {
    const dangerCosts: Record<string, number> = {
      'safe': 0, 'low': 0, 'medium': 0, 'high': 1, 'extreme': 1
    };
    return BASE_MOVE_COST + (dangerCosts[node.dangerLevel] || 0);
  };

  // ★ ИЗМЕНЕНО: При клике на ЛЮБУЮ ноду переключаем камеру
  const handleNodeClick = (node: MapNodeData) => {
    // Всегда выбираем ноду
    onNodeSelect(node);

    // ★ ВСЕГДА переключаем камеру на эту ноду (даже если недоступна)
    if (onCameraSwitch) {
      onCameraSwitch(node);
    }

    // Если соседняя - показываем диалог перемещения
    if (neighbors.includes(node.id)) {
      setPendingMove(node);
    }
  };

  const handleConfirmMove = async () => {
    if (!pendingMove) return;
    const staminaCost = getMoveCost(pendingMove);

    if (onMoveRequest) {
      onMoveRequest(pendingMove, staminaCost);
      setPendingMove(null);
      return;
    }

    try {
      const res = await movePlayer(gameId, playerId, pendingMove.id);
      if (res && !res.success) {
        console.log(res.message);
      }
    } catch (error) {
      console.error("Ошибка при перемещении:", error);
    }
    setPendingMove(null);
  };

  const handleCancelMove = () => {
    setPendingMove(null);
  };

  const getEnemyAtNode = (nodeId: string) => {
    return enemies.find(e => e.currentNode === nodeId);
  };

  return (
    <div className="relative w-full h-full bg-black border border-white/20 overflow-hidden">
      {/* Заголовок - стилизованный */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black via-black/90 to-transparent px-3 py-2 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white/70 font-mono text-xs tracking-widest">КАРТА ОБЪЕКТА</span>
          </div>
          <span className="text-white/30 font-mono text-[10px]">TACTICAL MAP</span>
        </div>
      </div>

      <svg viewBox="0 0 100 100" className="w-full h-full pt-8">
        {/* Слой 0: Комнаты */}
        {MAP_ROOMS.map(room => (
          <g key={room.id}>
            <rect
              x={room.box[0]}
              y={room.box[1]}
              width={room.box[2] - room.box[0]}
              height={room.box[3] - room.box[1]}
              fill="none"
              stroke="#333"
              strokeWidth="0.3"
            />
            <text
              x={(room.box[0] + room.box[2]) / 2}
              y={(room.box[1] + room.box[3]) / 2}
              fontSize="2"
              fill="#444"
              textAnchor="middle"
              dominantBaseline="middle"
              className="select-none pointer-events-none"
            >
              {room.label}
            </text>
          </g>
        ))}

        {/* Слой 0.5: Дверные проёмы */}
        {MAP_JOINTS.map((joint, idx) => {
          let strokeColor = '#000';
          let strokeWidth = joint.width * 0.15;
          let strokeDasharray = '0';

          if (joint.type === 'CURTAIN_OPENING') {
            strokeColor = '#7c3aed';
            strokeDasharray = '0.5 0.3';
          } else if (joint.type === 'DOOR_HIDDEN') {
            strokeColor = '#1f1f1f';
          } else if (joint.type === 'OPENING') {
            strokeWidth = joint.width * 0.12;
          }

          const halfWidth = joint.width / 2;
          const x1 = joint.axis === 'X' ? joint.pos[0] - halfWidth : joint.pos[0];
          const y1 = joint.axis === 'Y' ? joint.pos[1] - halfWidth : joint.pos[1];
          const x2 = joint.axis === 'X' ? joint.pos[0] + halfWidth : joint.pos[0];
          const y2 = joint.axis === 'Y' ? joint.pos[1] + halfWidth : joint.pos[1];

          return (
            <line
              key={`joint-${idx}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
            />
          );
        })}

        {/* Слой 1: Пути */}
        {MAP_NODES_DATA.map(node =>
          node.neighbors.map(neighborId => {
            const neighbor = MAP_NODES_DATA.find(n => n.id === neighborId);
            if (!neighbor) return null;
            const isPath = neighbors.includes(neighbor.id) && node.id === currentNodeId;
            return (
              <line
                key={`${node.id}-${neighborId}`}
                x1={node.pos[0]} y1={node.pos[1]}
                x2={neighbor.pos[0]} y2={neighbor.pos[1]}
                stroke={isPath ? "#ef4444" : "#555"}
                strokeWidth={isPath ? "1.5" : "0.8"}
                strokeDasharray={node.type === "LOOP_DISTRIBUTOR" ? "2 1" : "0"}
                strokeLinecap="round"
                className={isPath ? "drop-shadow-[0_0_3px_rgba(239,68,68,0.5)]" : ""}
              />
            );
          })
        )}

        {/* Слой 2: Узлы */}
        {MAP_NODES_DATA.map(node => {
          const isCurrent = node.id === currentNodeId;
          const isNeighbor = neighbors.includes(node.id);
          const isSelected = selectedNode?.id === node.id;
          const playersHere = allPlayers.filter(p => p.currentNode === node.id);

          // ★ ТОЧКИ 2 и 6 КРАСНЫЕ
          const isRedMarkedNode = node.id === '2' || node.id === '6';

          // Цвет узла
          let nodeColor = '#3f3f46';
          let glowColor = 'transparent';

          if (isCurrent) {
            nodeColor = '#8b5cf6';
            glowColor = 'rgba(139, 92, 246, 0.6)';
          } else if (isRedMarkedNode) {
            // ★ Точка 2 - КРАСНАЯ с пульсацией
            nodeColor = '#dc2626';
            glowColor = 'rgba(220, 38, 38, 0.6)';
          } else if (isNeighbor) {
            nodeColor = '#22c55e';
            glowColor = 'rgba(34, 197, 94, 0.5)';
          } else if (node.lootType === 'rare') {
            nodeColor = '#ef4444';
          } else if (node.lootType === 'supplies') {
            nodeColor = '#3b82f6';
          }

          return (
            <g
              key={node.id}
              className="cursor-pointer transition-all"
              onClick={() => handleNodeClick(node)}
            >
              {/* Область клика */}
              <circle
                cx={node.pos[0]} cy={node.pos[1]} r="6"
                fill="transparent"
                className="hover:fill-white/10"
              />

              {/* Свечение для красной точки 2 */}
              {isRedMarkedNode && (
                <circle
                  cx={node.pos[0]} cy={node.pos[1]} r="4"
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth="0.8"
                  opacity="0.5"
                >
                  <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Подсветка выбранного */}
              {isSelected && (
                <circle
                  cx={node.pos[0]} cy={node.pos[1]} r="4.5"
                  fill="none" stroke="#fff" strokeWidth="0.5"
                  strokeDasharray="1 0.5"
                  className="animate-pulse"
                />
              )}

              {/* Основной круг */}
              <circle
                cx={node.pos[0]} cy={node.pos[1]}
                r={isCurrent ? 3 : isSelected ? 2.8 : isRedMarkedNode ? 2.5 : 2}
                fill={nodeColor}
                stroke={isNeighbor ? "#4ade80" : isSelected ? "#fff" : isRedMarkedNode ? "#f87171" : "#333"}
                strokeWidth={isNeighbor || isRedMarkedNode ? "0.8" : "0.4"}
                filter={glowColor !== 'transparent' ? `drop-shadow(0 0 4px ${glowColor})` : 'none'}
                className={isNeighbor || isRedMarkedNode ? "animate-pulse" : ""}
              />

              {/* ID узла */}
              <text
                x={node.pos[0]} y={node.pos[1] - 4.5}
                fontSize="3"
                fill={isCurrent || isNeighbor || isSelected || isRedMarkedNode ? "#fff" : "#888"}
                textAnchor="middle"
                className="font-mono font-bold select-none pointer-events-none"
                style={{ textShadow: '0 0 3px rgba(0,0,0,1)' }}
              >
                {node.id}
              </text>

              {/* Игроки */}
              {playersHere.map((p, idx) => {
                const isCurrentPlayer = p.id === playerId;
                const playerIndex = allPlayers.findIndex(ap => ap.id === p.id);
                const playerColor = isCurrentPlayer ? PLAYER_COLORS[0] : PLAYER_COLORS[(playerIndex % (PLAYER_COLORS.length - 1)) + 1];
                return (
                  <g key={p.id}>
                    <circle
                      cx={node.pos[0] - 1.5 + idx * 1.5}
                      cy={node.pos[1] + 3.5}
                      r="1.2"
                      fill={playerColor}
                      stroke={isCurrentPlayer ? "#fff" : "none"}
                      strokeWidth="0.3"
                      filter={isCurrentPlayer ? "drop-shadow(0 0 3px rgba(168, 85, 247, 0.8))" : "none"}
                    />
                  </g>
                );
              })}

              {/* Враги */}
              {enemies.filter(e => e.currentNode === node.id).map((enemy, idx) => {
                const enemyColor = ANIMATRONIC_COLORS[enemy.type?.toLowerCase()] || ANIMATRONIC_COLORS.default;
                return (
                  <g key={enemy.id}>
                    <circle
                      cx={node.pos[0] + 2.5 + idx * 1.5}
                      cy={node.pos[1] - 2.5}
                      r="1.3"
                      fill={enemyColor}
                      filter={`drop-shadow(0 0 3px ${enemyColor})`}
                    >
                      <animate attributeName="r" values="1.1;1.5;1.1" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <text
                      x={node.pos[0] + 2.5 + idx * 1.5}
                      y={node.pos[1] - 2.3}
                      fontSize="1.2"
                      fill="#fff"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-mono font-bold select-none pointer-events-none"
                    >
                      {enemy.type?.charAt(0).toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Легенда - стилизованная */}
      <div className="absolute bottom-2 left-2 z-10 bg-black/90 px-3 py-2 border border-white/20 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-3 text-[9px] font-mono text-white/60 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-lg shadow-purple-500/50" />вы
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />путь
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />цель
          </span>
          <span className="text-white/20">│</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ANIMATRONIC_COLORS.foxy }} />F
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ANIMATRONIC_COLORS.bonnie }} />B
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ANIMATRONIC_COLORS.chica }} />C
          </span>
        </div>
      </div>

      {/* Выносливость - стилизованная */}
      <div className="absolute bottom-2 right-2 z-10 bg-black/90 px-3 py-2 border border-white/20 rounded-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-yellow-400 text-base">⚡</span>
          <div className="flex gap-0.5">
            {Array(maxStamina).fill(0).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-4 rounded-sm ${i < currentStamina ? 'bg-yellow-400' : 'bg-zinc-700'}`}
              />
            ))}
          </div>
          <span className="text-white/50">{currentStamina}/{maxStamina}</span>
        </div>
      </div>

      {/* Панель подтверждения перемещения */}
      {pendingMove && (
        <div className="absolute top-12 left-2 right-2 z-20">
          <div className="bg-zinc-900/95 border border-white/20 rounded-xl p-4 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-lg">→</span>
                <span className="text-white font-mono text-sm font-bold">
                  {pendingMove.nameRu}
                </span>
                <span className="text-white/30 font-mono text-xs bg-white/5 px-2 py-0.5 rounded">
                  ID: {pendingMove.id}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-yellow-900/30 px-2 py-1 rounded">
                <span className="text-yellow-400">⚡</span>
                <span className={`font-mono text-sm font-bold ${currentStamina >= getMoveCost(pendingMove) ? 'text-yellow-400' : 'text-red-400'}`}>
                  -{getMoveCost(pendingMove)}
                </span>
              </div>
            </div>

            {getEnemyAtNode(pendingMove.id) && (
              <div className="mb-3 px-3 py-2 bg-red-900/40 border border-red-500/50 rounded-lg text-sm text-red-400 font-mono flex items-center gap-2 animate-pulse">
                <span className="text-xl">⚠</span>
                <span>{getEnemyAtNode(pendingMove.id)?.type?.toUpperCase()} обнаружен!</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleCancelMove}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white/70 font-mono text-sm transition-all border border-zinc-600 rounded-lg"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmMove}
                disabled={currentStamina < getMoveCost(pendingMove)}
                className={`
                  flex-1 px-4 py-2 font-mono text-sm font-bold transition-all border rounded-lg
                  ${currentStamina >= getMoveCost(pendingMove)
                    ? 'bg-green-600 hover:bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  }
                `}
              >
                Идти →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
