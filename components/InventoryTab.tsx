/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/InventoryTab.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Вкладка инвентаря в стиле EFT с drag-and-drop (REDESIGNED v2.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES                                                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Увеличенные слоты (12x12 вместо 7x7) и иконки                            │
 * │ - Прокрутка колёсиком с custom scrollbar                                   │
 * │ - Drag-and-drop перетаскивание предметов между слотами                     │
 * │ - ДИНАМИЧЕСКИЕ слоты контейнеров (появляются только с предметами)          │
 * │ - Интерактивные hover/drag эффекты                                         │
 * │ - Подсветка валидных целей при перетаскивании                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ DEFAULT EXPORT:                                                             │
 * │   InventoryTab        - React компонент EFT-style инвентаря                │
 * │                                                                             │
 * │ PROPS (InventoryTabProps):                                                  │
 * │   equipment           - Equipment - вся экипировка и контейнеры            │
 * │   onEquipmentChange?  - (Equipment) => void - коллбэк изменения            │
 * │   onUseItem?          - (slotType, index?) => void - коллбэк использования │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { useState, useCallback, DragEvent } from 'react';
import { Equipment, Container } from '@/lib/types';
import { getItemById, calculateTotalValue, formatRoubles } from '@/lib/itemData';

interface InventoryTabProps {
  equipment: Equipment;
  onEquipmentChange?: (newEquipment: Equipment) => void;
  onUseItem?: (slotType: string, index?: number) => void;
}

// Тип для источника перетаскивания
interface DragSource {
  type: 'equipment' | 'container' | 'pocket';
  slot?: string;
  containerType?: 'rig' | 'bag' | 'backpack';
  index?: number;
  itemId: string;
}

// Компонент слота экипировки (УВЕЛИЧЕННЫЙ)
function EquipmentSlot({
  label,
  slotType,
  itemId,
  className = '',
  size = 'normal',
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver
}: {
  label: string;
  slotType: string;
  itemId: string | null;
  className?: string;
  size?: 'small' | 'normal' | 'large';
  onDragStart?: (e: DragEvent, itemId: string, slotType: string) => void;
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent, slotType: string) => void;
  isDragOver?: boolean;
}) {
  const item = itemId ? getItemById(itemId) : null;

  const sizeClasses = {
    small: 'w-11 h-11',
    normal: 'w-14 h-14',
    large: 'w-16 h-16'
  };

  const iconSizes = {
    small: 'text-xl',
    normal: 'text-2xl',
    large: 'text-3xl'
  };

  return (
    <div
      draggable={!!item}
      onDragStart={(e) => item && onDragStart?.(e, itemId!, slotType)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, slotType)}
      className={`
        ${sizeClasses[size]}
        border-2 ${isDragOver ? 'border-green-400 bg-green-900/40 scale-105' : 'border-white/20'}
        bg-gradient-to-br from-zinc-900 to-zinc-800
        flex items-center justify-center
        hover:border-white/40 hover:bg-zinc-700/50
        active:scale-95
        transition-all duration-150 cursor-pointer
        rounded-lg shadow-lg shadow-black/30
        ${item ? 'hover:scale-105 hover:shadow-xl' : ''}
        ${className}
      `}
      title={item ? `${item.nameRu}\n${formatRoubles(item.value)}` : label}
    >
      {item ? (
        <span className={`${iconSizes[size]} drop-shadow-lg`}>{item.icon}</span>
      ) : (
        <span className="text-white/20 text-[9px] font-mono uppercase text-center leading-tight px-1">
          {label}
        </span>
      )}
    </div>
  );
}

// Компонент контейнера (разгрузка, сумка, рюкзак) - ДИНАМИЧЕСКИЙ
function ContainerSection({
  container,
  containerType,
  label,
  icon,
  color,
  maxSlots,
  onDragStart,
  onDragOver,
  onDrop,
  dragOverIndex
}: {
  container: Container | null;
  containerType: 'rig' | 'bag' | 'backpack';
  label: string;
  icon: string;
  color: 'red' | 'blue' | 'orange';
  maxSlots: number;
  onDragStart?: (e: DragEvent, itemId: string, containerType: string, index: number) => void;
  onDragOver?: (e: DragEvent, index: number) => void;
  onDrop?: (e: DragEvent, containerType: string, index: number) => void;
  dragOverIndex?: number;
}) {
  // ★ ДИНАМИКА: Если нет контейнера - НЕ отображаем секцию
  if (!container) return null;

  const slots = container.items || Array(maxSlots).fill(null);
  const filledCount = slots.filter(s => s !== null).length;

  const colorClasses = {
    red: {
      bg: 'from-red-950/70 to-red-900/40',
      border: 'border-red-500/50',
      header: 'bg-red-900/60 border-red-500/40',
      slot: 'from-red-900/50 to-red-800/30 border-red-500/40',
      slotHover: 'hover:border-red-400 hover:bg-red-800/40',
      accent: 'text-red-400'
    },
    blue: {
      bg: 'from-blue-950/70 to-blue-900/40',
      border: 'border-blue-500/50',
      header: 'bg-blue-900/60 border-blue-500/40',
      slot: 'from-blue-900/50 to-blue-800/30 border-blue-500/40',
      slotHover: 'hover:border-blue-400 hover:bg-blue-800/40',
      accent: 'text-blue-400'
    },
    orange: {
      bg: 'from-orange-950/70 to-orange-900/40',
      border: 'border-orange-500/50',
      header: 'bg-orange-900/60 border-orange-500/40',
      slot: 'from-orange-900/50 to-orange-800/30 border-orange-500/40',
      slotHover: 'hover:border-orange-400 hover:bg-orange-800/40',
      accent: 'text-orange-400'
    }
  };

  const c = colorClasses[color];

  return (
    <div className={`border-2 ${c.border} rounded-xl overflow-hidden bg-gradient-to-b ${c.bg} shadow-lg`}>
      {/* Заголовок контейнера */}
      <div className={`${c.header} px-3 py-2 border-b flex items-center gap-2`}>
        <span className="text-xl">{icon}</span>
        <span className="text-white/90 font-mono text-sm uppercase tracking-wider font-bold">{label}</span>
        <span className={`${c.accent} font-mono text-xs ml-auto bg-black/30 px-2 py-0.5 rounded`}>
          {filledCount}/{maxSlots}
        </span>
      </div>

      {/* Слоты - УВЕЛИЧЕННЫЕ */}
      <div className="p-3 flex flex-wrap gap-2 justify-center">
        {slots.slice(0, maxSlots).map((itemId, idx) => {
          const item = itemId ? getItemById(itemId) : null;
          const isOver = dragOverIndex === idx;

          return (
            <div
              key={idx}
              draggable={!!item}
              onDragStart={(e) => item && onDragStart?.(e, itemId!, containerType, idx)}
              onDragOver={(e) => {
                e.preventDefault();
                onDragOver?.(e, idx);
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop?.(e, containerType, idx);
              }}
              className={`
                w-14 h-14 rounded-lg
                bg-gradient-to-br ${c.slot}
                border-2 ${isOver ? 'border-green-400 bg-green-900/40 scale-110' : c.border}
                ${c.slotHover}
                flex items-center justify-center
                transition-all duration-150 cursor-pointer
                hover:scale-105 shadow-inner
                active:scale-95
              `}
              title={item ? `${item.nameRu} (${formatRoubles(item.value)})` : `Слот ${idx + 1}`}
            >
              {item && <span className="text-2xl drop-shadow-md">{item.icon}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InventoryTab({ equipment, onEquipmentChange, onUseItem }: InventoryTabProps) {
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{ type: string; index?: number } | null>(null);

  // Расчет общей ценности
  const allItems: (string | null)[] = [
    ...(equipment.pockets || []),
    ...(equipment.rig?.items || []),
    ...(equipment.bag?.items || []),
    ...(equipment.backpack?.items || [])
  ];
  const totalValue = calculateTotalValue(allItems);

  // Обработчики drag-and-drop
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

    // Удаляем из источника
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

    // Добавляем в цель
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

  // Проверяем наличие контейнеров
  const hasRig = equipment.rig !== null;
  const hasBag = equipment.bag !== null;
  const hasBackpack = equipment.backpack !== null;
  const hasAnyContainer = hasRig || hasBag || hasBackpack;

  return (
    <div className="h-full flex flex-col overflow-hidden" onDragEnd={handleDragEnd}>
      {/* Заголовок */}
      <div className="relative border-b border-white/20 pb-3 mb-3 flex-shrink-0">
        <div className="absolute left-0 top-1/2 w-3 h-3 border border-amber-500/50 rotate-45 -translate-y-1/2" />
        <h3 className="text-white font-mono text-sm tracking-[0.3em] pl-6 uppercase">
          Инвентарь
        </h3>
        <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-amber-900/20 to-transparent" />
      </div>

      {/* Основной контент с ПРОКРУТКОЙ */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 custom-scrollbar">
        <div className="flex gap-4">
          {/* ЛЕВАЯ ЧАСТЬ - Экипировка */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            {/* Спец слоты */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <EquipmentSlot
                  key={i}
                  label={`СП${i + 1}`}
                  slotType={`special${i}`}
                  itemId={equipment.specials?.[i] || null}
                  size="small"
                  onDragStart={(e, itemId) => handleDragStart(e, itemId, `special${i}`)}
                  onDragOver={(e) => handleDragOver(e, `special${i}`)}
                  onDrop={(e) => handleDrop(e, `special${i}`)}
                  isDragOver={dragOverTarget?.type === `special${i}`}
                />
              ))}
            </div>

            {/* Шлем, Броня, Одежда */}
            <EquipmentSlot
              label="ШЛЕМ"
              slotType="helmet"
              itemId={equipment.helmet}
              size="large"
              onDragStart={(e, itemId) => handleDragStart(e, itemId, 'helmet')}
              onDragOver={(e) => handleDragOver(e, 'helmet')}
              onDrop={(e) => handleDrop(e, 'helmet')}
              isDragOver={dragOverTarget?.type === 'helmet'}
            />
            <EquipmentSlot
              label="БРОНЯ"
              slotType="armor"
              itemId={equipment.armor}
              size="large"
              onDragStart={(e, itemId) => handleDragStart(e, itemId, 'armor')}
              onDragOver={(e) => handleDragOver(e, 'armor')}
              onDrop={(e) => handleDrop(e, 'armor')}
              isDragOver={dragOverTarget?.type === 'armor'}
            />
            <EquipmentSlot
              label="ОДЕЖДА"
              slotType="clothes"
              itemId={equipment.clothes}
              size="large"
              onDragStart={(e, itemId) => handleDragStart(e, itemId, 'clothes')}
              onDragOver={(e) => handleDragOver(e, 'clothes')}
              onDrop={(e) => handleDrop(e, 'clothes')}
              isDragOver={dragOverTarget?.type === 'clothes'}
            />

            {/* Карманы */}
            <div className="flex gap-1.5 mt-1">
              {[0, 1, 2, 3].map(i => (
                <EquipmentSlot
                  key={i}
                  label={`К${i + 1}`}
                  slotType={`pocket${i}`}
                  itemId={equipment.pockets?.[i] || null}
                  size="small"
                  onDragStart={(e, itemId) => handleDragStart(e, itemId, `pocket${i}`)}
                  onDragOver={(e) => handleDragOver(e, `pocket${i}`)}
                  onDrop={(e) => handleDrop(e, `pocket${i}`)}
                  isDragOver={dragOverTarget?.type === `pocket${i}`}
                />
              ))}
            </div>

            {/* Оружие */}
            <div className="w-full mt-2">
              <EquipmentSlot
                label="ОРУЖИЕ"
                slotType="weapon"
                itemId={equipment.weapon}
                size="large"
                className="w-full"
                onDragStart={(e, itemId) => handleDragStart(e, itemId, 'weapon')}
                onDragOver={(e) => handleDragOver(e, 'weapon')}
                onDrop={(e) => handleDrop(e, 'weapon')}
                isDragOver={dragOverTarget?.type === 'weapon'}
              />
            </div>

            {/* Обвесы оружия */}
            <div className="flex gap-1.5">
              <EquipmentSlot
                label="ПРИЦ"
                slotType="scope"
                itemId={equipment.scope}
                size="small"
                onDragStart={(e, itemId) => handleDragStart(e, itemId, 'scope')}
                onDragOver={(e) => handleDragOver(e, 'scope')}
                onDrop={(e) => handleDrop(e, 'scope')}
                isDragOver={dragOverTarget?.type === 'scope'}
              />
              <EquipmentSlot
                label="ЛЦУ"
                slotType="tactical"
                itemId={equipment.tactical}
                size="small"
                onDragStart={(e, itemId) => handleDragStart(e, itemId, 'tactical')}
                onDragOver={(e) => handleDragOver(e, 'tactical')}
                onDrop={(e) => handleDrop(e, 'tactical')}
                isDragOver={dragOverTarget?.type === 'tactical'}
              />
              <EquipmentSlot
                label="ГЛУШ"
                slotType="suppressor"
                itemId={equipment.suppressor}
                size="small"
                onDragStart={(e, itemId) => handleDragStart(e, itemId, 'suppressor')}
                onDragOver={(e) => handleDragOver(e, 'suppressor')}
                onDrop={(e) => handleDrop(e, 'suppressor')}
                isDragOver={dragOverTarget?.type === 'suppressor'}
              />
            </div>
          </div>

          {/* ПРАВАЯ ЧАСТЬ - Контейнеры (ДИНАМИЧЕСКИЕ) */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {/* Разгрузка - появляется только если есть */}
            <ContainerSection
              container={equipment.rig}
              containerType="rig"
              label="Разгрузка"
              icon="🎽"
              color="red"
              maxSlots={4}
              onDragStart={(e, itemId, type, idx) => handleDragStart(e, itemId, type, idx)}
              onDragOver={(e, idx) => handleDragOver(e, 'rig', idx)}
              onDrop={(e, type, idx) => handleDrop(e, type, idx)}
              dragOverIndex={dragOverTarget?.type === 'rig' ? dragOverTarget.index : undefined}
            />

            {/* Сумка - появляется только если есть */}
            <ContainerSection
              container={equipment.bag}
              containerType="bag"
              label="Сумка"
              icon="👜"
              color="blue"
              maxSlots={3}
              onDragStart={(e, itemId, type, idx) => handleDragStart(e, itemId, type, idx)}
              onDragOver={(e, idx) => handleDragOver(e, 'bag', idx)}
              onDrop={(e, type, idx) => handleDrop(e, type, idx)}
              dragOverIndex={dragOverTarget?.type === 'bag' ? dragOverTarget.index : undefined}
            />

            {/* Рюкзак - появляется только если есть */}
            <ContainerSection
              container={equipment.backpack}
              containerType="backpack"
              label="Рюкзак"
              icon="🎒"
              color="orange"
              maxSlots={8}
              onDragStart={(e, itemId, type, idx) => handleDragStart(e, itemId, type, idx)}
              onDragOver={(e, idx) => handleDragOver(e, 'backpack', idx)}
              onDrop={(e, type, idx) => handleDrop(e, type, idx)}
              dragOverIndex={dragOverTarget?.type === 'backpack' ? dragOverTarget.index : undefined}
            />

            {/* Если НЕТ контейнеров - подсказка */}
            {!hasAnyContainer && (
              <div className="flex-1 flex items-center justify-center min-h-[120px]">
                <div className="text-center text-white/30 font-mono text-xs p-4 border-2 border-dashed border-white/10 rounded-xl">
                  <div className="text-3xl mb-2 opacity-50">📦</div>
                  <div className="text-white/40 font-bold">Нет контейнеров</div>
                  <div className="text-[10px] mt-1 text-white/25">
                    Найдите разгрузку, сумку или рюкзак
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ценность - футер */}
      <div className="mt-3 pt-3 border-t border-white/20 flex-shrink-0">
        <div className="flex items-center justify-between p-2 bg-gradient-to-r from-amber-900/20 to-transparent rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💰</span>
            <span className="text-white/60 font-mono text-xs uppercase tracking-wider">
              Общая ценность
            </span>
          </div>
          <div className="text-right">
            <div className="text-amber-400 font-mono text-xl font-bold tracking-wide drop-shadow-lg">
              {formatRoubles(totalValue)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
