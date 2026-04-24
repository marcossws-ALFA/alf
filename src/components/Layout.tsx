'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  ClipboardList, 
  Users, 
  Truck, 
  Package, 
  Wrench, 
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,
  Box,
  TrendingDown,
  TrendingUp,
  Building2,
  CalendarDays,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useFirebase } from '../context/FirebaseContext';
import { View, CompanyData } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
  onNewOS: () => void;
  onNewRental: () => void;
  onNewSale: () => void;
  companyData: CompanyData;
}

export default function Layout({ 
  children, 
  currentView, 
  onViewChange, 
  onNewOS, 
  onNewRental, 
  onNewSale,
  companyData
}: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user, logout, isAdmin, userProfile } = useFirebase();

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const handleConfirmLogout = async (sync: boolean) => {
    if (sync) {
      setIsSyncing(true);
      // Simula uma sincronização final antes de sair
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    logout();
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pdv', label: 'PDV / Vendas', icon: ShoppingCart },
    { id: 'service-orders', label: 'Ordens de Serviço', icon: ClipboardList },
    { id: 'rentals', label: 'Locação', icon: CalendarDays },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'suppliers', label: 'Fornecedores', icon: Truck },
    { id: 'equipment', label: 'Equipamentos', icon: Box },
    { id: 'parts', label: 'Peças / Estoque', icon: Package },
    { id: 'services', label: 'Serviços', icon: Wrench },
    { id: 'finance', label: 'Financeiro', icon: TrendingUp, adminOnly: true },
    { id: 'settings', label: 'Configurações', icon: SettingsIcon, adminOnly: true },
  ];

  const mainMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin || userProfile?.role === 'Gerente');

  const viewLabels: Record<View, string> = {
    'dashboard': 'Dashboard',
    'pdv': 'PDV / Vendas',
    'service-orders': 'Ordens de Serviço',
    'clients': 'Clientes',
    'equipment': 'Equipamentos',
    'parts': 'Peças / Estoque',
    'services': 'Serviços',
    'finance': 'Financeiro',
    'receivables': 'Contas a Receber',
    'payables': 'Contas a Pagar',
    'suppliers': 'Fornecedores',
    'settings': 'Configurações',
    'rentals': 'Locação',
    'support': 'Suporte'
  };

  const handleViewChange = (view: View) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#fbf8ff] overflow-hidden">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#000666]/40 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[280px] bg-white z-[110] lg:hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {companyData.logoUrl ? (
                    <div className="relative w-8 h-8">
                      <Image src={companyData.logoUrl} alt="Logo" fill className="object-contain" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="bg-[#000666] p-2 rounded-lg">
                      <Building2 className="text-white" size={20} />
                    </div>
                  )}
                  <span className="font-black text-[#000666] text-sm truncate max-w-[150px]">{companyData.tradeName}</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-[#000666]">
                  <X size={24} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
                {mainMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleViewChange(item.id as View)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm",
                      currentView === item.id 
                        ? "bg-[#000666] text-white shadow-xl shadow-[#000666]/20" 
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <item.icon size={20} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="p-6 border-t border-slate-100 space-y-2">
                <button onClick={() => handleViewChange('support')} className="w-full flex items-center gap-4 px-4 py-3 text-slate-500 font-bold text-sm">
                  <HelpCircle size={20} /> Suporte
                </button>
                <button onClick={handleLogoutClick} className="w-full flex items-center gap-4 px-4 py-3 text-red-500 font-bold text-sm">
                  <LogOut size={20} /> Sair
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-[#c6c5d4]/20 hidden lg:flex flex-col transition-all duration-300 shadow-xl shadow-[#000666]/5 z-20",
          isSidebarCollapsed ? "w-20" : "w-72"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          {companyData.logoUrl ? (
            <div className="relative w-10 h-10 shrink-0">
              <Image 
                src={companyData.logoUrl} 
                alt="Logo" 
                fill 
                className="object-contain" 
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="bg-[#000666] p-2.5 rounded-xl shadow-lg shadow-[#000666]/20">
              <Building2 className="text-white" size={24} />
            </div>
          )}
          {!isSidebarCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-black text-[#000666] text-lg tracking-tight truncate leading-tight">
                {companyData.tradeName}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                Gestão Inteligente
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          {mainMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id as View)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                currentView === item.id 
                  ? "bg-[#000666] text-white shadow-lg shadow-[#000666]/10" 
                  : "text-slate-500 hover:bg-[#f5f2fb] hover:text-[#000666]"
              )}
            >
              <item.icon size={20} className={currentView === item.id ? "text-white" : ""} />
              {!isSidebarCollapsed && (
                <span className={cn("text-sm font-bold truncate", currentView === item.id ? "font-black" : "font-semibold")}>
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#c6c5d4]/10 space-y-1">
          <button
            onClick={() => handleViewChange('support')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-slate-500 hover:bg-[#f5f2fb] hover:text-[#000666]",
              currentView === 'support' && "bg-[#000666] text-white"
            )}
          >
            <HelpCircle size={20} />
            {!isSidebarCollapsed && <span className="text-sm font-bold">Suporte</span>}
          </button>
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-slate-500 hover:bg-red-50 hover:text-red-500"
          >
            <LogOut size={20} />
            {!isSidebarCollapsed && <span className="text-sm font-bold">Sair</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="p-3 m-4 bg-[#f5f2fb] text-[#000666] rounded-xl flex items-center justify-center hover:bg-[#c6c5d4]/20 transition-all"
        >
          {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 lg:h-20 bg-white border-b border-[#c6c5d4]/10 flex items-center justify-between px-4 lg:px-8 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 lg:hidden text-[#000666] hover:bg-slate-50 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <h2 className="text-base lg:text-xl font-black text-[#1b1b21] tracking-tight capitalize leading-tight">
                {viewLabels[currentView] || currentView}
              </h2>
              <div className="hidden sm:flex items-center gap-2 text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-widest">Portal</span>
                <span className="text-[8px] opacity-30">•</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">{viewLabels[currentView] || currentView}</span>
              </div>
            </div>
          </div>

          {/* Header Actions - Hidden on small mobile, shown on tablet/desktop */}
          <div className="hidden sm:flex items-center gap-3">
            <button 
              onClick={onNewOS}
              className="px-3 lg:px-4 py-2 lg:py-2.5 bg-[#000666] text-white rounded-xl font-bold text-xs lg:text-sm shadow-lg shadow-[#000666]/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              <span className="hidden md:inline">Nova OS</span>
              <span className="md:hidden">OS</span>
            </button>
            <button 
              onClick={onNewSale}
              className="px-3 lg:px-4 py-2 lg:py-2.5 bg-white border border-[#000666]/10 text-[#000666] rounded-xl font-bold text-xs lg:text-sm hover:bg-[#f5f2fb] transition-all flex items-center gap-2"
            >
              <ShoppingCart size={18} />
              <span className="hidden md:inline">Venda</span>
            </button>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden md:flex flex-col items-end mr-2 text-right">
              <span className="text-sm font-black text-[#000666] leading-tight truncate max-w-[150px]">
                {userProfile?.name || user?.displayName || user?.email}
              </span>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md",
                isAdmin ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"
              )}>
                {isAdmin ? 'Administrador' : userProfile?.role || 'Operador'}
              </span>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#f5f2fb] border-2 border-white shadow-md rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              {user?.photoURL ? (
                <Image 
                  src={user.photoURL} 
                  alt="User" 
                  width={40} 
                  height={40} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="font-black text-[#000666] text-xs lg:text-sm uppercase">
                  {user?.email?.substring(0, 2) || 'AU'}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-[#fbf8ff] p-4 lg:p-8 lg:pb-8 pb-24">
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden h-16 bg-white border-t border-slate-100 flex items-center justify-around px-2 shrink-0">
          <button onClick={() => handleViewChange('dashboard')} className={cn("flex flex-col items-center gap-1", currentView === 'dashboard' ? "text-[#000666]" : "text-slate-400")}>
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button onClick={() => handleViewChange('pdv')} className={cn("flex flex-col items-center gap-1", currentView === 'pdv' ? "text-[#000666]" : "text-slate-400")}>
            <ShoppingCart size={20} />
            <span className="text-[10px] font-bold">PDV</span>
          </button>
          <button 
            onClick={onNewOS}
            className="w-12 h-12 bg-[#000666] text-white rounded-full flex items-center justify-center shadow-lg -mt-8 border-4 border-[#fbf8ff]"
          >
            <Plus size={24} />
          </button>
          <button onClick={() => handleViewChange('service-orders')} className={cn("flex flex-col items-center gap-1", currentView === 'service-orders' ? "text-[#000666]" : "text-slate-400")}>
            <ClipboardList size={20} />
            <span className="text-[10px] font-bold">OS</span>
          </button>
          <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center gap-1 text-slate-400">
            <Menu size={20} />
            <span className="text-[10px] font-bold">Menu</span>
          </button>
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#000666]/20 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-[#c6c5d4]/20"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                  <LogOut size={40} />
                </div>
                <h3 className="text-2xl font-black text-[#1b1b21] mb-2 tracking-tight">Sair do Sistema?</h3>
                <p className="text-slate-500 text-sm font-medium mb-8">
                  Deseja salvar todas as alterações antes de encerrar sua sessão?
                </p>
                <div className="space-y-3">
                  <button
                    disabled={isSyncing}
                    onClick={() => handleConfirmLogout(true)}
                    className="w-full py-4 bg-[#000666] text-white rounded-2xl font-bold text-sm shadow-xl shadow-[#000666]/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSyncing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando alterações...
                      </>
                    ) : (
                      <>
                        <TrendingUp size={18} />
                        Salvar e Sair
                      </>
                    )}
                  </button>
                  <button
                    disabled={isSyncing}
                    onClick={() => handleLogoutClick()} // Toggle off or just use confirm(false)
                    className="hidden" // Just for reference
                  />
                  <button
                    disabled={isSyncing}
                    onClick={() => handleConfirmLogout(false)}
                    className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all active:scale-95"
                  >
                    Sair sem Salvar
                  </button>
                  <button
                    disabled={isSyncing}
                    onClick={() => setIsLogoutModalOpen(false)}
                    className="w-full py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
