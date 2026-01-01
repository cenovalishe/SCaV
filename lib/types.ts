/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: lib/types.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 *   Центральное хранилище TypeScript типов для игры SCaV.
 *   Определяет структуры данных для персонажей, инвентаря, карты и игровой логики.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEMANTIC ANCHORS INDEX:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * /START_ANCHOR:TYPES/CHARACTER_STATS .......... Интерфейс CharacterStats
 * /START_ANCHOR:TYPES/EQUIPMENT_SLOTS .......... Тип EquipmentSlotType
 * /START_ANCHOR:TYPES/CONTAINERS ............... Типы Container, ContainerType
 * /START_ANCHOR:TYPES/ITEMS .................... Интерфейсы Item, ItemEffect
 * /START_ANCHOR:TYPES/EQUIPMENT ................ Интерфейс Equipment
 * /START_ANCHOR:TYPES/PLAYER_STATE ............. Интерфейс PlayerState
 * /START_ANCHOR:TYPES/GAME_LOG ................. Интерфейс GameLogEntry
 * /START_ANCHOR:TYPES/MAP_LOCATIONS ............ Типы DangerLevel, LocationLootType, LootEntry, NodeInfo
 * /START_ANCHOR:TYPES/ANIMATRONICS ............. Интерфейс AnimatronicState
 * /START_ANCHOR:TYPES/GAME_STATE ............... Интерфейс GameState
 * /START_ANCHOR:TYPES/GAME_MECHANICS ........... Интерфейсы DiceRoll, PlayerAction
 * /START_ANCHOR:TYPES/CAMERA_SYSTEM ............ Интерфейс CameraConfig
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORTS OVERVIEW:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * INTERFACES (Структуры данных):
 * ┌─────────────────────┬────────────────────────────────────────────────────────┐
 * │ CharacterStats      │ Характеристики персонажа (атака, защита, скорость...) │
 * │ Item                │ Предмет с ценностью, размером и эффектами             │
 * │ ItemEffect          │ Эффект предмета при использовании                     │
 * │ Container           │ Контейнер (разгрузка/сумка/рюкзак) со слотами         │
 * │ Equipment           │ Полная экипировка игрока (все слоты)                  │
 * │ PlayerState         │ Полное состояние игрока (позиция, статы, инвентарь)   │
 * │ GameLogEntry        │ Запись в логе игровых событий                         │
 * │ NodeInfo            │ Информация о локации (опасность, лут, сущности)       │
 * │ LootEntry           │ Запись о возможном луте в локации                     │
 * │ AnimatronicState    │ Состояние аниматроника (позиция, HP, агрессия)        │
 * │ GameState           │ Глобальное состояние игры (ночь, фаза, игроки)        │
 * │ DiceRoll            │ Результат броска кубика                               │
 * │ CameraConfig        │ Конфигурация камеры наблюдения                        │
 * └─────────────────────┴────────────────────────────────────────────────────────┘
 *
 * TYPES (Перечисления):
 * ┌─────────────────────┬────────────────────────────────────────────────────────┐
 * │ EquipmentSlotType   │ Типы слотов: helmet, armor, clothes, pocket1-4...     │
 * │ ContainerType       │ Типы контейнеров: rig, bag, backpack                  │
 * │ DangerLevel         │ Уровни опасности: safe, low, medium, high, extreme    │
 * │ LocationLootType    │ Типы лута локации: rare, common, supplies             │
 * │ PlayerAction        │ Действия игрока: move, loot, use_item, attack...      │
 * └─────────────────────┴────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPENDENCY GRAPH:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ИСПОЛЬЗУЕТСЯ В:
 *   → lib/mapData.ts        (DangerLevel, LootEntry, LocationLootType)
 *   → lib/itemData.ts       (Item, ItemEffect)
 *   → components/*.tsx      (CharacterStats, Equipment, PlayerState, AnimatronicState)
 *   → app/page.tsx          (CharacterStats, Equipment, GameLogEntry, AnimatronicState)
 *   → hooks/useGame.ts      (PlayerState)
 *
 * ЗАВИСИМОСТИ:
 *   ← Нет внешних зависимостей (корневой модуль типов)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2024-12-31 | VERSION: 2.0.0 (с семантическими якорями)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/CHARACTER_STATS
// Характеристики персонажа игрока
// КОНТРАКТ: Все числовые поля должны быть >= 0, hp <= maxHp, stamina <= maxStamina
// ═══════════════════════════════════════════════════════════════════════════════

export interface CharacterStats {
  attack: number;      // АТАКА - урон в бою
  defense: number;     // ЗАЩИТА - снижение урона
  speed: number;       // СКОРОСТЬ - приоритет хода
  stealth: number;     // СКРЫТНОСТЬ - шанс избежать встречи
  luck: number;        // УДАЧА - шанс редкого лута
  capacity: number;    // ВМЕСТИМОСТЬ - макс. вес инвентаря
  hp: number;          // ХП - текущее здоровье
  maxHp: number;       // Максимальное ХП
  stamina: number;     // Очки выносливости (текущие)
  maxStamina: number;  // Максимальная выносливость (1+d6)
}

// /END_ANCHOR:TYPES/CHARACTER_STATS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/EQUIPMENT_SLOTS
// Типы слотов экипировки (EFT-стиль)
// КОНТРАКТ: Строковый литеральный тип, одно из 14 значений
// ═══════════════════════════════════════════════════════════════════════════════

export type EquipmentSlotType =
  | 'helmet'      // Шлем - защита головы
  | 'armor'       // Броня - защита тела
  | 'clothes'     // Одежда - базовая защита
  | 'pocket1'     // Карман 1 - быстрый доступ
  | 'pocket2'     // Карман 2
  | 'pocket3'     // Карман 3
  | 'pocket4'     // Карман 4
  | 'special1'    // Спец слот 1 - ключи, карты
  | 'special2'    // Спец слот 2
  | 'special3'    // Спец слот 3
  | 'weapon'      // Оружие - основное
  | 'module0'     // Модуль 1 - универсальный слот (бывший прицел)
  | 'module1'     // Модуль 2 - универсальный слот (бывший ЛЦУ)
  | 'module2';    // Модуль 3 - универсальный слот (бывший глушитель)

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/SLOT_ITEM_RESTRICTIONS
// Маппинг слотов к типам предметов, которые можно в них экипировать
// ═══════════════════════════════════════════════════════════════════════════════

export type ItemType = 'consumable' | 'equipment' | 'weapon' | 'attachment' | 'valuable' | 'key';

// Определяет подтип предмета для более точных ограничений слотов
export type ItemSubType =
  | 'helmet'      // Шлемы
  | 'armor'       // Броня
  | 'clothes'     // Одежда
  | 'weapon'      // Оружие
  | 'module'      // Модули (фонарик, прицел и т.д.)
  | 'consumable'  // Расходники
  | 'valuable'    // Ценности
  | 'key'         // Ключи
  | 'any';        // Любой тип

// Какие подтипы предметов разрешены в каждом слоте
export const SLOT_ALLOWED_SUBTYPES: Record<string, ItemSubType[]> = {
  helmet: ['helmet'],
  armor: ['armor'],
  clothes: ['clothes'],
  weapon: ['weapon'],
  module0: ['module'],
  module1: ['module'],
  module2: ['module'],
  pocket0: ['consumable', 'valuable', 'key', 'any'],
  pocket1: ['consumable', 'valuable', 'key', 'any'],
  pocket2: ['consumable', 'valuable', 'key', 'any'],
  pocket3: ['consumable', 'valuable', 'key', 'any'],
  special0: ['key', 'valuable'],
  special1: ['key', 'valuable'],
  special2: ['key', 'valuable'],
};

// /END_ANCHOR:TYPES/SLOT_ITEM_RESTRICTIONS

// /END_ANCHOR:TYPES/EQUIPMENT_SLOTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/CONTAINERS
// Типы контейнеров для хранения предметов
// КОНТРАКТ: items.length должен равняться slots
// ═══════════════════════════════════════════════════════════════════════════════

export type ContainerType = 'rig' | 'bag' | 'backpack';

// Структура ячейки в слоте
// Индексы подъячеек в слоте 2x2:
// [0][1] (y=0)
// [2][3] (y=1)
//
// Индексы подъячеек в слоте 1x2:
// [0] (y=0)
// [1] (y=1)
export interface SubCell {
  itemId: string | null;      // ID предмета в этой подъячейке
  masterCell?: number;        // Если предмет занимает несколько ячеек - индекс "мастер" ячейки (левый верхний угол предмета)
  isOccupied?: boolean;       // Флаг, занята ли ячейка частью большого предмета
}

// Конфигурация слота контейнера
export interface ContainerSlotConfig {
  // Добавлен тип '1x2' для вертикальных карманов
  size: '1x1' | '1x2' | '2x1' | '2x2'; 
  subCells?: SubCell[];       
}

export interface Container {
  id: string;
  type: ContainerType;
  name: string;
  nameRu: string;
  slots: number;              // Количество слотов
  items: (string | null)[];   // ID предметов или null для пустых (legacy)
  // Новая система подъячеек для слотов 2x2
  slotConfigs?: ContainerSlotConfig[];
}

// /END_ANCHOR:TYPES/CONTAINERS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/ITEMS
// Предметы и их эффекты
// КОНТРАКТ: value >= 0, size >= 1, stackable=true требует maxStack > 1
// ═══════════════════════════════════════════════════════════════════════════════

export interface Item {
  id: string;
  name: string;
  nameRu: string;
  type: 'consumable' | 'equipment' | 'weapon' | 'attachment' | 'valuable' | 'key';
  subType?: ItemSubType;  // Подтип для ограничений слотов (helmet, armor, clothes, weapon, module и т.д.)
  value: number;

  // ИЗМЕНЕНИЕ: Заменяем абстрактный size на конкретные измерения
  width: number;       // Ширина в ячейках (по горизонтали)
  height: number;      // Высота в ячейках (по вертикали)
  size?: number;       // (Legacy) Можно оставить как геттер или total slots (w*h)

  icon: string;
  effects?: ItemEffect[];
  stackable?: boolean;
  maxStack?: number;
  statModifiers?: Partial<Record<keyof CharacterStats, number>>;
}

export interface ItemEffect {
  stat: keyof CharacterStats | 'roubles';
  value: number;
  type: 'add' | 'multiply' | 'set';
}

// /END_ANCHOR:TYPES/ITEMS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/EQUIPMENT
// Полная структура экипировки игрока
// КОНТРАКТ: pockets.length = 4, specials.length = 3
// ═══════════════════════════════════════════════════════════════════════════════

export interface Equipment {
  helmet: string | null;
  armor: string | null;
  clothes: string | null;
  pockets: (string | null)[];   // 4 кармана
  specials: (string | null)[];  // 3 спец слота
  weapon: string | null;
  modules: (string | null)[];   // 3 универсальных модуля (заменяют scope/tactical/suppressor)
  rig: Container | null;        // Разгрузка (красные слоты)
  bag: Container | null;        // Сумка (синие слоты)
  backpack: Container | null;   // Рюкзак (оранжевые слоты)
}

// /END_ANCHOR:TYPES/EQUIPMENT

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/PLAYER_STATE
// Полное состояние игрока
// КОНТРАКТ: status определяет доступные действия, turnActions >= 0
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlayerState {
  id: string;
  name: string;
  currentNode: string;
  // ★ Статус DEAD удалён - теперь при падении HP до 0 накладывается штраф и HP сбрасывается
  status: 'IDLE' | 'MOVING' | 'IN_COMBAT' | 'LOOTING' | 'IN_OFFICE' | 'IN_PVP' | 'DEFEATED';
  stats: CharacterStats;
  equipment: Equipment;
  inventory: string[];
  roubles: number;
  turnActions: number;
  gameLog: GameLogEntry[];
  currentEnemyId?: string | null; // ID текущего врага (аниматроник)
  pvpOpponentId?: string | null; // ID противника в PvP
  pvpState?: PvPEncounterState | null; // Состояние PvP боя
  previousNode?: string | null; // ★ Предыдущая нода для отступления
}

// /END_ANCHOR:TYPES/PLAYER_STATE

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/GAME_LOG
// Логирование игровых событий
// КОНТРАКТ: timestamp - Unix timestamp в миллисекундах
// ═══════════════════════════════════════════════════════════════════════════════

export interface GameLogEntry {
  timestamp: number;
  message: string;
  type: 'move' | 'loot' | 'combat' | 'event' | 'system' | 'pvp';
}

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/PVP_SYSTEM
// PvP система - бой между игроками
// КОНТРАКТ: currentRound 1-3, инициатива определяет порядок ходов
// ═══════════════════════════════════════════════════════════════════════════════

export interface PvPEncounterState {
  initiatorId: string;        // ID игрока, инициировавшего PvP
  targetId: string;           // ID цели
  initiatorInitiative: number; // Инициатива инициатора
  targetInitiative: number;    // Инициатива цели
  currentRound: number;        // Текущий раунд (1-3)
  maxRounds: number;           // Максимум раундов (3)
  attackerId: string;          // ID атакующего в текущем раунде
  defenderId: string;          // ID защищающегося в текущем раунде
  initiatorHp: number;         // ХП инициатора на начало боя
  targetHp: number;            // ХП цели на начало боя
  combatLog: string[];         // Лог боя
  status: 'pending' | 'in_progress' | 'completed'; // Статус PvP
  outcome?: 'initiator_win' | 'target_win' | 'retreat' | 'peaceful'; // Результат
}

// /END_ANCHOR:TYPES/PVP_SYSTEM

// /END_ANCHOR:TYPES/GAME_LOG

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/MAP_LOCATIONS
// Типы для карты и локаций
// КОНТРАКТ: dangerPercent 0-100, chance в LootEntry 0-100
// ═══════════════════════════════════════════════════════════════════════════════

export type DangerLevel = 'safe' | 'low' | 'medium' | 'high' | 'extreme';

export type LocationLootType = 'rare' | 'common' | 'supplies';

export interface LootEntry {
  itemId: string;
  chance: number;     // Шанс выпадения (0-100)
  minCount: number;
  maxCount: number;
}

export interface NodeInfo {
  id: string;
  name: string;
  nameRu: string;
  roomId: string;
  dangerLevel: DangerLevel;
  dangerPercent: number;    // Шанс перемещения аниматроника (0-100)
  possibleLoot: LootEntry[];
  animatronics: string[];   // ID аниматроников в этой точке
  players: string[];        // ID игроков в этой точке
}

// /END_ANCHOR:TYPES/MAP_LOCATIONS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/ANIMATRONICS
// Состояние аниматроников (враги) - БЕССМЕРТНЫ, без HP
// КОНТРАКТ: moveChance 0-100, aggressionLevel определяет поведение
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnimatronicState {
  id: string;
  type: string;           // Freddy, Bonnie, Chica, Foxy
  name: string;
  currentNode: string;
  damage: number;
  moveChance: number;     // Устаревшее: Шанс перемещения (0-100)
  aggressionLevel: number;
  aiLevel: number;        // FNAF1-style AI level (0-20): если random(1-20) < aiLevel, аниматроник двигается
}

// /END_ANCHOR:TYPES/ANIMATRONICS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/GAME_STATE
// Глобальное состояние игры
// КОНТРАКТ: currentNight 1-5, currentHour 12-6 (AM), dayNumber 1-10
// ═══════════════════════════════════════════════════════════════════════════════

export interface GameState {
  id: string;
  currentNight: number;       // Текущая ночь (1-5)
  currentHour: number;        // Текущий час (12-6)
  dayNumber: number;          // Текущий день (1-10)
  isNight: boolean;
  turnPhase: 'planning' | 'action' | 'animatronic' | 'resolution';
  players: Record<string, PlayerState>;
  animatronics: Record<string, AnimatronicState>;
}

// /END_ANCHOR:TYPES/GAME_STATE

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/GAME_MECHANICS
// Механики игры
// КОНТРАКТ: DiceRoll.total = base + roll + sum(modifiers)
// ═══════════════════════════════════════════════════════════════════════════════

export interface DiceRoll {
  base: number;       // Базовое значение (1)
  roll: number;       // Результат d6
  total: number;      // Итого
  modifiers: number[];
}

export type PlayerAction = 'move' | 'loot' | 'use_item' | 'attack' | 'hide' | 'wait';

// /END_ANCHOR:TYPES/GAME_MECHANICS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/CAMERA_SYSTEM
// Система камер наблюдения
// КОНТРАКТ: nodeId должен существовать в MAP_NODES_DATA
// ═══════════════════════════════════════════════════════════════════════════════

export interface CameraConfig {
  nodeId: string;
  roomId: string;
  label: string;
  imageSrc: string;
  isWorking: boolean;
}

// /END_ANCHOR:TYPES/CAMERA_SYSTEM

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/GLOBAL_NIGHT_CYCLE
// Глобальный цикл ночей - синхронизирован между всеми игроками
// КОНТРАКТ:
// - 10 реальных суток = 5 игровых ночей
// - Каждые 2 суток = 1 ночь
// - Каждые 8 часов = +1 AM (от 1 до 6)
// - При достижении 6 AM → переход на следующую ночь, сброс до 1 AM
// ═══════════════════════════════════════════════════════════════════════════════

export interface GlobalNightCycle {
  isActive: boolean;              // Активен ли глобальный цикл (false = ожидание, true = идёт)
  startedAt: number | null;       // Unix timestamp начала цикла (когда переключили с 0 на 1)
  currentNight: number;           // Текущая ночь (1-5)
  currentHour: number;            // Текущий час (1-6 AM)
  timerEndAt: number | null;      // Unix timestamp окончания всего цикла
  lastHourUpdateAt: number | null; // Unix timestamp последнего обновления часа
  lastNightUpdateAt: number | null; // Unix timestamp последнего обновления ночи
}

// AI уровень аниматроника для конкретной ночи и часа
export interface AnimatronicAIConfig {
  animatronicId: string;          // ID аниматроника (freddy, bonnie, chica, foxy)
  night: number;                   // Ночь (1-5)
  hour: number;                    // Час (1-6)
  aiLevel: number;                 // AI level (0-20, FNAF1 style)
  isActive: boolean;               // Активен ли аниматроник на этой ночи/часе
}

// Конфигурация для всех аниматроников на конкретную ночь
export interface NightConfig {
  night: number;
  animatronics: {
    [animatronicId: string]: {
      startHour: number;           // С какого часа активируется (0 = не появляется эту ночь)
      aiLevelByHour: number[];     // AI level для каждого часа [1AM, 2AM, 3AM, 4AM, 5AM, 6AM]
    }
  }
}

// Тайминги глобального цикла (в миллисекундах)
export interface NightCycleTimings {
  totalDurationMs: number;         // Общая длительность цикла (10 суток)
  nightDurationMs: number;         // Длительность одной ночи (2 суток)
  hourDurationMs: number;          // Длительность одного часа (8 часов реального времени)
}

// /END_ANCHOR:TYPES/GLOBAL_NIGHT_CYCLE
