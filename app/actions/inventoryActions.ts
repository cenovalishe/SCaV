'use server'

import { dbAdmin } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// Конфигурация эффектов предметов
const ITEM_EFFECTS: Record<string, (stats: any) => any> = {
  "medkit": (stats) => ({ ...stats, hp: Math.min(stats.hp + 30, 100) }),
  "sedative": (stats) => ({ ...stats, san: Math.min(stats.san + 25, 100) }),
  "adrenaline": (stats) => ({ ...stats, hp: stats.hp + 5, san: stats.san - 10 }),
  "bandage": (stats) => ({ ...stats, hp: Math.min(stats.hp + 10, 100) }),
  "pills": (stats) => ({ ...stats, hp: Math.min(stats.hp + 5, 100) }),
  "food": (stats) => ({ ...stats, hp: Math.min(stats.hp + 5, 100) }),
  "soda": (stats) => ({ ...stats, hp: Math.min(stats.hp + 3, 100) }),
};

export async function useItem(gameId: string, playerId: string, itemKey: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const playerRef = dbAdmin.collection('games').doc(gameId).collection('players').doc(playerId);
    const playerSnap = await playerRef.get();

    if (!playerSnap.exists) throw new Error("Player not found");

    const data = playerSnap.data();
    const inventory = data?.inventory || [];

    // Проверка наличия предмета
    if (!inventory.includes(itemKey)) {
      return { success: false, message: "You don't have this item!" };
    }

    // Применяем эффект
    const effectFn = ITEM_EFFECTS[itemKey];
    if (!effectFn) return { success: false, message: "This item cannot be used directly." };

    const newStats = effectFn(data?.stats || { hp: 100, san: 100 });

    // Атомарное обновление
    await playerRef.update({
      stats: newStats,
      inventory: FieldValue.arrayRemove(itemKey)
    });

    revalidatePath('/');
    return { success: true, message: `Used ${itemKey}`, newStats };

  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to use item" };
  }
}
