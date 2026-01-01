/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/PlayerInspectModal.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Модальное окно для осмотра другого игрока
 *
 * FEATURES:
 *   - Две вкладки: Персонаж и Инвентарь
 *   - Только просмотр (без возможности взаимодействия)
 *   - Просмотр характеристик предметов
 *   - Копирует UI вкладок текущего игрока
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState } from 'react';
import { PlayerState, CharacterStats, Equipment } from '@/lib/types';
import { getItemById, calculateEffectiveStats } from '@/lib/itemData';
import Image from 'next/image';

interface PlayerInspectModalProps {
  player: PlayerState;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// КАРТА АВАТАРОВ (копия из CharacterTab)
// ═══════════════════════════════════════════════════════════════════════════════

const AVATAR_MAP: Record<string, string> = {
  'Егор Шокеридзе': '/avatars/Gemini_Generated_Image_kd8ffmkd8ffmkd8f.jpg',
  'Сева Пармезан': '/avatars/Gemini_Generated_Image_bnrjhkbnrjhkbnrj.jpg',
  'Толя Самара': '/avatars/Gemini_Generated_Image_r4h8kdr4h8kdr4h8.jpg',
  'Иван Кимпентяо': '/avatars/Gemini_Generated_Image_ncif9qncif9qncif.jpg',
  'Ильяс Вахта': '/avatars/Gemini_Generated_Image_vmf1hgvmf1hgvmf1.jpg',
  'Макс Гребень': '/avatars/Gemini_Generated_Image_ffspc2ffspc2ffsp.jpg',
  'Гоша Грибок': '/avatars/Gemini_Generated_Image_mwil02mwil02mwil.jpg',
};

const DEFAULT_AVATAR = '/avatars/Gemini_Generated_Image_mwil02mwil02mwil.jpg';

// ═══════════════════════════════════════════════════════════════════════════════
// НАЗВАНИЯ СТАТОВ
// ═══════════════════════════════════════════════════════════════════════════════

const STAT_LABELS: Record<string, { ru: string; icon: string; color: string }> = {
  attack: { ru: 'АТК', icon: '⚔️', color: 'text-red-400' },
  defense: { ru: 'ЗАЩ', icon: '🛡️', color: 'text-blue-400' },
  speed: { ru: 'СКР', icon: '💨', color: 'text-cyan-400' },
  stealth: { ru: 'СКРТ', icon: '👁️', color: 'text-purple-400' },
  luck: { ru: 'УДЧ', icon: '🍀', color: 'text-green-400' },
  capacity: { ru: 'ВМС', icon: '🎒', color: 'text-amber-400' },
};

function getStatColor(value: number): string {
  if (value >= 8) return 'text-green-400';
  if (value >= 5) return 'text-yellow-400';
  if (value >= 3) return 'text-orange-400';
  return 'text-red-400';
}

function getHpBarColor(percent: number): string {
  if (percent > 70) return 'bg-green-500';
  if (percent > 40) return 'bg-yellow-500';
  if (percent > 20) return 'bg-orange-500';
  return 'bg-red-600';
}

// ═══════════════════════════════════════════════════════════════════════════════
// ВКЛАДКА ПЕРСОНАЖА (READ-ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

function CharacterTabReadOnly({ stats, playerName, equipment }: {
  stats: CharacterStats;
  playerName: string;
  equipment: Equipment;
}) {
  const { stats: effectiveStats, modifiers } = calculateEffectiveStats(stats, equipment);
  const hpPercent = (effectiveStats.hp / effectiveStats.maxHp) * 100;
  const staminaPercent = (effectiveStats.stamina / effectiveStats.maxStamina) * 100;
  const avatarSrc = AVATAR_MAP[playerName] || DEFAULT_AVATAR;

  return (
    <div className="h-full flex p-3 gap-4">
      {/* Аватар */}
      <div className="w-[40%] flex flex-col">
        <div className="relative w-full aspect-[2/3] bg-zinc-900 rounded-lg overflow-hidden border border-white/10 group">
          <Image
            src={avatarSrc}
            alt={playerName}
            fill
            className="object-cover object-[50%_25%] transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-3 right-3">
            <h2 className="text-lg font-bold text-white drop-shadow-md tracking-wider">
              {playerName}
            </h2>
          </div>
        </div>

        {/* HP & Stamina bars */}
        <div className="mt-3 space-y-2">
          {/* HP */}
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-sm">❤️</span>
            <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getHpBarColor(hpPercent)} transition-all`}
                style={{ width: `${hpPercent}%` }}
              />
            </div>
            <span className="text-white/60 font-mono text-xs w-10 text-right">{effectiveStats.hp}</span>
          </div>
          {/* Stamina */}
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm">⚡</span>
            <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all"
                style={{ width: `${staminaPercent}%` }}
              />
            </div>
            <span className="text-white/60 font-mono text-xs w-10 text-right">
              {effectiveStats.stamina}/{effectiveStats.maxStamina}
            </span>
          </div>
        </div>
      </div>

      {/* Статы */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/10">
          <div className="w-1 h-4 bg-blue-500" />
          <span className="text-white/60 text-[10px] font-mono tracking-[0.2em] uppercase">
            Характеристики
          </span>
        </div>

        <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
          {(['attack', 'defense', 'speed', 'stealth', 'luck', 'capacity'] as const).map((statKey) => {
            const label = STAT_LABELS[statKey];
            const baseValue = stats[statKey];
            const effectiveValue = effectiveStats[statKey];
            const modifier = modifiers[statKey] || 0;

            return (
              <div
                key={statKey}
                className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-white/5 rounded"
              >
                <span className="text-lg w-6 text-center">{label.icon}</span>
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
                    return (
                      <div
                        key={i}
                        className={`w-1.5 h-3 rounded-sm ${
                          isBonus
                            ? 'bg-gradient-to-t from-green-500/80 to-green-400/60'
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
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ВКЛАДКА ИНВЕНТАРЯ (READ-ONLY)
// ═══════════════════════════════════════════════════════════════════════════════

const SLOT_SIZE = 40;

function ItemSlotReadOnly({ itemId }: { itemId: string | null }) {
  const item = itemId ? getItemById(itemId) : null;

  return (
    <div
      className={`
        w-10 h-10 border border-white/10 bg-zinc-900/50 rounded
        flex items-center justify-center
        ${item ? 'hover:border-white/20' : ''}
      `}
      title={item ? `${item.nameRu}` : undefined}
    >
      {item ? (
        <span className="text-lg">{item.icon}</span>
      ) : (
        <div className="text-white/10 text-[8px] font-mono">-</div>
      )}
    </div>
  );
}

function InventoryTabReadOnly({ equipment }: { equipment: Equipment }) {
  return (
    <div className="h-full flex flex-col p-3">
      <div className="flex items-center gap-2 pb-2 mb-3 border-b border-white/10">
        <div className="w-1 h-4 bg-amber-500 rounded-full" />
        <span className="text-white/80 font-mono text-xs uppercase tracking-[0.2em]">Инвентарь</span>
      </div>

      <div className="flex gap-4 flex-1 min-h-0 overflow-y-auto">
        {/* Экипировка */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {/* Спец слоты */}
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="relative">
                <ItemSlotReadOnly itemId={equipment.specials?.[i] || null} />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-white/30 font-mono">
                  С{i + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Шлем, Броня, Одежда */}
          <div className="space-y-1">
            <div className="relative">
              <ItemSlotReadOnly itemId={equipment.helmet} />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-white/30 font-mono">
                ШЛМ
              </span>
            </div>
            <div className="relative">
              <ItemSlotReadOnly itemId={equipment.armor} />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-white/30 font-mono">
                БРН
              </span>
            </div>
            <div className="relative">
              <ItemSlotReadOnly itemId={equipment.clothes} />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-white/30 font-mono">
                ОДЖ
              </span>
            </div>
          </div>

          {/* Карманы */}
          <div className="flex gap-1 flex-wrap w-[88px]">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="relative">
                <ItemSlotReadOnly itemId={equipment.pockets?.[i] || null} />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-white/30 font-mono">
                  К{i + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Оружие и обвесы */}
          <div className="mt-1 space-y-1">
            <div className="relative">
              <ItemSlotReadOnly itemId={equipment.weapon} />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-white/30 font-mono">
                ОРЖ
              </span>
            </div>
            <div className="flex gap-1">
              {['scope', 'tactical', 'suppressor'].map((slot, i) => (
                <div key={slot} className="relative">
                  <ItemSlotReadOnly itemId={(equipment as any)[slot]} />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-white/30 font-mono">
                    {['ПРЦ', 'ЛЦУ', 'ГЛШ'][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Контейнеры */}
        <div className="flex-1 flex flex-col gap-3">
          {/* Разгрузка */}
          {equipment.rig && (
            <div className="p-2 bg-gradient-to-r from-red-950/50 to-red-900/30 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🎽</span>
                <span className="text-red-400 font-mono text-[10px] uppercase tracking-wider">Разгрузка</span>
                <span className="text-red-400/50 font-mono text-[10px] ml-auto">
                  {equipment.rig.items.filter(i => i !== null).length}/{equipment.rig.items.length}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {equipment.rig.items.slice(0, 4).map((itemId, i) => (
                  <ItemSlotReadOnly key={i} itemId={itemId} />
                ))}
              </div>
            </div>
          )}

          {/* Сумка */}
          {equipment.bag && (
            <div className="p-2 bg-gradient-to-r from-blue-950/50 to-blue-900/30 border border-blue-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">👜</span>
                <span className="text-blue-400 font-mono text-[10px] uppercase tracking-wider">Сумка</span>
                <span className="text-blue-400/50 font-mono text-[10px] ml-auto">
                  {equipment.bag.items.filter(i => i !== null).length}/{equipment.bag.items.length}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {equipment.bag.items.slice(0, 4).map((itemId, i) => (
                  <ItemSlotReadOnly key={i} itemId={itemId} />
                ))}
              </div>
            </div>
          )}

          {/* Рюкзак */}
          {equipment.backpack && (
            <div className="p-2 bg-gradient-to-r from-orange-950/50 to-orange-900/30 border border-orange-500/30 rounded-lg flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm">🎒</span>
                <span className="text-orange-400 font-mono text-[10px] uppercase tracking-wider">Рюкзак</span>
                <span className="text-orange-400/50 font-mono text-[10px] ml-auto">
                  {equipment.backpack.items.filter(i => i !== null).length}/{equipment.backpack.items.length}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {equipment.backpack.items.map((itemId, i) => (
                  <ItemSlotReadOnly key={i} itemId={itemId} />
                ))}
              </div>
            </div>
          )}

          {/* Нет контейнеров */}
          {!equipment.rig && !equipment.bag && !equipment.backpack && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white/30 font-mono text-xs p-4 border border-dashed border-white/10 rounded-lg">
                <div className="text-2xl mb-2 opacity-50">📦</div>
                <div>Нет контейнеров</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ОСНОВНОЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════════════════════════

export default function PlayerInspectModal({ player, onClose }: PlayerInspectModalProps) {
  const [activeTab, setActiveTab] = useState<'character' | 'inventory'>('character');

  // Дефолтная экипировка если не передана
  const equipment: Equipment = player.equipment || {
    helmet: null,
    armor: null,
    clothes: null,
    pockets: [null, null, null, null],
    specials: [null, null, null],
    weapon: null,
    scope: null,
    tactical: null,
    suppressor: null,
    rig: null,
    bag: null,
    backpack: null
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/20 rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <h2 className="text-white font-bold text-lg">Осмотр игрока</h2>
              <p className="text-white/50 text-xs font-mono">{player.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Табы */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('character')}
            className={`flex-1 py-3 px-4 font-mono text-sm transition-all ${
              activeTab === 'character'
                ? 'bg-blue-900/30 text-blue-400 border-b-2 border-blue-500'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-2">👤</span>
            Персонаж
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-3 px-4 font-mono text-sm transition-all ${
              activeTab === 'inventory'
                ? 'bg-amber-900/30 text-amber-400 border-b-2 border-amber-500'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="mr-2">🎒</span>
            Инвентарь
          </button>
        </div>

        {/* Контент */}
        <div className="h-[400px] overflow-hidden">
          {activeTab === 'character' ? (
            <CharacterTabReadOnly
              stats={player.stats}
              playerName={player.name}
              equipment={equipment}
            />
          ) : (
            <InventoryTabReadOnly equipment={equipment} />
          )}
        </div>

        {/* Футер */}
        <div className="px-4 py-3 border-t border-white/10 bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/40 font-mono text-xs">
              <span className="text-green-400">●</span>
              <span>Режим просмотра</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-sm rounded-lg transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
