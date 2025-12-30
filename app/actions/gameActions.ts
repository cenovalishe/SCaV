'use server'

import { dbAdmin } from '@/lib/firebaseAdmin';
import { MAP_NODES_DATA } from '@/lib/mapData';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

type MoveResponse = {
  success: boolean;
  message: string;
  event?: string;
  loot?: string;
};

export async function movePlayer(
  gameId: string,
  playerId: string,
  targetNodeId: string
): Promise<MoveResponse> {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const playerRef = dbAdmin.collection('games').doc(gameId).collection('players').doc(playerId);
    const playerSnap = await playerRef.get();

    if (!playerSnap.exists) {
      return { success: false, message: 'Player not found' };
    }

    const playerData = playerSnap.data();
    const currentNodeId = playerData?.currentNode;

    // Валидация пути
    const nodeConfig = MAP_NODES_DATA.find(n => n.id === currentNodeId);

    if (!nodeConfig || !nodeConfig.neighbors.includes(targetNodeId)) {
      return { success: false, message: "Movement blocked: No direct path!" };
    }

    // RNG события
    const roll = Math.random();
    let status = "IDLE";

    // Обновление игрока
    await playerRef.update({
      currentNode: targetNodeId,
      status: status,
      lastUpdated: FieldValue.serverTimestamp()
    });

    // Логика аниматроников
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const enemiesRef = gameRef.collection('enemies');
    const enemiesSnap = await enemiesRef.get();

    const enemyMoves = enemiesSnap.docs.map(async (enemyDoc) => {
      const enemyData = enemyDoc.data();

      // Шанс движения 40%
      if (Math.random() > 0.6) {
        const enemyNode = MAP_NODES_DATA.find(n => n.id === enemyData.currentNode);

        if (enemyNode && enemyNode.neighbors.length > 0) {
          const nextNode = enemyNode.neighbors[Math.floor(Math.random() * enemyNode.neighbors.length)];
          return enemyDoc.ref.update({ currentNode: nextNode });
        }
      }
      return Promise.resolve();
    });

    await Promise.all(enemyMoves);

    revalidatePath('/');
    return {
      success: true,
      message: `Moved to ${targetNodeId}`,
      event: status === "IN_COMBAT" ? "ENEMY_ENCOUNTER" : "CLEAR"
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Error" };
  }
}

export async function getOrCreatePlayer(gameId: string, savedPlayerId: string | null) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const playersRef = dbAdmin.collection('games').doc(gameId).collection('players');

    // Если ID уже был сохранен, проверяем его в базе
    if (savedPlayerId) {
      const doc = await playersRef.doc(savedPlayerId).get();
      if (doc.exists) return { success: true, playerId: savedPlayerId };
    }

    // Создаем нового игрока
    const newPlayerRef = playersRef.doc();
    const newId = newPlayerRef.id;

    const startData = {
      id: newId,
      currentNode: "SF",
      status: "IDLE",
      stats: {
        hp: 100,
        san: 100
      },
      inventory: ["flashlight"]
    };

    await newPlayerRef.set(startData);
    return { success: true, playerId: newId };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Failed to initialize player" };
  }
}
