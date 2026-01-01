// 1. Инициализация цикла (создание поля в БД, если его нет)
export async function initializeNightCycle(gameId: string) {
  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const doc = await gameRef.get();

    if (!doc.exists) {
      // Если игры нет вообще — создаем
      await gameRef.set({
        createdAt: Date.now(),
        nightCycle: INITIAL_NIGHT_CYCLE
      });
      console.log(`[NightCycle] Game ${gameId} created with initial cycle.`);
    } else {
      // Если игра есть, проверяем поле nightCycle
      const data = doc.data();
      if (!data?.nightCycle) {
        await gameRef.update({
          nightCycle: INITIAL_NIGHT_CYCLE
        });
        console.log(`[NightCycle] Field 'nightCycle' added to ${gameId}.`);
      }
    }
    return { success: true };
  } catch (error) {
    console.error('[NightCycle] Init error:', error);
    return { success: false, error };
  }
}

// 2. Запуск цикла (Admin Action)
export async function startNightCycle(gameId: string) {
  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    const now = Date.now();
    
    // Рассчитываем время окончания
    const timerEndAt = now + NIGHT_CYCLE_TIMINGS.totalDurationMs;

    const newCycle: GlobalNightCycle = {
      isActive: true,
      currentNight: 1,
      currentHour: 12, // 12 AM (start)
      startedAt: now,
      timerEndAt: timerEndAt,
      lastHourUpdateAt: now,
      lastNightUpdateAt: now
    };

    await gameRef.update({
      nightCycle: newCycle
    });

    return { success: true };
  } catch (error) {
    console.error('[NightCycle] Start error:', error);
    return { success: false, error };
  }
}

// 3. Синхронизация/Обновление цикла (вызывается клиентами или периодически)
export async function syncNightCycle(gameId: string) {
    // В упрощенной версии просто возвращаем успех, 
    // так как клиенты сами считают время от startedAt.
    // В полной версии тут можно валидировать состояние на сервере.
    return { success: true };
}

// ★ 4. "Hard Reset" - Сброс БД (ВРЕМЕННАЯ ФУНКЦИЯ ДЛЯ ВАС)
// Эта функция принудительно создаст player1 и сбросит цикл
export async function forceHardReset(gameId: string) {
  try {
    const gameRef = dbAdmin.collection('games').doc(gameId);
    
    // 1. Сброс цикла
    await gameRef.set({
        nightCycle: INITIAL_NIGHT_CYCLE
    }, { merge: true });

    // 2. Создание Админа (player1)
    const playerRef = gameRef.collection('players').doc('player1');
    await playerRef.set({
        id: 'player1',
        name: 'ADMIN',
        currentNode: '1', // Стартовая нода
        status: 'IDLE',
        stats: {
            hp: 100,
            maxHp: 100,
            stamina: 7,
            maxStamina: 7,
            attack: 10, // Админские статы
            defense: 10,
            speed: 10,
            stealth: 10,
            capacity: 50,
            luck: 10
        },
        equipment: {
             helmet: null, armor: null, clothes: null,
             pockets: [null, null, null, null],
             specials: [null, null, null],
             weapon: null, scope: null, tactical: null, suppressor: null,
             rig: null, bag: null, backpack: null
        },
        inventory: [],
        roubles: 9999,
        turnActions: 4,
        gameLog: []
    });

    return { success: true, message: "Database initialized & Admin created" };
  } catch (error) {
    console.error("Hard Reset Error:", error);
    return { success: false, error };
  }
}
