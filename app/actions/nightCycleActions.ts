/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: app/actions/nightCycleActions.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Server Actions для глобального цикла ночей
 *          Управляет таймером, синхронизацией и обновлением AI аниматроников
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORTS:
 *   initializeNightCycle(gameId)        - Инициализировать цикл (создать документ)
 *   startNightCycle(gameId)             - Запустить глобальный таймер
 *   syncNightCycle(gameId)              - Синхронизировать состояние с сервером
 *   updateAnimatronicAILevels(gameId)   - Обновить AI уровни всех аниматроников
 *   getNightCycleState(gameId)          - Получить текущее состояние цикла
 *   resetNightCycle(gameId)             - Сбросить цикл в начальное состояние
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2026-01-01 | VERSION: 1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use server';

import { dbAdmin } from '@/lib/firebaseAdmin';
import { GlobalNightCycle } from '@/lib/types';
import {
  INITIAL_NIGHT_CYCLE,
  NIGHT_CYCLE_TIMINGS,
  calculateNightAndHour,
  getAnimatronicAILevel,
  getAllAnimatronicAILevels,
  TOTAL_NIGHTS,
  LAST_HOUR,
} from '@/lib/nightCycleConfig';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

// ═══════════════════════════════════════════════════════════════════════════════
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Получить ссылку на документ глобального цикла
 */
function getNightCycleRef(gameId: string) {
  if (!dbAdmin) return null;
  return dbAdmin.collection('games').doc(gameId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ИНИЦИАЛИЗАЦИЯ ЦИКЛА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Инициализировать глобальный цикл ночей для игры
 * Создаёт документ с начальными значениями если его нет
 */
export async function initializeNightCycle(gameId: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = getNightCycleRef(gameId);
    if (!gameRef) {
      return { success: false, message: 'Failed to get game reference' };
    }

    const gameDoc = await gameRef.get();
    const gameData = gameDoc.data();

    // Проверяем, есть ли уже глобальный цикл
    if (gameData?.globalNightCycle) {
      return {
        success: true,
        message: 'Night cycle already initialized',
        cycle: gameData.globalNightCycle as GlobalNightCycle,
      };
    }

    // Создаём начальное состояние цикла
    await gameRef.set(
      {
        globalNightCycle: INITIAL_NIGHT_CYCLE,
        lastUpdated: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    revalidatePath('/');
    return {
      success: true,
      message: 'Night cycle initialized',
      cycle: INITIAL_NIGHT_CYCLE,
    };
  } catch (error) {
    console.error('Error initializing night cycle:', error);
    return { success: false, message: 'Failed to initialize night cycle' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ЗАПУСК ЦИКЛА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Запустить глобальный таймер цикла ночей
 * Переключает isActive с 0 на 1 и запускает отсчёт
 */
export async function startNightCycle(gameId: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = getNightCycleRef(gameId);
    if (!gameRef) {
      return { success: false, message: 'Failed to get game reference' };
    }

    const now = Date.now();
    const timerEndAt = now + NIGHT_CYCLE_TIMINGS.totalDurationMs;

    const newCycle: GlobalNightCycle = {
      isActive: true,
      startedAt: now,
      currentNight: 1,
      currentHour: 1,
      timerEndAt: timerEndAt,
      lastHourUpdateAt: now,
      lastNightUpdateAt: now,
    };

    await gameRef.update({
      globalNightCycle: newCycle,
      lastUpdated: FieldValue.serverTimestamp(),
    });

    // Обновляем AI уровни аниматроников для начала игры
    await updateAnimatronicAILevels(gameId, 1, 1);

    revalidatePath('/');
    return {
      success: true,
      message: 'Night cycle started',
      cycle: newCycle,
    };
  } catch (error) {
    console.error('Error starting night cycle:', error);
    return { success: false, message: 'Failed to start night cycle' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// СИНХРОНИЗАЦИЯ ЦИКЛА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Синхронизировать состояние цикла с реальным временем
 * Вычисляет текущую ночь и час на основе прошедшего времени
 * Должна вызываться периодически клиентами
 * ★ ВАЖНО: Если isActive=true но startedAt=null, автоматически инициализирует startedAt
 */
export async function syncNightCycle(gameId: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = getNightCycleRef(gameId);
    if (!gameRef) {
      return { success: false, message: 'Failed to get game reference' };
    }

    const gameDoc = await gameRef.get();
    const gameData = gameDoc.data();
    const cycle = gameData?.globalNightCycle as GlobalNightCycle | undefined;

    if (!cycle) {
      return {
        success: true,
        message: 'Cycle not initialized',
        cycle: INITIAL_NIGHT_CYCLE,
        needsUpdate: false,
      };
    }

    // ★ FIX: Если isActive=true но startedAt=null - это ручное переключение в Firebase
    // Автоматически инициализируем startedAt
    if (cycle.isActive && !cycle.startedAt) {
      const now = Date.now();
      const timerEndAt = now + NIGHT_CYCLE_TIMINGS.totalDurationMs;

      const initializedCycle: GlobalNightCycle = {
        isActive: true,
        startedAt: now,
        currentNight: 1,
        currentHour: 1,
        timerEndAt: timerEndAt,
        lastHourUpdateAt: now,
        lastNightUpdateAt: now,
      };

      await gameRef.update({
        globalNightCycle: initializedCycle,
        lastUpdated: FieldValue.serverTimestamp(),
      });

      // Обновляем AI уровни аниматроников
      await updateAnimatronicAILevels(gameId, 1, 1);

      revalidatePath('/');
      return {
        success: true,
        message: 'Night cycle auto-initialized from manual activation',
        cycle: initializedCycle,
        needsUpdate: true,
        autoInitialized: true,
      };
    }

    // Если цикл неактивен - просто возвращаем состояние
    if (!cycle.isActive) {
      return {
        success: true,
        message: 'Cycle not active',
        cycle: cycle,
        needsUpdate: false,
      };
    }

    const now = Date.now();
    const elapsedMs = now - cycle.startedAt!;

    // Проверяем, не закончился ли цикл
    if (elapsedMs >= NIGHT_CYCLE_TIMINGS.totalDurationMs) {
      // Цикл завершён
      const finalCycle: GlobalNightCycle = {
        ...cycle,
        isActive: false,
        currentNight: TOTAL_NIGHTS,
        currentHour: LAST_HOUR,
      };

      await gameRef.update({
        globalNightCycle: finalCycle,
        lastUpdated: FieldValue.serverTimestamp(),
      });

      revalidatePath('/');
      return {
        success: true,
        message: 'Night cycle completed',
        cycle: finalCycle,
        needsUpdate: false,
        completed: true,
      };
    }

    // Вычисляем текущую ночь и час
    const calculated = calculateNightAndHour(elapsedMs);
    if (!calculated) {
      return { success: false, message: 'Failed to calculate night and hour' };
    }

    const { night, hour } = calculated;

    // Проверяем, нужно ли обновление
    const needsUpdate = night !== cycle.currentNight || hour !== cycle.currentHour;

    if (needsUpdate) {
      const updatedCycle: GlobalNightCycle = {
        ...cycle,
        currentNight: night,
        currentHour: hour,
        lastHourUpdateAt: hour !== cycle.currentHour ? now : cycle.lastHourUpdateAt,
        lastNightUpdateAt: night !== cycle.currentNight ? now : cycle.lastNightUpdateAt,
      };

      await gameRef.update({
        globalNightCycle: updatedCycle,
        lastUpdated: FieldValue.serverTimestamp(),
      });

      // Обновляем AI уровни аниматроников
      await updateAnimatronicAILevels(gameId, night, hour);

      revalidatePath('/');
      return {
        success: true,
        message: `Updated to Night ${night}, ${hour} AM`,
        cycle: updatedCycle,
        needsUpdate: true,
        previousNight: cycle.currentNight,
        previousHour: cycle.currentHour,
      };
    }

    return {
      success: true,
      message: 'No update needed',
      cycle: cycle,
      needsUpdate: false,
    };
  } catch (error) {
    console.error('Error syncing night cycle:', error);
    return { success: false, message: 'Failed to sync night cycle' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ОБНОВЛЕНИЕ AI АНИМАТРОНИКОВ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Обновить AI уровни всех аниматроников для текущей ночи и часа
 */
export async function updateAnimatronicAILevels(
  gameId: string,
  night: number,
  hour: number
) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const enemiesRef = gameRef.collection('enemies');
    const enemiesSnap = await enemiesRef.get();

    if (enemiesSnap.empty) {
      return { success: true, message: 'No enemies to update', updated: 0 };
    }

    // Получаем все AI уровни для текущей ночи и часа
    const aiLevels = getAllAnimatronicAILevels(night, hour);

    const batch = dbAdmin.batch();
    let updateCount = 0;

    enemiesSnap.docs.forEach((doc) => {
      const enemyId = doc.id;
      const newAILevel = aiLevels[enemyId];

      if (newAILevel !== undefined) {
        batch.update(doc.ref, {
          aiLevel: newAILevel,
          lastAIUpdate: FieldValue.serverTimestamp(),
        });
        updateCount++;
      }
    });

    await batch.commit();

    revalidatePath('/');
    return {
      success: true,
      message: `Updated ${updateCount} animatronics for Night ${night}, ${hour} AM`,
      updated: updateCount,
      aiLevels: aiLevels,
    };
  } catch (error) {
    console.error('Error updating animatronic AI levels:', error);
    return { success: false, message: 'Failed to update animatronic AI levels' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ПОЛУЧЕНИЕ СОСТОЯНИЯ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Получить текущее состояние глобального цикла
 */
export async function getNightCycleState(gameId: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured', cycle: null };
  }

  try {
    const gameRef = getNightCycleRef(gameId);
    if (!gameRef) {
      return { success: false, message: 'Failed to get game reference', cycle: null };
    }

    const gameDoc = await gameRef.get();
    const gameData = gameDoc.data();
    const cycle = gameData?.globalNightCycle as GlobalNightCycle | undefined;

    if (!cycle) {
      return {
        success: true,
        message: 'No cycle found',
        cycle: INITIAL_NIGHT_CYCLE,
      };
    }

    // Вычисляем актуальное состояние на основе времени
    if (cycle.isActive && cycle.startedAt) {
      const now = Date.now();
      const elapsedMs = now - cycle.startedAt;
      const calculated = calculateNightAndHour(elapsedMs);

      if (calculated) {
        const { night, hour } = calculated;
        const aiLevels = getAllAnimatronicAILevels(night, hour);

        return {
          success: true,
          message: 'Cycle state retrieved',
          cycle: {
            ...cycle,
            currentNight: night,
            currentHour: hour,
          },
          calculatedState: { night, hour },
          aiLevels: aiLevels,
          elapsedMs: elapsedMs,
          remainingMs: NIGHT_CYCLE_TIMINGS.totalDurationMs - elapsedMs,
        };
      }
    }

    return {
      success: true,
      message: 'Cycle state retrieved',
      cycle: cycle,
    };
  } catch (error) {
    console.error('Error getting night cycle state:', error);
    return { success: false, message: 'Failed to get night cycle state', cycle: null };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// СБРОС ЦИКЛА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Сбросить глобальный цикл в начальное состояние
 * Используется для рестарта игры
 */
export async function resetNightCycle(gameId: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = getNightCycleRef(gameId);
    if (!gameRef) {
      return { success: false, message: 'Failed to get game reference' };
    }

    await gameRef.update({
      globalNightCycle: INITIAL_NIGHT_CYCLE,
      lastUpdated: FieldValue.serverTimestamp(),
    });

    // Сбрасываем AI уровни аниматроников к начальным
    await updateAnimatronicAILevels(gameId, 1, 1);

    revalidatePath('/');
    return {
      success: true,
      message: 'Night cycle reset',
      cycle: INITIAL_NIGHT_CYCLE,
    };
  } catch (error) {
    console.error('Error resetting night cycle:', error);
    return { success: false, message: 'Failed to reset night cycle' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ ДЛЯ КЛИЕНТА
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Получить информацию для отображения таймера
 */
export async function getNightCycleTimerInfo(gameId: string) {
  if (!dbAdmin) {
    return { success: false, message: 'Firebase not configured' };
  }

  try {
    const gameRef = getNightCycleRef(gameId);
    if (!gameRef) {
      return { success: false, message: 'Failed to get game reference' };
    }

    const gameDoc = await gameRef.get();
    const gameData = gameDoc.data();
    const cycle = gameData?.globalNightCycle as GlobalNightCycle | undefined;

    if (!cycle || !cycle.isActive || !cycle.startedAt) {
      return {
        success: true,
        isActive: false,
        message: 'Cycle not active',
      };
    }

    const now = Date.now();
    const elapsedMs = now - cycle.startedAt;
    const remainingMs = Math.max(0, NIGHT_CYCLE_TIMINGS.totalDurationMs - elapsedMs);

    // Время до следующего часа
    const timeInCurrentHour = elapsedMs % NIGHT_CYCLE_TIMINGS.hourDurationMs;
    const timeUntilNextHour = NIGHT_CYCLE_TIMINGS.hourDurationMs - timeInCurrentHour;

    // Время до следующей ночи
    const timeInCurrentNight = elapsedMs % NIGHT_CYCLE_TIMINGS.nightDurationMs;
    const timeUntilNextNight = NIGHT_CYCLE_TIMINGS.nightDurationMs - timeInCurrentNight;

    // Вычисляем текущие значения
    const calculated = calculateNightAndHour(elapsedMs);

    return {
      success: true,
      isActive: true,
      night: calculated?.night || cycle.currentNight,
      hour: calculated?.hour || cycle.currentHour,
      elapsedMs: elapsedMs,
      remainingMs: remainingMs,
      timeUntilNextHour: timeUntilNextHour,
      timeUntilNextNight: timeUntilNextNight,
      startedAt: cycle.startedAt,
      timerEndAt: cycle.timerEndAt,
    };
  } catch (error) {
    console.error('Error getting timer info:', error);
    return { success: false, message: 'Failed to get timer info' };
  }
}
