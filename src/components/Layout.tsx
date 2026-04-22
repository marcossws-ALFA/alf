"use client";

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Wrench, 
  Users, 
  Truck,
  Construction, 
  Package, 
  Wallet, 
  Settings, 
  HelpCircle, 
  PlusCircle, 
  Search, 
  Bell, 
  Plus, 
  QrCode,
  Menu,
  X,
  MoreHorizontal,
  LogOut,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { cn } from '@/src/lib/utils';
import { View, CompanyData } from '@/src/types';
import { useFirebase } from '@/src/context/FirebaseContext';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onViewChange: (view: View) => void;
  onNewOS?: () => void;
  onNewRental?: () => void;
  onNewSale?: () => void;
  companyData?: CompanyData;
}

export default function Layout({ children, currentView, onViewChange, onNewOS, onNewRental, onNewSale, companyData }: LayoutProps) {
  const { user, logout } = useFirebase();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pdv', label: 'PDV', icon: QrCode },
    { id: 'service-orders', label: 'Ordens de Serviço', icon: Wrench },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'suppliers', label: 'Fornecedores', icon: Truck },
    { id: 'equipment', label: 'Equipamentos', icon: Construction },
    { id: 'rentals', label: 'Locação', icon: Key },
    { id: 'parts', label: 'Catálogo de Peças', icon: Package },
    { id: 'services', label: 'Catálogo de Serviços', icon: Wrench },
    { id: 'finance', label: 'Financeiro', icon: Wallet },
  ];

  const bottomNavItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'pdv', label: 'PDV', icon: QrCode },
    { id: 'service-orders', label: 'Ordens', icon: Wrench },
    { id: 'parts', label: 'Peças', icon: Package },
    { id: 'services', label: 'Serviços', icon: Wrench },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'more', label: 'Menu', icon: MoreHorizontal },
  ];

  const handleViewChange = (view: View) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#fbf8ff] text-[#1b1b21] font-sans selection:bg-[#bdc2ff] selection:text-[#000767]">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#000666]/20 backdrop-blur-sm z-50 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-[#f5f2fb] shadow-2xl z-50 md:hidden flex flex-col p-4"
            >
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex flex-col gap-2">
                  {companyData?.logoUrl ? (
                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white shadow-sm border border-[#c6c5d4]/10">
                      <Image 
                        src={companyData.logoUrl} 
                        alt="Logo" 
                        fill 
                        className="object-contain p-1.5"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="p-3 bg-[#000666] text-white rounded-2xl w-fit">
                      <QrCode size={36} />
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg font-black text-[#000666] tracking-tight leading-tight">
                      {companyData?.tradeName || 'Portal de Serviço'}
                    </h1>
                  </div>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400">
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleViewChange(item.id as View)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all",
                      currentView === item.id 
                        ? "bg-white text-[#1A237E] shadow-sm" 
                        : "text-slate-600 hover:bg-slate-200/50"
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-4 border-t border-[#c6c5d4]/15 space-y-1">
                <button 
                  onClick={() => handleViewChange('settings')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all",
                    currentView === 'settings' ? "bg-white text-[#000666] shadow-sm" : "text-slate-600 hover:bg-slate-200/50"
                  )}
                >
                  <Settings size={18} />
                  Configurações
                </button>
                <button 
                  onClick={() => handleViewChange('support')}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all",
                    currentView === 'support' ? "bg-white text-[#000666] shadow-sm" : "text-slate-600 hover:bg-slate-200/50"
                  )}
                >
                  <HelpCircle size={18} />
                  Suporte
                </button>
                <button 
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50 transition-all mt-2"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-[#f5f2fb] border-r border-[#c6c5d4]/15 p-4 z-40">
        <div className="mb-8 px-2 flex flex-col gap-4">
          {companyData?.logoUrl ? (
            <div className="relative w-28 h-28 rounded-[2rem] overflow-hidden bg-white shadow-sm border border-[#c6c5d4]/10">
              <Image 
                src={companyData.logoUrl} 
                alt="Logo" 
                fill 
                className="object-contain p-3"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="p-4 bg-[#000666] text-white rounded-[1.5rem] w-fit">
              <QrCode size={44} />
            </div>
          )}
          <div>
            <h1 className="text-xl font-black text-[#000666] tracking-tight leading-tight">
              {companyData?.tradeName || 'Portal de Serviço'}
            </h1>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id as View)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                currentView === item.id 
                  ? "bg-white text-[#1A237E] shadow-sm" 
                  : "text-slate-600 hover:bg-slate-200/50 hover:translate-x-1"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-[#c6c5d4]/15 space-y-1">
          <button 
            onClick={() => handleViewChange('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all",
              currentView === 'settings' ? "bg-white text-[#000666] shadow-sm" : "text-slate-600 hover:bg-slate-200/50"
            )}
          >
            <Settings size={18} />
            Configurações
          </button>
          
          <button 
            onClick={() => handleViewChange('support')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all",
              currentView === 'support' ? "bg-white text-[#000666] shadow-sm" : "text-slate-600 hover:bg-slate-200/50"
            )}
          >
            <HelpCircle size={18} />
            Suporte
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-64 min-h-screen flex flex-col pb-24 md:pb-0">
        {/* Top App Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#c6c5d4]/15 h-16 sm:h-20 flex items-center px-4 sm:px-8">
          <div className="flex items-center gap-4 flex-1">
            <button className="md:hidden p-2 text-slate-600" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu size={20} />
            </button>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={onNewOS}
                className="px-4 sm:px-6 py-2.5 bg-[#000666] text-white text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-[#000666]/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Plus size={18} /> <span>Nova O.S.</span>
              </button>
              <button 
                onClick={onNewRental}
                className="px-4 sm:px-6 py-2.5 bg-white text-[#000666] border-2 border-[#000666] text-xs sm:text-sm font-black rounded-xl transition-all active:scale-95 flex items-center gap-2"
              >
                <Key size={18} /> <span>Nova Locação</span>
              </button>
              <button 
                onClick={onNewSale}
                className="px-4 sm:px-6 py-2.5 bg-[#a0f399] text-[#005312] text-xs sm:text-sm font-black rounded-xl shadow-lg shadow-[#a0f399]/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <QrCode size={18} /> <span>Nova Venda</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-1 sm:gap-2">
              <button className="p-2 sm:p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors relative">
                <Bell size={20} className="sm:w-[22px] sm:h-[22px]" />
                <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#ba1a1a] rounded-full border-2 border-white"></span>
              </button>
              <button className="hidden sm:flex p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
                <HelpCircle size={22} />
              </button>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4 sm:pl-6 sm:border-l sm:border-[#c6c5d4]/20">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-black text-[#1b1b21]">{user?.displayName || 'Usuário'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user?.email}</p>
              </div>
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#eae7ef] overflow-hidden border-2 border-[#c6c5d4]/10 relative shadow-sm group cursor-pointer" onClick={logout} title="Sair">
                <Image 
                  src={user?.photoURL || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user?.email}`} 
                  alt="User" 
                  fill
                  className="object-cover group-hover:opacity-50 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <LogOut size={16} className="text-[#000666]" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-[#c6c5d4]/15 flex justify-around items-center h-16 z-40 px-2">
          {bottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.id === 'more' ? setIsMobileMenuOpen(true) : handleViewChange(item.id as View)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 transition-colors",
                currentView === item.id ? "text-[#000666]" : "text-slate-400"
              )}
            >
              <item.icon size={20} fill={currentView === item.id ? "currentColor" : "none"} />
              <span className="text-[10px] font-bold mt-1">{item.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
