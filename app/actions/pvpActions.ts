/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: app/actions/pvpActions.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Server Actions для PvP системы - бой между игроками
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ SERVER ACTIONS:                                                             │
 * │   initiatePvP(gameId, initiatorId, targetId)                               │
 * │     → { success, pvpState?, message? }                                     │
 * │     Инициирует PvP встречу с бросками на инициативу                        │
 * │                                                                             │
 * │   respondToPvP(gameId, targetId, accept)                                   │
 * │     → { success, message? }                                                │
 * │     Принять или отклонить PvP                                              │
 * │                                                                             │
 * │   resolvePvPRound(gameId, attackerId, defenderId)                          │
 * │     → { success, damage, combatLog, message? }                             │
 * │     Разрешение раунда PvP боя                                              │
 * │                                                                             │
 * │   completePvP(gameId, winnerId, loserId)                                   │
 * │     → { success, lootedItems?, message? }                                  │
 * │     Завершение PvP с передачей предметов                                   │
 * │                                                                             │
 * │   handlePvPRetreat(gameId, playerId)                                       │
 * │     → { success, newNode?, message? }                                      │
 * │     Отступление после 3 раундов без победителя                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use server'

import { dbAdmin } from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';
import { PvPEncounterState, PlayerState, GameLogEntry } from '@/lib/types';
import {
  rollInitiative,
  calculatePvPDamage,
  calculateLootAmount,
  PVP_MAX_ROUNDS
} from '@/lib/pvpConfig';
import { MAP_NODES_DATA } from '@/lib/mapData';

/**
 * Инициировать PvP встречу
 */
export async function initiatePvP(
  gameId: string,
  initiatorId: string,
  targetId: string
) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const initiatorRef = gameRef.collection('players').doc(initiatorId);
    const targetRef = gameRef.collection('players').doc(targetId);

    // Транзакция для атомарности
    const result = await dbAdmin.runTransaction(async (t) => {
      const initiatorDoc = await t.get(initiatorRef);
      const targetDoc = await t.get(targetRef);

      if (!initiatorDoc.exists || !targetDoc.exists) {
        throw new Error('Player not found');
      }

      const initiator = initiatorDoc.data() as PlayerState;
      const target = targetDoc.data() as PlayerState;

      // Проверка, что оба игрока на одной точке
      if (initiator.currentNode !== target.currentNode) {
        throw new Error('Players not on same node');
      }

      // Бросок инициативы
      const initiatorInitiative = rollInitiative();
      const targetInitiative = rollInitiative();

      // Определяем, кто атакует первым
      const firstAttacker = initiatorInitiative >= targetInitiative ? initiatorId : targetId;

      const pvpState: PvPEncounterState = {
        initiatorId,
        targetId,
        initiatorInitiative,
        targetInitiative,
        currentRound: 1,
        maxRounds: PVP_MAX_ROUNDS,
        attackerId: firstAttacker,
        defenderId: firstAttacker === initiatorId ? targetId : initiatorId,
        initiatorHp: initiator.stats.hp,
        targetHp: target.stats.hp,
        combatLog: [
          `${initiator.name} бросил на инициативу: ${initiatorInitiative}`,
          `${target.name} бросил на инициативу: ${targetInitiative}`,
          `${firstAttacker === initiatorId ? initiator.name : target.name} получает право первой атаки!`
        ],
        status: 'pending'
      };

      // Обновляем состояние инициатора
      t.update(initiatorRef, {
        status: 'IN_PVP',
        pvpOpponentId: targetId,
        pvpState: pvpState,
        'gameLog': [
          ...(initiator.gameLog || []),
          {
            timestamp: Date.now(),
            message: `Вы инициировали PvP с ${target.name}. Ваша инициатива: ${initiatorInitiative}`,
            type: 'pvp'
          } as GameLogEntry
        ]
      });

      // Обновляем состояние цели (уведомление о PvP)
      t.update(targetRef, {
        pvpOpponentId: initiatorId,
        pvpState: pvpState,
        'gameLog': [
          ...(target.gameLog || []),
          {
            timestamp: Date.now(),
            message: `${initiator.name} инициировал PvP! Ваша инициатива: ${targetInitiative}. Принять бой или разойтись мирно?`,
            type: 'pvp'
          } as GameLogEntry
        ]
      });

      return { success: true, pvpState };
    });

    revalidatePath('/');
    return result;

  } catch (error) {
    console.error('PvP initiation error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Ответить на предложение PvP
 */
export async function respondToPvP(
  gameId: string,
  targetId: string,
  accept: boolean
) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const targetRef = gameRef.collection('players').doc(targetId);

    await dbAdmin.runTransaction(async (t) => {
      const targetDoc = await t.get(targetRef);
      if (!targetDoc.exists) throw new Error('Player not found');

      const target = targetDoc.data() as PlayerState;
      const initiatorRef = gameRef.collection('players').doc(target.pvpOpponentId!);
      const initiatorDoc = await t.get(initiatorRef);

      if (!initiatorDoc.exists) throw new Error('Initiator not found');
      const initiator = initiatorDoc.data() as PlayerState;

      if (accept) {
        // Принять бой - обновляем статус на IN_PVP
        const updatedPvpState: PvPEncounterState = {
          ...target.pvpState!,
          status: 'in_progress'
        };

        t.update(targetRef, {
          status: 'IN_PVP',
          pvpState: updatedPvpState,
          'gameLog': [
            ...(target.gameLog || []),
            {
              timestamp: Date.now(),
              message: `Вы приняли вызов на PvP!`,
              type: 'pvp'
            } as GameLogEntry
          ]
        });

        t.update(initiatorRef, {
          pvpState: updatedPvpState,
          'gameLog': [
            ...(initiator.gameLog || []),
            {
              timestamp: Date.now(),
              message: `${target.name} принял вызов! Бой начинается!`,
              type: 'pvp'
            } as GameLogEntry
          ]
        });
      } else {
        // Отклонить - разойтись мирно
        t.update(targetRef, {
          pvpOpponentId: null,
          pvpState: null,
          'gameLog': [
            ...(target.gameLog || []),
            {
              timestamp: Date.now(),
              message: `Вы отклонили PvP. Игроки разошлись мирно.`,
              type: 'pvp'
            } as GameLogEntry
          ]
        });

        t.update(initiatorRef, {
          status: 'IDLE',
          pvpOpponentId: null,
          pvpState: null,
          'gameLog': [
            ...(initiator.gameLog || []),
            {
              timestamp: Date.now(),
              message: `${target.name} отклонил PvP. Вы разошлись мирно.`,
              type: 'pvp'
            } as GameLogEntry
          ]
        });
      }
    });

    revalidatePath('/');
    return { success: true };

  } catch (error) {
    console.error('PvP response error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Разрешить раунд PvP боя
 */
export async function resolvePvPRound(
  gameId: string,
  attackerId: string,
  defenderId: string
) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const attackerRef = gameRef.collection('players').doc(attackerId);
    const defenderRef = gameRef.collection('players').doc(defenderId);

    const result = await dbAdmin.runTransaction(async (t) => {
      const attackerDoc = await t.get(attackerRef);
      const defenderDoc = await t.get(defenderRef);

      if (!attackerDoc.exists || !defenderDoc.exists) {
        throw new Error('Player not found');
      }

      const attacker = attackerDoc.data() as PlayerState;
      const defender = defenderDoc.data() as PlayerState;

      // Расчет урона
      const damage = calculatePvPDamage(attacker.stats.attack, defender.stats.defense);
      const newDefenderHp = Math.max(0, defender.stats.hp - damage);

      // Обновляем лог боя
      const combatLog = [
        ...(attacker.pvpState?.combatLog || []),
        `Раунд ${attacker.pvpState?.currentRound}: ${attacker.name} атакует ${defender.name}`,
        damage > 0
          ? `${attacker.name} наносит ${damage} урона! (Атака: ${attacker.stats.attack} > Защита: ${defender.stats.defense})`
          : `${defender.name} блокирует атаку! (Защита: ${defender.stats.defense} >= Атака: ${attacker.stats.attack})`
      ];

      // ★ Проверка на победу - HP не уходит в 0, а сбрасывается до 10
      if (newDefenderHp <= 0) {
        combatLog.push(`${defender.name} повержен! ${attacker.name} побеждает!`);

        const completedPvpState: PvPEncounterState = {
          ...attacker.pvpState!,
          combatLog,
          status: 'completed',
          outcome: attacker.id === attacker.pvpState!.initiatorId ? 'initiator_win' : 'target_win'
        };

        // ★ HP сбрасывается до 10, статус НЕ DEAD
        t.update(defenderRef, {
          'stats.hp': 10,
          pvpState: completedPvpState
        });

        t.update(attackerRef, {
          pvpState: completedPvpState
        });

        return { success: true, damage, combatLog, victory: true, winnerId: attackerId, loserId: defenderId };
      }

      // Проверка на окончание 3 раундов
      const isLastRound = attacker.pvpState!.currentRound >= PVP_MAX_ROUNDS;

      if (isLastRound) {
        // Последний раунд - отступает игрок с меньшим HP
        const attackerHpAfter = attacker.id === attacker.pvpState!.initiatorId
          ? attacker.pvpState!.initiatorHp
          : attacker.pvpState!.targetHp;

        const defenderHpAfter = newDefenderHp;

        const retreatingPlayer = defenderHpAfter < attackerHpAfter ? defender : attacker;
        const retreatingPlayerId = retreatingPlayer.id;

        combatLog.push(`Бой длился 3 раунда. ${retreatingPlayer.name} отступает с меньшим HP.`);

        const completedPvpState: PvPEncounterState = {
          ...attacker.pvpState!,
          combatLog,
          status: 'completed',
          outcome: 'retreat'
        };

        t.update(defenderRef, {
          'stats.hp': newDefenderHp,
          pvpState: completedPvpState
        });

        t.update(attackerRef, {
          pvpState: completedPvpState
        });

        return {
          success: true,
          damage,
          combatLog,
          retreat: true,
          retreatingPlayerId
        };
      }

      // Продолжаем бой - меняем атакующего и защищающегося
      const updatedPvpState: PvPEncounterState = {
        ...attacker.pvpState!,
        currentRound: attacker.pvpState!.currentRound + 1,
        attackerId: defenderId,
        defenderId: attackerId,
        combatLog,
        // Обновляем HP в состоянии
        initiatorHp: attacker.id === attacker.pvpState!.initiatorId ? attacker.stats.hp : newDefenderHp,
        targetHp: attacker.id === attacker.pvpState!.targetId ? attacker.stats.hp : newDefenderHp
      };

      t.update(defenderRef, {
        'stats.hp': newDefenderHp,
        pvpState: updatedPvpState
      });

      t.update(attackerRef, {
        pvpState: updatedPvpState
      });

      return { success: true, damage, combatLog };
    });

    revalidatePath('/');
    return result;

  } catch (error) {
    console.error('PvP round error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Завершить PvP с передачей предметов
 */
export async function completePvP(
  gameId: string,
  winnerId: string,
  loserId: string,
  selectedItem?: string // Выбранный победителем предмет из снаряжения/инвентаря
) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const winnerRef = gameRef.collection('players').doc(winnerId);
    const loserRef = gameRef.collection('players').doc(loserId);

    const result = await dbAdmin.runTransaction(async (t) => {
      const winnerDoc = await t.get(winnerRef);
      const loserDoc = await t.get(loserRef);

      if (!winnerDoc.exists || !loserDoc.exists) {
        throw new Error('Player not found');
      }

      const winner = winnerDoc.data() as PlayerState;
      const loser = loserDoc.data() as PlayerState;

      const lootedItems: string[] = [];

      // 1. Передача выбранного предмета (если указан)
      if (selectedItem) {
        lootedItems.push(selectedItem);
        // TODO: Здесь нужно удалить предмет из снаряжения/инвентаря проигравшего
        // и добавить в инвентарь победителя
      }

      // 2. Передача 1/3 случайных предметов из инвентаря
      const loserInventory = loser.inventory.filter(item => item !== null && item !== '');
      const lootAmount = calculateLootAmount(loserInventory.length);

      // Перемешиваем и берем случайные предметы
      const shuffled = [...loserInventory].sort(() => Math.random() - 0.5);
      const randomLoot = shuffled.slice(0, lootAmount);
      lootedItems.push(...randomLoot);

      // Обновляем инвентарь проигравшего (удаляем переданные предметы)
      const newLoserInventory = loser.inventory.filter(item => !randomLoot.includes(item));

      // Добавляем предметы в инвентарь победителя
      const newWinnerInventory = [...winner.inventory, ...lootedItems];

      // ★ Обновляем состояния игроков - проигравший НЕ становится DEAD
      t.update(loserRef, {
        inventory: newLoserInventory,
        status: 'IDLE',
        pvpOpponentId: null,
        pvpState: null,
        'gameLog': [
          ...(loser.gameLog || []),
          {
            timestamp: Date.now(),
            message: `Вы проиграли PvP. ${winner.name} забрал: ${lootedItems.join(', ')}`,
            type: 'pvp'
          } as GameLogEntry
        ]
      });

      t.update(winnerRef, {
        inventory: newWinnerInventory,
        status: 'IDLE',
        pvpOpponentId: null,
        pvpState: null,
        'gameLog': [
          ...(winner.gameLog || []),
          {
            timestamp: Date.now(),
            message: `Вы победили в PvP! Получено: ${lootedItems.join(', ')}`,
            type: 'pvp'
          } as GameLogEntry
        ]
      });

      return { success: true, lootedItems };
    });

    revalidatePath('/');
    return result;

  } catch (error) {
    console.error('PvP completion error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Обработать отступление после 3 раундов
 */
export async function handlePvPRetreat(
  gameId: string,
  retreatingPlayerId: string
) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const playerRef = gameRef.collection('players').doc(retreatingPlayerId);

    const result = await dbAdmin.runTransaction(async (t) => {
      const playerDoc = await t.get(playerRef);
      if (!playerDoc.exists) throw new Error('Player not found');

      const player = playerDoc.data() as PlayerState;

      // Получаем соседние узлы текущего узла
      const currentNodeData = MAP_NODES_DATA.find(n => n.id === player.currentNode);
      if (!currentNodeData || !currentNodeData.neighbors || currentNodeData.neighbors.length === 0) {
        throw new Error('No valid neighbors for retreat');
      }

      // Выбираем случайный соседний узел
      const randomNeighbor = currentNodeData.neighbors[
        Math.floor(Math.random() * currentNodeData.neighbors.length)
      ];

      // Перемещаем игрока
      t.update(playerRef, {
        currentNode: randomNeighbor,
        status: 'IDLE',
        pvpOpponentId: null,
        pvpState: null,
        'gameLog': [
          ...(player.gameLog || []),
          {
            timestamp: Date.now(),
            message: `Вы отступили в ${randomNeighbor} после 3 раундов PvP`,
            type: 'pvp'
          } as GameLogEntry
        ]
      });

      // Также очищаем состояние противника
      if (player.pvpOpponentId) {
        const opponentRef = gameRef.collection('players').doc(player.pvpOpponentId);
        const opponentDoc = await t.get(opponentRef);

        if (opponentDoc.exists) {
          const opponent = opponentDoc.data() as PlayerState;
          t.update(opponentRef, {
            status: 'IDLE',
            pvpOpponentId: null,
            pvpState: null,
            'gameLog': [
              ...(opponent.gameLog || []),
              {
                timestamp: Date.now(),
                message: `${player.name} отступил после 3 раундов PvP`,
                type: 'pvp'
              } as GameLogEntry
            ]
          });
        }
      }

      return { success: true, newNode: randomNeighbor };
    });

    revalidatePath('/');
    return result;

  } catch (error) {
    console.error('PvP retreat error:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
