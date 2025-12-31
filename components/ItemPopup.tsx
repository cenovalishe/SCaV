/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/ItemPopup.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Всплывающее окно с информацией о предмете и действиями
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES                                                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Отображение свойств предмета                                              │
 * │ - Цена в рублях                                                             │
 * │ - Кнопка "Использовать" (с расходом выносливости)                          │
 * │ - Кнопка "Выбросить" (без расхода)                                         │
 * │ - Стилизованный дизайн                                                      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React from 'react';
import { Item } from '@/lib/types';
import { formatRoubles } from '@/lib/itemData';

interface ItemPopupProps {
  item: Item;
  position: { x: number; y: number };
  onClose: () => void;
  onUse?: (itemId: string) => void;
  onDrop?: (itemId: string) => void;
  currentStamina?: number;
}

// Стоимость использования предмета
const USE_STAMINA_COST = 1;

export default function ItemPopup({
  item,
  position,
  onClose,
  onUse,
  onDrop,
  currentStamina = 7
}: ItemPopupProps) {
  const canUse = item.type === 'consumable' && currentStamina >= USE_STAMINA_COST;
  const isConsumable = item.type === 'consumable';

  // Получаем описание типа предмета
  const getTypeLabel = () => {
    switch (item.type) {
      case 'consumable': return { label: 'РАСХОДНИК', color: 'text-green-400', bg: 'bg-green-900/30' };
      case 'equipment': return { label: 'СНАРЯЖЕНИЕ', color: 'text-blue-400', bg: 'bg-blue-900/30' };
      case 'weapon': return { label: 'ОРУЖИЕ', color: 'text-red-400', bg: 'bg-red-900/30' };
      case 'valuable': return { label: 'ЦЕННОСТЬ', color: 'text-amber-400', bg: 'bg-amber-900/30' };
      case 'key': return { label: 'КЛЮЧ', color: 'text-purple-400', bg: 'bg-purple-900/30' };
      case 'attachment': return { label: 'ОБВЕС', color: 'text-cyan-400', bg: 'bg-cyan-900/30' };
      default: return { label: 'ПРЕДМЕТ', color: 'text-white/60', bg: 'bg-zinc-800' };
    }
  };

  // Описание эффектов
  const getEffectsText = () => {
    if (!item.effects || item.effects.length === 0) return null;

    return item.effects.map((effect, idx) => {
      const statLabels: Record<string, string> = {
        hp: 'Здоровье',
        stamina: 'Выносливость',
        speed: 'Скорость',
        attack: 'Атака',
        defense: 'Защита',
        stealth: 'Скрытность',
        roubles: 'Рубли'
      };

      const label = statLabels[effect.stat] || effect.stat;
      const sign = effect.value > 0 ? '+' : '';
      const typeSymbol = effect.type === 'multiply' ? 'x' : '';

      return (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="text-green-400">▸</span>
          <span className="text-white/70">{label}:</span>
          <span className="text-green-400 font-bold">{sign}{typeSymbol}{effect.value}</span>
        </div>
      );
    });
  };

  const typeInfo = getTypeLabel();

  return (
    <>
      {/* Оверлей для закрытия */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Popup */}
      <div
        className="fixed z-50 w-72 animate-[fade-in_0.15s_ease-out]"
        style={{
          left: Math.min(position.x, window.innerWidth - 300),
          top: Math.min(position.y, window.innerHeight - 400)
        }}
      >
        <div className="bg-gradient-to-b from-zinc-900 to-black border-2 border-white/20 rounded-xl overflow-hidden shadow-2xl shadow-black/50">
          {/* Заголовок с иконкой */}
          <div className="relative p-4 border-b border-white/10 bg-gradient-to-r from-zinc-800/50 to-transparent">
            {/* Декоративная линия */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            <div className="flex items-start gap-3">
              {/* Иконка предмета */}
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-3xl drop-shadow-lg">{item.icon}</span>
                </div>
                {/* Блик */}
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              </div>

              {/* Название и тип */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-mono font-bold text-base truncate">
                  {item.nameRu}
                </div>
                <div className="text-white/40 font-mono text-xs mt-0.5">
                  {item.name}
                </div>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded mt-2 ${typeInfo.bg}`}>
                  <span className={`font-mono text-[10px] font-bold ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Информация */}
          <div className="p-4 space-y-3">
            {/* Цена */}
            <div className="flex items-center justify-between p-2 bg-amber-900/20 border border-amber-500/30 rounded-lg">
              <span className="text-amber-400/70 font-mono text-xs uppercase">Ценность</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <span className="text-amber-400 font-mono font-bold text-lg">
                  {formatRoubles(item.value)}
                </span>
              </div>
            </div>

            {/* Размер */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50 font-mono">Размер:</span>
              <div className="flex items-center gap-1">
                {Array(item.size).fill(0).map((_, i) => (
                  <div key={i} className="w-4 h-4 bg-zinc-700 border border-zinc-600 rounded" />
                ))}
                <span className="text-white/60 font-mono ml-1">({item.size})</span>
              </div>
            </div>

            {/* Эффекты */}
            {item.effects && item.effects.length > 0 && (
              <div className="p-2 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="text-green-400/70 font-mono text-[10px] uppercase mb-2">Эффекты при использовании</div>
                {getEffectsText()}
              </div>
            )}

            {/* Стак */}
            {item.stackable && (
              <div className="flex items-center gap-2 text-sm text-white/50 font-mono">
                <span>📦</span>
                <span>Стакается до {item.maxStack}</span>
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="p-3 border-t border-white/10 space-y-2">
            {/* Использовать */}
            {isConsumable && (
              <button
                onClick={() => onUse?.(item.id)}
                disabled={!canUse}
                className={`
                  w-full px-4 py-2.5 rounded-lg font-mono text-sm font-bold uppercase tracking-wider
                  flex items-center justify-center gap-2 transition-all
                  ${canUse
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white border border-green-400/50 shadow-lg shadow-green-500/20'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  }
                `}
              >
                <span>💊</span>
                <span>Использовать</span>
                <span className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded ${canUse ? 'bg-black/20' : 'bg-black/30'}`}>
                  <span className="text-yellow-400">⚡</span>
                  <span>{USE_STAMINA_COST}</span>
                </span>
              </button>
            )}

            {/* Выбросить */}
            <button
              onClick={() => onDrop?.(item.id)}
              className="w-full px-4 py-2.5 rounded-lg font-mono text-sm font-bold uppercase tracking-wider
                flex items-center justify-center gap-2 transition-all
                bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800
                text-red-300 border border-red-500/30 hover:border-red-400/50"
            >
              <span>🗑️</span>
              <span>Выбросить</span>
            </button>

            {/* Закрыть */}
            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg font-mono text-xs text-white/50 hover:text-white/70
                bg-zinc-800/50 hover:bg-zinc-700/50 transition-all border border-transparent hover:border-white/10"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
