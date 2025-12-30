'use client'

import { useState, useEffect } from 'react';
import clsx from 'clsx';

interface SecurityCameraProps {
  roomLabel: string;
  imgSrc: string; // URL картинки комнаты
  isActive: boolean;
  onActivate: () => void;
  enemiesHere?: string[]; // Список врагов в этой комнате
}

export default function SecurityCamera({ roomLabel, imgSrc, isActive, onActivate, enemiesHere = [] }: SecurityCameraProps) {
  
  // Эффект "помех" (Static Noise)
  const [noiseOpacity, setNoiseOpacity] = useState(0.1);
  
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setNoiseOpacity(Math.random() * 0.2 + 0.05); // Мерцание шума
    }, 150);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex flex-col items-center mx-2">
      {/* Кнопка переключения камеры */}
      <button 
        onClick={onActivate}
        className={clsx(
          "px-3 py-1 mb-2 text-xs font-mono border transition-colors",
          isActive ? "bg-green-700 border-green-500 text-white" : "bg-gray-900 border-gray-700 text-gray-500 hover:text-white"
        )}
      >
        CAM_{roomLabel}
      </button>

      {/* Экран (Рендерим только если активна, чтобы экономить ресурсы, или скрываем через CSS) */}
      <div className={clsx(
        "relative w-64 h-48 bg-black overflow-hidden border-4 border-gray-800 rounded-lg shadow-[0_0_15px_rgba(0,0,0,0.8)] transition-opacity duration-500",
        isActive ? "opacity-100" : "opacity-30 grayscale pointer-events-none"
      )}>
        
        {isActive && (
          <>
            {/* Изображение с анимацией панорамирования (Panning) */}
            <div 
              className="absolute inset-0 w-[120%] h-full bg-cover bg-center animate-pan-camera"
              style={{ backgroundImage: `url(${imgSrc})` }}
            ></div>

            {/* Враги (силуэты) */}
            {enemiesHere.map((enemy, idx) => (
              <div key={idx} className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-40 bg-black/80 blur-sm animate-pulse flex items-center justify-center">
                 <span className="text-red-600 text-xs font-mono">⚠ {enemy}</span>
              </div>
            ))}

            {/* Overlay: Виньетка (Vignette) + Scanlines */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] z-10"></div>
            <div className="absolute inset-0 pointer-events-none bg-[url('https://media.istockphoto.com/id/175426189/photo/television-static-screen.jpg?s=612x612&w=0&k=20&c=6P4F7fPZl2w1i2zT7zZ5zZ5zZ5zZ5zZ5zZ5zZ5zZ5z')] opacity-10 mix-blend-overlay z-20"></div>
            
            {/* UI Камеры: REC, Время */}
            <div className="absolute top-2 left-2 text-green-500 font-mono text-xs z-30 flex items-center gap-2">
               <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span> REC
            </div>
            <div className="absolute bottom-2 right-2 text-green-500/70 font-mono text-xs z-30">
               {new Date().toLocaleTimeString()}
            </div>
          </>
        )}
        
        {!isActive && <div className="absolute inset-0 flex items-center justify-center text-gray-700 font-mono text-xs">NO SIGNAL</div>}
      </div>
    </div>
  );
}