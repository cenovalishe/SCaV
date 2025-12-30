/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: app/page.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Главная страница игры SCaV - точка входа и оркестрация компонентов
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ DEFAULT EXPORT:                                                             │
 * │   GameBoard           - React компонент главной страницы                   │
 * │                                                                             │
 * │ CONSTANTS:                                                                  │
 * │   DEFAULT_STATS       - Дефолтные характеристики персонажа                 │
 * │   DEFAULT_EQUIPMENT   - Стартовая экипировка (фонарик, аптечка, бинт)      │
 * │   GAME_ID             - 'game_alpha' - ID игровой сессии                   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   react                      → useState, useEffect, useCallback            │
 * │   @/hooks/useGame            → useGame (Firebase realtime)                 │
 * │   @/app/actions/gameActions  → getOrCreatePlayer, movePlayer, etc          │
 * │   @/lib/mapData              → MAP_NODES_DATA, MapNodeData, getNodeById    │
 * │   @/lib/types                → CharacterStats, Equipment, etc              │
 * │                                                                             │
 * │ COMPONENTS USED:                                                            │
 * │   @/components/TabbedPanel    → правая верхняя панель (вкладки)            │
 * │   @/components/GameMap        → правая нижняя панель (SVG карта)           │
 * │   @/components/CameraView     → левая панель (камера наблюдения)           │
 * │   @/components/CombatEncounter → оверлей боя                               │
 * │   @/components/EncounterSystem → система встречи с аниматроником           │
 * │   @/components/ActionPanel    → панель действий (лутинг, ожидание)         │
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

// Компоненты
import TabbedPanel from '@/components/TabbedPanel';
import GameMap from '@/components/GameMap';
import CameraView from '@/components/CameraView';
import CombatEncounter from '@/components/CombatEncounter';
import EncounterSystem, { EncounterResult } from '@/components/EncounterSystem';
import ActionPanel from '@/components/ActionPanel';
import PlayerSelection from '@/components/PlayerSelection';

// Дефолтные значения для совместимости
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
  rig: {
    id: 'rig_1',
    type: 'rig',
    name: 'Tactical Rig',
    nameRu: 'Разгрузка',
    slots: 4,
    items: [null, null, null, null]
  },
  bag: null,
  backpack: {
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
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);

  // Состояние выбора игрока
  const [needsSlotSelection, setNeedsSlotSelection] = useState(false);
  const [takenSlots, setTakenSlots] = useState<string[]>([]);

  // Состояние встречи с аниматроником
  const [encounter, setEncounter] = useState<{
    active: boolean;
    enemyName: string;
    enemyType: string;
    pendingMove: MapNodeData | null;
    staminaCost: number;
    previousNode: string | null; // Для отступления
  } | null>(null);

  // Состояние лутинга
  const [isLooting, setIsLooting] = useState(false);

  // Функция добавления записи в лог (определена здесь для доступа в init)
  const addLogEntry = useCallback((message: string, type: GameLogEntry['type']) => {
    setGameLog(prev => [...prev, {
      timestamp: Date.now(),
      message,
      type
    }].slice(-50)); // Храним последние 50 записей
  }, []);

  // Инициализация игрока
  useEffect(() => {
    async function init() {
      const savedId = localStorage.getItem('scav_player_id');
      const result = await getOrCreatePlayer(GAME_ID, savedId);

      if (result.success && result.playerId) {
        // Существующий игрок найден
        localStorage.setItem('scav_player_id', result.playerId);
        setPlayerId(result.playerId);
        addLogEntry('Подключение к системе...', 'system');
      } else if ((result as any).needsSlotSelection) {
        // Нужно выбрать слот
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
      // Слот уже занят, обновляем список
      const slotsResult = await getTakenPlayerSlots(GAME_ID);
      if (slotsResult.success) {
        setTakenSlots(slotsResult.takenSlots);
      }
      alert(result.message || 'Ошибка при создании игрока');
    }
  }, [addLogEntry]);

  // Хук игры
  const { player, allPlayers, enemies, isCombat, loading } = useGame(GAME_ID, playerId || '');

  // Определяем текущего врага для боя
  const combatEnemy = enemies.find(e => e.currentNode === player?.currentNode);

  // Ref для предотвращения дублирования проверки хода
  const isCheckingTurn = useRef(false);

  // Проверка одновременных ходов - если все игроки истратили выносливость, начинаем новый ход
  useEffect(() => {
    if (!playerId || loading || allPlayers.length === 0) return;
    if (isCheckingTurn.current) return;

    // Проверяем, если у всех игроков выносливость 0
    const allExhausted = allPlayers.every(p => {
      if (p.status === 'DEAD') return true;
      return (p.stats?.stamina || 0) === 0;
    });

    if (allExhausted) {
      isCheckingTurn.current = true;

      // Запускаем новый ход для всех
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

  // Получаем данные текущего узла для камеры
  const currentNodeData = player ? (getNodeById(player.currentNode) ?? null) : null;

  // Текущая выносливость из Firebase
  const currentStamina = player?.stats?.stamina ?? DEFAULT_STATS.stamina;
  const currentStealth = player?.stats?.stealth ?? DEFAULT_STATS.stealth;
  const maxStamina = player?.stats?.maxStamina ?? DEFAULT_STATS.maxStamina;

  // Фильтруем врагов и игроков для текущей локации камеры
  const enemiesAtCurrentNode = enemies
    .filter(e => e.currentNode === player?.currentNode)
    .map(e => e.type);

  const playersAtCurrentNode = allPlayers
    .filter(p => p.currentNode === player?.currentNode)
    .map(p => ({
      id: p.id,
      name: (p as any).name || 'Игрок',
      isCurrentPlayer: p.id === playerId
    }));

  // Конвертируем данные для совместимости с компонентами
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
    equipment: DEFAULT_EQUIPMENT,
    inventory: p.inventory,
    roubles: 0,
    turnActions: 4,
    gameLog: []
  }));

  // Обработчик выбора узла на карте
  const handleNodeSelect = useCallback((node: MapNodeData) => {
    setSelectedNode(node);
    addLogEntry(`Просмотр: ${node.nameRu}`, 'system');
  }, [addLogEntry]);

  // Обработчик запроса перемещения (из GameMap)
  const handleMoveRequest = useCallback(async (targetNode: MapNodeData, staminaCost: number) => {
    if (!playerId || !player) return;

    // Проверка выносливости
    if (currentStamina < staminaCost) {
      addLogEntry('Недостаточно выносливости для перемещения!', 'system');
      return;
    }

    // Проверяем, есть ли враг в целевой локации
    const enemyAtTarget = enemies.find(e => e.currentNode === targetNode.id);

    if (enemyAtTarget) {
      // Запускаем систему встречи с аниматроником
      setEncounter({
        active: true,
        enemyName: enemyAtTarget.type,
        enemyType: enemyAtTarget.type,
        pendingMove: targetNode,
        staminaCost,
        previousNode: player.currentNode // Сохраняем текущую позицию для отступления
      });
    } else {
      // Просто перемещаемся
      await executeMove(targetNode.id, staminaCost);
    }
  }, [playerId, player, currentStamina, enemies, addLogEntry]);

  // Выполнение перемещения
  const executeMove = useCallback(async (targetNodeId: string, staminaCost: number) => {
    if (!playerId) return;

    try {
      // Тратим выносливость
      await updateStamina(GAME_ID, playerId, -staminaCost);

      // Перемещаемся
      const res = await movePlayer(GAME_ID, playerId, targetNodeId);

      if (res.success) {
        const targetNode = getNodeById(targetNodeId);
        addLogEntry(`Перемещение в ${targetNode?.nameRu || targetNodeId}`, 'move');
      } else {
        addLogEntry(res.message || 'Ошибка перемещения', 'system');
      }
    } catch (error) {
      console.error("Ошибка при перемещении:", error);
      addLogEntry('Ошибка при перемещении', 'system');
    }
  }, [playerId, addLogEntry]);

  // Обработка результата встречи с аниматроником
  const handleEncounterComplete = useCallback(async (result: EncounterResult) => {
    if (!encounter || !playerId) return;

    if (result.evaded) {
      // Уклонились - перемещаемся без урона
      addLogEntry(`Уклонение от ${result.animatronicName}! (бросок: ${result.diceRoll})`, 'combat');

      if (encounter.pendingMove) {
        await executeMove(encounter.pendingMove.id, encounter.staminaCost);
      }
    } else {
      // Получили урон
      const actionText = result.action === 'retreat' ? 'отступил с' :
                        result.action === 'respin' ? 'перекрутил и получил' : 'получил';
      addLogEntry(`${result.animatronicName} атакует! Игрок ${actionText} ${result.damageReceived} урона!`, 'combat');

      // Применяем урон
      await applyDamage(GAME_ID, playerId, result.damageReceived);

      // Если отступление - остаёмся на текущей клетке (не перемещаемся)
      if (result.retreated) {
        addLogEntry(`Отступление на предыдущую позицию`, 'move');
        // Не выполняем перемещение - игрок остаётся где был
      } else {
        // Перемещаемся (получив урон)
        if (encounter.pendingMove) {
          await executeMove(encounter.pendingMove.id, encounter.staminaCost);
        }
      }
    }

    setEncounter(null);
  }, [encounter, playerId, executeMove, addLogEntry]);

  // Обнуление выносливости при выпадении колеса
  const handleStaminaReset = useCallback(async () => {
    if (!playerId) return;
    await updateStamina(GAME_ID, playerId, -currentStamina); // Обнуляем
    addLogEntry('Выносливость обнулена!', 'system');
  }, [playerId, currentStamina, addLogEntry]);

  // Обработчик лутинга
  const handleLoot = useCallback(async () => {
    if (!playerId || isLooting) return;

    setIsLooting(true);
    addLogEntry('Обыскиваю локацию...', 'loot');

    try {
      const result = await lootLocation(GAME_ID, playerId);

      if (result.success) {
        if (result.items && result.items.length > 0) {
          addLogEntry(`Найдено: ${result.items.join(', ')}`, 'loot');
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

  // Обработчик ожидания - пропуск хода (обнуляет выносливость)
  const handleWait = useCallback(async () => {
    if (!playerId) return;

    addLogEntry('Вы пропускаете ход...', 'system');

    // Обнуляем выносливость (пропуск хода)
    await updateStamina(GAME_ID, playerId, -currentStamina);

    addLogEntry('Выносливость израсходована. Ожидание нового хода...', 'system');
  }, [playerId, currentStamina, addLogEntry]);

  // Экран выбора игрока (для новых игроков)
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

  // Проверка есть ли враг в текущей локации
  const hasEnemyHere = enemiesAtCurrentNode.length > 0;

  return (
    <main className="h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Система встречи с аниматроником (кубик + колесо) */}
      {encounter?.active && (
        <EncounterSystem
          animatronicName={encounter.enemyName}
          animatronicType={encounter.enemyType}
          playerStealth={currentStealth}
          onComplete={handleEncounterComplete}
          onStaminaReset={handleStaminaReset}
        />
      )}

      {/* Оверлей боя (QTE) */}
      {isCombat && combatEnemy && !encounter?.active && (
        <CombatEncounter
          gameId={GAME_ID}
          playerId={playerId}
          enemyId={combatEnemy.id}
          enemyHp={combatEnemy.hp}
        />
      )}

      {/* Основной контент */}
      <div className="flex-1 flex overflow-hidden">
        {/* ЛЕВАЯ ЧАСТЬ - Камера (60% ширины) */}
        <div className="w-3/5 h-full border-r border-white/10 relative">
          <CameraView
            currentNode={currentNodeData || null}
            nodeId={player.currentNode}
            enemiesHere={enemiesAtCurrentNode}
            playersHere={playersAtCurrentNode}
          />

          {/* Панель действий поверх камеры */}
          <div className="absolute bottom-4 left-4 w-64 z-20">
            <ActionPanel
              currentNode={currentNodeData ?? null}
              currentStamina={currentStamina}
              isLooting={isLooting}
              canLoot={currentStamina >= 1}
              hasEnemyHere={hasEnemyHere}
              onLoot={handleLoot}
              onWait={handleWait}
            />
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ - Панели (40% ширины) */}
        <div className="w-2/5 h-full flex flex-col">
          {/* Верхняя панель - Вкладки (55% высоты) */}
          <div className="h-[55%] border-b border-white/10">
            <TabbedPanel
              stats={{ ...DEFAULT_STATS, hp: player.stats.hp, stamina: currentStamina }}
              playerName={(player as any).name || playerId.slice(0, 8)}
              equipment={DEFAULT_EQUIPMENT}
              selectedNode={selectedNode}
              animatronics={animatronicsForPanel}
              players={playersForPanel}
              gameLog={gameLog}
              currentPlayerId={playerId}
            />
          </div>

          {/* Нижняя панель - Карта (45% высоты) */}
          <div className="h-[45%]">
            <GameMap
              gameId={GAME_ID}
              playerId={playerId}
              allPlayers={allPlayers}
              currentNodeId={player.currentNode}
              enemies={enemies}
              selectedNode={selectedNode}
              onNodeSelect={handleNodeSelect}
              currentStamina={currentStamina}
              maxStamina={maxStamina}
              onMoveRequest={handleMoveRequest}
            />
          </div>
        </div>
      </div>

      {/* Нижняя панель статуса */}
      <div className="h-10 bg-black border-t border-white/20 flex items-center justify-between px-4">
        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-white/50">HP:</span>
            <div className="w-24 h-2 bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all"
                style={{ width: `${player.stats.hp}%` }}
              />
            </div>
            <span className="text-red-400">{player.stats.hp}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/50">SAN:</span>
            <div className="w-24 h-2 bg-gray-800 overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${player.stats.san}%` }}
              />
            </div>
            <span className="text-blue-400">{player.stats.san}%</span>
          </div>
          <div className="text-white/30">|</div>
          <div className="flex items-center gap-2">
            <span className="text-white/50">Выносливость:</span>
            <span className="text-yellow-400">{currentStamina}/{maxStamina}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-xs">
          <span className="text-white/30">Узел: {player.currentNode}</span>
          <span className="text-white/30">|</span>
          <span className="text-green-400">● ONLINE</span>
        </div>
      </div>
    </main>
  );
}
