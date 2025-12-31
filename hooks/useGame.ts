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
 *   PlayerState         - Состояние игрока (id, currentNode, status, stats)
 *   EnemyState          - Состояние врага (id, currentNode, type, hp)
 *
 * HOOKS:
 *   useGame(gameId, playerId)
 *     → { player, allPlayers, enemies, isCombat, loading }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPENDENCY GRAPH:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * IMPORTS FROM:
 *   react              → useState, useEffect
 *   firebase/firestore → doc, onSnapshot, collection, query
 *   @/lib/firebaseClient → dbClient (клиентский Firestore)
 *
 * IMPORTED BY:
 *   app/page.tsx       → основной хук для состояния игры
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * FIREBASE SUBSCRIPTIONS:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   PLAYERS COLLECTION:
 *     Path: games/{gameId}/players
 *     onSnapshot → updates allPlayers[]
 *     Filters playerId → updates player
 *
 *   ENEMIES COLLECTION:
 *     Path: games/{gameId}/enemies
 *     onSnapshot → updates enemies[]
 *
 *   CLEANUP:
 *     Unsubscribes from both collections on unmount
 *
 *   DERIVED STATE:
 *     isCombat = player?.status === 'IN_COMBAT'
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2024-12-31 | VERSION: 2.0.0 (с семантическими якорями)
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

// /END_ANCHOR:USEGAME/IMPORTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:USEGAME/TYPES
// Типы состояний для игрока и врага
// КОНТРАКТ: PlayerState.status определяет текущую фазу игрока
// ═══════════════════════════════════════════════════════════════════════════════

export type PlayerState = {
  id: string;
  currentNode: string;
  status: "IDLE" | "MOVING" | "IN_COMBAT" | "DEAD";
  stats: {
    hp: number;
    san: number;
    stamina: number;
    maxStamina: number;
    stealth: number;
  };
  inventory: string[];
};

export type EnemyState = {
  id: string;
  currentNode: string;
  type: string;
  hp: number;
};

// /END_ANCHOR:USEGAME/TYPES

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:USEGAME/HOOK
// Хук useGame - realtime подписка на состояние игры
// КОНТРАКТ: Возвращает null для player до загрузки, автоматически unsubscribe при unmount
// ═══════════════════════════════════════════════════════════════════════════════

export function useGame(gameId: string, playerId: string) {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerState[]>([]);
  const [enemies, setEnemies] = useState<EnemyState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId || !playerId) return;

    // 1. Слушаем ВСЕХ игроков в этой игре
    const playersRef = collection(dbClient, 'games', gameId, 'players');
    const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
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

    return () => {
      unsubPlayers();
      unsubEnemies();
    };
  }, [gameId, playerId]);

  const isCombat = player?.status === 'IN_COMBAT';

  return { player, allPlayers, enemies, isCombat, loading };
}

// /END_ANCHOR:USEGAME/HOOK
