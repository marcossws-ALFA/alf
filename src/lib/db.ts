import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

export const dbUtils = {
  // Generic CRUD
  async list(col: string) {
    const querySnapshot = await getDocs(collection(db, col));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async get(col: string, id: string) {
    const docRef = doc(db, col, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async add(col: string, data: any) {
    return addDoc(collection(db, col), data);
  },

  async update(col: string, id: string, data: any) {
    const docRef = doc(db, col, id);
    return updateDoc(docRef, data);
  },

  async set(col: string, id: string, data: any) {
    const docRef = doc(db, col, id);
    return setDoc(docRef, data);
  },

  async delete(col: string, id: string) {
    const docRef = doc(db, col, id);
    return deleteDoc(docRef);
  },

  // Specialized queries
  async queryByField(col: string, field: string, value: any) {
    const q = query(collection(db, col), where(field, '==', value));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
