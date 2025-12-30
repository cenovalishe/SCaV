/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: lib/itemData.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: База данных игровых предметов - расходники, ценности, оружие
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ CONSTANTS:                                                                  │
 * │   ITEMS              - Record<string, Item> - база из 40+ предметов        │
 * │                                                                             │
 * │ FUNCTIONS:                                                                  │
 * │   getItemById(id)              → Item | undefined                          │
 * │   calculateTotalValue(itemIds) → number (сумма в рублях)                   │
 * │   formatRoubles(value)         → string (форматированная сумма)            │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   ./types → Item                                                           │
 * │                                                                             │
 * │ IMPORTED BY:                                                                │
 * │   components/InventoryTab.tsx → getItemById, formatRoubles                 │
 * │   components/InfoTab.tsx      → getItemById, ITEMS                         │
 * │   hooks/useGame.ts            → getItemById, calculateTotalValue           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ ITEM CATEGORIES                                                             │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │ CONSUMABLE (расходники) - используются для восстановления статов           │
 * │   medkit, bandage, pills, food, soda, adrenaline, pizza, cupcake           │
 * │   Эффекты: hp, stamina, speed                                              │
 * │                                                                             │
 * │ VALUABLE (ценности) - основной источник рублей при экстракте               │
 * │   LEGENDARY (50k+): golden_freddy, purple_guy_note                         │
 * │   RARE (15k-35k): golden_cupcake, foxy_plush, treasure_map, old_tape       │
 * │   COMMON (1k-12k): security_badge, tablet, phone, microphone, guitar       │
 * │   JUNK (<1k): napkin, coin, balloon, soap, poster, newspaper               │
 * │                                                                             │
 * │ EQUIPMENT (снаряжение) - активные предметы                                 │
 * │   flashlight, wrench                                                       │
 * │                                                                             │
 * │ WEAPON (оружие) - боевые предметы                                          │
 * │   knife, pan                                                               │
 * │                                                                             │
 * │ KEY (ключи) - открывают двери/локации                                      │
 * │   key_card                                                                 │
 * │                                                                             │
 * │ STACKABLE предметы: batteries, spare_parts, napkin, coin, toilet_paper     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ VALUE TIERS (для баланса)                                                   │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │   100k₽  - purple_guy_note (уникальный)                                    │
 * │   50k₽   - golden_freddy                                                   │
 * │   25-35k - golden_cupcake, foxy_plush                                      │
 * │   15-20k - treasure_map, old_tape, secret_note                             │
 * │   5-12k  - tablet, security_badge, key_card, phone, hook, guitar           │
 * │   1-5k   - medkit, adrenaline, microphone, knife, flashlight               │
 * │   <1k    - bandage, food, soda, napkin, coin, etc                          │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Item } from './types';

// База предметов игры
export const ITEMS: Record<string, Item> = {
  // Расходники
  medkit: {
    id: 'medkit',
    name: 'Medkit',
    nameRu: 'Аптечка',
    type: 'consumable',
    value: 3500,
    size: 1,
    icon: '🩹',
    effects: [{ stat: 'hp', value: 30, type: 'add' }]
  },
  bandage: {
    id: 'bandage',
    name: 'Bandage',
    nameRu: 'Бинт',
    type: 'consumable',
    value: 500,
    size: 1,
    icon: '🩹',
    effects: [{ stat: 'hp', value: 10, type: 'add' }]
  },
  pills: {
    id: 'pills',
    name: 'Painkillers',
    nameRu: 'Обезболивающее',
    type: 'consumable',
    value: 1200,
    size: 1,
    icon: '💊',
    effects: [{ stat: 'hp', value: 5, type: 'add' }]
  },
  food: {
    id: 'food',
    name: 'Food',
    nameRu: 'Еда',
    type: 'consumable',
    value: 800,
    size: 1,
    icon: '🍕',
    effects: [{ stat: 'stamina', value: 2, type: 'add' }]
  },
  soda: {
    id: 'soda',
    name: 'Soda',
    nameRu: 'Газировка',
    type: 'consumable',
    value: 400,
    size: 1,
    icon: '🥤',
    effects: [{ stat: 'stamina', value: 1, type: 'add' }]
  },
  adrenaline: {
    id: 'adrenaline',
    name: 'Adrenaline',
    nameRu: 'Адреналин',
    type: 'consumable',
    value: 5000,
    size: 1,
    icon: '💉',
    effects: [
      { stat: 'speed', value: 2, type: 'add' },
      { stat: 'stamina', value: 3, type: 'add' }
    ]
  },

  // Ценные предметы
  golden_freddy: {
    id: 'golden_freddy',
    name: 'Golden Freddy Plush',
    nameRu: 'Золотой Фредди',
    type: 'valuable',
    value: 50000,
    size: 2,
    icon: '🧸'
  },
  golden_cupcake: {
    id: 'golden_cupcake',
    name: 'Golden Cupcake',
    nameRu: 'Золотой кекс',
    type: 'valuable',
    value: 35000,
    size: 1,
    icon: '🧁'
  },
  foxy_plush: {
    id: 'foxy_plush',
    name: 'Foxy Plush',
    nameRu: 'Плюшевый Фокси',
    type: 'valuable',
    value: 25000,
    size: 2,
    icon: '🦊'
  },
  treasure_map: {
    id: 'treasure_map',
    name: 'Treasure Map',
    nameRu: 'Карта сокровищ',
    type: 'valuable',
    value: 15000,
    size: 1,
    icon: '🗺️'
  },
  purple_guy_note: {
    id: 'purple_guy_note',
    name: 'Purple Guy Note',
    nameRu: 'Записка Фиолетового',
    type: 'valuable',
    value: 100000,
    size: 1,
    icon: '📜'
  },
  security_badge: {
    id: 'security_badge',
    name: 'Security Badge',
    nameRu: 'Бейдж охранника',
    type: 'valuable',
    value: 8000,
    size: 1,
    icon: '🪪'
  },
  tablet: {
    id: 'tablet',
    name: 'Tablet',
    nameRu: 'Планшет',
    type: 'valuable',
    value: 12000,
    size: 2,
    icon: '📱'
  },
  phone: {
    id: 'phone',
    name: 'Phone',
    nameRu: 'Телефон',
    type: 'valuable',
    value: 6000,
    size: 1,
    icon: '📞'
  },
  old_tape: {
    id: 'old_tape',
    name: 'Old VHS Tape',
    nameRu: 'Старая кассета',
    type: 'valuable',
    value: 20000,
    size: 1,
    icon: '📼'
  },
  secret_note: {
    id: 'secret_note',
    name: 'Secret Note',
    nameRu: 'Секретная записка',
    type: 'valuable',
    value: 18000,
    size: 1,
    icon: '📝'
  },

  // Обычные предметы
  microphone: {
    id: 'microphone',
    name: 'Microphone',
    nameRu: 'Микрофон',
    type: 'valuable',
    value: 4500,
    size: 1,
    icon: '🎤'
  },
  guitar: {
    id: 'guitar',
    name: 'Guitar',
    nameRu: 'Гитара',
    type: 'valuable',
    value: 7500,
    size: 3,
    icon: '🎸'
  },
  pizza: {
    id: 'pizza',
    name: 'Pizza Slice',
    nameRu: 'Кусок пиццы',
    type: 'consumable',
    value: 600,
    size: 1,
    icon: '🍕',
    effects: [{ stat: 'stamina', value: 1, type: 'add' }]
  },
  party_hat: {
    id: 'party_hat',
    name: 'Party Hat',
    nameRu: 'Праздничный колпак',
    type: 'valuable',
    value: 1500,
    size: 1,
    icon: '🎉'
  },
  flashlight: {
    id: 'flashlight',
    name: 'Flashlight',
    nameRu: 'Фонарик',
    type: 'equipment',
    value: 2000,
    size: 1,
    icon: '🔦'
  },
  batteries: {
    id: 'batteries',
    name: 'Batteries',
    nameRu: 'Батарейки',
    type: 'consumable',
    value: 300,
    size: 1,
    icon: '🔋',
    stackable: true,
    maxStack: 4
  },
  hook: {
    id: 'hook',
    name: 'Hook',
    nameRu: 'Крюк',
    type: 'valuable',
    value: 5500,
    size: 1,
    icon: '🪝'
  },
  eyepatch: {
    id: 'eyepatch',
    name: 'Eyepatch',
    nameRu: 'Повязка на глаз',
    type: 'valuable',
    value: 3000,
    size: 1,
    icon: '🏴‍☠️'
  },
  wrench: {
    id: 'wrench',
    name: 'Wrench',
    nameRu: 'Гаечный ключ',
    type: 'equipment',
    value: 1800,
    size: 1,
    icon: '🔧'
  },
  spare_parts: {
    id: 'spare_parts',
    name: 'Spare Parts',
    nameRu: 'Запчасти',
    type: 'valuable',
    value: 2500,
    size: 1,
    icon: '⚙️',
    stackable: true,
    maxStack: 5
  },
  napkin: {
    id: 'napkin',
    name: 'Napkin',
    nameRu: 'Салфетка',
    type: 'valuable',
    value: 50,
    size: 1,
    icon: '🧻',
    stackable: true,
    maxStack: 10
  },
  coin: {
    id: 'coin',
    name: 'Coin',
    nameRu: 'Монета',
    type: 'valuable',
    value: 100,
    size: 1,
    icon: '🪙',
    stackable: true,
    maxStack: 10
  },
  cupcake: {
    id: 'cupcake',
    name: 'Cupcake',
    nameRu: 'Кекс',
    type: 'consumable',
    value: 800,
    size: 1,
    icon: '🧁',
    effects: [{ stat: 'stamina', value: 1, type: 'add' }]
  },
  balloon: {
    id: 'balloon',
    name: 'Balloon',
    nameRu: 'Воздушный шар',
    type: 'valuable',
    value: 200,
    size: 1,
    icon: '🎈'
  },
  toilet_paper: {
    id: 'toilet_paper',
    name: 'Toilet Paper',
    nameRu: 'Туалетная бумага',
    type: 'valuable',
    value: 150,
    size: 1,
    icon: '🧻',
    stackable: true,
    maxStack: 5
  },
  soap: {
    id: 'soap',
    name: 'Soap',
    nameRu: 'Мыло',
    type: 'valuable',
    value: 250,
    size: 1,
    icon: '🧼'
  },
  knife: {
    id: 'knife',
    name: 'Kitchen Knife',
    nameRu: 'Кухонный нож',
    type: 'weapon',
    value: 3500,
    size: 1,
    icon: '🔪'
  },
  pan: {
    id: 'pan',
    name: 'Frying Pan',
    nameRu: 'Сковорода',
    type: 'weapon',
    value: 2000,
    size: 2,
    icon: '🍳'
  },
  poster: {
    id: 'poster',
    name: 'Poster',
    nameRu: 'Постер',
    type: 'valuable',
    value: 400,
    size: 1,
    icon: '🖼️'
  },
  newspaper: {
    id: 'newspaper',
    name: 'Newspaper',
    nameRu: 'Газета',
    type: 'valuable',
    value: 300,
    size: 1,
    icon: '📰'
  },
  key_card: {
    id: 'key_card',
    name: 'Key Card',
    nameRu: 'Ключ-карта',
    type: 'key',
    value: 10000,
    size: 1,
    icon: '🗝️'
  },
  cleaning_supplies: {
    id: 'cleaning_supplies',
    name: 'Cleaning Supplies',
    nameRu: 'Моющие средства',
    type: 'valuable',
    value: 700,
    size: 1,
    icon: '🧹'
  }
};

// Получить предмет по ID
export function getItemById(itemId: string): Item | undefined {
  return ITEMS[itemId];
}

// Рассчитать общую ценность массива предметов
export function calculateTotalValue(itemIds: (string | null)[]): number {
  return itemIds.reduce((total, itemId) => {
    if (!itemId) return total;
    const item = getItemById(itemId);
    return total + (item?.value || 0);
  }, 0);
}

// Форматирование ценности в рубли
export function formatRoubles(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
}
