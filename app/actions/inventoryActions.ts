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
 * │   adrenaline → hp += 5, speed += 2, stamina += 3                           │
 * │   bandage    → hp += 10 (max 100)                                          │
 * │   pills      → hp += 5 (max 100)                                           │
 * │   food       → stamina += 2                                                │
 * │   soda       → stamina += 1                                                │
 * │   pizza      → stamina += 1                                                │
 * │   cupcake    → stamina += 1                                                │
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
  "adrenaline": (stats) => ({ ...stats, hp: Math.min(stats.hp + 5, 100), speed: (stats.speed || 0) + 2, stamina: Math.min((stats.stamina || 0) + 3, stats.maxStamina || 7) }),
  "bandage": (stats) => ({ ...stats, hp: Math.min(stats.hp + 10, 100) }),
  "pills": (stats) => ({ ...stats, hp: Math.min(stats.hp + 5, 100) }),
  "food": (stats) => ({ ...stats, stamina: Math.min((stats.stamina || 0) + 2, stats.maxStamina || 7) }),
  "soda": (stats) => ({ ...stats, stamina: Math.min((stats.stamina || 0) + 1, stats.maxStamina || 7) }),
  "pizza": (stats) => ({ ...stats, stamina: Math.min((stats.stamina || 0) + 1, stats.maxStamina || 7) }),
  "cupcake": (stats) => ({ ...stats, stamina: Math.min((stats.stamina || 0) + 1, stats.maxStamina || 7) }),
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

    const newStats = effectFn(data?.stats || { hp: 100, stamina: 7, maxStamina: 7, speed: 1 });

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
