/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: app/actions/gameActions.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Server Actions для основной игровой логики - движение, создание игрока
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEMANTIC ANCHORS INDEX:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * /START_ANCHOR:GAMEACTIONS/IMPORTS ........... Импорты Firebase и mapData
 * /START_ANCHOR:GAMEACTIONS/TYPES ............. Типы MoveResponse
 * /START_ANCHOR:GAMEACTIONS/MOVEMENT_UTILS .... Утилиты движения (canBacktrack)
 * /START_ANCHOR:GAMEACTIONS/MOVE_PLAYER ....... Функция movePlayer()
 * /START_ANCHOR:GAMEACTIONS/PLAYER_SLOTS ...... Функции getTakenPlayerSlots(), createPlayerInSlot()
 * /START_ANCHOR:GAMEACTIONS/STAMINA ........... Функции updateStamina(), applyDamage()
 * /START_ANCHOR:GAMEACTIONS/LOOT .............. Функция lootLocation()
 * /START_ANCHOR:GAMEACTIONS/TURNS ............. Функции checkAllPlayersExhausted(), startNewTurnForAll()
 * /START_ANCHOR:GAMEACTIONS/RESPAWN ........... Автоматический респавн аниматроников
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORTS OVERVIEW:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SERVER ACTIONS:
 *   movePlayer(gameId, playerId, targetNodeId) → MoveResponse
 *   getOrCreatePlayer(gameId, savedPlayerId)   → { success, playerId? }
 *   getTakenPlayerSlots(gameId)                → { takenSlots }
 *   createPlayerInSlot(gameId, slotId, name)   → { success, playerId }
 *   updateStamina(gameId, playerId, change)    → { success, newStamina }
 *   applyDamage(gameId, playerId, damage)      → { success, newHp, isDead }
 *   lootLocation(gameId, playerId)             → { success, items }
 *   checkAllPlayersExhausted(gameId)           → { allExhausted }
 *   startNewTurnForAll(gameId)                 → { success, playerResults }
 *   respawnEnemiesIfNeeded(gameId)             → { success, spawned, message }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2024-12-31 | VERSION: 2.0.0 (с семантическими якорями)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use server'

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMEACTIONS/IMPORTS
// Импорты Firebase Admin и игровых данных
// ═══════════════════════════════════════════════════════════════════════════════

import { dbAdmin } from '@/lib/firebaseAdmin';
import { MAP_NODES_DATA, ANIMATRONIC_SPAWNS, AnimatronicType } from '@/lib/mapData';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

// /END_ANCHOR:GAMEACTIONS/IMPORTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMEACTIONS/TYPES
// Типы ответов server actions
// КОНТРАКТ: success=true означает успешное выполнение операции
// ═══════════════════════════════════════════════════════════════════════════════

// [PATCH] Добавлено поле collision для обработки столкновений с врагами
type MoveResponse = {
  success: boolean;
  message: string;
  event?: string;
  loot?: string;
  collision?: {
    hasCollision: boolean;
    enemyId?: string;
    enemyType?: string;
  };
};

// /END_ANCHOR:GAMEACTIONS/TYPES

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMEACTIONS/MOVEMENT_UTILS
// Утилиты для валидации движения
// КОНТРАКТ: DEAD_END_NODES позволяют возврат назад
// ═══════════════════════════════════════════════════════════════════════════════

const DEAD_END_NODES = ['3', '4', '7', '9'];

function canBacktrack(playerData: any, currentNodeId: string, targetNodeId: string): boolean {
  if (playerData.hasReachedY) return true;
  if (DEAD_END_NODES.includes(currentNodeId)) return true;

  const visitedNodes = playerData.visitedNodes || [];
  const lastVisited = visitedNodes[visitedNodes.length - 1];

  if (lastVisited === targetNodeId) {
    return false;
  }
  return true;
}

// /END_ANCHOR:GAMEACTIONS/MOVEMENT_UTILS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMEACTIONS/MOVE_PLAYER
// Перемещение игрока на соседнюю ноду
// КОНТРАКТ: Проверяет путь, взаимоисключающие ветки X→1/X→2, запрет возврата
// ═══════════════════════════════════════════════════════════════════════════════

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

    // Проверка взаимоисключающих путей
    if (currentNodeId === 'X') {
      const chosenBranch = playerData?.chosenBranch;
      if (chosenBranch === '1' && targetNodeId === '2') {
        return { success: false, message: "Путь заблокирован! Вы уже выбрали маршрут через Сцену." };
      }
      if (chosenBranch === '2' && targetNodeId === '1') {
        return { success: false, message: "Путь заблокирован! Вы уже выбрали маршрут через Столовую." };
      }
    }

    // Проверка возврата назад
    if (!canBacktrack(playerData, currentNodeId, targetNodeId)) {
      return { success: false, message: "Нельзя возвращаться назад! (кроме тупиков и после достижения офиса)" };
    }

    let newChosenBranch = playerData?.chosenBranch;
    if (currentNodeId === 'X' && (targetNodeId === '1' || targetNodeId === '2')) {
      newChosenBranch = targetNodeId;
    }

    const hasReachedY = playerData?.hasReachedY || targetNodeId === 'Y';
    const visitedNodes = playerData?.visitedNodes || [];
    const updatedVisitedNodes = [...visitedNodes, currentNodeId];

    // 1. Сначала перемещаем игрока и сбрасываем боевые статусы
    await playerRef.update({
      currentNode: targetNodeId,
      status: "IDLE", // Сбрасываем статус, проверка боя будет позже
      currentEnemyId: null, // Сбрасываем текущего врага
      chosenBranch: newChosenBranch,
      hasReachedY: hasReachedY,
      visitedNodes: updatedVisitedNodes,
      lastUpdated: FieldValue.serverTimestamp()
    });

    // 2. Двигаем аниматроников (AI Movement) с учётом допустимых зон
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const enemiesRef = gameRef.collection('enemies');
    const enemiesSnap = await enemiesRef.get();

    const enemyMoves = enemiesSnap.docs.map(async (enemyDoc) => {
      const enemyData = enemyDoc.data();
      const enemyId = enemyDoc.id as AnimatronicType;

      // Шанс передвижения врага (можно настроить)
      if (Math.random() > 0.6) {
        const enemyNode = MAP_NODES_DATA.find(n => n.id === enemyData.currentNode);
        if (enemyNode && enemyNode.neighbors.length > 0) {
          // Получаем допустимые ноды для данного аниматроника
          const animatronicData = ANIMATRONIC_SPAWNS.find(a => a.id === enemyId);
          const allowedNodes = animatronicData?.allowedNodes || [];

          // Фильтруем соседей - только те, которые в допустимой зоне
          const validNeighbors = enemyNode.neighbors.filter(neighborId =>
            allowedNodes.includes(neighborId)
          );

          // Если есть допустимые соседи, двигаемся в случайного из них
          if (validNeighbors.length > 0) {
            const nextNode = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
            return enemyDoc.ref.update({ currentNode: nextNode });
          }
        }
      }
      return Promise.resolve();
    });

    // Ждем, пока все враги походят
    await Promise.all(enemyMoves);

    // 3. ФИНАЛЬНАЯ ПРОВЕРКА: Кто теперь в одной клетке с игроком?
    // Получаем обновленные данные врагов после их хода
    const updatedEnemiesSnap = await enemiesRef.get();
    
    // Фильтруем врагов, которые находятся в той же ноде, куда пришел игрок
    // [PATCH] Удалена проверка hp у аниматроников
    const enemiesInNode = updatedEnemiesSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter(e => e.currentNode === targetNodeId);

    let finalStatus = "IDLE";
    let message = `Moved to ${targetNodeId}`;
    let enemyId = null;

    if (enemiesInNode.length > 0) {
      finalStatus = "IN_COMBAT";
      
      // Случайный выбор врага из присутствующих
      const randomEnemy = enemiesInNode[Math.floor(Math.random() * enemiesInNode.length)];
      enemyId = randomEnemy.id;
      message = `Encountered ${randomEnemy.name || 'Enemy'}!`;

      // Обновляем статус игрока на боевой и записываем ID врага
      await playerRef.update({
        status: "IN_COMBAT",
        currentEnemyId: enemyId
      });
    }

    revalidatePath('/');
    return {
      success: true,
      message: message,
      event: finalStatus === "IN_COMBAT" ? "ENEMY_ENCOUNTER" : "CLEAR",
      collision: enemiesInNode.length > 0 ? {
        hasCollision: true,
        enemyId: enemyId,
        enemyType: enemiesInNode[0]?.type || enemiesInNode[0]?.id
      } : undefined
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Error in movePlayer" };
  }
}

// /END_ANCHOR:GAMEACTIONS/MOVE_PLAYER

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMEACTIONS/PLAYER_SLOTS
// Система фиксированных 6 игроков
// КОНТРАКТ: slotId уникален, нельзя создать игрока в занятом слоте
// ═══════════════════════════════════════════════════════════════════════════════

export async function getTakenPlayerSlots(gameId: string) {
  if (!dbAdmin) {
    return { success: false, takenSlots: [], message: 'Firebase not configured' };
  }

  try {
    const playersRef = dbAdmin.collection('games').doc(gameId).collection('players');
    const playersSnap = await playersRef.get();
    const takenSlots = playersSnap.docs.map(doc => doc.id);
    return { success: true, takenSlots };
  } catch (e) {
    console.error(e);
    return { success: false, takenSlots: [], message: 'Failed to get player slots' };
  }
}

export async function createPlayerInSlot(gameId: string, slotId: string, playerName: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const playersRef = dbAdmin.collection('games').doc(gameId).collection('players');

    const existingDoc = await playersRef.doc(slotId).get();
    if (existingDoc.exists) {
      return { success: false, message: 'Этот слот уже занят другим игроком!' };
    }

    const startData = {
      id: slotId,
      name: playerName,
      currentNode: "SF",
      status: "IDLE",
      stats: {
        hp: 100,
        san: 100,
        stamina: 7,
        maxStamina: 7,
        stealth: 0,      // Скрытность: 0
        attack: 1,       // Атака: 1
        defense: 1,      // Защита: 1
        speed: 1,        // Скорость: 1
        luck: 0,         // Удача: 0
        capacity: 20,    // Вместимость
        maxHp: 100,      // Максимальное ХП
      },
      inventory: [],     // Пустой инвентарь
      chosenBranch: null,
      hasReachedY: false,
      visitedNodes: []
    };

    await playersRef.doc(slotId).set(startData);
    return { success: true, playerId: slotId };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Failed to create player" };
  }
}

// /END_ANCHOR:GAMEACTIONS/PLAYER_SLOTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMEACTIONS/STAMINA
// Управление выносливостью и здоровьем
// КОНТРАКТ: stamina >= 0, hp <= 100, hp=0 → status='DEAD'
// ═══════════════════════════════════════════════════════════════════════════════

export async function updateStamina(gameId: string, playerId: string, staminaChange: number) {
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
    const currentStamina = playerData?.stats?.stamina || 7;
    const maxStamina = playerData?.stats?.maxStamina || 7;

    const newStamina = Math.max(0, Math.min(maxStamina, currentStamina + staminaChange));

    await playerRef.update({
      'stats.stamina': newStamina,
      lastUpdated: FieldValue.serverTimestamp()
    });

    revalidatePath('/');
    return { success: true, newStamina };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Failed to update stamina' };
  }
}

export async function applyDamage(gameId: string, playerId: string, damage: number) {
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
    const currentHp = playerData?.stats?.hp || 100;
    const newHp = Math.max(0, currentHp - damage);
    const isDead = newHp <= 0;

    await playerRef.update({
      'stats.hp': newHp,
      status: isDead ? 'DEAD' : 'IDLE',
      lastUpdated: FieldValue.serverTimestamp()
    });

    revalidatePath('/');
    return { success: true, newHp, isDead };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Failed to apply damage' };
  }
}

export async function getOrCreatePlayer(gameId: string, savedPlayerId: string | null) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const playersRef = dbAdmin.collection('games').doc(gameId).collection('players');

    if (savedPlayerId) {
      const doc = await playersRef.doc(savedPlayerId).get();
      if (doc.exists) return { success: true, playerId: savedPlayerId };
    }

    return { success: false, needsSlotSelection: true };
  } catch (e) {
    console.error(e);
    return { success: false, message: "Failed to check player" };
  }
}

// /END_ANCHOR:GAMEACTIONS/STAMINA

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMEACTIONS/LOOT
// Лутинг локации
// КОНТРАКТ: Требует stamina >= 1, использует possibleLoot из MAP_NODES_DATA
// ═══════════════════════════════════════════════════════════════════════════════

export async function lootLocation(gameId: string, playerId: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured', items: [] };
  }

  try {
    const playerRef = dbAdmin.collection('games').doc(gameId).collection('players').doc(playerId);
    const playerSnap = await playerRef.get();

    if (!playerSnap.exists) {
      return { success: false, message: 'Player not found', items: [] };
    }

    const playerData = playerSnap.data();
    const currentNode = playerData?.currentNode;
    const currentStamina = playerData?.stats?.stamina || 0;
    const inventory = playerData?.inventory || [];

    if (currentStamina < 1) {
      return { success: false, message: 'Недостаточно выносливости!', items: [] };
    }

    const nodeData = MAP_NODES_DATA.find(n => n.id === currentNode);
    if (!nodeData || nodeData.possibleLoot.length === 0) {
      return { success: false, message: 'Нет лута в этой локации', items: [] };
    }

    const foundItems: string[] = [];
    for (const lootEntry of nodeData.possibleLoot) {
      const roll = Math.random() * 100;
      if (roll <= lootEntry.chance) {
        const count = Math.floor(Math.random() * (lootEntry.maxCount - lootEntry.minCount + 1)) + lootEntry.minCount;
        for (let i = 0; i < count; i++) {
          foundItems.push(lootEntry.itemId);
        }
      }
    }

    const newInventory = [...inventory, ...foundItems];
    const newStamina = currentStamina - 1;

    await playerRef.update({
      inventory: newInventory,
      'stats.stamina': newStamina,
      lastUpdated: FieldValue.serverTimestamp()
    });

    revalidatePath('/');
    return {
      success: true,
      message: foundItems.length > 0 ? `Найдено предметов: ${foundItems.length}` : 'Ничего не найдено',
      items: foundItems,
      newStamina
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Ошибка при лутинге', items: [] };
  }
}

// /END_ANCHOR:GAMEACTIONS/LOOT

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMEACTIONS/TURNS
// Одновременные ходы для всех игроков
// КОНТРАКТ: Новый ход начинается когда ВСЕ игроки имеют stamina=0
// ═══════════════════════════════════════════════════════════════════════════════

export async function checkAllPlayersExhausted(gameId: string) {
  if (!dbAdmin) {
    return { allExhausted: false, message: 'Firebase not configured' };
  }

  try {
    const playersRef = dbAdmin.collection('games').doc(gameId).collection('players');
    const playersSnap = await playersRef.get();

    if (playersSnap.empty) {
      return { allExhausted: false, message: 'No players found' };
    }

    const allExhausted = playersSnap.docs.every(doc => {
      const data = doc.data();
      if (data.status === 'DEAD') return true;
      return (data.stats?.stamina || 0) === 0;
    });

    return { allExhausted, playerCount: playersSnap.docs.length };
  } catch (e) {
    console.error(e);
    return { allExhausted: false, message: 'Error checking players' };
  }
}

export async function startNewTurnForAll(gameId: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const playersRef = dbAdmin.collection('games').doc(gameId).collection('players');
    const playersSnap = await playersRef.get();

    if (playersSnap.empty) {
      return { success: false, message: 'No players found' };
    }

    const results: { playerId: string; newStamina: number; diceRoll: number }[] = [];

    const updatePromises = playersSnap.docs.map(async (doc) => {
      const playerData = doc.data();

      if (playerData.status === 'DEAD') {
        return;
      }

      const maxStamina = playerData.stats?.maxStamina || 7;
      const diceRoll = Math.floor(Math.random() * 6) + 1;
      const staminaGain = 1 + diceRoll;
      const newStamina = Math.min(maxStamina, staminaGain);

      await doc.ref.update({
        'stats.stamina': newStamina,
        lastUpdated: FieldValue.serverTimestamp()
      });

      results.push({ playerId: doc.id, newStamina, diceRoll });
    });

    await Promise.all(updatePromises);

    revalidatePath('/');
    return {
      success: true,
      message: 'Новый ход начался для всех игроков!',
      playerResults: results
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Failed to start new turn' };
  }
}

export async function newTurn(gameId: string, playerId: string) {
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
    const maxStamina = playerData?.stats?.maxStamina || 7;

    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const staminaGain = 1 + diceRoll;
    const currentStamina = playerData?.stats?.stamina || 0;
    const newStamina = Math.min(maxStamina, currentStamina + staminaGain);

    await playerRef.update({
      'stats.stamina': newStamina,
      lastUpdated: FieldValue.serverTimestamp()
    });

    revalidatePath('/');
    return { success: true, newStamina, diceRoll };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Failed to start new turn' };
  }
}

// /END_ANCHOR:GAMEACTIONS/TURNS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMEACTIONS/RESPAWN
// [PATCH] Автоматический респавн аниматроников
// КОНТРАКТ: Создает врагов если коллекция enemies пуста
// ═══════════════════════════════════════════════════════════════════════════════

export async function respawnEnemiesIfNeeded(gameId: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const enemiesRef = dbAdmin.collection('games').doc(gameId).collection('enemies');
    const enemiesSnap = await enemiesRef.get();

    // Если враги уже есть - ничего не делаем
    if (!enemiesSnap.empty) {
      return { success: true, spawned: false, message: 'Enemies already exist' };
    }

    // Создаем врагов используя данные из ANIMATRONIC_SPAWNS (бессмертные, без HP)
    const batch = dbAdmin.batch();

    for (const animatronic of ANIMATRONIC_SPAWNS) {
      const docRef = enemiesRef.doc(animatronic.id);
      batch.set(docRef, {
        id: animatronic.id,
        type: animatronic.id,
        name: animatronic.nameRu,
        currentNode: animatronic.allowedNodes[0],
        damage: 10,
        moveChance: 50,
        aggressionLevel: 1,
        color: animatronic.color
      });
    }

    await batch.commit();

    return {
      success: true,
      spawned: true,
      message: `Spawned ${ANIMATRONIC_SPAWNS.length} enemies`
    };
  } catch (e) {
    console.error(e);
    return { success: false, message: 'Failed to respawn enemies' };
  }
}

// Вспомогательная функция для получения цвета аниматроника
function getAnimatronicColor(id: string): string {
  const colors: Record<string, string> = {
    'freddy': '🟤',
    'bonnie': '🔵',
    'chica': '🟡',
    'foxy': '🔴'
  };
  return colors[id] || '⚪';
}

// /END_ANCHOR:GAMEACTIONS/RESPAWN
