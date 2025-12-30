// Типы для игры SCaV (Scavs and Animatronics vs Players)

// Характеристики персонажа
export interface CharacterStats {
  attack: number;      // АТАКА
  defense: number;     // ЗАЩИТА
  speed: number;       // СКОРОСТЬ
  stealth: number;     // СКРЫТНОСТЬ
  luck: number;        // УДАЧА
  capacity: number;    // ВМЕСТИМОСТЬ
  hp: number;          // ХП
  maxHp: number;       // Максимальное ХП
  stamina: number;     // Очки выносливости (ход)
  maxStamina: number;  // Максимальная выносливость
}

// Типы слотов экипировки
export type EquipmentSlotType =
  | 'helmet'      // Шлем
  | 'armor'       // Броня
  | 'clothes'     // Одежда
  | 'pocket1'     // Карман 1
  | 'pocket2'     // Карман 2
  | 'pocket3'     // Карман 3
  | 'pocket4'     // Карман 4
  | 'special1'    // Спец слот 1
  | 'special2'    // Спец слот 2
  | 'special3'    // Спец слот 3
  | 'weapon'      // Оружие
  | 'scope'       // Прицел
  | 'tactical'    // ЛЦУ/Фонарь
  | 'suppressor'; // Глушитель

// Типы контейнеров
export type ContainerType = 'rig' | 'bag' | 'backpack';

// Предмет
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

// Эффект предмета
export interface ItemEffect {
  stat: keyof CharacterStats | 'roubles';
  value: number;
  type: 'add' | 'multiply' | 'set';
}

// Контейнер (разгрузка, сумка, рюкзак)
export interface Container {
  id: string;
  type: ContainerType;
  name: string;
  nameRu: string;
  slots: number;        // Количество слотов
  items: (string | null)[]; // ID предметов или null для пустых слотов
}

// Экипировка игрока
export interface Equipment {
  helmet: string | null;
  armor: string | null;
  clothes: string | null;
  pockets: (string | null)[];  // 4 кармана
  specials: (string | null)[]; // 3 спец слота
  weapon: string | null;
  scope: string | null;
  tactical: string | null;
  suppressor: string | null;
  rig: Container | null;       // Разгрузка (красные слоты)
  bag: Container | null;       // Сумка (синие слоты)
  backpack: Container | null;  // Рюкзак (оранжевые слоты)
}

// Расширенное состояние игрока
export interface PlayerState {
  id: string;
  name: string;
  currentNode: string;
  status: 'IDLE' | 'MOVING' | 'IN_COMBAT' | 'DEAD' | 'LOOTING' | 'IN_OFFICE';
  stats: CharacterStats;
  equipment: Equipment;
  inventory: string[];  // Legacy поле для совместимости
  roubles: number;      // Очки (рубли)
  turnActions: number;  // Оставшиеся действия в ходу
  gameLog: GameLogEntry[];
}

// Запись в логе игры
export interface GameLogEntry {
  timestamp: number;
  message: string;
  type: 'move' | 'loot' | 'combat' | 'event' | 'system';
}

// Уровень опасности локации
export type DangerLevel = 'safe' | 'low' | 'medium' | 'high' | 'extreme';

// Информация о локации (ноде)
export interface NodeInfo {
  id: string;
  name: string;
  nameRu: string;
  roomId: string;
  dangerLevel: DangerLevel;
  dangerPercent: number;   // Шанс перемещения аниматроника (0-100)
  possibleLoot: LootEntry[];
  animatronics: string[];  // ID аниматроников в этой точке
  players: string[];       // ID игроков в этой точке
}

// Запись о возможном луте
export interface LootEntry {
  itemId: string;
  chance: number;    // Шанс выпадения (0-100)
  minCount: number;
  maxCount: number;
}

// Тип локации по луту
export type LocationLootType = 'rare' | 'common' | 'supplies';

// Аниматроник
export interface AnimatronicState {
  id: string;
  type: string;
  name: string;
  currentNode: string;
  hp: number;
  maxHp: number;
  damage: number;
  moveChance: number;  // Шанс перемещения (0-100)
  aggressionLevel: number;
}

// Состояние игры
export interface GameState {
  id: string;
  currentNight: number;      // Текущая ночь (1-5)
  currentHour: number;       // Текущий час (12-6)
  dayNumber: number;         // Текущий день (1-10)
  isNight: boolean;
  turnPhase: 'planning' | 'action' | 'animatronic' | 'resolution';
  players: Record<string, PlayerState>;
  animatronics: Record<string, AnimatronicState>;
}

// Результат броска кубика
export interface DiceRoll {
  base: number;     // Базовое значение (1)
  roll: number;     // Результат d6
  total: number;    // Итого
  modifiers: number[];
}

// Действие игрока
export type PlayerAction = 'move' | 'loot' | 'use_item' | 'attack' | 'hide' | 'wait';

// Конфигурация камеры
export interface CameraConfig {
  nodeId: string;
  roomId: string;
  label: string;
  imageSrc: string;
  isWorking: boolean;
}
