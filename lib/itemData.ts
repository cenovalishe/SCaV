/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: lib/itemData.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: База данных игровых предметов - расходники, ценности, оружие
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * SEMANTIC ANCHORS INDEX:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * /START_ANCHOR:ITEMDATA/IMPORTS .............. Импорты типов
 * /START_ANCHOR:ITEMDATA/ITEMS_DATABASE ....... Константа ITEMS (база из 40+ предметов)
 * /START_ANCHOR:ITEMDATA/GET_ITEM_BY_ID ....... Функция getItemById()
 * /START_ANCHOR:ITEMDATA/CALCULATE_VALUE ...... Функция calculateTotalValue()
 * /START_ANCHOR:ITEMDATA/FORMAT_ROUBLES ....... Функция formatRoubles()
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXPORTS OVERVIEW:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CONSTANTS:
 *   ITEMS              - Record<string, Item> - база из 40+ предметов
 *
 * FUNCTIONS:
 *   getItemById(id)              → Item | undefined
 *   calculateTotalValue(itemIds) → number (сумма в рублях)
 *   formatRoubles(value)         → string (форматированная сумма)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DEPENDENCY GRAPH:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * IMPORTS FROM:
 *   ./types → Item
 *
 * IMPORTED BY:
 *   components/InventoryTab.tsx → getItemById, formatRoubles
 *   components/InfoTab.tsx      → getItemById, ITEMS
 *   hooks/useGame.ts            → getItemById, calculateTotalValue
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ITEM CATEGORIES:
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CONSUMABLE (расходники) - используются для восстановления статов
 *   medkit, bandage, pills, food, soda, adrenaline, pizza, cupcake
 *   Эффекты: hp, stamina, speed
 *
 * VALUABLE (ценности) - основной источник рублей при экстракте
 *   LEGENDARY (50k+): golden_freddy, purple_guy_note
 *   RARE (15k-35k): golden_cupcake, foxy_plush, treasure_map, old_tape
 *   COMMON (1k-12k): security_badge, tablet, phone, microphone, guitar
 *   JUNK (<1k): napkin, coin, balloon, soap, poster, newspaper
 *
 * EQUIPMENT (снаряжение) - активные предметы
 *   flashlight, wrench
 *
 * WEAPON (оружие) - боевые предметы
 *   knife, pan
 *
 * KEY (ключи) - открывают двери/локации
 *   key_card
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * LAST MODIFIED: 2024-12-31 | VERSION: 2.0.0 (с семантическими якорями)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:ITEMDATA/IMPORTS
// Импорт типа Item из types.ts
// ═══════════════════════════════════════════════════════════════════════════════

import { Item, CharacterStats, Equipment } from './types';

// /END_ANCHOR:ITEMDATA/IMPORTS

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:ITEMDATA/ITEMS_DATABASE
// База предметов игры - Record<string, Item>
// КОНТРАКТ: Каждый item.id должен совпадать с ключом в объекте
// ═══════════════════════════════════════════════════════════════════════════════

export const ITEMS: Record<string, Item> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // 1x1 ITEMS (Расходники, мелкие предметы)
  // ─────────────────────────────────────────────────────────────────────────────
  medkit: {
    id: 'medkit',
    name: 'Medkit',
    nameRu: 'Аптечка',
    type: 'consumable',
    value: 3500,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🩹',
    effects: [{ stat: 'hp', value: 30, type: 'add' }]
  },
  bandage: {
    id: 'bandage',
    name: 'Bandage',
    nameRu: 'Бинт',
    type: 'consumable',
    value: 500,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🩹',
    effects: [{ stat: 'hp', value: 10, type: 'add' }]
  },
  pills: {
    id: 'pills',
    name: 'Painkillers',
    nameRu: 'Обезболивающее',
    type: 'consumable',
    value: 1200,
    width: 1, height: 1, size: 1, // 1x1
    icon: '💊',
    effects: [{ stat: 'hp', value: 5, type: 'add' }]
  },
  food: {
    id: 'food',
    name: 'Food',
    nameRu: 'Еда',
    type: 'consumable',
    value: 800,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🍕',
    effects: [{ stat: 'stamina', value: 2, type: 'add' }]
  },
  soda: {
    id: 'soda',
    name: 'Soda',
    nameRu: 'Газировка',
    type: 'consumable',
    value: 400,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🥤',
    effects: [{ stat: 'stamina', value: 1, type: 'add' }]
  },
  adrenaline: {
    id: 'adrenaline',
    name: 'Adrenaline',
    nameRu: 'Адреналин',
    type: 'consumable',
    value: 5000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '💉',
    effects: [
      { stat: 'speed', value: 2, type: 'add' },
      { stat: 'stamina', value: 3, type: 'add' }
    ]
  },
  pizza: {
    id: 'pizza',
    name: 'Pizza Slice',
    nameRu: 'Кусок пиццы',
    type: 'consumable',
    value: 600,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🍕',
    effects: [{ stat: 'stamina', value: 1, type: 'add' }]
  },
  cupcake: {
    id: 'cupcake',
    name: 'Cupcake',
    nameRu: 'Кекс',
    type: 'consumable',
    value: 800,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🧁',
    effects: [{ stat: 'stamina', value: 1, type: 'add' }]
  },
  batteries: {
    id: 'batteries',
    name: 'Batteries',
    nameRu: 'Батарейки',
    type: 'consumable',
    value: 300,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🔋',
    stackable: true,
    maxStack: 4
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // VALUABLE - Ценности (LEGENDARY 50k+)
  // ─────────────────────────────────────────────────────────────────────────────
  golden_freddy: {
    id: 'golden_freddy',
    name: 'Golden Freddy Plush',
    nameRu: 'Золотой Фредди',
    type: 'valuable',
    value: 50000,
    width: 2, height: 2, size: 4, // 2x2
    icon: '🧸'
  },
  purple_guy_note: {
    id: 'purple_guy_note',
    name: 'Purple Guy Note',
    nameRu: 'Записка Фиолетового',
    type: 'valuable',
    value: 100000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '📜'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // VALUABLE - Ценности (RARE 15k-35k)
  // ─────────────────────────────────────────────────────────────────────────────
  golden_cupcake: {
    id: 'golden_cupcake',
    name: 'Golden Cupcake',
    nameRu: 'Золотой кекс',
    type: 'valuable',
    value: 35000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🧁'
  },
  foxy_plush: {
    id: 'foxy_plush',
    name: 'Foxy Plush',
    nameRu: 'Плюшевый Фокси',
    type: 'valuable',
    value: 25000,
    width: 2, height: 2, size: 4, // 2x2
    icon: '🦊'
  },
  treasure_map: {
    id: 'treasure_map',
    name: 'Treasure Map',
    nameRu: 'Карта сокровищ',
    type: 'valuable',
    value: 15000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🗺️'
  },
  old_tape: {
    id: 'old_tape',
    name: 'Old VHS Tape',
    nameRu: 'Старая кассета',
    type: 'valuable',
    value: 20000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '📼'
  },
  secret_note: {
    id: 'secret_note',
    name: 'Secret Note',
    nameRu: 'Секретная записка',
    type: 'valuable',
    value: 18000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '📝'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // VALUABLE - Ценности (COMMON 1k-12k)
  // ─────────────────────────────────────────────────────────────────────────────
  security_badge: {
    id: 'security_badge',
    name: 'Security Badge',
    nameRu: 'Бейдж охранника',
    type: 'valuable',
    value: 8000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🪪'
  },
  tablet: {
    id: 'tablet',
    name: 'Tablet',
    nameRu: 'Планшет',
    type: 'valuable',
    value: 12000,
    width: 2, height: 2, size: 4, // 2x2
    icon: '📱'
  },
  phone: {
    id: 'phone',
    name: 'Phone',
    nameRu: 'Телефон',
    type: 'valuable',
    value: 6000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '📞'
  },
  microphone: {
    id: 'microphone',
    name: 'Microphone',
    nameRu: 'Микрофон',
    type: 'valuable',
    value: 4500,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🎤'
  },
  guitar: {
    id: 'guitar',
    name: 'Guitar',
    nameRu: 'Гитара',
    type: 'valuable',
    value: 7500,
    width: 1, height: 2, size: 2, // 1x1
    icon: '🎸'
  },
  hook: {
    id: 'hook',
    name: 'Hook',
    nameRu: 'Крюк',
    type: 'valuable',
    value: 5500,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🪝'
  },
  eyepatch: {
    id: 'eyepatch',
    name: 'Eyepatch',
    nameRu: 'Повязка на глаз',
    type: 'valuable',
    value: 3000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🏴‍☠️'
  },
  spare_parts: {
    id: 'spare_parts',
    name: 'Spare Parts',
    nameRu: 'Запчасти',
    type: 'valuable',
    value: 2500,
    width: 1, height: 1, size: 1, // 1x1
    icon: '⚙️',
    stackable: true,
    maxStack: 5
  },
  party_hat: {
    id: 'party_hat',
    name: 'Party Hat',
    nameRu: 'Праздничный колпак',
    type: 'valuable',
    value: 1500,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🎉'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // VALUABLE - Ценности (JUNK <1k)
  // ─────────────────────────────────────────────────────────────────────────────
  napkin: {
    id: 'napkin',
    name: 'Napkin',
    nameRu: 'Салфетка',
    type: 'valuable',
    value: 50,
    width: 1, height: 1, size: 1, // 1x1
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
    width: 1, height: 1, size: 1, // 1x1
    icon: '🪙',
    stackable: true,
    maxStack: 10
  },
  balloon: {
    id: 'balloon',
    name: 'Balloon',
    nameRu: 'Воздушный шар',
    type: 'valuable',
    value: 200,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🎈'
  },
  toilet_paper: {
    id: 'toilet_paper',
    name: 'Toilet Paper',
    nameRu: 'Туалетная бумага',
    type: 'valuable',
    value: 150,
    width: 1, height: 1, size: 1, // 1x1
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
    width: 1, height: 1, size: 1, // 1x1
    icon: '🧼'
  },
  poster: {
    id: 'poster',
    name: 'Poster',
    nameRu: 'Постер',
    type: 'valuable',
    value: 400,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🖼️'
  },
  newspaper: {
    id: 'newspaper',
    name: 'Newspaper',
    nameRu: 'Газета',
    type: 'valuable',
    value: 300,
    width: 1, height: 1, size: 1, // 1x1
    icon: '📰'
  },
  cleaning_supplies: {
    id: 'cleaning_supplies',
    name: 'Cleaning Supplies',
    nameRu: 'Моющие средства',
    type: 'valuable',
    value: 700,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🧹'
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // EQUIPMENT - Снаряжение (с модификаторами статов при экипировке)
  // ─────────────────────────────────────────────────────────────────────────────
  flashlight: {
    id: 'flashlight',
    name: 'Flashlight',
    nameRu: 'Фонарик',
    type: 'equipment',
    subType: 'module',
    value: 2000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🔦',
    statModifiers: { stealth: 2 } // Освещает путь - лучше видишь врагов
  },
  wrench: {
    id: 'wrench',
    name: 'Wrench',
    nameRu: 'Гаечный ключ',
    type: 'equipment',
    subType: 'module',
    value: 1800,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🔧',
    statModifiers: { attack: 1, defense: 1 } // Можно использовать как оружие
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ARMOR - Броня и защита (новые предметы)
  // ─────────────────────────────────────────────────────────────────────────────
  security_helmet: {
    id: 'security_helmet',
    name: 'Security Helmet',
    nameRu: 'Шлем охранника',
    type: 'equipment',
    subType: 'helmet',
    value: 5000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '⛑️',
    statModifiers: { defense: 2, maxHp: 10 }
  },
  security_vest: {
    id: 'security_vest',
    name: 'Security Vest',
    nameRu: 'Бронежилет охранника',
    type: 'equipment',
    subType: 'armor',
    value: 8000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🦺',
    statModifiers: { defense: 3, speed: -1 }
  },
  night_vision: {
    id: 'night_vision',
    name: 'Night Vision Goggles',
    nameRu: 'Прибор ночного видения',
    type: 'equipment',
    subType: 'helmet',
    value: 12000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🥽',
    statModifiers: { stealth: 3, luck: 1 }
  },
  sneakers: {
    id: 'sneakers',
    name: 'Sneakers',
    nameRu: 'Кроссовки',
    type: 'equipment',
    subType: 'any',
    value: 3000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '👟',
    statModifiers: { speed: 2, stealth: 1 }
  },
  tactical_gloves: {
    id: 'tactical_gloves',
    name: 'Tactical Gloves',
    nameRu: 'Тактические перчатки',
    type: 'equipment',
    subType: 'any',
    value: 2500,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🧤',
    statModifiers: { attack: 1, luck: 1 }
  },
  backpack_large: {
    id: 'backpack_large',
    name: 'Large Backpack',
    nameRu: 'Большой рюкзак',
    type: 'equipment',
    subType: 'any',
    value: 6000,
    width: 2, height: 2, size: 4, // 2x2
    icon: '🎒',
    statModifiers: { capacity: 10, speed: -1 }
  },
  lucky_charm: {
    id: 'lucky_charm',
    name: 'Lucky Charm',
    nameRu: 'Талисман удачи',
    type: 'equipment',
    subType: 'any',
    value: 4000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🍀',
    statModifiers: { luck: 3 }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WEAPON - Оружие (с модификаторами при экипировке в слот оружия)
  // ─────────────────────────────────────────────────────────────────────────────
  knife: {
    id: 'knife',
    name: 'Kitchen Knife',
    nameRu: 'Кухонный нож',
    type: 'weapon',
    subType: 'weapon',
    value: 3500,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🔪',
    statModifiers: { attack: 3, speed: 1 }
  },
  pan: {
    id: 'pan',
    name: 'Frying Pan',
    nameRu: 'Сковорода',
    type: 'weapon',
    subType: 'weapon',
    value: 2000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🍳',
    statModifiers: { attack: 2, defense: 2 }
  },
  bat: {
    id: 'bat',
    name: 'Baseball Bat',
    nameRu: 'Бейсбольная бита',
    type: 'weapon',
    subType: 'weapon',
    value: 4000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🏏',
    statModifiers: { attack: 4 }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // KEY - Ключи
  // ─────────────────────────────────────────────────────────────────────────────
  key_card: {
    id: 'key_card',
    name: 'Key Card',
    nameRu: 'Ключ-карта',
    type: 'key',
    subType: 'key',
    value: 10000,
    width: 1, height: 1, size: 1, // 1x1
    icon: '🗝️'
  }
};

// /END_ANCHOR:ITEMDATA/ITEMS_DATABASE

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:ITEMDATA/GET_ITEM_BY_ID
// Получить предмет по ID
// КОНТРАКТ: Возвращает undefined если предмет не найден
// ═══════════════════════════════════════════════════════════════════════════════

export function getItemById(itemId: string): Item | undefined {
  return ITEMS[itemId];
}

// /END_ANCHOR:ITEMDATA/GET_ITEM_BY_ID

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:ITEMDATA/CALCULATE_VALUE
// Рассчитать общую ценность массива предметов
// КОНТРАКТ: Пропускает null значения, возвращает 0 для пустого массива
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateTotalValue(itemIds: (string | null)[]): number {
  return itemIds.reduce((total, itemId) => {
    if (!itemId) return total;
    const item = getItemById(itemId);
    return total + (item?.value || 0);
  }, 0);
}

// /END_ANCHOR:ITEMDATA/CALCULATE_VALUE

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:ITEMDATA/FORMAT_ROUBLES
// Форматирование ценности в рубли с разделителями
// КОНТРАКТ: Использует русскую локаль, добавляет символ ₽
// ═══════════════════════════════════════════════════════════════════════════════

export function formatRoubles(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value) + ' ₽';
}

// /END_ANCHOR:ITEMDATA/FORMAT_ROUBLES

// ═══════════════════════════════════════════════════════════════════════════════
// /START_ANCHOR:ITEMDATA/STAT_MODIFIERS
// Расчёт эффективных статов с учётом экипированных предметов
// КОНТРАКТ: Возвращает итоговые статы = базовые + модификаторы от экипировки
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Рассчитывает эффективные характеристики с учётом экипированных предметов
 * @param baseStats - Базовые характеристики персонажа
 * @param equipment - Экипировка персонажа
 * @returns Объект с эффективными статами и детализацией модификаторов
 */
export function calculateEffectiveStats(
  baseStats: CharacterStats,
  equipment: Equipment
): { stats: CharacterStats; modifiers: Partial<CharacterStats>; itemBonuses: { itemId: string; bonuses: Partial<CharacterStats> }[] } {
  const modifiers: Partial<CharacterStats> = {};
  const itemBonuses: { itemId: string; bonuses: Partial<CharacterStats> }[] = [];

  // Функция для добавления модификаторов от предмета
  const addModifiersFromItem = (itemId: string | null) => {
    if (!itemId) return;
    const item = getItemById(itemId);
    if (!item?.statModifiers) return;

    itemBonuses.push({ itemId, bonuses: { ...item.statModifiers } });

    for (const [stat, value] of Object.entries(item.statModifiers)) {
      const statKey = stat as keyof CharacterStats;
      modifiers[statKey] = (modifiers[statKey] || 0) + (value as number);
    }
  };

  // Слоты экипировки (шлем, броня, оружие и модули)
  addModifiersFromItem(equipment.helmet);
  addModifiersFromItem(equipment.armor);
  addModifiersFromItem(equipment.weapon);

  // Модули (3 слота)
  if (equipment.modules) {
    for (const itemId of equipment.modules) {
      addModifiersFromItem(itemId);
    }
  }

  // Карманы (все 4)
  if (equipment.pockets) {
    for (const itemId of equipment.pockets) {
      addModifiersFromItem(itemId);
    }
  }

  // Спецслоты (все 3)
  if (equipment.specials) {
    for (const itemId of equipment.specials) {
      addModifiersFromItem(itemId);
    }
  }

  // Расчёт итоговых статов
  const effectiveStats: CharacterStats = {
    attack: Math.max(0, baseStats.attack + (modifiers.attack || 0)),
    defense: Math.max(0, baseStats.defense + (modifiers.defense || 0)),
    speed: Math.max(0, baseStats.speed + (modifiers.speed || 0)),
    stealth: Math.max(0, baseStats.stealth + (modifiers.stealth || 0)),
    luck: Math.max(0, baseStats.luck + (modifiers.luck || 0)),
    capacity: Math.max(1, baseStats.capacity + (modifiers.capacity || 0)),
    hp: baseStats.hp, // HP не меняется от экипировки напрямую
    maxHp: Math.max(1, baseStats.maxHp + (modifiers.maxHp || 0)),
    stamina: baseStats.stamina, // Stamina не меняется от экипировки
    maxStamina: Math.max(1, baseStats.maxStamina + (modifiers.maxStamina || 0)),
  };

  return { stats: effectiveStats, modifiers, itemBonuses };
}

/**
 * Получает только модификаторы от экипировки (без базовых статов)
 */
export function getEquipmentModifiers(equipment: Equipment): Partial<CharacterStats> {
  const result = calculateEffectiveStats(
    { attack: 0, defense: 0, speed: 0, stealth: 0, luck: 0, capacity: 0, hp: 0, maxHp: 0, stamina: 0, maxStamina: 0 },
    equipment
  );
  return result.modifiers;
}

// /END_ANCHOR:ITEMDATA/STAT_MODIFIERS
