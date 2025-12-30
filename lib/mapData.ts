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
 * │   MAP_ROOMS          - Массив из 13 комнат с координатами box для SVG      │
 * │   MAP_NODES_DATA     - Массив из 17 узлов навигации (граф карты)           │
 * │   MAP_JOINTS         - Массив из 13 дверных проёмов/проходов между комнатами│
 * │   ANIMATRONIC_SPAWNS - Допустимые ноды для каждого аниматроника            │
 * │   ROOM_IMAGES        - URL изображений комнат для камер                    │
 * │   DANGER_COLORS      - Tailwind классы для уровней опасности               │
 * │   DANGER_NAMES       - Русские названия уровней опасности                  │
 * │   LOOT_TYPE_COLORS   - Цвета типов лута (rare/common/supplies)             │
 * │                                                                             │
 * │ INTERFACES:                                                                 │
 * │   MapNodeData        - Структура узла карты                                │
 * │   MapJoint           - Структура дверного проёма/прохода                   │
 * │   AnimatronicSpawns  - Структура допустимых зон аниматроников              │
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
 * │   components/GameMap.tsx → MAP_ROOMS, MAP_NODES_DATA, MAP_JOINTS,          │
 * │                           DANGER_COLORS                                     │
 * │   components/InfoTab.tsx → getNodeById, DANGER_COLORS, DANGER_NAMES        │
 * │   components/CameraView.tsx → ROOM_IMAGES, getRoomByNodeId                 │
 * │   app/actions/gameActions.ts → MAP_NODES_DATA, ANIMATRONIC_SPAWNS          │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ MAP TOPOLOGY (ASCII)                                                        │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │                    ┌────────────┬─────────────┐                             │
 * │                    │   STAGE    │  START [SF] │                             │
 * │                    │    [1]     │             │                             │
 * │   ┌────────────────┼─[D]───────[X]───────────┼─────────┐                    │
 * │   │   WORKSHOP     │                         │ REST    │                    │
 * │   │     [9]        │         DINING          │ HALL    │───┬───────┐        │
 * │   ├────────────────┤          [2]            │  [3]    │REST│REST  │        │
 * │   │  PIRATE COVE   │                         ├─────────┤ M  │  F   │        │
 * │   │   [8]────[G]───┼─────────────[A]─────────┤ KITCHEN │    │      │        │
 * │   └────────────────┤                         │  [4]    │    │      │        │
 * │                    │      │           │      └─────────┴────┴──────┘        │
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
 * │   X = LOOP_DISTRIBUTOR   - Распределитель маршрутов (к Сцене или Столовой) │
 * │   Y = LOOP_END           - Конечная точка маршрута (Офис)                  │
 * │   1-9 = POI_EVENT        - Точки интереса с событиями                      │
 * │   A,B,D,G,V = WAYPOINT   - Промежуточные точки                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ PATH LOGIC (Directed Graph Edges)                                           │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ ENTRY:        SF → X                                                        │
 * │                                                                             │
 * │ NORTH BRANCH (Stage Path):                                                  │
 * │   X ─ ─> 1 → D → 9 (dead end, return to D)                                 │
 * │              D → 8 → G                                                      │
 * │                                                                             │
 * │ CENTER BRANCH (Dining Path):                                                │
 * │   X ─ ─> 2 → A (main junction)                                              │
 * │                                                                             │
 * │ FROM JUNCTION A:                                                            │
 * │   A → 3 (Restrooms, dead end)                                              │
 * │   A → 4 (Kitchen, dead end)                                                │
 * │   A → 5 → B → Y (East corridor to Office)                                  │
 * │                                                                             │
 * │ WEST CORRIDOR:                                                              │
 * │   G → 6 → 7 (Storage, dead end)                                            │
 * │        6 → V → Y (to Office)                                               │
 * │                                                                             │
 * │ OFFICE (Y):                                                                 │
 * │   Y ↔ V (west entrance)                                                    │
 * │   Y ↔ B (east entrance)                                                    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DANGER LEVELS                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │   safe     (0%)      - Безопасно (только SF)                               │
 * │   low      (15-20%)  - Низкий риск (3, 7)                                  │
 * │   medium   (30-45%)  - Средний риск (X, D, 9, G, A, 5, 6)                  │
 * │   high     (50-60%)  - Высокий риск (1, 2, 4, V, B)                        │
 * │   extreme  (70-80%)  - Критический (8, Y)                                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { DangerLevel, LootEntry, LocationLootType } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// ROOMS - Геометрия комнат для рендеринга подложки
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

// ═══════════════════════════════════════════════════════════════════════════════
// JOINTS - Дверные проёмы и проходы между комнатами
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

// ═══════════════════════════════════════════════════════════════════════════════
// NODE DATA INTERFACE
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

// ═══════════════════════════════════════════════════════════════════════════════
// NODE GRAPH - 17 узлов навигации
// ═══════════════════════════════════════════════════════════════════════════════

export const MAP_NODES_DATA: MapNodeData[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // START/FINISH - Точка входа/выхода
  // ─────────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  // LOOP_DISTRIBUTOR - Распределитель маршрутов (начало круга)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "X",
    type: "LOOP_DISTRIBUTOR",
    pos: [60, 19],
    neighbors: ["SF", "1", "2"],  // Removed KX, splits to Stage (1) or Dining (2)
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

  // ─────────────────────────────────────────────────────────────────────────────
  // POI_EVENT NODES - Точки интереса (1-9)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "1",
    type: "POI_EVENT",
    pos: [45, 8],
    neighbors: ["X", "D"],  // From X, to D
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
    neighbors: ["X", "A"],  // From X, to A
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
    id: "3",
    type: "POI_EVENT",
    pos: [80, 38],
    neighbors: ["A"],  // Dead end - only connects back to A
    roomId: 'R_REST_HALL',
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
    neighbors: ["A"],  // Dead end - only connects back to A (Kitchen)
    roomId: 'R_KITCH',
    nameRu: 'Кухня',
    nameEn: 'Kitchen',
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
    neighbors: ["A", "B"],  // From A, to B (East corridor)
    roomId: 'R_EAST',
    nameRu: 'Коридор Б',
    nameEn: 'East Hall',
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
    neighbors: ["G", "7", "V"],  // From G, to 7 (Storage) and V
    roomId: 'R_WEST',
    nameRu: 'Коридор А',
    nameEn: 'West Hall',
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
    neighbors: ["6"],  // Dead end - only connects back to 6
    roomId: 'R_CLST',
    nameRu: 'Кладовка',
    nameEn: 'Supply Closet',
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
    id: "8",
    type: "POI_EVENT",
    pos: [20, 45],  // Updated position per spec (was [10, 45])
    neighbors: ["D", "G"],  // From D, to G
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
    id: "9",
    type: "POI_EVENT",
    pos: [7, 25],
    neighbors: ["D"],  // Dead end - only connects back to D
    roomId: 'R_BACK',
    nameRu: 'Мастерская',
    nameEn: 'Backstage',
    dangerLevel: 'medium',
    dangerPercent: 30,
    lootType: 'rare',
    possibleLoot: [
      { itemId: 'wrench', chance: 40, minCount: 1, maxCount: 1 },
      { itemId: 'spare_parts', chance: 50, minCount: 1, maxCount: 3 },
      { itemId: 'golden_cupcake', chance: 8, minCount: 1, maxCount: 1 }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WAYPOINT NODES - Промежуточные точки (A, B, D, G, V)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "D",
    type: "WAYPOINT",
    pos: [31, 18],
    neighbors: ["1", "9", "8"],  // From 1, to 9 and 8 (removed G - path goes through 8)
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
    id: "G",
    type: "WAYPOINT",
    pos: [31, 45],
    neighbors: ["8", "6"],  // From 8, to 6 (path comes from D->8->G)
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
    neighbors: ["2", "3", "4", "5"],  // From 2, to 3 (dead end), 4 (dead end), and 5
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
    id: "V",
    type: "WAYPOINT",
    pos: [31, 90],
    neighbors: ["6", "Y"],  // From 6, to Y (Office west entrance)
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
    neighbors: ["5", "Y"],  // From 5, to Y (Office east entrance)
    roomId: 'R_EAST',
    nameRu: 'Вход в офис (восток)',
    nameEn: 'Office entrance (east)',
    dangerLevel: 'high',
    dangerPercent: 55,
    lootType: 'common',
    possibleLoot: []
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LOOP_END - Конечная точка маршрута (Офис)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "Y",
    type: "LOOP_END",
    pos: [45, 90],
    neighbors: ["V", "B"],  // Office endpoint - connects to both entrances
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

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATRONIC SPAWN ZONES - Допустимые узлы для каждого аниматроника
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
  {
    id: 'foxy',
    nameRu: 'Фокси',
    nameEn: 'Foxy',
    color: '#EF4444',  // Red
    allowedNodes: ['D', '8', 'G', '6', 'V']  // West corridor path
  },
  {
    id: 'bonnie',
    nameRu: 'Бонни',
    nameEn: 'Bonnie',
    color: '#3B82F6',  // Blue
    allowedNodes: ['1', 'X', 'D', '9', 'G', '6', 'V']  // North/West paths
  },
  {
    id: 'chica',
    nameRu: 'Чика',
    nameEn: 'Chica',
    color: '#EAB308',  // Yellow
    allowedNodes: ['1', 'X', '2', '3', '4', '5', 'A', 'B']  // East/Center paths
  },
  {
    id: 'freddy',
    nameRu: 'Фредди',
    nameEn: 'Freddy',
    color: '#92400E',  // Brown
    allowedNodes: ['1', '9', '3', '4', 'B', '7', '2']  // Various locations
  }
];

// All animatronics can appear in Office (Y) - final location
export const OFFICE_NODE_ID = 'Y';

// Helper: check if animatronic can spawn at node
export function canAnimatronicSpawnAt(animatronicId: AnimatronicType, nodeId: string): boolean {
  if (nodeId === OFFICE_NODE_ID) return true;  // All can appear in Office
  const animatronic = ANIMATRONIC_SPAWNS.find(a => a.id === animatronicId);
  return animatronic?.allowedNodes.includes(nodeId) ?? false;
}

// Helper: get all animatronics that can spawn at a node
export function getAnimatronicsForNode(nodeId: string): AnimatronicType[] {
  if (nodeId === OFFICE_NODE_ID) return ['foxy', 'bonnie', 'chica', 'freddy'];
  return ANIMATRONIC_SPAWNS
    .filter(a => a.allowedNodes.includes(nodeId))
    .map(a => a.id);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOM IMAGES - URL изображений комнат для камер
// ═══════════════════════════════════════════════════════════════════════════════

export const ROOM_IMAGES: Record<string, string> = {
  'R_START': 'https://i.pinimg.com/originals/80/c8/3c/80c83c3c46801c46cb326965d6a012d5.jpg',
  'R_MAIN': 'https://i.pinimg.com/originals/80/c8/3c/80c83c3c46801c46cb326965d6a012d5.jpg',
  'R_STAGE': 'https://i.ytimg.com/vi/Bh5f_q9VJ9o/maxresdefault.jpg',
  'R_BACK': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/8/8a/BackstageCAM.png',
  'R_COVE': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/5/5c/PirateCoveCAM.png',
  'R_KITCH': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/7/78/KitchenCAM.png',
  'R_WEST': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/0/01/WestHallCAM.png',
  'R_EAST': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/e/e6/EastHallCAM.png',
  'R_OFFICE': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/3/3a/OfficeCAM.png',
  'R_REST_HALL': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/4/44/RestroomsCAM.png',
  'R_REST_M': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/4/44/RestroomsCAM.png',
  'R_REST_F': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/4/44/RestroomsCAM.png',
  'R_CLST': 'https://static.wikia.nocookie.net/freddy-fazbears-pizza/images/2/25/SupplyClosetCAM.png',
};

// ═══════════════════════════════════════════════════════════════════════════════
// DANGER & LOOT STYLING
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

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
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
