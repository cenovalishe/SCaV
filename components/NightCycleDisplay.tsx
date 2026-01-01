/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/NightCycleDisplay.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: UI компонент для отображения глобального цикла ночей
 * Показывает таймеры и AI уровни. Теперь поддерживает режим модалки.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState, useEffect } from 'react';
import { GlobalNightCycle, AnimatronicState } from '@/lib/types';
import {
  NIGHT_CYCLE_TIMINGS,
  formatTime,
  getAllAnimatronicAILevels,
  ANIMATRONIC_NAMES_RU,
  ANIMATRONIC_EMOJI,
  TOTAL_NIGHTS,
} from '@/lib/nightCycleConfig';
import { startNightCycle, syncNightCycle } from '@/app/actions/nightCycleActions';

interface NightCycleDisplayProps {
  gameId: string;
  nightCycle: GlobalNightCycle;
  calculatedNight: number;
  calculatedHour: number;
  enemies: AnimatronicState[];
  isAdmin?: boolean;
  onClose?: () => void; // ★ Callback для закрытия
}

export default function NightCycleDisplay({
  gameId,
  nightCycle,
  calculatedNight,
  calculatedHour,
  enemies,
  isAdmin = false,
  onClose
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

    const syncInterval = setInterval(syncWithServer, 30000);
    return () => clearInterval(syncInterval);
  }, [gameId, nightCycle.isActive]);

  const handleStartCycle = async () => {
    setIsStarting(true);
    try {
      await startNightCycle(gameId);
    } finally {
      setIsStarting(false);
    }
  };

  const aiLevels = getAllAnimatronicAILevels(calculatedNight, calculatedHour);

  const renderAIBar = (aiLevel: number) => {
    const percentage = (aiLevel / 20) * 100;
    let colorClass = 'bg-green-500';
    if (aiLevel > 10) colorClass = 'bg-yellow-500';
    if (aiLevel > 15) colorClass = 'bg-red-500';

    return (
      <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full ${colorClass} transition-all duration-500 shadow-[0_0_10px_currentColor]`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  const isCycleCompleted = nightCycle.isActive &&
    nightCycle.startedAt &&
    (Date.now() - nightCycle.startedAt >= NIGHT_CYCLE_TIMINGS.totalDurationMs);

  return (
    <div className="h-full flex flex-col bg-black/90 backdrop-blur-md p-6 text-white custom-scrollbar overflow-y-auto">
      
      {/* Header с кнопкой закрытия */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <span className="text-3xl animate-pulse">🌙</span>
          <div>
            <h2 className="text-xl font-bold font-mono tracking-widest uppercase">
              Глобальный Цикл
            </h2>
            {isSyncing && (
              <span className="text-[10px] text-blue-400 font-mono animate-pulse">
                СИНХРОНИЗАЦИЯ ДАННЫХ...
              </span>
            )}
          </div>
        </div>
        
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white/50 group-hover:text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Статус */}
        <div className="text-center">
             {nightCycle.isActive ? (
                isCycleCompleted ? (
                  <span className="text-green-400 font-mono text-xl">ЦИКЛ ЗАВЕРШЁН</span>
                ) : (
                  <div className="flex flex-col gap-1">
                    <span className="text-4xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
                       НОЧЬ {calculatedNight} <span className="text-white/30 text-2xl">/ {TOTAL_NIGHTS}</span>
                    </span>
                    <span className="text-5xl font-mono font-bold text-blue-400 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)] mt-2">
                      {calculatedHour} AM
                    </span>
                  </div>
                )
              ) : (
                <span className="text-white/50 font-mono">ОЖИДАНИЕ ЗАПУСКА...</span>
              )}
        </div>

        {/* Таймеры */}
        {nightCycle.isActive && !isCycleCompleted && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/80 border border-white/10 rounded-lg p-4 text-center hover:border-yellow-500/50 transition-colors">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Смена часа через</p>
              <p className="text-2xl font-mono text-yellow-400">{timeUntilNextHour}</p>
            </div>
            <div className="bg-zinc-900/80 border border-white/10 rounded-lg p-4 text-center hover:border-green-500/50 transition-colors">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">Конец цикла</p>
              <p className="text-2xl font-mono text-green-400">{remainingTime}</p>
            </div>
          </div>
        )}

        {/* Кнопка админа */}
        {!nightCycle.isActive && isAdmin && (
          <button
            onClick={handleStartCycle}
            disabled={isStarting}
            className="w-full py-4 bg-green-600/20 border border-green-500 hover:bg-green-600/40 
                       text-green-400 font-bold font-mono rounded-lg transition-all hover:scale-[1.02] uppercase tracking-widest"
          >
            {isStarting ? 'Инициализация...' : '🚀 Запустить протокол ночи'}
          </button>
        )}

        {/* AI Уровни */}
        {nightCycle.isActive && (
          <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
            <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
              Активность ИИ
            </p>
            <div className="space-y-4">
              {['freddy', 'bonnie', 'chica', 'foxy'].map((animId) => {
                const aiLevel = aiLevels[animId] || 0;
                const isActive = aiLevel > 0;
                const enemy = enemies.find(e => e.id === animId || e.type === animId);

                return (
                  <div key={animId} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl filter drop-shadow-md group-hover:scale-110 transition-transform">
                            {ANIMATRONIC_EMOJI[animId]}
                        </span>
                        <span className={`font-mono text-sm font-bold ${isActive ? 'text-white' : 'text-gray-600'}`}>
                          {ANIMATRONIC_NAMES_RU[animId]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                         {enemy && (
                            <span className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/60">
                              CAM-{enemy.currentNode}
                            </span>
                          )}
                          <span className={`font-mono text-sm font-bold w-12 text-right ${
                            aiLevel === 0 ? 'text-gray-600' :
                            aiLevel <= 10 ? 'text-green-400' :
                            'text-red-500'
                          }`}>
                            AI: {aiLevel}
                          </span>
                      </div>
                    </div>
                    {renderAIBar(aiLevel)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
