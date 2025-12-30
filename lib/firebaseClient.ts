import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // Остальные поля (authDomain, storageBucket) можно взять из консоли, 
  // но для Firestore часто достаточно этих двух.
};

// Singleton паттерн: инициализируем только если еще нет аппа
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const dbClient = getFirestore(app);