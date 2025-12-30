/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: lib/mapData.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Игровая карта пиццерии Freddy Fazbear's - топология, комнаты, ноды
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ CONSTANTS:                                                                  │
 * │   MAP_ROOMS          - Массив из 11 комнат с координатами box для SVG      │
 * │   MAP_NODES_DATA     - Массив из 18 узлов навигации (граф карты)           │
 * │   ROOM_IMAGES        - URL изображений комнат для камер                    │
 * │   DANGER_COLORS      - Tailwind классы для уровней опасности               │
 * │   DANGER_NAMES       - Русские названия уровней опасности                  │
 * │   LOOT_TYPE_COLORS   - Цвета типов лута (rare/common/supplies)             │
 * │                                                                             │
 * │ INTERFACES:                                                                 │
 * │   MapNodeData        - Структура узла карты                                │
 * │                                                                             │
 * │ FUNCTIONS:                                                                  │
 * │   getNodeById(id)         → MapNodeData | undefined                        │
 * │   getRoomById(id)         → Room | undefined                               │
 * │   getRoomByNodeId(nodeId) → Room | undefined                               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   ./types → DangerLevel, LootEntry, LocationLootType                       │
 * │                                                                             │
 * │ IMPORTED BY:                                                                │
 * │   lib/gameConfig.ts     → MAP_NODES_DATA, MapNodeData                      │
 * │   components/GameMap.tsx → MAP_ROOMS, MAP_NODES_DATA, DANGER_COLORS        │
 * │   components/InfoTab.tsx → getNodeById, DANGER_COLORS, DANGER_NAMES        │
 * │   components/CameraView.tsx → ROOM_IMAGES, getRoomByNodeId                 │
 * │   app/actions/gameActions.ts → MAP_NODES_DATA                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ MAP TOPOLOGY (ASCII)                                                        │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │                    ┌────────────┬─────────────┐                             │
 * │                    │   STAGE    │  START [SF] │                             │
 * │                    │    [1]     │             │                             │
 * │   ┌────────────────┼─[D]───────[X]───[KX]────┼──────┐                       │
 * │   │   WORKSHOP     │                         │  REST│                       │
 * │   │     [9]        │                         │  [3] │                       │
 * │   ├────────────────┤      DINING AREA        ├──────┤                       │
 * │   │  PIRATE COVE   │                         │KITCH │                       │
 * │   │     [8]───[G]──┼───[2]───────[A]─────────┤ [4]  │                       │
 * │   └────────────────┤                         └──────┘                       │
 * │                    │      │           │                                     │
 * │       ┌────────────┤     [6]         [5]────────────┐                       │
 * │       │  STORAGE   │      │           │   HALL B    │                       │
 * │       │   [7]      │      │           │             │                       │
 * │       └────────────┤     [V]         [B]            │                       │
 * │                    │      └────[Y]────┘             │                       │
 * │                    │        OFFICE                  │                       │
 * │                    └────────────────────────────────┘                       │
 * │                                                                             │
 * │ NODE TYPES:                                                                 │
 * │   SF = START_FINISH      - Точка входа/выхода                              │
 * │   X,Y = LOOP_DISTRIBUTOR/END - Распределители маршрутов                    │
 * │   1-9 = POI_EVENT        - Точки интереса с событиями                      │
 * │   A,B,D,G,V,KX = WAYPOINT - Промежуточные точки                            │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DANGER LEVELS                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │   safe     (0%)      - Безопасно (только SF)                               │
 * │   low      (15-20%)  - Низкий риск (3, 7, KX)                              │
 * │   medium   (30-45%)  - Средний риск (X, D, 9, G, A, 5, 6)                  │
 * │   high     (50-60%)  - Высокий риск (1, 2, 4, V, B)                        │
 * │   extreme  (70-80%)  - Критический (8, Y)                                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { DangerLevel, LootEntry, LocationLootType } from './types';

export const MAP_ROOMS = [
  { id: 'R_START', label: 'СТАРТ/ФИНИШ', labelEn: 'Start/Finish', box: [61, 2, 77, 12] },
  { id: 'R_STAGE', label: 'СЦЕНА', labelEn: 'Stage', box: [32, 2, 59, 12] },
  { id: 'R_MAIN', label: 'СТОЛОВАЯ', labelEn: 'Dining Area', box: [15, 12, 77, 58] },
  { id: 'R_BACK', label: 'МАСТЕРСКАЯ', labelEn: 'Workshop', box: [2, 12, 15, 34] },
  { id: 'R_COVE', label: 'ПИРАТСКАЯ БУХТА', labelEn: 'Pirate Cove', box: [5, 38, 15, 53] },
  { id: 'R_WEST', label: 'КОРИДОР А', labelEn: 'Hallway A', box: [27, 58, 37, 98] },
  { id: 'R_CLST', label: 'КЛАДОВКА', labelEn: 'Storage', box: [14, 63, 27, 84] },
  { id: 'R_EAST', label: 'КОРИДОР Б', labelEn: 'Hallway B', box: [54, 58, 64, 98] },
  { id: 'R_KITCH', label: 'КУХНЯ', labelEn: 'Kitchen', box: [64, 58, 90, 79] },
  { id: 'R_OFFICE', label: 'ОФИС', labelEn: 'Office', box: [37, 80, 54, 98] },
  { id: 'R_REST', label: 'УБОРНЫЕ', labelEn: 'Restrooms', box: [77, 25, 90, 45] }
];

export interface MapNodeData {
  id: string;
  type: 'START_FINISH' | 'LOOP_DISTRIBUTOR' | 'POI_EVENT' | 'WAYPOINT' | 'LOOP_END';
  pos: [number, number];
  neighbors: string[];
  roomId: string;
  nameRu: string;
  nameEn: string;
  dangerLevel: DangerLevel;
  dangerPercent: number;
  lootType: LocationLootType;
  possibleLoot: LootEntry[];
}

export const MAP_NODES_DATA: MapNodeData[] = [
  {
    id: "SF",
    type: "START_FINISH",
    pos: [69, 7],
    neighbors: ["X"],
    roomId: 'R_START',
    nameRu: 'Старт/Финиш',
    nameEn: 'Start/Finish',
    dangerLevel: 'safe',
    dangerPercent: 0,
    lootType: 'common',
    possibleLoot: []
  },
  {
    id: "X",
    type: "LOOP_DISTRIBUTOR",
    pos: [60, 19],
    neighbors: ["SF", "1", "2", "KX"],
    roomId: 'R_MAIN',
    nameRu: 'Распределитель',
    nameEn: 'Distributor',
    dangerLevel: 'medium',
    dangerPercent: 40,
    lootType: 'common',
    possibleLoot: [
      { itemId: 'bandage', chance: 30, minCount: 1, maxCount: 2 },
      { itemId: 'food', chance: 20, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "1",
    type: "POI_EVENT",
    pos: [45, 8],
    neighbors: ["D", "X"],
    roomId: 'R_STAGE',
    nameRu: 'Сцена',
    nameEn: 'Stage',
    dangerLevel: 'high',
    dangerPercent: 60,
    lootType: 'rare',
    possibleLoot: [
      { itemId: 'golden_freddy', chance: 5, minCount: 1, maxCount: 1 },
      { itemId: 'microphone', chance: 25, minCount: 1, maxCount: 1 },
      { itemId: 'guitar', chance: 15, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "2",
    type: "POI_EVENT",
    pos: [45, 45],
    neighbors: ["A", "G", "X"],
    roomId: 'R_MAIN',
    nameRu: 'Центр столовой',
    nameEn: 'Dining Center',
    dangerLevel: 'high',
    dangerPercent: 55,
    lootType: 'common',
    possibleLoot: [
      { itemId: 'pizza', chance: 40, minCount: 1, maxCount: 3 },
      { itemId: 'soda', chance: 35, minCount: 1, maxCount: 2 },
      { itemId: 'party_hat', chance: 20, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "D",
    type: "WAYPOINT",
    pos: [31, 18],
    neighbors: ["1", "9", "G"],
    roomId: 'R_MAIN',
    nameRu: 'Перекрёсток Д',
    nameEn: 'Junction D',
    dangerLevel: 'medium',
    dangerPercent: 35,
    lootType: 'common',
    possibleLoot: [
      { itemId: 'flashlight', chance: 15, minCount: 1, maxCount: 1 },
      { itemId: 'batteries', chance: 30, minCount: 1, maxCount: 2 }
    ]
  },
  {
    id: "9",
    type: "POI_EVENT",
    pos: [7, 25],
    neighbors: ["D"],
    roomId: 'R_BACK',
    nameRu: 'Мастерская',
    nameEn: 'Workshop',
    dangerLevel: 'medium',
    dangerPercent: 30,
    lootType: 'rare',
    possibleLoot: [
      { itemId: 'wrench', chance: 40, minCount: 1, maxCount: 1 },
      { itemId: 'spare_parts', chance: 50, minCount: 1, maxCount: 3 },
      { itemId: 'golden_cupcake', chance: 8, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "8",
    type: "POI_EVENT",
    pos: [10, 45],
    neighbors: ["G"],
    roomId: 'R_COVE',
    nameRu: 'Пиратская бухта',
    nameEn: 'Pirate Cove',
    dangerLevel: 'extreme',
    dangerPercent: 80,
    lootType: 'rare',
    possibleLoot: [
      { itemId: 'hook', chance: 30, minCount: 1, maxCount: 1 },
      { itemId: 'eyepatch', chance: 25, minCount: 1, maxCount: 1 },
      { itemId: 'foxy_plush', chance: 10, minCount: 1, maxCount: 1 },
      { itemId: 'treasure_map', chance: 5, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "G",
    type: "WAYPOINT",
    pos: [31, 45],
    neighbors: ["D", "2", "8", "6"],
    roomId: 'R_MAIN',
    nameRu: 'Перекрёсток Г',
    nameEn: 'Junction G',
    dangerLevel: 'medium',
    dangerPercent: 40,
    lootType: 'common',
    possibleLoot: [
      { itemId: 'napkin', chance: 50, minCount: 1, maxCount: 5 },
      { itemId: 'coin', chance: 20, minCount: 1, maxCount: 3 }
    ]
  },
  {
    id: "A",
    type: "WAYPOINT",
    pos: [59, 45],
    neighbors: ["2", "3", "5"],
    roomId: 'R_MAIN',
    nameRu: 'Перекрёсток А',
    nameEn: 'Junction A',
    dangerLevel: 'medium',
    dangerPercent: 45,
    lootType: 'common',
    possibleLoot: [
      { itemId: 'cupcake', chance: 25, minCount: 1, maxCount: 2 },
      { itemId: 'balloon', chance: 30, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "KX",
    type: "WAYPOINT",
    pos: [69, 35],
    neighbors: ["X", "3"],
    roomId: 'R_MAIN',
    nameRu: 'Около уборных',
    nameEn: 'Near Restrooms',
    dangerLevel: 'low',
    dangerPercent: 20,
    lootType: 'supplies',
    possibleLoot: [
      { itemId: 'medkit', chance: 15, minCount: 1, maxCount: 1 },
      { itemId: 'bandage', chance: 35, minCount: 1, maxCount: 2 }
    ]
  },
  {
    id: "3",
    type: "POI_EVENT",
    pos: [80, 38],
    neighbors: ["KX", "4"],
    roomId: 'R_REST',
    nameRu: 'Уборные',
    nameEn: 'Restrooms',
    dangerLevel: 'low',
    dangerPercent: 15,
    lootType: 'supplies',
    possibleLoot: [
      { itemId: 'toilet_paper', chance: 60, minCount: 1, maxCount: 3 },
      { itemId: 'soap', chance: 40, minCount: 1, maxCount: 1 },
      { itemId: 'pills', chance: 10, minCount: 1, maxCount: 2 }
    ]
  },
  {
    id: "4",
    type: "POI_EVENT",
    pos: [79, 68],
    neighbors: ["3", "5"],
    roomId: 'R_KITCH',
    nameRu: 'Кухня (вход)',
    nameEn: 'Kitchen (entrance)',
    dangerLevel: 'high',
    dangerPercent: 50,
    lootType: 'supplies',
    possibleLoot: [
      { itemId: 'knife', chance: 30, minCount: 1, maxCount: 1 },
      { itemId: 'pan', chance: 25, minCount: 1, maxCount: 1 },
      { itemId: 'food', chance: 50, minCount: 1, maxCount: 3 }
    ]
  },
  {
    id: "5",
    type: "POI_EVENT",
    pos: [59, 65],
    neighbors: ["A", "4", "B"],
    roomId: 'R_EAST',
    nameRu: 'Коридор Б',
    nameEn: 'Hallway B',
    dangerLevel: 'medium',
    dangerPercent: 35,
    lootType: 'common',
    possibleLoot: [
      { itemId: 'poster', chance: 20, minCount: 1, maxCount: 1 },
      { itemId: 'coin', chance: 25, minCount: 1, maxCount: 2 }
    ]
  },
  {
    id: "6",
    type: "POI_EVENT",
    pos: [31, 65],
    neighbors: ["G", "7", "V"],
    roomId: 'R_WEST',
    nameRu: 'Коридор А',
    nameEn: 'Hallway A',
    dangerLevel: 'medium',
    dangerPercent: 35,
    lootType: 'common',
    possibleLoot: [
      { itemId: 'newspaper', chance: 30, minCount: 1, maxCount: 1 },
      { itemId: 'coin', chance: 25, minCount: 1, maxCount: 2 }
    ]
  },
  {
    id: "7",
    type: "POI_EVENT",
    pos: [19, 73],
    neighbors: ["6"],
    roomId: 'R_CLST',
    nameRu: 'Кладовка',
    nameEn: 'Storage',
    dangerLevel: 'low',
    dangerPercent: 20,
    lootType: 'rare',
    possibleLoot: [
      { itemId: 'key_card', chance: 15, minCount: 1, maxCount: 1 },
      { itemId: 'cleaning_supplies', chance: 45, minCount: 1, maxCount: 2 },
      { itemId: 'old_tape', chance: 20, minCount: 1, maxCount: 1 },
      { itemId: 'secret_note', chance: 8, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "V",
    type: "WAYPOINT",
    pos: [31, 90],
    neighbors: ["6", "Y"],
    roomId: 'R_WEST',
    nameRu: 'Вход в офис (запад)',
    nameEn: 'Office entrance (west)',
    dangerLevel: 'high',
    dangerPercent: 55,
    lootType: 'common',
    possibleLoot: []
  },
  {
    id: "B",
    type: "WAYPOINT",
    pos: [59, 90],
    neighbors: ["5", "Y"],
    roomId: 'R_EAST',
    nameRu: 'Вход в офис (восток)',
    nameEn: 'Office entrance (east)',
    dangerLevel: 'high',
    dangerPercent: 55,
    lootType: 'common',
    possibleLoot: []
  },
  {
    id: "Y",
    type: "LOOP_END",
    pos: [45, 90],
    neighbors: ["V", "B"],
    roomId: 'R_OFFICE',
    nameRu: 'Офис',
    nameEn: 'Office',
    dangerLevel: 'extreme',
    dangerPercent: 70,
    lootType: 'rare',
    possibleLoot: [
      { itemId: 'security_badge', chance: 20, minCount: 1, maxCount: 1 },
      { itemId: 'tablet', chance: 10, minCount: 1, maxCount: 1 },
      { itemId: 'phone', chance: 25, minCount: 1, maxCount: 1 },
      { itemId: 'purple_guy_note', chance: 3, minCount: 1, maxCount: 1 }
    ]
  }
];

// Изображения комнат для камер
export const ROOM_IMAGES: Record<string, string> = {
  'R_MAIN': 'https://i.pinimg.com/originals/80/c8/3c/80c83c3c46801c46cb326965d6a012d5.jpg',
  'R_STAGE': 'https://i.ytimg.com/vi/Bh5f_q9VJ9o/maxresdefault.jpg',
  'R_BACK': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/8/8a/BackstageCAM.png',
  'R_COVE': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/5/5c/PirateCoveCAM.png',
  'R_KITCH': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/7/78/KitchenCAM.png',
  'R_WEST': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/0/01/WestHallCAM.png',
  'R_EAST': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/e/e6/EastHallCAM.png',
  'R_OFFICE': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/3/3a/OfficeCAM.png',
  'R_REST': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/4/44/RestroomsCAM.png',
  'R_CLST': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/2/25/SupplyClosetCAM.png',
};

// Цвета уровней опасности
export const DANGER_COLORS: Record<DangerLevel, { bg: string; text: string; border: string }> = {
  safe: { bg: 'bg-green-900/50', text: 'text-green-400', border: 'border-green-500' },
  low: { bg: 'bg-blue-900/50', text: 'text-blue-400', border: 'border-blue-500' },
  medium: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', border: 'border-yellow-500' },
  high: { bg: 'bg-orange-900/50', text: 'text-orange-400', border: 'border-orange-500' },
  extreme: { bg: 'bg-red-900/50', text: 'text-red-400', border: 'border-red-500' }
};

// Названия уровней опасности на русском
export const DANGER_NAMES: Record<DangerLevel, string> = {
  safe: 'Безопасно',
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  extreme: 'Критический'
};

// Цвета типов лута
export const LOOT_TYPE_COLORS: Record<LocationLootType, string> = {
  rare: 'text-red-400',
  common: 'text-green-400',
  supplies: 'text-blue-400'
};

// Получить данные ноды по ID
export function getNodeById(nodeId: string): MapNodeData | undefined {
  return MAP_NODES_DATA.find(n => n.id === nodeId);
}

// Получить комнату по ID
export function getRoomById(roomId: string) {
  return MAP_ROOMS.find(r => r.id === roomId);
}

// Получить комнату по ноде
export function getRoomByNodeId(nodeId: string) {
  const node = getNodeById(nodeId);
  if (!node) return undefined;
  return getRoomById(node.roomId);
}
