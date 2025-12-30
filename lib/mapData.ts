export const MAP_ROOMS = [
  { id: 'R_START', label: 'СТАРТ/ФИНИШ', box: [61, 2, 77, 12] },
  { id: 'R_STAGE', label: 'СЦЕНА', box: [32, 2, 59, 12] },
  { id: 'R_MAIN', label: 'СТОЛОВАЯ', box: [15, 12, 77, 58] },
  { id: 'R_BACK', label: 'МАСТЕРСКАЯ', box: [2, 12, 15, 34] },
  { id: 'R_COVE', label: 'ПИРАТСКАЯ БУХТА', box: [5, 38, 15, 53] },
  { id: 'R_WEST', label: 'КОРИДОР А', box: [27, 58, 37, 98] },
  { id: 'R_CLST', label: 'КЛАДОВКА', box: [14, 63, 27, 84] },
  { id: 'R_EAST', label: 'КОРИДОР Б', box: [54, 58, 64, 98] },
  { id: 'R_KITCH', label: 'КУХНЯ', box: [64, 58, 90, 79] },
  { id: 'R_OFFICE', label: 'ОФИС', box: [37, 80, 54, 98] }
];

export const MAP_NODES_DATA = [
  { id: "SF", type: "START_FINISH", pos: [69, 7], neighbors: ["X"] },
  { id: "X", type: "LOOP_DISTRIBUTOR", pos: [60, 19], neighbors: ["1", "2"] },
  { id: "1", type: "POI_EVENT", pos: [45, 8], neighbors: ["D"] },
  { id: "2", type: "POI_EVENT", pos: [45, 45], neighbors: ["A"] },
  { id: "D", type: "WAYPOINT", pos: [31, 18], neighbors: ["9", "8"] },
  { id: "9", type: "POI_EVENT", pos: [7, 25], neighbors: ["D"] },
  { id: "8", type: "POI_EVENT", pos: [20, 45], neighbors: ["G"] },
  { id: "G", type: "WAYPOINT", pos: [31, 45], neighbors: ["6"] },
  { id: "A", type: "WAYPOINT", pos: [59, 45], neighbors: ["3", "4", "5"] },
  { id: "3", type: "POI_EVENT", pos: [80, 38], neighbors: ["A"] },
  { id: "4", type: "POI_EVENT", pos: [79, 68], neighbors: ["A"] },
  { id: "5", type: "POI_EVENT", pos: [59, 65], neighbors: ["B"] },
  { id: "6", type: "POI_EVENT", pos: [31, 65], neighbors: ["7", "V"] },
  { id: "7", type: "POI_EVENT", pos: [19, 73], neighbors: ["6"] },
  { id: "V", type: "WAYPOINT", pos: [31, 90], neighbors: ["Y"] },
  { id: "B", type: "WAYPOINT", pos: [59, 90], neighbors: ["Y"] },
  { id: "Y", type: "LOOP_END", pos: [45, 90], neighbors: ["V", "B"] }
];