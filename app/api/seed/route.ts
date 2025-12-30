// app/api/seed/route.ts
import { dbAdmin } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function GET() {
  // Проверяем, инициализирован ли Firebase
  if (!dbAdmin) {
    return NextResponse.json({
      error: "Firebase not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables."
    }, { status: 503 });
  }

  const gameId = 'game_alpha';
  const enemiesRef = dbAdmin.collection('games').doc(gameId).collection('enemies');

  const initialEnemies = [
    { id: 'freddy', type: 'Freddy', currentNode: '1', hp: 100, color: '🟤' },
    { id: 'bonnie', type: 'Bonnie', currentNode: '9', hp: 100, color: '🔵' },
    { id: 'chica', type: 'Chica', currentNode: '4', hp: 100, color: '🟡' },
    { id: 'foxy', type: 'Foxy', currentNode: '8', hp: 100, color: '🔴' }
  ];

  try {
    const batch = dbAdmin.batch();

    initialEnemies.forEach((enemy) => {
      const docRef = enemiesRef.doc(enemy.id);
      batch.set(docRef, enemy);
    });

    await batch.commit();
    return NextResponse.json({ message: "Enemies spawned successfully" });
  } catch (e) {
    return NextResponse.json({ error: "Failed to seed enemies" }, { status: 500 });
  }
}