/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: app/actions/combatActions.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Server Actions для боевой системы - разрешение раундов боя
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ SERVER ACTIONS:                                                             │
 * │   resolveCombatRound(gameId, playerId, enemyId, isSuccess)                 │
 * │     → { success, message? }                                                │
 * │     Атомарно обрабатывает результат боевого раунда                         │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   @/lib/firebaseAdmin → dbAdmin (серверный Firestore)                      │
 * │   next/cache          → revalidatePath                                     │
 * │                                                                             │
 * │ IMPORTED BY:                                                                │
 * │   components/CombatEncounter.tsx → при завершении QTE                      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ COMBAT MECHANICS                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │ TRANSACTION (атомарная операция):                                          │
 * │                                                                             │
 * │   IF isSuccess (игрок попал):                                              │
 * │     enemy.hp -= 25                                                         │
 * │     IF enemy.hp <= 0:                                                      │
 * │       DELETE enemy                                                         │
 * │       player.status = 'IDLE'                                               │
 * │     ELSE:                                                                  │
 * │       UPDATE enemy.hp                                                      │
 * │                                                                             │
 * │   IF !isSuccess (игрок промазал):                                          │
 * │     player.stats.hp -= 15 (контратака врага)                               │
 * │     IF player.stats.hp <= 0:                                               │
 * │       player.status = 'DEAD'                                               │
 * │                                                                             │
 * │ DAMAGE VALUES:                                                              │
 * │   Player → Enemy: 25 HP                                                    │
 * │   Enemy → Player: 15 HP                                                    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use server'

import { dbAdmin } from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';

export async function resolveCombatRound(
  gameId: string,
  playerId: string,
  enemyId: string,
  isSuccess: boolean
) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const playerRef = gameRef.collection('players').doc(playerId);
    const enemyRef = gameRef.collection('enemies').doc(enemyId);

    // Транзакция для атомарности
    await dbAdmin.runTransaction(async (t) => {
      const pDoc = await t.get(playerRef);
      const eDoc = await t.get(enemyRef);

      if (!eDoc.exists || !pDoc.exists) return;

      const pData = pDoc.data();
      const eData = eDoc.data();

      if (isSuccess) {
        // Игрок попал
        const newEnemyHp = (eData?.hp || 0) - 25;

        if (newEnemyHp <= 0) {
          // Враг убит
          t.delete(enemyRef);
          t.update(playerRef, { status: 'IDLE' });
        } else {
          // Враг ранен
          t.update(enemyRef, { hp: newEnemyHp });
        }
      } else {
        // Игрок промазал - враг контратакует
        const damage = 15;
        const newHp = (pData?.stats.hp || 0) - damage;

        if (newHp <= 0) {
          t.update(playerRef, {
            'stats.hp': 0,
            status: 'DEAD'
          });
        } else {
          t.update(playerRef, {
            'stats.hp': newHp
          });
        }
      }
    });

    revalidatePath('/');
    return { success: true };

  } catch (error) {
    console.error(error);
    return { success: false, message: "Combat error" };
  }
}
