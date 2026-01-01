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
  pvpEncounter?: {
    hasEncounter: boolean;
    otherPlayers: Array<{ id: string; name: string }>;
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
  targetNodeId: string,
  equipment?: any // Экипировка игрока для проверки спец-слотов
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

    // ═══════════════════════════════════════════════════════════════════════════════
    // FIX: Блокировка повторного входа в S/F без ключ-карты в спец-слоте
    // После выхода из SF игрок не может вернуться без key_card в спец-слоте
    // ═══════════════════════════════════════════════════════════════════════════════
    if (targetNodeId === 'SF') {
      const hasLeftSF = playerData?.hasLeftSF || false;

      if (hasLeftSF) {
        // Проверяем наличие key_card в спец-слоте
        const playerEquipment = equipment || playerData?.equipment;
        const specials = playerEquipment?.specials || [];
        const hasKeyCard = specials.some((item: string | null) => item === 'key_card');

        if (!hasKeyCard) {
          return {
            success: false,
            message: "🔒 Вход заблокирован! Для возврата на Старт/Финиш требуется ключ-карта в спец-слоте снаряжения."
          };
        }
      }
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

    // FIX: Отслеживаем выход из SF (для блокировки повторного входа)
    const hasLeftSF = playerData?.hasLeftSF || currentNodeId === 'SF';

    // 1. Сначала перемещаем игрока и сбрасываем боевые статусы
    await playerRef.update({
      currentNode: targetNodeId,
      status: "IDLE", // Сбрасываем статус, проверка боя будет позже
      currentEnemyId: null, // Сбрасываем текущего врага
      chosenBranch: newChosenBranch,
      hasReachedY: hasReachedY,
      hasLeftSF: hasLeftSF, // FIX: Флаг выхода из SF
      visitedNodes: updatedVisitedNodes,
      lastUpdated: FieldValue.serverTimestamp()
    });

    // 2. Двигаем аниматроников (AI Movement) с FNAF1-style AI level
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const enemiesRef = gameRef.collection('enemies');
    const enemiesSnap = await enemiesRef.get();

    const enemyMoves = enemiesSnap.docs.map(async (enemyDoc) => {
      const enemyData = enemyDoc.data();
      const enemyId = enemyDoc.id as AnimatronicType;

      // Получаем данные аниматроника
      const animatronicData = ANIMATRONIC_SPAWNS.find(a => a.id === enemyId);
      if (!animatronicData) return Promise.resolve();

      // FNAF1-style AI: random(1-20), если меньше aiLevel - двигаемся
      // aiLevel от 0 (никогда не двигается) до 20 (всегда двигается)
      const aiLevel = enemyData.aiLevel ?? animatronicData.aiLevel ?? 10;
      const aiRoll = Math.floor(Math.random() * 20) + 1; // 1-20

      if (aiRoll <= aiLevel) {
        const enemyNode = MAP_NODES_DATA.find(n => n.id === enemyData.currentNode);
        if (enemyNode && enemyNode.neighbors.length > 0) {
          const allowedNodes = animatronicData.allowedNodes || [];

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

    // 4. ПРОВЕРКА PVP: Проверяем наличие других игроков на той же ноде
    const { isPvpZone } = await import('@/lib/pvpConfig');
    let otherPlayersInNode: any[] = [];

    if (isPvpZone(targetNodeId)) {
      const playersRef = gameRef.collection('players');
      const playersSnap = await playersRef.get();

      otherPlayersInNode = playersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p =>
          p.id !== playerId && // Не текущий игрок
          p.currentNode === targetNodeId && // На той же ноде
          p.status !== 'DEAD' // Живой
        );
    }

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
    } else if (otherPlayersInNode.length > 0) {
      // PvP встреча имеет приоритет после боя с аниматрониками
      message = `Встречен игрок ${otherPlayersInNode[0].name} в PvP зоне!`;
    }

    revalidatePath('/');
    return {
      success: true,
      message: message,
      event: finalStatus === "IN_COMBAT" ? "ENEMY_ENCOUNTER" : (otherPlayersInNode.length > 0 ? "PVP_ENCOUNTER" : "CLEAR"),
      collision: enemiesInNode.length > 0 ? {
        hasCollision: true,
        enemyId: enemyId,
        enemyType: enemiesInNode[0]?.type || enemiesInNode[0]?.id
      } : undefined,
      pvpEncounter: otherPlayersInNode.length > 0 ? {
        hasEncounter: true,
        otherPlayers: otherPlayersInNode.map(p => ({ id: p.id, name: p.name }))
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
      hasLeftSF: false,  // FIX: Изначально игрок не покидал SF
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
    const equipment = playerData?.equipment || {
      pockets: [null, null, null, null],
      specials: [null, null, null],
      rig: null,
      bag: null,
      backpack: null
    };

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

    // Если ничего не найдено - просто тратим выносливость
    if (foundItems.length === 0) {
      await playerRef.update({
        'stats.stamina': currentStamina - 1,
        lastUpdated: FieldValue.serverTimestamp()
      });
      revalidatePath('/');
      return { success: true, message: 'Ничего не найдено', items: [], newStamina: currentStamina - 1 };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // ПРИОРИТЕТ РАЗМЕЩЕНИЯ ЛУТА:
    // 1. Карманы (4 слота) - по умолчанию
    // 2. Разгрузка (если есть)
    // 3. Сумка (если есть)
    // 4. Рюкзак (если есть)
    // ═══════════════════════════════════════════════════════════════════════════════

    const placedItems: string[] = [];
    const droppedItems: string[] = [];

    // Копируем экипировку для модификации
    const newEquipment = JSON.parse(JSON.stringify(equipment));

    // Инициализируем карманы если их нет
    if (!newEquipment.pockets) {
      newEquipment.pockets = [null, null, null, null];
    }

    for (const itemId of foundItems) {
      let placed = false;

      // 1. Пытаемся положить в карманы (приоритет)
      for (let i = 0; i < newEquipment.pockets.length; i++) {
        if (newEquipment.pockets[i] === null) {
          newEquipment.pockets[i] = itemId;
          placedItems.push(itemId);
          placed = true;
          break;
        }
      }

      // 2. Если карманы полные - пробуем разгрузку
      if (!placed && newEquipment.rig?.items) {
        for (let i = 0; i < newEquipment.rig.items.length; i++) {
          if (newEquipment.rig.items[i] === null) {
            newEquipment.rig.items[i] = itemId;
            placedItems.push(itemId);
            placed = true;
            break;
          }
        }
      }

      // 3. Если разгрузка полная - пробуем сумку
      if (!placed && newEquipment.bag?.items) {
        for (let i = 0; i < newEquipment.bag.items.length; i++) {
          if (newEquipment.bag.items[i] === null) {
            newEquipment.bag.items[i] = itemId;
            placedItems.push(itemId);
            placed = true;
            break;
          }
        }
      }

      // 4. Если сумка полная - пробуем рюкзак
      if (!placed && newEquipment.backpack?.items) {
        for (let i = 0; i < newEquipment.backpack.items.length; i++) {
          if (newEquipment.backpack.items[i] === null) {
            newEquipment.backpack.items[i] = itemId;
            placedItems.push(itemId);
            placed = true;
            break;
          }
        }
      }

      // 5. Если всё полное - предмет выпадает на землю (теряется)
      if (!placed) {
        droppedItems.push(itemId);
      }
    }

    const newStamina = currentStamina - 1;

    await playerRef.update({
      equipment: newEquipment,
      'stats.stamina': newStamina,
      lastUpdated: FieldValue.serverTimestamp()
    });

    revalidatePath('/');

    // Формируем сообщение о результате
    let message = `Найдено: ${foundItems.length}`;
    if (placedItems.length > 0) {
      message += `, подобрано: ${placedItems.length}`;
    }
    if (droppedItems.length > 0) {
      message += `, не поместилось: ${droppedItems.length}`;
    }

    return {
      success: true,
      message,
      items: placedItems,
      droppedItems,
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
        moveChance: 50,            // Устаревшее
        aggressionLevel: 1,
        aiLevel: animatronic.aiLevel, // FNAF1-style AI level
        difficulty: animatronic.difficulty, // Сложность уклонения
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
