'use client'

import { CharacterStats } from '@/lib/types';

interface CharacterTabProps {
  stats: CharacterStats;
  playerName: string;
}

// Названия характеристик
const STAT_LABELS: Record<keyof Omit<CharacterStats, 'maxHp' | 'maxStamina'>, { ru: string; icon: string }> = {
  attack: { ru: 'АТАКА', icon: '⚔️' },
  defense: { ru: 'ЗАЩИТА', icon: '🛡️' },
  speed: { ru: 'СКОРОСТЬ', icon: '💨' },
  stealth: { ru: 'СКРЫТНОСТЬ', icon: '👁️' },
  luck: { ru: 'УДАЧА', icon: '🍀' },
  capacity: { ru: 'ВМЕСТИМОСТЬ', icon: '🎒' },
  hp: { ru: 'ХП', icon: '❤️' },
  stamina: { ru: 'ВЫНОСЛИВОСТЬ', icon: '⚡' }
};

export default function CharacterTab({ stats, playerName }: CharacterTabProps) {
  const statsToShow: (keyof CharacterStats)[] = [
    'attack', 'defense', 'speed', 'stealth', 'luck', 'capacity', 'hp', 'stamina'
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок */}
      <div className="border-b border-white/20 pb-2 mb-3">
        <h3 className="text-white font-mono text-sm tracking-wider">ПЕРСОНАЖ</h3>
      </div>

      {/* Аватар персонажа */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-20 border border-white/30 flex items-center justify-center bg-black/50">
          {/* Простая фигурка персонажа из SVG */}
          <svg viewBox="0 0 40 60" className="w-12 h-16">
            {/* Голова */}
            <circle cx="20" cy="10" r="8" fill="none" stroke="white" strokeWidth="1" />
            {/* Тело */}
            <line x1="20" y1="18" x2="20" y2="40" stroke="white" strokeWidth="1" />
            {/* Руки */}
            <line x1="20" y1="25" x2="8" y2="35" stroke="white" strokeWidth="1" />
            <line x1="20" y1="25" x2="32" y2="35" stroke="white" strokeWidth="1" />
            {/* Ноги */}
            <line x1="20" y1="40" x2="10" y2="55" stroke="white" strokeWidth="1" />
            <line x1="20" y1="40" x2="30" y2="55" stroke="white" strokeWidth="1" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-white/60 text-xs font-mono mb-1">ДИКИЙ</div>
          <div className="text-white font-mono text-sm truncate">{playerName || 'ИГРОК'}</div>
        </div>
      </div>

      {/* Характеристики */}
      <div className="border-l border-white/20 pl-3 flex-1">
        <div className="text-white/60 text-xs font-mono mb-2 tracking-wider">ХАРАКТЕРИСТИКИ</div>
        <div className="space-y-1.5">
          {statsToShow.map((statKey) => {
            const label = STAT_LABELS[statKey as keyof typeof STAT_LABELS];
            if (!label) return null;

            const value = stats[statKey];
            const maxValue = statKey === 'hp' ? stats.maxHp :
                           statKey === 'stamina' ? stats.maxStamina : 10;
            const isHpOrStamina = statKey === 'hp' || statKey === 'stamina';

            return (
              <div key={statKey} className="flex items-center gap-2">
                <span className="text-xs w-4">{label.icon}</span>
                <span className="text-white/80 text-xs font-mono w-28 uppercase">
                  {label.ru}
                </span>
                {isHpOrStamina ? (
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-black/50 border border-white/20 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          statKey === 'hp' ? 'bg-red-600' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${(value / maxValue) * 100}%` }}
                      />
                    </div>
                    <span className="text-white/60 text-xs font-mono w-12 text-right">
                      {value}/{maxValue}
                    </span>
                  </div>
                ) : (
                  <span className="text-white font-mono text-xs">
                    {value}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
