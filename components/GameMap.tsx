/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/GameMap.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Интерактивная карта пиццерии - навигация и отображение состояния
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ DEFAULT EXPORT:                                                             │
 * │   GameMap             - React компонент SVG карты                          │
 * │                                                                             │
 * │ PROPS (GameMapProps):                                                       │
 * │   currentNodeId       - string - ID ноды где стоит игрок                   │
 * │   gameId              - string - ID игровой сессии (для Firebase)          │
 * │   playerId            - string - ID текущего игрока                        │
 * │   allPlayers          - any[] - все игроки для отображения на карте        │
 * │   enemies             - any[] - враги для отображения на карте             │
 * │   selectedNode        - MapNodeData | null - выбранная нода                │
 * │   onNodeSelect        - (node) => void - коллбэк выбора ноды               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   react                     → React                                        │
 * │   @/lib/mapData             → MAP_ROOMS, MAP_NODES_DATA, DANGER_COLORS     │
 * │   @/app/actions/gameActions → movePlayer                                   │
 * │                                                                             │
 * │ IMPORTED BY:                                                                │
 * │   app/page.tsx → используется в правой нижней части (45% высоты)           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ SVG LAYERS (z-order)                                                        │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │   Layer 0: MAP_ROOMS                                                        │
 * │     - Прямоугольники комнат (stroke: #333)                                 │
 * │     - Названия комнат (fill: #444, fontSize: 2)                            │
 * │                                                                             │
 * │   Layer 1: Пути (lines)                                                     │
 * │     - Все соединения между нодами                                          │
 * │     - Доступные пути подсвечены красным (#ef4444)                          │
 * │     - LOOP_DISTRIBUTOR имеет пунктирную линию                              │
 * │                                                                             │
 * │   Layer 2: Ноды (circles + text)                                            │
 * │     - Текущая позиция: фиолетовый (#8b5cf6), r=2                           │
 * │     - Доступные: зелёный (#22c55e), пульсация                              │
 * │     - Редкий лут: красный (#ef4444)                                        │
 * │     - Расходники: синий (#3b82f6)                                          │
 * │     - Обычные: серый (#3f3f46)                                             │
 * │     - Игроки: маленькие круги под нодой                                    │
 * │     - Враги: красный круг с анимацией справа сверху                        │
 * │                                                                             │
 * │   Legend (absolute positioned):                                             │
 * │     [●] вы  [●] путь  [●] редкий  [●] расх.                                │
 * │                                                                             │
 * │ INTERACTIONS:                                                               │
 * │   - Клик на ноду: onNodeSelect(node) - показать информацию                 │
 * │   - Клик на соседнюю ноду: movePlayer() - перемещение игрока               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState } from 'react';
import { MAP_ROOMS, MAP_NODES_DATA, MAP_JOINTS, DANGER_COLORS, MapNodeData } from '@/lib/mapData';
import { movePlayer } from '@/app/actions/gameActions';
import MoveConfirmDialog from './MoveConfirmDialog';

interface GameMapProps {
  currentNodeId: string;
  gameId: string;
  playerId: string;
  allPlayers: any[];
  enemies: any[];
  selectedNode: MapNodeData | null;
  onNodeSelect: (node: MapNodeData) => void;
  currentStamina: number;
  maxStamina: number;
  onMoveRequest?: (targetNode: MapNodeData, staminaCost: number) => void;
}

// Базовая стоимость перемещения
const BASE_MOVE_COST = 1;

export default function GameMap({
  currentNodeId,
  gameId,
  playerId,
  allPlayers = [],
  enemies,
  selectedNode,
  onNodeSelect,
  currentStamina = 4,
  maxStamina = 7,
  onMoveRequest
}: GameMapProps) {
  const [pendingMove, setPendingMove] = useState<MapNodeData | null>(null);

  const currentNode = MAP_NODES_DATA.find(n => n.id === currentNodeId);
  const neighbors = currentNode?.neighbors || [];

  // Получить стоимость перемещения (можно сделать зависящей от опасности)
  const getMoveCost = (node: MapNodeData): number => {
    // Базовая стоимость + дополнительная за опасные зоны
    const dangerCosts: Record<string, number> = {
      'safe': 0,
      'low': 0,
      'medium': 0,
      'high': 1,
      'extreme': 1
    };
    return BASE_MOVE_COST + (dangerCosts[node.dangerLevel] || 0);
  };

  const handleNodeClick = (node: MapNodeData) => {
    // Всегда выбираем ноду для отображения информации
    onNodeSelect(node);

    // Если это соседний узел - показываем диалог подтверждения
    if (neighbors.includes(node.id)) {
      setPendingMove(node);
    }
  };

  const handleConfirmMove = async () => {
    if (!pendingMove) return;

    const staminaCost = getMoveCost(pendingMove);

    // Если есть внешний обработчик - используем его (для учёта выносливости)
    if (onMoveRequest) {
      onMoveRequest(pendingMove, staminaCost);
      setPendingMove(null);
      return;
    }

    // Fallback - прямое перемещение
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

  // Проверка врага в целевой точке
  const getEnemyAtNode = (nodeId: string) => {
    return enemies.find(e => e.currentNode === nodeId);
  };

  return (
    <div className="relative w-full h-full bg-black border border-white/20 overflow-hidden">
      {/* Заголовок */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/80 px-3 py-2 border-b border-white/20 flex items-center justify-between">
        <span className="text-white/50 font-mono text-xs">КАРТА ОБЪЕКТА</span>
        <span className="text-white/30 font-mono text-xs">GAME MAP</span>
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

        {/* Слой 0.5: Дверные проёмы (joints) */}
        {MAP_JOINTS.map((joint, idx) => {
          // Определяем цвет и стиль в зависимости от типа прохода
          let strokeColor = '#000'; // Чёрный для "вырезания" в стенах
          let strokeWidth = joint.width * 0.15;
          let strokeDasharray = '0';

          if (joint.type === 'CURTAIN_OPENING') {
            strokeColor = '#7c3aed'; // Фиолетовый для занавесок
            strokeDasharray = '0.5 0.3';
          } else if (joint.type === 'DOOR_HIDDEN') {
            strokeColor = '#1f1f1f'; // Тёмно-серый для скрытых дверей
          } else if (joint.type === 'OPENING') {
            strokeColor = '#000';
            strokeWidth = joint.width * 0.12;
          }

          // Рисуем линию прохода (вырез в стене)
          const halfWidth = joint.width / 2;
          const x1 = joint.axis === 'X' ? joint.pos[0] - halfWidth : joint.pos[0];
          const y1 = joint.axis === 'Y' ? joint.pos[1] - halfWidth : joint.pos[1];
          const x2 = joint.axis === 'X' ? joint.pos[0] + halfWidth : joint.pos[0];
          const y2 = joint.axis === 'Y' ? joint.pos[1] + halfWidth : joint.pos[1];

          return (
            <line
              key={`joint-${idx}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
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
                x1={node.pos[0]}
                y1={node.pos[1]}
                x2={neighbor.pos[0]}
                y2={neighbor.pos[1]}
                stroke={isPath ? "#ef4444" : "#444"}
                strokeWidth={isPath ? "0.5" : "0.3"}
                strokeDasharray={node.type === "LOOP_DISTRIBUTOR" ? "1 1" : "0"}
              />
            );
          })
        )}

        {/* Слой 2: Узлы */}
        {MAP_NODES_DATA.map(node => {
          const isCurrent = node.id === currentNodeId;
          const isNeighbor = neighbors.includes(node.id);
          const isSelected = selectedNode?.id === node.id;
          const enemyInNode = enemies.find(e => e.currentNode === node.id);
          const playersHere = allPlayers.filter(p => p.currentNode === node.id);

          // Цвет узла по типу
          let nodeColor = '#3f3f46'; // Обычный серый
          if (isCurrent) nodeColor = '#8b5cf6'; // Фиолетовый - текущая позиция
          else if (isNeighbor) nodeColor = '#22c55e'; // Зелёный - можно идти
          else if (node.lootType === 'rare') nodeColor = '#ef4444'; // Красный - редкий лут
          else if (node.lootType === 'supplies') nodeColor = '#3b82f6'; // Синий - расходники

          return (
            <g
              key={node.id}
              className="transition-all cursor-pointer"
              onClick={() => handleNodeClick(node)}
            >
              {/* Область клика */}
              <circle
                cx={node.pos[0]}
                cy={node.pos[1]}
                r="4"
                fill="transparent"
                className="hover:fill-white/10"
              />

              {/* Подсветка выбранного узла */}
              {isSelected && (
                <circle
                  cx={node.pos[0]}
                  cy={node.pos[1]}
                  r="3"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.3"
                  strokeDasharray="0.5 0.5"
                  className="animate-pulse"
                />
              )}

              {/* Основной круг узла */}
              <circle
                cx={node.pos[0]}
                cy={node.pos[1]}
                r={isCurrent ? 2 : isSelected ? 1.8 : 1.2}
                fill={nodeColor}
                stroke={isNeighbor ? "#4ade80" : isSelected ? "#fff" : "none"}
                strokeWidth="0.4"
                className={isNeighbor ? "animate-pulse" : ""}
              />

              {/* ID узла */}
              <text
                x={node.pos[0]}
                y={node.pos[1] - 3}
                fontSize="2"
                fill={isCurrent ? "#fff" : isNeighbor ? "#fff" : isSelected ? "#fff" : "#666"}
                textAnchor="middle"
                className="font-mono font-bold select-none pointer-events-none"
              >
                {node.id}
              </text>

              {/* Игроки */}
              {playersHere.map((p, idx) => (
                <circle
                  key={p.id}
                  cx={node.pos[0] - 1.5 + idx * 1.2}
                  cy={node.pos[1] + 2.5}
                  r="0.8"
                  fill={p.id === playerId ? "#A855F7" : "#3B82F6"}
                  className="transition-all duration-500"
                />
              ))}

              {/* Враг */}
              {enemyInNode && (
                <circle
                  cx={node.pos[0] + 1.8}
                  cy={node.pos[1] - 1.8}
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
      <div className="absolute bottom-2 left-2 z-10 bg-black/80 px-2 py-1 border border-white/10">
        <div className="flex items-center gap-3 text-[8px] font-mono text-white/50">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500" />вы
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />путь
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />редкий
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />расх.
          </span>
        </div>
      </div>

      {/* Выносливость */}
      <div className="absolute bottom-2 right-2 z-10 bg-black/80 px-2 py-1 border border-white/10">
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <span className="text-yellow-400">⚡</span>
          <span className="text-white/70">{currentStamina}/{maxStamina}</span>
        </div>
      </div>

      {/* Диалог подтверждения перемещения */}
      {pendingMove && (
        <MoveConfirmDialog
          targetNode={pendingMove}
          currentStamina={currentStamina}
          staminaCost={getMoveCost(pendingMove)}
          hasEnemyAtTarget={!!getEnemyAtNode(pendingMove.id)}
          enemyName={getEnemyAtNode(pendingMove.id)?.type}
          onConfirm={handleConfirmMove}
          onCancel={handleCancelMove}
        />
      )}
    </div>
  );
}
