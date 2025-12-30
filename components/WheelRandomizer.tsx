/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/WheelRandomizer.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Колесо-рандомайзер с взвешенными значениями 1-10 и анимацией вращения
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ PROPS:                                                                      │
 * │   onResult         - (value: number) => void - результат вращения          │
 * │   title           - string - заголовок (опционально)                       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ВЕСА (по убыванию):
 *   1:  20% (вес 20)
 *   2:  17% (вес 17)
 *   3:  15% (вес 15)
 *   4:  12% (вес 12)
 *   5:  10% (вес 10)
 *   6:   8% (вес 8)
 *   7:   6% (вес 6)
 *   8:   5% (вес 5)
 *   9:   4% (вес 4)
 *   10:  3% (вес 3)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';

export type WheelActionType = 'confirm' | 'respin' | 'retreat';

export interface WheelResult {
  damage: number;
  action: WheelActionType;
  totalDamage: number; // Итоговый урон с учётом штрафов
}

interface WheelRandomizerProps {
  onResult: (result: WheelResult) => void;
  title?: string;
  onStaminaReset?: () => void; // Колбэк для обнуления выносливости
}

// Взвешенные значения (вес по убыванию)
const WHEEL_VALUES = [
  { value: 1, weight: 20, color: '#22c55e' },   // Зелёный - хороший результат
  { value: 2, weight: 17, color: '#4ade80' },
  { value: 3, weight: 15, color: '#86efac' },
  { value: 4, weight: 12, color: '#fef08a' },   // Жёлтый - средний
  { value: 5, weight: 10, color: '#fde047' },
  { value: 6, weight: 8, color: '#facc15' },
  { value: 7, weight: 6, color: '#fb923c' },    // Оранжевый - плохой
  { value: 8, weight: 5, color: '#f97316' },
  { value: 9, weight: 4, color: '#ef4444' },    // Красный - критический
  { value: 10, weight: 3, color: '#dc2626' },
];

const TOTAL_WEIGHT = WHEEL_VALUES.reduce((sum, v) => sum + v.weight, 0);

// Создаём сегменты колеса
function getWheelSegments() {
  const segments: { value: number; startAngle: number; endAngle: number; color: string }[] = [];
  let currentAngle = 0;

  for (const item of WHEEL_VALUES) {
    const anglePortion = (item.weight / TOTAL_WEIGHT) * 360;
    segments.push({
      value: item.value,
      startAngle: currentAngle,
      endAngle: currentAngle + anglePortion,
      color: item.color
    });
    currentAngle += anglePortion;
  }

  return segments;
}

// Выбор значения по весу
function getWeightedRandomValue(): number {
  const random = Math.random() * TOTAL_WEIGHT;
  let cumulative = 0;

  for (const item of WHEEL_VALUES) {
    cumulative += item.weight;
    if (random <= cumulative) {
      return item.value;
    }
  }

  return 1; // Fallback
}

// Получить угол для значения (центр сегмента)
function getAngleForValue(value: number): number {
  const segments = getWheelSegments();
  const segment = segments.find(s => s.value === value);
  if (!segment) return 0;
  return (segment.startAngle + segment.endAngle) / 2;
}

// Штрафы за действия
const RESPIN_DAMAGE = 5; // Урон за перекрут
const RETREAT_DAMAGE = 15; // Урон за отступление

export default function WheelRandomizer({
  onResult,
  title = 'УРОН',
  onStaminaReset
}: WheelRandomizerProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [targetValue, setTargetValue] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showActions, setShowActions] = useState(false); // Показать выбор действий
  const [accumulatedDamage, setAccumulatedDamage] = useState(0); // Накопленный урон от перекрутов
  const [respinCount, setRespinCount] = useState(0); // Количество перекрутов
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const segments = getWheelSegments();

  // Рисуем колесо
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Очистка
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Рисуем сегменты
    for (const segment of segments) {
      const startRad = (segment.startAngle - 90) * Math.PI / 180;
      const endRad = (segment.endAngle - 90) * Math.PI / 180;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startRad, endRad);
      ctx.closePath();

      ctx.fillStyle = segment.color;
      ctx.fill();

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Текст значения
      const midAngle = ((segment.startAngle + segment.endAngle) / 2 - 90) * Math.PI / 180;
      const textRadius = radius * 0.7;
      const textX = centerX + Math.cos(midAngle) * textRadius;
      const textY = centerY + Math.sin(midAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(midAngle + Math.PI / 2);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(segment.value.toString(), 0, 0);
      ctx.restore();
    }

    // Центр колеса
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#1f1f1f';
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [segments]);

  // Запуск вращения
  const handleSpin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);

    // Выбираем результат
    const result = getWeightedRandomValue();
    setTargetValue(result);

    // Вычисляем целевой угол
    const targetAngle = getAngleForValue(result);
    // 5-8 полных оборотов + целевой угол (стрелка сверху, значит вычитаем угол)
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = spins * 360 + (360 - targetAngle);

    setRotation(prev => prev + finalRotation);
  }, [isSpinning]);

  // Обработка окончания вращения
  useEffect(() => {
    if (!isSpinning) return;

    const timeout = setTimeout(() => {
      setIsSpinning(false);
      setShowResult(true);

      // Обнуляем выносливость при выпадении результата
      if (onStaminaReset) {
        onStaminaReset();
      }

      // Показываем кнопки действий через небольшую задержку
      setTimeout(() => {
        setShowActions(true);
      }, 1500);
    }, 4000); // Длительность анимации вращения

    return () => clearTimeout(timeout);
  }, [isSpinning, onStaminaReset]);

  // Обработка выбора действия
  const handleAction = useCallback((action: WheelActionType) => {
    if (targetValue === null) return;

    let totalDamage = targetValue;

    if (action === 'confirm') {
      // Принимаем урон от колеса + накопленный от перекрутов
      totalDamage = targetValue + accumulatedDamage;
    } else if (action === 'respin') {
      // Добавляем штраф за перекрут и крутим снова
      setAccumulatedDamage(prev => prev + RESPIN_DAMAGE);
      setRespinCount(prev => prev + 1);
      setShowActions(false);
      setShowResult(false);
      setTargetValue(null);
      // Крутим снова автоматически
      setTimeout(() => handleSpin(), 500);
      return;
    } else if (action === 'retreat') {
      // Отступление с большим уроном
      totalDamage = RETREAT_DAMAGE + accumulatedDamage;
    }

    onResult({
      damage: targetValue,
      action,
      totalDamage
    });
  }, [targetValue, accumulatedDamage, onResult]);

  const resultColor = targetValue !== null
    ? WHEEL_VALUES.find(v => v.value === targetValue)?.color || '#fff'
    : '#fff';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      {/* Анимированный фон */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 via-black to-purple-900/20" />
        {/* Пульсация при результате */}
        {showResult && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ backgroundColor: `${resultColor}10` }}
          />
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Заголовок */}
        <div className="text-center">
          <div className="text-red-500 font-mono text-lg uppercase tracking-wider">
            {title}
          </div>
          <p className="text-white/60 text-sm mt-1">
            Крутите колесо!
          </p>
        </div>

        {/* Контейнер колеса */}
        <div className="relative">
          {/* Стрелка-указатель */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-white drop-shadow-lg" />
          </div>

          {/* Колесо */}
          <div
            className="transition-transform"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
            }}
          >
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="drop-shadow-2xl"
            />
          </div>

          {/* Свечение при вращении */}
          {isSpinning && (
            <div className="absolute inset-0 rounded-full animate-spin-slow opacity-30 pointer-events-none"
              style={{
                background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)'
              }}
            />
          )}
        </div>

        {/* Результат */}
        {showResult && targetValue !== null && (
          <div className="text-center animate-bounce-in">
            <div className="text-white/60 font-mono text-sm">Результат:</div>
            <div
              className="text-6xl font-bold font-mono mt-2"
              style={{ color: resultColor, textShadow: `0 0 30px ${resultColor}` }}
            >
              {targetValue}
            </div>
            {accumulatedDamage > 0 && (
              <div className="text-orange-400 font-mono text-sm mt-1">
                +{accumulatedDamage} (штраф за перекруты)
              </div>
            )}
            <div className="text-white/40 font-mono text-sm mt-2">
              {!showActions ? 'Ожидание выбора...' : 'Выберите действие'}
            </div>
          </div>
        )}

        {/* Кнопки действий после выпадения результата */}
        {showActions && targetValue !== null && (
          <div className="flex flex-col gap-3 mt-4 w-full max-w-sm">
            {/* Подтвердить */}
            <button
              onClick={() => handleAction('confirm')}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold font-mono uppercase tracking-wider transition-all duration-200 border border-green-400/50 hover:border-green-300 rounded-lg shadow-lg"
            >
              ✓ Подтвердить ({targetValue + accumulatedDamage} урона)
            </button>

            {/* Перекрутить */}
            <button
              onClick={() => handleAction('respin')}
              className="w-full px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold font-mono uppercase tracking-wider transition-all duration-200 border border-yellow-400/50 hover:border-orange-300 rounded-lg shadow-lg"
            >
              🎰 Перекрутить (+{RESPIN_DAMAGE} урона)
            </button>

            {/* Отступить */}
            <button
              onClick={() => handleAction('retreat')}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white font-bold font-mono uppercase tracking-wider transition-all duration-200 border border-red-400/50 hover:border-red-300 rounded-lg shadow-lg"
            >
              ← Отступить ({RETREAT_DAMAGE + accumulatedDamage} урона)
            </button>

            {respinCount > 0 && (
              <div className="text-yellow-400/70 font-mono text-xs text-center mt-2">
                Перекрутов: {respinCount} | Накопленный штраф: {accumulatedDamage}
              </div>
            )}
          </div>
        )}

        {/* Кнопка первого запуска */}
        {!isSpinning && !showResult && (
          <button
            onClick={handleSpin}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold font-mono uppercase tracking-wider transition-all duration-200 border border-red-400/50 hover:border-orange-300 rounded-lg shadow-lg hover:shadow-red-500/25"
          >
            🎰 Крутить колесо
          </button>
        )}

        {isSpinning && (
          <div className="text-white/50 font-mono text-lg animate-pulse">
            Колесо вращается...
          </div>
        )}

        {/* Информация о весах */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex justify-center gap-1 flex-wrap text-[10px] font-mono text-white/30">
            {WHEEL_VALUES.map(v => (
              <span key={v.value} className="flex items-center gap-0.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: v.color }}
                />
                {v.value}:{v.weight}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
