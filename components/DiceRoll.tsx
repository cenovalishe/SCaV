/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/DiceRoll.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Компонент броска кубика для проверки уклонения от аниматроника
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ PROPS:                                                                      │
 * │   targetValue      - number - значение для успешного уклонения (1-6)       │
 * │   stealthBonus     - number - бонус скрытности игрока                      │
 * │   onResult         - (success: boolean, roll: number) => void              │
 * │   animatronicName  - string - имя аниматроника для отображения             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react';

interface DiceRollProps {
  targetValue: number;       // Целевое значение (нужно выбросить >= этого значения)
  stealthBonus: number;      // Бонус скрытности
  onResult: (success: boolean, roll: number) => void;
  animatronicName: string;
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DiceRoll({
  targetValue,
  stealthBonus,
  onResult,
  animatronicName
}: DiceRollProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [currentFace, setCurrentFace] = useState(0);
  const [finalRoll, setFinalRoll] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Анимация кубика
  useEffect(() => {
    if (!isRolling) return;

    const interval = setInterval(() => {
      setCurrentFace(Math.floor(Math.random() * 6));
    }, 80);

    // Остановка через 1.5 секунды
    const timeout = setTimeout(() => {
      clearInterval(interval);
      const roll = Math.floor(Math.random() * 6) + 1;
      setFinalRoll(roll);
      setCurrentFace(roll - 1);
      setIsRolling(false);

      // Показать результат через небольшую паузу
      setTimeout(() => {
        setShowResult(true);
      }, 500);
    }, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isRolling]);

  // Обработка результата
  useEffect(() => {
    if (showResult && finalRoll !== null) {
      const totalRoll = finalRoll + stealthBonus;
      const success = totalRoll >= targetValue;

      // Задержка перед вызовом onResult для показа результата
      const timeout = setTimeout(() => {
        onResult(success, finalRoll);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [showResult, finalRoll, stealthBonus, targetValue, onResult]);

  const handleRoll = useCallback(() => {
    if (!isRolling && finalRoll === null) {
      setIsRolling(true);
    }
  }, [isRolling, finalRoll]);

  const totalRoll = finalRoll !== null ? finalRoll + stealthBonus : null;
  const isSuccess = totalRoll !== null ? totalRoll >= targetValue : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Анимированный фон */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-black to-orange-900/20 animate-pulse" />
        {/* Сканлинии */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)'
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 p-8 border border-red-500/30 bg-black/80 rounded-lg max-w-md">
        {/* Заголовок */}
        <div className="text-center">
          <div className="text-red-500 font-mono text-sm uppercase tracking-wider animate-pulse">
            ⚠ ОБНАРУЖЕН ⚠
          </div>
          <h2 className="text-3xl font-bold text-white mt-2 font-mono">
            {animatronicName}
          </h2>
          <p className="text-white/60 text-sm mt-2">
            Бросьте кубик для уклонения
          </p>
        </div>

        {/* Кубик */}
        <div
          className={`
            text-8xl select-none transition-transform duration-100
            ${isRolling ? 'animate-bounce' : ''}
            ${showResult ? (isSuccess ? 'text-green-400' : 'text-red-400') : 'text-white'}
          `}
          style={{
            textShadow: showResult
              ? (isSuccess ? '0 0 20px rgba(74, 222, 128, 0.5)' : '0 0 20px rgba(239, 68, 68, 0.5)')
              : '0 0 10px rgba(255,255,255,0.3)'
          }}
        >
          {DICE_FACES[currentFace]}
        </div>

        {/* Информация о броске */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-white/70 font-mono text-sm">
            <span>Цель: <span className="text-yellow-400">{targetValue}+</span></span>
            <span className="text-white/30">|</span>
            <span>Бонус: <span className="text-blue-400">+{stealthBonus}</span></span>
          </div>

          {/* Результат */}
          {showResult && finalRoll !== null && (
            <div className="mt-4 space-y-2 animate-fade-in">
              <div className="text-white font-mono">
                Бросок: <span className="text-xl">{finalRoll}</span> + {stealthBonus} = <span className="text-xl font-bold">{totalRoll}</span>
              </div>
              <div className={`text-2xl font-bold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                {isSuccess ? '✓ УКЛОНЕНИЕ!' : '✗ ПРОВАЛ!'}
              </div>
            </div>
          )}
        </div>

        {/* Кнопка броска */}
        {!isRolling && finalRoll === null && (
          <button
            onClick={handleRoll}
            className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold font-mono uppercase tracking-wider transition-all duration-200 border border-red-400/50 hover:border-red-300"
          >
            🎲 Бросить кубик
          </button>
        )}

        {isRolling && (
          <div className="text-white/50 font-mono text-sm animate-pulse">
            Кубик катится...
          </div>
        )}
      </div>
    </div>
  );
}
