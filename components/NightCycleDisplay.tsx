/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/NightCycleDisplay.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: UI компонент для отображения глобального цикла ночей
 *          Показывает текущую ночь, час, таймер и AI уровни аниматроников
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2026-01-01 | VERSION: 1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState, useEffect } from 'react';
import { GlobalNightCycle, AnimatronicState } from '@/lib/types';
import {
  NIGHT_CYCLE_TIMINGS,
  formatTime,
  getAnimatronicAILevel,
  getAllAnimatronicAILevels,
  ANIMATRONIC_NAMES_RU,
  ANIMATRONIC_EMOJI,
  TOTAL_NIGHTS,
  LAST_HOUR,
} from '@/lib/nightCycleConfig';
import { startNightCycle, syncNightCycle } from '@/app/actions/nightCycleActions';

interface NightCycleDisplayProps {
  gameId: string;
  nightCycle: GlobalNightCycle;
  calculatedNight: number;
  calculatedHour: number;
  enemies: AnimatronicState[];
  isAdmin?: boolean; // Для показа кнопки запуска
}

export default function NightCycleDisplay({
  gameId,
  nightCycle,
  calculatedNight,
  calculatedHour,
  enemies,
  isAdmin = false,
}: NightCycleDisplayProps) {
  const [remainingTime, setRemainingTime] = useState<string>('--');
  const [timeUntilNextHour, setTimeUntilNextHour] = useState<string>('--');
  const [isStarting, setIsStarting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Обновление таймеров каждую секунду
  useEffect(() => {
    if (!nightCycle.isActive || !nightCycle.startedAt) {
      setRemainingTime('Не запущено');
      setTimeUntilNextHour('--');
      return;
    }

    const updateTimers = () => {
      const now = Date.now();
      const elapsedMs = now - nightCycle.startedAt!;

      // Общее оставшееся время
      const remaining = Math.max(0, NIGHT_CYCLE_TIMINGS.totalDurationMs - elapsedMs);
      setRemainingTime(formatTime(remaining));

      // Время до следующего часа
      const timeInCurrentHour = elapsedMs % NIGHT_CYCLE_TIMINGS.hourDurationMs;
      const untilNextHour = NIGHT_CYCLE_TIMINGS.hourDurationMs - timeInCurrentHour;
      setTimeUntilNextHour(formatTime(untilNextHour));
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [nightCycle.isActive, nightCycle.startedAt]);

  // Периодическая синхронизация с сервером
  useEffect(() => {
    if (!nightCycle.isActive) return;

    const syncWithServer = async () => {
      setIsSyncing(true);
      try {
        await syncNightCycle(gameId);
      } finally {
        setIsSyncing(false);
      }
    };

    // Синхронизируемся каждые 30 секунд
    const syncInterval = setInterval(syncWithServer, 30000);
    return () => clearInterval(syncInterval);
  }, [gameId, nightCycle.isActive]);

  // Запуск цикла
  const handleStartCycle = async () => {
    setIsStarting(true);
    try {
      await startNightCycle(gameId);
    } finally {
      setIsStarting(false);
    }
  };

  // Получаем AI уровни для текущей ночи и часа
  const aiLevels = getAllAnimatronicAILevels(calculatedNight, calculatedHour);

  // Визуализация AI уровня (полоска прогресса)
  const renderAIBar = (aiLevel: number) => {
    const percentage = (aiLevel / 20) * 100;
    let colorClass = 'bg-green-500';
    if (aiLevel > 10) colorClass = 'bg-yellow-500';
    if (aiLevel > 15) colorClass = 'bg-red-500';

    return (
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  // Проверка, завершился ли цикл
  const isCycleCompleted = nightCycle.isActive &&
    nightCycle.startedAt &&
    (Date.now() - nightCycle.startedAt >= NIGHT_CYCLE_TIMINGS.totalDurationMs);

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 shadow-lg">
      {/* Заголовок с ночью и часом */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌙</span>
          <div>
            <h2 className="text-xl font-bold text-white">
              {nightCycle.isActive ? (
                isCycleCompleted ? (
                  <span className="text-green-400">Цикл завершён!</span>
                ) : (
                  <>
                    Ночь {calculatedNight}/{TOTAL_NIGHTS}
                  </>
                )
              ) : (
                'Ожидание...'
              )}
            </h2>
            {nightCycle.isActive && !isCycleCompleted && (
              <p className="text-3xl font-mono text-blue-400">
                {calculatedHour} AM
              </p>
            )}
          </div>
        </div>

        {/* Статус синхронизации */}
        {isSyncing && (
          <div className="text-xs text-gray-400 animate-pulse">
            Синхронизация...
          </div>
        )}
      </div>

      {/* Кнопка запуска (только для админа) */}
      {!nightCycle.isActive && isAdmin && (
        <button
          onClick={handleStartCycle}
          disabled={isStarting}
          className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600
                     text-white font-bold rounded-lg transition-colors mb-4"
        >
          {isStarting ? 'Запуск...' : '🚀 Запустить глобальный цикл'}
        </button>
      )}

      {/* Таймеры */}
      {nightCycle.isActive && !isCycleCompleted && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">До следующего часа</p>
            <p className="text-lg font-mono text-yellow-400">{timeUntilNextHour}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Всего осталось</p>
            <p className="text-lg font-mono text-green-400">{remainingTime}</p>
          </div>
        </div>
      )}

      {/* Прогресс ночи (часы 1-6 AM) */}
      {nightCycle.isActive && !isCycleCompleted && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Прогресс ночи</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5, 6].map((hour) => (
              <div
                key={hour}
                className={`flex-1 h-3 rounded ${
                  hour <= calculatedHour
                    ? 'bg-blue-500'
                    : 'bg-gray-700'
                } transition-colors`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 AM</span>
            <span>6 AM</span>
          </div>
        </div>
      )}

      {/* AI уровни аниматроников */}
      {nightCycle.isActive && (
        <div>
          <p className="text-xs text-gray-400 mb-2">Уровни активности аниматроников</p>
          <div className="space-y-2">
            {['freddy', 'bonnie', 'chica', 'foxy'].map((animId) => {
              const aiLevel = aiLevels[animId] || 0;
              const isActive = aiLevel > 0;
              const enemy = enemies.find(e => e.id === animId || e.type === animId);

              return (
                <div key={animId} className="flex items-center gap-2">
                  <span className="text-lg w-6">{ANIMATRONIC_EMOJI[animId]}</span>
                  <span className={`text-sm w-16 ${isActive ? 'text-white' : 'text-gray-500'}`}>
                    {ANIMATRONIC_NAMES_RU[animId]}
                  </span>
                  <div className="flex-1">
                    {renderAIBar(aiLevel)}
                  </div>
                  <span className={`text-xs w-8 text-right font-mono ${
                    aiLevel === 0 ? 'text-gray-500' :
                    aiLevel <= 5 ? 'text-green-400' :
                    aiLevel <= 10 ? 'text-yellow-400' :
                    aiLevel <= 15 ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {aiLevel}/20
                  </span>
                  {/* Текущая локация аниматроника */}
                  {enemy && (
                    <span className="text-xs text-gray-500 w-8">
                      [{enemy.currentNode}]
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Информация о прогрессии */}
      {nightCycle.isActive && !isCycleCompleted && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Каждые 8 часов: +1 AM | Каждые 2 суток: +1 ночь
          </p>
        </div>
      )}

      {/* Сообщение о завершении */}
      {isCycleCompleted && (
        <div className="text-center py-4">
          <p className="text-green-400 text-lg font-bold mb-2">
            🎉 Все 5 ночей пройдены!
          </p>
          <p className="text-gray-400 text-sm">
            Цикл длился 10 реальных суток
          </p>
        </div>
      )}
    </div>
  );
}
