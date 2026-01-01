/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/PvPEncounter.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Система PvP встречи между игроками
 *
 * FLOW:
 *   1. Инициатор предлагает PvP (показ инициативы обоих игроков)
 *   2. Цель принимает или отклоняет
 *   3. Если принято - пошаговый бой (до 3 раундов)
 *   4. Победа/поражение с передачей предметов
 *   5. Или отступление после 3 раундов
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react';
import { PvPEncounterState, PlayerState } from '@/lib/types';
import {
  initiatePvP,
  respondToPvP,
  resolvePvPRound,
  completePvP,
  handlePvPRetreat
} from '@/app/actions/pvpActions';

export interface PvPEncounterResult {
  outcome: 'initiator_win' | 'target_win' | 'retreat' | 'peaceful';
  lootedItems?: string[];
  retreatingPlayerId?: string;
}

interface PvPEncounterProps {
  gameId: string;
  currentPlayer: PlayerState;
  otherPlayer: PlayerState; // Другой игрок на той же ноде
  isInitiator: boolean; // true если текущий игрок инициирует PvP
  onComplete: (result: PvPEncounterResult) => void;
}

type PvPPhase = 'initiation' | 'response_pending' | 'combat' | 'loot_selection' | 'result';

export default function PvPEncounter({
  gameId,
  currentPlayer,
  otherPlayer,
  isInitiator,
  onComplete
}: PvPEncounterProps) {
  const [phase, setPhase] = useState<PvPPhase>('initiation');
  const [pvpState, setPvpState] = useState<PvPEncounterState | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [selectedLootItem, setSelectedLootItem] = useState<string | null>(null);

  // Инициировать PvP
  const handleInitiatePvP = useCallback(async () => {
    const result = await initiatePvP(gameId, currentPlayer.id, otherPlayer.id);
    // [FIX] Используем 'in' для проверки наличия свойства, чтобы TypeScript корректно сузил тип
    if (result.success && 'pvpState' in result) {
      setPvpState(result.pvpState);
      setCombatLog(result.pvpState.combatLog);
      setPhase('response_pending');
    }
  }, [gameId, currentPlayer.id, otherPlayer.id]);

  // Отклонить PvP (разойтись мирно)
  const handleDeclinePvP = useCallback(async () => {
    const result = await respondToPvP(gameId, currentPlayer.id, false);
    if (result.success) {
      onComplete({ outcome: 'peaceful' });
    }
  }, [gameId, currentPlayer.id, onComplete]);

  // Принять PvP
  const handleAcceptPvP = useCallback(async () => {
    const result = await respondToPvP(gameId, currentPlayer.id, true);
    if (result.success) {
      setPhase('combat');
    }
  }, [gameId, currentPlayer.id]);

  // Выполнить раунд боя
  const handleCombatRound = useCallback(async () => {
    if (!pvpState) return;

    const result = await resolvePvPRound(
      gameId,
      pvpState.attackerId,
      pvpState.defenderId
    );

    // [FIX] Используем 'in' для проверки наличия свойства combatLog
    if (result.success && 'combatLog' in result) {
      setCombatLog(result.combatLog);

      // Проверка на победу
      if ('victory' in result && result.victory) {
        setPhase('loot_selection');
      }
      // Проверка на отступление
      else if ('retreat' in result && result.retreat) {
        const retreatResult = await handlePvPRetreat(gameId, result.retreatingPlayerId!);
        if (retreatResult.success) {
          onComplete({
            outcome: 'retreat',
            retreatingPlayerId: result.retreatingPlayerId
          });
        }
      }
    }
  }, [gameId, pvpState, onComplete]);

  // Завершить PvP с выбором предмета
  const handleCompletePvP = useCallback(async () => {
    if (!pvpState) return;

    const winnerId = pvpState.outcome === 'initiator_win' ? pvpState.initiatorId : pvpState.targetId;
    const loserId = pvpState.outcome === 'initiator_win' ? pvpState.targetId : pvpState.initiatorId;

    const result = await completePvP(gameId, winnerId, loserId, selectedLootItem || undefined);

    if (result.success) {
      onComplete({
        outcome: pvpState.outcome!,
        lootedItems: result.lootedItems
      });
    }
  }, [gameId, pvpState, selectedLootItem, onComplete]);

  // Автоматическая инициация при монтировании (если isInitiator)
  useEffect(() => {
    if (isInitiator && phase === 'initiation') {
      handleInitiatePvP();
    }
  }, [isInitiator, phase, handleInitiatePvP]);

  // Если у игрока уже есть pvpState, синхронизируем
  useEffect(() => {
    if (currentPlayer.pvpState && !pvpState) {
      setPvpState(currentPlayer.pvpState);
      setCombatLog(currentPlayer.pvpState.combatLog);

      if (currentPlayer.pvpState.status === 'pending') {
        setPhase('response_pending');
      } else if (currentPlayer.pvpState.status === 'in_progress') {
        setPhase('combat');
      } else if (currentPlayer.pvpState.status === 'completed') {
        if (currentPlayer.pvpState.outcome === 'retreat' || currentPlayer.pvpState.outcome === 'peaceful') {
          onComplete({ outcome: currentPlayer.pvpState.outcome });
        } else {
          setPhase('loot_selection');
        }
      }
    }
  }, [currentPlayer.pvpState, pvpState, onComplete]);

  if (!pvpState) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 border-2 border-red-600 p-8 rounded-lg max-w-lg">
          <h2 className="text-2xl font-bold text-red-500 mb-4">PvP Встреча!</h2>
          <p className="text-white mb-4">
            Вы встретили игрока <span className="text-yellow-400">{otherPlayer.name}</span> в PvP зоне!
          </p>
          <p className="text-gray-400 mb-6">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Фаза ожидания ответа
  if (phase === 'response_pending') {
    const isTarget = currentPlayer.id === pvpState.targetId;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 border-2 border-red-600 p-8 rounded-lg max-w-lg">
          <h2 className="text-2xl font-bold text-red-500 mb-4">PvP Встреча!</h2>

          <div className="mb-6 space-y-2">
            <div className="text-white">
              <span className="text-yellow-400">Инициатива:</span>
            </div>
            <div className="text-white">
              {pvpState.initiatorId === currentPlayer.id ? 'Вы' : otherPlayer.name}: {pvpState.initiatorInitiative}
            </div>
            <div className="text-white">
              {pvpState.targetId === currentPlayer.id ? 'Вы' : otherPlayer.name}: {pvpState.targetInitiative}
            </div>
            <div className="text-green-400 mt-2">
              Первым атакует: {pvpState.attackerId === currentPlayer.id ? 'Вы' : otherPlayer.name}!
            </div>
          </div>

          {isTarget ? (
            <div className="space-y-4">
              <p className="text-white">
                {otherPlayer.name} инициировал PvP! Принять бой или разойтись мирно?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleAcceptPvP}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold"
                >
                  Принять бой
                </button>
                <button
                  onClick={handleDeclinePvP}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-bold"
                >
                  Разойтись мирно
                </button>
              </div>
            </div>
          ) : (
            <p className="text-yellow-400">
              Ожидание ответа от {otherPlayer.name}...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Фаза боя
  if (phase === 'combat') {
    const isMyTurn = currentPlayer.id === pvpState.attackerId;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 border-2 border-red-600 p-8 rounded-lg max-w-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-4">
            PvP Бой - Раунд {pvpState.currentRound}/{pvpState.maxRounds}
          </h2>

          {/* Статистика игроков */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded">
              <h3 className="text-yellow-400 font-bold mb-2">
                {pvpState.initiatorId === currentPlayer.id ? 'Вы' : otherPlayer.name}
              </h3>
              <div className="text-white text-sm space-y-1">
                <div>HP: {pvpState.initiatorHp}</div>
                <div>Атака: {currentPlayer.stats.attack}</div>
                <div>Защита: {currentPlayer.stats.defense}</div>
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded">
              <h3 className="text-yellow-400 font-bold mb-2">
                {pvpState.targetId === currentPlayer.id ? 'Вы' : otherPlayer.name}
              </h3>
              <div className="text-white text-sm space-y-1">
                <div>HP: {pvpState.targetHp}</div>
                <div>Атака: {otherPlayer.stats.attack}</div>
                <div>Защита: {otherPlayer.stats.defense}</div>
              </div>
            </div>
          </div>

          {/* Лог боя */}
          <div className="bg-gray-800 p-4 rounded mb-6 max-h-48 overflow-y-auto">
            <h3 className="text-white font-bold mb-2">Лог боя:</h3>
            {combatLog.map((log, idx) => (
              <div key={idx} className="text-gray-300 text-sm">
                {log}
              </div>
            ))}
          </div>

          {/* Кнопка атаки */}
          {isMyTurn ? (
            <button
              onClick={handleCombatRound}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold"
            >
              Атаковать!
            </button>
          ) : (
            <p className="text-yellow-400 text-center">
              Ход противника...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Фаза выбора лута (только для победителя)
  if (phase === 'loot_selection') {
    const isWinner = (pvpState.outcome === 'initiator_win' && currentPlayer.id === pvpState.initiatorId) ||
                     (pvpState.outcome === 'target_win' && currentPlayer.id === pvpState.targetId);

    if (!isWinner) {
      // Проигравший просто ждет
      return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-red-600 p-8 rounded-lg max-w-lg">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Поражение</h2>
            <p className="text-white mb-4">Вы проиграли в PvP...</p>
            <p className="text-gray-400">Противник выбирает предметы...</p>
          </div>
        </div>
      );
    }

    // Победитель выбирает предметы
    const loser = pvpState.outcome === 'initiator_win' ? otherPlayer : currentPlayer;
    const loserItems = [...loser.inventory];

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-900 border-2 border-green-600 p-8 rounded-lg max-w-2xl">
          <h2 className="text-2xl font-bold text-green-500 mb-4">Победа!</h2>

          <p className="text-white mb-4">
            Вы победили! Выберите один предмет из снаряжения или инвентаря противника:
          </p>

          <div className="bg-gray-800 p-4 rounded mb-6 max-h-64 overflow-y-auto">
            <h3 className="text-white font-bold mb-2">Инвентарь противника:</h3>
            <div className="space-y-2">
              {loserItems.length > 0 ? (
                loserItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedLootItem(item)}
                    className={`w-full text-left px-4 py-2 rounded ${
                      selectedLootItem === item
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {item}
                  </button>
                ))
              ) : (
                <p className="text-gray-400">Нет предметов</p>
              )}
            </div>
          </div>

          <button
            onClick={handleCompletePvP}
            disabled={!selectedLootItem && loserItems.length > 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold"
          >
            Забрать предметы
          </button>
        </div>
      </div>
    );
  }

  return null;
}
