/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/PlayerIndicators.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Кликабельные указатели игроков в той же маршрутной точке
 *
 * FEATURES:
 * - Список игроков на текущей/просматриваемой ноде
 * - Выпадающее меню с действиями: Атаковать / Осмотреть
 * - Интеграция с PvP системой
 * - Открытие модалки осмотра игрока
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PlayerState } from '@/lib/types';
import { isPvpZone } from '@/lib/pvpConfig';

interface PlayerIndicatorsProps {
  players: {
    id: string;
    name: string;
    isCurrentPlayer: boolean;
    playerData?: PlayerState;
  }[];
  currentNodeId: string;
  isViewingCurrentLocation: boolean; // true если смотрим на ту же ноду, где стоим
  onAttack: (targetPlayer: PlayerState) => void;
  onInspect: (targetPlayer: PlayerState) => void;
}

interface PlayerMenuState {
  playerId: string;
  x: number;
  y: number;
}

export default function PlayerIndicators({
  players,
  currentNodeId,
  isViewingCurrentLocation,
  onAttack,
  onInspect
}: PlayerIndicatorsProps) {
  const [openMenu, setOpenMenu] = useState<PlayerMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };

    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  // Обработчик клика на игрока
  const handlePlayerClick = useCallback((e: React.MouseEvent, player: typeof players[0]) => {
    if (player.isCurrentPlayer) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setOpenMenu({
      playerId: player.id,
      x: rect.right + 8,
      y: rect.top
    });
  }, []);

  // Обработчик атаки
  const handleAttack = useCallback((player: typeof players[0]) => {
    if (player.playerData) {
      onAttack(player.playerData);
    }
    setOpenMenu(null);
  }, [onAttack]);

  // Обработчик осмотра
  const handleInspect = useCallback((player: typeof players[0]) => {
    if (player.playerData) {
      onInspect(player.playerData);
    }
    setOpenMenu(null);
  }, [onInspect]);

  // Проверка PvP зоны
  const canPvP = isPvpZone(currentNodeId) && isViewingCurrentLocation;

  // Фильтруем только других игроков (не себя)
  const otherPlayers = players.filter(p => !p.isCurrentPlayer);

  if (players.length === 0) return null;

  return (
    // [FIX] Переместили позицию с bottom-20 на top-28, чтобы не перекрываться ActionPanel
    <div className="absolute top-56 left-4 z-30">
      <div className="bg-black/80 border border-green-500/40 rounded-xl overflow-hidden min-w-[180px] backdrop-blur-sm">
        {/* Заголовок */}
        <div className="bg-green-900/60 px-4 py-2 border-b border-green-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
            <span className="text-green-400 font-mono text-xs uppercase tracking-widest">
              В локации
            </span>
            <span className="ml-auto text-green-400/60 font-mono text-xs">{players.length}</span>
          </div>
        </div>

        {/* Список игроков */}
        <div className="p-2 space-y-1">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={(e) => handlePlayerClick(e, p)}
              disabled={p.isCurrentPlayer}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-left
                ${p.isCurrentPlayer
                  ? 'bg-purple-900/50 border border-purple-500/40 cursor-default'
                  : 'bg-zinc-800/50 hover:bg-zinc-700/50 hover:border-green-500/30 border border-transparent cursor-pointer active:scale-95'
                }
              `}
            >
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                p.isCurrentPlayer ? 'bg-purple-500 shadow-lg shadow-purple-500/50' : 'bg-green-500'
              }`} />
              <span className={`font-mono text-sm truncate ${
                p.isCurrentPlayer ? 'text-purple-300 font-bold' : 'text-white/70'
              }`}>
                {p.name}
              </span>
              {p.isCurrentPlayer ? (
                <span className="ml-auto text-[10px] text-purple-400/60 font-mono flex-shrink-0">(ВЫ)</span>
              ) : (
                <span className="ml-auto text-green-400/60 text-xs">▸</span>
              )}
            </button>
          ))}
        </div>

        {/* Подсказка */}
        {otherPlayers.length > 0 && isViewingCurrentLocation && (
          <div className="px-3 py-2 border-t border-white/5">
            <span className="text-white/30 font-mono text-[9px]">
              Нажмите на игрока для действий
            </span>
          </div>
        )}
      </div>

      {/* Выпадающее меню действий */}
      {openMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 animate-in fade-in slide-in-from-left-2 duration-150"
          style={{ left: openMenu.x, top: openMenu.y }}
        >
          <div className="bg-zinc-900 border border-white/20 rounded-lg shadow-2xl overflow-hidden min-w-[140px]">
            {/* Кнопка Атаковать */}
            {canPvP && (
              <button
                onClick={() => {
                  const player = players.find(p => p.id === openMenu.playerId);
                  if (player) handleAttack(player);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-900/50 transition-colors text-left group"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">⚔️</span>
                <div>
                  <div className="text-red-400 font-mono text-sm font-bold">Атаковать</div>
                  <div className="text-red-400/50 text-[10px] font-mono">Начать PvP бой</div>
                </div>
              </button>
            )}

            {/* Разделитель */}
            {canPvP && <div className="border-t border-white/10" />}

            {/* Кнопка Осмотреть */}
            <button
              onClick={() => {
                const player = players.find(p => p.id === openMenu.playerId);
                if (player) handleInspect(player);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-900/50 transition-colors text-left group"
            >
              <span className="text-lg group-hover:scale-110 transition-transform">👁️</span>
              <div>
                <div className="text-blue-400 font-mono text-sm font-bold">Осмотреть</div>
                <div className="text-blue-400/50 text-[10px] font-mono">Просмотр персонажа</div>
              </div>
            </button>

            {/* Предупреждение о не-PvP зоне */}
            {!canPvP && isViewingCurrentLocation && (
              <>
                <div className="border-t border-white/10" />
                <div className="px-4 py-2 bg-yellow-900/20">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400/60 text-xs">🛡️</span>
                    <span className="text-yellow-400/60 font-mono text-[10px]">
                      Безопасная зона
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Предупреждение о удалённом просмотре */}
            {!isViewingCurrentLocation && (
              <>
                <div className="border-t border-white/10" />
                <div className="px-4 py-2 bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">📹</span>
                    <span className="text-white/40 font-mono text-[10px]">
                      Удалённый просмотр
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
