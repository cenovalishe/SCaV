/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FILE MANIFEST: components/AdminTimeControls.tsx
 * ═══════════════════════════════════════════════════════════════════════════════
 * PURPOSE: Временная панель администратора для управления временем
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { adminSetNightCycle } from '@/app/actions/nightCycleActions';

export default function AdminTimeControls({ gameId }: { gameId: string }) {
  const [night, setNight] = useState(1);
  const [hour, setHour] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const handleTimeWarp = async () => {
    setIsLoading(true);
    try {
      const res = await adminSetNightCycle(gameId, Number(night), Number(hour));
      if (res.success) {
        alert(`✅ Время изменено: Ночь ${night}, ${hour} AM`);
      } else {
        alert('❌ Ошибка: ' + res.message);
      }
    } catch (e) {
      alert('Ошибка вызова server action');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[100] bg-black/90 border border-red-500/30 p-4 rounded-lg shadow-xl backdrop-blur-sm w-64">
      <h3 className="text-red-500 font-mono text-xs mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"/>
        ADMIN TIME CONTROL
      </h3>
      
      <div className="space-y-3 font-mono text-xs">
        <div className="flex justify-between items-center">
          <label className="text-white/60">Night (1-5):</label>
          <input 
            type="number" 
            min="1" 
            max="5"
            value={night} 
            onChange={(e) => setNight(Number(e.target.value))} 
            className="w-16 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white focus:border-red-500 outline-none" 
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
            className="w-16 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-white focus:border-red-500 outline-none" 
          />
        </div>

        <button 
          onClick={handleTimeWarp} 
          disabled={isLoading}
          className="w-full bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-500/50 py-2 rounded transition-colors disabled:opacity-50 flex justify-center"
        >
          {isLoading ? 'WARPING...' : 'SET TIME'}
        </button>
      </div>
    </div>
  );
}
