/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/TabbedPanel.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Контейнер с вкладками для правой панели UI (REDESIGNED v2.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES v2.0                                                               │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Стилизованные вкладки с анимациями                                       │
 * │ - Поддержка onEquipmentChange для InventoryTab                             │
 * │ - Улучшенный визуальный дизайн                                             │
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
  onEquipmentChange?: (newEquipment: Equipment) => void; // ★ Новый callback
  selectedNode: MapNodeData | null;
  animatronics: AnimatronicState[];
  players: PlayerState[];
  gameLog: GameLogEntry[];
  currentPlayerId: string;
}

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'character', label: 'ПЕРСОНАЖ', icon: '👤' },
  { id: 'inventory', label: 'ИНВЕНТАРЬ', icon: '🎒' },
  { id: 'info', label: 'ИНФОРМАЦИЯ', icon: '📋' }
];

export default function TabbedPanel({
  stats,
  playerName,
  equipment,
  onEquipmentChange,
  selectedNode,
  animatronics,
  players,
  gameLog,
  currentPlayerId
}: TabbedPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('character');

  return (
    <div className="bg-gradient-to-b from-zinc-900 to-black border border-white/20 flex flex-col h-full rounded-lg overflow-hidden">
      {/* Заголовок панели с декоративными линиями */}
      <div className="flex items-center border-b border-white/10 bg-black/50">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/20" />
        <div className="px-4 py-2">
          <div className="w-3 h-3 border border-red-500/50 rotate-45" />
        </div>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/20" />
      </div>

      {/* Вкладки */}
      <div className="flex border-b border-white/10 bg-black/30">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-3 px-2 font-mono text-xs tracking-wider
              transition-all duration-200 border-r border-white/5 last:border-r-0
              flex items-center justify-center gap-2
              ${activeTab === tab.id
                ? 'bg-white/10 text-white border-b-2 border-b-red-500 shadow-inner'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }
            `}
          >
            <span className={activeTab === tab.id ? 'scale-110' : 'opacity-50'}>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Контент вкладок */}
      <div className="flex-1 p-3 overflow-hidden">
        {activeTab === 'character' && (
          <CharacterTab stats={stats} playerName={playerName} />
        )}
        {activeTab === 'inventory' && (
          <InventoryTab
            equipment={equipment}
            onEquipmentChange={onEquipmentChange}  // ★ Передаём callback
          />
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
