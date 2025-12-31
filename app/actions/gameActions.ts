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
import { MAP_NODES_DATA } from '@/lib/mapData';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

// /END_ANCHOR:GAMEACTIONS/IMPORTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMEACTIONS/TYPES
// Типы ответов server actions
// КОНТРАКТ: success=true означает успешное выполнение операции
// ═══════════════════════════════════════════════════════════════════════════════

type MoveResponse = {
  success: boolean;
  message: string;
  event?: string;
  loot?: string;
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

    // Проверка взаимоисключающих путей X-1 и X-2
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

    let status = "IDLE";

    await playerRef.update({
      currentNode: targetNodeId,
      status: status,
      chosenBranch: newChosenBranch,
      hasReachedY: hasReachedY,
      visitedNodes: updatedVisitedNodes,
      lastUpdated: FieldValue.serverTimestamp()
    });

    // AI движение аниматроников
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const enemiesRef = gameRef.collection('enemies');
    const enemiesSnap = await enemiesRef.get();

    const enemyMoves = enemiesSnap.docs.map(async (enemyDoc) => {
      const enemyData = enemyDoc.data();
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
        stealth: 3,
      },
      inventory: ["flashlight"],
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
