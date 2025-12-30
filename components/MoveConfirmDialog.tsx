/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/MoveConfirmDialog.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Диалог подтверждения перемещения с информацией о стоимости
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ PROPS:                                                                      │
 * │   targetNode        - MapNodeData - целевой узел                           │
 * │   currentStamina    - number - текущая выносливость                        │
 * │   staminaCost       - number - стоимость перемещения                       │
 * │   hasEnemyAtTarget  - boolean - есть ли враг в целевой точке               │
 * │   enemyName         - string? - имя врага (если есть)                      │
 * │   onConfirm         - () => void - подтверждение перемещения               │
 * │   onCancel          - () => void - отмена                                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React from 'react';
import { MapNodeData, DANGER_COLORS, DANGER_NAMES } from '@/lib/mapData';

interface MoveConfirmDialogProps {
  targetNode: MapNodeData;
  currentStamina: number;
  staminaCost: number;
  hasEnemyAtTarget: boolean;
  enemyName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function MoveConfirmDialog({
  targetNode,
  currentStamina,
  staminaCost,
  hasEnemyAtTarget,
  enemyName,
  onConfirm,
  onCancel
}: MoveConfirmDialogProps) {
  const canMove = currentStamina >= staminaCost;
  const dangerStyle = DANGER_COLORS[targetNode.dangerLevel];
  const dangerName = DANGER_NAMES[targetNode.dangerLevel];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80" onClick={onCancel}>
      <div
        className="relative bg-zinc-900 border border-white/20 rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="text-center mb-4">
          <div className="text-white/50 font-mono text-xs uppercase tracking-wider">
            Подтверждение перемещения
          </div>
          <h3 className="text-xl font-bold text-white mt-2 font-mono">
            → {targetNode.nameRu}
          </h3>
          <div className="text-white/40 font-mono text-xs">
            [{targetNode.id}]
          </div>
        </div>

        {/* Информация о локации */}
        <div className="space-y-3 mb-6">
          {/* Уровень опасности */}
          <div className={`flex items-center justify-between p-2 rounded ${dangerStyle.bg} border ${dangerStyle.border}`}>
            <span className="text-white/70 text-sm">Опасность:</span>
            <span className={`font-mono font-bold ${dangerStyle.text}`}>
              {dangerName} ({targetNode.dangerPercent}%)
            </span>
          </div>

          {/* Стоимость перемещения */}
          <div className="flex items-center justify-between p-2 rounded bg-zinc-800 border border-zinc-700">
            <span className="text-white/70 text-sm">Стоимость:</span>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold ${canMove ? 'text-yellow-400' : 'text-red-400'}`}>
                {staminaCost} ⚡
              </span>
              <span className="text-white/30">|</span>
              <span className="text-white/50 font-mono text-sm">
                {currentStamina} / {currentStamina}
              </span>
            </div>
          </div>

          {/* Предупреждение о враге */}
          {hasEnemyAtTarget && (
            <div className="flex items-center gap-2 p-2 rounded bg-red-900/30 border border-red-500/50 animate-pulse">
              <span className="text-red-400 text-lg">⚠</span>
              <div>
                <div className="text-red-400 font-mono text-sm font-bold">
                  ОБНАРУЖЕН ВРАГ!
                </div>
                <div className="text-red-300/70 text-xs font-mono">
                  {enemyName || 'Аниматроник'} в этой локации
                </div>
              </div>
            </div>
          )}

          {/* Недостаточно выносливости */}
          {!canMove && (
            <div className="flex items-center gap-2 p-2 rounded bg-orange-900/30 border border-orange-500/50">
              <span className="text-orange-400 text-lg">⚡</span>
              <div className="text-orange-400 font-mono text-sm">
                Недостаточно выносливости!
              </div>
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-mono text-sm transition-colors border border-zinc-600"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            disabled={!canMove}
            className={`
              flex-1 px-4 py-2 font-mono text-sm font-bold transition-all border
              ${canMove
                ? 'bg-green-600 hover:bg-green-500 text-white border-green-500 hover:border-green-400'
                : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
              }
            `}
          >
            {canMove ? 'Идти' : 'Нельзя'}
          </button>
        </div>
      </div>
    </div>
  );
}
