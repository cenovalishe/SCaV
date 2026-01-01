/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/AdminTimeControls.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 * PURPOSE: Временная панель администратора (Скрытая по умолчанию)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { adminSetNightCycle } from '@/app/actions/nightCycleActions';

export default function AdminTimeControls({ gameId }: { gameId: string }) {
  const [isOpen, setIsOpen] = useState(false); // ★ Скрыто по умолчанию
  const [night, setNight] = useState(1);
  const [hour, setHour] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleTimeWarp = async () => {
    setIsLoading(true);
    try {
      const res = await adminSetNightCycle(gameId, Number(night), Number(hour));
      if (res.success) {
        alert(`✅ Время изменено: Ночь ${night}, ${hour} AM`);
        // Не закрываем окно автоматически, чтобы можно было подправить, если нужно
      } else {
        alert('❌ Ошибка: ' + res.message);
      }
    } catch (e) {
      alert('Ошибка вызова server action');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Состояние свернутой кнопки
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-[100] bg-red-950/30 hover:bg-red-900/80 text-red-500 border border-red-500/30 px-3 py-1 rounded text-[10px] font-mono tracking-widest transition-all backdrop-blur-sm opacity-50 hover:opacity-100"
      >
        ADMIN
      </button>
    );
  }

  // 2. Состояние развернутой панели
  return (
    <div className="fixed top-4 right-4 z-[100] bg-black/95 border border-red-500/50 p-4 rounded-lg shadow-2xl backdrop-blur-md w-64 animate-in fade-in zoom-in duration-200">
      {/* Заголовок и кнопка закрытия */}
      <div className="flex justify-between items-start mb-4 border-b border-red-500/20 pb-2">
        <h3 className="text-red-500 font-mono text-xs flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
          ADMIN CONTROL
        </h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-red-500/50 hover:text-red-400 hover:bg-red-900/20 rounded px-1.5 transition-colors text-xs font-mono"
        >
          [CLOSE]
        </button>
      </div>
      
      <div className="space-y-4 font-mono text-xs">
        <div className="flex justify-between items-center">
          <label className="text-white/60">Night (1-5):</label>
          <input 
            type="number" 
            min="1" 
            max="5"
            value={night} 
            onChange={(e) => setNight(Number(e.target.value))} 
            className="w-16 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white focus:border-red-500 outline-none text-center" 
          />
        </div>
        
        <div className="flex justify-between items-center">
          <label className="text-white/60">Hour (1-6):</label>
          <input 
            type="number" 
            min="1" 
            max="6"
            value={hour} 
            onChange={(e) => setHour(Number(e.target.value))} 
            className="w-16 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white focus:border-red-500 outline-none text-center" 
          />
        </div>

        <button 
          onClick={handleTimeWarp} 
          disabled={isLoading}
          className="w-full bg-red-900/40 hover:bg-red-800 text-red-200 border border-red-500/50 py-2 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 group"
        >
          {isLoading ? (
            <span className="animate-pulse">PROCESSING...</span>
          ) : (
            <>
              <span>SET TIME</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
