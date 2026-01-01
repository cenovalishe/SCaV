/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: lib/pvpConfig.ts
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 *   Конфигурация PvP системы для игры SCaV.
 *   Определяет зоны PvP, правила боя и механики взаимодействия игроков.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PVP ЗОНЫ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Точки маршрута, где действует PvP
 * PvP зона начинается после точек D и A
 */
export const PVP_ENABLED_NODES = new Set([
  '9',  // Backstage
  '8',  // Pirate Cove
  '6',  // West Hall
  '7',  // Supply Closet
  '5',  // East Hall
  '4',  // Kitchen
  '3',  // Restrooms
  'B',  // Waypoint B
  'V',  // Waypoint V
  'D',  // Waypoint D
  'G',  // Waypoint G
]);

/**
 * Безопасные зоны, где PvP отключен
 */
export const PVP_SAFE_NODES = new Set([
  'SF', // Start/Finish
  'X',  // Loop Distributor
  'Y',  // Office (Loop End)
  '1',  // Stage
  '2',  // Dining Area
]);

/**
 * Проверка, находится ли узел в PvP зоне
 */
export function isPvpZone(nodeId: string): boolean {
  return PVP_ENABLED_NODES.has(nodeId);
}

/**
 * Проверка, находится ли узел в безопасной зоне
 */
export function isSafeZone(nodeId: string): boolean {
  return PVP_SAFE_NODES.has(nodeId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PVP ПРАВИЛА БОЯ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Максимальное количество раундов в PvP бою
 */
export const PVP_MAX_ROUNDS = 3;

/**
 * Множитель урона при успешной атаке
 */
export const PVP_DAMAGE_MULTIPLIER = 5;

/**
 * Процент случайных предметов, которые получает победитель
 * 1/3 = примерно 0.33
 */
export const PVP_LOOT_PERCENTAGE = 0.33;

/**
 * Расчет урона в PvP
 * @param attackerAttack - значение атаки атакующего
 * @param defenderDefense - значение защиты защищающегося
 * @returns урон, который будет нанесен
 */
export function calculatePvPDamage(attackerAttack: number, defenderDefense: number): number {
  if (attackerAttack > defenderDefense) {
    return PVP_DAMAGE_MULTIPLIER;
  }
  return 0;
}

/**
 * Бросок кубика для инициативы (d20)
 * @returns случайное число от 1 до 20
 */
export function rollInitiative(): number {
  return Math.floor(Math.random() * 20) + 1;
}

/**
 * Расчет количества случайных предметов для передачи победителю
 * @param inventorySize - размер инвентаря проигравшего
 * @returns количество предметов для передачи
 */
export function calculateLootAmount(inventorySize: number): number {
  return Math.ceil(inventorySize * PVP_LOOT_PERCENTAGE);
}
