/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/InfoTab.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Вкладка информации - данные о выбранной ноде и игровой лог (REDESIGNED v2.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES                                                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Стилизованные карточки секций                                            │
 * │ - Анимированные индикаторы угроз                                           │
 * │ - Цветовая кодировка по типам                                              │
 * │ - Улучшенный лог с иконками                                                │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { MapNodeData, DANGER_COLORS, DANGER_NAMES, LOOT_TYPE_COLORS, getRoomById } from '@/lib/mapData';
import { getItemById } from '@/lib/itemData';
import { GameLogEntry, AnimatronicState, PlayerState } from '@/lib/types';

interface InfoTabProps {
  selectedNode: MapNodeData | null;
  animatronics: AnimatronicState[];
  players: PlayerState[];
  gameLog: GameLogEntry[];
  currentPlayerId: string;
}

// Иконки для типов логов
const LOG_ICONS: Record<string, string> = {
  combat: '⚔️',
  loot: '💎',
  move: '🚶',
  event: '📢',
  system: '⚙️'
};

// Цвета аниматроников
const ANIMATRONIC_COLORS: Record<string, string> = {
  'foxy': 'text-red-400 bg-red-900/30 border-red-500/50',
  'bonnie': 'text-blue-400 bg-blue-900/30 border-blue-500/50',
  'chica': 'text-yellow-400 bg-yellow-900/30 border-yellow-500/50',
  'freddy': 'text-amber-600 bg-amber-900/30 border-amber-600/50',
  'default': 'text-red-400 bg-red-900/30 border-red-500/50'
};

export default function InfoTab({
  selectedNode,
  animatronics,
  players,
  gameLog,
  currentPlayerId
}: InfoTabProps) {
  const room = selectedNode ? getRoomById(selectedNode.roomId) : null;
  const dangerColor = selectedNode ? DANGER_COLORS[selectedNode.dangerLevel] : null;
  const dangerName = selectedNode ? DANGER_NAMES[selectedNode.dangerLevel] : '';
  const lootTypeColor = selectedNode ? LOOT_TYPE_COLORS[selectedNode.lootType] : '';

  // Фильтруем аниматроников и игроков по выбранной ноде
  const animatronicsHere = selectedNode
    ? animatronics.filter(a => a.currentNode === selectedNode.id)
    : [];
  const playersHere = selectedNode
    ? players.filter(p => p.currentNode === selectedNode.id)
    : [];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Заголовок */}
      <div className="relative border-b border-white/20 pb-3 mb-3 flex-shrink-0">
        <div className="absolute left-0 top-1/2 w-3 h-3 border border-cyan-500/50 rotate-45 -translate-y-1/2" />
        <h3 className="text-white font-mono text-sm tracking-[0.3em] pl-6 uppercase">
          Информация
        </h3>
        <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-cyan-900/20 to-transparent" />
      </div>

      {selectedNode ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
          {/* Название локации */}
          <div className="p-3 bg-gradient-to-r from-zinc-900/80 to-transparent border-l-3 border-l-red-500 rounded-r-lg">
            <div className="text-red-400/70 text-[10px] font-mono tracking-widest mb-1">
              ▸ ЛОКАЦИЯ
            </div>
            <div className="text-white font-mono text-lg font-bold">
              {room?.label || selectedNode.nameRu}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-white/30 font-mono text-xs bg-white/5 px-2 py-0.5 rounded">
                ID: {selectedNode.id}
              </span>
              {/* Бейдж опасности */}
              <span className={`text-xs font-mono px-2 py-0.5 rounded border ${dangerColor?.bg} ${dangerColor?.border} ${dangerColor?.text}`}>
                {dangerName} {selectedNode.dangerPercent}%
              </span>
            </div>
          </div>

          {/* Аниматроники */}
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-500 animate-pulse">⚠</span>
              <span className="text-white/70 text-xs font-mono uppercase tracking-wider">
                Аниматроники
              </span>
              {animatronicsHere.length > 0 && (
                <span className="ml-auto text-red-400 text-xs font-mono bg-red-900/30 px-2 rounded animate-pulse">
                  {animatronicsHere.length} УГРОЗ
                </span>
              )}
            </div>
            {animatronicsHere.length > 0 ? (
              <div className="space-y-1.5">
                {animatronicsHere.map(a => {
                  const colorClass = ANIMATRONIC_COLORS[a.type?.toLowerCase()] || ANIMATRONIC_COLORS.default;
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 p-2 rounded border ${colorClass}`}
                    >
                      <span className="text-xl animate-pulse">👾</span>
                      <div className="flex-1">
                        <div className="font-mono text-sm font-bold">{a.name}</div>
                        <div className="text-[10px] opacity-60">{a.type}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs text-red-400/70">
                          ♾️ БЕССМЕРТЕН
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-green-400/50 text-xs font-mono pl-2 flex items-center gap-2">
                <span>✓</span>
                <span>Чисто</span>
              </div>
            )}
          </div>

          {/* Игроки */}
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-400">👥</span>
              <span className="text-white/70 text-xs font-mono uppercase tracking-wider">
                Игроки
              </span>
              <span className="ml-auto text-white/30 text-xs font-mono">
                {playersHere.length}
              </span>
            </div>
            {playersHere.length > 0 ? (
              <div className="space-y-1">
                {playersHere.map(p => {
                  const isYou = p.id === currentPlayerId;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        isYou
                          ? 'bg-purple-900/30 border border-purple-500/30'
                          : 'bg-zinc-800/50'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isYou ? 'bg-purple-500' : 'bg-blue-500'}`} />
                      <span className={`font-mono ${isYou ? 'text-purple-300' : 'text-blue-300'}`}>
                        {p.name || 'Игрок'}
                      </span>
                      {isYou && (
                        <span className="ml-auto text-[10px] text-purple-400/60 font-mono">(ВЫ)</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-white/30 text-xs font-mono pl-2 italic">
                Пусто
              </div>
            )}
          </div>

          {/* Возможный лут */}
          <div className="p-3 bg-zinc-900/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400">💎</span>
              <span className="text-white/70 text-xs font-mono uppercase tracking-wider">
                Возможный лут
              </span>
              <span className="ml-auto text-white/30 text-xs font-mono">
                {selectedNode.possibleLoot.length} предметов
              </span>
            </div>
            {selectedNode.possibleLoot.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {selectedNode.possibleLoot.map((loot, idx) => {
                  const item = getItemById(loot.itemId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-1.5 bg-zinc-800/50 rounded text-xs"
                    >
                      <span className="text-base">{item?.icon || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-mono truncate ${lootTypeColor}`}>
                          {item?.nameRu || loot.itemId}
                        </div>
                      </div>
                      <span className="text-white/40 font-mono text-[10px]">
                        {loot.chance}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-white/30 text-xs font-mono pl-2 italic">
                Нет лута
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-white/30 font-mono text-xs p-6">
            <div className="text-4xl mb-3 opacity-30">🗺️</div>
            <div className="text-white/40">Выберите точку на карте</div>
            <div className="text-[10px] mt-1 text-white/20">
              для просмотра информации
            </div>
          </div>
        </div>
      )}

      {/* Лог игры */}
      <div className="mt-auto pt-3 border-t border-white/20 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-400">📜</span>
          <span className="text-white/70 text-xs font-mono uppercase tracking-wider">
            Лог игры
          </span>
        </div>
        <div className="max-h-40 overflow-y-auto bg-black/50 border border-white/10 rounded-lg p-2 space-y-1 custom-scrollbar">
          {gameLog.length > 0 ? (
            [...gameLog].reverse().map((entry, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 text-xs font-mono p-1.5 rounded ${
                  entry.type === 'combat' ? 'bg-red-900/20' :
                  entry.type === 'loot' ? 'bg-yellow-900/20' :
                  ''
                }`}
              >
                <span className="flex-shrink-0">{LOG_ICONS[entry.type] || '📌'}</span>
                <span className="text-white/30 flex-shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={`flex-1 ${
                  entry.type === 'combat' ? 'text-red-400' :
                  entry.type === 'loot' ? 'text-yellow-400' :
                  entry.type === 'move' ? 'text-blue-400' :
                  entry.type === 'event' ? 'text-purple-400' :
                  'text-white/60'
                }`}>
                  {entry.message}
                </span>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-white/20 text-xs font-mono">
              Ожидание событий...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
