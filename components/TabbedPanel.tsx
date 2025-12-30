/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/TabbedPanel.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Контейнер с вкладками для правой панели UI
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ DEFAULT EXPORT:                                                             │
 * │   TabbedPanel         - React компонент контейнера вкладок                 │
 * │                                                                             │
 * │ PROPS (TabbedPanelProps):                                                   │
 * │   stats               - CharacterStats - статы персонажа                   │
 * │   playerName          - string - имя игрока                                │
 * │   equipment           - Equipment - экипировка и инвентарь                 │
 * │   selectedNode        - MapNodeData | null - выбранная нода на карте       │
 * │   animatronics        - AnimatronicState[] - состояние аниматроников       │
 * │   players             - PlayerState[] - все игроки в игре                  │
 * │   gameLog             - GameLogEntry[] - лог игровых событий               │
 * │   currentPlayerId     - string - ID текущего игрока                        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   react           → useState                                               │
 * │   ./CharacterTab  → default (CharacterTab)                                 │
 * │   ./InventoryTab  → default (InventoryTab)                                 │
 * │   ./InfoTab       → default (InfoTab)                                      │
 * │   @/lib/types     → CharacterStats, Equipment, GameLogEntry, etc           │
 * │   @/lib/mapData   → MapNodeData                                            │
 * │                                                                             │
 * │ IMPORTED BY:                                                                │
 * │   app/page.tsx    → используется в главной странице игры                   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ UI STRUCTURE                                                                │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │   ┌───────────────────────────────────────┐                                │
 * │   │ ═══════════════════════════════════ │  ← декоративный заголовок       │
 * │   ├───────────┬───────────┬─────────────┤                                  │
 * │   │ ПЕРСОНАЖ  │ ИНВЕНТАРЬ │ ИНФОРМАЦИЯ  │  ← вкладки (TabType)            │
 * │   ├───────────┴───────────┴─────────────┤                                  │
 * │   │                                     │                                  │
 * │   │    [Контент активной вкладки]       │  ← CharacterTab/Inventory/Info  │
 * │   │                                     │                                  │
 * │   └─────────────────────────────────────┘                                  │
 * │                                                                             │
 * │ TABS: character (ПЕРСОНАЖ), inventory (ИНВЕНТАРЬ), info (ИНФОРМАЦИЯ)       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import { useState } from 'react';
import CharacterTab from './CharacterTab';
import InventoryTab from './InventoryTab';
import InfoTab from './InfoTab';
import { CharacterStats, Equipment, GameLogEntry, AnimatronicState, PlayerState } from '@/lib/types';
import { MapNodeData } from '@/lib/mapData';

type TabType = 'character' | 'inventory' | 'info';

interface TabbedPanelProps {
  stats: CharacterStats;
  playerName: string;
  equipment: Equipment;
  selectedNode: MapNodeData | null;
  animatronics: AnimatronicState[];
  players: PlayerState[];
  gameLog: GameLogEntry[];
  currentPlayerId: string;
}

const TABS: { id: TabType; label: string }[] = [
  { id: 'character', label: 'ПЕРСОНАЖ' },
  { id: 'inventory', label: 'ИНВЕНТАРЬ' },
  { id: 'info', label: 'ИНФОРМАЦИЯ' }
];

export default function TabbedPanel({
  stats,
  playerName,
  equipment,
  selectedNode,
  animatronics,
  players,
  gameLog,
  currentPlayerId
}: TabbedPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('character');

  return (
    <div className="bg-black border border-white/20 flex flex-col h-full">
      {/* Заголовок панели с декоративными линиями */}
      <div className="flex items-center border-b border-white/20">
        <div className="flex-1 h-px bg-white/20" />
        <div className="px-2 h-8 border-x border-white/20" />
        <div className="flex-1 h-px bg-white/20" />
      </div>

      {/* Вкладки */}
      <div className="flex border-b border-white/20">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-2 px-2 font-mono text-xs tracking-wider
              transition-all border-r border-white/10 last:border-r-0
              ${activeTab === tab.id
                ? 'bg-white/10 text-white border-b-2 border-b-red-500'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      <div className="flex-1 p-3 overflow-hidden">
        {activeTab === 'character' && (
          <CharacterTab stats={stats} playerName={playerName} />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab equipment={equipment} />
        )}
        {activeTab === 'info' && (
          <InfoTab
            selectedNode={selectedNode}
            animatronics={animatronics}
            players={players}
            gameLog={gameLog}
            currentPlayerId={currentPlayerId}
          />
        )}
      </div>
    </div>
  );
}
