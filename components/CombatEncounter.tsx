'use client'

import { useState, useEffect, useRef } from 'react';
import { resolveCombatRound } from '@/app/actions/combatActions';

interface CombatProps {
  gameId: string;
  playerId: string;
  enemyId: string;
  enemyHp: number;
  onClose?: () => void;
}

export default function CombatEncounter({ gameId, playerId, enemyId, enemyHp, onClose }: CombatProps) {
  // Состояние бегунка (0 to 100)
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = вправо, -1 = влево
  const [isFighting, setIsFighting] = useState(false); // Чтобы не кликать дважды
  const [lastResult, setLastResult] = useState<"HIT" | "MISS" | null>(null);
  
  // Настройки сложности (можно менять в зависимости от врага)
  const SPEED = 1.5; // Скорость бегунка
  const TARGET_START = 40; // Начало зеленой зоны (%)
  const TARGET_WIDTH = 20; // Ширина зоны (%)
  
  const reqRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      setPosition((prev) => {
        let next = prev + SPEED * direction;
        if (next >= 100 || next <= 0) {
          setDirection((d) => d * -1); // Отскок от краев
          next = prev; // Фикс вылета за границы
        }
        return next;
      });
      reqRef.current = requestAnimationFrame(animate);
    };

    if (!isFighting && lastResult !== "HIT") {
      reqRef.current = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(reqRef.current!);
  }, [direction, isFighting, lastResult]);

  const handleAttack = async () => {
    setIsFighting(true);
    cancelAnimationFrame(reqRef.current!);

    // Проверка попадания
    const hitStart = TARGET_START;
    const hitEnd = TARGET_START + TARGET_WIDTH;
    const isSuccess = position >= hitStart && position <= hitEnd;

    setLastResult(isSuccess ? "HIT" : "MISS");

    // Отправка на сервер
    await resolveCombatRound(gameId, playerId, enemyId, isSuccess);

    // Пауза перед следующим раундом, если враг жив
    setTimeout(() => {
        setIsFighting(false);
        setLastResult(null);
        // Сброс позиции рандомно
        setPosition(Math.random() * 20);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      
      {/* HUD Врага */}
      <div className="mb-10 text-center animate-pulse">
        <h1 className="text-4xl font-black text-red-600 tracking-widest mb-2">⚠ CONTACT ⚠</h1>
        <div className="text-xl text-white">ENEMY INTEGRITY: {enemyHp}%</div>
        <div className="w-64 h-4 bg-gray-800 mt-2 mx-auto border border-red-900">
           <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${enemyHp}%` }}></div>
        </div>
      </div>

      {/* Сама мини-игра (Skill Check Bar) */}
      <div className="relative w-full max-w-md h-12 bg-gray-800 border-2 border-gray-500 rounded overflow-hidden mb-8 shadow-[0_0_30px_rgba(255,0,0,0.5)]">
        
        {/* Зеленая зона (Цель) */}
        <div 
          className="absolute top-0 bottom-0 bg-green-500/50 border-x-2 border-green-400"
          style={{ left: `${TARGET_START}%`, width: `${TARGET_WIDTH}%` }}
        ></div>

        {/* Бегунок */}
        <div 
          className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_10px_white] z-10"
          style={{ left: `${position}%` }}
        ></div>
      </div>

      {/* Кнопка и Результат */}
      <div className="h-20 flex items-center justify-center">
        {lastResult === "HIT" && <div className="text-5xl font-black text-green-500 animate-bounce">CRITICAL HIT!</div>}
        {lastResult === "MISS" && <div className="text-5xl font-black text-red-600 animate-shake">MISS! DAMAGE TAKEN!</div>}
        
        {!lastResult && (
          <button 
            onMouseDown={handleAttack} // onMouseDown для быстрого отклика
            disabled={isFighting}
            className="px-12 py-4 bg-red-700 hover:bg-red-600 text-white font-bold text-2xl tracking-widest border-2 border-red-400 rounded shadow-lg active:scale-95 transition-all"
          >
            [ FIRE ]
          </button>
        )}
      </div>

      <div className="mt-8 text-gray-500 text-sm">
        Press FIRE when cursor is in the GREEN ZONE
      </div>
    </div>
  );
}