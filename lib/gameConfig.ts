import { MAP_NODES_DATA } from './mapData';

// Превращаем массив в объект для быстрого доступа по ID, если нужно в других местах
export const MAP_NODES = MAP_NODES_DATA.reduce((acc, node) => {
  acc[node.id] = node;
  return acc;
}, {} as Record<string, any>);