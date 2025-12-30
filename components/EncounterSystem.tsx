/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/EncounterSystem.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Система встречи с аниматроником - оркестрация броска кубика и колеса
 *
 * FLOW:
 *   1. Показ броска кубика на уклонение
 *   2. Если успех → закрытие без урона
 *   3. Если провал → показ колеса-рандомайзера для определения урона
 *   4. Применение урона и закрытие
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ PROPS:                                                                      │
 * │   animatronicName  - string - имя аниматроника                             │
 * │   animatronicType  - string - тип аниматроника (для расчёта сложности)     │
 * │   playerStealth    - number - бонус скрытности игрока                      │
 * │   onComplete       - (result: EncounterResult) => void                     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useCallback } from 'react';
import DiceRoll from './DiceRoll';
import WheelRandomizer from './WheelRandomizer';

export interface EncounterResult {
  evaded: boolean;          // Уклонился ли игрок
  diceRoll: number;         // Результат броска кубика
  damageReceived: number;   // Полученный урон (0 если уклонился)
  animatronicName: string;
}

interface EncounterSystemProps {
  animatronicName: string;
  animatronicType: string;
  playerStealth: number;
  onComplete: (result: EncounterResult) => void;
}

type EncounterPhase = 'dice' | 'wheel' | 'result';

// Сложность уклонения по типу аниматроника
const ANIMATRONIC_DIFFICULTY: Record<string, number> = {
  'foxy': 5,     // Сложнее всего - очень быстрый
  'freddy': 4,   // Средне-высокая сложность
  'bonnie': 4,   // Средняя
  'chica': 3,    // Легче всего
  'default': 4
};

export default function EncounterSystem({
  animatronicName,
  animatronicType,
  playerStealth,
  onComplete
}: EncounterSystemProps) {
  const [phase, setPhase] = useState<EncounterPhase>('dice');
  const [diceRollResult, setDiceRollResult] = useState<number | null>(null);
  const [evaded, setEvaded] = useState<boolean | null>(null);

  // Получаем сложность для данного аниматроника
  const targetValue = ANIMATRONIC_DIFFICULTY[animatronicType.toLowerCase()] || ANIMATRONIC_DIFFICULTY.default;

  // Обработка результата броска кубика
  const handleDiceResult = useCallback((success: boolean, roll: number) => {
    setDiceRollResult(roll);
    setEvaded(success);

    if (success) {
      // Уклонение успешно - завершаем без урона
      setTimeout(() => {
        onComplete({
          evaded: true,
          diceRoll: roll,
          damageReceived: 0,
          animatronicName
        });
      }, 500);
    } else {
      // Провал - переходим к колесу урона
      setPhase('wheel');
    }
  }, [animatronicName, onComplete]);

  // Обработка результата колеса
  const handleWheelResult = useCallback((damage: number) => {
    setPhase('result');

    // Небольшая задержка для показа результата, затем завершение
    setTimeout(() => {
      onComplete({
        evaded: false,
        diceRoll: diceRollResult || 0,
        damageReceived: damage,
        animatronicName
      });
    }, 500);
  }, [diceRollResult, animatronicName, onComplete]);

  return (
    <>
      {phase === 'dice' && (
        <DiceRoll
          targetValue={targetValue}
          stealthBonus={playerStealth}
          onResult={handleDiceResult}
          animatronicName={animatronicName}
        />
      )}

      {phase === 'wheel' && (
        <WheelRandomizer
          onResult={handleWheelResult}
          title={`${animatronicName} АТАКУЕТ!`}
        />
      )}

      {phase === 'result' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="text-center animate-pulse">
            <div className="text-white/50 font-mono">Обработка...</div>
          </div>
        </div>
      )}
    </>
  );
}
