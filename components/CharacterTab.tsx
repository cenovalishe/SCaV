/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/CharacterTab.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Вкладка персонажа - одна колонка статов + большое поле аватара (REDESIGNED v3.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES v3.0                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Характеристики в одной колонке                                            │
 * │ - Большое поле аватара (для изображения персонажа)                         │
 * │ - Компактные HP/Stamina бары                                                │
 * │ - Стилизованный дизайн                                                      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { CharacterStats, Equipment } from '@/lib/types';
import { calculateEffectiveStats } from '@/lib/itemData';
import Image from 'next/image';

interface CharacterTabProps {
  stats: CharacterStats;
  playerName: string;
  equipment?: Equipment;
}

// Названия характеристик с иконками
const STAT_LABELS: Record<keyof Omit<CharacterStats, 'maxHp' | 'maxStamina'>, { ru: string; icon: string; color: string }> = {
  attack: { ru: 'АТК', icon: '⚔️', color: 'text-red-400' },
  defense: { ru: 'ЗАЩ', icon: '🛡️', color: 'text-blue-400' },
  speed: { ru: 'СКР', icon: '💨', color: 'text-cyan-400' },
  stealth: { ru: 'СКР', icon: '👁️', color: 'text-purple-400' },
  luck: { ru: 'УДЧ', icon: '🍀', color: 'text-green-400' },
  hp: { ru: 'ХП', icon: '❤️', color: 'text-red-500' },
  stamina: { ru: 'ВЫН', icon: '⚡', color: 'text-yellow-400' }
};

function getHpBarColor(percent: number): string {
  if (percent > 70) return 'bg-green-500';
  if (percent > 40) return 'bg-yellow-500';
  if (percent > 20) return 'bg-orange-500';
  return 'bg-red-600';
}

function getStatColor(value: number): string {
  if (value >= 8) return 'text-green-400';
  if (value >= 5) return 'text-yellow-400';
  if (value >= 3) return 'text-orange-400';
  return 'text-red-400';
}

// Карта соответствия имен и файлов. 
// Ключи (слева) должны совпадать с playerName, который приходит в компонент.
const AVATAR_MAP: Record<string, string> = {
  'Егор Шокеридзе': '/avatars/Gemini_Generated_Image_kd8ffmkd8ffmkd8f.jpg', // player_shoker
  'Сева Пармезан': '/avatars/Gemini_Generated_Image_bnrjhkbnrjhkbnrj.jpg',  // player_manki
  'Толя Самара': '/avatars/Gemini_Generated_Image_r4h8kdr4h8kdr4h8.jpg',    // player_sunekoi
  'Иван Кимпентяо': '/avatars/Gemini_Generated_Image_ncif9qncif9qncif.jpg', // player_marenyuk
  'Ильяс Вахта': '/avatars/Gemini_Generated_Image_vmf1hgvmf1hgvmf1.jpg',    // player_smailgames
  'Макс Гребень': '/avatars/Gemini_Generated_Image_ffspc2ffspc2ffsp.jpg',   // player_malekith
  'Гоша Грибок': '/avatars/Gemini_Generated_Image_mwil02mwil02mwil.jpg',    // player_cenoval
  // Добавьте остальных персонажей здесь
  // 'ИмяПерсонажа': '/avatars/ИмяФайла.jpg'
};

// Путь к заглушке, если имя не найдено
const DEFAULT_AVATAR = '/avatars/Gemini_Generated_Image_mwil02mwil02mwil.jpg';

export default function CharacterTab({ stats, playerName, equipment }: CharacterTabProps) {
  // Расчёт эффективных статов с учётом экипировки
  const defaultEquipment: Equipment = {
    helmet: null, armor: null, clothes: null,
    pockets: [null, null, null, null],
    specials: [null, null, null],
    weapon: null, scope: null, tactical: null, suppressor: null,
    rig: null, bag: null, backpack: null
  };

  const { stats: effectiveStats, modifiers } = equipment
    ? calculateEffectiveStats(stats, equipment)
    : { stats, modifiers: {} as Partial<CharacterStats> };

  const hpPercent = (effectiveStats.hp / effectiveStats.maxHp) * 100;
  const staminaPercent = (effectiveStats.stamina / effectiveStats.maxStamina) * 100;

// Получаем путь к аватарке
  const avatarSrc = AVATAR_MAP[playerName] || DEFAULT_AVATAR;

  return (
    <div className="h-full flex p-2 gap-3">
      {/* ЛЕВАЯ ЧАСТЬ - Аватар (сузили с 55% до 45%) */}
      <div className="w-[45%] flex flex-col">
        {/* Аватар контейнер - заменили aspect-square на aspect-[2/3] */}
        <div className="relative w-full aspect-[2/3] bg-zinc-900 rounded-lg overflow-hidden border border-white/10 mb-4 group">
          
          {/* Изображение */}
          <Image 
            src={avatarSrc}
            alt={playerName}
            fill
            className="object-cover object-[50%_25%] transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
          
          {/* Затемнение снизу для читаемости текста */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          {/* Имя поверх картинки */}
          <div className="absolute bottom-3 left-3 right-3">
            <h2 className="text-xl font-bold text-white drop-shadow-md tracking-wider">
              {playerName}
            </h2>
          </div>

          {/* Статус индикатор */}
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
            <span className="text-green-400 font-mono text-[8px] drop-shadow-md bg-black/50 px-1 rounded">ONLINE</span>
          </div>
        </div>
      </div>

      {/* ПРАВАЯ ЧАСТЬ - Характеристики (одна колонка) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Заголовок */}
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10">
          <div className="w-1 h-4 bg-red-500" />
          <span className="text-white/60 text-[10px] font-mono tracking-[0.2em] uppercase">Характеристики</span>
        </div>

        {/* Статы в одной колонке */}
        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
          {(['attack', 'defense', 'speed', 'stealth', 'luck', 'capacity'] as const).map((statKey) => {
            const label = STAT_LABELS[statKey];
            const baseValue = stats[statKey];
            const effectiveValue = effectiveStats[statKey];
            const modifier = modifiers[statKey] || 0;

            return (
              <div
                key={statKey}
                className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-white/5 rounded hover:border-white/15 hover:bg-zinc-800/50 transition-all group"
              >
                <span className="text-lg group-hover:scale-110 transition-transform w-6 text-center">{label.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white/40 text-[9px] font-mono uppercase tracking-wider">
                    {label.ru}
                  </div>
                </div>
                {/* Визуальный индикатор */}
                <div className="flex gap-0.5">
                  {Array(10).fill(0).map((_, i) => {
                    const isBase = i < baseValue;
                    const isBonus = i >= baseValue && i < effectiveValue;
                    const isMalus = i < baseValue && i >= effectiveValue;

                    return (
                      <div
                        key={i}
                        className={`w-1.5 h-3 rounded-sm transition-all ${
                          isBonus
                            ? 'bg-gradient-to-t from-green-500/80 to-green-400/60'
                            : isMalus
                              ? 'bg-gradient-to-t from-red-600/50 to-red-500/30'
                              : isBase
                                ? 'bg-gradient-to-t from-white/60 to-white/30'
                                : 'bg-zinc-700/50'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`font-mono font-bold text-lg w-6 text-right ${getStatColor(effectiveValue)}`}>
                    {effectiveValue}
                  </span>
                  {modifier !== 0 && (
                    <span className={`font-mono text-xs ${modifier > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {modifier > 0 ? `+${modifier}` : modifier}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Футер */}
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-[9px] font-mono text-white/30">
            <span>▸ SCAV STATUS</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              ACTIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
