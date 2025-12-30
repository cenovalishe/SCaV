/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE: components/PlayerSelection.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Экран выбора игрока из 6 фиксированных слотов при первом заходе
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState } from 'react';

// Фиксированные 6 игроков
export const PLAYER_SLOTS = [
  { id: 'player_1', name: 'Дикий Альфа', nameEn: 'Wild Alpha', color: '#A855F7' },
  { id: 'player_2', name: 'Дикий Браво', nameEn: 'Wild Bravo', color: '#22C55E' },
  { id: 'player_3', name: 'Дикий Чарли', nameEn: 'Wild Charlie', color: '#F97316' },
  { id: 'player_4', name: 'Дикий Дельта', nameEn: 'Wild Delta', color: '#06B6D4' },
  { id: 'player_5', name: 'Дикий Эхо', nameEn: 'Wild Echo', color: '#EC4899' },
  { id: 'player_6', name: 'Дикий Фокстрот', nameEn: 'Wild Foxtrot', color: '#84CC16' },
];

interface PlayerSelectionProps {
  takenSlots: string[]; // IDs уже занятых слотов
  onSelectPlayer: (playerId: string, playerName: string) => void;
}

export default function PlayerSelection({ takenSlots, onSelectPlayer }: PlayerSelectionProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    if (!selectedSlot) return;
    const slot = PLAYER_SLOTS.find(s => s.id === selectedSlot);
    if (!slot) return;

    setConfirming(true);
    onSelectPlayer(slot.id, slot.name);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-500 font-mono mb-2">
            ВЫБОР ПЕРСОНАЖА
          </h1>
          <p className="text-white/50 font-mono text-sm">
            Выберите одного из 6 диких (scavs) для игры
          </p>
        </div>

        {/* Сетка игроков */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {PLAYER_SLOTS.map((slot) => {
            const isTaken = takenSlots.includes(slot.id);
            const isSelected = selectedSlot === slot.id;

            return (
              <button
                key={slot.id}
                onClick={() => !isTaken && setSelectedSlot(slot.id)}
                disabled={isTaken}
                className={`
                  relative p-4 border-2 rounded-lg transition-all
                  ${isTaken
                    ? 'bg-zinc-900 border-zinc-700 cursor-not-allowed opacity-50'
                    : isSelected
                      ? 'bg-zinc-800 border-green-500 shadow-lg shadow-green-500/20'
                      : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 cursor-pointer'
                  }
                `}
              >
                {/* Индикатор занятости */}
                {isTaken && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-900/50 border border-red-500/30 rounded text-[10px] text-red-400 font-mono">
                    ЗАНЯТ
                  </div>
                )}

                {/* Аватар */}
                <div
                  className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ backgroundColor: slot.color }}
                >
                  {slot.name.charAt(0)}
                </div>

                {/* Имя */}
                <div className="text-center">
                  <div className="font-mono text-white font-bold text-sm">
                    {slot.name}
                  </div>
                  <div className="font-mono text-white/40 text-xs">
                    {slot.nameEn}
                  </div>
                </div>

                {/* Индикатор выбора */}
                {isSelected && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-green-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Кнопка подтверждения */}
        <div className="flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!selectedSlot || confirming}
            className={`
              px-8 py-3 font-mono text-lg font-bold transition-all border-2 rounded-lg
              ${selectedSlot && !confirming
                ? 'bg-green-600 hover:bg-green-500 text-white border-green-500 hover:border-green-400'
                : 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
              }
            `}
          >
            {confirming ? 'Подключение...' : selectedSlot ? 'Подтвердить выбор' : 'Выберите персонажа'}
          </button>
        </div>

        {/* Информация */}
        <div className="mt-8 text-center">
          <p className="text-white/30 font-mono text-xs">
            Доступно слотов: {6 - takenSlots.length} / 6
          </p>
        </div>
      </div>
    </div>
  );
}
