/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: lib/gameConfig.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Конфигурация игры - преобразование данных карты для быстрого доступа
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEMANTIC ANCHORS INDEX:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * /START_ANCHOR:GAMECONFIG/IMPORTS ............ Импорты зависимостей
 * /START_ANCHOR:GAMECONFIG/INTERFACE .......... Интерфейс MapNodeWithLabel
 * /START_ANCHOR:GAMECONFIG/MAP_NODES .......... Константа MAP_NODES (Record)
 * /START_ANCHOR:GAMECONFIG/GET_MAP_NODE ....... Функция getMapNode()
 * /START_ANCHOR:GAMECONFIG/ARE_NEIGHBORS ...... Функция areNodesNeighbors()
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORTS OVERVIEW:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CONSTANTS:
 *   MAP_NODES          - Record<string, MapNodeWithLabel> - индексированные
 *                        ноды для O(1) доступа по ID
 *
 * INTERFACES:
 *   MapNodeWithLabel   - Расширенный MapNodeData с полем label
 *
 * FUNCTIONS:
 *   getMapNode(nodeId)                    → MapNodeWithLabel | undefined
 *   areNodesNeighbors(nodeId1, nodeId2)   → boolean
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPENDENCY GRAPH:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * IMPORTS FROM:
 *   ./mapData → MAP_NODES_DATA, MapNodeData
 *
 * IMPORTED BY:
 *   components/GameMap.tsx → MAP_NODES, getMapNode
 *   hooks/useGame.ts       → areNodesNeighbors
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2024-12-31 | VERSION: 2.0.0 (с семантическими якорями)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMECONFIG/IMPORTS
// Импорты данных карты
// ═══════════════════════════════════════════════════════════════════════════════

import { MAP_NODES_DATA, MapNodeData } from './mapData';

// /END_ANCHOR:GAMECONFIG/IMPORTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMECONFIG/INTERFACE
// Интерфейс узла с дополнительным полем label для совместимости
// КОНТРАКТ: label всегда равен nameRu
// ═══════════════════════════════════════════════════════════════════════════════

interface MapNodeWithLabel extends MapNodeData {
  label: string;
}

// /END_ANCHOR:GAMECONFIG/INTERFACE

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMECONFIG/MAP_NODES
// Преобразование массива в объект для O(1) доступа по ID
// КОНТРАКТ: Ключи соответствуют node.id, значения содержат label = nameRu
// ═══════════════════════════════════════════════════════════════════════════════

export const MAP_NODES = MAP_NODES_DATA.reduce((acc, node) => {
  acc[node.id] = {
    ...node,
    label: node.nameRu // Добавляем label для совместимости со старым кодом
  };
  return acc;
}, {} as Record<string, MapNodeWithLabel>);

// /END_ANCHOR:GAMECONFIG/MAP_NODES

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMECONFIG/GET_MAP_NODE
// Получить узел по ID
// КОНТРАКТ: Возвращает undefined если узел не найден
// ═══════════════════════════════════════════════════════════════════════════════

export function getMapNode(nodeId: string): MapNodeWithLabel | undefined {
  return MAP_NODES[nodeId];
}

// /END_ANCHOR:GAMECONFIG/GET_MAP_NODE

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:GAMECONFIG/ARE_NEIGHBORS
// Проверить, являются ли узлы соседями
// КОНТРАКТ: Возвращает true только если nodeId2 в списке neighbors nodeId1
// ═══════════════════════════════════════════════════════════════════════════════

export function areNodesNeighbors(nodeId1: string, nodeId2: string): boolean {
  const node1 = MAP_NODES[nodeId1];
  return node1?.neighbors.includes(nodeId2) || false;
}

// /END_ANCHOR:GAMECONFIG/ARE_NEIGHBORS
