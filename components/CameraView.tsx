/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/CameraView.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Вид камеры наблюдения (REDESIGNED v2.0)
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ FEATURES                                                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Эффекты при просмотре (scanlines, vignette, noise)                       │
 * │ - Эффект переключения камеры (static noise + glitch)                       │
 * │ - Улучшенная визуализация врагов и игроков                                 │
 * │ - Стилизованный UI камеры                                                  │
 * │ - Поддержка переключения на любую ноду                                     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ CHANGES v2.1                                                                │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ - Добавлена кнопка Night Cycle в верхний хедер камеры                      │
 * │ - Добавлена логика модального окна для просмотра детальной инфо о ночи     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useEffect, useRef } from 'react';
import { MapNodeData, ROOM_IMAGES, getRoomByNodeId } from '@/lib/mapData';
import { GlobalNightCycle, PlayerState, AnimatronicState } from '@/lib/types';
import Image from 'next/image';
import PlayerIndicators from './PlayerIndicators';
import NightCycleDisplay from './NightCycleDisplay';

interface CameraViewProps {
  currentNode: MapNodeData | null;
  viewingNode?: MapNodeData | null;
  nodeId: string;
  enemiesHere: { id: string; name: string; type: string }[];
  playersHere: { id: string; name: string; isCurrentPlayer: boolean; playerData?: PlayerState }[];
  onAttackPlayer?: (targetPlayer: PlayerState) => void;
  onInspectPlayer?: (targetPlayer: PlayerState) => void;
  
  // ★ Новые пропсы для Глобального Цикла
  nightCycle?: GlobalNightCycle;
  calculatedNight?: number;
  calculatedHour?: number;
  enemies?: AnimatronicState[]; // Полный список для NightCycleDisplay
  gameId?: string;
  isAdmin?: boolean;
}

export default function CameraView({
  currentNode,
  viewingNode,
  nodeId,
  enemiesHere,
  playersHere,
  onAttackPlayer,
  onInspectPlayer,
  nightCycle,
  calculatedNight,
  calculatedHour,
  enemies,
  gameId,
  isAdmin
}: CameraViewProps) {
  // Используем viewingNode если передан, иначе текущую ноду
  const displayNode = viewingNode || currentNode;
  const displayNodeId = viewingNode?.id || nodeId;
  const room = getRoomByNodeId(displayNodeId);

  // Состояния
  const [isSwitching, setIsSwitching] = useState(false);
  const [glitchIntensity, setGlitchIntensity] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // ★ Состояние для открытия меню ночи
  const [showNightInfo, setShowNightInfo] = useState(false);
  
  const prevNodeIdRef = useRef(displayNodeId);

  // Эффект переключения камеры
  useEffect(() => {
    if (prevNodeIdRef.current !== displayNodeId) {
      setIsSwitching(true);
      setGlitchIntensity(1);

      const glitchTimer = setTimeout(() => setGlitchIntensity(0.5), 100);
      const glitchTimer2 = setTimeout(() => setGlitchIntensity(0.2), 200);
      const timer = setTimeout(() => {
        setIsSwitching(false);
        setGlitchIntensity(0);
      }, 350);

      prevNodeIdRef.current = displayNodeId;
      return () => {
        clearTimeout(timer);
        clearTimeout(glitchTimer);
        clearTimeout(glitchTimer2);
      };
    }
  }, [displayNodeId]);

  // Обновление времени
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const imageSrc = room && ROOM_IMAGES[room.id]
    ? ROOM_IMAGES[room.id]
    : '/images/static.jpg';

  const isRemoteViewing = viewingNode && viewingNode.id !== currentNode?.id;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden border-2 border-zinc-800 rounded-lg shadow-2xl group">

      {/* Основной контент камеры */}
      <div
        className={`relative w-full h-full transition-all duration-100 ${isSwitching ? 'opacity-40 scale-[1.02]' : 'opacity-100'}`}
        style={{
          transform: glitchIntensity > 0 ? `translateX(${(Math.random() - 0.5) * glitchIntensity * 10}px)` : 'none'
        }}
      >
        {room && (
          <Image
            src={imageSrc}
            alt={room.label || "Camera"}
            fill
            priority
            unoptimized
            className="object-cover opacity-60 grayscale contrast-125 brightness-75 animate-pan-camera"
          />
        )}

        {!room && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">📺</div>
              <span className="font-mono text-2xl text-white/50 animate-pulse tracking-widest">NO SIGNAL</span>
            </div>
          </div>
        )}
      </div>

      {/* ═══ ИНДИКАТОРЫ ВРАГОВ ═══ */}
      {!showNightInfo && enemiesHere.length > 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4">
          {enemiesHere.map((enemy) => {
            // Цвета по типам аниматроников
            const enemyColors: Record<string, { bg: string; border: string; glow: string; icon: string }> = {
              'foxy': { bg: 'from-red-900/90 to-red-950/90', border: 'border-red-500', glow: 'shadow-red-500/70', icon: '🦊' },
              'bonnie': { bg: 'from-indigo-900/90 to-indigo-950/90', border: 'border-indigo-500', glow: 'shadow-indigo-500/70', icon: '🐰' },
              'chica': { bg: 'from-yellow-900/90 to-yellow-950/90', border: 'border-yellow-500', glow: 'shadow-yellow-500/70', icon: '🐤' },
              'freddy': { bg: 'from-amber-900/90 to-amber-950/90', border: 'border-amber-600', glow: 'shadow-amber-500/70', icon: '🐻' },
            };
            const colors = enemyColors[enemy.type?.toLowerCase()] || enemyColors['foxy'];

            return (
              <div
                key={enemy.id}
                className={`relative overflow-hidden bg-gradient-to-r ${colors.bg} border-2 ${colors.border} px-5 py-3 rounded-xl mb-3 shadow-2xl ${colors.glow}`}
              >
                {/* Animated background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />

                {/* Glitch lines */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute w-full h-px bg-red-500/50 top-1/4 animate-pulse" />
                  <div className="absolute w-full h-px bg-red-500/30 top-2/4 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <div className="absolute w-full h-px bg-red-500/50 top-3/4 animate-pulse" style={{ animationDelay: '0.6s' }} />
                </div>

                <div className="relative flex items-center gap-4">
                  {/* Icon with glow */}
                  <div className="relative">
                    <span className="text-4xl drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">{colors.icon}</span>
                    <div className="absolute inset-0 text-4xl blur-sm opacity-50">{colors.icon}</div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                      <span className="text-red-400 font-mono text-xs uppercase tracking-[0.3em] font-bold">
                        ⚠ ОБНАРУЖЕН ⚠
                      </span>
                    </div>
                    <div className="text-white font-mono text-2xl font-bold tracking-wider uppercase"
                      style={{ textShadow: '0 0 10px rgba(255,0,0,0.5)' }}>
                      {enemy.name || enemy.type}
                    </div>
                    <div className="text-red-400/60 font-mono text-[10px] tracking-wider mt-1">
                      УРОВЕНЬ УГРОЗЫ: КРИТИЧЕСКИЙ
                    </div>
                  </div>

                  {/* Danger indicator */}
                  <div className="ml-auto flex flex-col items-center">
                    <div className="text-3xl animate-bounce">☠️</div>
                    <div className="text-red-400 font-mono text-[10px] animate-pulse">DANGER</div>
                  </div>
                </div>

                {/* Bottom warning bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse" />
              </div>
            );
          })}
        </div>
      )}

{/* ═══ СПИСОК ИГРОКОВ ═══ */}
      {!showNightInfo && playersHere.length > 0 && onAttackPlayer && onInspectPlayer && (
        <PlayerIndicators
          players={playersHere}
          currentNodeId={displayNodeId}
          isViewingCurrentLocation={!isRemoteViewing}
          onAttack={onAttackPlayer}
          onInspect={onInspectPlayer}
        />
      )}

      {/* ═══ ЭФФЕКТЫ КАМЕРЫ ═══ */}
      {isSwitching && (
        <>
          <div className="static-overlay mix-blend-hard-light" />
          <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
            {Array(5).fill(0).map((_, i) => (
              <div
                key={i}
                className="absolute w-full h-2 bg-white/30"
                style={{
                  top: `${Math.random() * 100}%`,
                  transform: `translateX(${(Math.random() - 0.5) * 50}px)`,
                }}
              />
            ))}
          </div>
        </>
      )}

      <div className="scanlines mix-blend-overlay opacity-40" />
      <div className="vignette" />
      <div className="absolute inset-0 pointer-events-none crt-flicker" />

      {/* ═══ UI КАМЕРЫ (ХЕДЕР) ═══ */}
      <div className="absolute top-0 left-0 right-0 z-40 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-start justify-between">
          
          {/* СЛЕВА: REC + Режим */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
                <span className="font-mono text-red-500 text-lg font-bold tracking-[0.3em] drop-shadow-lg">
                  REC
                </span>
              </div>
            </div>
             {isRemoteViewing && (
                <div className="mt-1 px-2 py-0.5 bg-blue-900/60 border border-blue-500/50 rounded text-blue-400 font-mono text-[10px] w-fit">
                  УДАЛЁННЫЙ ПРОСМОТР
                </div>
              )}
          </div>

          {/* ★ ЦЕНТР (или СПРАВА): КНОПКА НОЧНОГО ЦИКЛА ★ */}
          {nightCycle && (
            <button 
                onClick={() => setShowNightInfo(true)}
                className="group flex flex-col items-end cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-all border border-transparent hover:border-white/10"
            >
                <div className="flex items-center gap-2">
                    <span className="text-xl group-hover:animate-pulse">🌙</span>
                    <span className="font-mono text-white text-xl font-bold tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                        {nightCycle.isActive ? `${calculatedHour} AM` : 'OFFLINE'}
                    </span>
                </div>
                {nightCycle.isActive && (
                    <div className="text-[10px] font-mono text-purple-400 tracking-[0.2em] group-hover:text-purple-300">
                        NIGHT {calculatedNight} • OPEN INFO
                    </div>
                )}
            </button>
          )}

        </div>

        {/* Название камеры (чуть ниже) */}
        {!showNightInfo && (
            <div className="mt-2 flex items-center gap-3">
            <div className="font-mono text-white text-2xl font-bold tracking-wider drop-shadow-lg">
                CAM-{displayNode?.id || '??'}
            </div>
            <div className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg">
                <span className="font-mono text-white/80 text-sm uppercase">
                {displayNode?.nameRu || 'OFFLINE'}
                </span>
            </div>
            </div>
        )}
      </div>

      {/* ═══ UI КАМЕРЫ (ФУТЕР) ═══ */}
      {!showNightInfo && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-end justify-between">
            <div className="font-mono text-white/40 text-xs">
                {room?.label || 'Unknown Location'}
            </div>
            <div className="flex items-center gap-4 text-right">
                <div className="font-mono text-white/40 text-xs">
                <span className="text-green-400">●</span> 60 FPS
                </div>
                <div className="font-mono text-white/40 text-xs">
                1080p HD
                </div>
                <div className="font-mono text-white/40 text-xs">
                IR: {enemiesHere.length > 0 ? <span className="text-red-400">ACTIVE</span> : 'OFF'}
                </div>
            </div>
            </div>
        </div>
      )}

      {/* ═══ МОДАЛЬНОЕ ОКНО НОЧНОГО ЦИКЛА (HUD OVERLAY) ═══ */}
      {showNightInfo && nightCycle && enemies && gameId && (
        <div className="absolute inset-0 z-50 bg-black/95 animate-in fade-in duration-200">
            {/* Рамка HUD'а */}
            <div className="absolute inset-0 border-2 border-purple-500/30 m-4 rounded-lg pointer-events-none z-50 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]"/>
            
            <NightCycleDisplay 
                gameId={gameId}
                nightCycle={nightCycle}
                calculatedNight={calculatedNight || 1}
                calculatedHour={calculatedHour || 12}
                enemies={enemies}
                isAdmin={isAdmin}
                onClose={() => setShowNightInfo(false)}
            />
        </div>
      )}

      {/* Рамка камеры (декор) */}
      <div className="absolute inset-0 border-4 border-zinc-800 rounded-lg pointer-events-none z-10" />
      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/30 rounded-tl-lg pointer-events-none z-10" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/30 rounded-tr-lg pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/30 rounded-bl-lg pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/30 rounded-br-lg pointer-events-none z-10" />
    </div>
  );
}
