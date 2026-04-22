"use client";

import React, { useState, useEffect } from 'react';
import Layout from '@/src/components/Layout';
import Dashboard from '@/src/components/Dashboard';
import ServiceOrders from '@/src/components/ServiceOrders';
import Clients from '@/src/components/Clients';
import Equipment from '@/src/components/Equipment';
import Parts from '@/src/components/Parts';
import Services from '@/src/components/Services';
import Finance from '@/src/components/Finance';
import Receivables from '@/src/components/Receivables';
import Payables from '@/src/components/Payables';
import Suppliers from '@/src/components/Suppliers';
import Settings from '@/src/components/Settings';
import Rentals from '@/src/components/Rentals';
import PDV from '@/src/components/PDV';
import { View, Equipment as EquipmentType, Client, ServiceOrder, Part, Service, Transaction, Supplier, FixedExpense, Mechanic, Seller, SystemUser, PDVOrder, Rental, CompanyData } from '@/src/types';
import { useFirebase } from '@/src/context/FirebaseContext';
import { dbUtils } from '@/src/lib/db';
import { LogIn, QrCode } from 'lucide-react';

const initialCompanyData: CompanyData = {
  companyName: 'ALFAMAQ MANUTENÇÃO',
  tradeName: 'Alfamaq',
  document: '00.000.000/0001-00',
  email: 'contato@alfamaq.com.br',
  phone: '(11) 99999-9999',
  zipCode: '00000-000',
  street: 'Rua das Oficinas',
  number: '123',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP'
};

export default function Home() {
  const { user, loading, login, loginWithEmail, registerWithEmail, data } = useFirebase();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isNewOSModalOpen, setIsNewOSModalOpen] = useState(false);
  const [isNewRentalModalOpen, setIsNewRentalModalOpen] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isOSOverlayOpen, setIsOSOverlayOpen] = useState(false);
  const [isRentalOverlayOpen, setIsRentalOverlayOpen] = useState(false);
  const [isSaleOverlayOpen, setIsSaleOverlayOpen] = useState(false);

  // Map Firebase data to state-like variables for compatibility with existing components
  const clientsList = data.clients;
  const equipmentList = data.equipment;
  const ordersList = data.serviceOrders;
  const partsList = data.parts;
  const servicesList = data.services;
  const suppliersList = data.suppliers;
  const mechanicsList = data.mechanics;
  const sellersList = data.sellers;
  const systemUsersList = data.systemUsers;
  const companyData = data.companyData || initialCompanyData;
  const pdvOrdersList = data.pdvOrders;
  const rentalsList = data.rentals;
  const fixedExpenses = data.fixedExpenses;
  const transactionsList = data.transactions;

  // Wrapper functions for database operations
  const setClientsList = async (clients: Client[] | ((prev: Client[]) => Client[])) => {
    // This is a simplified version. In a real app, you'd handle individual updates.
    // For now, we'll assume the components call these with the new list.
  };

  const setOrdersList = async (orders: ServiceOrder[]) => {};
  const setEquipmentList = async (equipment: EquipmentType[]) => {};
  const setPartsList = async (parts: Part[]) => {};
  const setServicesList = async (services: Service[]) => {};
  const setSuppliersList = async (suppliers: Supplier[]) => {};
  const setMechanicsList = async (mechanics: Mechanic[]) => {};
  const setSellersList = async (sellers: Seller[]) => {};
  const setSystemUsersList = async (users: SystemUser[]) => {};
  const setCompanyData = async (data: CompanyData) => {
    await dbUtils.set('company', 'settings', data);
  };
  const setPdvOrdersList = async (orders: PDVOrder[]) => {};
  const setRentalsList = async (rentals: Rental[]) => {};
  const setFixedExpenses = async (expenses: FixedExpense[]) => {};
  const setTransactionsList = async (transactions: Transaction[]) => {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf8ff]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#000666]"></div>
      </div>
    );
  }

  if (!user) {
    const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthError(null);
      try {
        if (isRegistering) {
          await registerWithEmail(email, password);
        } else {
          await loginWithEmail(email, password);
        }
      } catch (error: any) {
        setAuthError(error.message || 'Erro na autenticação');
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf8ff] p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-[#000666]/10 p-10 flex flex-col items-center border border-[#c6c5d4]/10">
          <div className="p-6 bg-[#000666] text-white rounded-[2rem] mb-6 shadow-xl shadow-[#000666]/20">
            <QrCode size={48} />
          </div>
          <h1 className="text-2xl font-black text-[#000666] mb-2 tracking-tight">Portal Alfamaq</h1>
          <p className="text-slate-500 font-medium mb-8 text-center leading-relaxed">
            {isRegistering ? 'Crie sua conta para começar.' : 'Bem-vindo de volta! Faça login para continuar.'}
          </p>

          <form onSubmit={handleEmailAuth} className="w-full space-y-4 mb-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <p className="text-xs font-bold text-red-500 text-center">{authError}</p>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-[#000666] text-white font-black rounded-2xl shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              {isRegistering ? 'Cadastrar' : 'Entrar'}
            </button>
          </form>

          <div className="w-full flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ou</span>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>

          <button 
            onClick={login}
            className="w-full py-4 bg-white border border-slate-100 text-[#000666] font-black rounded-2xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <LogIn size={20} />
            Entrar com Google
          </button>

          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="mt-6 text-xs font-bold text-slate-400 hover:text-[#000666] transition-colors"
          >
            {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
          </button>

          <p className="mt-8 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
            © 2026 Alfamaq Manutenção
          </p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard orders={ordersList} transactions={transactionsList} pdvOrders={pdvOrdersList} />;
      case 'pdv':
        return (
          <PDV 
            parts={partsList} 
            services={servicesList} 
            clients={clientsList}
            setClients={setClientsList}
            setParts={setPartsList}
            setTransactions={setTransactionsList}
            pdvOrders={pdvOrdersList}
            setPdvOrders={setPdvOrdersList}
            sellers={sellersList}
            initialOrderId={selectedSaleId}
            onModalClose={() => setSelectedSaleId(null)}
          />
        );
      case 'service-orders':
        return (
          <ServiceOrders 
            orders={ordersList} 
            setOrders={setOrdersList} 
            clients={clientsList} 
            setClients={setClientsList}
            equipment={equipmentList} 
            setEquipment={setEquipmentList}
            partsList={partsList}
            servicesList={servicesList}
            transactions={transactionsList}
            setTransactions={setTransactionsList}
            mechanics={mechanicsList}
            sellers={sellersList}
            triggerNewModal={isNewOSModalOpen}
            initialOrderId={selectedOrderId}
            onClose={() => {
              setIsNewOSModalOpen(false);
              setSelectedOrderId(null);
            }}
          />
        );
      case 'clients':
        return (
          <Clients 
            equipmentList={equipmentList} 
            clients={clientsList} 
            setClients={setClientsList} 
            orders={ordersList} 
            onOpenOS={(osId) => {
              setSelectedOrderId(osId);
              setIsOSOverlayOpen(true);
            }}
          />
        );
      case 'suppliers':
        return (
          <Suppliers 
            suppliers={suppliersList} 
            setSuppliers={setSuppliersList} 
            transactions={transactionsList}
          />
        );
      case 'equipment':
        return (
          <Equipment 
            equipmentList={equipmentList} 
            setEquipmentList={setEquipmentList} 
            clients={clientsList} 
            orders={ordersList} 
            onOpenOS={(osId) => {
              setSelectedOrderId(osId);
              setIsOSOverlayOpen(true);
            }}
          />
        );
      case 'rentals':
        return (
          <Rentals 
            clients={clientsList} 
            setClients={setClientsList} 
            equipment={equipmentList.filter(e => e.isForRental)} 
            setEquipment={setEquipmentList}
            rentals={rentalsList}
            setRentals={setRentalsList}
            setTransactions={setTransactionsList}
            initialRentalId={selectedRentalId}
            triggerNewModal={isNewRentalModalOpen}
            onModalClose={() => {
              setSelectedRentalId(null);
              setIsNewRentalModalOpen(false);
            }}
          />
        );
      case 'parts':
        return (
          <Parts 
            parts={partsList} 
            setParts={setPartsList} 
            transactions={transactionsList}
            setTransactions={setTransactionsList}
            suppliers={suppliersList}
            setSuppliers={setSuppliersList}
          />
        );
      case 'services':
        return <Services services={servicesList} setServices={setServicesList} />;
      case 'finance':
        return (
          <Finance 
            transactions={transactionsList} 
            setTransactions={setTransactionsList} 
            suppliers={suppliersList}
            clients={clientsList}
            onViewChange={setCurrentView} 
          />
        );
      case 'receivables':
        return (
          <Receivables 
            transactions={transactionsList} 
            setTransactions={setTransactionsList} 
            clients={clientsList}
            setClients={setClientsList}
            onBack={() => setCurrentView('finance')} 
            onOpenOS={(osId) => {
              setSelectedOrderId(osId);
              setIsOSOverlayOpen(true);
            }}
            onOpenRental={(rentalId) => {
              setSelectedRentalId(rentalId);
              setIsRentalOverlayOpen(true);
            }}
            onOpenSale={(saleId) => {
              setSelectedSaleId(saleId);
              setIsSaleOverlayOpen(true);
            }}
          />
        );
      case 'payables':
        return (
          <Payables 
            transactions={transactionsList} 
            setTransactions={setTransactionsList} 
            suppliers={suppliersList}
            setSuppliers={setSuppliersList}
            fixedExpenses={fixedExpenses}
            setFixedExpenses={setFixedExpenses}
            orders={ordersList}
            mechanics={mechanicsList}
            sellers={sellersList}
            onBack={() => setCurrentView('finance')} 
            onOpenOS={(osId) => {
              setSelectedOrderId(osId);
              setIsOSOverlayOpen(true);
            }}
          />
        );
      case 'settings':
        return (
          <Settings 
            mechanics={mechanicsList}
            setMechanics={setMechanicsList}
            sellers={sellersList}
            setSellers={setSellersList}
            systemUsers={systemUsersList}
            setSystemUsers={setSystemUsersList}
            companyData={companyData}
            setCompanyData={setCompanyData}
          />
        );
      case 'support':
        return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
            <h2 className="text-2xl font-bold mb-2">Suporte</h2>
            <p>Precisa de ajuda? Entre em contato com nossa equipe técnica.</p>
          </div>
        );
      default:
        return <Dashboard orders={ordersList} transactions={transactionsList} pdvOrders={pdvOrdersList} />;
    }
  };

  const handleNewOS = () => {
    setCurrentView('service-orders');
    setIsNewOSModalOpen(true);
  };

  const handleNewRental = () => {
    setCurrentView('rentals');
    setIsNewRentalModalOpen(true);
  };

  const handleNewSale = () => {
    setCurrentView('pdv');
  };

  return (
    <Layout currentView={currentView} onViewChange={setCurrentView} onNewOS={handleNewOS} onNewRental={handleNewRental} onNewSale={handleNewSale} companyData={companyData}>
      {renderView()}
      
      {isOSOverlayOpen && (
        <ServiceOrders 
          orders={ordersList} 
          setOrders={setOrdersList} 
          clients={clientsList} 
          setClients={setClientsList}
          equipment={equipmentList} 
          setEquipment={setEquipmentList}
          partsList={partsList}
          servicesList={servicesList}
          transactions={transactionsList}
          setTransactions={setTransactionsList}
          mechanics={mechanicsList}
          sellers={sellersList}
          initialOrderId={selectedOrderId}
          hideList={true}
          onClose={() => {
            setIsOSOverlayOpen(false);
            setSelectedOrderId(null);
          }}
        />
      )}

      {isRentalOverlayOpen && (
        <Rentals 
          clients={clientsList} 
          setClients={setClientsList} 
          equipment={equipmentList.filter(e => e.isForRental)} 
          setEquipment={setEquipmentList}
          rentals={rentalsList}
          setRentals={setRentalsList}
          setTransactions={setTransactionsList}
          initialRentalId={selectedRentalId}
          hideList={true}
          onModalClose={() => {
            setIsRentalOverlayOpen(false);
            setSelectedRentalId(null);
          }}
        />
      )}

      {isSaleOverlayOpen && (
        <PDV 
          parts={partsList} 
          services={servicesList} 
          clients={clientsList}
          setClients={setClientsList}
          setParts={setPartsList}
          setTransactions={setTransactionsList}
          pdvOrders={pdvOrdersList}
          setPdvOrders={setPdvOrdersList}
          sellers={sellersList}
          initialOrderId={selectedSaleId}
          onModalClose={() => {
            setIsSaleOverlayOpen(false);
            setSelectedSaleId(null);
          }}
        />
      )}
    </Layout>
  );
}
