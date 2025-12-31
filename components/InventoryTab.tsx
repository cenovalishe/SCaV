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
}

// Конфигурация слотов рюкзака: два 2x2, один 2x1, три 1x1
const BACKPACK_SLOTS: SlotConfig[] = [
  { size: '2x2', index: 0 },
  { size: '2x2', index: 1 },
  { size: '2x1', index: 2 },
  { size: '1x1', index: 3 },
  { size: '1x1', index: 4 },
  { size: '1x1', index: 5 },
];

// Конфигурация слотов разгрузки: четыре 1x1
const RIG_SLOTS: SlotConfig[] = [
  { size: '1x1', index: 0 },
  { size: '1x1', index: 1 },
  { size: '1x1', index: 2 },
  { size: '1x1', index: 3 },
];

// Конфигурация слотов сумки: один 2x1, два 1x1
const BAG_SLOTS: SlotConfig[] = [
  { size: '2x1', index: 0 },
  { size: '1x1', index: 1 },
  { size: '1x1', index: 2 },
];

// Базовый размер единичного слота (увеличен)
const SLOT_BASE_SIZE = 48; // px
const SLOT_GAP = 4; // px

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

  const handleDrop = useCallback((e: DragEvent, target: string, index?: number) => {
    e.preventDefault();
    if (!dragSource || !onEquipmentChange) {
      handleDragEnd();
      return;
    }

    const newEquipment = JSON.parse(JSON.stringify(equipment)) as Equipment;

    // Remove from source
    if (dragSource.type === 'container' && dragSource.containerType) {
      const container = newEquipment[dragSource.containerType];
      if (container && dragSource.index !== undefined) {
        container.items[dragSource.index] = null;
      }
    } else if (dragSource.type === 'pocket' && dragSource.index !== undefined) {
      newEquipment.pockets[dragSource.index] = null;
    } else if (dragSource.type === 'equipment' && dragSource.slot) {
      (newEquipment as any)[dragSource.slot] = null;
    }

    // Add to target
    if (['rig', 'bag', 'backpack'].includes(target)) {
      const container = newEquipment[target as 'rig' | 'bag' | 'backpack'];
      if (container && index !== undefined) {
        container.items[index] = dragSource.itemId;
      }
    } else if (target.startsWith('pocket')) {
      const pocketIndex = parseInt(target.replace('pocket', ''));
      newEquipment.pockets[pocketIndex] = dragSource.itemId;
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
          {/* Разгрузка */}
          {hasRig && (
            <div className="p-2 bg-gradient-to-r from-red-950/50 to-red-900/30 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🎽</span>
                <span className="text-red-400 font-mono text-[10px] uppercase tracking-wider">Разгрузка</span>
                <span className="text-red-400/50 font-mono text-[10px] ml-auto">
                  {equipment.rig?.items.filter(i => i !== null).length || 0}/{RIG_SLOTS.length}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {RIG_SLOTS.map((slot) => (
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
                ))}
              </div>
            </div>
          )}

          {/* Сумка */}
          {hasBag && (
            <div className="p-2 bg-gradient-to-r from-blue-950/50 to-blue-900/30 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">👜</span>
                <span className="text-blue-400 font-mono text-[10px] uppercase tracking-wider">Сумка</span>
                <span className="text-blue-400/50 font-mono text-[10px] ml-auto">
                  {equipment.bag?.items.filter(i => i !== null).length || 0}/{BAG_SLOTS.length}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {BAG_SLOTS.map((slot) => (
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
                ))}
              </div>
            </div>
          )}

          {/* Рюкзак */}
          {hasBackpack && (
            <div className="p-2 bg-gradient-to-r from-orange-950/50 to-orange-900/30 border border-orange-500/30 rounded-lg flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🎒</span>
                <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">Рюкзак</span>
                <span className="text-orange-400/50 font-mono text-[10px] ml-auto">
                  {equipment.backpack?.items.filter(i => i !== null).length || 0}/{BACKPACK_SLOTS.length}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {BACKPACK_SLOTS.map((slot) => (
                  <VariableSlot
                    key={slot.index}
                    size={slot.size}
                    itemId={equipment.backpack?.items[slot.index] || null}
                    color="orange"
                    onDragStart={(e) => equipment.backpack?.items[slot.index] && handleDragStart(e, equipment.backpack.items[slot.index]!, 'backpack', slot.index)}
                    onDragOver={(e) => handleDragOver(e, 'backpack', slot.index)}
                    onDrop={(e) => handleDrop(e, 'backpack', slot.index)}
                    onClick={(e) => equipment.backpack?.items[slot.index] && handleItemClick(e, equipment.backpack.items[slot.index]!, 'backpack', slot.index)}
                    isDragOver={dragOverTarget?.type === 'backpack' && dragOverTarget?.index === slot.index}
                  />
                ))}
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
