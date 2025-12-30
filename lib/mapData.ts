// ============ КОМНАТЫ (ROOMS) ============
export const MAP_ROOMS = [
  { id: 'R_START', label: 'СТАРТ/ФИНИШ', labelEN: 'Start/Finish', box: [61, 2, 77, 12] },
  { id: 'R_STAGE', label: 'СЦЕНА', labelEN: 'Stage', box: [32, 2, 59, 12] },
  { id: 'R_MAIN', label: 'СТОЛОВАЯ', labelEN: 'Dining Area', box: [15, 12, 77, 58] },
  { id: 'R_BACK', label: 'МАСТЕРСКАЯ', labelEN: 'Backstage', box: [2, 12, 15, 34] },
  { id: 'R_COVE', label: 'ПИРАТСКАЯ БУХТА', labelEN: 'Pirate Cove', box: [5, 38, 15, 53] },
  { id: 'R_WEST', label: 'КОРИДОР А', labelEN: 'West Hall', box: [27, 58, 37, 98] },
  { id: 'R_CLST', label: 'КЛАДОВКА', labelEN: 'Supply Closet', box: [14, 63, 27, 84] },
  { id: 'R_EAST', label: 'КОРИДОР Б', labelEN: 'East Hall', box: [54, 58, 64, 98] },
  { id: 'R_KITCH', label: 'КУХНЯ', labelEN: 'Kitchen', box: [64, 58, 90, 79] },
  { id: 'R_REST_HALL', label: 'КОРИДОР УБОРНЫХ', labelEN: 'Restrooms Hall', box: [77, 19, 83, 58] },
  { id: 'R_REST_M', label: 'М. УБОРНАЯ', labelEN: 'M. Restroom', box: [83, 19, 98, 38] },
  { id: 'R_REST_F', label: 'Ж. УБОРНАЯ', labelEN: 'F. Restroom', box: [83, 39, 98, 58] },
  { id: 'R_OFFICE', label: 'ОФИС', labelEN: 'Office', box: [37, 80, 54, 98] }
];

// ============ ДВЕРИ И ПРОХОДЫ (DOORS) ============
export const MAP_DOORS = [
  { from: "R_START", to: "R_MAIN", pos: [69, 12], width: 6, type: "DOOR", axis: "X" },
  { from: "R_STAGE", to: "R_MAIN", pos: [45, 12], width: 10, type: "OPENING", axis: "X" },
  { from: "R_BACK", to: "R_MAIN", pos: [15, 23], width: 4, type: "DOOR", axis: "Y" },
  { from: "R_COVE", to: "R_MAIN", pos: [15, 45], width: 6, type: "CURTAIN_OPENING", axis: "Y" },
  { from: "R_REST_HALL", to: "R_MAIN", pos: [77, 28], width: 4, type: "DOOR", axis: "Y" },
  { from: "R_REST_HALL", to: "R_REST_M", pos: [83, 33], width: 4, type: "DOOR_SIDE", axis: "Y" },
  { from: "R_REST_HALL", to: "R_REST_F", pos: [83, 53], width: 4, type: "DOOR_SIDE", axis: "Y" },
  { from: "R_WEST", to: "R_MAIN", pos: [32, 58], width: 6, type: "HALLWAY", axis: "X" },
  { from: "R_EAST", to: "R_MAIN", pos: [59, 58], width: 6, type: "HALLWAY", axis: "X" },
  { from: "R_CLST", to: "R_WEST", pos: [27, 73], width: 4, type: "DOOR", axis: "Y" },
  { from: "R_KITCH", to: "R_MAIN", pos: [73, 58], width: 4, type: "DOOR_HIDDEN", axis: "X" },
  { from: "R_WEST", to: "R_OFFICE", pos: [37, 90], width: 4, type: "DOOR_SIDE", axis: "Y" },
  { from: "R_EAST", to: "R_OFFICE", pos: [54, 90], width: 4, type: "DOOR_SIDE", axis: "Y" }
];

// ============ УЗЛЫ КАРТЫ (NODES) ============
export const MAP_NODES_DATA = [
  { id: "SF", label: "S/F", type: "START_FINISH", color: "Purple", pos: [69, 7], room: "R_START", neighbors: ["X"] },
  { id: "X", label: "<X>", type: "LOOP_DISTRIBUTOR", color: "Blue", pos: [60, 19], room: "R_MAIN", neighbors: ["1", "2"] },
  { id: "1", label: "1", type: "POI_EVENT", color: "Red", pos: [45, 8], room: "R_STAGE", neighbors: ["D"] },
  { id: "2", label: "2", type: "POI_EVENT", color: "Red", pos: [45, 45], room: "R_MAIN", neighbors: ["A"] },
  { id: "D", label: "Д", type: "WAYPOINT", color: "Green", pos: [31, 18], room: "R_MAIN", neighbors: ["9", "8"] },
  { id: "9", label: "9", type: "POI_EVENT", color: "Red", pos: [7, 25], room: "R_BACK", neighbors: ["D"] },
  { id: "8", label: "8", type: "POI_EVENT", color: "Red", pos: [20, 45], room: "R_MAIN", neighbors: ["G"] },
  { id: "G", label: "Г", type: "WAYPOINT", color: "Green", pos: [31, 45], room: "R_MAIN", neighbors: ["6"] },
  { id: "A", label: "А", type: "WAYPOINT", color: "Green", pos: [59, 45], room: "R_MAIN", neighbors: ["3", "4", "5"] },
  { id: "3", label: "3", type: "POI_EVENT", color: "Red", pos: [80, 38], room: "R_REST_HALL", neighbors: ["A"] },
  { id: "4", label: "4", type: "POI_EVENT", color: "Red", pos: [79, 68], room: "R_KITCH", neighbors: ["A"] },
  { id: "5", label: "5", type: "POI_EVENT", color: "Red", pos: [59, 65], room: "R_EAST", neighbors: ["B"] },
  { id: "6", label: "6", type: "POI_EVENT", color: "Red", pos: [31, 65], room: "R_WEST", neighbors: ["7", "V"] },
  { id: "7", label: "7", type: "POI_EVENT", color: "Red", pos: [19, 73], room: "R_CLST", neighbors: ["6"] },
  { id: "V", label: "В", type: "WAYPOINT", color: "Green", pos: [31, 90], room: "R_WEST", neighbors: ["Y"] },
  { id: "B", label: "Б", type: "WAYPOINT", color: "Green", pos: [59, 90], room: "R_EAST", neighbors: ["Y"] },
  { id: "Y", label: "<Y>", type: "LOOP_END", color: "Blue", pos: [45, 90], room: "R_OFFICE", neighbors: ["V", "B"] }
];

// ============ СВЯЗИ УЗЛОВ (EDGES) ============
export const MAP_EDGES = [
  // Вход в игру
  { from: "SF", to: "X", type: "SOLID" },

  // Ветвление "Север" (Путь Сцены) - DASHED для выбора
  { from: "X", to: "1", type: "DASHED" },
  { from: "1", to: "D", type: "SOLID" },
  { from: "D", to: "9", type: "SOLID" },
  { from: "9", to: "D", type: "SOLID" },
  { from: "D", to: "8", type: "SOLID" },

  // Ветвление "Центр" (Путь Столовой) - DASHED для выбора
  { from: "X", to: "2", type: "DASHED" },
  { from: "2", to: "A", type: "SOLID" },

  // Маршруты из Центра (Node A)
  { from: "A", to: "3", type: "SOLID" },
  { from: "3", to: "A", type: "SOLID" }, // Возврат из уборных
  { from: "A", to: "4", type: "SOLID" },
  { from: "4", to: "A", type: "SOLID" }, // Возврат из кухни
  { from: "A", to: "5", type: "SOLID" },

  // Левый Коридор (West Hall)
  { from: "8", to: "G", type: "SOLID" },
  { from: "G", to: "6", type: "SOLID" },
  { from: "6", to: "7", type: "SOLID" },
  { from: "7", to: "6", type: "SOLID" }, // Возврат из кладовки
  { from: "6", to: "V", type: "SOLID" },
  { from: "V", to: "Y", type: "SOLID" },
  { from: "Y", to: "V", type: "SOLID" }, // Разворот из офиса

  // Правый Коридор (East Hall)
  { from: "5", to: "B", type: "SOLID" },
  { from: "B", to: "Y", type: "SOLID" },
  { from: "Y", to: "B", type: "SOLID" } // Разворот из офиса
];

// ============ ЗОНЫ АНИМАТРОНИКОВ (ANIMATRONIC SPAWNS) ============
export const ANIMATRONIC_ZONES = {
  Foxy: { color: "#ef4444", nodes: ["D", "8", "G", "6", "V"] },
  Bonnie: { color: "#3b82f6", nodes: ["1", "X", "D", "9", "G", "6", "V"] },
  Chica: { color: "#eab308", nodes: ["1", "X", "2", "3", "4", "5", "A", "B"] },
  Freddy: { color: "#a16207", nodes: ["1", "9", "3", "4", "B", "7", "2"] },
  All: { color: "#9333ea", nodes: ["Y"] } // Офис - все аниматроники
};