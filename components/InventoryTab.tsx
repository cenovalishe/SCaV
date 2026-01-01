/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/InventoryTab.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Компактная вкладка инвентаря с переменными размерами слотов (REDESIGNED v4.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES v4.0                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Исправлен баг обмена предметов (swap)                                     │
 * │ - Модули вместо scope/tactical/suppressor                                  │
 * │ - Проверка размера предметов при размещении                                │
 * │ - Ограничения типов для слотов экипировки                                  │
 * │ - Единый стиль ячеек 1x1                                                   │
 * │ - Компактная компоновка без пустого места                                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { useState, useCallback, DragEvent, MouseEvent } from 'react';
import { Equipment, Container, Item, SLOT_ALLOWED_SUBTYPES, ItemSubType } from '@/lib/types';
import { getItemById, calculateTotalValue, formatRoubles } from '@/lib/itemData';
import ItemPopup from './ItemPopup';

interface InventoryTabProps {
  equipment: Equipment;
  onEquipmentChange?: (newEquipment: Equipment) => void;
  onUseItem?: (itemId: string, slotType: string, index?: number) => void;
  onDropItem?: (itemId: string, slotType: string, index?: number) => void;
  currentStamina?: number;
}

interface DragSource {
  type: 'equipment' | 'container' | 'pocket';
  slot?: string;
  containerType?: 'rig' | 'bag' | 'backpack';
  index?: number;
  itemId: string;
}

interface SlotConfig {
  size: '1x1' | '2x1' | '2x2';
  index: number;
  subCellsCount?: number;
}

// Конфигурация слотов рюкзака: один 2x2 и один 2x1 (компактнее)
const BACKPACK_SLOTS: SlotConfig[] = [
  { size: '2x2', index: 0, subCellsCount: 4 },
  { size: '2x1', index: 1, subCellsCount: 2 },
];

// Конфигурация слотов разгрузки/сумки: один слот 2x2
const RIG_SLOTS: SlotConfig[] = [
  { size: '2x2', index: 0, subCellsCount: 4 },
];

const BAG_SLOTS: SlotConfig[] = [
  { size: '2x2', index: 0, subCellsCount: 4 },
];

// Базовый размер единичного слота (увеличен для лучшей видимости)
const SLOT_BASE_SIZE = 52; // px (было 44)
const SLOT_GAP = 2; // px

// ════════════════════════════════════════════════════════════════════════════════
// УТИЛИТЫ ДЛЯ ПРОВЕРКИ ОГРАНИЧЕНИЙ
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Проверяет, можно ли разместить предмет в указанный слот по типу
 */
function canPlaceItemInSlotByType(item: Item, slotType: string): boolean {
  const allowedSubTypes = SLOT_ALLOWED_SUBTYPES[slotType];
  if (!allowedSubTypes) return true; // Если ограничений нет - разрешаем

  // Определяем подтип предмета
  const itemSubType = item.subType || getDefaultSubType(item);

  // 'any' означает что предмет можно класть куда угодно
  if (itemSubType === 'any') return true;

  // Проверяем совпадение подтипа или разрешение 'any' в слоте
  return allowedSubTypes.includes(itemSubType) || allowedSubTypes.includes('any');
}

/**
 * Получает подтип по умолчанию на основе типа предмета
 */
function getDefaultSubType(item: Item): ItemSubType {
  switch (item.type) {
    case 'consumable': return 'consumable';
    case 'valuable': return 'valuable';
    case 'key': return 'key';
    case 'weapon': return 'weapon';
    case 'equipment': return 'any';
    case 'attachment': return 'module';
    default: return 'any';
  }
}

/**
 * Проверяет, помещается ли предмет в слот по размеру
 */
function canPlaceItemInSlotBySize(
  item: Item,
  slotType: '2x2' | '2x1' | '1x1',
  localIndex: number
): boolean {
  const itemWidth = item.width || 1;
  const itemHeight = item.height || 1;

  if (slotType === '1x1') {
    return itemWidth === 1 && itemHeight === 1;
  }

  if (slotType === '2x1') {
    // Горизонтальный слот - 2 ячейки в ряд
    const startX = localIndex % 2;
    // Предмет должен помещаться по ширине
    if (startX + itemWidth > 2) return false;
    // И по высоте (только 1 ряд)
    if (itemHeight > 1) return false;
    return true;
  }

  if (slotType === '2x2') {
    // Сетка 2x2
    const startX = localIndex % 2;
    const startY = Math.floor(localIndex / 2);
    // Предмет должен помещаться в границы
    if (startX + itemWidth > 2) return false;
    if (startY + itemHeight > 2) return false;
    return true;
  }

  return true;
}

// ════════════════════════════════════════════════════════════════════════════════
// КОМПОНЕНТЫ СЛОТОВ
// ════════════════════════════════════════════════════════════════════════════════

// Единый стиль подъячейки (используется во всех слотах)
function SubCell({
  itemId,
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  isDragOver,
  isInvalid = false,
  size = 'normal',
  color = 'zinc'
}: {
  itemId: string | null;
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onClick?: (e: MouseEvent) => void;
  isDragOver?: boolean;
  isInvalid?: boolean;
  size?: 'small' | 'normal';
  color?: 'zinc' | 'red' | 'blue' | 'orange';
}) {
  const item = itemId ? getItemById(itemId) : null;
  const dim = size === 'small' ? SLOT_BASE_SIZE - 6 : SLOT_BASE_SIZE - 4;

  const colorSchemes = {
    zinc: 'border-white/10 bg-black/30',
    red: 'border-red-500/20 bg-red-900/20',
    blue: 'border-blue-500/20 bg-blue-900/20',
    orange: 'border-orange-500/20 bg-orange-900/20',
  };

  return (
    <div
      draggable={!!item}
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e); }}
      onDrop={onDrop}
      onClick={onClick}
      className={`
        flex items-center justify-center rounded cursor-pointer
        border transition-all
        ${colorSchemes[color]}
        ${isDragOver && !isInvalid ? 'border-green-400 bg-green-900/30 scale-105' : ''}
        ${isDragOver && isInvalid ? 'border-red-500 bg-red-900/30' : ''}
        ${item ? 'hover:scale-[1.02] hover:border-white/20' : 'hover:border-white/15'}
      `}
      style={{ width: dim, height: dim }}
      title={item ? item.nameRu : '1x1'}
    >
      {item ? (
        <span className="text-lg drop-shadow-md">{item.icon}</span>
      ) : (
        <div className="text-white/10 text-[7px] font-mono">1x1</div>
      )}
    </div>
  );
}

// Компонент слота 2x2 с подъячейками
function SubCellSlot2x2({
  items,
  color = 'zinc',
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  dragOverTarget,
  baseIndex,
  invalidDropTarget
}: {
  items: (string | null)[];
  color?: 'zinc' | 'red' | 'blue' | 'orange';
  onDragStart?: (e: DragEvent, itemId: string, subCellIndex: number) => void;
  onDragOver?: (e: DragEvent, subCellIndex: number) => void;
  onDrop?: (e: DragEvent, subCellIndex: number) => void;
  onClick?: (e: MouseEvent, itemId: string, subCellIndex: number) => void;
  dragOverTarget?: number | null;
  baseIndex: number;
  invalidDropTarget?: boolean;
}) {
  const colorSchemes = {
    zinc: { bg: 'from-zinc-800 to-zinc-900', border: 'border-white/15' },
    red: { bg: 'from-red-900/40 to-red-950/40', border: 'border-red-500/30' },
    blue: { bg: 'from-blue-900/40 to-blue-950/40', border: 'border-blue-500/30' },
    orange: { bg: 'from-orange-900/40 to-orange-950/40', border: 'border-orange-500/30' },
  };
  const scheme = colorSchemes[color];

  // Анализируем какие предметы занимают какие ячейки
  const cellContents: { itemId: string | null; isMain: boolean; size: number }[] = [];
  const processedItems = new Set<string>();

  for (let i = 0; i < 4; i++) {
    const itemId = items[i];
    if (!itemId) {
      cellContents[i] = { itemId: null, isMain: true, size: 1 };
      continue;
    }

    if (processedItems.has(itemId)) {
      cellContents[i] = { itemId, isMain: false, size: 1 };
      continue;
    }

    const item = getItemById(itemId);
    const itemSize = item?.size || 1;
    processedItems.add(itemId);
    cellContents[i] = { itemId, isMain: true, size: itemSize };
  }

  return (
    <div
      className={`grid grid-cols-2 gap-0.5 p-0.5 bg-gradient-to-br ${scheme.bg} border ${scheme.border} rounded`}
      style={{ width: SLOT_BASE_SIZE * 2 + SLOT_GAP, height: SLOT_BASE_SIZE * 2 + SLOT_GAP }}
    >
      {cellContents.map((cell, i) => {
        const item = cell.itemId ? getItemById(cell.itemId) : null;
        const isDragOver = dragOverTarget === baseIndex + i;

        // Пропускаем рендер вторичных ячеек больших предметов
        if (!cell.isMain && cell.itemId) {
          return <div key={i} className="w-full h-full" />;
        }

        // Для предметов 2x2
        if (item && (item.size || 0) >= 4 && i === 0) {
          return (
            <div
              key={i}
              draggable={!!item}
              onDragStart={(e) => cell.itemId && onDragStart?.(e, cell.itemId, i)}
              onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, i); }}
              onDrop={(e) => onDrop?.(e, i)}
              onClick={(e) => cell.itemId && onClick?.(e, cell.itemId, i)}
              className={`
                col-span-2 row-span-2 flex items-center justify-center
                bg-black/30 border border-white/10 rounded cursor-pointer
                hover:scale-[1.02] hover:border-white/30 transition-all
                ${isDragOver && !invalidDropTarget ? 'border-green-400 bg-green-900/30' : ''}
                ${isDragOver && invalidDropTarget ? 'border-red-500 bg-red-900/30' : ''}
              `}
              style={{ width: '100%', height: '100%' }}
              title={item ? `${item.nameRu} (2x2)` : undefined}
            >
              <span className="text-3xl drop-shadow-md">{item.icon}</span>
            </div>
          );
        }

        // Для горизонтальных предметов 2x1
        if (item && (item.size || 0) === 2 && (item.width || 1) === 2 && (i === 0 || i === 2)) {
          return (
            <div
              key={i}
              draggable={!!item}
              onDragStart={(e) => cell.itemId && onDragStart?.(e, cell.itemId, i)}
              onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, i); }}
              onDrop={(e) => onDrop?.(e, i)}
              onClick={(e) => cell.itemId && onClick?.(e, cell.itemId, i)}
              className={`
                col-span-2 flex items-center justify-center
                bg-black/30 border border-white/10 rounded cursor-pointer
                hover:scale-[1.02] hover:border-white/20 transition-all
                ${isDragOver && !invalidDropTarget ? 'border-green-400 bg-green-900/30' : ''}
                ${isDragOver && invalidDropTarget ? 'border-red-500 bg-red-900/30' : ''}
              `}
              title={item ? `${item.nameRu} (2x1)` : undefined}
            >
              <span className="text-2xl drop-shadow-md">{item.icon}</span>
            </div>
          );
        }

        // Для вертикальных предметов 1x2
        if (item && (item.size || 0) === 2 && (item.width || 1) === 1 && (i === 0 || i === 1)) {
          return (
            <div
              key={i}
              draggable={!!item}
              onDragStart={(e) => cell.itemId && onDragStart?.(e, cell.itemId, i)}
              onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, i); }}
              onDrop={(e) => onDrop?.(e, i)}
              onClick={(e) => cell.itemId && onClick?.(e, cell.itemId, i)}
              className={`
                row-span-2 flex items-center justify-center
                bg-black/30 border border-white/10 rounded cursor-pointer
                hover:scale-[1.02] hover:border-white/20 transition-all
                ${isDragOver && !invalidDropTarget ? 'border-green-400 bg-green-900/30' : ''}
                ${isDragOver && invalidDropTarget ? 'border-red-500 bg-red-900/30' : ''}
              `}
              style={{ gridColumn: i === 0 ? 1 : 2, gridRow: '1 / 3' }}
              title={item ? `${item.nameRu} (1x2)` : undefined}
            >
              <span className="text-2xl drop-shadow-md">{item.icon}</span>
            </div>
          );
        }

        // Стандартная ячейка 1x1
        return (
          <SubCell
            key={i}
            itemId={cell.itemId}
            color={color}
            onDragStart={(e) => cell.itemId && onDragStart?.(e, cell.itemId, i)}
            onDragOver={(e) => onDragOver?.(e, i)}
            onDrop={(e) => onDrop?.(e, i)}
            onClick={(e) => cell.itemId && onClick?.(e, cell.itemId, i)}
            isDragOver={isDragOver}
            isInvalid={invalidDropTarget}
          />
        );
      })}
    </div>
  );
}

// Компонент слота 2x1 с двумя подъячейками
function SubCellSlot2x1({
  items,
  color = 'zinc',
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  dragOverTarget,
  baseIndex,
  invalidDropTarget
}: {
  items: (string | null)[];
  color?: 'zinc' | 'red' | 'blue' | 'orange';
  onDragStart?: (e: DragEvent, itemId: string, subCellIndex: number) => void;
  onDragOver?: (e: DragEvent, subCellIndex: number) => void;
  onDrop?: (e: DragEvent, subCellIndex: number) => void;
  onClick?: (e: MouseEvent, itemId: string, subCellIndex: number) => void;
  dragOverTarget?: number | null;
  baseIndex: number;
  invalidDropTarget?: boolean;
}) {
  const colorSchemes = {
    zinc: { bg: 'from-zinc-800 to-zinc-900', border: 'border-white/15' },
    red: { bg: 'from-red-900/40 to-red-950/40', border: 'border-red-500/30' },
    blue: { bg: 'from-blue-900/40 to-blue-950/40', border: 'border-blue-500/30' },
    orange: { bg: 'from-orange-900/40 to-orange-950/40', border: 'border-orange-500/30' },
  };
  const scheme = colorSchemes[color];

  // Анализируем ячейки
  const cellContents: { itemId: string | null; isMain: boolean; size: number }[] = [];
  const processedItems = new Set<string>();

  for (let i = 0; i < 2; i++) {
    const itemId = items[i];
    if (!itemId) {
      cellContents[i] = { itemId: null, isMain: true, size: 1 };
      continue;
    }

    if (processedItems.has(itemId)) {
      cellContents[i] = { itemId, isMain: false, size: 1 };
      continue;
    }

    const item = getItemById(itemId);
    const itemSize = item?.size || 1;
    processedItems.add(itemId);
    cellContents[i] = { itemId, isMain: true, size: itemSize };
  }

  return (
    <div
      className={`flex gap-0.5 p-0.5 bg-gradient-to-br ${scheme.bg} border ${scheme.border} rounded`}
      style={{ width: SLOT_BASE_SIZE * 2 + SLOT_GAP, height: SLOT_BASE_SIZE }}
    >
      {cellContents.map((cell, i) => {
        const item = cell.itemId ? getItemById(cell.itemId) : null;
        const isDragOver = dragOverTarget === baseIndex + i;

        if (!cell.isMain && cell.itemId) {
          return <div key={i} className="w-full h-full" />;
        }

        // Горизонтальный предмет 2x1
        if (item && (item.size || 0) === 2 && (item.width || 1) === 2 && i === 0) {
          return (
            <div
              key={i}
              draggable={!!item}
              onDragStart={(e) => cell.itemId && onDragStart?.(e, cell.itemId, i)}
              onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, i); }}
              onDrop={(e) => onDrop?.(e, i)}
              onClick={(e) => cell.itemId && onClick?.(e, cell.itemId, i)}
              className={`
                flex-1 flex items-center justify-center
                bg-black/30 border border-white/10 rounded cursor-pointer
                hover:scale-[1.02] hover:border-white/20 transition-all
                ${isDragOver && !invalidDropTarget ? 'border-green-400 bg-green-900/30' : ''}
                ${isDragOver && invalidDropTarget ? 'border-red-500 bg-red-900/30' : ''}
              `}
              style={{ width: SLOT_BASE_SIZE * 2 - 4, height: SLOT_BASE_SIZE - 4 }}
              title={item ? `${item.nameRu} (2x1)` : undefined}
            >
              <span className="text-2xl drop-shadow-md">{item.icon}</span>
            </div>
          );
        }

        // Стандартная ячейка 1x1
        return (
          <SubCell
            key={i}
            itemId={cell.itemId}
            color={color}
            onDragStart={(e) => cell.itemId && onDragStart?.(e, cell.itemId, i)}
            onDragOver={(e) => onDragOver?.(e, i)}
            onDrop={(e) => onDrop?.(e, i)}
            onClick={(e) => cell.itemId && onClick?.(e, cell.itemId, i)}
            isDragOver={isDragOver}
            isInvalid={invalidDropTarget}
          />
        );
      })}
    </div>
  );
}

// Компактный слот экипировки (единый стиль с подъячейками)
function CompactEquipmentSlot({
  label,
  slotType,
  itemId,
  size = 'normal',
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  isDragOver,
  isInvalidDrop = false
}: {
  label: string;
  slotType: string;
  itemId: string | null;
  size?: 'small' | 'normal';
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onClick?: (e: MouseEvent) => void;
  isDragOver?: boolean;
  isInvalidDrop?: boolean;
}) {
  const item = itemId ? getItemById(itemId) : null;
  const dim = size === 'small' ? SLOT_BASE_SIZE - 4 : SLOT_BASE_SIZE;

  return (
    <div
      draggable={!!item}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      className={`
        border bg-black/30 rounded cursor-pointer
        flex items-center justify-center transition-all
        ${isDragOver && !isInvalidDrop ? 'border-green-400 bg-green-900/30 scale-105' : 'border-white/10'}
        ${isDragOver && isInvalidDrop ? 'border-red-500 bg-red-900/30' : ''}
        ${item ? 'hover:scale-[1.02] hover:border-white/20' : 'hover:border-white/15'}
      `}
      style={{ width: dim, height: dim }}
      title={item ? `${item.nameRu}` : label}
    >
      {item ? (
        <span className={`${size === 'small' ? 'text-lg' : 'text-xl'} drop-shadow-md`}>{item.icon}</span>
      ) : (
        <span className="text-white/20 text-[8px] font-mono text-center leading-tight">
          {label}
        </span>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// ОСНОВНОЙ КОМПОНЕНТ
// ════════════════════════════════════════════════════════════════════════════════

export default function InventoryTab({
  equipment,
  onEquipmentChange,
  onUseItem,
  onDropItem,
  currentStamina = 7
}: InventoryTabProps) {
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ type: string; index?: number } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ item: Item; position: { x: number; y: number }; source: { type: string; index?: number } } | null>(null);
  const [invalidDropTarget, setInvalidDropTarget] = useState(false);

  // Расчет ценности
  const allItems: (string | null)[] = [
    ...(equipment.pockets || []),
    ...(equipment.rig?.items || []),
    ...(equipment.bag?.items || []),
    ...(equipment.backpack?.items || [])
  ];
  const totalValue = calculateTotalValue(allItems);

  // ════════════════════════════════════════════════════════════════════════════
  // УТИЛИТЫ ДЛЯ РАБОТЫ С КОНТЕЙНЕРАМИ
  // ════════════════════════════════════════════════════════════════════════════

  const getBackpackSlotInfo = (index: number): { type: '2x2' | '2x1' | '1x1'; baseIndex: number; localIndex: number } => {
    if (index < 4) return { type: '2x2', baseIndex: 0, localIndex: index };
    if (index < 8) return { type: '2x2', baseIndex: 4, localIndex: index - 4 };
    if (index < 10) return { type: '2x1', baseIndex: 8, localIndex: index - 8 };
    return { type: '1x1', baseIndex: index, localIndex: 0 };
  };

  const getContainerSlotInfo = (index: number): { type: '2x2' | '1x1'; baseIndex: number; localIndex: number } => {
    if (index < 4) return { type: '2x2', baseIndex: 0, localIndex: index };
    return { type: '1x1', baseIndex: index, localIndex: 0 };
  };

  // Получает индексы занимаемые предметом
  const getOccupiedIndices = (
    localIndex: number,
    item: Item | undefined,
    slotType: '2x2' | '2x1' | '1x1',
    baseIndex: number
  ): number[] => {
    if (!item) return [baseIndex + localIndex];

    const itemWidth = item.width || 1;
    const itemHeight = item.height || 1;

    if (slotType === '1x1') return [baseIndex];

    if (slotType === '2x1') {
      if (itemWidth === 2 && itemHeight === 1) {
        return [baseIndex, baseIndex + 1];
      }
      return [baseIndex + localIndex];
    }

    if (slotType === '2x2') {
      const indices: number[] = [];
      const startX = localIndex % 2;
      const startY = Math.floor(localIndex / 2);

      for (let y = 0; y < itemHeight; y++) {
        for (let x = 0; x < itemWidth; x++) {
          const cellX = startX + x;
          const cellY = startY + y;
          if (cellX < 2 && cellY < 2) {
            indices.push(baseIndex + cellY * 2 + cellX);
          }
        }
      }
      return indices.length > 0 ? indices : [baseIndex + localIndex];
    }

    return [baseIndex + localIndex];
  };

  // Очищает все ячейки занятые предметом
  const clearItemFromContainer = (container: Container, itemId: string) => {
    container.items = container.items.map(item => item === itemId ? null : item);
  };

  // ════════════════════════════════════════════════════════════════════════════
  // DRAG & DROP HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  const handleDragStart = useCallback((e: DragEvent, itemId: string, source: string, index?: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);

    if (['rig', 'bag', 'backpack'].includes(source)) {
      setDragSource({ type: 'container', containerType: source as 'rig' | 'bag' | 'backpack', index, itemId });
    } else if (source.startsWith('pocket')) {
      setDragSource({ type: 'pocket', index: parseInt(source.replace('pocket', '')), itemId });
    } else {
      setDragSource({ type: 'equipment', slot: source, itemId });
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent, target: string, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget({ type: target, index });

    // Проверка валидности размещения
    if (dragSource) {
      const draggedItem = getItemById(dragSource.itemId);
      if (draggedItem) {
        let isValid = true;

        // Проверка ограничений типа для слотов экипировки
        if (!['rig', 'bag', 'backpack'].includes(target) && !target.startsWith('pocket')) {
          isValid = canPlaceItemInSlotByType(draggedItem, target);
        }

        // Проверка размера для контейнеров
        if (['rig', 'bag', 'backpack'].includes(target) && index !== undefined) {
          const slotInfo = target === 'backpack'
            ? getBackpackSlotInfo(index)
            : getContainerSlotInfo(index);
          isValid = isValid && canPlaceItemInSlotBySize(draggedItem, slotInfo.type, slotInfo.localIndex);
        }

        // Проверка размера для слотов экипировки (только 1x1)
        if (!['rig', 'bag', 'backpack'].includes(target) && !target.startsWith('pocket')) {
          const itemWidth = draggedItem.width || 1;
          const itemHeight = draggedItem.height || 1;
          if (itemWidth > 1 || itemHeight > 1) {
            isValid = false;
          }
        }

        setInvalidDropTarget(!isValid);
      }
    }
  }, [dragSource]);

  const handleDragEnd = useCallback(() => {
    setDragSource(null);
    setDragOverTarget(null);
    setInvalidDropTarget(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent, target: string, index?: number) => {
    e.preventDefault();
    if (!dragSource || !onEquipmentChange) {
      handleDragEnd();
      return;
    }

    const draggedItem = getItemById(dragSource.itemId);
    if (!draggedItem) {
      handleDragEnd();
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ВАЛИДАЦИЯ
    // ═══════════════════════════════════════════════════════════════════════════

    // Проверка типа для слотов экипировки
    if (!['rig', 'bag', 'backpack'].includes(target) && !target.startsWith('pocket')) {
      if (!canPlaceItemInSlotByType(draggedItem, target)) {
        handleDragEnd();
        return;
      }

      // Проверка размера (экипировка только 1x1)
      const itemWidth = draggedItem.width || 1;
      const itemHeight = draggedItem.height || 1;
      if (itemWidth > 1 || itemHeight > 1) {
        handleDragEnd();
        return;
      }
    }

    // Проверка размера для контейнеров
    if (['rig', 'bag', 'backpack'].includes(target) && index !== undefined) {
      const slotInfo = target === 'backpack'
        ? getBackpackSlotInfo(index)
        : getContainerSlotInfo(index);

      if (!canPlaceItemInSlotBySize(draggedItem, slotInfo.type, slotInfo.localIndex)) {
        handleDragEnd();
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ИСПРАВЛЕННАЯ ЛОГИКА ОБМЕНА (SWAP)
    // ═══════════════════════════════════════════════════════════════════════════

    const newEquipment = JSON.parse(JSON.stringify(equipment)) as Equipment;

    // 0. ПОЛУЧАЕМ ПРЕДМЕТ В ЦЕЛЕВОЙ ЯЧЕЙКЕ
    let targetItemId: string | null = null;
    let targetOccupiedIndices: number[] = [];

    if (['rig', 'bag', 'backpack'].includes(target)) {
      const container = newEquipment[target as 'rig' | 'bag' | 'backpack'];
      if (container && index !== undefined) {
        targetItemId = container.items[index] || null;
        if (targetItemId) {
          const targetItem = getItemById(targetItemId);
          const slotInfo = target === 'backpack'
            ? getBackpackSlotInfo(index)
            : getContainerSlotInfo(index);
          targetOccupiedIndices = getOccupiedIndices(slotInfo.localIndex, targetItem, slotInfo.type, slotInfo.baseIndex);
        }
      }
    } else if (target.startsWith('pocket')) {
      const pocketIndex = parseInt(target.replace('pocket', ''));
      targetItemId = newEquipment.pockets?.[pocketIndex] || null;
    } else if (target.startsWith('special')) {
      const idx = parseInt(target.replace('special', ''));
      targetItemId = newEquipment.specials?.[idx] || null;
    } else if (target.startsWith('module')) {
      const idx = parseInt(target.replace('module', ''));
      targetItemId = newEquipment.modules?.[idx] || null;
    } else {
      targetItemId = (newEquipment as any)[target] || null;
    }

    // 1. УДАЛЕНИЕ ИЗ ИСТОЧНИКА
    if (dragSource.type === 'container' && dragSource.containerType) {
      const container = newEquipment[dragSource.containerType];
      if (container) {
        // Очищаем ВСЕ ячейки занятые перетаскиваемым предметом
        clearItemFromContainer(container, dragSource.itemId);
      }
    } else if (dragSource.type === 'pocket' && dragSource.index !== undefined) {
      newEquipment.pockets[dragSource.index] = null;
    } else if (dragSource.type === 'equipment' && dragSource.slot) {
      if (dragSource.slot.startsWith('special')) {
        const idx = parseInt(dragSource.slot.replace('special', ''));
        if (newEquipment.specials) newEquipment.specials[idx] = null;
      } else if (dragSource.slot.startsWith('module')) {
        const idx = parseInt(dragSource.slot.replace('module', ''));
        if (newEquipment.modules) newEquipment.modules[idx] = null;
      } else {
        (newEquipment as any)[dragSource.slot] = null;
      }
    }

    // 2. РАЗМЕЩЕНИЕ ЦЕЛЕВОГО ПРЕДМЕТА В ИСТОЧНИК (SWAP)
    if (targetItemId && targetItemId !== dragSource.itemId) {
      const targetItem = getItemById(targetItemId);

      if (dragSource.type === 'container' && dragSource.containerType && dragSource.index !== undefined) {
        const sourceContainer = newEquipment[dragSource.containerType];
        if (sourceContainer && targetItem) {
          // Проверяем что целевой предмет влезает в источник
          const sourceSlotInfo = dragSource.containerType === 'backpack'
            ? getBackpackSlotInfo(dragSource.index)
            : getContainerSlotInfo(dragSource.index);

          if (canPlaceItemInSlotBySize(targetItem, sourceSlotInfo.type, sourceSlotInfo.localIndex)) {
            const sourceOccupiedIndices = getOccupiedIndices(
              sourceSlotInfo.localIndex,
              targetItem,
              sourceSlotInfo.type,
              sourceSlotInfo.baseIndex
            );
            // Размещаем целевой предмет в источник
            for (const idx of sourceOccupiedIndices) {
              if (idx < sourceContainer.items.length) {
                sourceContainer.items[idx] = targetItemId;
              }
            }
          }
          // Если не влезает - предмет просто теряется (или можно добавить логику отмены)
        }
      } else if (dragSource.type === 'pocket' && dragSource.index !== undefined) {
        // Проверка размера и типа для кармана
        const targetItemWidth = targetItem?.width || 1;
        const targetItemHeight = targetItem?.height || 1;
        if (targetItemWidth === 1 && targetItemHeight === 1) {
          newEquipment.pockets[dragSource.index] = targetItemId;
        }
      } else if (dragSource.type === 'equipment' && dragSource.slot) {
        // Проверка размера и типа для слота экипировки
        const targetItemWidth = targetItem?.width || 1;
        const targetItemHeight = targetItem?.height || 1;
        if (targetItemWidth === 1 && targetItemHeight === 1) {
          if (targetItem && canPlaceItemInSlotByType(targetItem, dragSource.slot)) {
            if (dragSource.slot.startsWith('special')) {
              const idx = parseInt(dragSource.slot.replace('special', ''));
              if (newEquipment.specials) newEquipment.specials[idx] = targetItemId;
            } else if (dragSource.slot.startsWith('module')) {
              const idx = parseInt(dragSource.slot.replace('module', ''));
              if (newEquipment.modules) newEquipment.modules[idx] = targetItemId;
            } else {
              (newEquipment as any)[dragSource.slot] = targetItemId;
            }
          }
        }
      }
    }

    // 3. РАЗМЕЩЕНИЕ ПЕРЕТАСКИВАЕМОГО ПРЕДМЕТА В ЦЕЛЬ
    if (['rig', 'bag', 'backpack'].includes(target)) {
      const container = newEquipment[target as 'rig' | 'bag' | 'backpack'];
      if (container && index !== undefined) {
        const slotInfo = target === 'backpack'
          ? getBackpackSlotInfo(index)
          : getContainerSlotInfo(index);

        const occupiedIndices = getOccupiedIndices(
          slotInfo.localIndex,
          draggedItem,
          slotInfo.type,
          slotInfo.baseIndex
        );

        // Очищаем целевые ячейки от других предметов (если swap не выполнен)
        for (const absIdx of occupiedIndices) {
          if (absIdx < container.items.length) {
            const existingItem = container.items[absIdx];
            if (existingItem && existingItem !== dragSource.itemId && existingItem !== targetItemId) {
              clearItemFromContainer(container, existingItem);
            }
          }
        }

        // Размещаем перетаскиваемый предмет
        for (const absIdx of occupiedIndices) {
          if (absIdx < container.items.length) {
            container.items[absIdx] = dragSource.itemId;
          }
        }
      }
    } else if (target.startsWith('pocket')) {
      const pocketIndex = parseInt(target.replace('pocket', ''));
      newEquipment.pockets[pocketIndex] = dragSource.itemId;
    } else if (target.startsWith('special')) {
      const idx = parseInt(target.replace('special', ''));
      if (newEquipment.specials) newEquipment.specials[idx] = dragSource.itemId;
    } else if (target.startsWith('module')) {
      const idx = parseInt(target.replace('module', ''));
      if (newEquipment.modules) newEquipment.modules[idx] = dragSource.itemId;
    } else {
      (newEquipment as any)[target] = dragSource.itemId;
    }

    onEquipmentChange(newEquipment);
    handleDragEnd();
  }, [dragSource, equipment, onEquipmentChange, handleDragEnd]);

  // ════════════════════════════════════════════════════════════════════════════
  // CLICK HANDLERS
  // ════════════════════════════════════════════════════════════════════════════

  const handleItemClick = useCallback((e: MouseEvent, itemId: string, sourceType: string, index?: number) => {
    const item = getItemById(itemId);
    if (!item) return;

    setSelectedItem({
      item,
      position: { x: e.clientX, y: e.clientY },
      source: { type: sourceType, index }
    });
  }, []);

  const handleUseItem = useCallback((itemId: string) => {
    if (!selectedItem || !onEquipmentChange) return;

    const newEquipment = JSON.parse(JSON.stringify(equipment)) as Equipment;
    const { type, index } = selectedItem.source;

    if (['rig', 'bag', 'backpack'].includes(type)) {
      const container = newEquipment[type as 'rig' | 'bag' | 'backpack'];
      if (container) {
        clearItemFromContainer(container, itemId);
      }
    } else if (type.startsWith('pocket')) {
      const pocketIndex = parseInt(type.replace('pocket', ''));
      newEquipment.pockets[pocketIndex] = null;
    }

    onEquipmentChange(newEquipment);
    onUseItem?.(itemId, type, index);
    setSelectedItem(null);
  }, [selectedItem, equipment, onEquipmentChange, onUseItem]);

  const handleDropItem = useCallback((itemId: string) => {
    if (!selectedItem || !onEquipmentChange) return;

    const newEquipment = JSON.parse(JSON.stringify(equipment)) as Equipment;
    const { type, index } = selectedItem.source;

    if (['rig', 'bag', 'backpack'].includes(type)) {
      const container = newEquipment[type as 'rig' | 'bag' | 'backpack'];
      if (container) {
        clearItemFromContainer(container, itemId);
      }
    } else if (type.startsWith('pocket')) {
      const pocketIndex = parseInt(type.replace('pocket', ''));
      newEquipment.pockets[pocketIndex] = null;
    }

    onEquipmentChange(newEquipment);
    onDropItem?.(itemId, type, index);
    setSelectedItem(null);
  }, [selectedItem, equipment, onEquipmentChange, onDropItem]);

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  const hasRig = equipment.rig !== null;
  const hasBag = equipment.bag !== null;
  const hasBackpack = equipment.backpack !== null;

  return (
    <div className="h-full flex flex-col p-2" onDragEnd={handleDragEnd}>
      {/* Заголовок */}
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10 flex-shrink-0">
        <div className="w-1 h-4 bg-amber-500 rounded-full" />
        <span className="text-white/80 font-mono text-xs uppercase tracking-[0.2em]">Инвентарь</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-amber-400 font-mono text-xs">
          <span>💰</span>
          <span>{formatRoubles(totalValue)}</span>
        </div>
      </div>

      {/* Основной контент - компактная компоновка */}
      <div className="flex gap-2 flex-1 min-h-0">
        {/* ЛЕВАЯ КОЛОНКА - Экипировка */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {/* Спец слоты (горизонтально) */}
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <CompactEquipmentSlot
                key={i}
                label={`С${i + 1}`}
                slotType={`special${i}`}
                itemId={equipment.specials?.[i] || null}
                size="small"
                onDragStart={(e) => equipment.specials?.[i] && handleDragStart(e, equipment.specials[i]!, `special${i}`)}
                onDragOver={(e) => handleDragOver(e, `special${i}`)}
                onDrop={(e) => handleDrop(e, `special${i}`)}
                onClick={(e) => equipment.specials?.[i] && handleItemClick(e, equipment.specials[i]!, `special${i}`)}
                isDragOver={dragOverTarget?.type === `special${i}`}
                isInvalidDrop={dragOverTarget?.type === `special${i}` && invalidDropTarget}
              />
            ))}
          </div>

          {/* Шлем и Броня */}
          <CompactEquipmentSlot
            label="ШЛЕМ"
            slotType="helmet"
            itemId={equipment.helmet}
            onDragStart={(e) => equipment.helmet && handleDragStart(e, equipment.helmet, 'helmet')}
            onDragOver={(e) => handleDragOver(e, 'helmet')}
            onDrop={(e) => handleDrop(e, 'helmet')}
            onClick={(e) => equipment.helmet && handleItemClick(e, equipment.helmet, 'helmet')}
            isDragOver={dragOverTarget?.type === 'helmet'}
            isInvalidDrop={dragOverTarget?.type === 'helmet' && invalidDropTarget}
          />

          <CompactEquipmentSlot
            label="БРОНЯ"
            slotType="armor"
            itemId={equipment.armor}
            onDragStart={(e) => equipment.armor && handleDragStart(e, equipment.armor, 'armor')}
            onDragOver={(e) => handleDragOver(e, 'armor')}
            onDrop={(e) => handleDrop(e, 'armor')}
            onClick={(e) => equipment.armor && handleItemClick(e, equipment.armor, 'armor')}
            isDragOver={dragOverTarget?.type === 'armor'}
            isInvalidDrop={dragOverTarget?.type === 'armor' && invalidDropTarget}
          />

          {/* Карманы (2x2 сетка) */}
          <div className="grid grid-cols-2 gap-1">
            {[0, 1, 2, 3].map(i => (
              <CompactEquipmentSlot
                key={i}
                label={`К${i + 1}`}
                slotType={`pocket${i}`}
                itemId={equipment.pockets?.[i] || null}
                size="small"
                onDragStart={(e) => equipment.pockets?.[i] && handleDragStart(e, equipment.pockets[i]!, `pocket${i}`)}
                onDragOver={(e) => handleDragOver(e, `pocket${i}`)}
                onDrop={(e) => handleDrop(e, `pocket${i}`)}
                onClick={(e) => equipment.pockets?.[i] && handleItemClick(e, equipment.pockets[i]!, `pocket${i}`)}
                isDragOver={dragOverTarget?.type === `pocket${i}`}
                isInvalidDrop={dragOverTarget?.type === `pocket${i}` && invalidDropTarget}
              />
            ))}
          </div>

          {/* Оружие */}
          <CompactEquipmentSlot
            label="ОРУЖИЕ"
            slotType="weapon"
            itemId={equipment.weapon}
            onDragStart={(e) => equipment.weapon && handleDragStart(e, equipment.weapon, 'weapon')}
            onDragOver={(e) => handleDragOver(e, 'weapon')}
            onDrop={(e) => handleDrop(e, 'weapon')}
            onClick={(e) => equipment.weapon && handleItemClick(e, equipment.weapon, 'weapon')}
            isDragOver={dragOverTarget?.type === 'weapon'}
            isInvalidDrop={dragOverTarget?.type === 'weapon' && invalidDropTarget}
          />

          {/* Модули (3 слота, заменили scope/tactical/suppressor) */}
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <CompactEquipmentSlot
                key={i}
                label={`М${i + 1}`}
                slotType={`module${i}`}
                itemId={equipment.modules?.[i] || null}
                size="small"
                onDragStart={(e) => equipment.modules?.[i] && handleDragStart(e, equipment.modules[i]!, `module${i}`)}
                onDragOver={(e) => handleDragOver(e, `module${i}`)}
                onDrop={(e) => handleDrop(e, `module${i}`)}
                onClick={(e) => equipment.modules?.[i] && handleItemClick(e, equipment.modules[i]!, `module${i}`)}
                isDragOver={dragOverTarget?.type === `module${i}`}
                isInvalidDrop={dragOverTarget?.type === `module${i}` && invalidDropTarget}
              />
            ))}
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ - Контейнеры */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Разгрузка */}
          {hasRig && (
            <div className="p-2 bg-gradient-to-r from-red-950/50 to-red-900/30 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">🎽</span>
                <span className="text-red-400 font-mono text-[10px] uppercase tracking-wider">Разгрузка</span>
                <span className="text-red-400/50 font-mono text-[10px] ml-auto">
                  {equipment.rig?.items.filter(i => i !== null).length || 0}/4
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {RIG_SLOTS.map((slot) => {
                  if (slot.subCellsCount) {
                    const subCellItems = equipment.rig?.items.slice(slot.index * 4, slot.index * 4 + 4) || [null, null, null, null];
                    return (
                      <SubCellSlot2x2
                        key={slot.index}
                        items={subCellItems}
                        color="red"
                        baseIndex={slot.index * 4}
                        onDragStart={(e, itemId, subIdx) => handleDragStart(e, itemId, 'rig', slot.index * 4 + subIdx)}
                        onDragOver={(e, subIdx) => handleDragOver(e, 'rig', slot.index * 4 + subIdx)}
                        onDrop={(e, subIdx) => handleDrop(e, 'rig', slot.index * 4 + subIdx)}
                        onClick={(e, itemId, subIdx) => handleItemClick(e, itemId, 'rig', slot.index * 4 + subIdx)}
                        dragOverTarget={dragOverTarget?.type === 'rig' ? dragOverTarget.index ?? null : null}
                        invalidDropTarget={invalidDropTarget}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* Сумка */}
          {hasBag && (
            <div className="p-2 bg-gradient-to-r from-blue-950/50 to-blue-900/30 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">👜</span>
                <span className="text-blue-400 font-mono text-[10px] uppercase tracking-wider">Сумка</span>
                <span className="text-blue-400/50 font-mono text-[10px] ml-auto">
                  {equipment.bag?.items.filter(i => i !== null).length || 0}/4
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {BAG_SLOTS.map((slot) => {
                  if (slot.subCellsCount) {
                    const subCellItems = equipment.bag?.items.slice(slot.index * 4, slot.index * 4 + 4) || [null, null, null, null];
                    return (
                      <SubCellSlot2x2
                        key={slot.index}
                        items={subCellItems}
                        color="blue"
                        baseIndex={slot.index * 4}
                        onDragStart={(e, itemId, subIdx) => handleDragStart(e, itemId, 'bag', slot.index * 4 + subIdx)}
                        onDragOver={(e, subIdx) => handleDragOver(e, 'bag', slot.index * 4 + subIdx)}
                        onDrop={(e, subIdx) => handleDrop(e, 'bag', slot.index * 4 + subIdx)}
                        onClick={(e, itemId, subIdx) => handleItemClick(e, itemId, 'bag', slot.index * 4 + subIdx)}
                        dragOverTarget={dragOverTarget?.type === 'bag' ? dragOverTarget.index ?? null : null}
                        invalidDropTarget={invalidDropTarget}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* Рюкзак */}
          {hasBackpack && (
            <div className="p-2 bg-gradient-to-r from-orange-950/50 to-orange-900/30 border border-orange-500/30 rounded-lg flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">🎒</span>
                <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">Рюкзак</span>
                <span className="text-orange-400/50 font-mono text-[10px] ml-auto">
                  {equipment.backpack?.items.filter(i => i !== null).length || 0}/{equipment.backpack?.items.length || 0}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {BACKPACK_SLOTS.map((slot) => {
                  // Слоты 2x2
                  if (slot.subCellsCount === 4) {
                    const baseIdx = slot.index * 4;
                    const subCellItems = equipment.backpack?.items.slice(baseIdx, baseIdx + 4) || [null, null, null, null];
                    return (
                      <SubCellSlot2x2
                        key={slot.index}
                        items={subCellItems}
                        color="orange"
                        baseIndex={baseIdx}
                        onDragStart={(e, itemId, subIdx) => handleDragStart(e, itemId, 'backpack', baseIdx + subIdx)}
                        onDragOver={(e, subIdx) => handleDragOver(e, 'backpack', baseIdx + subIdx)}
                        onDrop={(e, subIdx) => handleDrop(e, 'backpack', baseIdx + subIdx)}
                        onClick={(e, itemId, subIdx) => handleItemClick(e, itemId, 'backpack', baseIdx + subIdx)}
                        dragOverTarget={dragOverTarget?.type === 'backpack' ? dragOverTarget.index ?? null : null}
                        invalidDropTarget={invalidDropTarget}
                      />
                    );
                  }
                  // Слот 2x1
                  if (slot.subCellsCount === 2) {
                    // После 2x2 (4 ячейки), 2x1 начинается с индекса 4
                    const baseIdx = 4;
                    const subCellItems = equipment.backpack?.items.slice(baseIdx, baseIdx + 2) || [null, null];
                    return (
                      <SubCellSlot2x1
                        key={slot.index}
                        items={subCellItems}
                        color="orange"
                        baseIndex={baseIdx}
                        onDragStart={(e, itemId, subIdx) => handleDragStart(e, itemId, 'backpack', baseIdx + subIdx)}
                        onDragOver={(e, subIdx) => handleDragOver(e, 'backpack', baseIdx + subIdx)}
                        onDrop={(e, subIdx) => handleDrop(e, 'backpack', baseIdx + subIdx)}
                        onClick={(e, itemId, subIdx) => handleItemClick(e, itemId, 'backpack', baseIdx + subIdx)}
                        dragOverTarget={dragOverTarget?.type === 'backpack' ? dragOverTarget.index ?? null : null}
                        invalidDropTarget={invalidDropTarget}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* Нет контейнеров */}
          {!hasRig && !hasBag && !hasBackpack && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white/30 font-mono text-xs p-4 border border-dashed border-white/10 rounded-lg">
                <div className="text-2xl mb-2 opacity-50">📦</div>
                <div>Нет контейнеров</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Item Popup */}
      {selectedItem && (
        <ItemPopup
          item={selectedItem.item}
          position={selectedItem.position}
          onClose={() => setSelectedItem(null)}
          onUse={handleUseItem}
          onDrop={handleDropItem}
          currentStamina={currentStamina}
        />
      )}
    </div>
  );
}
