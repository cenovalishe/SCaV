'use server'

import { dbAdmin } from '@/lib/firebaseAdmin';
import { MAP_NODES_DATA } from '@/lib/mapData'; // Импортируем новые данные
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

// Определим тип ответа сверху файла
type MoveResponse = {
  success: boolean;
  message: string;
  event?: string;
  loot?: string; // <--- Убедись, что это поле добавлено сюда
};


export async function movePlayer(
  gameId: string, 
  playerId: string, 
  targetNodeId: string
): Promise<MoveResponse> { // <--- ВОТ ЭТО ИСПРАВЛЕНИЕ
  try {
    const playerRef = dbAdmin.collection('games').doc(gameId).collection('players').doc(playerId);
    const playerSnap = await playerRef.get();
    
    if (!playerSnap.exists) {
        // Чтобы удовлетворить типу MoveResponse, добавим message
        return { success: false, message: 'Player not found' }; 
    }

    const playerData = playerSnap.data();
    const currentNodeId = playerData?.currentNode;

    // --- НОВАЯ ЛОГИКА ВАЛИДАЦИИ ---
    // 1. Находим конфиг текущего узла в массиве
    const nodeConfig = MAP_NODES_DATA.find(n => n.id === currentNodeId);
    
    // 2. Проверяем, есть ли targetNodeId в списке соседей (neighbors)
    if (!nodeConfig || !nodeConfig.neighbors.includes(targetNodeId)) {
      return { success: false, message: "Movement blocked: No direct path!" };
    }

    // --- RNG СОБЫТИЯ (Оставляем как было или усложняем) ---
    const roll = Math.random();
    let status = "IDLE";
    
    // Проверка на столкновение с врагом (серверная часть)
    const enemiesSnap = await dbAdmin.collection('games').doc(gameId).collection('enemies')
      .where('currentNode', '==', targetNodeId).get();
    
    if (!enemiesSnap.empty) {
      status = "IN_COMBAT";
    }

    // 3. Обновление
    await playerRef.update({
      currentNode: targetNodeId,
      status: status,
      lastUpdated: FieldValue.serverTimestamp()
    });

    revalidatePath('/');
    // В конце функции при успехе:
    return { 
      success: true, 
      message: `Moved to ${targetNodeId}`, 
      event: status === "IN_COMBAT" ? "ENEMY_ENCOUNTER" : "CLEAR",
      loot: undefined // Можно добавить явно, чтобы избежать undefined ошибок
    };
  } catch (e) {
    return { success: false, message: "Error" };
  }
}