/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: app/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Главная страница игры SCaV (REDESIGNED v2.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES v2.0                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - viewingNode для переключения камеры на любую ноду                        │
 * │ - onCameraSwitch callback для карты                                        │
 * │ - Динамическая экипировка с обновлениями                                   │
 * │ - Добавление лута в инвентарь при обыске                                   │
 * │ - Улучшенный UI                                                            │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/hooks/useGame';
import { getOrCreatePlayer, movePlayer, updateStamina, applyDamage, lootLocation, checkAllPlayersExhausted, startNewTurnForAll, getTakenPlayerSlots, createPlayerInSlot, respawnEnemiesIfNeeded } from '@/app/actions/gameActions';
import { MAP_NODES_DATA, MapNodeData, getNodeById } from '@/lib/mapData';
import { CharacterStats, Equipment, GameLogEntry, AnimatronicState, PlayerState as PlayerStateType } from '@/lib/types';
import { getItemById, calculateEffectiveStats } from '@/lib/itemData';

// Компоненты
import TabbedPanel from '@/components/TabbedPanel';
import GameMap from '@/components/GameMap';
import CameraView from '@/components/CameraView';
import EncounterSystem, { EncounterResult } from '@/components/EncounterSystem';
import ActionPanel from '@/components/ActionPanel';
import PlayerSelection from '@/components/PlayerSelection';
import LootRoulette from '@/components/LootRoulette';
import OfficeMechanic from '@/components/OfficeMechanic';

// Дефолтные значения (соответствуют начальным характеристикам в createPlayerInSlot)
const DEFAULT_STATS: CharacterStats = {
  attack: 1,       // Атака: 1
  defense: 1,      // Защита: 1
  speed: 1,        // Скорость: 1
  stealth: 0,      // Скрытность: 0
  luck: 0,         // Удача: 0
  capacity: 20,
  hp: 100,
  maxHp: 100,
  stamina: 7,
  maxStamina: 7
};

// ★ Стартовая экипировка - ПУСТАЯ (без предметов)
const DEFAULT_EQUIPMENT: Equipment = {
  helmet: null,
  armor: null,
  clothes: null,
  pockets: [null, null, null, null],
  specials: [null, null, null],  // ★ Без фонарика
  weapon: null,
  scope: null,
  tactical: null,
  suppressor: null,
  rig: null,      // ★ БЕЗ разгрузки по умолчанию
  bag: null,      // ★ БЕЗ сумки по умолчанию
  backpack: {     // Пустой рюкзак
    id: 'bp_1',
    type: 'backpack',
    name: 'Backpack',
    nameRu: 'Рюкзак',
    slots: 13,
    items: [null, null, null, null, null, null, null, null, null, null, null, null, null]  // ★ 13 слотов: 2x2(4) + 2x2(4) + 2x1(2) + 1x1(3)
  }
};

const GAME_ID = 'game_alpha';

export default function GameBoard() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MapNodeData | null>(null);
  const [viewingNode, setViewingNode] = useState<MapNodeData | null>(null); // ★ Нода для просмотра камеры
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);

  // Состояние выбора игрока
  const [needsSlotSelection, setNeedsSlotSelection] = useState(false);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);

  // ★ Динамическая экипировка
  const [equipment, setEquipment] = useState<Equipment>(DEFAULT_EQUIPMENT);

  // ★ Найденный предмет (для анимации)
  const [foundItem, setFoundItem] = useState<{ icon: string; name: string } | null>(null);

  // ★ Лут рулетка (контейнер с лутом)
  const [lootRoulette, setLootRoulette] = useState<{ active: boolean; possibleItems: string[] } | null>(null);

  // Состояние встречи с аниматроником
  const [encounter, setEncounter] = useState<{
    active: boolean;
    enemyName: string;
    enemyType: string;
    pendingMove: MapNodeData | null;
    staminaCost: number;
    previousNode: string | null;
  } | null>(null);

  // Состояние лутинга
  const [isLooting, setIsLooting] = useState(false);

  // ★ Состояние механики офиса (маршрутная точка Y)
  const [officeMechanic, setOfficeMechanic] = useState<{ active: boolean } | null>(null);

  // ★ Состояние попапа блокировки S/F
  const [sfBlockedPopup, setSfBlockedPopup] = useState<{ active: boolean; message: string } | null>(null);

  // Функция добавления записи в лог (полная история)
  const addLogEntry = useCallback((message: string, type: GameLogEntry['type']) => {
    setGameLog(prev => [...prev, {
      timestamp: Date.now(),
      message,
      type
    }]);
  }, []);

  // Инициализация игрока
  useEffect(() => {
    async function init() {
      // [PATCH] Автоматический респавн аниматроников если их нет
      await respawnEnemiesIfNeeded(GAME_ID);

      const savedId = localStorage.getItem('scav_player_id');
      const result = await getOrCreatePlayer(GAME_ID, savedId);

      if (result.success && result.playerId) {
        localStorage.setItem('scav_player_id', result.playerId);
        setPlayerId(result.playerId);
        addLogEntry('Подключение к системе...', 'system');
      } else if ((result as any).needsSlotSelection) {
        const slotsResult = await getTakenPlayerSlots(GAME_ID);
        if (slotsResult.success) {
          setTakenSlots(slotsResult.takenSlots);
        }
        setNeedsSlotSelection(true);
      }
    }
    init();
  }, [addLogEntry]);

  // Обработчик выбора игрока
  const handleSelectPlayer = useCallback(async (slotId: string, playerName: string) => {
    const result = await createPlayerInSlot(GAME_ID, slotId, playerName);

    if (result.success && result.playerId) {
      localStorage.setItem('scav_player_id', result.playerId);
      setPlayerId(result.playerId);
      setNeedsSlotSelection(false);
      addLogEntry(`Добро пожаловать, ${playerName}!`, 'system');
    } else {
      const slotsResult = await getTakenPlayerSlots(GAME_ID);
      if (slotsResult.success) {
        setTakenSlots(slotsResult.takenSlots);
      }
      alert(result.message || 'Ошибка при создании игрока');
    }
  }, [addLogEntry]);

  // Хук игры
  const { player, allPlayers, enemies, loading } = useGame(GAME_ID, playerId || '');

  const isCheckingTurn = useRef(false);

  // Проверка одновременных ходов
  useEffect(() => {
    if (!playerId || loading || allPlayers.length === 0) return;
    if (isCheckingTurn.current) return;

    const allExhausted = allPlayers.every(p => {
      if (p.status === 'DEAD') return true;
      return (p.stats?.stamina || 0) === 0;
    });

    if (allExhausted) {
      isCheckingTurn.current = true;
      startNewTurnForAll(GAME_ID).then((result) => {
        if (result.success) {
          addLogEntry('🎲 Новый ход! Выносливость восстановлена (1 + d6)', 'system');
        }
        isCheckingTurn.current = false;
      }).catch(() => {
        isCheckingTurn.current = false;
      });
    }
  }, [playerId, loading, allPlayers, addLogEntry]);

  // Данные текущего узла
  const currentNodeData = player ? (getNodeById(player.currentNode) ?? null) : null;

  // ★ FIX: Вычисляем эффективные статы с учётом экипировки
  const baseStats: CharacterStats = player?.stats
    ? { ...DEFAULT_STATS, ...player.stats }
    : DEFAULT_STATS;

  const { stats: effectiveStats } = calculateEffectiveStats(baseStats, equipment);

  // Статы из Firebase (с учётом экипировки)
  const currentStamina = effectiveStats.stamina;
  const currentStealth = effectiveStats.stealth;
  const maxStamina = effectiveStats.maxStamina;

  // ★ Определяем какую ноду показывать на камере
  const cameraDisplayNode = viewingNode || currentNodeData;
  const cameraNodeId = viewingNode?.id || player?.currentNode || '1';

  // Фильтруем врагов и игроков для ПРОСМАТРИВАЕМОЙ ноды (не текущей)
  const enemiesAtViewingNode = enemies
    .filter(e => e.currentNode === cameraNodeId)
    .map(e => ({ id: e.id, name: e.type, type: e.type }));

  const playersAtViewingNode = allPlayers
    .filter(p => p.currentNode === cameraNodeId)
    .map(p => ({
      id: p.id,
      name: (p as any).name || 'Игрок',
      isCurrentPlayer: p.id === playerId
    }));

  // Для панели действий используем ТЕКУЩУЮ ноду
  const enemiesAtCurrentNode = enemies
    .filter(e => e.currentNode === player?.currentNode)
    .map(e => e.type);

  // Конвертируем данные для совместимости (аниматроники бессмертны)
  const animatronicsForPanel: AnimatronicState[] = enemies.map(e => ({
    id: e.id,
    type: e.type,
    name: e.type,
    currentNode: e.currentNode,
    damage: 15,
    moveChance: 40,
    aggressionLevel: 5,
    aiLevel: (e as any).aiLevel || 10 // FNAF1-style AI level
  }));

  const playersForPanel: PlayerStateType[] = allPlayers.map(p => ({
    id: p.id,
    name: (p as any).name || 'Игрок',
    currentNode: p.currentNode,
    status: p.status,
    stats: { ...DEFAULT_STATS, hp: p.stats.hp, stamina: p.stats.stamina || DEFAULT_STATS.stamina },
    equipment: equipment,
    inventory: p.inventory,
    roubles: 0,
    turnActions: 4,
    gameLog: []
  }));

  // ★ Обработчик переключения камеры (при клике на любую ноду на карте)
  const handleCameraSwitch = useCallback((node: MapNodeData) => {
    setViewingNode(node);
    addLogEntry(`Камера переключена на: ${node.nameRu}`, 'system');
  }, [addLogEntry]);

  // Обработчик выбора узла на карте
  const handleNodeSelect = useCallback((node: MapNodeData) => {
    setSelectedNode(node);
  }, []);

  // Обработчик запроса перемещения
  const handleMoveRequest = useCallback(async (targetNode: MapNodeData, staminaCost: number) => {
    if (!playerId || !player) return;

    if (currentStamina < staminaCost) {
      addLogEntry('Недостаточно выносливости для перемещения!', 'system');
      return;
    }

    const enemyAtTarget = enemies.find(e => e.currentNode === targetNode.id);

    if (enemyAtTarget) {
      setEncounter({
        active: true,
        enemyName: enemyAtTarget.type,
        enemyType: enemyAtTarget.type,
        pendingMove: targetNode,
        staminaCost,
        previousNode: player.currentNode
      });
    } else {
      await executeMove(targetNode.id, staminaCost);
    }
  }, [playerId, player, currentStamina, enemies, addLogEntry]);

  // Выполнение перемещения
  const executeMove = useCallback(async (targetNodeId: string, staminaCost: number, skipStaminaCost: boolean = false) => {
    if (!playerId) return;

    try {
      // Списываем выносливость только если не пропускаем (например, после encounter с колесом)
      if (!skipStaminaCost) {
        await updateStamina(GAME_ID, playerId, -staminaCost);
      }
      // FIX: Передаём экипировку для проверки ключ-карты при входе в SF
      const res = await movePlayer(GAME_ID, playerId, targetNodeId, equipment);

      if (res.success) {
        const targetNode = getNodeById(targetNodeId);
        addLogEntry(`Перемещение в ${targetNode?.nameRu || targetNodeId}`, 'move');
        // ★ Автоматически переключаем камеру на новую позицию
        if (targetNode) {
          setViewingNode(null); // Сбрасываем на текущую позицию
        }

        // ★ Обработка столкновения с врагом (если враг переместился на ту же клетку одновременно)
        if (res.collision?.hasCollision && res.collision.enemyType) {
          // Показываем encounter с врагом, который переместился на ту же клетку
          setEncounter({
            active: true,
            enemyName: res.collision.enemyType,
            enemyType: res.collision.enemyType,
            pendingMove: null, // Уже переместились
            staminaCost: 0,
            previousNode: targetNodeId
          });
        }

        // ★ Запуск механики офиса при входе в ноду Y
        if (targetNodeId === 'Y') {
          addLogEntry('🏢 Вы вошли в офис охранника!', 'system');
          setOfficeMechanic({ active: true });
        }
      } else {
        // ★ Проверяем, не заблокирован ли S/F
        if (res.message?.includes('заблокирован') || res.message?.includes('Вход')) {
          setSfBlockedPopup({ active: true, message: res.message });
          // Возвращаем выносливость, которую списали перед попыткой
          if (!skipStaminaCost) {
            await updateStamina(GAME_ID, playerId, staminaCost);
          }
        } else {
          addLogEntry(res.message || 'Ошибка перемещения', 'system');
        }
      }
    } catch (error) {
      console.error("Ошибка при перемещении:", error);
      addLogEntry('Ошибка при перемещения', 'system');
    }
  }, [playerId, equipment, addLogEntry]);

  // Обработка результата встречи
  const handleEncounterComplete = useCallback(async (result: EncounterResult) => {
    if (!encounter || !playerId) return;

    // Сохраняем данные о перемещении до любых async операций
    const pendingMoveId = encounter.pendingMove?.id;
    const staminaCost = encounter.staminaCost;

    if (result.evaded) {
      addLogEntry(`Уклонение от ${result.animatronicName}! (бросок: ${result.diceRoll})`, 'combat');
      // Перемещаемся при успешном уклонении
      if (pendingMoveId) {
        await executeMove(pendingMoveId, staminaCost);
      }
    } else {
      const actionText = result.action === 'retreat' ? 'отступил с' :
                        result.action === 'respin' ? 'перекрутил и получил' : 'получил';
      addLogEntry(`${result.animatronicName} атакует! Игрок ${actionText} ${result.damageReceived} урона!`, 'combat');

      await applyDamage(GAME_ID, playerId, result.damageReceived);

      if (result.retreated) {
        addLogEntry(`Отступление на предыдущую позицию`, 'move');
        // При отступлении остаёмся на месте (previousNode)
      } else {
        // ВСЕГДА перемещаемся после получения урона (если не отступаем)
        // Выносливость уже обнулена колесом (onStaminaReset), не списываем снова
        if (pendingMoveId) {
          await executeMove(pendingMoveId, staminaCost, true);
        }
      }
    }

    setEncounter(null);
  }, [encounter, playerId, executeMove, addLogEntry]);

  const handleStaminaReset = useCallback(async () => {
    if (!playerId) return;
    await updateStamina(GAME_ID, playerId, -currentStamina);
    addLogEntry('Выносливость обнулена!', 'system');
  }, [playerId, currentStamina, addLogEntry]);

  // ★ Обработчик завершения механики офиса
  const handleOfficeMechanicComplete = useCallback(async (result: { survived: boolean; receivedKeyCard: boolean; damageReceived: number }) => {
    setOfficeMechanic(null);

    if (result.damageReceived > 0) {
      await applyDamage(GAME_ID, playerId!, result.damageReceived);
      addLogEntry(`Получено урона за смену: ${result.damageReceived}`, 'combat');
    }

    if (result.receivedKeyCard) {
      // Добавляем ключ-карту в спец-слот
      setEquipment(prev => {
        const newEquipment = JSON.parse(JSON.stringify(prev)) as Equipment;

        // Ищем первый свободный спец-слот
        if (newEquipment.specials) {
          const emptySlot = newEquipment.specials.findIndex(s => s === null);
          if (emptySlot !== -1) {
            newEquipment.specials[emptySlot] = 'key_card';
            return newEquipment;
          }
        }

        // Если спец-слоты заняты, пробуем карманы
        const pocketSlot = newEquipment.pockets.findIndex(s => s === null);
        if (pocketSlot !== -1) {
          newEquipment.pockets[pocketSlot] = 'key_card';
          return newEquipment;
        }

        addLogEntry('Инвентарь полон! Ключ-карта потеряна!', 'system');
        return prev;
      });

      addLogEntry('🗝️ Получена ключ-карта! Теперь вы можете вернуться на Старт/Финиш.', 'loot');
    } else {
      addLogEntry('Смена не пройдена... Попробуйте ещё раз.', 'system');
    }
  }, [playerId, addLogEntry]);

  // ★ Возможные предметы для лут-рулетки
  const LOOT_CONTAINER_ITEMS = [
    'medkit', 'bandage', 'pills', 'food', 'soda', 'adrenaline',
    'golden_cupcake', 'foxy_plush', 'treasure_map', 'security_badge',
    'tablet', 'phone', 'old_tape', 'microphone', 'flashlight', 'batteries',
    'hook', 'eyepatch', 'wrench', 'spare_parts', 'coin', 'cupcake'
  ];

  // ★ Шанс найти контейнер с лутом (25%)
  const LOOT_CONTAINER_CHANCE = 0.25;

  // ★ Обработчик лутинга с добавлением в инвентарь
  const handleLoot = useCallback(async () => {
    if (!playerId || isLooting) return;

    setIsLooting(true);
    setFoundItem(null);
    addLogEntry('Обыскиваю локацию...', 'loot');

    try {
      const result = await lootLocation(GAME_ID, playerId);

      if (result.success) {
        // ★ Проверяем шанс на контейнер с лутом
        if (Math.random() < LOOT_CONTAINER_CHANCE) {
          addLogEntry('🎁 Найден контейнер с лутом!', 'loot');
          setLootRoulette({
            active: true,
            possibleItems: LOOT_CONTAINER_ITEMS
          });
          setIsLooting(false);
          return;
        }

        if (result.items && result.items.length > 0) {
          const itemId = result.items[0];
          const item = getItemById(itemId);

          if (item) {
            // Показываем найденный предмет
            setFoundItem({ icon: item.icon, name: item.nameRu });

            // ★ Добавляем в инвентарь (в первый свободный слот рюкзака)
            setEquipment(prev => {
              const newEquipment = JSON.parse(JSON.stringify(prev)) as Equipment;

              // Пробуем добавить в рюкзак
              if (newEquipment.backpack) {
                const emptySlot = newEquipment.backpack.items.findIndex(s => s === null);
                if (emptySlot !== -1) {
                  newEquipment.backpack.items[emptySlot] = itemId;
                  return newEquipment;
                }
              }

              // Пробуем добавить в разгрузку
              if (newEquipment.rig) {
                const emptySlot = newEquipment.rig.items.findIndex(s => s === null);
                if (emptySlot !== -1) {
                  newEquipment.rig.items[emptySlot] = itemId;
                  return newEquipment;
                }
              }

              // Пробуем добавить в карманы
              const pocketSlot = newEquipment.pockets.findIndex(s => s === null);
              if (pocketSlot !== -1) {
                newEquipment.pockets[pocketSlot] = itemId;
                return newEquipment;
              }

              addLogEntry('Инвентарь полон!', 'system');
              return prev;
            });

            addLogEntry(`Найдено: ${item.nameRu}`, 'loot');

            // Скрываем анимацию через 2 секунды
            setTimeout(() => setFoundItem(null), 2000);
          }
        } else {
          addLogEntry('Ничего не найдено', 'loot');
        }
      } else {
        addLogEntry(result.message || 'Не удалось обыскать', 'system');
      }
    } catch (error) {
      console.error("Ошибка при лутинге:", error);
      addLogEntry('Ошибка при обыске', 'system');
    } finally {
      setIsLooting(false);
    }
  }, [playerId, isLooting, addLogEntry]);

  // ★ Обработчик завершения лут-рулетки
  const handleLootRouletteComplete = useCallback((items: { id: string; nameRu: string }[]) => {
    // Добавляем предметы в инвентарь
    setEquipment(prev => {
      const newEquipment = JSON.parse(JSON.stringify(prev)) as Equipment;

      for (const item of items) {
        let added = false;

        // Пробуем добавить в рюкзак
        if (!added && newEquipment.backpack) {
          const emptySlot = newEquipment.backpack.items.findIndex(s => s === null);
          if (emptySlot !== -1) {
            newEquipment.backpack.items[emptySlot] = item.id;
            added = true;
          }
        }

        // Пробуем добавить в разгрузку
        if (!added && newEquipment.rig) {
          const emptySlot = newEquipment.rig.items.findIndex(s => s === null);
          if (emptySlot !== -1) {
            newEquipment.rig.items[emptySlot] = item.id;
            added = true;
          }
        }

        // Пробуем добавить в карманы
        if (!added) {
          const pocketSlot = newEquipment.pockets.findIndex(s => s === null);
          if (pocketSlot !== -1) {
            newEquipment.pockets[pocketSlot] = item.id;
            added = true;
          }
        }

        if (added) {
          addLogEntry(`Получено: ${item.nameRu}`, 'loot');
        } else {
          addLogEntry(`Инвентарь полон! ${item.nameRu} потерян.`, 'system');
        }
      }

      return newEquipment;
    });

    setLootRoulette(null);
  }, [addLogEntry]);

  // Обработчик ожидания
  const handleWait = useCallback(async () => {
    if (!playerId) return;
    addLogEntry('Вы пропускаете ход...', 'system');
    await updateStamina(GAME_ID, playerId, -currentStamina);
    addLogEntry('Выносливость израсходована. Ожидание нового хода...', 'system');
  }, [playerId, currentStamina, addLogEntry]);

  // ★ Обработчик изменения экипировки (из InventoryTab)
  const handleEquipmentChange = useCallback((newEquipment: Equipment) => {
    setEquipment(newEquipment);
  }, []);

  // Экран выбора игрока
  if (needsSlotSelection) {
    return (
      <PlayerSelection
        takenSlots={takenSlots}
        onSelectPlayer={handleSelectPlayer}
      />
    );
  }

  // Загрузочный экран
  if (!playerId || loading || !player) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-500 font-mono text-xl animate-pulse mb-4">
            ESTABLISHING NEURAL LINK...
          </div>
          <div className="w-48 h-1 bg-gray-800 mx-auto overflow-hidden">
            <div className="h-full bg-green-500 animate-[loading_2s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  const hasEnemyHere = enemiesAtCurrentNode.length > 0;

  return (
    <main className="h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Система встречи с аниматроником */}
      {encounter?.active && (
        <EncounterSystem
          animatronicName={encounter.enemyName}
          animatronicType={encounter.enemyType}
          playerStealth={currentStealth}
          onComplete={handleEncounterComplete}
          onStaminaReset={handleStaminaReset}
        />
      )}

      {/* ★ Лут рулетка */}
      {lootRoulette?.active && (
        <LootRoulette
          possibleItems={lootRoulette.possibleItems}
          onComplete={handleLootRouletteComplete}
          onClose={() => setLootRoulette(null)}
        />
      )}

      {/* ★ Механика офиса (маршрутная точка Y) */}
      {officeMechanic?.active && (
        <OfficeMechanic
          onComplete={handleOfficeMechanicComplete}
          onClose={() => setOfficeMechanic(null)}
        />
      )}

      {/* ★ Попап блокировки S/F */}
      {sfBlockedPopup?.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="bg-gradient-to-br from-red-950 to-zinc-900 border-2 border-red-500/50 rounded-xl p-8 max-w-md text-center animate-pulse">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-red-400 mb-4 font-mono">
              ДОСТУП ЗАБЛОКИРОВАН
            </h2>
            <p className="text-white/70 mb-6">
              Чтобы выбраться с локации через S/F необходима <span className="text-yellow-400 font-bold">ключ-карта</span>.
            </p>
            <p className="text-white/50 text-sm mb-6">
              Ключ-карту можно получить, успешно пройдя ночную смену в <span className="text-purple-400">Офисе (Y)</span>.
            </p>
            <button
              onClick={() => setSfBlockedPopup(null)}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all hover:scale-105"
            >
              Понятно
            </button>
          </div>
        </div>
      )}

      {/* Основной контент */}
      <div className="flex-1 flex overflow-hidden">
        {/* ЛЕВАЯ ЧАСТЬ - Камера (60% ширины) */}
        <div className="w-3/5 h-full border-r border-white/10 relative">
          <CameraView
            currentNode={currentNodeData || null}
            viewingNode={viewingNode}  // ★ Нода для просмотра
            nodeId={cameraNodeId}
            enemiesHere={enemiesAtViewingNode}
            playersHere={playersAtViewingNode}
          />

          {/* Панель действий */}
          <div className="absolute bottom-4 left-4 w-72 z-20">
            <ActionPanel
              currentNode={currentNodeData ?? null}
              currentStamina={currentStamina}
              isLooting={isLooting}
              canLoot={currentStamina >= 1}
              hasEnemyHere={hasEnemyHere}
              onLoot={handleLoot}
              onWait={handleWait}
              foundItem={foundItem}  // ★ Найденный предмет
            />
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ - Панели (40% ширины) */}
        <div className="w-2/5 h-full flex flex-col">
          {/* Верхняя панель - Вкладки */}
          <div className="h-[55%] border-b border-white/10">
            <TabbedPanel
              stats={{ ...effectiveStats, hp: player.stats.hp, stamina: currentStamina }}
              playerName={(player as any).name || playerId.slice(0, 8)}
              equipment={equipment}  // ★ Динамическая экипировка
              onEquipmentChange={handleEquipmentChange}  // ★ Callback изменения
              selectedNode={selectedNode}
              animatronics={animatronicsForPanel}
              players={playersForPanel}
              gameLog={gameLog}
              currentPlayerId={playerId}
            />
          </div>

          {/* Нижняя панель - Карта */}
          <div className="h-[45%]">
            <GameMap
              gameId={GAME_ID}
              playerId={playerId}
              allPlayers={allPlayers}
              currentNodeId={player.currentNode}
              enemies={enemies}
              selectedNode={selectedNode}
              onNodeSelect={handleNodeSelect}
              onCameraSwitch={handleCameraSwitch}  // ★ Переключение камеры
              currentStamina={currentStamina}
              maxStamina={maxStamina}
              onMoveRequest={handleMoveRequest}
            />
          </div>
        </div>
      </div>

      {/* Нижняя панель статуса */}
      <div className="h-12 bg-gradient-to-r from-zinc-900 to-black border-t border-white/20 flex items-center justify-between px-6">
        <div className="flex items-center gap-8 font-mono text-xs">
          {/* HP */}
          <div className="flex items-center gap-2">
            <span className="text-red-400">❤️</span>
            <div className="w-28 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all rounded-full"
                style={{ width: `${player.stats.hp}%` }}
              />
            </div>
            <span className="text-red-400 font-bold">{player.stats.hp}%</span>
          </div>
          <div className="text-white/20">│</div>
          {/* Stamina */}
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">⚡</span>
            <div className="flex gap-0.5">
              {Array(maxStamina).fill(0).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sm ${i < currentStamina ? 'bg-yellow-400 shadow-sm shadow-yellow-400/50' : 'bg-zinc-700'}`}
                />
              ))}
            </div>
            <span className="text-yellow-400 font-bold">{currentStamina}/{maxStamina}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 font-mono text-xs">
          <span className="text-white/40">📍 {currentNodeData?.nameRu || player.currentNode}</span>
          <span className="text-white/20">│</span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
            <span className="text-green-400">ONLINE</span>
          </span>
        </div>
      </div>
    </main>
  );
}
