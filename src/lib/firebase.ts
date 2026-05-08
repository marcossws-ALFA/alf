import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// Note: firebase-applet-config.json uses firestoreDatabaseId for the database name
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
