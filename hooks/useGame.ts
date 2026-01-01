/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: hooks/useGame.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: React хук для realtime подписки на состояние игры через Firebase
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2026-01-01 | VERSION: 2.2.0 (с автоинициализацией цикла)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { dbClient } from '@/lib/firebaseClient';
import { PlayerState, AnimatronicState, GlobalNightCycle } from '@/lib/types';
import { NIGHT_CYCLE_TIMINGS, calculateNightAndHour } from '@/lib/nightCycleConfig';
import { syncNightCycle } from '@/app/actions/nightCycleActions';

// ★ Дефолтное состояние цикла
const DEFAULT_NIGHT_CYCLE: GlobalNightCycle = {
  isActive: false,
  currentNight: 1,
  currentHour: 1,
  startedAt: null,
  timerEndAt: null,
  lastHourUpdateAt: null,
  lastNightUpdateAt: null
};

export function useGame(gameId: string, playerId: string) {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerState[]>([]);
  const [enemies, setEnemies] = useState<AnimatronicState[]>([]);
  const [loading, setLoading] = useState(true);

  // Состояние для глобальных данных игры
  const [nightCycle, setNightCycle] = useState<GlobalNightCycle>(DEFAULT_NIGHT_CYCLE);

  // Локальные вычисляемые значения
  const [calculatedNight, setCalculatedNight] = useState(1);
  const [calculatedHour, setCalculatedHour] = useState(1);

  // ★ Ref для предотвращения повторной автоинициализации
  const isAutoInitializing = useRef(false);

  // 1. Подписка на ТЕКУЩЕГО ИГРОКА
  useEffect(() => {
    if (!gameId || !playerId) return;

    const playerRef = doc(dbClient, 'games', gameId, 'players', playerId);
    const unsubscribe = onSnapshot(playerRef, (doc) => {
      if (doc.exists()) {
        setPlayer({ id: doc.id, ...doc.data() } as PlayerState);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameId, playerId]);

  // 2. Подписка на ВСЕХ ИГРОКОВ (для списка)
  useEffect(() => {
    if (!gameId) return;

    const fetchPlayers = async () => {
      const playersRef = collection(dbClient, 'games', gameId, 'players');
      const querySnapshot = await getDocs(playersRef);
      const players = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlayerState));
      setAllPlayers(players);
    };

    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);

    return () => clearInterval(interval);
  }, [gameId]);

  // 3. Подписка на ВРАГОВ
  useEffect(() => {
    if (!gameId) return;

    const enemiesRef = collection(dbClient, 'games', gameId, 'enemies');
    const unsubscribe = onSnapshot(enemiesRef, (snapshot) => {
      const enemiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnimatronicState));
      setEnemies(enemiesData);
    });

    return () => unsubscribe();
  }, [gameId]);

  // 4. Подписка на ГЛОБАЛЬНЫЙ ДОКУМЕНТ ИГРЫ (для NightCycle)
  useEffect(() => {
    if (!gameId) return;

    // Слушаем документ самой игры (games/game_alpha)
    const gameRef = doc(dbClient, 'games', gameId);

    const unsubscribe = onSnapshot(gameRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        // ★ FIX: Поддержка обоих имён полей для совместимости
        const cycleData = data.globalNightCycle || data.nightCycle;
        if (cycleData) {
          setNightCycle(cycleData);
        }
      }
    }, (error) => {
        console.error("Error listening to game document:", error);
    });

    return () => unsubscribe();
  }, [gameId]);

  // 5. ★ FIX: Автоматическая инициализация при ручном переключении isActive в Firebase
  // Если isActive=true но startedAt=null - вызываем syncNightCycle для инициализации
  useEffect(() => {
    if (!gameId) return;

    // Проверяем условие: isActive=true и startedAt=null (ручное переключение)
    if (nightCycle.isActive && !nightCycle.startedAt && !isAutoInitializing.current) {
      isAutoInitializing.current = true;

      console.log('[NightCycle] Detected manual activation, auto-initializing...');

      syncNightCycle(gameId)
        .then((result) => {
          console.log('[NightCycle] Auto-initialization result:', result);
          isAutoInitializing.current = false;
        })
        .catch((error) => {
          console.error('[NightCycle] Auto-initialization error:', error);
          isAutoInitializing.current = false;
        });
    }
  }, [gameId, nightCycle.isActive, nightCycle.startedAt]);

  // 6. Локальный таймер для обновления Часа/Ночи на клиенте
  useEffect(() => {
    if (!nightCycle.isActive || !nightCycle.startedAt) {
        setCalculatedNight(nightCycle.currentNight || 1);
        setCalculatedHour(nightCycle.currentHour || 1);
        return;
    }

    const updateTime = () => {
        const now = Date.now();
        const elapsedMs = now - nightCycle.startedAt!;
        const result = calculateNightAndHour(elapsedMs);
        if (result) {
            setCalculatedNight(result.night);
            setCalculatedHour(result.hour);
        }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [nightCycle]);

  return {
    player,
    allPlayers,
    enemies,
    loading,
    nightCycle,
    calculatedNight,
    calculatedHour
  };
}
