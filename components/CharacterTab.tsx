/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/CharacterTab.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Вкладка персонажа - отображение статов и аватара (REDESIGNED)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { CharacterStats } from '@/lib/types';

interface CharacterTabProps {
  stats: CharacterStats;
  playerName: string;
}

// Названия характеристик с иконками
const STAT_LABELS: Record<keyof Omit<CharacterStats, 'maxHp' | 'maxStamina'>, { ru: string; icon: string; color: string }> = {
  attack: { ru: 'АТАКА', icon: '⚔️', color: 'text-red-400' },
  defense: { ru: 'ЗАЩИТА', icon: '🛡️', color: 'text-blue-400' },
  speed: { ru: 'СКОРОСТЬ', icon: '💨', color: 'text-cyan-400' },
  stealth: { ru: 'СКРЫТНОСТЬ', icon: '👁️', color: 'text-purple-400' },
  luck: { ru: 'УДАЧА', icon: '🍀', color: 'text-green-400' },
  capacity: { ru: 'ВМЕСТИМОСТЬ', icon: '🎒', color: 'text-amber-400' },
  hp: { ru: 'ЗДОРОВЬЕ', icon: '❤️', color: 'text-red-500' },
  stamina: { ru: 'ВЫНОСЛИВОСТЬ', icon: '⚡', color: 'text-yellow-400' }
};

// Получить цвет для HP бара
function getHpBarColor(percent: number): string {
  if (percent > 70) return 'bg-green-500';
  if (percent > 40) return 'bg-yellow-500';
  if (percent > 20) return 'bg-orange-500';
  return 'bg-red-600';
}

// Получить цвет для статов
function getStatColor(value: number): string {
  if (value >= 8) return 'text-green-400';
  if (value >= 5) return 'text-yellow-400';
  if (value >= 3) return 'text-orange-400';
  return 'text-red-400';
}

export default function CharacterTab({ stats, playerName }: CharacterTabProps) {
  const hpPercent = (stats.hp / stats.maxHp) * 100;
  const staminaPercent = (stats.stamina / stats.maxStamina) * 100;

  return (
    <div className="h-full flex flex-col overflow-y-auto custom-scrollbar">
      {/* Заголовок с декоративными элементами */}
      <div className="relative border-b border-white/20 pb-3 mb-4">
        <div className="absolute left-0 top-1/2 w-3 h-3 border border-red-500/50 rotate-45 -translate-y-1/2" />
        <h3 className="text-white font-mono text-sm tracking-[0.3em] pl-6 uppercase">
          Персонаж
        </h3>
        <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-red-900/20 to-transparent" />
      </div>

      {/* Профиль персонажа */}
      <div className="flex items-start gap-4 mb-5 p-3 bg-gradient-to-r from-zinc-900/80 to-transparent border-l-2 border-red-500/70 rounded-r-lg">
        {/* Аватар */}
        <div className="relative">
          <div className="w-20 h-24 border-2 border-white/20 bg-black/70 flex items-center justify-center rounded overflow-hidden group">
            {/* Фон с градиентом */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 to-transparent" />
            {/* SVG персонаж */}
            <svg viewBox="0 0 40 60" className="w-14 h-18 relative z-10">
              {/* Свечение */}
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* Голова */}
              <circle cx="20" cy="10" r="8" fill="none" stroke="#a855f7" strokeWidth="1.5" filter="url(#glow)" />
              {/* Глаза */}
              <circle cx="17" cy="9" r="1.5" fill="#a855f7" />
              <circle cx="23" cy="9" r="1.5" fill="#a855f7" />
              {/* Тело */}
              <line x1="20" y1="18" x2="20" y2="40" stroke="#a855f7" strokeWidth="1.5" filter="url(#glow)" />
              {/* Руки */}
              <line x1="20" y1="25" x2="8" y2="35" stroke="#a855f7" strokeWidth="1.5" />
              <line x1="20" y1="25" x2="32" y2="35" stroke="#a855f7" strokeWidth="1.5" />
              {/* Ноги */}
              <line x1="20" y1="40" x2="10" y2="55" stroke="#a855f7" strokeWidth="1.5" />
              <line x1="20" y1="40" x2="30" y2="55" stroke="#a855f7" strokeWidth="1.5" />
            </svg>
          </div>
          {/* Статус индикатор */}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black animate-pulse"
               title="Активен" />
        </div>

        {/* Имя и класс */}
        <div className="flex-1 min-w-0">
          <div className="text-purple-400/70 text-[10px] font-mono tracking-widest mb-1">
            ▸ ДИКИЙ
          </div>
          <div className="text-white font-mono text-lg font-bold truncate mb-2 tracking-wide">
            {playerName || 'ИГРОК'}
          </div>
          {/* HP индикатор */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-red-400">❤️ HP</span>
              <span className={`${getHpBarColor(hpPercent).replace('bg-', 'text-')}`}>
                {stats.hp}/{stats.maxHp}
              </span>
            </div>
            <div className="h-2 bg-black/70 border border-white/10 rounded-sm overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getHpBarColor(hpPercent)}`}
                style={{ width: `${hpPercent}%` }}
              >
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
              </div>
            </div>
          </div>
          {/* Stamina индикатор */}
          <div className="space-y-1 mt-2">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-yellow-400">⚡ ВЫНОСЛИВОСТЬ</span>
              <span className="text-yellow-400">{stats.stamina}/{stats.maxStamina}</span>
            </div>
            <div className="h-2 bg-black/70 border border-white/10 rounded-sm overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-500"
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Характеристики */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 bg-red-500" />
          <span className="text-white/60 text-[10px] font-mono tracking-[0.2em]">ХАРАКТЕРИСТИКИ</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['attack', 'defense', 'speed', 'stealth', 'luck', 'capacity'] as const).map((statKey) => {
            const label = STAT_LABELS[statKey];
            const value = stats[statKey];

            return (
              <div
                key={statKey}
                className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-white/5 rounded hover:border-white/20 hover:bg-zinc-800/50 transition-all group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">{label.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white/50 text-[9px] font-mono uppercase tracking-wider truncate">
                    {label.ru}
                  </div>
                </div>
                <div className={`font-mono font-bold text-lg ${getStatColor(value)}`}>
                  {value}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Декоративный футер */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between text-[9px] font-mono text-white/30">
          <span>▸ SCAV STATUS: ACTIVE</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            ONLINE
          </span>
        </div>
      </div>
    </div>
  );
}
