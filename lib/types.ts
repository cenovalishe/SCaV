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
  | 'scope'       // Прицел - обвес оружия
  | 'tactical'    // ЛЦУ/Фонарь - обвес
  | 'suppressor'; // Глушитель - обвес

// /END_ANCHOR:TYPES/EQUIPMENT_SLOTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:TYPES/CONTAINERS
// Типы контейнеров для хранения предметов
// КОНТРАКТ: items.length должен равняться slots
// ═══════════════════════════════════════════════════════════════════════════════

export type ContainerType = 'rig' | 'bag' | 'backpack';

export interface Container {
  id: string;
  type: ContainerType;
  name: string;
  nameRu: string;
  slots: number;              // Количество слотов
  items: (string | null)[];   // ID предметов или null для пустых
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
  value: number;       // Ценность в рублях
  size: number;        // Размер в слотах (1, 2, 3...)
  icon: string;        // Эмодзи или путь к иконке
  effects?: ItemEffect[];
  stackable?: boolean;
  maxStack?: number;
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
  scope: string | null;
  tactical: string | null;
  suppressor: string | null;
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
  status: 'IDLE' | 'MOVING' | 'IN_COMBAT' | 'DEAD' | 'LOOTING' | 'IN_OFFICE';
  stats: CharacterStats;
  equipment: Equipment;
  inventory: string[];
  roubles: number;
  turnActions: number;
  gameLog: GameLogEntry[];
  currentEnemyId?: string | null; // <--- ДОБАВЛЕНО: ID текущего врага
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
  type: 'move' | 'loot' | 'combat' | 'event' | 'system';
}

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
// Состояние аниматроников (враги)
// КОНТРАКТ: hp <= maxHp, moveChance 0-100, aggressionLevel определяет поведение
// ═══════════════════════════════════════════════════════════════════════════════

export interface AnimatronicState {
  id: string;
  type: string;           // Freddy, Bonnie, Chica, Foxy
  name: string;
  currentNode: string;
  hp: number;
  maxHp: number;
  damage: number;
  moveChance: number;     // Шанс перемещения (0-100)
  aggressionLevel: number;
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
