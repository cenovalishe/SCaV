/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/CameraView.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE: Вид камеры наблюдения - основной визуальный элемент игры
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXPORTS OVERVIEW                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ DEFAULT EXPORT:                                                             │
 * │   CameraView          - React компонент камеры безопасности                │
 * │                                                                             │
 * │ PROPS (CameraViewProps):                                                    │
 * │   currentNode         - MapNodeData | null - данные текущей локации        │
 * │   nodeId              - string - ID текущей ноды                           │
 * │   enemiesHere         - string[] - имена врагов в локации                  │
 * │   playersHere         - {id, name, isCurrentPlayer}[] - игроки в локации   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DEPENDENCY GRAPH                                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │ IMPORTS FROM:                                                               │
 * │   react         → useState, useEffect                                      │
 * │   @/lib/mapData → MapNodeData, getRoomById, ROOM_IMAGES                    │
 * │                                                                             │
 * │ IMPORTED BY:                                                                │
 * │   app/page.tsx  → используется в левой части экрана (60% ширины)           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ UI STRUCTURE (FNAF-style camera)                                            │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                             │
 * │   ┌───────────────────────────────────────────────────────────────────┐    │
 * │   │ КАМЕРА R_MAIN (Dining Area) (id: 2)                      ● REC   │    │
 * │   ├───────────────────────────────────────────────────────────────────┤    │
 * │   │                                                                   │    │
 * │   │                                                                   │    │
 * │   │                    ┌─────────────────┐                            │    │
 * │   │                    │ ⚠ FREDDY        │  ← индикатор врага         │    │
 * │   │                    └─────────────────┘                            │    │
 * │   │                                                                   │    │
 * │   │  [фоновое изображение с анимацией панорамирования]               │    │
 * │   │  [оверлей с эффектом помех - мерцающие линии]                    │    │
 * │   │  [виньетка - затемнение по краям]                                │    │
 * │   │                                                                   │    │
 * │   │ ┌──────────────────┐                              12:30:45       │    │
 * │   │ │● Player1 (вы)    │                              30.12.2025     │    │
 * │   │ │● Player2         │    СТОЛОВАЯ                                 │    │
 * │   │ └──────────────────┘    Узел: 2                                  │    │
 * │   └───────────────────────────────────────────────────────────────────┘    │
 * │                                                                             │
 * │ EFFECTS:                                                                    │
 * │   - animate-pan-camera: плавное панорамирование фона                       │
 * │   - noiseOpacity: мерцающий эффект помех (150ms интервал)                  │
 * │   - Время обновляется каждую секунду                                       │
 * │   - Индикаторы врагов пульсируют (animate-pulse, animate-ping)             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client'

import React, { useState, useEffect } from 'react'; //
import { MapNodeData, ROOM_IMAGES, getRoomByNodeId } from '@/lib/mapData';
import Image from 'next/image';

interface CameraViewProps {
  currentNode: MapNodeData | null;
  nodeId: string;
  enemiesHere: string[];
  playersHere: { id: string; name: string; isCurrentPlayer: boolean }[];
}

export default function CameraView({ currentNode, nodeId, enemiesHere, playersHere }: CameraViewProps) {
  const room = getRoomByNodeId(nodeId);
  
  // 1. Состояние для эффекта переключения
  const [isSwitching, setIsSwitching] = useState(false);

  // 2. Эффект: при смене nodeId включаем "шум" на 200мс
  useEffect(() => {
    setIsSwitching(true);
    const timer = setTimeout(() => {
      setIsSwitching(false);
    }, 250); // Длительность помех

    return () => clearTimeout(timer);
  }, [nodeId]);

  // Получаем изображение (или заглушку, если нет комнаты)
  const imageSrc = room && ROOM_IMAGES[room.id] 
    ? ROOM_IMAGES[room.id] 
    : 'https://media.istockphoto.com/id/175425791/photo/tv-static.jpg?s=612x612&w=0&k=20&c=N2C6A9I5kFkM-v7j8bQ3xXk4dFj8lZ7y5o_5z7k5x8=';

  return (
    <div className="relative w-full h-full bg-black overflow-hidden border-4 border-zinc-900 shadow-inner">
      
      {/* 3. Основной контейнер с контентом (скрываем его, если идет сильный шум переключения, или оставляем для просвечивания) */}
      <div className={`relative w-full h-full transition-opacity duration-100 ${isSwitching ? 'opacity-50' : 'opacity-100'} crt-flicker`}>
        
        {/* Фоновое изображение комнаты */}
        {room && (
          <Image
            src={imageSrc}
            alt={room.labelRu || "Camera"}
            fill
            className="object-cover opacity-60 grayscale contrast-125 brightness-75" // CSS фильтры для старого вида
            priority
          />
        )}

        {/* Если нет сигнала/комнаты */}
        {!room && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <span className="font-mono text-xl text-white/50 animate-pulse">NO SIGNAL</span>
          </div>
        )}

        {/* Отрисовка врагов (силуэты) */}
        {enemiesHere.map((enemy, idx) => (
          <div 
            key={idx}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-black/80 blur-xl animate-pulse"
            title={`Enemy: ${enemy}`}
          />
        ))}

        {/* Отрисовка других игроков */}
        {playersHere.map((p) => !p.isCurrentPlayer && (
          <div 
            key={p.id}
            className="absolute top-2/3 left-1/3 w-12 h-32 bg-green-500/20 border border-green-500/50 flex items-center justify-center"
          >
            <span className="text-[10px] text-green-500 font-mono -mt-6">{p.name}</span>
          </div>
        ))}
      </div>

      {/* ─── ЭФФЕКТЫ ПОВЕРХ КАМЕРЫ ─── */}

      {/* 4. Шум при переключении (показывается только когда isSwitching === true) */}
      {isSwitching && (
        <div className="static-overlay mix-blend-hard-light"></div>
      )}

      {/* 5. Постоянные CRT эффекты (Скан-линии и Виньетка) */}
      <div className="scanlines mix-blend-overlay opacity-50"></div>
      <div className="vignette"></div>

      {/* 6. Текстовый оверлей (UI камеры) */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]" />
          <span className="font-mono text-red-600 text-lg tracking-widest shadow-black drop-shadow-md">REC</span>
        </div>
        <div className="font-mono text-white/90 text-xl tracking-wider drop-shadow-md">
          {currentNode ? `CAM-${currentNode.id} [${currentNode.nameRu.toUpperCase()}]` : 'OFFLINE'}
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-20 pointer-events-none text-right">
        <div className="font-mono text-white/70 text-sm">
          {new Date().toLocaleTimeString('en-US', { hour12: true })}
        </div>
        <div className="font-mono text-white/50 text-xs">
          60 FPS • 1080p
        </div>
      </div>
    </div>
  );
}
