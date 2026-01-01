/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: lib/inventoryUtils.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Grid-based inventory collision detection and placement validation
 *          Implements Escape from Tarkov-style inventory system with variable item sizes
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * GRID SYSTEM OVERVIEW:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This module implements a 2D grid-based inventory system where:
 * - Each container slot has a grid size (e.g., 2x2, 1x2, 2x1, 1x1)
 * - Items occupy multiple grid cells based on their width × height
 * - Items must fit completely within the grid boundaries
 * - Items cannot overlap with already occupied cells
 *
 * COORDINATE SYSTEM:
 *   - Grid cells are indexed from 0 in row-major order (left-to-right, top-to-bottom)
 *   - For a 2x2 grid, indices are: [0, 1]
 *                                   [2, 3]
 *   - X coordinate = index % gridWidth (column)
 *   - Y coordinate = floor(index / gridWidth) (row)
 *
 * ITEM PLACEMENT:
 *   - Items are placed by specifying their top-left corner cell index
 *   - The item occupies a rectangular region: [startX, startY] to [startX+width, startY+height]
 *   - Placement is valid only if all required cells are free and within bounds
 *
 * USE CASES:
 *   - Drag-and-drop inventory UI (validate drop target)
 *   - Auto-sorting items into containers
 *   - Swapping items between slots
 *   - Collision detection when moving items
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORTS OVERVIEW:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * FUNCTIONS:
 *   getSlotGridWidth(slotType)                          → number
 *     Get grid width for a container slot size type
 *
 *   canPlaceItemInSlot(slotConfig, startIndex, item)    → boolean
 *     Check if an item can be placed at a specific grid position
 *
 *   getOccupiedIndices(slotConfig, startIndex, item)    → number[]
 *     Calculate all grid cell indices an item would occupy
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPENDENCY GRAPH:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * IMPORTS FROM:
 *   ./types → ContainerSlotConfig, Item
 *
 * IMPORTED BY:
 *   components/InventoryTab.tsx → All functions (drag-drop, item placement)
 *   app/actions/inventoryActions.ts → canPlaceItemInSlot (server-side validation)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ALGORITHM DETAILS:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * COLLISION DETECTION ALGORITHM (canPlaceItemInSlot):
 *   1. Convert flat startIndex to 2D grid coordinates (startX, startY)
 *   2. Calculate grid dimensions from slot configuration
 *   3. Boundary check: Ensure item doesn't extend beyond grid edges
 *      - Right edge: startX + item.width <= gridWidth
 *      - Bottom edge: startY + item.height <= gridHeight
 *   4. Occupancy check: Verify all required cells are free
 *      - Iterate through item's width × height rectangle
 *      - Convert each (x,y) to flat index: y * gridWidth + x
 *      - Check if cell is occupied (itemId or isOccupied flag)
 *   5. Return true only if all checks pass
 *
 * TIME COMPLEXITY:
 *   - getSlotGridWidth: O(1) - simple switch statement
 *   - canPlaceItemInSlot: O(W × H) where W=item.width, H=item.height
 *   - getOccupiedIndices: O(W × H) where W=item.width, H=item.height
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXAMPLES:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Example 1: Placing a 1x1 item in a 2x2 grid
 *   Grid layout:     [0, 1]
 *                    [2, 3]
 *   Item: { width: 1, height: 1 }
 *   Valid positions: 0, 1, 2, 3 (can place anywhere)
 *
 * Example 2: Placing a 2x1 item in a 2x2 grid
 *   Grid layout:     [0, 1]
 *                    [2, 3]
 *   Item: { width: 2, height: 1 }
 *   Valid positions: 0 (occupies [0,1]), 2 (occupies [2,3])
 *   Invalid positions: 1 (would extend beyond right edge), 3 (same)
 *
 * Example 3: Placing a 1x2 item in a 2x2 grid
 *   Grid layout:     [0, 1]
 *                    [2, 3]
 *   Item: { width: 1, height: 2 }
 *   Valid positions: 0 (occupies [0,2]), 1 (occupies [1,3])
 *   Invalid positions: 2 (would extend beyond bottom), 3 (same)
 *
 * Example 4: Collision detection with occupied cells
 *   Grid state:      [occupied, free]
 *                    [free, free]
 *   Item: { width: 2, height: 1 }
 *   Trying position 0: INVALID (cell 0 is occupied)
 *   Trying position 2: VALID (cells 2,3 are both free)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EDGE CASES:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Empty grid (0 subCells): All placements fail (gridHeight = 0)
 * - 1x1 grid: Only 1x1 items can be placed, only at index 0
 * - Item larger than grid: Always fails boundary check
 * - Negative dimensions: Not type-safe (Item interface requires positive width/height)
 * - startIndex out of bounds: Fails boundary check (calculated x,y will be invalid)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2026-01-01 | VERSION: 2.0.0 (comprehensive documentation)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ContainerSlotConfig, Item } from './types';

/**
 * Get the grid width for a container slot based on its size type.
 *
 * Maps container slot size configurations to their corresponding grid widths.
 * The height is calculated dynamically based on total cell count divided by width.
 *
 * @param slotType - The size configuration of the container slot ('1x1', '1x2', '2x1', '2x2')
 * @returns The grid width in cells (1 or 2)
 *
 * @example
 * ```typescript
 * getSlotGridWidth('2x2') // => 2 (2 columns)
 * getSlotGridWidth('2x1') // => 2 (2 columns)
 * getSlotGridWidth('1x2') // => 1 (1 column)
 * getSlotGridWidth('1x1') // => 1 (1 column)
 * ```
 *
 * @remarks
 * This function is used to convert slot size types into numeric grid dimensions
 * for coordinate calculations. The naming convention 'WxH' refers to width × height,
 * where width is the number of columns and height is the number of rows.
 *
 * Получает ширину сетки слота на основе его типа
 */
export function getSlotGridWidth(slotType: ContainerSlotConfig['size']): number {
  switch (slotType) {
    case '2x2': return 2;
    case '2x1': return 2;
    case '1x2': return 1;
    case '1x1': return 1;
    default: return 1;
  }
}

/**
 * Check if an item can be placed in a container slot at a specific grid position.
 *
 * This function performs comprehensive validation to determine if placing an item
 * at a given position would be valid, considering:
 * 1. Grid boundary constraints (item must fit within grid dimensions)
 * 2. Cell occupancy (all required cells must be free)
 * 3. Item dimensions (width × height rectangular region)
 *
 * @param slotConfig - The container slot configuration containing grid size and cell states
 * @param startIndex - The flat index of the top-left cell where placement is attempted (0-based)
 * @param item - The item to place, must have width and height properties
 * @returns `true` if the item can be legally placed at the position, `false` otherwise
 *
 * @example
 * ```typescript
 * const slotConfig = {
 *   size: '2x2',
 *   subCells: [
 *     { itemId: null, isOccupied: false }, // index 0
 *     { itemId: null, isOccupied: false }, // index 1
 *     { itemId: 'sword', isOccupied: true }, // index 2 (occupied)
 *     { itemId: null, isOccupied: false }, // index 3
 *   ]
 * };
 *
 * const medkit = { id: 'medkit', width: 1, height: 1 };
 * const rifle = { id: 'rifle', width: 2, height: 1 };
 *
 * canPlaceItemInSlot(slotConfig, 0, medkit) // => true (1x1 fits at top-left)
 * canPlaceItemInSlot(slotConfig, 2, medkit) // => false (cell 2 is occupied)
 * canPlaceItemInSlot(slotConfig, 0, rifle)  // => false (would overlap occupied cell 2)
 * canPlaceItemInSlot(slotConfig, 1, rifle)  // => false (would extend beyond right edge)
 * canPlaceItemInSlot(slotConfig, 1, medkit) // => true (1x1 fits at top-right)
 * ```
 *
 * @remarks
 * The function uses a row-major indexing system where indices increase left-to-right,
 * then top-to-bottom. For a 2x2 grid:
 * ```
 * [0, 1]
 * [2, 3]
 * ```
 *
 * Algorithm steps:
 * 1. Calculate grid dimensions (width from slot type, height from total cells)
 * 2. Convert startIndex to 2D coordinates (x = index % width, y = floor(index / width))
 * 3. Validate right boundary: startX + item.width <= gridWidth
 * 4. Validate bottom boundary: startY + item.height <= gridHeight
 * 5. Check all cells in item's footprint are unoccupied
 * 6. Return true only if all validations pass
 *
 * Time complexity: O(W × H) where W = item.width, H = item.height
 * Space complexity: O(1) - no additional data structures allocated
 *
 * @see {@link getOccupiedIndices} - To get the list of indices this item would occupy
 * @see {@link getSlotGridWidth} - To understand grid width calculation
 *
 * Проверяет, помещается ли предмет в слот на указанную позицию
 * @param slotConfig Конфигурация слота (например, 2x2)
 * @param startIndex Индекс под-ячейки, куда пытается нажать игрок (0-3)
 * @param item Предмет
 */
export function canPlaceItemInSlot(
  slotConfig: ContainerSlotConfig,
  startIndex: number,
  item: Item
): boolean {
  const gridWidth = getSlotGridWidth(slotConfig.size);
  
  // Рассчитываем общую высоту сетки слота
  // Для 2x2 это 4 ячейки / ширина 2 = высота 2
  // Для 1x2 это 2 ячейки / ширина 1 = высота 2
  const totalSubCells = slotConfig.subCells?.length || 0;
  const gridHeight = Math.ceil(totalSubCells / gridWidth);

  // Координаты целевой ячейки (куда кликнули)
  const startX = startIndex % gridWidth;
  const startY = Math.floor(startIndex / gridWidth);

  // 1. Проверка: Выходит ли предмет за границы сетки справа?
  if (startX + item.width > gridWidth) return false;

  // 2. Проверка: Выходит ли предмет за границы сетки снизу?
  if (startY + item.height > gridHeight) return false;

  // 3. Проверка: Свободны ли все необходимые ячейки?
  for (let y = 0; y < item.height; y++) {
    for (let x = 0; x < item.width; x++) {
      // Вычисляем плоский индекс для каждой части предмета
      const currentFlatIndex = (startY + y) * gridWidth + (startX + x);
      
      // Если ячейка уже занята кем-то другим
      const cell = slotConfig.subCells?.[currentFlatIndex];
      if (cell?.itemId || cell?.isOccupied) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Calculate all grid cell indices that would be occupied by an item.
 *
 * This function computes the complete "footprint" of an item when placed at a
 * specific grid position. It returns an array of all cell indices that the item
 * would cover, based on its dimensions and starting position.
 *
 * @param slotConfig - The container slot configuration defining grid dimensions
 * @param startIndex - The flat index of the top-left cell where the item would be placed (0-based)
 * @param item - The item whose occupied cells should be calculated (must have width and height)
 * @returns Array of cell indices (in row-major order) that the item would occupy
 *
 * @example
 * ```typescript
 * const slotConfig = { size: '2x2', subCells: [{}, {}, {}, {}] };
 *
 * // 1x1 item at position 0
 * const medkit = { id: 'medkit', width: 1, height: 1 };
 * getOccupiedIndices(slotConfig, 0, medkit)
 * // => [0]
 *
 * // 2x1 item at position 0 (occupies entire top row)
 * const rifle = { id: 'rifle', width: 2, height: 1 };
 * getOccupiedIndices(slotConfig, 0, rifle)
 * // => [0, 1]
 *
 * // 1x2 item at position 0 (occupies entire left column)
 * const shotgun = { id: 'shotgun', width: 1, height: 2 };
 * getOccupiedIndices(slotConfig, 0, shotgun)
 * // => [0, 2]
 *
 * // 2x2 item at position 0 (occupies entire grid)
 * const armor = { id: 'armor', width: 2, height: 2 };
 * getOccupiedIndices(slotConfig, 0, armor)
 * // => [0, 1, 2, 3]
 *
 * // 1x1 item at position 3 (bottom-right corner)
 * getOccupiedIndices(slotConfig, 3, medkit)
 * // => [3]
 * ```
 *
 * @remarks
 * This function is typically used in conjunction with {@link canPlaceItemInSlot}
 * to actually mark cells as occupied after validating placement:
 *
 * ```typescript
 * if (canPlaceItemInSlot(slotConfig, startIndex, item)) {
 *   const indices = getOccupiedIndices(slotConfig, startIndex, item);
 *   indices.forEach(idx => {
 *     slotConfig.subCells[idx].itemId = item.id;
 *     slotConfig.subCells[idx].isOccupied = true;
 *   });
 * }
 * ```
 *
 * The function does NOT validate whether the placement is legal - it simply
 * calculates what cells would be occupied. Use {@link canPlaceItemInSlot} first
 * to validate before using this function to update cell states.
 *
 * Algorithm:
 * 1. Calculate grid width from slot configuration
 * 2. Convert startIndex to 2D coordinates (startX, startY)
 * 3. Iterate through item's width × height rectangle
 * 4. For each (x, y) in the rectangle, compute flat index: (startY + y) * gridWidth + (startX + x)
 * 5. Collect all indices into an array and return
 *
 * Time complexity: O(W × H) where W = item.width, H = item.height
 * Space complexity: O(W × H) for the returned array
 *
 * @see {@link canPlaceItemInSlot} - Validate placement before using this function
 * @see {@link getSlotGridWidth} - Understand grid width calculation
 *
 * Возвращает индексы, которые займет предмет
 */
export function getOccupiedIndices(
  slotConfig: ContainerSlotConfig,
  startIndex: number,
  item: Item
): number[] {
  const indices: number[] = [];
  const gridWidth = getSlotGridWidth(slotConfig.size);
  const startX = startIndex % gridWidth;
  const startY = Math.floor(startIndex / gridWidth);

  for (let y = 0; y < item.height; y++) {
    for (let x = 0; x < item.width; x++) {
      indices.push((startY + y) * gridWidth + (startX + x));
    }
  }
  return indices;
}
