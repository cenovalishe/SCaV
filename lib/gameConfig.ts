/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: lib/gameConfig.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Конфигурация игры - преобразование данных карты для быстрого доступа
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ CONSTANTS:                                                                  │
 * │   MAP_NODES          - Record<string, MapNodeWithLabel> - индексированные  │
 * │                        ноды для O(1) доступа по ID                         │
 * │                                                                             │
 * │ INTERFACES:                                                                 │
 * │   MapNodeWithLabel   - Расширенный MapNodeData с полем label               │
 * │                                                                             │
 * │ FUNCTIONS:                                                                  │
 * │   getMapNode(nodeId)                    → MapNodeWithLabel | undefined     │
 * │   areNodesNeighbors(nodeId1, nodeId2)   → boolean                          │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   ./mapData → MAP_NODES_DATA, MapNodeData                                  │
 * │                                                                             │
 * │ IMPORTED BY:                                                                │
 * │   components/GameMap.tsx → MAP_NODES, getMapNode                           │
 * │   hooks/useGame.ts       → areNodesNeighbors                               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DATA TRANSFORMATION                                                         │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │ INPUT:  MAP_NODES_DATA (Array<MapNodeData>)                                │
 * │         [{id: "SF", ...}, {id: "X", ...}, ...]                             │
 * │                                                                             │
 * │ OUTPUT: MAP_NODES (Record<string, MapNodeWithLabel>)                       │
 * │         { "SF": {..., label: "Старт/Финиш"}, "X": {...}, ... }             │
 * │                                                                             │
 * │ Добавляется поле `label` = `nameRu` для совместимости со старым кодом      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { MAP_NODES_DATA, MapNodeData } from './mapData';

// Интерфейс узла с дополнительным полем label для совместимости
interface MapNodeWithLabel extends MapNodeData {
  label: string;
}

// Превращаем массив в объект для быстрого доступа по ID
export const MAP_NODES = MAP_NODES_DATA.reduce((acc, node) => {
  acc[node.id] = {
    ...node,
    label: node.nameRu // Добавляем label для совместимости со старым кодом
  };
  return acc;
}, {} as Record<string, MapNodeWithLabel>);

// Получить узел по ID
export function getMapNode(nodeId: string): MapNodeWithLabel | undefined {
  return MAP_NODES[nodeId];
}

// Проверить, являются ли узлы соседями
export function areNodesNeighbors(nodeId1: string, nodeId2: string): boolean {
  const node1 = MAP_NODES[nodeId1];
  return node1?.neighbors.includes(nodeId2) || false;
}
