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
import { getOrCreatePlayer, movePlayer, updateStamina, applyDamage, lootLocation, checkAllPlayersExhausted, startNewTurnForAll, getTakenPlayerSlots, createPlayerInSlot } from '@/app/actions/gameActions';
import { MAP_NODES_DATA, MapNodeData, getNodeById } from '@/lib/mapData';
import { CharacterStats, Equipment, GameLogEntry, AnimatronicState, PlayerState as PlayerStateType } from '@/lib/types';
import { getItemById } from '@/lib/itemData';

// Компоненты
import TabbedPanel from '@/components/TabbedPanel';
import GameMap from '@/components/GameMap';
import CameraView from '@/components/CameraView';
import CombatEncounter from '@/components/CombatEncounter';
import EncounterSystem, { EncounterResult } from '@/components/EncounterSystem';
import ActionPanel from '@/components/ActionPanel';
import PlayerSelection from '@/components/PlayerSelection';
import LootRoulette from '@/components/LootRoulette';

// Дефолтные значения
const DEFAULT_STATS: CharacterStats = {
  attack: 5,
  defense: 3,
  speed: 4,
  stealth: 3,
  luck: 2,
  capacity: 20,
  hp: 100,
  maxHp: 100,
  stamina: 7,
  maxStamina: 7
};

// ★ Стартовая экипировка БЕЗ контейнеров (появятся при нахождении)
const DEFAULT_EQUIPMENT: Equipment = {
  helmet: null,
  armor: null,
  clothes: null,
  pockets: [null, null, null, null],
  specials: ['flashlight', null, null],
  weapon: null,
  scope: null,
  tactical: null,
  suppressor: null,
  rig: null,      // ★ БЕЗ разгрузки по умолчанию
  bag: null,      // ★ БЕЗ сумки по умолчанию
  backpack: {     // Только рюкзак со стартовыми предметами
    id: 'bp_1',
    type: 'backpack',
    name: 'Backpack',
    nameRu: 'Рюкзак',
    slots: 8,
    items: ['medkit', 'bandage', null, null, null, null, null, null]
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

  // Функция добавления записи в лог
  const addLogEntry = useCallback((message: string, type: GameLogEntry['type']) => {
    setGameLog(prev => [...prev, {
      timestamp: Date.now(),
      message,
      type
    }].slice(-50));
  }, []);

  // Инициализация игрока
  useEffect(() => {
    async function init() {
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
  const { player, allPlayers, enemies, isCombat, loading } = useGame(GAME_ID, playerId || '');

  const combatEnemy = enemies.find(e => e.currentNode === player?.currentNode);
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

  // Статы из Firebase
  const currentStamina = player?.stats?.stamina ?? DEFAULT_STATS.stamina;
  const currentStealth = player?.stats?.stealth ?? DEFAULT_STATS.stealth;
  const maxStamina = player?.stats?.maxStamina ?? DEFAULT_STATS.maxStamina;

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

  // Конвертируем данные для совместимости
  const animatronicsForPanel: AnimatronicState[] = enemies.map(e => ({
    id: e.id,
    type: e.type,
    name: e.type,
    currentNode: e.currentNode,
    hp: e.hp,
    maxHp: 100,
    damage: 15,
    moveChance: 40,
    aggressionLevel: 5
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
  const executeMove = useCallback(async (targetNodeId: string, staminaCost: number) => {
    if (!playerId) return;

    try {
      await updateStamina(GAME_ID, playerId, -staminaCost);
      const res = await movePlayer(GAME_ID, playerId, targetNodeId);

      if (res.success) {
        const targetNode = getNodeById(targetNodeId);
        addLogEntry(`Перемещение в ${targetNode?.nameRu || targetNodeId}`, 'move');
        // ★ Автоматически переключаем камеру на новую позицию
        if (targetNode) {
          setViewingNode(null); // Сбрасываем на текущую позицию
        }
      } else {
        addLogEntry(res.message || 'Ошибка перемещения', 'system');
      }
    } catch (error) {
      console.error("Ошибка при перемещении:", error);
      addLogEntry('Ошибка при перемещении', 'system');
    }
  }, [playerId, addLogEntry]);

  // Обработка результата встречи
  const handleEncounterComplete = useCallback(async (result: EncounterResult) => {
    if (!encounter || !playerId) return;

    if (result.evaded) {
      addLogEntry(`Уклонение от ${result.animatronicName}! (бросок: ${result.diceRoll})`, 'combat');
      if (encounter.pendingMove) {
        await executeMove(encounter.pendingMove.id, encounter.staminaCost);
      }
    } else {
      const actionText = result.action === 'retreat' ? 'отступил с' :
                        result.action === 'respin' ? 'перекрутил и получил' : 'получил';
      addLogEntry(`${result.animatronicName} атакует! Игрок ${actionText} ${result.damageReceived} урона!`, 'combat');

      await applyDamage(GAME_ID, playerId, result.damageReceived);

      if (result.retreated) {
        addLogEntry(`Отступление на предыдущую позицию`, 'move');
      } else {
        if (encounter.pendingMove) {
          await executeMove(encounter.pendingMove.id, encounter.staminaCost);
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

      {/* Оверлей боя */}
      {isCombat && combatEnemy && !encounter?.active && (
        <CombatEncounter
          gameId={GAME_ID}
          playerId={playerId}
          enemyId={combatEnemy.id}
          enemyHp={combatEnemy.hp}
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
              stats={{ ...DEFAULT_STATS, hp: player.stats.hp, stamina: currentStamina }}
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
          {/* Sanity */}
          <div className="flex items-center gap-2">
            <span className="text-blue-400">🧠</span>
            <div className="w-28 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all rounded-full"
                style={{ width: `${player.stats.san}%` }}
              />
            </div>
            <span className="text-blue-400 font-bold">{player.stats.san}%</span>
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
