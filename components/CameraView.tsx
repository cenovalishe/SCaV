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
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useEffect, useRef } from 'react';
import { MapNodeData, ROOM_IMAGES, getRoomByNodeId } from '@/lib/mapData';
import Image from 'next/image';

interface CameraViewProps {
  currentNode: MapNodeData | null;
  viewingNode?: MapNodeData | null; // ★ Нода, которую СМОТРИМ (может отличаться от текущей позиции)
  nodeId: string;
  enemiesHere: { id: string; name: string; type: string }[];
  playersHere: { id: string; name: string; isCurrentPlayer: boolean }[];
}

export default function CameraView({
  currentNode,
  viewingNode,
  nodeId,
  enemiesHere,
  playersHere
}: CameraViewProps) {
  // Используем viewingNode если передан, иначе текущую ноду
  const displayNode = viewingNode || currentNode;
  const displayNodeId = viewingNode?.id || nodeId;
  const room = getRoomByNodeId(displayNodeId);

  // Состояния для эффектов
  const [isSwitching, setIsSwitching] = useState(false);
  const [glitchIntensity, setGlitchIntensity] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const prevNodeIdRef = useRef(displayNodeId);

  // Эффект переключения камеры
  useEffect(() => {
    if (prevNodeIdRef.current !== displayNodeId) {
      setIsSwitching(true);
      setGlitchIntensity(1);

      // Уменьшаем глитч постепенно
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

  // Изображение комнаты
  const imageSrc = room && ROOM_IMAGES[room.id]
    ? ROOM_IMAGES[room.id]
    : '/images/static.jpg';

  // Проверяем, смотрим ли мы на другую ноду
  const isRemoteViewing = viewingNode && viewingNode.id !== currentNode?.id;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden border-2 border-zinc-800 rounded-lg shadow-2xl">

      {/* Основной контент камеры */}
      <div
        className={`relative w-full h-full transition-all duration-100 ${isSwitching ? 'opacity-40 scale-[1.02]' : 'opacity-100'}`}
        style={{
          transform: glitchIntensity > 0 ? `translateX(${(Math.random() - 0.5) * glitchIntensity * 10}px)` : 'none'
        }}
      >
        {/* Фоновое изображение */}
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

        {/* Если нет сигнала */}
        {!room && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">📺</div>
              <span className="font-mono text-2xl text-white/50 animate-pulse tracking-widest">NO SIGNAL</span>
            </div>
          </div>
        )}

        {/* Силуэты врагов */}
        {enemiesHere.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {enemiesHere.map((enemy, idx) => (
              <div
                key={enemy.id}
                className="absolute"
                style={{
                  left: `${30 + idx * 20}%`,
                  top: '40%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Тень врага */}
                <div className="w-32 h-48 bg-gradient-to-t from-black/90 to-transparent blur-xl animate-pulse" />
                {/* Глаза - статичное свечение без анимации */}
                <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-6">
                  <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_30px_red,0_0_60px_red]" />
                  <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_30px_red,0_0_60px_red]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ ИНДИКАТОРЫ ВРАГОВ (УЛУЧШЕННЫЕ) ═══ */}
      {enemiesHere.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
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
      {playersHere.length > 0 && (
        <div className="absolute bottom-20 left-4 z-20">
          <div className="bg-black/80 border border-green-500/40 rounded-xl overflow-hidden min-w-[160px] backdrop-blur-sm">
            <div className="bg-green-900/60 px-4 py-2 border-b border-green-500/30">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
                <span className="text-green-400 font-mono text-xs uppercase tracking-widest">
                  В локации
                </span>
                <span className="ml-auto text-green-400/60 font-mono text-xs">{playersHere.length}</span>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {playersHere.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    p.isCurrentPlayer
                      ? 'bg-purple-900/50 border border-purple-500/40'
                      : 'bg-zinc-800/50 hover:bg-zinc-700/50'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    p.isCurrentPlayer ? 'bg-purple-500 shadow-lg shadow-purple-500/50' : 'bg-green-500'
                  }`} />
                  <span className={`font-mono text-sm ${
                    p.isCurrentPlayer ? 'text-purple-300 font-bold' : 'text-white/70'
                  }`}>
                    {p.name}
                  </span>
                  {p.isCurrentPlayer && (
                    <span className="ml-auto text-[10px] text-purple-400/60 font-mono">(ВЫ)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ ЭФФЕКТЫ КАМЕРЫ ═══ */}

      {/* Шум при переключении */}
      {isSwitching && (
        <>
          <div className="static-overlay mix-blend-hard-light" />
          {/* Глитч-линии */}
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

      {/* Постоянные CRT эффекты */}
      <div className="scanlines mix-blend-overlay opacity-40" />
      <div className="vignette" />

      {/* Мерцание CRT */}
      <div className="absolute inset-0 pointer-events-none crt-flicker" />

      {/* ═══ UI КАМЕРЫ ═══ */}

      {/* Заголовок камеры */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4">
        <div className="flex items-center justify-between">
          {/* REC индикатор */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
              <span className="font-mono text-red-500 text-lg font-bold tracking-[0.3em] drop-shadow-lg">
                REC
              </span>
            </div>
            {isRemoteViewing && (
              <div className="px-2 py-1 bg-blue-900/60 border border-blue-500/50 rounded text-blue-400 font-mono text-xs">
                УДАЛЁННЫЙ ПРОСМОТР
              </div>
            )}
          </div>

          {/* Время */}
          <div className="text-right">
            <div className="font-mono text-white/90 text-lg tracking-wider drop-shadow-lg">
              {currentTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="font-mono text-white/50 text-xs">
              {currentTime.toLocaleDateString('ru-RU')}
            </div>
          </div>
        </div>

        {/* Название камеры */}
        <div className="mt-3 flex items-center gap-3">
          <div className="font-mono text-white text-2xl font-bold tracking-wider drop-shadow-lg">
            CAM-{displayNode?.id || '??'}
          </div>
          <div className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg">
            <span className="font-mono text-white/80 text-sm uppercase">
              {displayNode?.nameRu || 'OFFLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Футер камеры */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4">
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

      {/* Рамка камеры */}
      <div className="absolute inset-0 border-4 border-zinc-800 rounded-lg pointer-events-none z-10" />
      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white/30 rounded-tl-lg pointer-events-none z-10" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white/30 rounded-tr-lg pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white/30 rounded-bl-lg pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white/30 rounded-br-lg pointer-events-none z-10" />
    </div>
  );
}
