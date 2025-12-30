'use client'

import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query } from 'firebase/firestore';
import { dbClient } from '@/lib/firebaseClient';

export type PlayerState = {
  id: string;
  currentNode: string;
  status: "IDLE" | "MOVING" | "IN_COMBAT" | "DEAD";
  stats: { hp: number; san: number };
  inventory: string[];
};

export type EnemyState = {
  id: string;
  currentNode: string;
  type: string;
  hp: number;
};

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