/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: lib/mapData.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Игровая карта пиццерии Freddy Fazbear's - топология, комнаты, ноды
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEMANTIC ANCHORS INDEX:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * /START_ANCHOR:MAPDATA/IMPORTS ............... Импорты типов
 * /START_ANCHOR:MAPDATA/ROOMS ................. Константа MAP_ROOMS (13 комнат)
 * /START_ANCHOR:MAPDATA/JOINTS ................ Константа MAP_JOINTS (13 проходов)
 * /START_ANCHOR:MAPDATA/NODE_INTERFACE ........ Интерфейс MapNodeData
 * /START_ANCHOR:MAPDATA/NODES ................. Константа MAP_NODES_DATA (17 узлов)
 * /START_ANCHOR:MAPDATA/ANIMATRONIC_SPAWNS .... Константа ANIMATRONIC_SPAWNS
 * /START_ANCHOR:MAPDATA/ROOM_IMAGES ........... Константа ROOM_IMAGES
 * /START_ANCHOR:MAPDATA/DANGER_STYLING ........ Константы DANGER_COLORS, DANGER_NAMES
 * /START_ANCHOR:MAPDATA/HELPER_FUNCTIONS ...... Функции getNodeById, getRoomById и др.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPENDENCY GRAPH:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * IMPORTS FROM:
 *   ./types → DangerLevel, LootEntry, LocationLootType
 *
 * IMPORTED BY:
 *   lib/gameConfig.ts      → MAP_NODES_DATA, MapNodeData
 *   components/GameMap.tsx → MAP_ROOMS, MAP_NODES_DATA, MAP_JOINTS
 *   components/InfoTab.tsx → getNodeById, DANGER_COLORS, DANGER_NAMES
 *   app/actions/gameActions.ts → MAP_NODES_DATA, ANIMATRONIC_SPAWNS
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2024-12-31 | VERSION: 2.0.0 (с семантическими якорями)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:MAPDATA/IMPORTS
// Импорты типов из types.ts
// ═══════════════════════════════════════════════════════════════════════════════

import { DangerLevel, LootEntry, LocationLootType } from './types';

// /END_ANCHOR:MAPDATA/IMPORTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:MAPDATA/ROOMS
// Геометрия комнат для рендеринга подложки (13 комнат)
// КОНТРАКТ: box = [x1, y1, x2, y2] в процентах SVG viewBox
// ═══════════════════════════════════════════════════════════════════════════════

export const MAP_ROOMS = [
  { id: 'R_START', label: 'СТАРТ/ФИНИШ', labelEn: 'Start/Finish', box: [61, 2, 77, 12] },
  { id: 'R_STAGE', label: 'СЦЕНА', labelEn: 'Stage', box: [32, 2, 59, 12] },
  { id: 'R_MAIN', label: 'СТОЛОВАЯ', labelEn: 'Dining Area', box: [15, 12, 77, 58] },
  { id: 'R_BACK', label: 'МАСТЕРСКАЯ', labelEn: 'Backstage', box: [2, 12, 15, 34] },
  { id: 'R_COVE', label: 'ПИРАТСКАЯ БУХТА', labelEn: 'Pirate Cove', box: [5, 38, 15, 53] },
  { id: 'R_WEST', label: 'КОРИДОР А', labelEn: 'West Hall', box: [27, 58, 37, 98] },
  { id: 'R_CLST', label: 'КЛАДОВКА', labelEn: 'Supply Closet', box: [14, 63, 27, 84] },
  { id: 'R_EAST', label: 'КОРИДОР Б', labelEn: 'East Hall', box: [54, 58, 64, 98] },
  { id: 'R_KITCH', label: 'КУХНЯ', labelEn: 'Kitchen', box: [64, 58, 90, 79] },
  { id: 'R_OFFICE', label: 'ОФИС', labelEn: 'Office', box: [37, 80, 54, 98] },
  { id: 'R_REST_HALL', label: 'КОРИДОР УБОРНЫХ', labelEn: 'Restrooms Hall', box: [77, 19, 83, 58] },
  { id: 'R_REST_M', label: 'М. УБОРНАЯ', labelEn: 'M. Restroom', box: [83, 19, 98, 38] },
  { id: 'R_REST_F', label: 'Ж. УБОРНАЯ', labelEn: 'F. Restroom', box: [83, 39, 98, 58] }
];

// /END_ANCHOR:MAPDATA/ROOMS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:MAPDATA/JOINTS
// Дверные проёмы и проходы между комнатами (13 проходов)
// КОНТРАКТ: axis='X' - горизонтальный проём, axis='Y' - вертикальный
// ═══════════════════════════════════════════════════════════════════════════════

export type JointType = 'DOOR' | 'OPENING' | 'CURTAIN_OPENING' | 'DOOR_SIDE' | 'HALLWAY' | 'DOOR_HIDDEN';

export interface MapJoint {
  from: string;
  to: string;
  pos: [number, number];
  width: number;
  type: JointType;
  axis: 'X' | 'Y';
}

export const MAP_JOINTS: MapJoint[] = [
  { from: 'R_START', to: 'R_MAIN', pos: [69, 12], width: 6, type: 'DOOR', axis: 'X' },
  { from: 'R_STAGE', to: 'R_MAIN', pos: [45, 12], width: 10, type: 'OPENING', axis: 'X' },
  { from: 'R_BACK', to: 'R_MAIN', pos: [15, 23], width: 4, type: 'DOOR', axis: 'Y' },
  { from: 'R_COVE', to: 'R_MAIN', pos: [15, 45], width: 6, type: 'CURTAIN_OPENING', axis: 'Y' },
  { from: 'R_REST_HALL', to: 'R_MAIN', pos: [77, 28], width: 4, type: 'DOOR', axis: 'Y' },
  { from: 'R_REST_HALL', to: 'R_REST_M', pos: [83, 33], width: 4, type: 'DOOR_SIDE', axis: 'Y' },
  { from: 'R_REST_HALL', to: 'R_REST_F', pos: [83, 53], width: 4, type: 'DOOR_SIDE', axis: 'Y' },
  { from: 'R_WEST', to: 'R_MAIN', pos: [32, 58], width: 6, type: 'HALLWAY', axis: 'X' },
  { from: 'R_EAST', to: 'R_MAIN', pos: [59, 58], width: 6, type: 'HALLWAY', axis: 'X' },
  { from: 'R_CLST', to: 'R_WEST', pos: [27, 73], width: 4, type: 'DOOR', axis: 'Y' },
  { from: 'R_KITCH', to: 'R_MAIN', pos: [73, 58], width: 4, type: 'DOOR_HIDDEN', axis: 'X' },
  { from: 'R_WEST', to: 'R_OFFICE', pos: [37, 90], width: 4, type: 'DOOR_SIDE', axis: 'Y' },
  { from: 'R_EAST', to: 'R_OFFICE', pos: [54, 90], width: 4, type: 'DOOR_SIDE', axis: 'Y' }
];

// /END_ANCHOR:MAPDATA/JOINTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:MAPDATA/NODE_INTERFACE
// Интерфейс узла карты
// КОНТРАКТ: neighbors содержит только существующие id узлов
// ═══════════════════════════════════════════════════════════════════════════════

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

// /END_ANCHOR:MAPDATA/NODE_INTERFACE

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:MAPDATA/NODES
// Граф узлов навигации - 17 узлов
// КОНТРАКТ: Граф должен быть связным, SF - единственная точка входа
// ═══════════════════════════════════════════════════════════════════════════════

export const MAP_NODES_DATA: MapNodeData[] = [
  // START_FINISH - Точка входа/выхода
  {
    id: "SF", type: "START_FINISH", pos: [69, 7], neighbors: ["X"],
    roomId: 'R_START', nameRu: 'Старт/Финиш', nameEn: 'Start/Finish',
    dangerLevel: 'safe', dangerPercent: 0, lootType: 'common', possibleLoot: []
  },

  // LOOP_DISTRIBUTOR - Распределитель маршрутов
  {
    id: "X", type: "LOOP_DISTRIBUTOR", pos: [60, 19], neighbors: ["SF", "1", "2"],
    roomId: 'R_MAIN', nameRu: 'Распределитель', nameEn: 'Distributor',
    dangerLevel: 'medium', dangerPercent: 40, lootType: 'common',
    possibleLoot: [
      { itemId: 'bandage', chance: 30, minCount: 1, maxCount: 2 },
      { itemId: 'food', chance: 20, minCount: 1, maxCount: 1 }
    ]
  },

  // POI_EVENT NODES - Точки интереса (1-9)
  {
    id: "1", type: "POI_EVENT", pos: [45, 8], neighbors: ["X", "D"],
    roomId: 'R_STAGE', nameRu: 'Сцена', nameEn: 'Stage',
    dangerLevel: 'high', dangerPercent: 60, lootType: 'rare',
    possibleLoot: [
      { itemId: 'golden_freddy', chance: 5, minCount: 1, maxCount: 1 },
      { itemId: 'microphone', chance: 25, minCount: 1, maxCount: 1 },
      { itemId: 'guitar', chance: 15, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "2", type: "POI_EVENT", pos: [45, 45], neighbors: ["X", "A"],
    roomId: 'R_MAIN', nameRu: 'Центр столовой', nameEn: 'Dining Center',
    dangerLevel: 'high', dangerPercent: 55, lootType: 'common',
    possibleLoot: [
      { itemId: 'pizza', chance: 40, minCount: 1, maxCount: 3 },
      { itemId: 'soda', chance: 35, minCount: 1, maxCount: 2 },
      { itemId: 'party_hat', chance: 20, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "3", type: "POI_EVENT", pos: [80, 38], neighbors: ["A"],
    roomId: 'R_REST_HALL', nameRu: 'Уборные', nameEn: 'Restrooms',
    dangerLevel: 'low', dangerPercent: 15, lootType: 'supplies',
    possibleLoot: [
      { itemId: 'toilet_paper', chance: 60, minCount: 1, maxCount: 3 },
      { itemId: 'soap', chance: 40, minCount: 1, maxCount: 1 },
      { itemId: 'pills', chance: 10, minCount: 1, maxCount: 2 }
    ]
  },
  {
    id: "4", type: "POI_EVENT", pos: [79, 68], neighbors: ["A"],
    roomId: 'R_KITCH', nameRu: 'Кухня', nameEn: 'Kitchen',
    dangerLevel: 'high', dangerPercent: 50, lootType: 'supplies',
    possibleLoot: [
      { itemId: 'knife', chance: 30, minCount: 1, maxCount: 1 },
      { itemId: 'pan', chance: 25, minCount: 1, maxCount: 1 },
      { itemId: 'food', chance: 50, minCount: 1, maxCount: 3 }
    ]
  },
  {
    id: "5", type: "POI_EVENT", pos: [59, 65], neighbors: ["A", "B"],
    roomId: 'R_EAST', nameRu: 'Коридор Б', nameEn: 'East Hall',
    dangerLevel: 'medium', dangerPercent: 35, lootType: 'common',
    possibleLoot: [
      { itemId: 'poster', chance: 20, minCount: 1, maxCount: 1 },
      { itemId: 'coin', chance: 25, minCount: 1, maxCount: 2 }
    ]
  },
  {
    id: "6", type: "POI_EVENT", pos: [31, 65], neighbors: ["G", "7", "V"],
    roomId: 'R_WEST', nameRu: 'Коридор А', nameEn: 'West Hall',
    dangerLevel: 'medium', dangerPercent: 35, lootType: 'common',
    possibleLoot: [
      { itemId: 'newspaper', chance: 30, minCount: 1, maxCount: 1 },
      { itemId: 'coin', chance: 25, minCount: 1, maxCount: 2 }
    ]
  },
  {
    id: "7", type: "POI_EVENT", pos: [19, 73], neighbors: ["6"],
    roomId: 'R_CLST', nameRu: 'Кладовка', nameEn: 'Supply Closet',
    dangerLevel: 'low', dangerPercent: 20, lootType: 'rare',
    possibleLoot: [
      { itemId: 'key_card', chance: 15, minCount: 1, maxCount: 1 },
      { itemId: 'cleaning_supplies', chance: 45, minCount: 1, maxCount: 2 },
      { itemId: 'old_tape', chance: 20, minCount: 1, maxCount: 1 },
      { itemId: 'secret_note', chance: 8, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "8", type: "POI_EVENT", pos: [20, 45], neighbors: ["D", "G"],
    roomId: 'R_COVE', nameRu: 'Пиратская бухта', nameEn: 'Pirate Cove',
    dangerLevel: 'extreme', dangerPercent: 80, lootType: 'rare',
    possibleLoot: [
      { itemId: 'hook', chance: 30, minCount: 1, maxCount: 1 },
      { itemId: 'eyepatch', chance: 25, minCount: 1, maxCount: 1 },
      { itemId: 'foxy_plush', chance: 10, minCount: 1, maxCount: 1 },
      { itemId: 'treasure_map', chance: 5, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "9", type: "POI_EVENT", pos: [7, 25], neighbors: ["D"],
    roomId: 'R_BACK', nameRu: 'Мастерская', nameEn: 'Backstage',
    dangerLevel: 'medium', dangerPercent: 30, lootType: 'rare',
    possibleLoot: [
      { itemId: 'wrench', chance: 40, minCount: 1, maxCount: 1 },
      { itemId: 'spare_parts', chance: 50, minCount: 1, maxCount: 3 },
      { itemId: 'golden_cupcake', chance: 8, minCount: 1, maxCount: 1 }
    ]
  },

  // WAYPOINT NODES - Промежуточные точки (A, B, D, G, V)
  {
    id: "D", type: "WAYPOINT", pos: [31, 18], neighbors: ["1", "9", "8"],
    roomId: 'R_MAIN', nameRu: 'Перекрёсток Д', nameEn: 'Junction D',
    dangerLevel: 'medium', dangerPercent: 35, lootType: 'common',
    possibleLoot: [
      { itemId: 'flashlight', chance: 15, minCount: 1, maxCount: 1 },
      { itemId: 'batteries', chance: 30, minCount: 1, maxCount: 2 }
    ]
  },
  {
    id: "G", type: "WAYPOINT", pos: [31, 45], neighbors: ["8", "6"],
    roomId: 'R_MAIN', nameRu: 'Перекрёсток Г', nameEn: 'Junction G',
    dangerLevel: 'medium', dangerPercent: 40, lootType: 'common',
    possibleLoot: [
      { itemId: 'napkin', chance: 50, minCount: 1, maxCount: 5 },
      { itemId: 'coin', chance: 20, minCount: 1, maxCount: 3 }
    ]
  },
  {
    id: "A", type: "WAYPOINT", pos: [59, 45], neighbors: ["2", "3", "4", "5"],
    roomId: 'R_MAIN', nameRu: 'Перекрёсток А', nameEn: 'Junction A',
    dangerLevel: 'medium', dangerPercent: 45, lootType: 'common',
    possibleLoot: [
      { itemId: 'cupcake', chance: 25, minCount: 1, maxCount: 2 },
      { itemId: 'balloon', chance: 30, minCount: 1, maxCount: 1 }
    ]
  },
  {
    id: "V", type: "WAYPOINT", pos: [31, 90], neighbors: ["6", "Y"],
    roomId: 'R_WEST', nameRu: 'Вход в офис (запад)', nameEn: 'Office entrance (west)',
    dangerLevel: 'high', dangerPercent: 55, lootType: 'common', possibleLoot: []
  },
  {
    id: "B", type: "WAYPOINT", pos: [59, 90], neighbors: ["5", "Y"],
    roomId: 'R_EAST', nameRu: 'Вход в офис (восток)', nameEn: 'Office entrance (east)',
    dangerLevel: 'high', dangerPercent: 55, lootType: 'common', possibleLoot: []
  },

  // LOOP_END - Конечная точка маршрута (Офис)
  {
    id: "Y", type: "LOOP_END", pos: [45, 90], neighbors: ["V", "B"],
    roomId: 'R_OFFICE', nameRu: 'Офис', nameEn: 'Office',
    dangerLevel: 'extreme', dangerPercent: 70, lootType: 'rare',
    possibleLoot: [
      { itemId: 'security_badge', chance: 20, minCount: 1, maxCount: 1 },
      { itemId: 'tablet', chance: 10, minCount: 1, maxCount: 1 },
      { itemId: 'phone', chance: 25, minCount: 1, maxCount: 1 },
      { itemId: 'purple_guy_note', chance: 3, minCount: 1, maxCount: 1 }
    ]
  }
];

// /END_ANCHOR:MAPDATA/NODES

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:MAPDATA/ANIMATRONIC_SPAWNS
// Допустимые узлы для каждого аниматроника
// КОНТРАКТ: Все аниматроники могут появляться в офисе (Y)
// ═══════════════════════════════════════════════════════════════════════════════

export type AnimatronicType = 'foxy' | 'bonnie' | 'chica' | 'freddy';

export interface AnimatronicSpawnData {
  id: AnimatronicType;
  nameRu: string;
  nameEn: string;
  color: string;
  allowedNodes: string[];
}

export const ANIMATRONIC_SPAWNS: AnimatronicSpawnData[] = [
  { id: 'foxy', nameRu: 'Фокси', nameEn: 'Foxy', color: '#EF4444',
    allowedNodes: ['8', 'D', 'G', '6', 'V'] },
  { id: 'bonnie', nameRu: 'Бонни', nameEn: 'Bonnie', color: '#3B82F6',
    allowedNodes: ['7', '1', 'X', 'D', '9', 'G', '6', 'V'] },
  { id: 'chica', nameRu: 'Чика', nameEn: 'Chica', color: '#EAB308',
    allowedNodes: ['4', '1', 'X', '2', '3', '5', 'A', 'B'] },
  { id: 'freddy', nameRu: 'Фредди', nameEn: 'Freddy', color: '#92400E',
    allowedNodes: ['1', '9', '3', '4', 'B', '7', '2'] }
];

export const OFFICE_NODE_ID = 'Y';

export function canAnimatronicSpawnAt(animatronicId: AnimatronicType, nodeId: string): boolean {
  if (nodeId === OFFICE_NODE_ID) return true;
  const animatronic = ANIMATRONIC_SPAWNS.find(a => a.id === animatronicId);
  return animatronic?.allowedNodes.includes(nodeId) ?? false;
}

export function getAnimatronicsForNode(nodeId: string): AnimatronicType[] {
  if (nodeId === OFFICE_NODE_ID) return ['foxy', 'bonnie', 'chica', 'freddy'];
  return ANIMATRONIC_SPAWNS.filter(a => a.allowedNodes.includes(nodeId)).map(a => a.id);
}

// /END_ANCHOR:MAPDATA/ANIMATRONIC_SPAWNS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:MAPDATA/ROOM_IMAGES
// URL изображений комнат для камер
// КОНТРАКТ: Ключи соответствуют id комнат из MAP_ROOMS
// ═══════════════════════════════════════════════════════════════════════════════

export const ROOM_IMAGES: Record<string, string> = {
  'R_START': '/cameras/cam_enter.jpg',
  'R_MAIN': '/cameras/cam_main.jpg',
  'R_STAGE': '/cameras/cam_stage.jpg',
  'R_BACK': '/cameras/cam_backstage.jpg',
  'R_COVE': '/cameras/cam_cove.jpg',
  'R_KITCH': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/d/d3/Kitchen.jpg/revision/latest?cb=20140825003350',
  'R_WEST': '/cameras/cam_westhall.jpg',
  'R_EAST': '/cameras/cam_easthall.jpg',
  'R_OFFICE': '/cameras/cam_office.jpg',
  'R_REST_HALL': '/cameras/cam_restrooms.jpg',
  'R_REST_M': '/cameras/cam_restrooms.jpg',
  'R_REST_F': '/cameras/cam_restrooms.jpg',
  'R_CLST': '/cameras/cam_closet.jpg',
};

// /END_ANCHOR:MAPDATA/ROOM_IMAGES

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:MAPDATA/DANGER_STYLING
// Стилизация уровней опасности и типов лута (Tailwind классы)
// КОНТРАКТ: Ключи соответствуют DangerLevel и LocationLootType из types.ts
// ═══════════════════════════════════════════════════════════════════════════════

export const DANGER_COLORS: Record<DangerLevel, { bg: string; text: string; border: string }> = {
  safe: { bg: 'bg-green-900/50', text: 'text-green-400', border: 'border-green-500' },
  low: { bg: 'bg-blue-900/50', text: 'text-blue-400', border: 'border-blue-500' },
  medium: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', border: 'border-yellow-500' },
  high: { bg: 'bg-orange-900/50', text: 'text-orange-400', border: 'border-orange-500' },
  extreme: { bg: 'bg-red-900/50', text: 'text-red-400', border: 'border-red-500' }
};

export const DANGER_NAMES: Record<DangerLevel, string> = {
  safe: 'Безопасно',
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  extreme: 'Критический'
};

export const LOOT_TYPE_COLORS: Record<LocationLootType, string> = {
  rare: 'text-red-400',
  common: 'text-green-400',
  supplies: 'text-blue-400'
};

// /END_ANCHOR:MAPDATA/DANGER_STYLING

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:MAPDATA/HELPER_FUNCTIONS
// Вспомогательные функции для работы с картой
// ═══════════════════════════════════════════════════════════════════════════════

export function getNodeById(nodeId: string): MapNodeData | undefined {
  return MAP_NODES_DATA.find(n => n.id === nodeId);
}

export function getRoomById(roomId: string) {
  return MAP_ROOMS.find(r => r.id === roomId);
}

export function getRoomByNodeId(nodeId: string) {
  const node = getNodeById(nodeId);
  if (!node) return undefined;
  return getRoomById(node.roomId);
}

export function getJointBetweenRooms(roomId1: string, roomId2: string): MapJoint | undefined {
  return MAP_JOINTS.find(j =>
    (j.from === roomId1 && j.to === roomId2) ||
    (j.from === roomId2 && j.to === roomId1)
  );
}

// /END_ANCHOR:MAPDATA/HELPER_FUNCTIONS
