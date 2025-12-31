/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/WheelRandomizer.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Колесо-рандомайзер с улучшенным дизайном в стиле FNAF (REDESIGNED v3.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES v3.0                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - 3D эффект колеса с тенями и градиентами                                  │
 * │ - Неоновые эффекты и свечение                                              │
 * │ - Улучшенная анимация вращения                                             │
 * │ - Стилизованные кнопки действий                                            │
 * │ - Визуальные эффекты при результате                                        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';

export type WheelActionType = 'confirm' | 'respin' | 'retreat';

export interface WheelResult {
  damage: number;
  action: WheelActionType;
  totalDamage: number;
}

interface WheelRandomizerProps {
  onResult: (result: WheelResult) => void;
  title?: string;
  onStaminaReset?: () => void;
  animatronicType?: string; // Тип аниматроника для определения диапазона урона
}

// Диапазоны урона для каждого аниматроника
// Chica: 1-10 (самый лёгкий), Bonnie: 11-20, Foxy: 21-30, Freddy: 31-40 (самый сложный)
const ANIMATRONIC_DAMAGE_RANGES: Record<string, { min: number; max: number; color: string }> = {
  chica: { min: 1, max: 10, color: '#EAB308' },   // Жёлтый
  bonnie: { min: 11, max: 20, color: '#3B82F6' }, // Синий
  foxy: { min: 21, max: 30, color: '#EF4444' },   // Красный
  freddy: { min: 31, max: 40, color: '#92400E' }, // Коричневый
  default: { min: 1, max: 10, color: '#ff0000' }
};

// Базовые веса (для 10 значений) - от меньшего к большему урону
const BASE_WEIGHTS = [20, 17, 15, 12, 10, 8, 6, 5, 4, 3];

// Генерация цветов от зелёного к красному
function getValueColor(index: number, total: number): { color: string; glow: string } {
  const ratio = index / (total - 1);
  // Интерполяция от зелёного (#00ff88) к красному (#ff0000)
  const r = Math.round(ratio * 255);
  const g = Math.round((1 - ratio) * 255 * 0.6 + (1 - ratio) * 136);
  const b = Math.round((1 - ratio) * 136 * 0.5);
  const color = `rgb(${r}, ${g}, ${b})`;
  const glow = `rgba(${r}, ${g}, ${b}, 0.3)`;
  return { color, glow };
}

// Создаёт массив значений для заданного диапазона урона
function createWheelValuesForRange(min: number, max: number) {
  const values = [];
  for (let i = 0; i < 10; i++) {
    const value = min + i;
    const colors = getValueColor(i, 10);
    values.push({
      value,
      weight: BASE_WEIGHTS[i],
      color: colors.color,
      glow: colors.glow
    });
  }
  return values;
}

function getWheelSegments(wheelValues: typeof WHEEL_VALUES_DEFAULT) {
  const totalWeight = wheelValues.reduce((sum, v) => sum + v.weight, 0);
  const segments: { value: number; startAngle: number; endAngle: number; color: string; glow: string }[] = [];
  let currentAngle = 0;

  for (const item of wheelValues) {
    const anglePortion = (item.weight / totalWeight) * 360;
    segments.push({
      value: item.value,
      startAngle: currentAngle,
      endAngle: currentAngle + anglePortion,
      color: item.color,
      glow: item.glow
    });
    currentAngle += anglePortion;
  }

  return segments;
}

function getWeightedRandomValue(wheelValues: typeof WHEEL_VALUES_DEFAULT): number {
  const totalWeight = wheelValues.reduce((sum, v) => sum + v.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (const item of wheelValues) {
    cumulative += item.weight;
    if (random <= cumulative) {
      return item.value;
    }
  }

  return wheelValues[0].value;
}

function getAngleForValue(value: number, wheelValues: typeof WHEEL_VALUES_DEFAULT): number {
  const segments = getWheelSegments(wheelValues);
  const segment = segments.find(s => s.value === value);
  if (!segment) return 0;
  // Центр сегмента - стрелка указывает вверх (на 0 градусов)
  // Сегменты рисуются со смещением -90 градусов, поэтому корректируем
  const centerAngle = (segment.startAngle + segment.endAngle) / 2;
  return centerAngle;
}

// Дефолтные значения (используются для Chica или когда тип не указан)
const WHEEL_VALUES_DEFAULT = createWheelValuesForRange(1, 10);

const RESPIN_DAMAGE = 5;
const RETREAT_DAMAGE = 15;

export default function WheelRandomizer({
  onResult,
  title = 'УРОН',
  onStaminaReset,
  animatronicType
}: WheelRandomizerProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [targetValue, setTargetValue] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [accumulatedDamage, setAccumulatedDamage] = useState(0);
  const [respinCount, setRespinCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Получаем диапазон урона для данного аниматроника
  const damageRange = animatronicType
    ? ANIMATRONIC_DAMAGE_RANGES[animatronicType.toLowerCase()] || ANIMATRONIC_DAMAGE_RANGES.default
    : ANIMATRONIC_DAMAGE_RANGES.default;

  // Создаём значения колеса для этого аниматроника
  const wheelValues = React.useMemo(
    () => createWheelValuesForRange(damageRange.min, damageRange.max),
    [damageRange.min, damageRange.max]
  );

  const segments = getWheelSegments(wheelValues);

  // Рисуем улучшенное колесо
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Внешнее кольцо с градиентом
    const outerGradient = ctx.createRadialGradient(centerX, centerY, radius - 5, centerX, centerY, radius + 15);
    outerGradient.addColorStop(0, '#333');
    outerGradient.addColorStop(0.5, '#1a1a1a');
    outerGradient.addColorStop(1, '#000');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 15, 0, 2 * Math.PI);
    ctx.fillStyle = outerGradient;
    ctx.fill();

    // Декоративные точки на внешнем кольце
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dotX = centerX + Math.cos(angle) * (radius + 8);
      const dotY = centerY + Math.sin(angle) * (radius + 8);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = i % 2 === 0 ? '#ff4444' : '#ffaa00';
      ctx.fill();
      ctx.shadowColor = i % 2 === 0 ? '#ff4444' : '#ffaa00';
      ctx.shadowBlur = 5;
    }
    ctx.shadowBlur = 0;

    // Рисуем сегменты с градиентами
    for (const segment of segments) {
      const startRad = (segment.startAngle - 90) * Math.PI / 180;
      const endRad = (segment.endAngle - 90) * Math.PI / 180;
      const midRad = (startRad + endRad) / 2;

      // Градиент для сегмента
      const gradientX = centerX + Math.cos(midRad) * (radius * 0.5);
      const gradientY = centerY + Math.sin(midRad) * (radius * 0.5);
      const segmentGradient = ctx.createRadialGradient(
        gradientX, gradientY, 0,
        centerX, centerY, radius
      );
      segmentGradient.addColorStop(0, segment.color);
      segmentGradient.addColorStop(0.7, segment.color);
      segmentGradient.addColorStop(1, '#000');

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startRad, endRad);
      ctx.closePath();

      ctx.fillStyle = segmentGradient;
      ctx.fill();

      // Границы сегментов
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Текст значения с тенью
      const midAngle = ((segment.startAngle + segment.endAngle) / 2 - 90) * Math.PI / 180;
      const textRadius = radius * 0.65;
      const textX = centerX + Math.cos(midAngle) * textRadius;
      const textY = centerY + Math.sin(midAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(midAngle + Math.PI / 2);

      // Тень текста
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(segment.value.toString(), 0, 0);
      ctx.restore();
    }

    // Внутренний круг с градиентом
    const innerGradient = ctx.createRadialGradient(centerX - 10, centerY - 10, 0, centerX, centerY, 35);
    innerGradient.addColorStop(0, '#444');
    innerGradient.addColorStop(0.5, '#222');
    innerGradient.addColorStop(1, '#111');

    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = innerGradient;
    ctx.fill();

    // Кольцо вокруг центра
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Череп в центре
    ctx.fillStyle = '#ff4444';
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💀', centerX, centerY);

  }, [segments]);

  const handleSpin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowResult(false);

    const result = getWeightedRandomValue(wheelValues);
    setTargetValue(result);

    const targetAngle = getAngleForValue(result, wheelValues);
    const spins = 6 + Math.floor(Math.random() * 4);

    // Корректировка: учитываем текущую позицию колеса при респине
    // targetFinalAngle - это угол, на котором должно остановиться колесо (сегмент под стрелкой)
    const targetFinalAngle = 360 - targetAngle;

    setRotation(prev => {
      // Текущий визуальный угол колеса
      const currentVisualAngle = prev % 360;
      // Вычисляем, сколько нужно докрутить от текущей позиции до целевой
      let delta = targetFinalAngle - currentVisualAngle;
      // Нормализуем delta чтобы всегда крутить вперёд (по часовой)
      if (delta < 0) delta += 360;
      // Добавляем полные обороты + delta
      const finalRotation = spins * 360 + delta;
      return prev + finalRotation;
    });
  }, [isSpinning, wheelValues]);

  useEffect(() => {
    if (!isSpinning) return;

    const timeout = setTimeout(() => {
      setIsSpinning(false);
      setShowResult(true);

      if (onStaminaReset) {
        onStaminaReset();
      }

      setTimeout(() => {
        setShowActions(true);
      }, 1200);
    }, 4500);

    return () => clearTimeout(timeout);
  }, [isSpinning, onStaminaReset]);

  const handleAction = useCallback((action: WheelActionType) => {
    if (targetValue === null) return;

    let totalDamage = targetValue;

    if (action === 'confirm') {
      totalDamage = targetValue + accumulatedDamage;
    } else if (action === 'respin') {
      setAccumulatedDamage(prev => prev + RESPIN_DAMAGE);
      setRespinCount(prev => prev + 1);
      setShowActions(false);
      setShowResult(false);
      setTargetValue(null);
      setTimeout(() => handleSpin(), 500);
      return;
    } else if (action === 'retreat') {
      totalDamage = RETREAT_DAMAGE + accumulatedDamage;
    }

    onResult({
      damage: targetValue,
      action,
      totalDamage
    });
  }, [targetValue, accumulatedDamage, onResult, handleSpin]);

  const resultColor = targetValue !== null
    ? wheelValues.find(v => v.value === targetValue)?.color || '#fff'
    : '#fff';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/98 gap-8">
      {/* Анимированный фон */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/50 via-black to-purple-950/30" />

        {/* Сетка на фоне */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(#ff0000 1px, transparent 1px), linear-gradient(90deg, #ff0000 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />

        {/* Пульсация при результате */}
        {showResult && (
          <div
            className="absolute inset-0 animate-pulse"
            style={{ backgroundColor: `${resultColor}15` }}
          />
        )}

        {/* Красные искры на фоне */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-red-500 rounded-full animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Заголовок */}
        <div className="text-center">
          <div className="relative">
            <div className="text-red-500 font-mono text-3xl uppercase tracking-[0.5em] font-bold"
              style={{ textShadow: '0 0 20px #ff0000, 0 0 40px #ff000055' }}>
              ⚠ {title} ⚠
            </div>
            <div className="absolute inset-0 text-red-500/30 font-mono text-3xl uppercase tracking-[0.5em] font-bold blur-sm animate-pulse">
              ⚠ {title} ⚠
            </div>
          </div>
          <p className="text-white/50 text-sm mt-3 font-mono tracking-wider">
            {isSpinning ? 'ОПРЕДЕЛЕНИЕ УРОНА...' : 'ВРАЩАЙТЕ КОЛЕСО СУДЬБЫ'}
          </p>
        </div>

        {/* Контейнер колеса */}
        <div className="relative">
          {/* Внешнее свечение */}
          <div
            className="absolute inset-[-30px] rounded-full opacity-50 blur-xl transition-all duration-500"
            style={{
              background: isSpinning
                ? 'radial-gradient(circle, #ff440055 0%, transparent 70%)'
                : showResult
                  ? `radial-gradient(circle, ${resultColor}33 0%, transparent 70%)`
                  : 'radial-gradient(circle, #ff000033 0%, transparent 70%)'
            }}
          />

          {/* Стрелка-указатель (улучшенная) */}
          <div className="absolute top-[-15px] left-1/2 -translate-x-1/2 z-30">
            <div className="relative">
              {/* Свечение стрелки */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0
                border-l-[20px] border-l-transparent
                border-r-[20px] border-r-transparent
                border-t-[35px] border-t-red-500
                blur-sm opacity-70"
              />
              {/* Основная стрелка */}
              <div className="w-0 h-0
                border-l-[18px] border-l-transparent
                border-r-[18px] border-r-transparent
                border-t-[32px] border-t-white
                drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]"
              />
              {/* Блик на стрелке */}
              <div className="absolute top-[5px] left-1/2 -translate-x-1/2 w-0 h-0
                border-l-[8px] border-l-transparent
                border-r-[8px] border-r-transparent
                border-t-[15px] border-t-white/50"
              />
            </div>
          </div>

          {/* Колесо */}
          <div
            className="relative transition-transform"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0.7, 0.1, 1)' : 'none'
            }}
          >
            <canvas
              ref={canvasRef}
              width={350}
              height={350}
              className="drop-shadow-[0_0_30px_rgba(255,0,0,0.3)]"
            />

            {/* Блики на колесе */}
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)'
              }}
            />
          </div>

          {/* Эффект вращения */}
          {isSpinning && (
            <div className="absolute inset-0 rounded-full animate-spin pointer-events-none"
              style={{
                animationDuration: '0.5s',
                background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.2) 25%, transparent 50%)'
              }}
            />
          )}
        </div>

        {/* Результат */}
        {showResult && targetValue !== null && (
          <div className="text-center animate-[bounce-in_0.5s_ease-out]">
            <div className="text-white/50 font-mono text-sm tracking-wider mb-2">РЕЗУЛЬТАТ</div>
            <div className="relative">
              <div
                className="text-8xl font-bold font-mono"
                style={{
                  color: resultColor,
                  textShadow: `0 0 40px ${resultColor}, 0 0 80px ${resultColor}55`,
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              >
                {targetValue}
              </div>
              {/* Эффект глитча */}
              <div
                className="absolute inset-0 text-8xl font-bold font-mono opacity-30"
                style={{
                  color: resultColor,
                  transform: 'translate(2px, 2px)',
                  filter: 'blur(2px)'
                }}
              >
                {targetValue}
              </div>
            </div>
            {accumulatedDamage > 0 && (
              <div className="text-orange-400 font-mono text-lg mt-2 flex items-center justify-center gap-2">
                <span className="text-xl">⚡</span>
                <span>+{accumulatedDamage} штраф</span>
              </div>
            )}
          </div>
        )}

        {/* Кнопки действий */}
        {showActions && targetValue !== null && (
          <div className="flex flex-col gap-4 mt-2 w-full max-w-md animate-[fade-in_0.3s_ease-out]">
            {/* Подтвердить */}
            <button
              onClick={() => handleAction('confirm')}
              className="group relative w-full px-8 py-4 overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-green-500 to-emerald-600" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-green-500 via-emerald-400 to-green-500" />
              <div className="absolute inset-[2px] rounded-lg bg-gradient-to-b from-green-800 to-green-900" />
              <div className="relative flex items-center justify-center gap-3 text-white font-bold font-mono uppercase tracking-wider text-lg">
                <span className="text-2xl">✓</span>
                <span>Подтвердить</span>
                <span className="px-3 py-1 bg-black/30 rounded text-sm">
                  {targetValue + accumulatedDamage} DMG
                </span>
              </div>
            </button>

            {/* Перекрутить */}
            <button
              onClick={() => handleAction('respin')}
              className="group relative w-full px-8 py-4 overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-orange-500 to-amber-600" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-yellow-500 via-orange-400 to-amber-500" />
              <div className="absolute inset-[2px] rounded-lg bg-gradient-to-b from-yellow-800 to-orange-900" />
              <div className="relative flex items-center justify-center gap-3 text-white font-bold font-mono uppercase tracking-wider text-lg">
                <span className="text-2xl animate-spin" style={{ animationDuration: '3s' }}>🎰</span>
                <span>Перекрутить</span>
                <span className="px-3 py-1 bg-black/30 rounded text-sm text-red-300">
                  +{RESPIN_DAMAGE} DMG
                </span>
              </div>
            </button>

            {/* Отступить */}
            <button
              onClick={() => handleAction('retreat')}
              className="group relative w-full px-8 py-4 overflow-hidden rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-700 via-red-600 to-rose-700" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
              <div className="absolute inset-[2px] rounded-lg bg-gradient-to-b from-red-900 to-rose-950" />
              <div className="relative flex items-center justify-center gap-3 text-white font-bold font-mono uppercase tracking-wider text-lg">
                <span className="text-2xl">←</span>
                <span>Отступить</span>
                <span className="px-3 py-1 bg-black/30 rounded text-sm">
                  {RETREAT_DAMAGE + accumulatedDamage} DMG
                </span>
              </div>
            </button>

            {respinCount > 0 && (
              <div className="text-center text-yellow-400/60 font-mono text-xs mt-2 flex items-center justify-center gap-4">
                <span>🎰 Перекрутов: {respinCount}</span>
                <span>⚡ Штраф: {accumulatedDamage}</span>
              </div>
            )}
          </div>
        )}

        {/* Кнопка первого запуска */}
        {!isSpinning && !showResult && (
          <button
            onClick={handleSpin}
            className="group relative px-12 py-5 overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-gradient" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-400 to-orange-500" />
            </div>
            <div className="absolute inset-[3px] rounded-xl bg-gradient-to-b from-red-800 to-red-950" />

            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="relative flex items-center gap-4 text-white font-bold font-mono uppercase tracking-[0.3em] text-xl">
              <span className="text-3xl animate-bounce">🎰</span>
              <span>КРУТИТЬ</span>
            </div>
          </button>
        )}

        {isSpinning && (
          <div className="flex items-center gap-3 text-red-400 font-mono text-xl">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
            <span className="animate-pulse tracking-wider">ВРАЩЕНИЕ...</span>
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
          </div>
        )}

      </div>

      {/* Легенда справа от колеса */}
      <div className="relative z-10 flex flex-col gap-1.5 p-4 bg-black/60 border border-white/10 rounded-xl max-h-[400px] overflow-y-auto">
        <div className="text-white/50 font-mono text-xs uppercase tracking-wider mb-2 text-center border-b border-white/10 pb-2">
          📊 Урон: {damageRange.min}-{damageRange.max}
        </div>
        {wheelValues.map(v => (
          <div
            key={v.value}
            className="flex items-center gap-3 px-3 py-1.5 bg-black/40 hover:bg-black/60 rounded-lg transition-all"
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: v.color, boxShadow: `0 0 8px ${v.color}` }}
            />
            <span
              className="font-mono text-lg font-bold w-8"
              style={{ color: v.color }}
            >
              {v.value}
            </span>
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(v.weight / wheelValues[0].weight) * 100}%`,
                  backgroundColor: v.color
                }}
              />
            </div>
            <span className="text-white/40 font-mono text-xs w-8 text-right">{v.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
