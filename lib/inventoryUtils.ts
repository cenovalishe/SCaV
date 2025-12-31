import { ContainerSlotConfig, Item } from './types';

/**
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
