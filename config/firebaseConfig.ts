
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = initializeApp(firebaseConfig);
let dbPromise: Promise<Database> | null = null;

export const getDb = async (): Promise<Database> => {
  if (!dbPromise) {
    dbPromise = import('firebase/database').then(({ getDatabase }) => getDatabase(app));
  }

  return dbPromise;
};

if (typeof window !== 'undefined' && import.meta.env.PROD && firebaseConfig.measurementId) {
  import('firebase/analytics')
    .then(({ getAnalytics, isSupported }) => isSupported().then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    }))
    .catch(() => {
      // Ignore analytics init failures in production clients.
    });
}

export const auth = getAuth(app);
