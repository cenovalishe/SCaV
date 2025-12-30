/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: app/actions/inventoryActions.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Server Actions для системы инвентаря - использование предметов
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ SERVER ACTIONS:                                                             │
 * │   useItem(gameId, playerId, itemKey)                                       │
 * │     → { success, message, newStats? }                                      │
 * │     Применяет эффект предмета и удаляет его из инвентаря                   │
 * │                                                                             │
 * │ CONSTANTS:                                                                  │
 * │   ITEM_EFFECTS         - Record<string, (stats) => stats>                  │
 * │                          Функции эффектов для каждого типа предмета        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   @/lib/firebaseAdmin      → dbAdmin (серверный Firestore)                 │
 * │   firebase-admin/firestore → FieldValue.arrayRemove                        │
 * │   next/cache               → revalidatePath                                │
 * │                                                                             │
 * │ IMPORTED BY:                                                                │
 * │   components/InventoryTab.tsx → при клике на использование предмета        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ITEM EFFECTS                                                                │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │   medkit     → hp += 30 (max 100)                                          │
 * │   sedative   → san += 25 (max 100)                                         │
 * │   adrenaline → hp += 5, san -= 10                                          │
 * │   bandage    → hp += 10 (max 100)                                          │
 * │   pills      → hp += 5 (max 100)                                           │
 * │   food       → hp += 5 (max 100)                                           │
 * │   soda       → hp += 3 (max 100)                                           │
 * │                                                                             │
 * │ FLOW:                                                                       │
 * │   1. Проверить наличие предмета в inventory[]                              │
 * │   2. Получить функцию эффекта из ITEM_EFFECTS                              │
 * │   3. Применить эффект к stats                                              │
 * │   4. Атомарно: обновить stats + удалить предмет                            │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

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
