'use client';

import React, { useState } from 'react';
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
  CalendarDays
} from 'lucide-react';
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
  const { user, logout, isAdmin, userProfile } = useFirebase();

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

  return (
    <div className="flex h-screen bg-[#fbf8ff]">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-[#c6c5d4]/20 flex flex-col transition-all duration-300 shadow-xl shadow-[#000666]/5 z-20",
          isSidebarCollapsed ? "w-20" : "w-72"
        )}
      >
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#000666] p-2.5 rounded-xl shadow-lg shadow-[#000666]/20">
            <Building2 className="text-white" size={24} />
          </div>
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
              onClick={() => onViewChange(item.id as View)}
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
            onClick={() => onViewChange('support')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-slate-500 hover:bg-[#f5f2fb] hover:text-[#000666]",
              currentView === 'support' && "bg-[#000666] text-white"
            )}
          >
            <HelpCircle size={20} />
            {!isSidebarCollapsed && <span className="text-sm font-bold">Suporte</span>}
          </button>
          <button
            onClick={logout}
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
        <header className="h-20 bg-white border-b border-[#c6c5d4]/10 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-[#1b1b21] tracking-tight capitalize leading-tight">
              {currentView.replace('-', ' ')}
            </h2>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-widest">Portal</span>
              <span className="text-[8px] opacity-30">•</span>
              <span className="text-[10px] font-bold uppercase tracking-widest">{currentView}</span>
            </div>
          </div>

          {/* Header Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <button 
              onClick={onNewOS}
              className="px-4 py-2.5 bg-[#000666] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#000666]/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Nova OS
            </button>
            <button 
              onClick={onNewSale}
              className="px-4 py-2.5 bg-white border border-[#000666]/10 text-[#000666] rounded-xl font-bold text-sm hover:bg-[#f5f2fb] transition-all flex items-center gap-2"
            >
              <ShoppingCart size={18} />
              Venda
            </button>
            <button 
              onClick={onNewRental}
              className="px-4 py-2.5 bg-white border border-[#000666]/10 text-[#000666] rounded-xl font-bold text-sm hover:bg-[#f5f2fb] transition-all flex items-center gap-2"
            >
              <CalendarDays size={18} />
              Locação
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end mr-2 text-right">
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
            <div className="w-10 h-10 bg-[#f5f2fb] border-2 border-white shadow-md rounded-xl flex items-center justify-center overflow-hidden shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
              ) : (
                <span className="font-black text-[#000666] text-sm uppercase">
                  {user?.email?.substring(0, 2) || 'AU'}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-[#fbf8ff]">
          {children}
        </div>
      </main>
    </div>
  );
}
