/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/InfoTab.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Вкладка информации - данные о выбранной ноде и игровой лог
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ DEFAULT EXPORT:                                                             │
 * │   InfoTab             - React компонент вкладки информации                 │
 * │                                                                             │
 * │ PROPS (InfoTabProps):                                                       │
 * │   selectedNode        - MapNodeData | null - выбранная нода                │
 * │   animatronics        - AnimatronicState[] - все аниматроники              │
 * │   players             - PlayerState[] - все игроки                         │
 * │   gameLog             - GameLogEntry[] - лог событий                       │
 * │   currentPlayerId     - string - ID текущего игрока (для подсветки)        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   @/lib/mapData  → MapNodeData, DANGER_COLORS, DANGER_NAMES, etc           │
 * │   @/lib/itemData → getItemById                                             │
 * │   @/lib/types    → GameLogEntry, AnimatronicState, PlayerState             │
 * │                                                                             │
 * │ IMPORTED BY:                                                                │
 * │   ./TabbedPanel.tsx → используется как содержимое вкладки "ИНФОРМАЦИЯ"     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ UI STRUCTURE                                                                │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │   ┌─────────────────────────────────────┐                                  │
 * │   │ ИНФОРМАЦИЯ                          │                                  │
 * │   ├─────────────────────────────────────┤                                  │
 * │   │ ▌Локация                            │                                  │
 * │   │   СТОЛОВАЯ (2)                      │ ← название + ID ноды             │
 * │   ├─────────────────────────────────────┤                                  │
 * │   │ АНИМАТРОНИКИ:                       │                                  │
 * │   │   ⚠ Freddy (100 HP)                 │ ← красная подсветка              │
 * │   │   ⚠ Bonnie (80 HP)                  │                                  │
 * │   ├─────────────────────────────────────┤                                  │
 * │   │ ИГРОКИ:                             │                                  │
 * │   │   ● Player1                         │ ← синий/фиолетовый               │
 * │   │   ● Player2 (вы)                    │                                  │
 * │   ├─────────────────────────────────────┤                                  │
 * │   │ ВОЗМОЖНЫЙ ЛУТ:                      │                                  │
 * │   │   🍕 Кусок пиццы 40%                │ ← цвет по lootType               │
 * │   │   🥤 Газировка 35%                  │                                  │
 * │   ├─────────────────────────────────────┤                                  │
 * │   │ УРОВЕНЬ ОПАСНОСТИ:                  │                                  │
 * │   │   [Высокий (55%)]                   │ ← цветной бейдж                  │
 * │   ├─────────────────────────────────────┤                                  │
 * │   │ ЛОГ ИГРЫ:                           │                                  │
 * │   │ ┌─────────────────────────────────┐ │                                  │
 * │   │ │[12:30] Игрок переместился в X   │ │ ← последние 10 записей          │
 * │   │ │[12:29] Найден предмет...        │ │                                  │
 * │   │ └─────────────────────────────────┘ │                                  │
 * │   └─────────────────────────────────────┘                                  │
 * │                                                                             │
 * │ LOG TYPES (цветовая схема):                                                │
 * │   combat (красный), loot (жёлтый), move (синий), event (фиолетовый)        │
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
    <div className="h-full flex flex-col">
      {/* Заголовок */}
      <div className="border-b border-white/20 pb-2 mb-3">
        <h3 className="text-white font-mono text-sm tracking-wider">ИНФОРМАЦИЯ</h3>
      </div>

      {selectedNode ? (
        <div className="flex-1 overflow-y-auto space-y-3">
          {/* Название локации */}
          <div className="border-l-2 border-red-500 pl-2">
            <div className="text-white/50 text-xs font-mono">Локация</div>
            <div className="text-white font-mono text-sm">{room?.label || selectedNode.nameRu}</div>
            <div className="text-white/40 text-xs font-mono">({selectedNode.id})</div>
          </div>

          {/* Аниматроники */}
          <div>
            <div className="text-white/70 text-xs font-mono mb-1">АНИМАТРОНИКИ:</div>
            {animatronicsHere.length > 0 ? (
              <div className="space-y-1 pl-2">
                {animatronicsHere.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <span className="text-red-400">⚠</span>
                    <span className="text-red-400 font-mono">{a.name}</span>
                    <span className="text-white/40">({a.hp} HP)</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/30 text-xs pl-2 italic">Нет</div>
            )}
          </div>

          {/* Игроки */}
          <div>
            <div className="text-white/70 text-xs font-mono mb-1">ИГРОКИ:</div>
            {playersHere.length > 0 ? (
              <div className="space-y-1 pl-2">
                {playersHere.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    <span className={p.id === currentPlayerId ? 'text-purple-400' : 'text-blue-400'}>●</span>
                    <span className={`font-mono ${p.id === currentPlayerId ? 'text-purple-400' : 'text-blue-400'}`}>
                      {p.name || 'Игрок'}
                    </span>
                    {p.id === currentPlayerId && <span className="text-white/30">(вы)</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/30 text-xs pl-2 italic">Нет</div>
            )}
          </div>

          {/* Возможный лут */}
          <div>
            <div className="text-white/70 text-xs font-mono mb-1">ВОЗМОЖНЫЙ ЛУТ:</div>
            {selectedNode.possibleLoot.length > 0 ? (
              <div className="space-y-0.5 pl-2">
                {selectedNode.possibleLoot.map((loot, idx) => {
                  const item = getItemById(loot.itemId);
                  return (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span>{item?.icon || '📦'}</span>
                      <span className={`font-mono ${lootTypeColor}`}>
                        {item?.nameRu || loot.itemId}
                      </span>
                      <span className="text-white/30">
                        {loot.chance}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-white/30 text-xs pl-2 italic">Нет лута</div>
            )}
          </div>

          {/* Уровень опасности */}
          <div>
            <div className="text-white/70 text-xs font-mono mb-1">УРОВЕНЬ ОПАСНОСТИ:</div>
            <div className={`inline-block px-2 py-1 ${dangerColor?.bg} border ${dangerColor?.border} ${dangerColor?.text} text-xs font-mono`}>
              {dangerName} ({selectedNode.dangerPercent}%)
            </div>
          </div>
        </div>
      ) : (
        <div className="text-white/30 text-xs italic mb-4">
          Выберите точку на карте для просмотра информации
        </div>
      )}

      {/* Лог игры */}
      <div className="mt-auto pt-3 border-t border-white/20">
        <div className="text-white/70 text-xs font-mono mb-2">ЛОГ ИГРЫ:</div>
        <div className="h-24 overflow-y-auto bg-black/30 border border-white/10 p-2 space-y-1">
          {gameLog.length > 0 ? (
            gameLog.slice(-10).reverse().map((entry, idx) => (
              <div key={idx} className="text-xs font-mono">
                <span className="text-white/30">
                  [{new Date(entry.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}]
                </span>
                <span className={`ml-1 ${
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
            <div className="text-white/30 text-xs italic">Начните игру...</div>
          )}
        </div>
      </div>
    </div>
  );
}
