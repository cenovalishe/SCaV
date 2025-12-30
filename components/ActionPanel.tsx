/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/ActionPanel.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Панель действий игрока (REDESIGNED v2.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES                                                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Стилизованные кнопки действий                                            │
 * │ - Анимированные индикаторы процесса                                        │
 * │ - Улучшенная визуализация лута и угроз                                     │
 * │ - Callback для добавления лута в инвентарь                                 │
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
  foundItem?: { icon: string; name: string } | null; // Найденный предмет
}

const LOOT_COST = 1;

export default function ActionPanel({
  currentNode,
  currentStamina,
  isLooting,
  canLoot,
  hasEnemyHere,
  onLoot,
  onWait,
  foundItem
}: ActionPanelProps) {
  const hasLoot = currentNode && currentNode.possibleLoot.length > 0;
  const enoughStamina = currentStamina >= LOOT_COST;
  const lootDisabled = !canLoot || !hasLoot || !enoughStamina || hasEnemyHere || isLooting;

  const getLootTypeLabel = () => {
    if (!currentNode) return '';
    switch (currentNode.lootType) {
      case 'rare': return 'Редкий';
      case 'supplies': return 'Расходники';
      default: return 'Обычный';
    }
  };

  const getLootTypeConfig = () => {
    if (!currentNode) return { color: 'text-white/50', bg: 'bg-zinc-800', border: 'border-zinc-700' };
    switch (currentNode.lootType) {
      case 'rare': return { color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/30' };
      case 'supplies': return { color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-500/30' };
      default: return { color: 'text-green-400', bg: 'bg-green-900/30', border: 'border-green-500/30' };
    }
  };

  const lootConfig = getLootTypeConfig();

  return (
    <div className="h-full bg-gradient-to-b from-zinc-900 to-black border border-white/10 rounded-xl p-4 flex flex-col">
      {/* Заголовок */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 bg-amber-500 rounded-full" />
        <span className="text-white/80 font-mono text-sm uppercase tracking-[0.2em]">
          Действия
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
      </div>

      {/* Информация о локации */}
      {currentNode && (
        <div className="mb-4 p-3 bg-black/50 rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-white font-mono text-sm font-bold">
              {currentNode.nameRu}
            </div>
            <div className="text-white/30 font-mono text-xs">
              [{currentNode.id}]
            </div>
          </div>

          {hasLoot ? (
            <div className={`flex items-center gap-2 p-2 rounded ${lootConfig.bg} border ${lootConfig.border}`}>
              <span className="text-lg">💎</span>
              <div className="flex-1">
                <div className={`font-mono text-xs font-bold ${lootConfig.color}`}>
                  {getLootTypeLabel()} лут
                </div>
                <div className="text-white/40 text-[10px] font-mono">
                  {currentNode.possibleLoot.length} возможных предметов
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/30 font-mono text-xs p-2">
              <span>📭</span>
              <span>Нет лута</span>
            </div>
          )}
        </div>
      )}

      {/* Найденный предмет (анимация) */}
      {foundItem && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{foundItem.icon}</span>
            <div>
              <div className="text-yellow-400 font-mono text-xs uppercase">Найдено!</div>
              <div className="text-white font-mono text-sm font-bold">{foundItem.name}</div>
            </div>
          </div>
        </div>
      )}

      {/* Предупреждение о враге */}
      {hasEnemyHere && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500/50 rounded-lg flex items-center gap-3 animate-pulse">
          <span className="text-2xl">⚠</span>
          <div>
            <div className="text-red-400 font-mono text-sm font-bold">ОПАСНОСТЬ!</div>
            <div className="text-red-300/60 font-mono text-xs">Враг в локации. Лутинг невозможен.</div>
          </div>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex-1 flex flex-col gap-3">
        {/* Кнопка ОБЫСКАТЬ */}
        <button
          onClick={onLoot}
          disabled={lootDisabled}
          className={`
            relative w-full px-4 py-4 font-mono text-base font-bold transition-all rounded-xl
            flex items-center justify-center gap-3 overflow-hidden
            ${lootDisabled
              ? 'bg-zinc-800/50 text-zinc-500 border-2 border-zinc-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-2 border-amber-400 shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98]'
            }
          `}
        >
          {/* Фоновый эффект */}
          {!lootDisabled && !isLooting && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          )}

          {isLooting ? (
            <>
              <span className="text-2xl animate-spin">🔄</span>
              <span>Обыскиваю...</span>
            </>
          ) : (
            <>
              <span className="text-2xl">🔍</span>
              <span>ОБЫСКАТЬ</span>
              <div className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded-full">
                <span className="text-yellow-300">⚡</span>
                <span className="text-sm">{LOOT_COST}</span>
              </div>
            </>
          )}
        </button>

        {/* Кнопка ЖДАТЬ */}
        <button
          onClick={onWait}
          disabled={isLooting}
          className={`
            w-full px-4 py-3 font-mono text-sm transition-all rounded-xl
            flex items-center justify-center gap-2
            ${isLooting
              ? 'bg-zinc-800/50 text-zinc-500 border border-zinc-700 cursor-not-allowed'
              : 'bg-zinc-800 hover:bg-zinc-700 text-white/70 hover:text-white border border-zinc-600 hover:border-zinc-500'
            }
          `}
        >
          <span className="text-lg">⏳</span>
          <span>Ждать</span>
        </button>
      </div>

      {/* Футер с выносливостью */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/40 font-mono text-xs">Выносливость</span>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {Array(7).fill(0).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-2 rounded-sm transition-all ${
                    i < currentStamina
                      ? 'bg-yellow-400 shadow-sm shadow-yellow-400/50'
                      : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-yellow-400 font-mono text-sm font-bold">{currentStamina}⚡</span>
          </div>
        </div>
      </div>
    </div>
  );
}
