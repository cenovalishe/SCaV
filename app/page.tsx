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
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: app/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Главная страница игры SCaV (REDESIGNED v2.1)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES v2.1                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Night Cycle UI интегрирован в CameraView (HUD)                           │
 * │ - Удалена плавающая панель справа                                          │
 * │ - ViewingNode для переключения камеры на любую ноду                        │
 * │ - Динамическая экипировка с обновлениями                                   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: app/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Главная страница игры SCaV (REDESIGNED v2.2)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES v2.2                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - FIX: Исправлена ошибка типов в handleEncounterComplete (result.survived) │
 * │ - Логика выживания перенесена на клиент (проверка результата applyDamage)  │
 * │ - Night Cycle UI интегрирован в CameraView (HUD)                           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/hooks/useGame';
import { 
  getOrCreatePlayer, 
  updateStamina, 
  applyDamage, 
  lootLocation, 
  startNewTurnForAll, 
  getTakenPlayerSlots, 
  createPlayerInSlot, 
  respawnEnemiesIfNeeded, 
  handleAnimatronicDefeat,
  movePlayer,
  givePlayerItem // ★ ДОБАВЛЕНО
} from '@/app/actions/gameActions';
import { MapNodeData, getNodeById } from '@/lib/mapData';
import { CharacterStats, Equipment, GameLogEntry, AnimatronicState, PlayerState as PlayerStateType } from '@/lib/types';
import { getItemById, calculateEffectiveStats } from '@/lib/itemData';

// Компоненты
import TabbedPanel from '@/components/TabbedPanel';
import GameMap from '@/components/GameMap';
import CameraView from '@/components/CameraView';
import EncounterSystem, { EncounterResult } from '@/components/EncounterSystem';
import PvPEncounter, { PvPEncounterResult } from '@/components/PvPEncounter';
import ActionPanel from '@/components/ActionPanel';
import PlayerSelection from '@/components/PlayerSelection';
import LootRoulette from '@/components/LootRoulette';
import OfficeMechanic from '@/components/OfficeMechanic';
import PlayerInspectModal from '@/components/PlayerInspectModal';
import AdminTimeControls from '@/components/AdminTimeControls'; // ★ ДОБАВЛЕНО
import { initializeNightCycle } from '@/app/actions/nightCycleActions';

// Дефолтные значения (capacity удален)
const DEFAULT_STATS: CharacterStats = {
  attack: 1,
  defense: 1,
  speed: 1,
  stealth: 0,
  luck: 0,
  hp: 100,
  maxHp: 100,
  stamina: 7,
  maxStamina: 7
};

// Стартовая экипировка - ПУСТАЯ
const DEFAULT_EQUIPMENT: Equipment = {
  helmet: null,
  armor: null,
  pockets: [null, null, null, null],
  specials: [null, null, null],
  weapon: null,
  modules: [null, null, null],
  rig: null,
  bag: null,
  backpack: {
    id: 'bp_1',
    type: 'backpack',
    name: 'Backpack',
    nameRu: 'Рюкзак',
    slots: 6,
    items: [null, null, null, null, null, null]
  }
};

const GAME_ID = 'game_alpha';

export default function GameBoard() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MapNodeData | null>(null);
  const [viewingNode, setViewingNode] = useState<MapNodeData | null>(null);
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);

  // Состояние выбора игрока
  const [needsSlotSelection, setNeedsSlotSelection] = useState(false);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);

  // Динамическая экипировка
  const [equipment, setEquipment] = useState<Equipment>(DEFAULT_EQUIPMENT);

  // Найденный предмет (для анимации)
  const [foundItem, setFoundItem] = useState<{ icon: string; name: string } | null>(null);

  // Лут рулетка
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

  // Состояние PvP встречи
  const [pvpEncounter, setPvpEncounter] = useState<{
    active: boolean;
    otherPlayer: any;
    isInitiator: boolean;
  } | null>(null);

  // Состояние лутинга
  const [isLooting, setIsLooting] = useState(false);

  // Состояние механики офиса
  const [officeMechanic, setOfficeMechanic] = useState<{ active: boolean } | null>(null);

  // Состояние попапа блокировки S/F
  const [sfBlockedPopup, setSfBlockedPopup] = useState<{ active: boolean; message: string } | null>(null);

  // Состояние модалки осмотра игрока
  const [inspectingPlayer, setInspectingPlayer] = useState<PlayerStateType | null>(null);

  // Функция добавления записи в лог
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
      // Автоматический респавн аниматроников
      await respawnEnemiesIfNeeded(GAME_ID);

      // Инициализация глобального цикла ночей
      await initializeNightCycle(GAME_ID);

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
  const {
    player,
    allPlayers,
    enemies,
    loading,
    nightCycle,
    calculatedNight,
    calculatedHour
  } = useGame(GAME_ID, playerId || '');
  
  const isCheckingTurn = useRef(false);

  // Синхронизация PvP состояния
  useEffect(() => {
    if (!player || !allPlayers.length) return;
    if (pvpEncounter?.active) return;

    if (player.pvpState) {
      const pvp = player.pvpState;

      if (pvp.status === 'completed') {
        if (pvp.outcome === 'peaceful' || pvp.outcome === 'retreat') {
          return;
        }
      }

      const isInitiator = player.id === pvp.initiatorId;
      const opponentId = isInitiator ? pvp.targetId : pvp.initiatorId;
      const opponent = allPlayers.find(p => p.id === opponentId);

      if (opponent) {
        setPvpEncounter({
          active: true,
          otherPlayer: opponent,
          isInitiator: isInitiator
        });
        
        if (!isInitiator && pvp.status === 'pending') {
           addLogEntry(`⚠️ ВАС АТАКУЕТ ${opponent.name || 'Unknown'}!`, 'pvp');
        }
      }
    }
  }, [player, allPlayers, pvpEncounter, addLogEntry]);
  
  // Проверка одновременных ходов
  useEffect(() => {
    if (!playerId || loading || allPlayers.length === 0) return;
    if (isCheckingTurn.current) return;

    const allExhausted = allPlayers.every(p => {
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

  // Эффективные статы
  const baseStats: CharacterStats = player?.stats
    ? { ...DEFAULT_STATS, ...player.stats }
    : DEFAULT_STATS;

  const { stats: effectiveStats } = calculateEffectiveStats(baseStats, equipment);

  const currentStamina = effectiveStats.stamina;
  const currentStealth = effectiveStats.stealth;
  const maxStamina = effectiveStats.maxStamina;

  // Определяем какую ноду показывать на камере
  const cameraDisplayNode = viewingNode || currentNodeData;
  const cameraNodeId = viewingNode?.id || player?.currentNode || '1';

  // Фильтрация сущностей для камеры
  const enemiesAtViewingNode = enemies
    .filter(e => e.currentNode === cameraNodeId)
    .map(e => ({ id: e.id, name: e.type, type: e.type }));

  const playersAtViewingNode = allPlayers
    .filter(p => p.currentNode === cameraNodeId)
    .map(p => ({
      id: p.id,
      name: (p as any).name || 'Игрок',
      isCurrentPlayer: p.id === playerId,
      playerData: {
        id: p.id,
        name: (p as any).name || 'Игрок',
        currentNode: p.currentNode,
        status: p.status,
        stats: { ...DEFAULT_STATS, ...p.stats },
        equipment: (p as any).equipment || DEFAULT_EQUIPMENT,
        inventory: p.inventory || [],
        roubles: 0,
        turnActions: 4,
        gameLog: []
      } as PlayerStateType
    }));

  // Данные для панелей
  const enemiesAtCurrentNode = enemies
    .filter(e => e.currentNode === player?.currentNode)
    .map(e => e.type);

  const animatronicsForPanel: AnimatronicState[] = enemies.map(e => ({
    id: e.id,
    type: e.type,
    name: e.type,
    currentNode: e.currentNode,
    damage: 15,
    moveChance: 40,
    aggressionLevel: 5,
    aiLevel: (e as any).aiLevel || 0
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

  // Обработчики событий
  const handleCameraSwitch = useCallback((node: MapNodeData) => {
    setViewingNode(node);
    addLogEntry(`Камера переключена на: ${node.nameRu}`, 'system');
  }, [addLogEntry]);

  const handleAttackPlayer = useCallback((targetPlayer: PlayerStateType) => {
    if (!player) return;
    const fullTargetData = allPlayers.find(p => p.id === targetPlayer.id);
    if (!fullTargetData) return;

    addLogEntry(`⚔️ Атакуем ${targetPlayer.name}!`, 'pvp');
    setPvpEncounter({
      active: true,
      otherPlayer: fullTargetData,
      isInitiator: true
    });
  }, [player, allPlayers, addLogEntry]);

  const handleInspectPlayer = useCallback((targetPlayer: PlayerStateType) => {
    setInspectingPlayer(targetPlayer);
    addLogEntry(`👁️ Осматриваем ${targetPlayer.name}`, 'system');
  }, [addLogEntry]);

  const handleNodeSelect = useCallback((node: MapNodeData) => {
    setSelectedNode(node);
  }, []);

  // ★ ВЫПОЛНЕНИЕ ПЕРЕМЕЩЕНИЯ (с учетом десинка)
  const executeMove = useCallback(async (targetNodeId: string, staminaCost: number, skipStaminaCost: boolean = false) => {
    if (!playerId) return;

    try {
      // 1. Списываем выносливость
      if (!skipStaminaCost) {
        const updateRes = await updateStamina(GAME_ID, playerId, -staminaCost);
        if (!updateRes.success) {
          addLogEntry('Ошибка обновления выносливости', 'system');
          return;
        }
      }

      // 2. Вызываем Server Action для перемещения
      const result = await movePlayer(GAME_ID, playerId, targetNodeId, equipment);

      if (result.success) {
        addLogEntry(result.message, 'system');
        
        // 3. Обработка внезапных встреч (если сервер обнаружил врага уже ПОСЛЕ перемещения)
        if (result.event === 'ENEMY_ENCOUNTER' && result.collision?.hasCollision) {
           addLogEntry(`⚠️ ВНЕЗАПНАЯ ВСТРЕЧА: ${result.collision.enemyType}!`, 'combat');
           
           // Запускаем боевую систему
           setEncounter({
             active: true,
             enemyName: result.collision.enemyType || 'Enemy',
             enemyType: result.collision.enemyType || 'default',
             pendingMove: null, // Мы УЖЕ переместились
             staminaCost: 0,    // Стамина уже потрачена
             previousNode: null // Отступать будем по логике поражения
           });
        }
      } else {
        addLogEntry(result.message, 'system');
        // Если перемещение не удалось (заблокировано), возвращаем выносливость
        if (!skipStaminaCost) {
             await updateStamina(GAME_ID, playerId, staminaCost);
        }
        
        // Показываем попап блокировки S/F, если это причина отказа
        if (result.message.includes('Вход заблокирован')) {
           setSfBlockedPopup({ active: true, message: result.message });
        }
      }
    } catch (error) {
      console.error("Move error", error);
      addLogEntry("Критическая ошибка перемещения", 'system');
    }
  }, [playerId, equipment, addLogEntry]);

  // ★ ЗАПРОС ПЕРЕМЕЩЕНИЯ ОТ UI
  const handleMoveRequest = useCallback(async (targetNode: MapNodeData, staminaCost: number) => {
    if (!playerId || !player) return;

    if (currentStamina < staminaCost) {
      addLogEntry('Недостаточно выносливости для перемещения!', 'system');
      return;
    }

    // Проверяем наличие врага в целевой точке (клиентская проверка)
    const enemyAtTarget = enemies.find(e => e.currentNode === targetNode.id);

    if (enemyAtTarget) {
      // Если враг есть - запускаем систему встречи
      setEncounter({
        active: true,
        enemyName: enemyAtTarget.type,
        enemyType: enemyAtTarget.type,
        pendingMove: targetNode,
        staminaCost,
        previousNode: player.currentNode
      });
    } else {
      // Если чисто - идем
      await executeMove(targetNode.id, staminaCost);
    }
  }, [playerId, player, currentStamina, enemies, addLogEntry, executeMove]);

  // ★ ЗАВЕРШЕНИЕ ВСТРЕЧИ
  const handleEncounterComplete = useCallback(async (result: EncounterResult) => {
     if (!encounter || !playerId) return;
     
     let isDead = false;

     // 1. Применяем урон, если он есть
     if (result.damageReceived > 0) {
       const damageResult = await applyDamage(GAME_ID, playerId, result.damageReceived);
       if (damageResult.success) {
         addLogEntry(`Получено урона: ${result.damageReceived}`, 'combat');
         isDead = !!damageResult.isDefeated;
       }
     }

     // 2. Логика в зависимости от статуса (жив/мертв)
     if (!isDead) {
       if (result.evaded) {
         addLogEntry(`Вы уклонились от ${encounter.enemyName}!`, 'combat');
       } else {
         addLogEntry(`Вы пережили атаку ${encounter.enemyName}!`, 'combat');
       }

       if (result.retreated) {
         addLogEntry('Вы отступили назад.', 'combat');
       } 
       // Если мы выжили и не отступаем - завершаем движение
       else if (encounter.pendingMove) {
         await executeMove(encounter.pendingMove.id, encounter.staminaCost);
       }
     } else {
       addLogEntry('💀 Вы были схвачены...', 'combat');
       await handleAnimatronicDefeat(GAME_ID, playerId);
     }
     
     setEncounter(null);
  }, [encounter, playerId, executeMove, addLogEntry]);

  const handleStaminaReset = useCallback(async () => {
    if (!playerId) return;
    await updateStamina(GAME_ID, playerId, -currentStamina);
    addLogEntry('Выносливость обнулена!', 'system');
  }, [playerId, currentStamina, addLogEntry]);

  const handlePvPComplete = useCallback(async (result: PvPEncounterResult) => {
    if (!pvpEncounter) return;
    if (result.outcome === 'peaceful') addLogEntry('PvP отклонен.', 'pvp');
    else addLogEntry('PvP завершен', 'pvp');
    setPvpEncounter(null);
  }, [pvpEncounter, addLogEntry]);

  // ★ ЗАВЕРШЕНИЕ МЕХАНИКИ ОФИСА (Исправлено)
  const handleOfficeMechanicComplete = useCallback(async (result: { survived: boolean; receivedKeyCard: boolean; damageReceived: number }) => {
    setOfficeMechanic(null);
    
    // 1. Обработка урона
    if (result.damageReceived > 0) {
      const damageResult = await applyDamage(GAME_ID, playerId!, result.damageReceived);
      
      if (damageResult.success) {
         addLogEntry(`Получено урона: ${result.damageReceived}`, 'combat');
         if (damageResult.isDefeated) {
            addLogEntry('💀 Вы погибли от рук аниматроника в Офисе...', 'combat');
            await handleAnimatronicDefeat(GAME_ID, playerId!);
            return; 
         }
      }
    }

    // 2. Выдача карты
    if (result.receivedKeyCard) {
        // ★ ВЫЗОВ СЕРВЕРНОГО ДЕЙСТВИЯ
        const giveResult = await givePlayerItem(GAME_ID, playerId!, 'key_card');
        
        if (giveResult.success) {
          addLogEntry('🗝️ Ключ-карта получена и добавлена в инвентарь!', 'loot');
        } else {
          addLogEntry(`⚠️ Ошибка получения карты: ${giveResult.message}`, 'system');
        }
    } else if (!result.survived) { 
        addLogEntry('Смена не пройдена...', 'system');
    }
  }, [playerId, addLogEntry]);

  // ★ ЛУТИНГ
  const handleLoot = useCallback(async () => {
    if (!playerId || isLooting) return;
    setIsLooting(true);
    addLogEntry('Обыскиваем локацию...', 'system');

    try {
      // Если это офис (Y), запускаем мини-игру
      if (player?.currentNode === 'Y') {
        const hasKeyCard = equipment.specials.includes('key_card');
        if (!hasKeyCard) {
             setOfficeMechanic({ active: true });
             setIsLooting(false);
             return;
        }
      }

      // Обычный лутинг
      const result = await lootLocation(GAME_ID, playerId);
      
      if (result.success) {
        if (result.items && result.items.length > 0) {
           const itemNames = result.items.map(id => ({ id, nameRu: getItemById(id)?.nameRu || id }));
           setLootRoulette({ active: true, possibleItems: result.items });
           addLogEntry(`Найдено предметов: ${result.items.length}`, 'loot');
           if (result.droppedItems && result.droppedItems.length > 0) {
              addLogEntry(`Не поместилось: ${result.droppedItems.length}`, 'system');
           }
        } else {
           addLogEntry(result.message, 'system');
        }
      } else {
         addLogEntry(result.message, 'system');
      }
    } catch (e) {
      console.error(e);
      addLogEntry('Ошибка при обыске', 'system');
    }

    setIsLooting(false);
  }, [playerId, isLooting, addLogEntry, player?.currentNode, equipment]);

  const handleLootRouletteComplete = useCallback((items: { id: string; nameRu: string }[]) => {
      setLootRoulette(null);
  }, []);

  const handleWait = useCallback(async () => {
    if (!playerId) return;
    addLogEntry('Вы пропускаете ход...', 'system');
    await updateStamina(GAME_ID, playerId, -currentStamina);
  }, [playerId, currentStamina, addLogEntry]);

  const handleEquipmentChange = useCallback((newEquipment: Equipment) => {
    setEquipment(newEquipment);
  }, []);

  // Экран выбора игрока и загрузки
  if (needsSlotSelection) {
    return <PlayerSelection takenSlots={takenSlots} onSelectPlayer={handleSelectPlayer} />;
  }

  if (!playerId || loading || !player) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-500 font-mono text-xl animate-pulse mb-4">ESTABLISHING NEURAL LINK...</div>
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
      
      {/* АДМИН ПАНЕЛЬ (Только для player1) */}
      {playerId === 'player_cenoval' && (
        <AdminTimeControls gameId={GAME_ID} />
      )}

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

      {/* Система PvP встречи */}
      {pvpEncounter?.active && player && (
        <PvPEncounter
          gameId={GAME_ID}
          currentPlayer={player}
          otherPlayer={allPlayers.find(p => p.id === pvpEncounter.otherPlayer.id) || pvpEncounter.otherPlayer}
          isInitiator={pvpEncounter.isInitiator}
          onComplete={handlePvPComplete}
        />
      )}

      {/* Лут рулетка */}
      {lootRoulette?.active && (
        <LootRoulette
          possibleItems={lootRoulette.possibleItems}
          onComplete={handleLootRouletteComplete}
          onClose={() => setLootRoulette(null)}
        />
      )}

      {/* Механика офиса */}
      {officeMechanic?.active && (
        <OfficeMechanic
          onComplete={handleOfficeMechanicComplete}
          onClose={() => setOfficeMechanic(null)}
        />
      )}

      {/* Модалка осмотра игрока */}
      {inspectingPlayer && (
        <PlayerInspectModal
          player={inspectingPlayer}
          onClose={() => setInspectingPlayer(null)}
        />
      )}

      {/* Попап блокировки S/F */}
      {sfBlockedPopup?.active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="bg-gradient-to-br from-red-950 to-zinc-900 border-2 border-red-500/50 rounded-xl p-8 max-w-md text-center animate-pulse">
            <h2 className="text-2xl font-bold text-red-400 mb-4 font-mono">ДОСТУП ЗАБЛОКИРОВАН</h2>
            <p className="text-white/70 mb-6">{sfBlockedPopup.message}</p>
            <button
              onClick={() => setSfBlockedPopup(null)}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg"
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
            viewingNode={viewingNode}
            nodeId={cameraNodeId}
            enemiesHere={enemiesAtViewingNode}
            playersHere={playersAtViewingNode}
            onAttackPlayer={handleAttackPlayer}
            onInspectPlayer={handleInspectPlayer}
            
            // ИНТЕГРАЦИЯ ГЛОБАЛЬНОГО ЦИКЛА
            nightCycle={nightCycle}
            calculatedNight={calculatedNight}
            calculatedHour={calculatedHour}
            enemies={enemies}
            gameId={GAME_ID}
            isAdmin={playerId === 'player1'}
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
              foundItem={foundItem}
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
              equipment={equipment}
              onEquipmentChange={handleEquipmentChange}
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
              onCameraSwitch={handleCameraSwitch}
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
