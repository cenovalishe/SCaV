import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebaseAdmin';

export async function GET() {
  const gameId = 'game_alpha';
  const playerId = 'player_1';
  
  // 1. Создаем игрока
  await dbAdmin.collection('games').doc(gameId).collection('players').doc(playerId).set({
    nickname: "Survivor",
    currentNode: "node_01", // Стартовая точка (из конфига MAP_NODES)
    stats: { hp: 100, san: 100 },
    status: "IDLE",
    inventory: []
  });

  // 2. Создаем врага
  await dbAdmin.collection('games').doc(gameId).collection('enemies').doc('enemy_1').set({
    type: "Shambler",
    currentNode: "node_04", // Где-то далеко
    hp: 50
  });

  return NextResponse.json({ message: "Database Seeded! Ready to play." });
}