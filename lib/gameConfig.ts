export type NodeConfig = {
  id: string;
  label: string;
  neighbors: string[];
  type?: 'safe' | 'danger' | 'loot'; // На будущее
};

// Хардкодим граф карты.
// Важно: node_01 должен быть связан с node_02 и т.д., чтобы валидация прохода работала.
export const MAP_NODES: Record<string, NodeConfig> = {
  "node_01": { 
    id: "node_01", 
    label: "Airlock (Start)", 
    neighbors: ["node_02", "node_03"] 
  },
  "node_02": { 
    id: "node_02", 
    label: "Corridor Alpha", 
    neighbors: ["node_01", "node_04"] 
  },
  "node_03": { 
    id: "node_03", 
    label: "Medbay", 
    neighbors: ["node_01"] 
  },
  "node_04": { 
    id: "node_04", 
    label: "Generator", 
    neighbors: ["node_02", "node_05"] 
  },
  "node_05": { 
    id: "node_05", 
    label: "Command Center", 
    neighbors: ["node_04"] 
  },
};