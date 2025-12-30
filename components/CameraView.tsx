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

import { useState, useEffect } from 'react';
import { MapNodeData, getRoomById, ROOM_IMAGES } from '@/lib/mapData';

interface CameraViewProps {
  currentNode: MapNodeData | null;
  nodeId: string;
  enemiesHere: string[];
  playersHere: { id: string; name: string; isCurrentPlayer: boolean }[];
}

export default function CameraView({
  currentNode,
  nodeId,
  enemiesHere,
  playersHere
}: CameraViewProps) {
  const [noiseOpacity, setNoiseOpacity] = useState(0.1);
  const [time, setTime] = useState(new Date());

  const room = currentNode ? getRoomById(currentNode.roomId) : null;
  const roomLabel = room?.label || 'UNKNOWN';
  const roomLabelEn = room?.labelEn || 'Unknown';
  const imageSrc = currentNode ? ROOM_IMAGES[currentNode.roomId] : '';

  // Эффект помех
  useEffect(() => {
    const interval = setInterval(() => {
      setNoiseOpacity(Math.random() * 0.15 + 0.05);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Обновление времени
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Заголовок камеры */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
        <h2 className="text-white font-mono text-lg tracking-wider">
          КАМЕРА {currentNode?.roomId || 'N/A'} ({roomLabelEn})
          <span className="text-white/50 ml-2">(id: {nodeId})</span>
        </h2>
      </div>

      {/* Изображение комнаты */}
      {imageSrc ? (
        <div
          className="absolute inset-0 bg-cover bg-center animate-pan-camera"
          style={{
            backgroundImage: `url(${imageSrc})`,
            transform: 'scale(1.2)'
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white/20 font-mono text-xl">NO SIGNAL</div>
        </div>
      )}

      {/* Оверлей с помехами */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.1) 2px,
            rgba(0, 0, 0, 0.1) 4px
          )`,
          opacity: noiseOpacity
        }}
      />

      {/* Виньетка */}
      <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)]" />

      {/* Индикаторы врагов */}
      {enemiesHere.length > 0 && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-15">
          {enemiesHere.map((enemy, idx) => (
            <div
              key={idx}
              className="bg-black/70 backdrop-blur-sm px-4 py-2 border border-red-500/50 animate-pulse mb-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-red-500 animate-ping">⚠</span>
                <span className="text-red-400 font-mono text-sm uppercase">{enemy}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Индикаторы игроков */}
      {playersHere.length > 0 && (
        <div className="absolute bottom-20 left-4 z-15 space-y-1">
          {playersHere.map((player, idx) => (
            <div
              key={idx}
              className={`px-2 py-1 text-xs font-mono ${
                player.isCurrentPlayer
                  ? 'bg-purple-900/70 text-purple-300 border border-purple-500/50'
                  : 'bg-blue-900/70 text-blue-300 border border-blue-500/50'
              }`}
            >
              ● {player.name || 'Игрок'} {player.isCurrentPlayer && '(вы)'}
            </div>
          ))}
        </div>
      )}

      {/* UI камеры */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
        <span className="text-red-500 font-mono text-xs">REC</span>
      </div>

      {/* Время */}
      <div className="absolute bottom-4 right-4 z-20">
        <div className="text-green-500/70 font-mono text-sm">
          {time.toLocaleTimeString('ru-RU')}
        </div>
        <div className="text-green-500/50 font-mono text-xs text-right">
          {time.toLocaleDateString('ru-RU')}
        </div>
      </div>

      {/* Название комнаты снизу */}
      <div className="absolute bottom-4 left-4 z-20">
        <div className="text-white/80 font-mono text-sm">{roomLabel}</div>
        <div className="text-white/40 font-mono text-xs">Узел: {nodeId}</div>
      </div>
    </div>
  );
}
