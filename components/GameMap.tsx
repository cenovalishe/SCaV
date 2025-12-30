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
import { MAP_ROOMS, MAP_NODES_DATA, MAP_JOINTS, DANGER_COLORS, MapNodeData, ANIMATRONIC_SPAWNS } from '@/lib/mapData';
import { movePlayer } from '@/app/actions/gameActions';
import MoveConfirmDialog from './MoveConfirmDialog';

// Цвета для аниматроников
const ANIMATRONIC_COLORS: Record<string, string> = {
  'foxy': '#EF4444',    // Красный
  'bonnie': '#3B82F6',  // Синий
  'chica': '#EAB308',   // Жёлтый
  'freddy': '#92400E',  // Коричневый
  'default': '#EF4444'  // По умолчанию красный
};

// Цвета для игроков (по индексу)
const PLAYER_COLORS = [
  '#A855F7', // Фиолетовый (текущий игрок всегда фиолетовый)
  '#22C55E', // Зелёный
  '#F97316', // Оранжевый
  '#06B6D4', // Голубой
  '#EC4899', // Розовый
  '#84CC16', // Лаймовый
];

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

        {/* Слой 1: Пути - увеличенные и хорошо видимые */}
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
                stroke={isPath ? "#ef4444" : "#666"}
                strokeWidth={isPath ? "1.2" : "0.8"}
                strokeDasharray={node.type === "LOOP_DISTRIBUTOR" ? "2 1" : "0"}
                strokeLinecap="round"
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

          // Специальные красные точки (6, 3, 4)
          const isSpecialRedNode = ['6', '3', '4'].includes(node.id);

          // Цвет узла по типу
          let nodeColor = '#3f3f46'; // Обычный серый
          if (isCurrent) nodeColor = '#8b5cf6'; // Фиолетовый - текущая позиция
          else if (isNeighbor) nodeColor = '#22c55e'; // Зелёный - можно идти
          else if (isSpecialRedNode) nodeColor = '#dc2626'; // Красный - специальные точки
          else if (node.lootType === 'rare') nodeColor = '#ef4444'; // Красный - редкий лут
          else if (node.lootType === 'supplies') nodeColor = '#3b82f6'; // Синий - расходники

          return (
            <g
              key={node.id}
              className="transition-all cursor-pointer"
              onClick={() => handleNodeClick(node)}
            >
              {/* Область клика - увеличена */}
              <circle
                cx={node.pos[0]}
                cy={node.pos[1]}
                r="6"
                fill="transparent"
                className="hover:fill-white/10"
              />

              {/* Подсветка выбранного узла */}
              {isSelected && (
                <circle
                  cx={node.pos[0]}
                  cy={node.pos[1]}
                  r="4.5"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.4"
                  strokeDasharray="1 0.5"
                  className="animate-pulse"
                />
              )}

              {/* Основной круг узла - увеличен */}
              <circle
                cx={node.pos[0]}
                cy={node.pos[1]}
                r={isCurrent ? 3 : isSelected ? 2.8 : 2}
                fill={nodeColor}
                stroke={isNeighbor ? "#4ade80" : isSelected ? "#fff" : "#333"}
                strokeWidth={isNeighbor ? "0.8" : "0.4"}
                className={isNeighbor ? "animate-pulse" : ""}
              />

              {/* ID узла - увеличен */}
              <text
                x={node.pos[0]}
                y={node.pos[1] - 4.5}
                fontSize="3"
                fill={isCurrent ? "#fff" : isNeighbor ? "#fff" : isSelected ? "#fff" : "#888"}
                textAnchor="middle"
                className="font-mono font-bold select-none pointer-events-none"
                style={{ textShadow: '0 0 2px rgba(0,0,0,0.8)' }}
              >
                {node.id}
              </text>

              {/* Игроки */}
              {playersHere.map((p, idx) => {
                // Текущий игрок - всегда фиолетовый, остальные по порядку
                const isCurrentPlayer = p.id === playerId;
                const playerIndex = allPlayers.findIndex(ap => ap.id === p.id);
                const playerColor = isCurrentPlayer ? PLAYER_COLORS[0] : PLAYER_COLORS[(playerIndex % (PLAYER_COLORS.length - 1)) + 1];

                return (
                  <g key={p.id}>
                    <circle
                      cx={node.pos[0] - 1.5 + idx * 1.5}
                      cy={node.pos[1] + 3}
                      r="1"
                      fill={playerColor}
                      stroke={isCurrentPlayer ? "#fff" : "none"}
                      strokeWidth="0.3"
                      filter={isCurrentPlayer ? "drop-shadow(0 0 2px rgba(168, 85, 247, 0.8))" : "none"}
                      className="transition-all duration-500"
                    />
                    {/* Индикатор игрока */}
                    <text
                      x={node.pos[0] - 1.5 + idx * 1.5}
                      y={node.pos[1] + 3.3}
                      fontSize="0.8"
                      fill="#fff"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-mono font-bold select-none pointer-events-none"
                    >
                      {isCurrentPlayer ? '●' : ''}
                    </text>
                  </g>
                );
              })}

              {/* Враги (аниматроники) - разные цвета по типу */}
              {enemies.filter(e => e.currentNode === node.id).map((enemy, idx) => {
                const enemyColor = ANIMATRONIC_COLORS[enemy.type.toLowerCase()] || ANIMATRONIC_COLORS.default;
                return (
                  <g key={enemy.id}>
                    <circle
                      cx={node.pos[0] + 2 + idx * 1.5}
                      cy={node.pos[1] - 2}
                      r="1.1"
                      fill={enemyColor}
                      filter={`drop-shadow(0 0 2px ${enemyColor})`}
                    >
                      <animate
                        attributeName="r"
                        values="0.9;1.3;0.9"
                        dur={`${1.5 + Math.random()}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.7;1;0.7"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    {/* Первая буква имени */}
                    <text
                      x={node.pos[0] + 2 + idx * 1.5}
                      y={node.pos[1] - 1.8}
                      fontSize="1"
                      fill="#fff"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-mono font-bold select-none pointer-events-none"
                    >
                      {enemy.type.charAt(0).toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Легенда */}
      <div className="absolute bottom-2 left-2 z-10 bg-black/80 px-2 py-1 border border-white/10">
        <div className="flex items-center gap-2 text-[8px] font-mono text-white/50 flex-wrap">
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
          <span className="text-white/30">|</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ANIMATRONIC_COLORS.foxy }} />F
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ANIMATRONIC_COLORS.bonnie }} />B
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ANIMATRONIC_COLORS.chica }} />C
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ANIMATRONIC_COLORS.freddy }} />Fr
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

      {/* Панель подтверждения перемещения - встроенная в UI (не popup) */}
      {pendingMove && (
        <div className="absolute top-10 left-2 right-2 z-20">
          <div className="bg-zinc-900/95 border border-white/20 rounded-lg p-3 shadow-lg">
            {/* Информация о перемещении */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white/50 font-mono text-xs">→</span>
                <span className="text-white font-mono text-sm font-bold">
                  {pendingMove.nameRu}
                </span>
                <span className="text-white/40 font-mono text-xs">
                  [{pendingMove.id}]
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 text-xs">⚡</span>
                <span className={`font-mono text-xs ${currentStamina >= getMoveCost(pendingMove) ? 'text-yellow-400' : 'text-red-400'}`}>
                  {getMoveCost(pendingMove)}
                </span>
              </div>
            </div>

            {/* Предупреждение о враге */}
            {getEnemyAtNode(pendingMove.id) && (
              <div className="mb-2 px-2 py-1 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400 font-mono animate-pulse">
                ⚠ {getEnemyAtNode(pendingMove.id)?.type?.toUpperCase()} в этой локации!
              </div>
            )}

            {/* Кнопки */}
            <div className="flex gap-2">
              <button
                onClick={handleCancelMove}
                className="flex-1 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white/70 font-mono text-xs transition-colors border border-zinc-600 rounded"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmMove}
                disabled={currentStamina < getMoveCost(pendingMove)}
                className={`
                  flex-1 px-3 py-1.5 font-mono text-xs font-bold transition-all border rounded
                  ${currentStamina >= getMoveCost(pendingMove)
                    ? 'bg-green-600 hover:bg-green-500 text-white border-green-500'
                    : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  }
                `}
              >
                Идти
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
