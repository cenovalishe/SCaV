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

import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { dbClient } from '@/lib/firebaseClient';
import { PlayerState, AnimatronicState, GlobalNightCycle } from '@/lib/types';
import { NIGHT_CYCLE_TIMINGS, calculateNightAndHour } from '@/lib/nightCycleConfig';

// ★ ИСПРАВЛЕНО: Объект теперь соответствует интерфейсу GlobalNightCycle из types.ts
const DEFAULT_NIGHT_CYCLE: GlobalNightCycle = {
  isActive: false,
  currentNight: 1,      // Было nightNumber
  currentHour: 12,      // Добавлено (обязательное поле)
  startedAt: null,
  timerEndAt: null,     // Добавлено (обязательное поле)
  lastHourUpdateAt: null, // Добавлено (обязательное поле)
  lastNightUpdateAt: null // Добавлено (обязательное поле)
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
  const [calculatedHour, setCalculatedHour] = useState(12);

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
        // Если в базе есть поле nightCycle, обновляем стейт
        if (data.nightCycle) {
            setNightCycle(data.nightCycle);
        }
      }
    }, (error) => {
        console.error("Error listening to game document:", error);
    });

    return () => unsubscribe();
  }, [gameId]);

// 5. Локальный таймер для обновления Часа/Ночи на клиенте
  useEffect(() => {
    if (!nightCycle.isActive || !nightCycle.startedAt) {
        setCalculatedNight(nightCycle.currentNight || 1);
        setCalculatedHour(12);
        return;
    }

    const updateTime = () => {
        const result = calculateNightAndHour(nightCycle.startedAt!);
        // ★ ИСПРАВЛЕНО: Проверяем, что результат не null
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
