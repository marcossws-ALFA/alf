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
import { LogIn, QrCode, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

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
  const { user, loading, isAuthReady, login, loginWithEmail, registerWithEmail, logout, data, actions, isAuthorized, isAdmin, userProfile, needsProfileUpdate } = useFirebase();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'google'>('login');
  const [isAuthProcessing, setIsAuthProcessing] = useState(false);

  // Estados para o formulário de perfil
  const [profileForm, setProfileForm] = useState({
    name: '',
    cpf: '',
    phone: ''
  });

  useEffect(() => {
    if (user && userProfile) {
      setProfileForm({
        name: userProfile.name || user.displayName || '',
        cpf: userProfile.cpf || '',
        phone: userProfile.phone || ''
      });
    }
  }, [user, userProfile]);

  const maskCPF = (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  const maskPhone = (v: string) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    try {
      await actions.update('users', userProfile.id, {
        name: profileForm.name,
        cpf: profileForm.cpf,
        phone: profileForm.phone,
        status: userProfile.status === 'Ativo' ? 'Ativo' : 'Inativo' // Mantém o status atual
      });
      alert('Cadastro atualizado! Aguarde a liberação do acesso.');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuthProcessing) return;
    setIsAuthProcessing(true);
    try {
      if (authMode === 'login') {
        await loginWithEmail(loginEmail, loginPassword);
      } else {
        await registerWithEmail(loginEmail, loginPassword);
        alert('Conta criada com sucesso! Agora complete seu cadastro.');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      const msg = error.code === 'auth/user-not-found' ? 'Usuário não encontrado.' :
                  error.code === 'auth/wrong-password' ? 'Senha incorreta.' :
                  error.code === 'auth/email-already-in-use' ? 'Este e-mail já está em uso.' :
                  error.code === 'auth/weak-password' ? 'A senha deve ter pelo menos 6 caracteres.' :
                  'Erro ao realizar autenticação. Verifique seus dados.';
      alert(msg);
    } finally {
      setIsAuthProcessing(false);
    }
  };
  
  // Ensure we have some company data even if Firestore is empty
  const companyData = data.companyData || initialCompanyData;

  if (loading || !isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf8ff]">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center p-8">
          <div className="w-16 h-16 border-4 border-[#000666] border-t-transparent rounded-full animate-spin shadow-lg shadow-[#000666]/10"></div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#000666]">ALFAMAQ</h2>
            <p className="text-[#000666]/60 font-bold text-sm">Sincronizando dados com o servidor...</p>
          </div>
          
          <div className="pt-4 space-y-4">
            <p className="text-xs text-slate-400 font-medium">
              Se o carregamento demorar mais de 15 segundos, sua conexão pode estar lenta ou há um problema temporário no servidor.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white border border-[#c6c5d4]/20 rounded-xl text-[#000666] text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf8ff] p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl shadow-[#000666]/10 border border-[#c6c5d4]/20"
        >
          <div className="text-center mb-8">
            {companyData.logoUrl ? (
              <div className="relative w-24 h-24 mx-auto mb-4">
                <Image 
                  src={companyData.logoUrl} 
                  alt="Logo" 
                  fill 
                  className="object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="bg-[#000666] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#000666]/20">
                <QrCode className="text-white" size={32} />
              </div>
            )}
            <h1 className="text-2xl font-black text-[#000666]">{companyData.tradeName}</h1>
            <p className="text-slate-500 font-medium">Gestão de Serviços e Ativos</p>
          </div>

          <div className="space-y-4">
            {authMode === 'google' ? (
              <button
                onClick={login}
                className="w-full py-4 bg-[#000666] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <LogIn size={20} />
                Acessar com Google
              </button>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                  <input 
                    required
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-[#f5f2fb] border-2 border-transparent rounded-2xl text-sm font-bold text-[#1b1b21] focus:bg-white focus:border-[#000666]/10 outline-none transition-all"
                    placeholder="exemplo@email.com"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                  <input 
                    required
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-[#f5f2fb] border-2 border-transparent rounded-2xl text-sm font-bold text-[#1b1b21] focus:bg-white focus:border-[#000666]/10 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isAuthProcessing}
                  className="w-full py-4 bg-[#000666] text-white rounded-2xl font-black shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isAuthProcessing ? 'Processando...' : authMode === 'login' ? 'Entrar no Sistema' : 'Criar minha Conta'}
                </button>
              </form>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => setAuthMode(authMode === 'google' ? 'login' : 'google')}
                className="text-xs font-bold text-[#000666] hover:underline"
              >
                {authMode === 'google' ? 'Acessar com E-mail e Senha' : 'Voltar para Login Google'}
              </button>
              
              {authMode !== 'google' && (
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs font-bold text-slate-500 hover:text-[#000666]"
                >
                  {authMode === 'login' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça Login'}
                </button>
              )}
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#c6c5d4]/30"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold tracking-widest">Acesso Restrito</span>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 font-medium">
              Utilize suas credenciais autorizadas para acessar o painel administrativo.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (needsProfileUpdate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf8ff] p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-2xl shadow-[#000666]/10 border border-[#c6c5d4]/20 space-y-8"
        >
          <div className="text-center space-y-2">
            {companyData.logoUrl ? (
              <div className="relative w-20 h-20 mx-auto mb-2">
                <Image 
                  src={companyData.logoUrl} 
                  alt="Logo" 
                  fill 
                  className="object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-[#000666]/5 text-[#000666] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <LogIn size={32} />
              </div>
            )}
            <h2 className="text-2xl font-black text-[#000666]">Complete seu Cadastro</h2>
            <p className="text-slate-500 font-medium text-sm">
              Para sua segurança, precisamos de alguns dados adicionais no seu primeiro acesso.
            </p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
              <input 
                required
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-5 py-4 bg-[#f5f2fb] border-2 border-transparent rounded-2xl text-sm font-bold text-[#1b1b21] focus:bg-white focus:border-[#000666]/10 outline-none transition-all"
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">CPF</label>
              <input 
                required
                type="text"
                value={profileForm.cpf}
                onChange={(e) => setProfileForm({ ...profileForm, cpf: maskCPF(e.target.value) })}
                className="w-full px-5 py-4 bg-[#f5f2fb] border-2 border-transparent rounded-2xl text-sm font-bold text-[#1b1b21] focus:bg-white focus:border-[#000666]/10 outline-none transition-all"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Celular / WhatsApp</label>
              <input 
                required
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: maskPhone(e.target.value) })}
                className="w-full px-5 py-4 bg-[#f5f2fb] border-2 border-transparent rounded-2xl text-sm font-bold text-[#1b1b21] focus:bg-white focus:border-[#000666]/10 outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-[#000666] text-white rounded-2xl font-black shadow-xl shadow-[#000666]/20 hover:scale-[1.02] active:scale-95 transition-all mt-4"
            >
              Finalizar Cadastro
            </button>

            <button
              onClick={logout}
              type="button"
              className="w-full py-3 text-slate-400 text-xs font-bold hover:text-red-500 transition-colors"
            >
              Cancelar e Sair
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf8ff] p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-10 rounded-[40px] shadow-2xl shadow-[#000666]/10 border border-[#c6c5d4]/20 text-center space-y-6"
        >
          {companyData.logoUrl ? (
            <div className="relative w-24 h-24 mx-auto mb-2">
              <Image 
                src={companyData.logoUrl} 
                alt="Logo" 
                fill 
                className="object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <QrCode size={40} />
            </div>
          )}
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#000666]">Acesso em Análise</h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              Olá, <span className="text-[#000666] font-bold">{user.displayName || user.email}</span>.<br />
              Seu acesso ainda não foi liberado pelo administrador. 
              Por favor, aguarde a ativação do seu perfil.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-1 items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-mail Registrado</span>
            <span className="text-sm font-black text-[#000666]">{user.email}</span>
          </div>

          <button
            onClick={logout}
            className="w-full py-4 bg-white border-2 border-[#000666]/10 text-[#000666] rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
          >
            Sair desta conta
          </button>
        </motion.div>
      </div>
    );
  }

  const renderView = () => {
    // Access control: Operators cannot access Finance or Settings
    const isOperator = userProfile?.role === 'Operador';
    const restrictedViews: View[] = ['finance', 'receivables', 'payables', 'settings'];
    
    if (isOperator && restrictedViews.includes(currentView)) {
      return <Dashboard orders={data.serviceOrders} transactions={data.transactions} pdvOrders={data.pdvOrders} />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard orders={data.serviceOrders} transactions={data.transactions} pdvOrders={data.pdvOrders} />;
      case 'pdv':
        return (
          <PDV 
            parts={data.parts} 
            services={data.services} 
            clients={data.clients} 
            setClients={actions.setClients}
            setParts={actions.setParts}
            setTransactions={actions.setTransactions}
            pdvOrders={data.pdvOrders}
            setPdvOrders={actions.setPdvOrders}
            sellers={data.sellers}
          />
        );
      case 'service-orders':
        return (
          <ServiceOrders 
            orders={data.serviceOrders} 
            setOrders={actions.setServiceOrders}
            clients={data.clients}
            setClients={actions.setClients}
            equipment={data.equipment}
            setEquipment={actions.setEquipment}
            partsList={data.parts}
            servicesList={data.services}
            transactions={data.transactions}
            setTransactions={actions.setTransactions}
            mechanics={data.mechanics}
            sellers={data.sellers}
          />
        );
      case 'clients':
        return (
          <Clients 
            clients={data.clients} 
            setClients={actions.setClients} 
            equipmentList={data.equipment} 
            orders={data.serviceOrders}
            onOpenOS={(id) => {
              // Implementation if needed
            }}
          />
        );
      case 'equipment':
        return (
          <Equipment 
            equipmentList={data.equipment} 
            setEquipmentList={actions.setEquipment} 
            clients={data.clients} 
            orders={data.serviceOrders}
          />
        );
      case 'parts':
        return (
          <Parts 
            parts={data.parts} 
            setParts={actions.setParts} 
            transactions={data.transactions}
            setTransactions={actions.setTransactions}
            suppliers={data.suppliers} 
            setSuppliers={actions.setSuppliers}
          />
        );
      case 'services':
        return <Services services={data.services} setServices={actions.setServices} />;
      case 'finance':
        return (
          <Finance 
            transactions={data.transactions} 
            setTransactions={actions.setTransactions}
            suppliers={data.suppliers}
            clients={data.clients}
            onViewChange={(view) => setCurrentView(view)}
          />
        );
      case 'receivables':
        return (
          <Receivables 
            transactions={data.transactions} 
            setTransactions={actions.setTransactions} 
            clients={data.clients}
            setClients={actions.setClients}
            onBack={() => setCurrentView('finance')}
            onOpenOS={(id) => setCurrentView('service-orders')}
            onOpenRental={(id) => setCurrentView('rentals')}
            onOpenSale={(id) => setCurrentView('pdv')}
          />
        );
      case 'payables':
        return (
          <Payables 
            transactions={data.transactions} 
            setTransactions={actions.setTransactions} 
            suppliers={data.suppliers}
            setSuppliers={actions.setSuppliers}
            fixedExpenses={data.fixedExpenses}
            setFixedExpenses={actions.setFixedExpenses}
            orders={data.serviceOrders}
            mechanics={data.mechanics}
            sellers={data.sellers}
            onBack={() => setCurrentView('finance')}
          />
        );
      case 'suppliers':
        return <Suppliers suppliers={data.suppliers} setSuppliers={actions.setSuppliers} transactions={data.transactions} />;
      case 'rentals':
        return (
          <Rentals 
            rentals={data.rentals} 
            setRentals={actions.setRentals}
            equipment={data.equipment} 
            setEquipment={actions.setEquipment}
            clients={data.clients}
            setClients={actions.setClients}
            setTransactions={actions.setTransactions}
          />
        );
      case 'settings':
        return (
          <Settings 
            companyData={companyData} 
            setCompanyData={(data) => actions.setCompanyData(data as CompanyData)}
            mechanics={data.mechanics} 
            setMechanics={actions.setMechanics}
            sellers={data.sellers} 
            setSellers={actions.setSellers}
            systemUsers={data.systemUsers}
            setSystemUsers={actions.setSystemUsers}
          />
        );
      default:
        return <Dashboard orders={data.serviceOrders} transactions={data.transactions} pdvOrders={data.pdvOrders} />;
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      onViewChange={setCurrentView}
      onNewOS={() => setCurrentView('service-orders')}
      onNewRental={() => setCurrentView('rentals')}
      onNewSale={() => setCurrentView('pdv')}
      companyData={companyData}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
