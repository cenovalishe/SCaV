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
    
 
// 3. Обновление игрока
    await playerRef.update({
      currentNode: targetNodeId,
      status: status,
      lastUpdated: FieldValue.serverTimestamp()
    });

    // --- НОВОЕ: ЛОГИКА АНИМАТРОНИКОВ ---
    const enemiesRef = gameRef.collection('enemies');
    const enemiesSnap = await enemiesRef.get();

    // Создаем массив промисов для параллельного обновления врагов
    const enemyMoves = enemiesSnap.docs.map(async (enemyDoc) => {
      const enemyData = enemyDoc.data();
      
      // Шанс движения 40%, чтобы они не летали по карте слишком быстро
      if (Math.random() > 0.6) {
        const enemyNode = MAP_NODES_DATA.find(n => n.id === enemyData.currentNode);
        
        if (enemyNode && enemyNode.neighbors.length > 0) {
          // Выбираем случайного соседа из конфига графа
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


// app/actions/gameActions.ts

export async function getOrCreatePlayer(gameId: string, savedPlayerId: string | null) {
  try {
    const playersRef = dbAdmin.collection('games').doc(gameId).collection('players');
    
    // 1. Если ID уже был сохранен в браузере, проверяем его в базе
    if (savedPlayerId) {
      const doc = await playersRef.doc(savedPlayerId).get();
      if (doc.exists) return { success: true, playerId: savedPlayerId };
    }

    // 2. Если ID нет или он не найден — создаем нового игрока
    const newPlayerRef = playersRef.doc(); // Генерирует уникальный ID автоматически
    const newId = newPlayerRef.id;

    const startData = {
      id: newId,
      currentNode: "SF", // Твоя точка старта на новой карте
      status: "IDLE",
      stats: {
        hp: 100,
        san: 100
      },
      inventory: ["Flashlight"]
    };

    await newPlayerRef.set(startData);
    return { success: true, playerId: newId };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Failed to initialize player" };
  }
}