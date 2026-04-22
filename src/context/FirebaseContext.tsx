'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  getDocFromServer,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  Client, 
  Equipment, 
  ServiceOrder, 
  Part, 
  Service, 
  Supplier, 
  Transaction, 
  FixedExpense, 
  Mechanic, 
  Seller, 
  SystemUser, 
  PDVOrder, 
  Rental, 
  CompanyData 
} from '../types';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  isAuthReady: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  data: {
    clients: Client[];
    equipment: Equipment[];
    serviceOrders: ServiceOrder[];
    parts: Part[];
    services: Service[];
    suppliers: Supplier[];
    transactions: Transaction[];
    fixedExpenses: FixedExpense[];
    mechanics: Mechanic[];
    sellers: Seller[];
    systemUsers: SystemUser[];
    pdvOrders: PDVOrder[];
    rentals: Rental[];
    companyData: CompanyData | null;
  };
  actions: {
    add: (col: string, data: any) => Promise<any>;
    update: (col: string, id: string, data: any) => Promise<void>;
    remove: (col: string, id: string) => Promise<void>;
    set: (col: string, id: string, data: any) => Promise<void>;
  };
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [pdvOrders, setPdvOrders] = useState<PDVOrder[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthReady(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Test connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribes = [
      onSnapshot(collection(db, 'clients'), (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
      }),
      onSnapshot(collection(db, 'equipment'), (snapshot) => {
        setEquipment(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
      }),
      onSnapshot(collection(db, 'service_orders'), (snapshot) => {
        setServiceOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceOrder)));
      }),
      onSnapshot(collection(db, 'parts'), (snapshot) => {
        setParts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Part)));
      }),
      onSnapshot(collection(db, 'services'), (snapshot) => {
        setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
      }),
      onSnapshot(collection(db, 'suppliers'), (snapshot) => {
        setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
      }),
      onSnapshot(collection(db, 'transactions'), (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      }),
      onSnapshot(collection(db, 'fixed_expenses'), (snapshot) => {
        setFixedExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FixedExpense)));
      }),
      onSnapshot(collection(db, 'mechanics'), (snapshot) => {
        setMechanics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mechanic)));
      }),
      onSnapshot(collection(db, 'sellers'), (snapshot) => {
        setSellers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller)));
      }),
      onSnapshot(collection(db, 'users'), (snapshot) => {
        setSystemUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemUser)));
      }),
      onSnapshot(collection(db, 'pdv_orders'), (snapshot) => {
        setPdvOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PDVOrder)));
      }),
      onSnapshot(collection(db, 'rentals'), (snapshot) => {
        setRentals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Rental)));
      }),
      onSnapshot(doc(db, 'company', 'settings'), (doc) => {
        if (doc.exists()) {
          setCompanyData({ id: doc.id, ...doc.data() } as CompanyData);
        }
      })
    ];

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const sanitizeData = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeData);
    
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, sanitizeData(v)])
    );
  };

  const actions = {
    add: async (col: string, data: any) => {
      const { id, ...rest } = data;
      const sanitized = sanitizeData(rest);
      return addDoc(collection(db, col), {
        ...sanitized,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: serverTimestamp()
      });
    },
    update: async (col: string, id: string, data: any) => {
      const { id: _, ...rest } = data;
      const sanitized = sanitizeData(rest);
      return updateDoc(doc(db, col, id), {
        ...sanitized,
        updatedAt: serverTimestamp()
      });
    },
    remove: async (col: string, id: string) => {
      return deleteDoc(doc(db, col, id));
    },
    set: async (col: string, id: string, data: any) => {
      const { id: _, ...rest } = data;
      const sanitized = sanitizeData(rest);
      return setDoc(doc(db, col, id), {
        ...sanitized,
        updatedAt: serverTimestamp()
      });
    }
  };

  return (
    <FirebaseContext.Provider value={{ 
      user, 
      loading, 
      isAuthReady, 
      login, 
      loginWithEmail,
      registerWithEmail,
      logout,
      data: {
        clients,
        equipment,
        serviceOrders,
        parts,
        services,
        suppliers,
        transactions,
        fixedExpenses,
        mechanics,
        sellers,
        systemUsers,
        pdvOrders,
        rentals,
        companyData
      },
      actions
    }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
