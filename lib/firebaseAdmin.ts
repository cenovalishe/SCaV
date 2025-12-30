import admin from 'firebase-admin';

// Проверяем наличие всех необходимых переменных окружения
const hasFirebaseConfig =
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length && hasFirebaseConfig) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
} else if (!admin.apps.length) {
  // Инициализация с моковыми данными для build-time (без реального подключения)
  console.warn('Firebase Admin: Using mock configuration - set FIREBASE_* env vars for production');
}

export const dbAdmin = admin.apps.length ? admin.firestore() : null;
