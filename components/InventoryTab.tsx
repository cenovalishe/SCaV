/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/InventoryTab.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Вкладка инвентаря в стиле Escape From Tarkov
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ DEFAULT EXPORT:                                                             │
 * │   InventoryTab        - React компонент EFT-style инвентаря                │
 * │                                                                             │
 * │ PROPS (InventoryTabProps):                                                  │
 * │   equipment           - Equipment - вся экипировка и контейнеры            │
 * │   onUseItem?          - (slotType, index?) => void - коллбэк использования │
 * │                                                                             │
 * │ INTERNAL COMPONENTS:                                                        │
 * │   EquipmentSlot       - Одиночный слот экипировки (шлем, броня и т.д.)     │
 * │   ContainerSlots      - Контейнер с ячейками (разгрузка, сумка, рюкзак)    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   react          → useState                                                │
 * │   @/lib/types    → Equipment, Container                                    │
 * │   @/lib/itemData → getItemById, calculateTotalValue, formatRoubles         │
 * │                                                                             │
 * │ IMPORTED BY:                                                                │
 * │   ./TabbedPanel.tsx → используется как содержимое вкладки "ИНВЕНТАРЬ"      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ UI LAYOUT (EFT-style)                                                       │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │   ┌─────────────────────────────────────────────────────────────┐          │
 * │   │ ИНВЕНТАРЬ                                                   │          │
 * │   ├─────────────┬───────────┬───────────────────────────────────┤          │
 * │   │ ЭКИПИРОВКА  │  АВАТАР   │         КОНТЕЙНЕРЫ                │          │
 * │   ├─────────────┤           ├───────────────────────────────────┤          │
 * │   │[сп1][сп2][3]│   ┌───┐   │ разг [■][■][■][■]                 │ RED      │
 * │   │   [шлем]    │   │ o │   │ сумк [■][■][■]                    │ BLUE     │
 * │   │   [брн]     │   │/|\│   │ рюкз [■][■][■][■][■][■][■][■]     │ ORANGE   │
 * │   │   [одеж]    │   │/ \│   │                                   │          │
 * │   │[к1][к2][3]4]│   └───┘   │                                   │          │
 * │   │  [оружие]   │           │                                   │          │
 * │   │[приц][лцу]..│           │                                   │          │
 * │   ├─────────────┴───────────┴───────────────────────────────────┤          │
 * │   │                                     Ценность: 15 000 ₽      │          │
 * │   └─────────────────────────────────────────────────────────────┘          │
 * │                                                                             │
 * │ SLOT TYPES:                                                                 │
 * │   specials[3]  - спец слоты (верх)        pockets[4] - карманы             │
 * │   helmet       - шлем                      weapon    - оружие              │
 * │   armor        - броня                     scope     - прицел              │
 * │   clothes      - одежда                    tactical  - ЛЦУ                 │
 * │                                            suppressor- глушитель           │
 * │                                                                             │
 * │ CONTAINERS (цветовая схема):                                               │
 * │   rig (красный)      - разгрузка, 4 слота                                  │
 * │   bag (синий)        - сумка, 3 слота                                      │
 * │   backpack (оранж)   - рюкзак, 8 слотов                                    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { useState } from 'react';
import { Equipment, Container } from '@/lib/types';
import { getItemById, calculateTotalValue, formatRoubles } from '@/lib/itemData';

interface InventoryTabProps {
  equipment: Equipment;
  onUseItem?: (slotType: string, index?: number) => void;
}

// Компонент слота экипировки
function EquipmentSlot({
  label,
  itemId,
  className = '',
  onClick
}: {
  label: string;
  itemId: string | null;
  className?: string;
  onClick?: () => void;
}) {
  const item = itemId ? getItemById(itemId) : null;

  return (
    <button
      onClick={onClick}
      className={`
        border border-white/30 bg-black/50
        flex items-center justify-center
        hover:border-white/60 hover:bg-white/5
        transition-all cursor-pointer
        ${className}
      `}
      title={item ? `${item.nameRu} (${formatRoubles(item.value)})` : label}
    >
      {item ? (
        <span className="text-lg">{item.icon}</span>
      ) : (
        <span className="text-white/30 text-xs font-mono">{label}</span>
      )}
    </button>
  );
}

// Компонент контейнера (разгрузка, сумка, рюкзак)
function ContainerSlots({
  container,
  label,
  color,
  maxSlots
}: {
  container: Container | null;
  label: string;
  color: string;
  maxSlots: number;
}) {
  const slots = container?.items || Array(maxSlots).fill(null);
  const bgColor = color === 'red' ? 'bg-red-900/40 border-red-500/50' :
                  color === 'blue' ? 'bg-blue-900/40 border-blue-500/50' :
                  'bg-orange-900/40 border-orange-500/50';
  const slotBg = color === 'red' ? 'bg-red-800/50' :
                 color === 'blue' ? 'bg-blue-800/50' :
                 'bg-orange-800/50';

  return (
    <div className={`border ${bgColor} p-1`}>
      <div className="flex items-start gap-1">
        <div className={`${slotBg} px-1.5 py-0.5 text-xs font-mono text-white/80 self-stretch flex items-center`}>
          {label}
        </div>
        <div className="flex flex-wrap gap-0.5 flex-1">
          {slots.slice(0, maxSlots).map((itemId, idx) => {
            const item = itemId ? getItemById(itemId) : null;
            return (
              <div
                key={idx}
                className={`w-7 h-7 ${slotBg} border border-white/20 flex items-center justify-center`}
                title={item ? `${item.nameRu} (${formatRoubles(item.value)})` : `Слот ${idx + 1}`}
              >
                {item && <span className="text-sm">{item.icon}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function InventoryTab({ equipment, onUseItem }: InventoryTabProps) {
  // Расчет общей ценности
  const allItems: (string | null)[] = [
    ...(equipment.pockets || []),
    ...(equipment.rig?.items || []),
    ...(equipment.bag?.items || []),
    ...(equipment.backpack?.items || [])
  ];
  const totalValue = calculateTotalValue(allItems);

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок */}
      <div className="border-b border-white/20 pb-2 mb-3">
        <h3 className="text-white font-mono text-sm tracking-wider">ИНВЕНТАРЬ</h3>
      </div>

      <div className="flex gap-2 flex-1 overflow-hidden">
        {/* Левая часть - экипировка */}
        <div className="flex flex-col gap-1 w-28">
          {/* Спец слоты */}
          <div className="flex gap-0.5">
            <EquipmentSlot label="спец1" itemId={equipment.specials?.[0] || null} className="w-8 h-8" />
            <EquipmentSlot label="спец2" itemId={equipment.specials?.[1] || null} className="w-8 h-8" />
            <EquipmentSlot label="спец3" itemId={equipment.specials?.[2] || null} className="w-8 h-8" />
          </div>

          {/* Шлем */}
          <EquipmentSlot label="шлем" itemId={equipment.helmet} className="w-14 h-8" />

          {/* Броня */}
          <EquipmentSlot label="брн" itemId={equipment.armor} className="w-14 h-8" />

          {/* Одежда */}
          <EquipmentSlot label="одеж" itemId={equipment.clothes} className="w-14 h-8" />

          {/* Карманы */}
          <div className="flex gap-0.5">
            {[0, 1, 2, 3].map(i => (
              <EquipmentSlot
                key={i}
                label="карм"
                itemId={equipment.pockets?.[i] || null}
                className="w-7 h-7"
              />
            ))}
          </div>

          {/* Оружие */}
          <EquipmentSlot label="оружие" itemId={equipment.weapon} className="w-full h-8" />

          {/* Обвесы */}
          <div className="flex gap-0.5 text-[8px]">
            <EquipmentSlot label="приц" itemId={equipment.scope} className="w-8 h-7" />
            <EquipmentSlot label="лцу" itemId={equipment.tactical} className="flex-1 h-7" />
            <EquipmentSlot label="глуш" itemId={equipment.suppressor} className="w-8 h-7" />
          </div>
        </div>

        {/* Центр - аватар персонажа */}
        <div className="flex-shrink-0 w-16 flex items-center justify-center">
          <div className="w-14 h-28 border border-white/20 bg-black/30 flex items-center justify-center">
            <svg viewBox="0 0 40 80" className="w-10 h-20">
              {/* Голова */}
              <ellipse cx="20" cy="12" rx="8" ry="10" fill="none" stroke="white" strokeWidth="0.8" />
              {/* Тело */}
              <line x1="20" y1="22" x2="20" y2="50" stroke="white" strokeWidth="0.8" />
              {/* Руки */}
              <line x1="20" y1="28" x2="6" y2="42" stroke="white" strokeWidth="0.8" />
              <line x1="20" y1="28" x2="34" y2="42" stroke="white" strokeWidth="0.8" />
              {/* Ноги */}
              <line x1="20" y1="50" x2="8" y2="72" stroke="white" strokeWidth="0.8" />
              <line x1="20" y1="50" x2="32" y2="72" stroke="white" strokeWidth="0.8" />
            </svg>
          </div>
        </div>

        {/* Правая часть - контейнеры */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {/* Разгрузка (красные слоты) */}
          <ContainerSlots
            container={equipment.rig}
            label="разг"
            color="red"
            maxSlots={4}
          />

          {/* Сумка (синие слоты) */}
          <ContainerSlots
            container={equipment.bag}
            label="сумк"
            color="blue"
            maxSlots={3}
          />

          {/* Рюкзак (оранжевые слоты) */}
          <ContainerSlots
            container={equipment.backpack}
            label="рюкз"
            color="orange"
            maxSlots={8}
          />
        </div>
      </div>

      {/* Ценность */}
      <div className="mt-2 pt-2 border-t border-white/20 flex justify-end">
        <div className="text-right">
          <div className="text-white/50 text-xs font-mono">Ценность</div>
          <div className="text-white font-mono text-lg">{formatRoubles(totalValue)}</div>
        </div>
      </div>
    </div>
  );
}
