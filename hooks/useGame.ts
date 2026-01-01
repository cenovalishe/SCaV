/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: hooks/useGame.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: React хук для realtime подписки на состояние игры через Firebase
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEMANTIC ANCHORS INDEX:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * /START_ANCHOR:USEGAME/IMPORTS ............... Импорты React и Firebase
 * /START_ANCHOR:USEGAME/TYPES ................. Типы PlayerState, EnemyState
 * /START_ANCHOR:USEGAME/HOOK .................. Хук useGame()
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORTS OVERVIEW:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * TYPES:
 * PlayerState         - Состояние игрока (id, currentNode, status, stats)
 * EnemyState          - Состояние врага (id, currentNode, type, hp)
 *
 * HOOKS:
 * useGame(gameId, playerId)
 * → { player, allPlayers, enemies, isCombat, loading }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPENDENCY GRAPH:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * IMPORTS FROM:
 * react              → useState, useEffect
 * firebase/firestore → doc, onSnapshot, collection, query
 * @/lib/firebaseClient → dbClient (клиентский Firestore)
 * @/lib/types        → PlayerState, AnimatronicState
 *
 * IMPORTED BY:
 * app/page.tsx       → основной хук для состояния игры
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * FIREBASE SUBSCRIPTIONS:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PLAYERS COLLECTION:
 * Path: games/{gameId}/players
 * onSnapshot → updates allPlayers[]
 * Filters playerId → updates player
 *
 * ENEMIES COLLECTION:
 * Path: games/{gameId}/enemies
 * onSnapshot → updates enemies[]
 *
 * CLEANUP:
 * Unsubscribes from both collections on unmount
 *
 * DERIVED STATE:
 * isCombat = player?.status === 'IN_COMBAT'
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2024-12-31 | VERSION: 2.1.0 (FIX: Use central types)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:USEGAME/IMPORTS
// Импорты React hooks и Firebase Firestore
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query } from 'firebase/firestore';
import { dbClient } from '@/lib/firebaseClient';
// [FIX] Импортируем централизованные типы вместо локальных определений
import { PlayerState, AnimatronicState, GlobalNightCycle } from '@/lib/types';
import { INITIAL_NIGHT_CYCLE, calculateNightAndHour, NIGHT_CYCLE_TIMINGS } from '@/lib/nightCycleConfig';

// /END_ANCHOR:USEGAME/IMPORTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:USEGAME/TYPES
// Типы состояний
// ═══════════════════════════════════════════════════════════════════════════════

// Используем псевдоним для совместимости, если где-то явно используется EnemyState
export type EnemyState = AnimatronicState;

// /END_ANCHOR:USEGAME/TYPES

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:USEGAME/HOOK
// Хук useGame - realtime подписка на состояние игры
// КОНТРАКТ: Возвращает null для player до загрузки, автоматически unsubscribe при unmount
// ═══════════════════════════════════════════════════════════════════════════════

export function useGame(gameId: string, playerId: string) {
  // [FIX] Используем импортированный PlayerState
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerState[]>([]);
  const [enemies, setEnemies] = useState<EnemyState[]>([]);
  const [loading, setLoading] = useState(true);

  // Глобальный цикл ночей
  const [nightCycle, setNightCycle] = useState<GlobalNightCycle>(INITIAL_NIGHT_CYCLE);
  const [calculatedNight, setCalculatedNight] = useState<number>(1);
  const [calculatedHour, setCalculatedHour] = useState<number>(1);

  useEffect(() => {
    if (!gameId || !playerId) return;

    // 1. Слушаем ВСЕХ игроков в этой игре
    const playersRef = collection(dbClient, 'games', gameId, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
      // Приводим данные к PlayerState (предполагаем, что в БД записаны корректные данные)
      const playersList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PlayerState));
      setAllPlayers(playersList);

      // Находим среди них "себя" и обновляем локальное состояние
      const me = playersList.find(p => p.id === playerId);
      if (me) setPlayer(me);

      setLoading(false);
    });

    // 2. Слушаем Врагов
    const enemiesRef = collection(dbClient, 'games', gameId, 'enemies');
    const unsubEnemies = onSnapshot(enemiesRef, (snapshot) => {
      const enemiesList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EnemyState));
      setEnemies(enemiesList);
    });

    // 3. Слушаем глобальный цикл ночей (на уровне документа игры)
    const gameRef = doc(dbClient, 'games', gameId);
    const unsubGame = onSnapshot(gameRef, (snapshot) => {
      const gameData = snapshot.data();
      if (gameData?.globalNightCycle) {
        setNightCycle(gameData.globalNightCycle as GlobalNightCycle);
      }
    });

    return () => {
      unsubPlayers();
      unsubEnemies();
      unsubGame();
    };
  }, [gameId, playerId]);

  // 4. Локальный расчёт времени на основе startedAt (каждую секунду)
  useEffect(() => {
    if (!nightCycle.isActive || !nightCycle.startedAt) {
      setCalculatedNight(nightCycle.currentNight);
      setCalculatedHour(nightCycle.currentHour);
      return;
    }

    const updateCalculatedTime = () => {
      const now = Date.now();
      const elapsedMs = now - nightCycle.startedAt!;
      const calculated = calculateNightAndHour(elapsedMs);

      if (calculated) {
        setCalculatedNight(calculated.night);
        setCalculatedHour(calculated.hour);
      }
    };

    // Обновляем сразу
    updateCalculatedTime();

    // Обновляем каждую секунду для плавного отображения таймера
    const interval = setInterval(updateCalculatedTime, 1000);

    return () => clearInterval(interval);
  }, [nightCycle.isActive, nightCycle.startedAt]);

  return {
    player,
    allPlayers,
    enemies,
    loading,
    // Глобальный цикл ночей
    nightCycle,
    calculatedNight,
    calculatedHour,
  };
}

// /END_ANCHOR:USEGAME/HOOK
