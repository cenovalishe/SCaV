'use server'

import { dbAdmin } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export async function resolveCombatRound(
  gameId: string, 
  playerId: string, 
  enemyId: string, 
  isSuccess: boolean
) {
  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const playerRef = gameRef.collection('players').doc(playerId);
    const enemyRef = gameRef.collection('enemies').doc(enemyId);

    // Транзакция, чтобы данные не разошлись, если бьют двое
    await dbAdmin.runTransaction(async (t) => {
      const pDoc = await t.get(playerRef);
      const eDoc = await t.get(enemyRef);

      if (!eDoc.exists || !pDoc.exists) return; // Враг уже мертв или глюк

      const pData = pDoc.data();
      const eData = eDoc.data();

      if (isSuccess) {
        // --- ИГРОК ПОПАЛ ---
        const newEnemyHp = (eData?.hp || 0) - 25; // Урон игрока
        
        if (newEnemyHp <= 0) {
          // Враг убит
          t.delete(enemyRef); 
          // Снимаем статус боя с игрока
          t.update(playerRef, { status: 'IDLE' });
        } else {
          // Враг ранен
          t.update(enemyRef, { hp: newEnemyHp });
        }
      } else {
        // --- ИГРОК ПРОМАЗАЛ ---
        // Враг контратакует
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