/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/InventoryTab.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Компактная вкладка инвентаря с переменными размерами слотов (REDESIGNED v3.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES v3.0                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Компактная компоновка без прокрутки                                       │
 * │ - Переменные размеры слотов: 1x1, 2x1, 2x2                                 │
 * │ - Popup с информацией о предмете при клике                                 │
 * │ - Действия "использовать" и "выбросить"                                    │
 * │ - Сгруппированные контейнеры                                               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { useState, useCallback, DragEvent, MouseEvent } from 'react';
import { Equipment, Container, Item } from '@/lib/types';
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
  subCellsCount?: number; // Количество подъячеек (для 2x2 = 4)
}

// Конфигурация слотов рюкзака: два слота 2x2 (с подъячейками), один 2x1, три 1x1
// Слоты 2x2 содержат 4 подъячейки каждый, что даёт гибкость размещения
const BACKPACK_SLOTS: SlotConfig[] = [
  { size: '2x2', index: 0, subCellsCount: 4 },  // Индексы подъячеек: 0-3
  { size: '2x2', index: 1, subCellsCount: 4 },  // Индексы подъячеек: 4-7
  { size: '2x1', index: 2 },
  { size: '1x1', index: 3 },
  { size: '1x1', index: 4 },
  { size: '1x1', index: 5 },
];

// Конфигурация слотов разгрузки: один слот 2x2 (с подъячейками)
const RIG_SLOTS: SlotConfig[] = [
  { size: '2x2', index: 0, subCellsCount: 4 },  // 4 подъячейки 1x1
];

// Конфигурация слотов сумки: один слот 2x2 (с подъячейками)
const BAG_SLOTS: SlotConfig[] = [
  { size: '2x2', index: 0, subCellsCount: 4 },  // 4 подъячейки 1x1
];

// Базовый размер единичного слота (увеличен)
const SLOT_BASE_SIZE = 48; // px
const SLOT_GAP = 4; // px

// Компонент слота 2x2 с подъячейками
// Позволяет разместить:
// - 1 предмет 2x2 (занимает все 4 ячейки)
// - 2 предмета 2x1 (каждый занимает 2 ячейки)
// - 1 предмет 2x1 + 2 предмета 1x1
// - 4 предмета 1x1
// Компонент слота 2x2 с подъячейками
function SubCellSlot2x2({
  items,
  color = 'zinc',
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  dragOverTarget,
  baseIndex
}: {
  items: (string | null)[]; // 4 подъячейки
  color?: 'zinc' | 'red' | 'blue' | 'orange';
  onDragStart?: (e: DragEvent, itemId: string, subCellIndex: number) => void;
  onDragOver?: (e: DragEvent, subCellIndex: number) => void;
  onDrop?: (e: DragEvent, subCellIndex: number) => void;
  onClick?: (e: MouseEvent, itemId: string, subCellIndex: number) => void;
  dragOverTarget?: number | null;
  baseIndex: number;
}) {
  const colorSchemes = {
    zinc: { bg: 'from-zinc-800 to-zinc-900', border: 'border-white/15', highlight: 'border-white/30' },
    red: { bg: 'from-red-900/40 to-red-950/40', border: 'border-red-500/30', highlight: 'border-red-400/50' },
    blue: { bg: 'from-blue-900/40 to-blue-950/40', border: 'border-blue-500/30', highlight: 'border-blue-400/50' },
    orange: { bg: 'from-orange-900/40 to-orange-950/40', border: 'border-orange-500/30', highlight: 'border-orange-400/50' },
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
      // Этот предмет уже обработан - это вторичная ячейка
      cellContents[i] = { itemId, isMain: false, size: 1 };
      continue;
    }

    const item = getItemById(itemId);
    // FIX: Используем (item?.size || 1) для безопасности
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

        // FIX: Безопасная проверка размера (item.size || 0)
        // Для предметов 2x2 - рендерим на все 4 ячейки
        if (item && (item.size || 0) >= 4) {
          if (i !== 0) return null;
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
                ${isDragOver ? 'border-green-400 bg-green-900/30' : ''}
              `}
              style={{ width: '100%', height: '100%' }}
              title={item ? `${item.nameRu} (${item.size || 4} ячеек)` : undefined}
            >
              <span className="text-3xl drop-shadow-md">{item.icon}</span>
            </div>
          );
        }

        // FIX: Безопасная проверка размера для предметов 2x1 (горизонтальные) и 1x2 (вертикальные)
        if (item && (item.size || 0) === 2) {
          const isHorizontal = (item.width || 1) === 2 && (item.height || 1) === 1;
          const isVertical = (item.width || 1) === 1 && (item.height || 1) === 2;

          // Горизонтальный предмет (2x1) - рендерим если в левой ячейке ряда (0 или 2)
          if (isHorizontal && (i === 0 || i === 2)) {
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
                  ${isDragOver ? 'border-green-400 bg-green-900/30' : ''}
                `}
                title={item ? `${item.nameRu} (2x1)` : undefined}
              >
                <span className="text-2xl drop-shadow-md">{item.icon}</span>
              </div>
            );
          }

          // Вертикальный предмет (1x2) - рендерим если в верхней ячейке колонки (0 или 1)
          if (isVertical && (i === 0 || i === 1)) {
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
                  ${isDragOver ? 'border-green-400 bg-green-900/30' : ''}
                `}
                style={{ gridColumn: i === 0 ? 1 : 2, gridRow: '1 / 3' }}
                title={item ? `${item.nameRu} (1x2)` : undefined}
              >
                <span className="text-2xl drop-shadow-md">{item.icon}</span>
              </div>
            );
          }
        }

        // Стандартная ячейка 1x1
        return (
          <div
            key={i}
            draggable={!!item}
            onDragStart={(e) => cell.itemId && onDragStart?.(e, cell.itemId, i)}
            onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, i); }}
            onDrop={(e) => onDrop?.(e, i)}
            onClick={(e) => cell.itemId && onClick?.(e, cell.itemId, i)}
            className={`
              flex items-center justify-center
              bg-black/30 border border-white/10 rounded cursor-pointer
              hover:border-white/20 transition-all
              ${isDragOver ? 'border-green-400 bg-green-900/30 scale-105' : ''}
              ${item ? 'hover:scale-[1.02]' : ''}
            `}
            style={{ width: SLOT_BASE_SIZE - 4, height: SLOT_BASE_SIZE - 4 }}
            title={item ? `${item.nameRu}` : '1x1'}
          >
            {item ? (
              <span className="text-xl drop-shadow-md">{item.icon}</span>
            ) : (
              <div className="text-white/10 text-[8px] font-mono">1x1</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Компонент слота с переменным размером
function VariableSlot({
  size,
  itemId,
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  isDragOver,
  color = 'zinc'
}: {
  size: '1x1' | '2x1' | '2x2';
  itemId: string | null;
  onDragStart?: (e: DragEvent) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onClick?: (e: MouseEvent) => void;
  isDragOver?: boolean;
  color?: 'zinc' | 'red' | 'blue' | 'orange';
}) {
  const item = itemId ? getItemById(itemId) : null;

  // Размеры в зависимости от типа
  const dimensions = {
    '1x1': { w: SLOT_BASE_SIZE, h: SLOT_BASE_SIZE, icon: 'text-xl' },
    '2x1': { w: SLOT_BASE_SIZE * 2 + SLOT_GAP, h: SLOT_BASE_SIZE, icon: 'text-2xl' },
    '2x2': { w: SLOT_BASE_SIZE * 2 + SLOT_GAP, h: SLOT_BASE_SIZE * 2 + SLOT_GAP, icon: 'text-3xl' },
  };

  const colorSchemes = {
    zinc: {
      bg: 'from-zinc-800 to-zinc-900',
      border: isDragOver ? 'border-green-400' : 'border-white/15',
      hover: 'hover:border-white/30',
    },
    red: {
      bg: 'from-red-900/40 to-red-950/40',
      border: isDragOver ? 'border-green-400' : 'border-red-500/30',
      hover: 'hover:border-red-400/50',
    },
    blue: {
      bg: 'from-blue-900/40 to-blue-950/40',
      border: isDragOver ? 'border-green-400' : 'border-blue-500/30',
      hover: 'hover:border-blue-400/50',
    },
    orange: {
      bg: 'from-orange-900/40 to-orange-950/40',
      border: isDragOver ? 'border-green-400' : 'border-orange-500/30',
      hover: 'hover:border-orange-400/50',
    },
  };

  const scheme = colorSchemes[color];
  const dim = dimensions[size];

  return (
    <div
      draggable={!!item}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      className={`
        relative bg-gradient-to-br ${scheme.bg}
        border ${scheme.border} ${scheme.hover}
        rounded transition-all cursor-pointer
        flex items-center justify-center
        ${isDragOver ? 'scale-105 bg-green-900/30' : ''}
        ${item ? 'hover:scale-[1.02] shadow-lg' : ''}
      `}
      style={{ width: dim.w, height: dim.h }}
      title={item ? `${item.nameRu} - ${formatRoubles(item.value)}` : undefined}
    >
      {item ? (
        <span className={`${dim.icon} drop-shadow-md`}>{item.icon}</span>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`text-white/10 text-[8px] font-mono`}>{size}</div>
        </div>
      )}

      {/* Индикатор размера для больших слотов */}
      {size !== '1x1' && !item && (
        <div className="absolute inset-0 border border-dashed border-white/5 rounded pointer-events-none" />
      )}
    </div>
  );
}

// Компактный слот экипировки
function CompactEquipmentSlot({
  label,
  slotType,
  itemId,
  size = 'normal',
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
  isDragOver
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
}) {
  const item = itemId ? getItemById(itemId) : null;

  const sizes = {
    small: { dim: 'w-11 h-11', icon: 'text-xl', label: 'text-[8px]' },
    normal: { dim: 'w-14 h-14', icon: 'text-2xl', label: 'text-[9px]' },
  };

  const s = sizes[size];

  return (
    <div
      draggable={!!item}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      className={`
        ${s.dim}
        border ${isDragOver ? 'border-green-400 bg-green-900/30' : 'border-white/15'}
        bg-gradient-to-br from-zinc-800 to-zinc-900
        flex items-center justify-center
        hover:border-white/30 hover:bg-zinc-700/50
        transition-all cursor-pointer rounded
        ${item ? 'hover:scale-105 shadow-md' : ''}
      `}
      title={item ? `${item.nameRu}` : label}
    >
      {item ? (
        <span className={`${s.icon} drop-shadow-md`}>{item.icon}</span>
      ) : (
        <span className={`text-white/20 ${s.label} font-mono text-center leading-tight`}>
          {label}
        </span>
      )}
    </div>
  );
}

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

  // Расчет ценности
  const allItems: (string | null)[] = [
    ...(equipment.pockets || []),
    ...(equipment.rig?.items || []),
    ...(equipment.bag?.items || []),
    ...(equipment.backpack?.items || [])
  ];
  const totalValue = calculateTotalValue(allItems);

  // Drag handlers
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
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragSource(null);
    setDragOverTarget(null);
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // FIX: Исправленная функция Drop с поддержкой спец-слотов, защитой от дюпа
  // и обменом предметами при перемещении на занятую ячейку
  // FIX v2: Корректная обработка размеров предметов в подъячейках 2x2
  // ════════════════════════════════════════════════════════════════════════

  // Вспомогательная функция для получения индексов, занимаемых предметом в сетке 2x2
  const getOccupiedIndicesInGrid = (startIndex: number, item: Item | undefined): number[] => {
    if (!item) return [startIndex];

    const width = item.width || 1;
    const height = item.height || 1;
    const indices: number[] = [];

    // Сетка 2x2: [0, 1]
    //            [2, 3]
    const startX = startIndex % 2;
    const startY = Math.floor(startIndex / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cellX = startX + x;
        const cellY = startY + y;
        // Проверяем границы сетки 2x2
        if (cellX < 2 && cellY < 2) {
          indices.push(cellY * 2 + cellX);
        }
      }
    }

    return indices;
  };

  // Очищает все ячейки, занятые предметом в контейнере
  const clearItemFromContainer = (container: Container, itemId: string) => {
    container.items = container.items.map(item => item === itemId ? null : item);
  };

  const handleDrop = useCallback((e: DragEvent, target: string, index?: number) => {
    e.preventDefault();
    if (!dragSource || !onEquipmentChange) {
      handleDragEnd();
      return;
    }

    const newEquipment = JSON.parse(JSON.stringify(equipment)) as Equipment;
    const draggedItem = getItemById(dragSource.itemId);

    // --- 0. ПОЛУЧАЕМ ПРЕДМЕТ В ЦЕЛЕВОЙ ЯЧЕЙКЕ (для обмена) ---
    let targetItemId: string | null = null;

    if (['rig', 'bag', 'backpack'].includes(target)) {
      const container = newEquipment[target as 'rig' | 'bag' | 'backpack'];
      if (container && index !== undefined) {
        targetItemId = container.items[index] || null;
      }
    } else if (target.startsWith('pocket')) {
      const pocketIndex = parseInt(target.replace('pocket', ''));
      targetItemId = newEquipment.pockets[pocketIndex] || null;
    } else if (target.startsWith('special')) {
      const idx = parseInt(target.replace('special', ''));
      targetItemId = newEquipment.specials?.[idx] || null;
    } else {
      targetItemId = (newEquipment as any)[target] || null;
    }

    // --- 1. УДАЛЕНИЕ ИЗ ИСТОЧНИКА ---
    if (dragSource.type === 'container' && dragSource.containerType) {
      const container = newEquipment[dragSource.containerType];
      if (container) {
        // FIX: Очищаем все ячейки, занятые этим предметом
        clearItemFromContainer(container, dragSource.itemId);
        // Если есть предмет для обмена, размещаем его в первую свободную ячейку источника
        if (targetItemId && dragSource.index !== undefined) {
          container.items[dragSource.index] = targetItemId;
        }
      }
    } else if (dragSource.type === 'pocket' && dragSource.index !== undefined) {
      newEquipment.pockets[dragSource.index] = targetItemId; // Обмен
    } else if (dragSource.type === 'equipment' && dragSource.slot) {
      if (dragSource.slot.startsWith('special')) {
        const idx = parseInt(dragSource.slot.replace('special', ''));
        if (newEquipment.specials) newEquipment.specials[idx] = targetItemId;
      } else {
        (newEquipment as any)[dragSource.slot] = targetItemId;
      }
    }

    // --- 2. ДОБАВЛЕНИЕ В ЦЕЛЬ ---
    if (['rig', 'bag', 'backpack'].includes(target)) {
      const container = newEquipment[target as 'rig' | 'bag' | 'backpack'];
      if (container && index !== undefined) {
        // FIX: Определяем индекс внутри слота 2x2 (0-3)
        const slotBaseIndex = Math.floor(index / 4) * 4;
        const subCellIndex = index % 4;

        // Получаем индексы всех ячеек, которые займёт предмет
        const occupiedIndices = getOccupiedIndicesInGrid(subCellIndex, draggedItem);

        // Очищаем целевые ячейки от других предметов (если там что-то было)
        for (const relIdx of occupiedIndices) {
          const absIdx = slotBaseIndex + relIdx;
          if (absIdx < container.items.length && container.items[absIdx] !== dragSource.itemId) {
            // Если там был другой предмет, очищаем его полностью
            const existingItem = container.items[absIdx];
            if (existingItem) {
              clearItemFromContainer(container, existingItem);
            }
          }
        }

        // Размещаем предмет во все занимаемые ячейки
        for (const relIdx of occupiedIndices) {
          const absIdx = slotBaseIndex + relIdx;
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
    } else {
      (newEquipment as any)[target] = dragSource.itemId;
    }

    onEquipmentChange(newEquipment);
    handleDragEnd();
  }, [dragSource, equipment, onEquipmentChange, handleDragEnd]);

  // Item click handler
  const handleItemClick = useCallback((e: MouseEvent, itemId: string, sourceType: string, index?: number) => {
    const item = getItemById(itemId);
    if (!item) return;

    setSelectedItem({
      item,
      position: { x: e.clientX, y: e.clientY },
      source: { type: sourceType, index }
    });
  }, []);

  // Use item handler
  const handleUseItem = useCallback((itemId: string) => {
    if (!selectedItem || !onEquipmentChange) return;

    // Remove item from inventory
    const newEquipment = JSON.parse(JSON.stringify(equipment)) as Equipment;
    const { type, index } = selectedItem.source;

    if (['rig', 'bag', 'backpack'].includes(type)) {
      const container = newEquipment[type as 'rig' | 'bag' | 'backpack'];
      if (container && index !== undefined) {
        container.items[index] = null;
      }
    } else if (type.startsWith('pocket')) {
      const pocketIndex = parseInt(type.replace('pocket', ''));
      newEquipment.pockets[pocketIndex] = null;
    }

    onEquipmentChange(newEquipment);
    onUseItem?.(itemId, type, index);
    setSelectedItem(null);
  }, [selectedItem, equipment, onEquipmentChange, onUseItem]);

  // Drop item handler
  const handleDropItem = useCallback((itemId: string) => {
    if (!selectedItem || !onEquipmentChange) return;

    const newEquipment = JSON.parse(JSON.stringify(equipment)) as Equipment;
    const { type, index } = selectedItem.source;

    if (['rig', 'bag', 'backpack'].includes(type)) {
      const container = newEquipment[type as 'rig' | 'bag' | 'backpack'];
      if (container && index !== undefined) {
        container.items[index] = null;
      }
    } else if (type.startsWith('pocket')) {
      const pocketIndex = parseInt(type.replace('pocket', ''));
      newEquipment.pockets[pocketIndex] = null;
    }

    onEquipmentChange(newEquipment);
    onDropItem?.(itemId, type, index);
    setSelectedItem(null);
  }, [selectedItem, equipment, onEquipmentChange, onDropItem]);

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

      {/* Основной контент - БЕЗ ПРОКРУТКИ */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* ЛЕВАЯ КОЛОНКА - Экипировка (компактно) */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          {/* Спец слоты */}
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
              />
            ))}
          </div>

          {/* Шлем */}
          <CompactEquipmentSlot
            label="ШЛЕМ"
            slotType="helmet"
            itemId={equipment.helmet}
            onDragStart={(e) => equipment.helmet && handleDragStart(e, equipment.helmet, 'helmet')}
            onDragOver={(e) => handleDragOver(e, 'helmet')}
            onDrop={(e) => handleDrop(e, 'helmet')}
            onClick={(e) => equipment.helmet && handleItemClick(e, equipment.helmet, 'helmet')}
            isDragOver={dragOverTarget?.type === 'helmet'}
          />

          {/* Броня */}
          <CompactEquipmentSlot
            label="БРОНЯ"
            slotType="armor"
            itemId={equipment.armor}
            onDragStart={(e) => equipment.armor && handleDragStart(e, equipment.armor, 'armor')}
            onDragOver={(e) => handleDragOver(e, 'armor')}
            onDrop={(e) => handleDrop(e, 'armor')}
            onClick={(e) => equipment.armor && handleItemClick(e, equipment.armor, 'armor')}
            isDragOver={dragOverTarget?.type === 'armor'}
          />

          {/* Одежда */}
          <CompactEquipmentSlot
            label="ОДЕЖ"
            slotType="clothes"
            itemId={equipment.clothes}
            onDragStart={(e) => equipment.clothes && handleDragStart(e, equipment.clothes, 'clothes')}
            onDragOver={(e) => handleDragOver(e, 'clothes')}
            onDrop={(e) => handleDrop(e, 'clothes')}
            onClick={(e) => equipment.clothes && handleItemClick(e, equipment.clothes, 'clothes')}
            isDragOver={dragOverTarget?.type === 'clothes'}
          />

          {/* Карманы */}
          <div className="flex gap-1 flex-wrap w-[96px]">
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
              />
            ))}
          </div>

          {/* Оружие и обвесы */}
          <div className="mt-1 space-y-1">
            <CompactEquipmentSlot
              label="ОРУЖИЕ"
              slotType="weapon"
              itemId={equipment.weapon}
              onDragStart={(e) => equipment.weapon && handleDragStart(e, equipment.weapon, 'weapon')}
              onDragOver={(e) => handleDragOver(e, 'weapon')}
              onDrop={(e) => handleDrop(e, 'weapon')}
              onClick={(e) => equipment.weapon && handleItemClick(e, equipment.weapon, 'weapon')}
              isDragOver={dragOverTarget?.type === 'weapon'}
            />
            <div className="flex gap-1">
              {['scope', 'tactical', 'suppressor'].map((slot, i) => (
                <CompactEquipmentSlot
                  key={slot}
                  label={['ПРЦ', 'ЛЦУ', 'ГЛШ'][i]}
                  slotType={slot}
                  itemId={(equipment as any)[slot]}
                  size="small"
                  onDragStart={(e) => (equipment as any)[slot] && handleDragStart(e, (equipment as any)[slot], slot)}
                  onDragOver={(e) => handleDragOver(e, slot)}
                  onDrop={(e) => handleDrop(e, slot)}
                  onClick={(e) => (equipment as any)[slot] && handleItemClick(e, (equipment as any)[slot], slot)}
                  isDragOver={dragOverTarget?.type === slot}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ПРАВАЯ ЧАСТЬ - Контейнеры (компактно сгруппированы) */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Разгрузка - с подъячейками 2x2 */}
          {hasRig && (
            <div className="p-2 bg-gradient-to-r from-red-950/50 to-red-900/30 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🎽</span>
                <span className="text-red-400 font-mono text-[10px] uppercase tracking-wider">Разгрузка</span>
                <span className="text-red-400/50 font-mono text-[10px] ml-auto">
                  {equipment.rig?.items.filter(i => i !== null).length || 0}/4
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {RIG_SLOTS.map((slot) => {
                  if (slot.subCellsCount) {
                    // Слот с подъячейками
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
                      />
                    );
                  }
                  return (
                    <VariableSlot
                      key={slot.index}
                      size={slot.size}
                      itemId={equipment.rig?.items[slot.index] || null}
                      color="red"
                      onDragStart={(e) => equipment.rig?.items[slot.index] && handleDragStart(e, equipment.rig.items[slot.index]!, 'rig', slot.index)}
                      onDragOver={(e) => handleDragOver(e, 'rig', slot.index)}
                      onDrop={(e) => handleDrop(e, 'rig', slot.index)}
                      onClick={(e) => equipment.rig?.items[slot.index] && handleItemClick(e, equipment.rig.items[slot.index]!, 'rig', slot.index)}
                      isDragOver={dragOverTarget?.type === 'rig' && dragOverTarget?.index === slot.index}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Сумка - с подъячейками 2x2 */}
          {hasBag && (
            <div className="p-2 bg-gradient-to-r from-blue-950/50 to-blue-900/30 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
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
                      />
                    );
                  }
                  return (
                    <VariableSlot
                      key={slot.index}
                      size={slot.size}
                      itemId={equipment.bag?.items[slot.index] || null}
                      color="blue"
                      onDragStart={(e) => equipment.bag?.items[slot.index] && handleDragStart(e, equipment.bag.items[slot.index]!, 'bag', slot.index)}
                      onDragOver={(e) => handleDragOver(e, 'bag', slot.index)}
                      onDrop={(e) => handleDrop(e, 'bag', slot.index)}
                      onClick={(e) => equipment.bag?.items[slot.index] && handleItemClick(e, equipment.bag.items[slot.index]!, 'bag', slot.index)}
                      isDragOver={dragOverTarget?.type === 'bag' && dragOverTarget?.index === slot.index}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Рюкзак - с подъячейками 2x2 */}
          {hasBackpack && (
            <div className="p-2 bg-gradient-to-r from-orange-950/50 to-orange-900/30 border border-orange-500/30 rounded-lg flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🎒</span>
                <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">Рюкзак</span>
                <span className="text-orange-400/50 font-mono text-[10px] ml-auto">
                  {equipment.backpack?.items.filter(i => i !== null).length || 0}/{equipment.backpack?.items.length || 0}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {BACKPACK_SLOTS.map((slot) => {
                  if (slot.subCellsCount) {
                    // Рассчитываем правильные индексы для подъячеек рюкзака
                    // Первый слот 2x2: индексы 0-3, Второй слот 2x2: индексы 4-7
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
                      />
                    );
                  }
                  // Обычные слоты (2x1, 1x1) - индексы идут после слотов 2x2
                  // Слот 2x1 (index 2): реальный индекс 8
                  // Слоты 1x1 (index 3,4,5): реальные индексы 9,10,11
                  const realIndex = slot.index < 2 ? slot.index : 8 + (slot.index - 2);
                  return (
                    <VariableSlot
                      key={slot.index}
                      size={slot.size}
                      itemId={equipment.backpack?.items[realIndex] || null}
                      color="orange"
                      onDragStart={(e) => equipment.backpack?.items[realIndex] && handleDragStart(e, equipment.backpack.items[realIndex]!, 'backpack', realIndex)}
                      onDragOver={(e) => handleDragOver(e, 'backpack', realIndex)}
                      onDrop={(e) => handleDrop(e, 'backpack', realIndex)}
                      onClick={(e) => equipment.backpack?.items[realIndex] && handleItemClick(e, equipment.backpack.items[realIndex]!, 'backpack', realIndex)}
                      isDragOver={dragOverTarget?.type === 'backpack' && dragOverTarget?.index === realIndex}
                    />
                  );
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
