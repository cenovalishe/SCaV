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
 * DATA STRUCTURES DETAIL:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CharacterStats (Характеристики):
 *   attack:5, defense:3, speed:4, stealth:3, luck:2, capacity:20
 *   hp/maxHp: 0-100, stamina/maxStamina: определяет очки действий за ход
 *
 * Equipment (Экипировка - EFT стиль):
 *   ┌────────────────────────────────────────┐
 *   │ [спец1][спец2][спец3]                  │
 *   │ [шлем ]                                │
 *   │ [броня]         [разг→ □□□□ ]          │
 *   │ [одежд]         [сумк→ □□□  ]          │
 *   │ [карм][карм][карм][карм] [рюкз→ □□□□□□]│
 *   │ [    оружие    ]                       │
 *   │ [приц][лцу/фон][глуш]                  │
 *   └────────────────────────────────────────┘
 *
 * PlayerState.status:
 *   IDLE → ожидание хода
 *   MOVING → в процессе перемещения
 *   IN_COMBAT → встреча с аниматроником
 *   LOOTING → собирает лут
 *   IN_OFFICE → в офисе (мини-игра выживания)
 *   DEAD → персонаж погиб
 *
 * GameState.turnPhase:
 *   planning → игроки планируют действия
 *   action → выполнение действий
 *   animatronic → ход аниматроников
 *   resolution → подсчёт результатов
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * GAME RULES CONTEXT:
 * ═══════════════════════════════════════════════════════════════════════════════
 *   - Игроки: 4-6 диких (scavs) из EFT
 *   - Продолжительность: 10 реальных дней, 5 игровых ночей
 *   - Ход: 1+d6 очков выносливости, действия: лутинг или перемещение
 *   - Победа: лидерство по рублям (ценность предметов)
 *   - Выход: активация кнопки в офисе
 *   - Аниматроники: перемещаются с шансом dangerPercent после хода игрока
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2024-12-30 | VERSION: 1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: CHARACTER STATS
// Характеристики персонажа игрока
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: EQUIPMENT SLOTS
// Типы слотов экипировки (EFT-стиль)
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: CONTAINERS
// Типы контейнеров для хранения предметов
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: ITEMS
// Предметы и их эффекты
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: PLAYER EQUIPMENT
// Полная структура экипировки игрока
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: PLAYER STATE
// Полное состояние игрока
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlayerState {
  id: string;
  name: string;
  currentNode: string;
  status: 'IDLE' | 'MOVING' | 'IN_COMBAT' | 'DEAD' | 'LOOTING' | 'IN_OFFICE';
  stats: CharacterStats;
  equipment: Equipment;
  inventory: string[];    // Legacy поле для совместимости
  roubles: number;        // Очки (рубли)
  turnActions: number;    // Оставшиеся действия в ходу
  gameLog: GameLogEntry[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: GAME LOG
// Логирование игровых событий
// ═══════════════════════════════════════════════════════════════════════════════

export interface GameLogEntry {
  timestamp: number;
  message: string;
  type: 'move' | 'loot' | 'combat' | 'event' | 'system';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: MAP & LOCATIONS
// Типы для карты и локаций
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: ANIMATRONICS
// Состояние аниматроников (враги)
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: GAME STATE
// Глобальное состояние игры
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

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: GAME MECHANICS
// Механики игры
// ═══════════════════════════════════════════════════════════════════════════════

export interface DiceRoll {
  base: number;       // Базовое значение (1)
  roll: number;       // Результат d6
  total: number;      // Итого
  modifiers: number[];
}

export type PlayerAction = 'move' | 'loot' | 'use_item' | 'attack' | 'hide' | 'wait';

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION: CAMERA SYSTEM
// Система камер наблюдения
// ═══════════════════════════════════════════════════════════════════════════════

export interface CameraConfig {
  nodeId: string;
  roomId: string;
  label: string;
  imageSrc: string;
  isWorking: boolean;
}
