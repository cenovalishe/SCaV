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

import { CharacterStats } from '@/lib/types';

interface CharacterTabProps {
  stats: CharacterStats;
  playerName: string;
}

// Названия характеристик с иконками
const STAT_LABELS: Record<keyof Omit<CharacterStats, 'maxHp' | 'maxStamina'>, { ru: string; icon: string; color: string }> = {
  attack: { ru: 'АТК', icon: '⚔️', color: 'text-red-400' },
  defense: { ru: 'ЗАЩ', icon: '🛡️', color: 'text-blue-400' },
  speed: { ru: 'СКР', icon: '💨', color: 'text-cyan-400' },
  stealth: { ru: 'СКР', icon: '👁️', color: 'text-purple-400' },
  luck: { ru: 'УДЧ', icon: '🍀', color: 'text-green-400' },
  capacity: { ru: 'ВМС', icon: '🎒', color: 'text-amber-400' },
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

export default function CharacterTab({ stats, playerName }: CharacterTabProps) {
  const hpPercent = (stats.hp / stats.maxHp) * 100;
  const staminaPercent = (stats.stamina / stats.maxStamina) * 100;

  return (
    <div className="h-full flex p-2 gap-3">
      {/* ЛЕВАЯ ЧАСТЬ - Аватар (увеличенный) */}
      <div className="w-[55%] flex flex-col">
        {/* Аватар контейнер (занимает всю высоту) */}
        <div className="flex-1 relative border-2 border-purple-500/30 rounded-xl overflow-hidden bg-gradient-to-b from-purple-900/20 to-black">
          {/* Декоративная рамка */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-purple-400/50" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-purple-400/50" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-purple-400/50" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-purple-400/50" />
          </div>

          {/* Фон градиент */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-transparent to-black/50" />

          {/* SVG Персонаж (увеличенный placeholder) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 80 150" className="w-full h-full max-w-[180px] max-h-[280px]">
              <defs>
                <filter id="glow-avatar">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.6" />
                </linearGradient>
              </defs>

              {/* Голова */}
              <ellipse cx="40" cy="25" rx="18" ry="20" fill="none" stroke="url(#bodyGrad)" strokeWidth="2" filter="url(#glow-avatar)" />

              {/* Глаза */}
              <circle cx="33" cy="22" r="3" fill="#a855f7" filter="url(#glow-avatar)">
                <animate attributeName="opacity" values="1;0.5;1" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="47" cy="22" r="3" fill="#a855f7" filter="url(#glow-avatar)">
                <animate attributeName="opacity" values="1;0.5;1" dur="3s" repeatCount="indefinite" />
              </circle>

              {/* Тело */}
              <line x1="40" y1="45" x2="40" y2="90" stroke="url(#bodyGrad)" strokeWidth="3" filter="url(#glow-avatar)" />

              {/* Руки */}
              <line x1="40" y1="55" x2="15" y2="80" stroke="url(#bodyGrad)" strokeWidth="2.5" />
              <line x1="40" y1="55" x2="65" y2="80" stroke="url(#bodyGrad)" strokeWidth="2.5" />

              {/* Ноги */}
              <line x1="40" y1="90" x2="20" y2="130" stroke="url(#bodyGrad)" strokeWidth="2.5" />
              <line x1="40" y1="90" x2="60" y2="130" stroke="url(#bodyGrad)" strokeWidth="2.5" />

              {/* Декоративные элементы */}
              <circle cx="40" cy="65" r="5" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.5">
                <animate attributeName="r" values="5;8;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* Имя и класс */}
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
            <div className="text-purple-400/70 text-[9px] font-mono tracking-[0.2em] uppercase">
              ▸ ДИКИЙ
            </div>
            <div className="text-white font-mono text-sm font-bold truncate">
              {playerName || 'ИГРОК'}
            </div>
          </div>

          {/* Статус индикатор */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
            <span className="text-green-400 font-mono text-[8px]">ONLINE</span>
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
            const value = stats[statKey];

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
                  {Array(10).fill(0).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-3 rounded-sm transition-all ${
                        i < value ? 'bg-gradient-to-t from-white/60 to-white/30' : 'bg-zinc-700/50'
                      }`}
                    />
                  ))}
                </div>
                <div className={`font-mono font-bold text-lg w-6 text-right ${getStatColor(value)}`}>
                  {value}
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
