'use client'

import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { dbClient } from '@/lib/firebaseClient';

export type PlayerState = {
  currentNode: string;
  status: "IDLE" | "MOVING" | "IN_COMBAT" | "DEAD";
  stats: { hp: number; san: number };
  inventory: string[]; // <--- ДОБАВЬ ВОТ ЭТУ СТРОКУ
};



export type EnemyState = {
  id: string;
  currentNode: string;
  type: string;
};

export function useGame(gameId: string, playerId: string) {
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [enemies, setEnemies] = useState<EnemyState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Слушаем Игрока
    const playerRef = doc(dbClient, 'games', gameId, 'players', playerId);
    const unsubPlayer = onSnapshot(playerRef, (doc) => {
      if (doc.exists()) {
        setPlayer(doc.data() as PlayerState);
      }
    });

    // 2. Слушаем Врагов (Коллекцию)
    const enemiesRef = collection(dbClient, 'games', gameId, 'enemies');
    const unsubEnemies = onSnapshot(enemiesRef, (snapshot) => {
      const enemiesList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EnemyState));
      setEnemies(enemiesList);
    });

    setLoading(false);

    // Очистка слушателей при размонтировании
    return () => {
      unsubPlayer();
      unsubEnemies();
    };
  }, [gameId, playerId]);

  // 3. Логика проверки на БОЙ (Client-side check for immediate UI feedback)
  // Хотя сервер тоже ставит статус, клиент должен реагировать мгновенно
  const isCombat = player?.status === 'IN_COMBAT' || enemies.some(e => e.currentNode === player?.currentNode);

  return { player, enemies, isCombat, loading };
}