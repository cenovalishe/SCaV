import admin from 'firebase-admin';

// Инициализация Firebase Admin только если есть конфигурация
if (!admin.apps.length &&
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Исправление переносов строк для Vercel
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Экспортируем dbAdmin только если Firebase инициализирован
export const dbAdmin = admin.apps.length > 0 ? admin.firestore() : null as any;