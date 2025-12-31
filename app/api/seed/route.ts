// app/api/seed/route.ts
import { dbAdmin } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function GET() {
  if (!dbAdmin) {
    return NextResponse.json(
      { error: "Firebase not configured - set FIREBASE_* environment variables" },
      { status: 503 }
    );
  }

  const gameId = 'game_alpha';
  const enemiesRef = dbAdmin.collection('games').doc(gameId).collection('enemies');

  // [PATCH] Удален параметр hp у аниматроников
  const initialEnemies = [
    { id: 'freddy', type: 'Freddy', currentNode: '1', color: '🟤' },
    { id: 'bonnie', type: 'Bonnie', currentNode: '9', color: '🔵' },
    { id: 'chica', type: 'Chica', currentNode: '4', color: '🟡' },
    { id: 'foxy', type: 'Foxy', currentNode: '8', color: '🔴' }
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
