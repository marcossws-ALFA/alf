'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  getDocFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { 
  Equipment, 
  Client, 
  ServiceOrder, 
  Part, 
  Service, 
  Transaction, 
  Supplier, 
  FixedExpense, 
  Mechanic, 
  Seller, 
  SystemUser, 
  PDVOrder, 
  Rental,
  CompanyData,
  ImportedInvoice
} from '../types';

interface FirebaseContextType {
  user: User | null;
  userProfile: SystemUser | null;
  isAdmin: boolean;
  isAuthorized: boolean;
  isAuthReady: boolean;
  needsProfileUpdate: boolean;
  loading: boolean;
  data: {
    equipment: Equipment[];
    clients: Client[];
    serviceOrders: ServiceOrder[];
    parts: Part[];
    services: Service[];
    transactions: Transaction[];
    suppliers: Supplier[];
    fixedExpenses: FixedExpense[];
    mechanics: Mechanic[];
    sellers: Seller[];
    users: SystemUser[];
    pdvOrders: PDVOrder[];
    rentals: Rental[];
    company: CompanyData | null;
    companyData: CompanyData | null;
    importedInvoices: ImportedInvoice[];
    systemUsers: SystemUser[];
  };
  actions: {
    add: (collection: string, data: any) => Promise<any>;
    update: (collection: string, id: string, data: any) => Promise<void>;
    remove: (collection: string, id: string) => Promise<void>;
    set: (collection: string, id: string, data: any) => Promise<void>;
    setTransactions: (data: Transaction[]) => void;
    setClients: (data: Client[]) => void;
    setServiceOrders: (data: ServiceOrder[]) => void;
    setEquipment: (data: Equipment[]) => void;
    setParts: (data: Part[]) => void;
    setSuppliers: (data: Supplier[]) => void;
    setMechanics: (data: Mechanic[]) => void;
    setSellers: (data: Seller[]) => void;
    setSystemUsers: (data: SystemUser[]) => void;
    setCompanyData: (data: CompanyData) => void;
    setPdvOrders: (data: PDVOrder[]) => void;
    setFixedExpenses: (data: FixedExpense[]) => void;
    setRentals: (data: Rental[]) => void;
    setServices: (data: Service[]) => void;
  };
  login: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | null>(null);

// Use environment variables if available, otherwise fall back to the JSON config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseConfigJson.appId,
  firestoreDatabaseId: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_ID || (firebaseConfigJson as any).firestoreDatabaseId
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  
  // Create a clean authInfo without hidden proxies or circular references
  const authInfo = {
    userId: auth.currentUser?.uid || null,
    email: auth.currentUser?.email || null,
    emailVerified: auth.currentUser?.emailVerified || false,
    isAnonymous: auth.currentUser?.isAnonymous || false,
    tenantId: auth.currentUser?.tenantId || null,
    providerInfo: (auth.currentUser?.providerData || []).map(p => ({
      providerId: p.providerId || null,
      email: p.email || null,
    }))
  };

  const errInfo = {
    error: errMessage,
    operationType,
    path,
    authInfo
  };

  let serialized = '';
  try {
    serialized = JSON.stringify(errInfo);
  } catch (stringifyError) {
    console.warn('Failed to stringify full error info, using fallback', stringifyError);
    serialized = JSON.stringify({
      error: errMessage,
      operationType,
      path,
      serializationError: 'Circular structure detected'
    });
  }

  console.error('Firestore Error:', errInfo);
  throw new Error(serialized);
}

const MASTER_ADMINS = ['alfamaqmanutencao@gmail.com', 'alfamaqmanutenção@gmail.com'];

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [pdvOrders, setPDVOrders] = useState<PDVOrder[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [importedInvoices, setImportedInvoices] = useState<ImportedInvoice[]>([]);

  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('offline')) {
          console.error("Firebase connection error: Client is offline");
        }
      }
    };
    testConnection();

    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch user profile or create one
        const userDoc = doc(db, 'users', user.uid);
        
        // Initial fetch to ensure we have data quickly
        const snapshot = await getDoc(userDoc);
        if (snapshot.exists()) {
          setUserProfile({ id: snapshot.id, ...snapshot.data() } as SystemUser);
        } else {
          const profile: Partial<SystemUser> = {
            name: user.displayName || '',
            email: user.email || '',
            role: MASTER_ADMINS.includes(user.email || '') ? 'Admin' : 'Operador',
            status: 'Ativo'
          };
          await setDoc(userDoc, profile, { merge: true });
          setUserProfile({ id: user.uid, ...profile } as SystemUser);
        }

        // Live updates
        const unsubProfile = onSnapshot(userDoc, (snap) => {
          if (snap.exists()) {
            setUserProfile({ id: snap.id, ...snap.data() } as SystemUser);
          }
        });

        // Set up real-time listeners for all collections
        const unsubscribers = [
          unsubProfile,
          onSnapshot(collection(db, 'equipment'), (snapshot) => {
            setEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'equipment')),
          onSnapshot(collection(db, 'clients'), (snapshot) => {
            setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients')),
          onSnapshot(collection(db, 'service_orders'), (snapshot) => {
            setServiceOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'service_orders')),
          onSnapshot(collection(db, 'parts'), (snapshot) => {
            setParts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Part)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'parts')),
          onSnapshot(collection(db, 'services'), (snapshot) => {
            setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'services')),
          onSnapshot(collection(db, 'transactions'), (snapshot) => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions')),
          onSnapshot(collection(db, 'suppliers'), (snapshot) => {
            setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'suppliers')),
          onSnapshot(collection(db, 'fixed_expenses'), (snapshot) => {
            setFixedExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedExpense)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'fixed_expenses')),
          onSnapshot(collection(db, 'mechanics'), (snapshot) => {
            setMechanics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mechanic)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'mechanics')),
          onSnapshot(collection(db, 'sellers'), (snapshot) => {
            setSellers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'sellers')),
          onSnapshot(collection(db, 'users'), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemUser)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'users')),
          onSnapshot(collection(db, 'pdv_orders'), (snapshot) => {
            setPDVOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PDVOrder)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'pdv_orders')),
          onSnapshot(collection(db, 'rentals'), (snapshot) => {
            setRentals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rental)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'rentals')),
          onSnapshot(collection(db, 'company'), (snapshot) => {
            if (!snapshot.empty) {
              setCompany({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CompanyData);
            }
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'company')),
          onSnapshot(collection(db, 'imported_invoices'), (snapshot) => {
            setImportedInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ImportedInvoice)));
          }, (error) => handleFirestoreError(error, OperationType.LIST, 'imported_invoices')),
        ];

        setIsAuthReady(true);
        setLoading(false);
        return () => unsubscribers.forEach(unsub => unsub());
      } else {
        setIsAuthReady(true);
        setLoading(false);
      }
    });
  }, []);

  const actions = {
    add: async (col: string, data: any) => {
      try {
        const sanitized = { ...data };
        Object.keys(sanitized).forEach(key => sanitized[key] === undefined && delete sanitized[key]);
        return await addDoc(collection(db, col), { ...sanitized, createdAt: serverTimestamp() });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, col);
      }
    },
    update: async (col: string, id: string, data: any) => {
      try {
        const sanitized = { ...data };
        delete sanitized.id;
        Object.keys(sanitized).forEach(key => sanitized[key] === undefined && delete sanitized[key]);
        await setDoc(doc(db, col, id), { 
          ...sanitized, 
          updatedAt: serverTimestamp() 
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `${col}/${id}`);
      }
    },
    remove: async (col: string, id: string) => {
      try {
        await deleteDoc(doc(db, col, id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `${col}/${id}`);
      }
    },
    set: async (col: string, id: string, data: any) => {
      try {
        const sanitized = { ...data };
        Object.keys(sanitized).forEach(key => sanitized[key] === undefined && delete sanitized[key]);
        await setDoc(doc(db, col, id), { 
          ...sanitized, 
          updatedAt: serverTimestamp() 
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${col}/${id}`);
      }
    },
    setTransactions: (data: Transaction[]) => setTransactions(data),
    setClients: (data: Client[]) => setClients(data),
    setServiceOrders: (data: ServiceOrder[]) => setServiceOrders(data),
    setEquipment: (data: Equipment[]) => setEquipment(data),
    setParts: (data: Part[]) => setParts(data),
    setSuppliers: (data: Supplier[]) => setSuppliers(data),
    setMechanics: (data: Mechanic[]) => setMechanics(data),
    setSellers: (data: Seller[]) => setSellers(data),
    setSystemUsers: (data: SystemUser[]) => setUsers(data),
    setCompanyData: (data: CompanyData) => {
      if (company?.id) {
        actions.update('company', company.id, data);
      } else {
        actions.add('company', data);
      }
    },
    setPdvOrders: (data: PDVOrder[]) => setPDVOrders(data),
    setFixedExpenses: (data: FixedExpense[]) => setFixedExpenses(data),
    setRentals: (data: Rental[]) => setRentals(data),
    setServices: (data: Service[]) => setServices(data)
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      const userDoc = doc(db, 'users', cred.user.uid);
      const profile: Partial<SystemUser> = {
        name: '',
        email: email,
        role: 'Operador',
        status: 'Inativo'
      };
      await setDoc(userDoc, profile);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isAdmin = MASTER_ADMINS.includes(user?.email || '') || userProfile?.role === 'Admin';
  const isAuthorized = isAdmin || userProfile?.status === 'Ativo';
  const needsProfileUpdate = !!user && (!userProfile?.name || !userProfile?.cpf || !userProfile?.phone);

  return (
    <FirebaseContext.Provider value={{ 
      user, 
      userProfile, 
      isAdmin, 
      isAuthorized,
      isAuthReady,
      needsProfileUpdate,
      loading, 
      data: {
        equipment,
        clients,
        serviceOrders,
        parts,
        services,
        transactions,
        suppliers,
        fixedExpenses,
        mechanics,
        sellers,
        users,
        pdvOrders,
        rentals,
        company,
        companyData: company,
        importedInvoices,
        systemUsers: users
      },
      actions,
      login: loginWithGoogle,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      logout
    }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within FirebaseProvider');
  return context;
}
