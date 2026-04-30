"use client";

import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  Construction,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  MoreVertical,
  X,
  DollarSign,
  LayoutGrid,
  ClipboardList,
  Edit2,
  Trash2,
  UserPlus,
  CreditCard,
  QrCode,
  Wallet,
  FileText,
  ArrowRightLeft,
  RotateCcw,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Client, Equipment as EquipmentType, Transaction, Rental } from '@/src/types';
import EquipmentFormModal from './EquipmentFormModal';
import ClientFormModal from './ClientFormModal';
import { useFirebase } from '@/src/context/FirebaseContext';

interface RentalsProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  equipment: EquipmentType[];
  setEquipment: React.Dispatch<React.SetStateAction<EquipmentType[]>>;
  rentals: Rental[];
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  initialRentalId?: string | null;
  onModalClose?: () => void;
  hideList?: boolean;
  triggerNewModal?: boolean;
}

export default function Rentals({ clients, setClients, equipment, setEquipment, rentals, setRentals, setTransactions, initialRentalId, onModalClose, hideList, triggerNewModal }: RentalsProps) {
  const { actions } = useFirebase();
  const [activeTab, setActiveTab] = useState<'contracts' | 'fleet'>('contracts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEquipmentDeleteModalOpen, setIsEquipmentDeleteModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null);
  const [rentalToDelete, setRentalToDelete] = useState<string | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);
  const [rentalForPayment, setRentalForPayment] = useState<Rental | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [rentalInstallments, setRentalInstallments] = useState<string | number>(1);
  const [isReturning, setIsReturning] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');

  useEffect(() => {
    if (triggerNewModal) {
      openModal();
    }
  }, [triggerNewModal]);

  useEffect(() => {
    if (initialRentalId) {
      const rental = rentals.find(r => r.id === initialRentalId);
      if (rental) {
        openModal(rental);
      }
    }
  }, [initialRentalId, rentals]);

  const [formData, setFormData] = useState({
    equipmentId: '',
    clientId: '',
    startDate: '',
    endDate: '',
    dailyRate: 0,
    discountValue: 0,
    discountType: 'percentage' as 'percentage' | 'fixed',
    ignoreSundays: false,
    status: 'Ativo' as Rental['status']
  });

  const openModal = (rental: Rental | null = null) => {
    setFormError(null);
    if (rental) {
      setEditingRental(rental);
      setFormData({
        equipmentId: rental.equipmentId,
        clientId: rental.clientId,
        startDate: rental.startDate.split('/').reverse().join('-'),
        endDate: rental.endDate.split('/').reverse().join('-'),
        dailyRate: rental.dailyRate,
        discountValue: rental.discountValue || 0,
        discountType: rental.discountType || 'percentage',
        ignoreSundays: rental.ignoreSundays || false,
        status: rental.status
      });
    } else {
      setEditingRental(null);
      setFormData({
        equipmentId: '',
        clientId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        dailyRate: 0,
        discountValue: 0,
        discountType: 'percentage',
        ignoreSundays: false,
        status: 'Ativo'
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    if (onModalClose) onModalClose();
  };

  const openEquipmentModal = (eq: EquipmentType | null = null) => {
    if (eq) {
      setEditingEquipment(eq);
    } else {
      setEditingEquipment(null);
    }
    setIsEquipmentModalOpen(true);
  };

  const openEquipmentDeleteModal = (id: string) => {
    setEquipmentToDelete(id);
    setIsEquipmentDeleteModalOpen(true);
  };

  const confirmEquipmentDelete = async () => {
    if (equipmentToDelete) {
      try {
        await actions.remove('equipment', equipmentToDelete);
        setIsEquipmentDeleteModalOpen(false);
        setEquipmentToDelete(null);
      } catch (error) {
        console.error('Error deleting equipment:', error);
      }
    }
  };

  const calculateBoletoDueDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const getInstallmentsList = (amount: number, installments: string | number) => {
    let installmentTerms: number[] = [];

    if (typeof installments === 'string') {
      if (installments.includes('/')) {
        installmentTerms = installments.split('/').map(t => parseInt(t.trim())).filter(t => !isNaN(t));
      } else if (installments.includes('dias')) {
        installmentTerms = [parseInt(installments.split(' ')[0])];
      } else {
        const num = parseInt(installments);
        if (!isNaN(num)) {
          if (num === 1) {
            installmentTerms = [0];
          } else {
            for (let i = 1; i <= num; i++) {
              installmentTerms.push(i * 30);
            }
          }
        }
      }
    } else {
      if (installments === 1) {
        installmentTerms = [0];
      } else {
        for (let i = 1; i <= installments; i++) {
          installmentTerms.push(i * 30);
        }
      }
    }

    if (installmentTerms.length === 0) installmentTerms = [0];

    const installmentValue = amount / installmentTerms.length;

    return installmentTerms.map((days) => {
      return {
        date: calculateBoletoDueDate(days),
        value: installmentValue
      };
    });
  };

  const handlePayment = async (method: string, status: 'Pago' | 'Pendente' = 'Pago', installments: string | number = 1) => {
    if (!rentalForPayment) return;

    const instList = getInstallmentsList(rentalForPayment.totalValue, installments);
    const newTransactions: Transaction[] = instList.map((inst, idx) => ({
      id: Math.random().toString(36).substring(2, 11),
      description: `Locação: ${rentalForPayment.equipmentName}${instList.length > 1 ? ` - Parc. ${idx + 1}/${instList.length}` : ''}`,
      category: 'Locação',
      type: 'Receita',
      entity: rentalForPayment.clientName,
      date: new Date().toLocaleDateString('pt-BR'),
      dueDate: inst.date.split('-').reverse().join('/'),
      paymentDate: status === 'Pago' ? new Date().toLocaleDateString('pt-BR') : undefined,
      status: status,
      value: inst.value,
      paymentMethod: instList.length > 1 ? `${method} (${instList.length}x)` : method,
      referenceId: rentalForPayment.id
    }));

    try {
      // In a real app, we'd use a batch or individual calls. 
      // For now, we'll just add them.
      for (const t of newTransactions) {
        await actions.add('transactions', t);
      }
      
      // Show success feedback
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 3000);

      // Reset selection but keep modal open
      setSelectedPaymentMethod(null);
      setRentalInstallments(1);
    } catch (error) {
      console.error('Error saving transactions:', error);
    }
  };

  const handleConfirmReturn = async (rentalId: string) => {
    const rental = rentals.find(r => r.id === rentalId);
    if (!rental) return;

    try {
      // Update rental status
      await actions.update('rentals', rentalId, { status: 'Finalizado' });

      // Update equipment status
      await actions.update('equipment', rental.equipmentId, { status: 'Equipamento Ativo' });
    } catch (error) {
      console.error('Error confirming return:', error);
    }
  };

  const isOverdue = (endDateStr: string) => {
    const [day, month, year] = endDateStr.split('/').map(Number);
    const endDate = new Date(year, month - 1, day);
    
    let nextBusinessDay = new Date(endDate);
    nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    
    while (nextBusinessDay.getDay() === 0 || nextBusinessDay.getDay() === 6) {
      nextBusinessDay.setDate(nextBusinessDay.getDate() + 1);
    }
    
    nextBusinessDay.setHours(9, 0, 0, 0);
    return new Date() > nextBusinessDay;
  };

  const overdueRentals = rentals.filter(r => r.status === 'Ativo' && isOverdue(r.endDate));

  const handleEquipmentChange = (id: string) => {
    const selectedEq = equipment.find(e => e.id === id);
    setFormData(prev => ({
      ...prev,
      equipmentId: id,
      dailyRate: selectedEq?.dailyRate || prev.dailyRate
    }));
  };

  const handleSaveRental = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const selectedEq = equipment.find(e => e.id === formData.equipmentId);
    const selectedClient = clients.find(c => c.id === formData.clientId);

    if (!selectedEq || !selectedClient) return;

    // Check for simultaneous rental
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    const hasOverlap = rentals.some(r => {
      // Skip if it's the same rental we're editing
      if (editingRental && r.id === editingRental.id) return false;
      
      // Only check active or overdue rentals
      if (r.status === 'Finalizado' || r.status === 'Orçamento') return false;
      
      // Only check same equipment
      if (r.equipmentId !== formData.equipmentId) return false;

      const [rd, rm, ry] = r.startDate.split('/').map(Number);
      const [ed, em, ey] = r.endDate.split('/').map(Number);
      const rStart = new Date(ry, rm - 1, rd);
      const rEnd = new Date(ey, em - 1, ed);

      // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
      return start <= rEnd && end >= rStart;
    });

    if (hasOverlap) {
      setFormError('Este equipamento já possui uma locação ativa para o período selecionado.');
      return;
    }

    const totalValue = calculateTotal();

    const rentalData: any = {
      equipmentId: formData.equipmentId,
      equipmentName: `${selectedEq.brand} ${selectedEq.model}`,
      clientId: formData.clientId,
      clientName: selectedClient.name,
      startDate: formData.startDate.split('-').reverse().join('/'),
      endDate: formData.endDate.split('-').reverse().join('/'),
      status: formData.status,
      dailyRate: formData.dailyRate,
      discountValue: formData.discountValue,
      discountType: formData.discountType,
      ignoreSundays: formData.ignoreSundays,
      totalValue: totalValue
    };

    try {
      if (editingRental) {
        await actions.update('rentals', editingRental.id, rentalData);
      } else {
        const docRef = await actions.add('rentals', rentalData);
        if (rentalData.status !== 'Orçamento') {
          setRentalForPayment({ id: docRef.id, ...rentalData });
          setIsPaymentModalOpen(true);
        }
      }
      closeModal();
    } catch (error) {
      console.error('Error saving rental:', error);
    }
  };

  const openDeleteModal = (id: string) => {
    setRentalToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (rentalToDelete) {
      try {
        await actions.remove('rentals', rentalToDelete);
        setIsDeleteModalOpen(false);
        setRentalToDelete(null);
      } catch (error) {
        console.error('Error deleting rental:', error);
      }
    }
  };

  const filteredRentals = rentals.filter(r => 
    r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.equipmentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const countSundays = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    let count = 0;
    let current = new Date(start);
    // Normalize current to start of day to avoid issues with time
    current.setHours(0, 0, 0, 0);
    const normalizedEnd = new Date(end);
    normalizedEnd.setHours(0, 0, 0, 0);

    while (current <= normalizedEnd) {
      if (current.getDay() === 0) { // 0 is Sunday
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const calculateTotal = () => {
    if (!formData.startDate || !formData.endDate || !formData.dailyRate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const diffTime = end.getTime() - start.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    const sundays = countSundays(formData.startDate, formData.endDate);
    const effectiveDays = days - (formData.ignoreSundays ? sundays : 0);
    const baseTotal = Math.max(0, effectiveDays) * formData.dailyRate;
    
    if (formData.discountType === 'percentage') {
      return baseTotal * (1 - (formData.discountValue || 0) / 100);
    } else {
      return Math.max(0, baseTotal - (formData.discountValue || 0));
    }
  };

  const totalValue = calculateTotal();
  const durationDays = formData.startDate && formData.endDate 
    ? Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1
    : 0;

  const totalDiscount = formData.startDate && formData.endDate && formData.dailyRate
    ? (Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1) * formData.dailyRate - totalValue
    : 0;

  const sundaysInRange = countSundays(formData.startDate, formData.endDate);

  const getRentalStats = (rental: Rental) => {
    const [sd, sm, sy] = rental.startDate.split('/');
    const [ed, em, ey] = rental.endDate.split('/');
    const startIso = `${sy}-${sm}-${sd}`;
    const endIso = `${ey}-${em}-${ed}`;
    
    const start = new Date(startIso);
    const end = new Date(endIso);
    const diffTime = end.getTime() - start.getTime();
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const sundays = countSundays(startIso, endIso);
    
    return { totalDays, sundays };
  };

  return (
    <motion.div 
      initial={hideList ? {} : { opacity: 0, x: 20 }}
      animate={hideList ? {} : { opacity: 1, x: 0 }}
      className={cn(hideList ? "fixed inset-0 z-[200]" : "space-y-8")}
    >
      {!hideList && (
        <>
          <header>
        <div className="flex items-end justify-between">
          <div>
            <nav className="flex gap-2 text-[10px] text-slate-400 uppercase font-black tracking-widest mb-3">
              <span>Operacional</span>
              <ChevronRight size={10} className="mt-0.5" />
              <span className="text-[#000666]">Locação</span>
            </nav>
            <h1 className="text-5xl font-black tracking-tight text-[#1b1b21]">Locações</h1>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsEquipmentModalOpen(true)}
              className="px-8 py-4 bg-white text-[#000666] border-2 border-[#000666] text-sm font-black rounded-2xl shadow-xl shadow-[#000666]/5 transition-all active:scale-95 flex items-center gap-3"
            >
              <Construction size={22} /> Novo Equipamento
            </button>
            <button 
              onClick={() => openModal()}
              className="px-8 py-4 bg-[#000666] text-white text-sm font-black rounded-2xl shadow-xl shadow-[#000666]/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <Plus size={22} /> Nova Locação
            </button>
          </div>
        </div>
      </header>

      {/* Notifications */}
      <AnimatePresence>
        {overdueRentals.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-8 p-4 bg-red-50 border border-red-100 rounded-[32px] flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-200">
              <Bell size={24} className="animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-red-900 uppercase tracking-widest">Atenção: Devoluções Atrasadas</h4>
              <p className="text-xs font-bold text-red-700 mt-0.5">
                Existem {overdueRentals.length} {overdueRentals.length === 1 ? 'equipamento' : 'equipamentos'} com prazo de devolução excedido (após 09:00 do próximo dia útil).
              </p>
            </div>
            <div className="flex gap-2">
              {overdueRentals.slice(0, 2).map(r => (
                <span key={r.id} className="px-3 py-1.5 bg-white/50 text-red-600 text-[10px] font-black rounded-full border border-red-100">
                  {r.equipmentName}
                </span>
              ))}
              {overdueRentals.length > 2 && (
                <span className="px-3 py-1.5 bg-white/50 text-red-600 text-[10px] font-black rounded-full border border-red-100">
                  +{overdueRentals.length - 2}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-[#c6c5d4]/10 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Orçamentos</p>
              <h3 className="text-2xl font-black text-[#1b1b21]">{rentals.filter(r => r.status === 'Orçamento').length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-[#c6c5d4]/10 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Key size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Locações Ativas</p>
              <h3 className="text-2xl font-black text-[#1b1b21]">{rentals.filter(r => r.status === 'Ativo').length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-[#c6c5d4]/10 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Atrasados</p>
              <h3 className="text-2xl font-black text-[#1b1b21]">{rentals.filter(r => r.status === 'Atrasado').length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-[#c6c5d4]/10 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Receita Prevista</p>
              <h3 className="text-2xl font-black text-[#1b1b21]">
                R$ {rentals.reduce((acc, r) => acc + r.totalValue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-[#f5f2fb] w-fit rounded-2xl border border-[#c6c5d4]/10">
        <button
          onClick={() => setActiveTab('contracts')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all",
            activeTab === 'contracts' 
              ? "bg-white text-[#000666] shadow-sm" 
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <ClipboardList size={16} />
          Contratos
        </button>
        <button
          onClick={() => setActiveTab('fleet')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all",
            activeTab === 'fleet' 
              ? "bg-white text-[#000666] shadow-sm" 
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <LayoutGrid size={16} />
          Livro de Equipamentos
        </button>
      </div>

      {/* List Section */}
      <section className="bg-white rounded-[40px] shadow-sm border border-[#c6c5d4]/10 overflow-hidden">
        <div className="p-8 border-b border-[#c6c5d4]/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <h3 className="font-black text-2xl text-[#1b1b21]">
              {activeTab === 'contracts' ? 'Contratos de Locação' : 'Livro de Equipamentos Próprios'}
            </h3>
            <span className="px-4 py-1.5 bg-[#f5f2fb] text-[#000666] text-[10px] font-black rounded-full uppercase tracking-[0.2em]">
              {activeTab === 'contracts' ? `${filteredRentals.length} Ativos` : `${equipment.length} Máquinas`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'fleet' && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-3 bg-[#f5f2fb] border-none rounded-2xl text-sm font-bold text-[#000666] outline-none transition-all"
              >
                <option value="Todos">Todos os Tipos</option>
                {Array.from(new Set(equipment.map(e => e.type))).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            )}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="text" 
                placeholder={activeTab === 'contracts' ? "Buscar por cliente ou equipamento..." : "Buscar por marca ou modelo..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-3 bg-[#f5f2fb] border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#000666]/5 outline-none w-80 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'contracts' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#c6c5d4]/10">
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Equipamento</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliente</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Período</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Valor Total</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d4]/5">
                {filteredRentals.map((rental) => (
                  <tr key={rental.id} className="hover:bg-[#f5f2fb]/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#f5f2fb] flex items-center justify-center text-[#000666] shadow-sm">
                          <Construction size={24} />
                        </div>
                        <div>
                          <p className="text-base font-black text-[#1b1b21]">{rental.equipmentName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {rental.equipmentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User size={16} />
                        </div>
                        <p className="text-sm font-bold text-slate-600">{rental.clientName}</p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <Calendar size={14} className="text-slate-300" /> {rental.startDate} - {rental.endDate}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <Clock size={12} /> {getRentalStats(rental).totalDays} {getRentalStats(rental).totalDays === 1 ? 'dia contratado' : 'dias contratados'}
                          </div>
                          {rental.ignoreSundays && getRentalStats(rental).sundays > 0 && (
                            <div className="flex items-center gap-2 text-[9px] font-black text-blue-500 uppercase tracking-tight">
                              <CheckCircle2 size={10} /> {getRentalStats(rental).sundays} {getRentalStats(rental).sundays === 1 ? 'domingo isento' : 'domingos isentos'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-base font-black text-[#000666]">R$ {rental.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-slate-400 font-bold">R$ {rental.dailyRate.toLocaleString('pt-BR')}/dia</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em]",
                        rental.status === 'Ativo' ? "bg-blue-100 text-blue-700" : 
                        rental.status === 'Finalizado' ? "bg-[#a0f399] text-[#005312]" : 
                        rental.status === 'Orçamento' ? "bg-slate-100 text-slate-500" :
                        "bg-red-100 text-red-700"
                      )}>
                        {rental.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {rental.status === 'Orçamento' ? (
                          <button 
                            onClick={() => {
                              setRentals(prev => prev.map(r => 
                                r.id === rental.id ? { ...r, status: 'Ativo' } : r
                              ));
                              setRentalForPayment({ ...rental, status: 'Ativo' });
                              setIsPaymentModalOpen(true);
                            }}
                            title="Converter em Contrato"
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-lg"
                          >
                            <ClipboardList size={16} />
                          </button>
                        ) : rental.status === 'Ativo' && (
                          <>
                            <button 
                              onClick={() => {
                                setRentalForPayment(rental);
                                setIsPaymentModalOpen(true);
                              }}
                              title="Editar Pagamento"
                              className="p-2 text-slate-400 hover:text-green-600 transition-colors bg-slate-50 rounded-lg"
                            >
                              <CreditCard size={16} />
                            </button>
                            <button 
                              onClick={() => handleConfirmReturn(rental.id)}
                              title="Confirmar Devolução"
                              className="p-2 text-slate-400 hover:text-blue-600 transition-colors bg-slate-50 rounded-lg"
                            >
                              <RotateCcw size={16} />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => openModal(rental)}
                          className="p-2 text-slate-400 hover:text-[#000666] transition-colors bg-slate-50 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(rental.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-slate-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#c6c5d4]/10">
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Equipamento</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Marca/Modelo</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Nº de Série</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Disponibilidade</th>
                  <th className="px-8 py-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d4]/5">
                {equipment
                  .filter(e => {
                    const matchesSearch = e.brand.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                         e.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                         e.type.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesType = typeFilter === 'Todos' || e.type === typeFilter;
                    return matchesSearch && matchesType;
                  })
                  .map((eq) => (
                  <tr key={eq.id} className="hover:bg-[#f5f2fb]/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#f5f2fb] flex items-center justify-center text-[#000666] shadow-sm">
                          <Construction size={24} />
                        </div>
                        <div>
                          <p className="text-base font-black text-[#1b1b21]">{eq.type}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {eq.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-600">{eq.brand}</p>
                      <p className="text-xs text-slate-400">{eq.model}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-mono font-bold text-[#000666]">{eq.serialNumber || 'N/A'}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em]",
                        eq.status === 'Equipamento Ativo' ? "bg-green-100 text-green-700" : 
                        eq.status === 'Em manutenção' ? "bg-amber-100 text-amber-700" : 
                        "bg-slate-100 text-slate-500"
                      )}>
                        {eq.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      {rentals.some(r => r.equipmentId === eq.id && r.status === 'Ativo') ? (
                        <div className="flex items-center gap-2 text-amber-600">
                          <Clock size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Alugado</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Disponível</span>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEquipmentModal(eq)}
                          className="p-2 text-slate-400 hover:text-[#000666] transition-colors bg-slate-50 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => openEquipmentDeleteModal(eq.id)}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-slate-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      </>
      )}

      {/* Modal for Add/Edit Rental */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#c6c5d4]/15 flex justify-between items-center bg-[#f5f2fb]">
                <h3 className="text-xl font-bold text-[#000666]">
                  {editingRental ? 'Editar Contrato' : 'Novo Contrato de Locação'}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveRental} className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-4 text-left">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Equipamento</label>
                    <select 
                      required
                      value={formData.equipmentId}
                      onChange={(e) => handleEquipmentChange(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] outline-none appearance-none"
                    >
                      <option value="">Selecione um equipamento...</option>
                      {equipment.map(e => (
                        <option key={e.id} value={e.id}>{e.brand} {e.model} ({e.type})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente</label>
                      <button 
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                      >
                        <UserPlus size={10} /> Novo Cliente
                      </button>
                    </div>
                    <select 
                      required
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] outline-none appearance-none"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Data Início</label>
                      <input 
                        required
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Data Fim</label>
                      <input 
                        required
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Diária (R$)</label>
                      <input 
                        required
                        type="number"
                        step="0.01"
                        value={formData.dailyRate || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setFormData({ ...formData, dailyRate: isNaN(val) ? 0 : val });
                        }}
                        className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                      <select 
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as Rental['status'] })}
                        className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] outline-none appearance-none"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Orçamento">Orçamento</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Atrasado">Atrasado</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Desconto</label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input 
                          type="number"
                          step="0.01"
                          value={formData.discountValue || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setFormData({ ...formData, discountValue: isNaN(val) ? 0 : val });
                          }}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] outline-none"
                          placeholder="0.00"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                          {formData.discountType === 'percentage' ? '%' : 'R$'}
                        </div>
                      </div>
                      <div className="flex bg-[#f5f2fb] rounded-xl p-1 shrink-0">
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, discountType: 'percentage' })}
                          className={cn(
                            "px-4 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest",
                            formData.discountType === 'percentage' ? "bg-white text-[#000666] shadow-sm" : "text-slate-400"
                          )}
                        >
                          %
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, discountType: 'fixed' })}
                          className={cn(
                            "px-4 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest",
                            formData.discountType === 'fixed' ? "bg-white text-[#000666] shadow-sm" : "text-slate-400"
                          )}
                        >
                          R$
                        </button>
                      </div>
                    </div>
                    {sundaysInRange > 0 && (
                      <div className="flex items-center justify-between p-3 bg-[#000666]/5 rounded-xl border border-[#000666]/10 mt-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-[#000666]" />
                          <span className="text-[10px] font-black text-[#000666] uppercase tracking-widest">
                            Isentar {sundaysInRange} {sundaysInRange === 1 ? 'Domingo' : 'Domingos'}
                          </span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, ignoreSundays: !formData.ignoreSundays })}
                          className={cn(
                            "w-10 h-5 rounded-full transition-all relative",
                            formData.ignoreSundays ? "bg-[#000666]" : "bg-slate-200"
                          )}
                        >
                          <motion.div 
                            animate={{ x: formData.ignoreSundays ? 20 : 2 }}
                            className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {totalValue > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-[#000666]/5 rounded-2xl border border-[#000666]/10 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Valor Total Estimado</p>
                      <p className="text-2xl font-black text-[#000666]">
                        R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      {totalDiscount > 0 && (
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">
                          Economia total: R$ {totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                      {formData.discountValue > 0 && (
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">
                          Desconto extra de {formData.discountType === 'percentage' ? `${formData.discountValue}%` : `R$ ${formData.discountValue.toLocaleString('pt-BR')}`} aplicado
                        </p>
                      )}
                      {formData.ignoreSundays && sundaysInRange > 0 && (
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                          {sundaysInRange} {sundaysInRange === 1 ? 'domingo isento' : 'domingos isentos'} (-R$ {(sundaysInRange * formData.dailyRate).toLocaleString('pt-BR')})
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Duração</p>
                      <p className="text-sm font-bold text-[#000666]">
                        {durationDays} dias
                      </p>
                    </div>
                  </motion.div>
                )}

                {formError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600"
                  >
                    <AlertCircle size={18} />
                    <p className="text-xs font-bold">{formError}</p>
                  </motion.div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-4 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-[#000666] text-white font-bold rounded-2xl shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {editingRental ? 'Salvar Alterações' : 'Confirmar Locação'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-[#ba1a1a]/10 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-[#ffdbcf] text-[#ba1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-[#1b1b21] mb-2">Excluir Contrato?</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Esta ação removerá o contrato de locação permanentemente. O equipamento voltará a ficar disponível para novos aluguéis.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-3 bg-[#ba1a1a] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#ba1a1a]/20 hover:bg-[#93000a] transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEquipmentDeleteModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEquipmentDeleteModalOpen(false)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-[#1b1b21] mb-2">Excluir Equipamento?</h3>
                <p className="text-sm text-slate-500 mb-8">
                  Esta ação não pode ser desfeita. O equipamento será removido permanentemente da frota.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsEquipmentDeleteModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmEquipmentDelete}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <EquipmentFormModal 
        isOpen={isEquipmentModalOpen}
        onClose={() => {
          setIsEquipmentModalOpen(false);
          setEditingEquipment(null);
        }}
        editingEquipment={editingEquipment}
        onSave={(newEq) => {
          if (editingEquipment) {
            setEquipment(prev => prev.map(e => e.id === editingEquipment.id ? { ...newEq, isForRental: true } : e));
          } else {
            setEquipment(prev => [{ ...newEq, isForRental: true }, ...prev]);
          }
          setIsEquipmentModalOpen(false);
          setEditingEquipment(null);
        }}
        clients={clients}
        initialOwner="Próprio (Locação)"
      />

      <ClientFormModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={(newClient) => {
          setClients(prev => [newClient, ...prev]);
          setFormData(prev => ({ ...prev, clientId: newClient.id }));
          setIsClientModalOpen(false);
        }}
      />

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && rentalForPayment && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-8 border-b border-[#c6c5d4]/10 bg-[#f5f2fb] flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-[#000666]">Pagamento da Locação</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Contrato: {rentalForPayment.id}
                  </p>
                </div>
                <button 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="bg-[#f5f2fb] p-6 rounded-3xl border border-[#c6c5d4]/10 text-center relative overflow-hidden">
                  <AnimatePresence>
                    {paymentSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-green-500 flex items-center justify-center gap-2 z-10"
                      >
                        <CheckCircle2 size={24} className="text-white" />
                        <span className="text-white font-black text-sm uppercase tracking-widest">Pagamento Registrado!</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Valor Total a Pagar</p>
                  <p className="text-4xl font-black text-[#000666]">
                    R$ {rentalForPayment.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button 
                    onClick={() => handlePayment('PIX')}
                    className="p-4 bg-white border-2 border-[#f5f2fb] hover:border-[#000666]/20 hover:bg-[#f5f2fb]/50 rounded-3xl transition-all flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#000666]/5 flex items-center justify-center text-[#000666] group-hover:scale-110 transition-transform shrink-0">
                      <QrCode size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-[#1b1b21]">PIX</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => handlePayment('Dinheiro')}
                    className="p-4 bg-white border-2 border-[#f5f2fb] hover:border-[#000666]/20 hover:bg-[#f5f2fb]/50 rounded-3xl transition-all flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#000666]/5 flex items-center justify-center text-[#000666] group-hover:scale-110 transition-transform shrink-0">
                      <Wallet size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-[#1b1b21]">Dinheiro</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setSelectedPaymentMethod('Cartão de Crédito')}
                    className={cn(
                      "p-4 border-2 rounded-3xl transition-all flex items-center gap-4 group",
                      selectedPaymentMethod === 'Cartão de Crédito' 
                        ? "bg-[#000666] border-[#000666] text-white" 
                        : "bg-white border-[#f5f2fb] hover:border-[#000666]/20 hover:bg-[#f5f2fb]/50 text-[#1b1b21]"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0",
                      selectedPaymentMethod === 'Cartão de Crédito' ? "bg-white/10 text-white" : "bg-[#000666]/5 text-[#000666]"
                    )}>
                      <CreditCard size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black">Crédito</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => handlePayment('Cartão de Débito')}
                    className="p-4 bg-white border-2 border-[#f5f2fb] hover:border-[#000666]/20 hover:bg-[#f5f2fb]/50 rounded-3xl transition-all flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#000666]/5 flex items-center justify-center text-[#000666] group-hover:scale-110 transition-transform shrink-0">
                      <CreditCard size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-[#1b1b21]">Débito</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => setSelectedPaymentMethod('Boleto')}
                    className={cn(
                      "p-4 border-2 rounded-3xl transition-all flex items-center gap-4 group",
                      selectedPaymentMethod === 'Boleto' 
                        ? "bg-[#000666] border-[#000666] text-white" 
                        : "bg-white border-[#f5f2fb] hover:border-[#000666]/20 hover:bg-[#f5f2fb]/50 text-[#1b1b21]"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0",
                      selectedPaymentMethod === 'Boleto' ? "bg-white/10 text-white" : "bg-[#000666]/5 text-[#000666]"
                    )}>
                      <FileText size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black">Boleto</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => handlePayment('Transferência')}
                    className="p-4 bg-white border-2 border-[#f5f2fb] hover:border-[#000666]/20 hover:bg-[#f5f2fb]/50 rounded-3xl transition-all flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#000666]/5 flex items-center justify-center text-[#000666] group-hover:scale-110 transition-transform shrink-0">
                      <ArrowRightLeft size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-[#1b1b21]">Transferência</p>
                    </div>
                  </button>
                </div>

                {selectedPaymentMethod && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-[#f5f2fb] rounded-3xl border border-[#000666]/10 space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-[#000666] uppercase tracking-widest">Opções de Parcelamento</label>
                      <span className="text-[10px] font-bold text-slate-400">{selectedPaymentMethod}</span>
                    </div>
                    
                    {selectedPaymentMethod === 'Boleto' ? (
                      <select 
                        value={rentalInstallments}
                        onChange={(e) => setRentalInstallments(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-bold text-[#000666] outline-none"
                      >
                        <option value="1">1x (À vista)</option>
                        <option value="7 dias">7 dias</option>
                        <option value="14 dias">14 dias</option>
                        <option value="21 dias">21 dias</option>
                        <option value="28 dias">28 dias</option>
                        <option value="30 dias">30 dias</option>
                        <option value="45 dias">45 dias</option>
                        <option value="20/40">20/40</option>
                        <option value="21/42">21/42</option>
                        <option value="28/56">28/56</option>
                        <option value="28/56/84">28/56/84</option>
                        <option value="30/60">30/60</option>
                        <option value="30/60/90">30/60/90</option>
                        <option value="2">2x</option>
                        <option value="3">3x</option>
                        <option value="4">4x</option>
                        <option value="5">5x</option>
                        <option value="6">6x</option>
                        <option value="10">10x</option>
                        <option value="12">12x</option>
                      </select>
                    ) : (
                      <select 
                        value={rentalInstallments}
                        onChange={(e) => setRentalInstallments(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm font-bold text-[#000666] outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    )}

                    <button 
                      onClick={() => handlePayment(selectedPaymentMethod, 'Pago', rentalInstallments)}
                      className="w-full py-4 bg-[#000666] text-white rounded-2xl font-black text-sm shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Confirmar Pagamento
                    </button>
                  </motion.div>
                )}
              </div>

              <div className="p-8 bg-[#f5f2fb]/50 border-t border-[#c6c5d4]/10 flex flex-col gap-3">
                <button 
                  onClick={() => handlePayment('A definir', 'Pendente')}
                  className="w-full py-4 bg-white border border-[#c6c5d4]/20 text-sm font-black text-slate-600 rounded-2xl hover:bg-slate-50 transition-all"
                >
                  Pagar depois
                </button>
                <button 
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setRentalForPayment(null);
                    setSelectedPaymentMethod(null);
                    setRentalInstallments(1);
                  }}
                  className="w-full py-4 text-sm font-black text-[#000666] hover:text-[#000666]/80 transition-colors"
                >
                  Finalizar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
