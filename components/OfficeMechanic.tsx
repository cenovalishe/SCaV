/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/OfficeMechanic.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Механика маршрутной точки офиса (Y) в стиле FNaF 1
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES                                                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Рандомизация времени ночи (1-6 AM)                                       │
 * │ - Рандомизация заряда батареи (1-100%)                                     │
 * │ - Рандомизация аниматроников у дверей (0-4)                                │
 * │ - Расчёт шанса выживания                                                   │
 * │ - Колесо урона при провале                                                 │
 * │ - Выдача ключ-карты при успешном завершении                                │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ANIMATRONIC_SPAWNS, AnimatronicType } from '@/lib/mapData';

interface OfficeMechanicProps {
  onComplete: (result: { survived: boolean; receivedKeyCard: boolean; damageReceived: number }) => void;
  onClose: () => void;
}

type Phase = 'intro' | 'time_wheel' | 'battery_wheel' | 'animatronics_wheel' | 'survival_check' | 'damage_wheel' | 'result' | 'victory';

interface AnimatronicAtDoor {
  id: AnimatronicType;
  name: string;
  color: string;
  aiLevel: number;
}

// Цвета часов для колеса
const HOUR_COLORS = {
  1: '#3B82F6', // Синий - полночь
  2: '#6366F1', // Индиго
  3: '#8B5CF6', // Фиолетовый
  4: '#A855F7', // Пурпурный
  5: '#EC4899', // Розовый - рассвет близко
  6: '#F59E0B', // Золотой - ПОБЕДА
};

export default function OfficeMechanic({ onComplete, onClose }: OfficeMechanicProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentHour, setCurrentHour] = useState<number | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [animatronicsAtDoors, setAnimatronicsAtDoors] = useState<AnimatronicAtDoor[]>([]);
  const [survivedHours, setSurvivedHours] = useState<number[]>([]);
  const [totalDamage, setTotalDamage] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [currentWheelValue, setCurrentWheelValue] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Доступные часы (исключая уже пройденные)
  const availableHours = [1, 2, 3, 4, 5, 6].filter(h => !survivedHours.includes(h));

  // Рисуем колесо для времени
  const drawTimeWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Внешнее кольцо
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();

    const segmentAngle = (2 * Math.PI) / availableHours.length;

    // Рисуем сегменты
    availableHours.forEach((hour, i) => {
      const startAngle = i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      const color = HOUR_COLORS[hour as keyof typeof HOUR_COLORS];
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Текст часа (с правильной ориентацией)
      const midAngle = startAngle + segmentAngle / 2;
      const textX = centerX + Math.cos(midAngle) * (radius * 0.65);
      const textY = centerY + Math.sin(midAngle) * (radius * 0.65);

      ctx.save();
      ctx.translate(textX, textY);
      // Вращаем текст так, чтобы он был читаем (направлен от центра)
      // Добавляем π/2 чтобы текст был горизонтальным
      const textRotation = midAngle + Math.PI / 2;
      ctx.rotate(textRotation);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(`${hour} AM`, 0, 0);
      ctx.restore();
    });

    // Центральный круг
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🕐', centerX, centerY);
  }, [availableHours]);

  // Рисуем колесо для батареи
  const drawBatteryWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 10 сегментов (10%, 20%, ... 100%)
    const segments = 10;
    const segmentAngle = (2 * Math.PI) / segments;

    for (let i = 0; i < segments; i++) {
      const startAngle = i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;
      const value = (i + 1) * 10;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      // Градиент от красного к зелёному
      const ratio = i / (segments - 1);
      const r = Math.round((1 - ratio) * 255);
      const g = Math.round(ratio * 200);
      ctx.fillStyle = `rgb(${r}, ${g}, 50)`;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Текст (с правильной ориентацией)
      const midAngle = startAngle + segmentAngle / 2;
      const textX = centerX + Math.cos(midAngle) * (radius * 0.65);
      const textY = centerY + Math.sin(midAngle) * (radius * 0.65);

      ctx.save();
      ctx.translate(textX, textY);
      const textRotation = midAngle + Math.PI / 2;
      ctx.rotate(textRotation);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(`${value}%`, 0, 0);
      ctx.restore();
    }

    // Центральный круг
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔋', centerX, centerY);
  }, []);

  // Веса для количества аниматроников (взвешенные сегменты)
  // 0=35%, 1=30%, 2=20%, 3=10%, 4=5%
  const ANIMATRONIC_WEIGHTS = [35, 30, 20, 10, 5];
  const ANIMATRONIC_TOTAL_WEIGHT = ANIMATRONIC_WEIGHTS.reduce((a, b) => a + b, 0);

  // Рисуем колесо для количества аниматроников (ВЗВЕШЕННЫЕ сегменты)
  const drawAnimatronicsWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 5 сегментов (0-4 аниматроника) с РАЗНЫМИ размерами
    const colors = ['#22C55E', '#84CC16', '#EAB308', '#F97316', '#EF4444']; // Зелёный → Красный

    let currentAngle = -Math.PI / 2; // Начинаем сверху

    for (let i = 0; i < 5; i++) {
      // Угол пропорционален весу
      const segmentAngle = (ANIMATRONIC_WEIGHTS[i] / ANIMATRONIC_TOTAL_WEIGHT) * (2 * Math.PI);
      const startAngle = currentAngle;
      const endAngle = currentAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = colors[i];
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Текст (в центре сегмента)
      const midAngle = startAngle + segmentAngle / 2;
      const textX = centerX + Math.cos(midAngle) * (radius * 0.65);
      const textY = centerY + Math.sin(midAngle) * (radius * 0.65);

      ctx.save();
      ctx.translate(textX, textY);
      const textRotation = midAngle + Math.PI / 2;
      ctx.rotate(textRotation);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(i.toString(), 0, 0);
      ctx.restore();

      currentAngle = endAngle;
    }

    // Центральный круг
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🤖', centerX, centerY);
  }, []);

  // Рисуем колесо урона с ИНДИВИДУАЛЬНЫМИ числами (1-10, 11-20, и т.д.) для каждого аниматроника
  const drawDamageWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Если нет аниматроников, показываем минимальный урон
    if (animatronicsAtDoors.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('10', centerX, centerY);
      return;
    }

    // Создаём сегменты с ИНДИВИДУАЛЬНЫМИ числами от 1 до 10 для каждого аниматроника
    // Например: Чика 1-10, Бонни 11-20, Фредди 21-30, Фокси 31-40
    const damageSegments: { damage: number; color: string; label: string }[] = [];

    animatronicsAtDoors.forEach((a, animIndex) => {
      // Каждый аниматроник получает диапазон 1-10 со смещением
      const baseOffset = animIndex * 10;
      for (let num = 1; num <= 10; num++) {
        damageSegments.push({
          damage: baseOffset + num,
          color: a.color,
          label: a.name.substring(0, 3) // Краткое имя
        });
      }
    });

    const segments = damageSegments.length;
    const segmentAngle = (2 * Math.PI) / segments;

    // Рисуем сегменты
    damageSegments.forEach((seg, i) => {
      const startAngle = i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Текст урона (только число, без имени - слишком мало места)
      const midAngle = startAngle + segmentAngle / 2;
      const textX = centerX + Math.cos(midAngle) * (radius * 0.7);
      const textY = centerY + Math.sin(midAngle) * (radius * 0.7);

      ctx.save();
      ctx.translate(textX, textY);
      const textRotation = midAngle + Math.PI / 2;
      ctx.rotate(textRotation);
      ctx.fillStyle = '#fff';
      // Размер шрифта зависит от количества сегментов
      const fontSize = segments > 20 ? 10 : segments > 10 ? 14 : 18;
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.fillText(`${seg.damage}`, 0, 0);
      ctx.restore();
    });

    // Центральный круг
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💀', centerX, centerY);
  }, [animatronicsAtDoors]);

  // Спин колеса
  // FIX: Корректный расчёт угла для совмещения стрелки с результатом
  const spinWheel = useCallback((segments: number, onResult: (index: number) => void) => {
    setIsSpinning(true);

    const targetIndex = Math.floor(Math.random() * segments);
    const segmentAngle = 360 / segments;
    // Стрелка указывает на верх (0°), сегменты начинаются с верха (-90° в canvas = 0° в CSS)
    // Для попадания в центр сегмента targetIndex нужно повернуть на:
    // (segments - targetIndex) * segmentAngle - segmentAngle/2
    const targetAngle = (segments - targetIndex) * segmentAngle - segmentAngle / 2;
    const spins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = spins * 360 + targetAngle;

    // Сбрасываем на 0 и устанавливаем новое значение для точного позиционирования
    setWheelRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      onResult(targetIndex);
    }, 4000);
  }, []);

  // Начало механики
  const startOfficeMechanic = useCallback(() => {
    setPhase('time_wheel');
    setTimeout(() => drawTimeWheel(), 100);
  }, [drawTimeWheel]);

  // Спин колеса времени
  const spinTimeWheel = useCallback(() => {
    spinWheel(availableHours.length, (index) => {
      const hour = availableHours[index];
      setCurrentHour(hour);

      if (hour === 6) {
        // ПОБЕДА!
        setTimeout(() => setPhase('victory'), 1500);
      } else {
        setTimeout(() => {
          setPhase('battery_wheel');
          setTimeout(() => drawBatteryWheel(), 100);
        }, 1500);
      }
    });
  }, [availableHours, spinWheel, drawBatteryWheel]);

  // Спин колеса батареи
  const spinBatteryWheel = useCallback(() => {
    spinWheel(10, (index) => {
      const battery = (index + 1) * 10;
      setBatteryLevel(battery);
      setTimeout(() => {
        setPhase('animatronics_wheel');
        setTimeout(() => drawAnimatronicsWheel(), 100);
      }, 1500);
    });
  }, [spinWheel, drawAnimatronicsWheel]);

  // Спин колеса аниматроников (ВЗВЕШЕННЫЙ)
  const spinAnimatronicsWheel = useCallback(() => {
    setIsSpinning(true);

    // Выбираем результат с учётом весов
    const random = Math.random() * ANIMATRONIC_TOTAL_WEIGHT;
    let cumulative = 0;
    let targetIndex = 0;
    for (let i = 0; i < ANIMATRONIC_WEIGHTS.length; i++) {
      cumulative += ANIMATRONIC_WEIGHTS[i];
      if (random < cumulative) {
        targetIndex = i;
        break;
      }
    }

    // Вычисляем угол для попадания в центр взвешенного сегмента
    let segmentStartAngle = 0;
    for (let i = 0; i < targetIndex; i++) {
      segmentStartAngle += (ANIMATRONIC_WEIGHTS[i] / ANIMATRONIC_TOTAL_WEIGHT) * 360;
    }
    const segmentAngle = (ANIMATRONIC_WEIGHTS[targetIndex] / ANIMATRONIC_TOTAL_WEIGHT) * 360;
    const targetAngle = 360 - (segmentStartAngle + segmentAngle / 2);

    const spins = 5 + Math.floor(Math.random() * 3);
    const finalRotation = spins * 360 + targetAngle;

    setWheelRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const count = targetIndex;
      // Выбираем случайных аниматроников
      const shuffled = [...ANIMATRONIC_SPAWNS].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, count).map(a => ({
        id: a.id,
        name: a.nameRu,
        color: a.color,
        aiLevel: a.aiLevel
      }));
      setAnimatronicsAtDoors(selected);
      setTimeout(() => setPhase('survival_check'), 1500);
    }, 4000);
  }, []);

  // Расчёт шанса выживания
  // ЗНАЧИТЕЛЬНО УВЕЛИЧЕН базовый шанс, время НЕ влияет
  const calculateSurvivalChance = useCallback(() => {
    if (!batteryLevel) return 0;

    // Высокий базовый шанс 85%
    let baseChance = 85;

    // Каждый аниматроник снижает шанс (уменьшен штраф: 3-15 на каждого в зависимости от aiLevel)
    const animatronicPenalty = animatronicsAtDoors.reduce((sum, a) => sum + a.aiLevel * 3, 0);

    // Время НЕ влияет на шанс выживания (убрано по запросу)
    // const timePenalty = 0;

    // БАТАРЕЯ КАК МОДИФИКАТОР СЛОЖНОСТИ
    // Высокий заряд = бонус к шансу, низкий заряд = небольшой штраф
    // 100% батареи = +20% к шансу
    // 50% батареи = +0% (нейтрально)
    // 10% батареи = -16% к шансу
    const batteryModifier = (batteryLevel - 50) * 0.4;

    const finalChance = baseChance - animatronicPenalty + batteryModifier;

    return Math.max(20, Math.min(98, finalChance)); // 20-98%
  }, [batteryLevel, animatronicsAtDoors]);

  // Проверка выживания
  const checkSurvival = useCallback(() => {
    const chance = calculateSurvivalChance();
    const roll = Math.random() * 100;
    const survived = roll < chance;

    if (survived) {
      // Выжил - добавляем час и продолжаем
      if (currentHour) {
        setSurvivedHours(prev => [...prev, currentHour]);
      }
      setTimeout(() => {
        setPhase('result');
      }, 2000);
    } else {
      // Не выжил - колесо урона
      setTimeout(() => {
        setPhase('damage_wheel');
        setWheelRotation(0); // Сброс вращения для нового колеса
        setTimeout(() => drawDamageWheel(), 100);
      }, 2000);
    }

    return survived;
  }, [calculateSurvivalChance, currentHour, drawDamageWheel]);

  // Построение массива сегментов урона (для расчёта результата спина)
  // ИНДИВИДУАЛЬНЫЕ числа 1-10, 11-20, и т.д. для каждого аниматроника
  const getDamageSegments = useCallback(() => {
    if (animatronicsAtDoors.length === 0) {
      return [{ damage: 10, color: '#EF4444', label: 'МИН' }];
    }

    const segments: { damage: number; color: string; label: string }[] = [];

    // Каждый аниматроник получает числа 1-10 со смещением
    animatronicsAtDoors.forEach((a, animIndex) => {
      const baseOffset = animIndex * 10;
      for (let num = 1; num <= 10; num++) {
        segments.push({
          damage: baseOffset + num,
          color: a.color,
          label: a.name.substring(0, 3)
        });
      }
    });

    return segments;
  }, [animatronicsAtDoors]);

  // Колесо урона (комбинированное от аниматроников у дверей)
  const spinDamageWheel = useCallback(() => {
    const damageSegments = getDamageSegments();

    spinWheel(damageSegments.length, (index) => {
      const damage = damageSegments[index].damage;
      setCurrentWheelValue(damage);
      setTotalDamage(prev => prev + damage);

      setTimeout(() => {
        // Перезапуск механики
        setPhase('time_wheel');
        setCurrentHour(null);
        setBatteryLevel(null);
        setAnimatronicsAtDoors([]);
        setWheelRotation(0);
        setCurrentWheelValue(null);
        setTimeout(() => drawTimeWheel(), 100);
      }, 3000);
    });
  }, [getDamageSegments, spinWheel, drawTimeWheel]);

  // Продолжение после выживания
  const continueOffice = useCallback(() => {
    if (availableHours.length === 0 || (currentHour === 6)) {
      // Победа!
      setPhase('victory');
    } else {
      // Следующий раунд
      setPhase('time_wheel');
      setCurrentHour(null);
      setBatteryLevel(null);
      setAnimatronicsAtDoors([]);
      setWheelRotation(0);
      setTimeout(() => drawTimeWheel(), 100);
    }
  }, [availableHours, currentHour, drawTimeWheel]);

  // Завершение с победой
  const handleVictory = useCallback(() => {
    onComplete({
      survived: true,
      receivedKeyCard: true,
      damageReceived: totalDamage
    });
  }, [totalDamage, onComplete]);

  // Отмена
  const handleCancel = useCallback(() => {
    onComplete({
      survived: false,
      receivedKeyCard: false,
      damageReceived: totalDamage
    });
  }, [totalDamage, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/98">
      {/* Анимированный фон */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/50 via-black to-blue-950/30" />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(#6366F1 1px, transparent 1px), linear-gradient(90deg, #6366F1 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 max-w-4xl w-full px-4">
        {/* INTRO */}
        {phase === 'intro' && (
          <div className="text-center animate-fade-in">
            <h1 className="text-4xl font-bold text-purple-400 mb-4 font-mono"
              style={{ textShadow: '0 0 20px #8B5CF6' }}>
              🏢 ОФИС ОХРАННИКА
            </h1>
            <p className="text-white/70 text-lg mb-8 max-w-xl">
              Вы должны пережить ночную смену! Крутите колёса, чтобы определить условия.
              Если выпадет 6 AM - вы получите ключ-карту для выхода.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={startOfficeMechanic}
                className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-all hover:scale-105"
              >
                🎰 НАЧАТЬ СМЕНУ
              </button>
              <button
                onClick={onClose}
                className="px-8 py-4 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* TIME WHEEL */}
        {phase === 'time_wheel' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-blue-400 mb-4 font-mono">
              🕐 ОПРЕДЕЛЕНИЕ ВРЕМЕНИ
            </h2>
            <p className="text-white/50 text-sm mb-4">
              Пройдено часов: {survivedHours.length} / Осталось: {availableHours.length}
            </p>

            <div className="relative mb-6">
              {/* Стрелка */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-white" />
              </div>

              <div
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.7, 0.1, 1)' : 'none'
                }}
              >
                <canvas ref={canvasRef} width={350} height={350} />
              </div>
            </div>

            {!isSpinning && currentHour === null && (
              <button
                onClick={spinTimeWheel}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all hover:scale-105"
              >
                🎰 КРУТИТЬ
              </button>
            )}

            {currentHour !== null && (
              <div className="text-4xl font-bold animate-bounce" style={{ color: HOUR_COLORS[currentHour as keyof typeof HOUR_COLORS] }}>
                {currentHour} AM
              </div>
            )}
          </div>
        )}

        {/* BATTERY WHEEL */}
        {phase === 'battery_wheel' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-400 mb-4 font-mono">
              🔋 ЗАРЯД БАТАРЕИ
            </h2>
            <p className="text-white/50 text-sm mb-4">
              Текущее время: {currentHour} AM
            </p>

            <div className="relative mb-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-white" />
              </div>

              <div
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.7, 0.1, 1)' : 'none'
                }}
              >
                <canvas ref={canvasRef} width={350} height={350} />
              </div>
            </div>

            {!isSpinning && batteryLevel === null && (
              <button
                onClick={spinBatteryWheel}
                className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all hover:scale-105"
              >
                🎰 КРУТИТЬ
              </button>
            )}

            {batteryLevel !== null && (
              <div className="text-4xl font-bold animate-bounce text-green-400">
                {batteryLevel}%
              </div>
            )}
          </div>
        )}

        {/* ANIMATRONICS WHEEL */}
        {phase === 'animatronics_wheel' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4 font-mono">
              🤖 АНИМАТРОНИКИ У ДВЕРЕЙ
            </h2>
            <p className="text-white/50 text-sm mb-4">
              {currentHour} AM | Батарея: {batteryLevel}%
            </p>

            <div className="relative mb-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-white" />
              </div>

              <div
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.7, 0.1, 1)' : 'none'
                }}
              >
                <canvas ref={canvasRef} width={350} height={350} />
              </div>
            </div>

            {!isSpinning && animatronicsAtDoors.length === 0 && (
              <button
                onClick={spinAnimatronicsWheel}
                className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all hover:scale-105"
              >
                🎰 КРУТИТЬ
              </button>
            )}

            {animatronicsAtDoors.length > 0 && (
              <div className="flex gap-4 justify-center">
                {animatronicsAtDoors.map(a => (
                  <div key={a.id} className="text-2xl font-bold p-2 rounded" style={{ backgroundColor: a.color + '40', color: a.color }}>
                    {a.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SURVIVAL CHECK */}
        {phase === 'survival_check' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4 font-mono">
              ⚡ ПРОВЕРКА ВЫЖИВАНИЯ
            </h2>

            <div className="bg-black/50 p-6 rounded-xl border border-white/20 mb-6">
              <div className="grid grid-cols-2 gap-4 text-left mb-4">
                <div className="text-white/50">Время:</div>
                <div className="text-blue-400 font-bold">{currentHour} AM</div>

                <div className="text-white/50">Батарея (модиф.):</div>
                <div className={`font-bold ${(batteryLevel || 0) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {batteryLevel}% <span className="text-sm">({(batteryLevel || 0) >= 50 ? '+' : ''}{Math.round(((batteryLevel || 0) - 50) * 0.4)}%)</span>
                </div>

                <div className="text-white/50">Аниматроники:</div>
                <div className="text-red-400 font-bold">
                  {animatronicsAtDoors.length} <span className="text-sm">(-{animatronicsAtDoors.reduce((sum, a) => sum + a.aiLevel * 3, 0)}%)</span>
                </div>
              </div>

              <div className="border-t border-white/20 pt-4">
                <div className="text-white/50 mb-2">Шанс выживания:</div>
                <div className="text-3xl font-bold text-yellow-400">
                  {Math.round(calculateSurvivalChance())}%
                </div>
                <div className="text-xs text-white/30 mt-1">
                  База 85% + модификаторы
                </div>
              </div>
            </div>

            <button
              onClick={() => checkSurvival()}
              className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg transition-all hover:scale-105"
            >
              🎲 ПРОВЕРИТЬ СУДЬБУ
            </button>
          </div>
        )}

        {/* DAMAGE WHEEL */}
        {phase === 'damage_wheel' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4 font-mono animate-pulse">
              💀 АТАКА АНИМАТРОНИКОВ!
            </h2>
            <p className="text-white/50 text-sm mb-4">
              {animatronicsAtDoors.map(a => a.name).join(', ')} атакуют!
            </p>

            {/* Колесо урона */}
            <div className="relative mb-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20">
                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-white" />
              </div>

              <div
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning ? 'transform 4s cubic-bezier(0.15, 0.7, 0.1, 1)' : 'none'
                }}
              >
                <canvas ref={canvasRef} width={350} height={350} />
              </div>
            </div>

            {!isSpinning && currentWheelValue === null && (
              <button
                onClick={spinDamageWheel}
                className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all hover:scale-105 animate-pulse"
              >
                💀 КРУТИТЬ КОЛЕСО УРОНА
              </button>
            )}

            {currentWheelValue !== null && (
              <div className="animate-bounce">
                <div className="text-6xl font-bold text-red-500 mb-2">-{currentWheelValue}</div>
                <div className="text-white/50">Урон получен! Перезапуск смены...</div>
              </div>
            )}
          </div>
        )}

        {/* RESULT (survived hour) */}
        {phase === 'result' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-green-400 mb-4 font-mono">
              ✓ {currentHour} AM ПРОЙДЕН!
            </h2>
            <p className="text-white/50 mb-6">
              Вы пережили этот час. Продолжайте до 6 AM!
            </p>

            <button
              onClick={continueOffice}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all hover:scale-105"
            >
              ➡️ ПРОДОЛЖИТЬ
            </button>
          </div>
        )}

        {/* VICTORY */}
        {phase === 'victory' && (
          <div className="text-center">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-4xl font-bold text-yellow-400 mb-4 font-mono"
              style={{ textShadow: '0 0 20px #F59E0B' }}>
              6 AM - ПОБЕДА!
            </h2>
            <p className="text-white/70 text-lg mb-4">
              Вы пережили ночную смену!
            </p>

            <div className="bg-yellow-500/20 border border-yellow-500 p-4 rounded-xl mb-6 inline-block">
              <div className="text-yellow-400 font-bold text-xl">
                🗝️ ПОЛУЧЕНА КЛЮЧ-КАРТА
              </div>
              <div className="text-white/50 text-sm">
                Теперь вы можете вернуться на Старт/Финиш
              </div>
            </div>

            {totalDamage > 0 && (
              <div className="text-red-400 mb-4">
                Получено урона за смену: {totalDamage}
              </div>
            )}

            <button
              onClick={handleVictory}
              className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg transition-all hover:scale-105"
            >
              ЗАБРАТЬ КЛЮЧ-КАРТУ
            </button>
          </div>
        )}

        {/* Статистика внизу */}
        {phase !== 'intro' && phase !== 'victory' && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-between text-sm font-mono">
            <div className="text-white/50">
              Пройдено: {survivedHours.join(', ') || 'нет'} AM
            </div>
            {totalDamage > 0 && (
              <div className="text-red-400">
                Урон: {totalDamage}
              </div>
            )}
            <button
              onClick={handleCancel}
              className="text-white/30 hover:text-white/50"
            >
              [ESC] Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
