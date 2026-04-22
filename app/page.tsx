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
import { cn } from '@/src/lib/utils';
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
  const { user, loading, login, isLoggingIn, loginWithEmail, registerWithEmail, data, actions } = useFirebase();
  const [isEmailLoading, setIsEmailLoading] = useState(false);
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
  const clientsList = data.clients || [];
  const equipmentList = data.equipment || [];
  const ordersList = data.serviceOrders || [];
  const partsList = data.parts || [];
  const servicesList = data.services || [];
  const suppliersList = data.suppliers || [];
  const mechanicsList = data.mechanics || [];
  const sellersList = data.sellers || [];
  const systemUsersList = data.systemUsers || [];
  const companyData = data.companyData || initialCompanyData;
  const pdvOrdersList = data.pdvOrders || [];
  const rentalsList = data.rentals || [];
  const fixedExpenses = data.fixedExpenses || [];
  const transactionsList = data.transactions || [];

  // Wrapper functions for database operations to maintain compatibility with prop setters
  const setClientsList = (clients: any) => {}; // No-op as onSnapshot handles updates
  const setOrdersList = (orders: any) => {};
  const setEquipmentList = (equipment: any) => {};
  const setPartsList = (parts: any) => {};
  const setServicesList = (services: any) => {};
  const setSuppliersList = (suppliers: any) => {};
  const setMechanicsList = (mechanics: any) => {};
  const setSellersList = (sellers: any) => {};
  const setSystemUsersList = (users: any) => {};
  const setCompanyData = async (newData: CompanyData) => {
    await actions.set('company', 'settings', newData);
  };
  const setPdvOrdersList = (orders: any) => {};
  const setRentalsList = (rentals: any) => {};
  const setFixedExpenses = (expenses: any) => {};
  const setTransactionsList = (transactions: any) => {};

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
      setIsEmailLoading(true);
      try {
        if (isRegistering) {
          await registerWithEmail(email, password);
        } else {
          await loginWithEmail(email, password);
        }
      } catch (error: any) {
        setAuthError(error.message || 'Erro na autenticação');
      } finally {
        setIsEmailLoading(false);
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
              disabled={isEmailLoading || isLoggingIn}
              className={cn(
                "w-full py-4 bg-[#000666] text-white font-black rounded-2xl shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-95 transition-all text-center flex items-center justify-center",
                (isEmailLoading || isLoggingIn) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isEmailLoading ? 'Processando...' : (isRegistering ? 'Cadastrar' : 'Entrar')}
            </button>
          </form>

          <div className="w-full flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ou</span>
            <div className="h-px flex-1 bg-slate-100"></div>
          </div>

          <button 
            onClick={login}
            disabled={isLoggingIn}
            className={cn(
              "w-full py-4 bg-white border border-slate-100 text-[#000666] font-black rounded-2xl shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-3",
              isLoggingIn && "opacity-50 cursor-not-allowed"
            )}
          >
            <LogIn size={20} />
            {isLoggingIn ? 'Iniciando...' : 'Entrar com Google'}
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
            setClients={setClientsList as any}
            setParts={setPartsList as any}
            setTransactions={setTransactionsList as any}
            pdvOrders={pdvOrdersList}
            setPdvOrders={setPdvOrdersList as any}
            sellers={sellersList}
            initialOrderId={selectedSaleId}
            onModalClose={() => setSelectedSaleId(null)}
          />
        );
      case 'service-orders':
        return (
          <ServiceOrders 
            orders={ordersList} 
            setOrders={setOrdersList as any} 
            clients={clientsList} 
            setClients={setClientsList as any}
            equipment={equipmentList} 
            setEquipment={setEquipmentList as any}
            partsList={partsList}
            servicesList={servicesList}
            transactions={transactionsList}
            setTransactions={setTransactionsList as any}
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
            setClients={setClientsList as any} 
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
            setSuppliers={setSuppliersList as any} 
            transactions={transactionsList}
          />
        );
      case 'equipment':
        return (
          <Equipment 
            equipmentList={equipmentList} 
            setEquipmentList={setEquipmentList as any} 
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
            setClients={setClientsList as any} 
            equipment={equipmentList.filter(e => e.isForRental)} 
            setEquipment={setEquipmentList as any}
            rentals={rentalsList}
            setRentals={setRentalsList as any}
            setTransactions={setTransactionsList as any}
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
            setParts={setPartsList as any} 
            transactions={transactionsList}
            setTransactions={setTransactionsList as any}
            suppliers={suppliersList}
            setSuppliers={setSuppliersList as any}
          />
        );
      case 'services':
        return <Services services={servicesList} setServices={setServicesList as any} />;
      case 'finance':
        return (
          <Finance 
            transactions={transactionsList} 
            setTransactions={setTransactionsList as any} 
            suppliers={suppliersList}
            clients={clientsList}
            onViewChange={setCurrentView} 
          />
        );
      case 'receivables':
        return (
          <Receivables 
            transactions={transactionsList} 
            setTransactions={setTransactionsList as any} 
            clients={clientsList}
            setClients={setClientsList as any}
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
            setTransactions={setTransactionsList as any} 
            suppliers={suppliersList}
            setSuppliers={setSuppliersList as any}
            fixedExpenses={fixedExpenses}
            setFixedExpenses={setFixedExpenses as any}
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
            setMechanics={setMechanicsList as any}
            sellers={sellersList}
            setSellers={setSellersList as any}
            systemUsers={systemUsersList}
            setSystemUsers={setSystemUsersList as any}
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
          setOrders={setOrdersList as any} 
          clients={clientsList} 
          setClients={setClientsList as any}
          equipment={equipmentList} 
          setEquipment={setEquipmentList as any}
          partsList={partsList}
          servicesList={servicesList}
          transactions={transactionsList}
          setTransactions={setTransactionsList as any}
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
          setClients={setClientsList as any} 
          equipment={equipmentList.filter(e => e.isForRental)} 
          setEquipment={setEquipmentList as any}
          rentals={rentalsList}
          setRentals={setRentalsList as any}
          setTransactions={setTransactionsList as any}
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
          setClients={setClientsList as any}
          setParts={setPartsList as any}
          setTransactions={setTransactionsList as any}
          pdvOrders={pdvOrdersList}
          setPdvOrders={setPdvOrdersList as any}
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
