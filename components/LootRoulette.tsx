/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/LootRoulette.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Анимация рулетки открытия контейнера с лутом (кейс-анимация)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES                                                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Горизонтальная прокрутка предметов                                        │
 * │ - Плавное замедление анимации                                               │
 * │ - Выпадает 2 предмета одновременно                                         │
 * │ - Визуальные эффекты и звуковые подсказки                                  │
 * │ - Разные редкости предметов с подсветкой                                   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Item } from '@/lib/types';
import { ITEMS, getItemById, formatRoubles } from '@/lib/itemData';

interface LootRouletteProps {
  possibleItems: string[]; // ID возможных предметов
  onComplete: (items: Item[]) => void;
  onClose: () => void;
}

// Получаем цвет по ценности предмета
function getItemRarity(value: number): { color: string; glow: string; label: string } {
  if (value >= 50000) return { color: 'from-yellow-400 to-amber-500', glow: 'shadow-yellow-500/50', label: 'ЛЕГЕНДАРНЫЙ' };
  if (value >= 15000) return { color: 'from-purple-400 to-purple-600', glow: 'shadow-purple-500/50', label: 'РЕДКИЙ' };
  if (value >= 5000) return { color: 'from-blue-400 to-blue-600', glow: 'shadow-blue-500/50', label: 'НЕОБЫЧНЫЙ' };
  if (value >= 1000) return { color: 'from-green-400 to-green-600', glow: 'shadow-green-500/50', label: 'ОБЫЧНЫЙ' };
  return { color: 'from-gray-400 to-gray-600', glow: 'shadow-gray-500/30', label: 'ХЛАМ' };
}

// Генерируем массив для рулетки с повторами
function generateRouletteItems(possibleIds: string[], count: number = 50): Item[] {
  const items: Item[] = [];
  const possibleItems = possibleIds.map(id => getItemById(id)).filter(Boolean) as Item[];

  if (possibleItems.length === 0) {
    // Fallback - используем все предметы
    const allItems = Object.values(ITEMS);
    for (let i = 0; i < count; i++) {
      items.push(allItems[Math.floor(Math.random() * allItems.length)]);
    }
  } else {
    for (let i = 0; i < count; i++) {
      items.push(possibleItems[Math.floor(Math.random() * possibleItems.length)]);
    }
  }

  return items;
}

// Выбираем 2 случайных предмета с учётом весов
function selectWinningItems(possibleIds: string[]): Item[] {
  const possibleItems = possibleIds.map(id => getItemById(id)).filter(Boolean) as Item[];
  if (possibleItems.length === 0) return [];

  // Выбираем 2 предмета
  const result: Item[] = [];
  for (let i = 0; i < 2; i++) {
    const randomIndex = Math.floor(Math.random() * possibleItems.length);
    result.push(possibleItems[randomIndex]);
  }

  return result;
}

export default function LootRoulette({
  possibleItems,
  onComplete,
  onClose
}: LootRouletteProps) {
  const [phase, setPhase] = useState<'intro' | 'spinning' | 'result'>('intro');
  const [rouletteItems, setRouletteItems] = useState<Item[]>([]);
  const [winningItems, setWinningItems] = useState<Item[]>([]);
  const [offset, setOffset] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const ITEM_WIDTH = 100; // Ширина одного предмета
  const VISIBLE_ITEMS = 7; // Видимых предметов
  const WINNING_INDEX_1 = 34; // Индекс первого выигрышного предмета (под левой стрелкой)
  const WINNING_INDEX_2 = 36; // Индекс второго выигрышного предмета (под правой стрелкой, через 1 предмет)
  const ARROW_GAP = (WINNING_INDEX_2 - WINNING_INDEX_1) * ITEM_WIDTH; // Расстояние между стрелками = 200px

  // Инициализация
  useEffect(() => {
    const items = generateRouletteItems(possibleItems, 50);
    const winners = selectWinningItems(possibleItems);

    // Вставляем выигрышные предметы на нужные позиции (через 1 предмет)
    if (winners[0]) items[WINNING_INDEX_1] = winners[0];
    if (winners[1]) items[WINNING_INDEX_2] = winners[1];

    setRouletteItems(items);
    setWinningItems(winners);
  }, [possibleItems]);

  // Запуск анимации
  const startSpin = useCallback(() => {
    setPhase('spinning');

    // Целевой offset чтобы выигрышные предметы были под стрелками
    // Левая стрелка над WINNING_INDEX_1, правая стрелка над WINNING_INDEX_2
    // Центрируем на WINNING_INDEX_1 (он будет точно под первой стрелкой)
    const targetOffset = (WINNING_INDEX_1 - Math.floor(VISIBLE_ITEMS / 2)) * ITEM_WIDTH;

    // Анимация
    let startTime: number;
    const duration = 5000; // 5 секунд

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function - замедление в конце
      const easeOut = 1 - Math.pow(1 - progress, 4);

      setOffset(easeOut * targetOffset);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Анимация завершена
        setTimeout(() => {
          setPhase('result');
          setShowResults(true);
        }, 500);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  // Завершение
  const handleComplete = useCallback(() => {
    onComplete(winningItems);
    onClose();
  }, [winningItems, onComplete, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      {/* Фоновые эффекты */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/30 via-black to-orange-950/20" />

        {/* Частицы */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-amber-400 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                opacity: 0.3
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-4xl px-4">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="text-amber-400 font-mono text-3xl uppercase tracking-[0.5em] font-bold mb-2"
            style={{ textShadow: '0 0 20px rgba(251, 191, 36, 0.5)' }}>
            🎁 КОНТЕЙНЕР С ЛУТОМ 🎁
          </div>
          <p className="text-white/50 font-mono text-sm">
            {phase === 'intro' && 'Нажмите чтобы открыть'}
            {phase === 'spinning' && 'Определение содержимого...'}
            {phase === 'result' && '🎉 ПОЗДРАВЛЯЕМ! 🎉'}
          </p>
        </div>

        {/* Рулетка */}
        <div className="relative">
          {/* Указатель */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-amber-400
              drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
          </div>

          {/* Второй указатель (для второго предмета - через один предмет) */}
          <div className="absolute top-0 z-20" style={{ left: `calc(50% + ${ARROW_GAP}px)`, transform: 'translateX(-50%) translateY(-8px)' }}>
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-orange-400
              drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
          </div>

          {/* Контейнер рулетки */}
          <div
            className="relative h-32 overflow-hidden rounded-2xl border-4 border-amber-500/50 bg-gradient-to-b from-zinc-900 to-black shadow-2xl shadow-amber-500/20"
          >
            {/* Затемнение по краям */}
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

            {/* Линия победителя */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-amber-400/50 z-10" />
            {/* Вторая линия победителя (через один предмет) */}
            <div className="absolute top-0 bottom-0 z-10"
              style={{ left: `calc(50% + ${ARROW_GAP}px)`, width: '1px', background: 'rgba(249, 115, 22, 0.5)' }} />

            {/* Предметы */}
            <div
              ref={containerRef}
              className="flex items-center h-full transition-none"
              style={{
                transform: `translateX(calc(50% - ${offset}px - ${ITEM_WIDTH / 2}px - ${ITEM_WIDTH}px))`
              }}
            >
              {rouletteItems.map((item, idx) => {
                const rarity = getItemRarity(item.value);
                const isWinner = phase === 'result' && (idx === WINNING_INDEX_1 || idx === WINNING_INDEX_2);

                return (
                  <div
                    key={idx}
                    className={`
                      flex-shrink-0 flex flex-col items-center justify-center p-2
                      transition-all duration-300
                      ${isWinner ? 'scale-110 z-20' : ''}
                    `}
                    style={{ width: ITEM_WIDTH }}
                  >
                    <div className={`
                      w-20 h-20 rounded-xl
                      bg-gradient-to-br ${rarity.color}
                      flex items-center justify-center
                      ${isWinner ? `shadow-2xl ${rarity.glow} ring-2 ring-white animate-pulse` : 'shadow-lg'}
                    `}>
                      <span className="text-4xl drop-shadow-lg">{item.icon}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Результат */}
        {showResults && winningItems.length > 0 && (
          <div className="mt-8 animate-[fade-in_0.5s_ease-out]">
            <div className="text-center text-white/60 font-mono text-sm mb-4 uppercase tracking-wider">
              Вы получили:
            </div>

            <div className="flex justify-center gap-6">
              {winningItems.map((item, idx) => {
                const rarity = getItemRarity(item.value);
                return (
                  <div key={idx} className="text-center">
                    <div className={`
                      w-24 h-24 rounded-2xl mx-auto mb-3
                      bg-gradient-to-br ${rarity.color}
                      flex items-center justify-center
                      shadow-2xl ${rarity.glow}
                      ring-2 ring-white/50
                      animate-bounce
                    `}
                      style={{ animationDelay: `${idx * 0.2}s` }}
                    >
                      <span className="text-5xl drop-shadow-lg">{item.icon}</span>
                    </div>
                    <div className="text-white font-mono font-bold text-lg">{item.nameRu}</div>
                    <div className={`font-mono text-xs mt-1 px-2 py-0.5 rounded inline-block bg-gradient-to-r ${rarity.color} text-black font-bold`}>
                      {rarity.label}
                    </div>
                    <div className="text-amber-400 font-mono text-sm mt-2">
                      {formatRoubles(item.value)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Общая ценность */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-amber-900/30 border border-amber-500/50 rounded-xl">
                <span className="text-3xl">💰</span>
                <div>
                  <div className="text-amber-400/70 font-mono text-xs">ОБЩАЯ ЦЕННОСТЬ</div>
                  <div className="text-amber-400 font-mono text-2xl font-bold">
                    {formatRoubles(winningItems.reduce((sum, item) => sum + item.value, 0))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Кнопки */}
        <div className="mt-8 flex justify-center gap-4">
          {phase === 'intro' && (
            <button
              onClick={startSpin}
              className="group relative px-12 py-4 overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 animate-gradient" />
              <div className="absolute inset-[3px] rounded-xl bg-gradient-to-b from-amber-700 to-amber-900" />
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              <div className="relative flex items-center gap-3 text-white font-bold font-mono uppercase tracking-wider text-xl">
                <span className="text-2xl">🎰</span>
                <span>ОТКРЫТЬ</span>
              </div>
            </button>
          )}

          {phase === 'result' && (
            <button
              onClick={handleComplete}
              className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500
                text-white font-bold font-mono uppercase tracking-wider rounded-xl
                border border-green-400/50 shadow-lg shadow-green-500/30 transition-all hover:scale-105"
            >
              ✓ ЗАБРАТЬ
            </button>
          )}
        </div>

        {/* Кнопка закрытия */}
        {phase !== 'spinning' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center
              text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
