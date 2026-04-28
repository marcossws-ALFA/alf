import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Use environment variables if available, otherwise fallback to the JSON file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseConfigJson.appId,
  firestoreDatabaseId: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId,
  databaseURL: firebaseConfigJson.databaseURL,
  measurementId: firebaseConfigJson.measurementId,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Initialize Analytics conditionally
export const getAnalyticsSafe = async () => {
  if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
    const { getAnalytics } = await import('firebase/analytics');
    return getAnalytics(app);
  }
  return null;
};
