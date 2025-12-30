'use server'

import { dbAdmin } from '@/lib/firebaseAdmin'; // Напишем этот хелпер ниже
import { MAP_NODES } from '@/lib/gameConfig';
import { revalidatePath } from 'next/cache';

// Типы ответа для клиента
type MoveResult = {
  success: boolean;
  message: string;
  event?: string; // "LOOT_FOUND", "ENEMY_ENCOUNTER", "NOTHING"
  loot?: string;
};

export async function movePlayer(gameId: string, playerId: string, targetNodeId: string): Promise<MoveResult> {
  try {
    const playerRef = dbAdmin.collection('games').doc(gameId).collection('players').doc(playerId);
    const playerSnap = await playerRef.get();

    if (!playerSnap.exists) throw new Error('Player not found');

    const playerData = playerSnap.data();
    const currentNodeId = playerData?.currentNode;

    // 1. Валидация: Можно ли пройти в этот узел?
    const currentNodeConfig = MAP_NODES[currentNodeId as keyof typeof MAP_NODES];
    
    if (!currentNodeConfig.neighbors.includes(targetNodeId)) {
      return { success: false, message: "Too far away or not connected!" };
    }

    // 2. RNG (Генерация события)
    // Шанс: 30% Лут, 20% Враг, 50% Пусто
    const roll = Math.random();
    let event = "NOTHING";
    let loot = undefined;

    if (roll < 0.3) {
      event = "LOOT_FOUND";
      loot = "Medical Kit"; // Здесь можно сделать сложную таблицу лута
      // TODO: Добавить лут в инвентарь игрока в БД
    } else if (roll < 0.5) {
      event = "ENEMY_ENCOUNTER";
      // TODO: Поменять статус игрока на IN_COMBAT
    }

    // 3. Обновление БД
    await playerRef.update({
      currentNode: targetNodeId,
      status: event === "ENEMY_ENCOUNTER" ? "IN_COMBAT" : "IDLE"
    });

    revalidatePath('/'); // Обновляем данные на клиенте
    return { success: true, message: `Moved to ${targetNodeId}`, event, loot };

  } catch (error) {
    console.error(error);
    return { success: false, message: "Server Error" };
  }
}