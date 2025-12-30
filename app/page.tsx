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
 * │   react                      → useState, useEffect                         │
 * │   @/hooks/useGame            → useGame (Firebase realtime)                 │
 * │   @/app/actions/gameActions  → getOrCreatePlayer                           │
 * │   @/lib/mapData              → MAP_NODES_DATA, MapNodeData, getNodeById    │
 * │   @/lib/types                → CharacterStats, Equipment, etc              │
 * │                                                                             │
 * │ COMPONENTS USED:                                                            │
 * │   @/components/TabbedPanel    → правая верхняя панель (вкладки)            │
 * │   @/components/GameMap        → правая нижняя панель (SVG карта)           │
 * │   @/components/CameraView     → левая панель (камера наблюдения)           │
 * │   @/components/CombatEncounter → оверлей боя                               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ SCREEN LAYOUT                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │   ┌─────────────────────────────────────────────────────────────────────┐  │
 * │   │                                       │  ПЕРСОНАЖ │ИНВЕНТАРЬ│ИНФО │  │
 * │   │                                       ├───────────────────────────────┤  │
 * │   │         CAMERA VIEW                   │                             │  │
 * │   │            (60%)                      │    TABBED PANEL (55%)       │  │
 * │   │                                       │                             │  │
 * │   │     [FNAF-style camera feed]          ├───────────────────────────────┤  │
 * │   │                                       │                             │  │
 * │   │                                       │    GAME MAP (45%)           │  │
 * │   │                                       │    [SVG карта]              │  │
 * │   ├───────────────────────────────────────┴───────────────────────────────┤  │
 * │   │ HP: [████████] 100% │ SAN: [████████] 100% │ Выносливость: 4/7 │●ON │  │
 * │   └─────────────────────────────────────────────────────────────────────┘  │
 * │                                                                             │
 * │ OVERLAY: CombatEncounter (при isCombat === true)                           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ STATE MANAGEMENT                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │   playerId       - string | null - ID игрока (из localStorage)            │
 * │   selectedNode   - MapNodeData | null - выбранная нода для InfoTab         │
 * │   gameLog        - GameLogEntry[] - лог игровых событий (до 50 записей)    │
 * │                                                                             │
 * │ FROM useGame HOOK:                                                          │
 * │   player         - PlayerState | null - текущий игрок                      │
 * │   allPlayers     - PlayerState[] - все игроки                              │
 * │   enemies        - EnemyState[] - все враги                                │
 * │   isCombat       - boolean - статус боя                                    │
 * │   loading        - boolean - загрузка данных                               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { useState, useEffect } from 'react';
import { useGame } from '@/hooks/useGame';
import { getOrCreatePlayer } from '@/app/actions/gameActions';
import { MAP_NODES_DATA, MapNodeData, getNodeById } from '@/lib/mapData';
import { CharacterStats, Equipment, GameLogEntry, AnimatronicState, PlayerState as PlayerStateType } from '@/lib/types';

// Компоненты
import TabbedPanel from '@/components/TabbedPanel';
import GameMap from '@/components/GameMap';
import CameraView from '@/components/CameraView';
import CombatEncounter from '@/components/CombatEncounter';

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
  stamina: 4,
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

export default function GameBoard() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MapNodeData | null>(null);
  const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
  const GAME_ID = 'game_alpha';

  // Инициализация игрока
  useEffect(() => {
    async function init() {
      const savedId = localStorage.getItem('scav_player_id');
      const result = await getOrCreatePlayer(GAME_ID, savedId);

      if (result.success && result.playerId) {
        localStorage.setItem('scav_player_id', result.playerId);
        setPlayerId(result.playerId);

        // Добавляем запись в лог
        addLogEntry('Подключение к системе...', 'system');
      }
    }
    init();
  }, []);

  // Хук игры
  const { player, allPlayers, enemies, isCombat, loading } = useGame(GAME_ID, playerId || '');

  // Определяем текущего врага для боя
  const combatEnemy = enemies.find(e => e.currentNode === player?.currentNode);

  // Функция добавления записи в лог
  const addLogEntry = (message: string, type: GameLogEntry['type']) => {
    setGameLog(prev => [...prev, {
      timestamp: Date.now(),
      message,
      type
    }].slice(-50)); // Храним последние 50 записей
  };

  // Получаем данные текущего узла для камеры
  const currentNodeData = player ? getNodeById(player.currentNode) : null;

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
    stats: { ...DEFAULT_STATS, hp: p.stats.hp },
    equipment: DEFAULT_EQUIPMENT,
    inventory: p.inventory,
    roubles: 0,
    turnActions: 4,
    gameLog: []
  }));

  // Обработчик выбора узла на карте
  const handleNodeSelect = (node: MapNodeData) => {
    setSelectedNode(node);
    addLogEntry(`Просмотр: ${node.nameRu}`, 'system');
  };

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

  return (
    <main className="h-screen bg-black text-white overflow-hidden flex flex-col">
      {/* Оверлей боя */}
      {isCombat && combatEnemy && (
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
        <div className="w-3/5 h-full border-r border-white/10">
          <CameraView
            currentNode={currentNodeData || null}
            nodeId={player.currentNode}
            enemiesHere={enemiesAtCurrentNode}
            playersHere={playersAtCurrentNode}
          />
        </div>

        {/* ПРАВАЯ ЧАСТЬ - Панели (40% ширины) */}
        <div className="w-2/5 h-full flex flex-col">
          {/* Верхняя панель - Вкладки (55% высоты) */}
          <div className="h-[55%] border-b border-white/10">
            <TabbedPanel
              stats={{ ...DEFAULT_STATS, hp: player.stats.hp }}
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
            <span className="text-yellow-400">{DEFAULT_STATS.stamina}/{DEFAULT_STATS.maxStamina}</span>
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
