import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export const dbUtils = {
  add: async (col: string, data: any) => {
    return addDoc(collection(db, col), {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp()
    });
  },
  update: async (col: string, id: string, data: any) => {
    return updateDoc(doc(db, col, id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  },
  delete: async (col: string, id: string) => {
    return deleteDoc(doc(db, col, id));
  },
  set: async (col: string, id: string, data: any) => {
    return setDoc(doc(db, col, id), {
      ...data,
      updatedAt: serverTimestamp()
    });
  }
};
