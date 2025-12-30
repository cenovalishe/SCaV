import { dbAdmin } from '@/lib/firebaseAdmin';
import { NextResponse } from 'next/server';

export async function GET() {
  const gameId = 'game_alpha';
  const enemiesRef = dbAdmin.collection('games').doc(gameId).collection('enemies');

  // Начальные позиции согласно семантическому графу
  const initialEnemies = [
    { id: 'freddy', type: 'Freddy', currentNode: '1', hp: 100 }, // Сцена
    { id: 'bonnie', type: 'Bonnie', currentNode: '9', hp: 100 }, // Мастерская
    { id: 'chica', type: 'Chica', currentNode: '4', hp: 100 },  // Кухня
    { id: 'foxy', type: 'Foxy', currentNode: '8', hp: 100 }    // Пиратская бухта
  ];

  try {
    const batch = dbAdmin.batch();
    
    initialEnemies.forEach((enemy) => {
      const docRef = enemiesRef.doc(enemy.id);
      batch.set(docRef, enemy);
    });

    await batch.commit();
    return NextResponse.json({ 
      success: true, 
      message: "Enemies successfully spawned in game_alpha" 
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to seed enemies" }, { status: 500 });
  }
}