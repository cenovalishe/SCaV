/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/ActionPanel.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Панель действий игрока - лутинг, ожидание, использование предметов
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ PROPS:                                                                      │
 * │   currentNode       - MapNodeData - текущая локация                        │
 * │   currentStamina    - number - текущая выносливость                        │
 * │   isLooting         - boolean - идёт ли лутинг                             │
 * │   canLoot           - boolean - можно ли лутить (есть лут и выносливость)  │
 * │   hasEnemyHere      - boolean - есть ли враг в локации                     │
 * │   onLoot            - () => void - начать лутинг                           │
 * │   onWait            - () => void - пропустить ход                          │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React from 'react';
import { MapNodeData } from '@/lib/mapData';

interface ActionPanelProps {
  currentNode: MapNodeData | null;
  currentStamina: number;
  isLooting: boolean;
  canLoot: boolean;
  hasEnemyHere: boolean;
  onLoot: () => void;
  onWait: () => void;
}

const LOOT_COST = 1; // Стоимость лутинга в выносливости

export default function ActionPanel({
  currentNode,
  currentStamina,
  isLooting,
  canLoot,
  hasEnemyHere,
  onLoot,
  onWait
}: ActionPanelProps) {
  const hasLoot = currentNode && currentNode.possibleLoot.length > 0;
  const enoughStamina = currentStamina >= LOOT_COST;
  const lootDisabled = !canLoot || !hasLoot || !enoughStamina || hasEnemyHere || isLooting;

  // Получаем тип лута для отображения
  const getLootTypeLabel = () => {
    if (!currentNode) return '';
    switch (currentNode.lootType) {
      case 'rare': return 'Редкий лут';
      case 'supplies': return 'Расходники';
      default: return 'Обычный лут';
    }
  };

  const getLootTypeColor = () => {
    if (!currentNode) return 'text-white/50';
    switch (currentNode.lootType) {
      case 'rare': return 'text-red-400';
      case 'supplies': return 'text-blue-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-white/10 rounded-lg p-3">
      {/* Заголовок */}
      <div className="text-white/50 font-mono text-xs uppercase tracking-wider mb-3">
        Действия
      </div>

      {/* Информация о локации */}
      {currentNode && (
        <div className="mb-3 p-2 bg-black/50 rounded border border-white/5">
          <div className="text-white/70 font-mono text-sm">
            {currentNode.nameRu}
          </div>
          {hasLoot && (
            <div className={`font-mono text-xs mt-1 ${getLootTypeColor()}`}>
              {getLootTypeLabel()} ({currentNode.possibleLoot.length} предметов)
            </div>
          )}
          {!hasLoot && (
            <div className="text-white/30 font-mono text-xs mt-1">
              Нет лута в этой локации
            </div>
          )}
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex flex-col gap-2">
        {/* Кнопка лутинга */}
        <button
          onClick={onLoot}
          disabled={lootDisabled}
          className={`
            w-full px-4 py-2 font-mono text-sm font-bold transition-all border rounded
            flex items-center justify-center gap-2
            ${lootDisabled
              ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
              : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 hover:border-amber-400'
            }
          `}
        >
          {isLooting ? (
            <>
              <span className="animate-spin">⟳</span>
              <span>Обыскиваю...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Обыскать</span>
              <span className="text-xs opacity-70">({LOOT_COST}⚡)</span>
            </>
          )}
        </button>

        {/* Предупреждение о враге */}
        {hasEnemyHere && (
          <div className="text-red-400 font-mono text-xs text-center animate-pulse">
            ⚠ Враг рядом! Лутинг невозможен
          </div>
        )}

        {/* Кнопка ожидания */}
        <button
          onClick={onWait}
          disabled={isLooting}
          className={`
            w-full px-4 py-2 font-mono text-sm transition-all border rounded
            flex items-center justify-center gap-2
            ${isLooting
              ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
              : 'bg-zinc-700 hover:bg-zinc-600 text-white/70 border-zinc-600 hover:border-zinc-500'
            }
          `}
        >
          <span>⏳</span>
          <span>Ждать</span>
        </button>
      </div>

      {/* Подсказка */}
      <div className="mt-3 text-white/30 font-mono text-[10px] text-center">
        Выносливость: {currentStamina}⚡
      </div>
    </div>
  );
}
