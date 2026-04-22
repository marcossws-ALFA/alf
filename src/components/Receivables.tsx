"use client";

import React from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight, 
  Wallet, 
  Clock, 
  CheckCircle, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  X, 
  ChevronRight,
  FileText,
  DollarSign,
  ArrowLeft,
  UserPlus,
  Combine,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Transaction, Client } from '@/src/types';
import ClientFormModal from './ClientFormModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReceivablesProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  onBack: () => void;
  onOpenOS: (osId: string) => void;
  onOpenRental: (rentalId: string) => void;
  onOpenSale: (saleId: string) => void;
}

export default function Receivables({ transactions, setTransactions, clients, setClients, onBack, onOpenOS, onOpenRental, onOpenSale }: ReceivablesProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'Todos' | 'Pago' | 'Pendente' | 'Vencido'>('Todos');

  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = React.useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null);
  const [mergingTxs, setMergingTxs] = React.useState<Transaction[]>([]);

  const [addFormData, setAddFormData] = React.useState({
    description: '',
    entity: '',
    value: '',
    dueDate: new Date().toLocaleDateString('pt-BR'),
    category: 'Serviços',
    status: 'Pendente' as Transaction['status'],
    paymentMethod: 'Dinheiro',
    notes: ''
  });

  const receivables = transactions.filter(tx => tx.type === 'Receita');

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditFormData({
      status: tx.status,
      dueDate: tx.dueDate,
      paymentMethod: tx.paymentMethod || 'Dinheiro',
      notes: tx.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const [editFormData, setEditFormData] = React.useState({
    status: 'Pendente' as Transaction['status'],
    dueDate: '',
    paymentMethod: 'Dinheiro',
    notes: ''
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    setTransactions(prev => prev.map(t => 
      t.id === editingTx.id 
        ? { 
            ...t, 
            status: editFormData.status, 
            dueDate: editFormData.dueDate,
            paymentMethod: editFormData.paymentMethod,
            notes: editFormData.notes,
            paymentDate: editFormData.status === 'Pago' ? new Date().toLocaleDateString('pt-BR') : t.paymentDate
          } 
        : t
    ));
    setIsEditModalOpen(false);
  };

  const handleOpenMerge = (tx: Transaction) => {
    if (!tx.referenceId) return;
    
    const baseMethod = tx.paymentMethod?.split(' (')[0] || '';
    const related = receivables.filter(t => 
      t.referenceId === tx.referenceId && 
      (t.paymentMethod?.startsWith(baseMethod) || t.paymentMethod === baseMethod) &&
      t.status !== 'Pago'
    );

    if (related.length > 1) {
      setMergingTxs(related);
      setIsMergeModalOpen(true);
    }
  };

  const handleConfirmMerge = () => {
    if (mergingTxs.length < 2) return;

    const totalValue = mergingTxs.reduce((acc, t) => acc + t.value, 0);
    const firstTx = mergingTxs[0];
    const baseDescription = firstTx.description.split(' - Parc.')[0];
    const baseMethod = firstTx.paymentMethod?.split(' (')[0] || 'Cartão';

    const mergedTx: Transaction = {
      ...firstTx,
      id: Math.random().toString(36).substr(2, 9),
      description: `${baseDescription} - Total Unificado`,
      value: totalValue,
      paymentMethod: baseMethod,
      notes: `Parcelas unificadas em ${new Date().toLocaleDateString('pt-BR')}. Originais: ${mergingTxs.length} parcelas.`
    };

    const mergingIds = new Set(mergingTxs.map(t => t.id));
    
    setTransactions(prev => [
      mergedTx,
      ...prev.filter(t => !mergingIds.has(t.id))
    ]);

    setIsMergeModalOpen(false);
    setMergingTxs([]);
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const newTx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      description: addFormData.description,
      entity: addFormData.entity,
      value: parseFloat(addFormData.value.replace(',', '.')),
      date: new Date().toLocaleDateString('pt-BR'),
      dueDate: addFormData.dueDate,
      category: addFormData.category,
      type: 'Receita',
      status: addFormData.status,
      paymentMethod: addFormData.paymentMethod,
      notes: addFormData.notes,
      paymentDate: addFormData.status === 'Pago' ? new Date().toLocaleDateString('pt-BR') : undefined
    };

    setTransactions(prev => [newTx, ...prev]);
    setIsAddModalOpen(false);
    setAddFormData({
      description: '',
      entity: '',
      value: '',
      dueDate: new Date().toLocaleDateString('pt-BR'),
      category: 'Serviços',
      status: 'Pendente',
      paymentMethod: 'Dinheiro',
      notes: ''
    });
  };

  const handleSaveNewClient = (newClient: Client) => {
    setClients(prev => [newClient, ...prev]);
    setAddFormData(prev => ({ ...prev, entity: newClient.name }));
    setIsClientModalOpen(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const title = 'Relatório de Contas a Receber';
    
    doc.setFontSize(18);
    doc.setTextColor(0, 6, 102); // #000666
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    doc.text(`Total a Receber: R$ ${totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 35);
    doc.text(`Total Recebido: R$ ${totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 40);

    const tableData = filteredReceivables.map(tx => [
      tx.description,
      tx.entity,
      tx.paymentMethod || '-',
      tx.dueDate,
      tx.status,
      `R$ ${tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Descrição', 'Cliente', 'Método', 'Vencimento', 'Status', 'Valor']],
      body: tableData,
      headStyles: { fillColor: [0, 6, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 242, 251] },
      margin: { top: 50 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`relatorio-recebiveis-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredReceivables = receivables.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tx.entity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || tx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalReceivable = receivables
    .filter(tx => tx.status === 'Pendente' || tx.status === 'Vencido')
    .reduce((acc, tx) => acc + tx.value, 0);

  const totalReceived = receivables
    .filter(tx => tx.status === 'Pago')
    .reduce((acc, tx) => acc + tx.value, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
            >
              <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
            </button>
            <div>
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-[#000666]">Contas a Receber</h1>
              <p className="text-slate-500 text-sm font-medium">Gestão de entradas e faturamento.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#000666] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-[#000666]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Novo
            </button>
            <button 
              onClick={generatePDF}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-[#000666] text-xs sm:text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-[#c6c5d4]/20"
            >
              <Download size={18} /> PDF
            </button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-[#c6c5d4]/10">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-[#a0f399]/20 text-[#1b6d24] rounded-xl">
              <Wallet size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">A Receber</p>
              <h3 className="text-lg sm:text-2xl font-black text-[#1b1b21]">R$ {totalReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1 sm:h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#1b6d24] h-full" style={{ width: '65%' }}></div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-[#c6c5d4]/10">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-[#000666]/10 text-[#000666] rounded-xl">
              <CheckCircle size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Recebido</p>
              <h3 className="text-lg sm:text-2xl font-black text-[#1b1b21]">R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1 sm:h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#000666] h-full" style={{ width: '85%' }}></div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-[#c6c5d4]/10">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-xl">
              <Clock size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Vencidos</p>
              <h3 className="text-lg sm:text-2xl font-black text-[#ba1a1a]">
                R$ {receivables.filter(t => t.status === 'Vencido').reduce((acc, t) => acc + t.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
          <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Ação recomendada</p>
        </div>
      </div>

      {/* List Section */}
      <section className="bg-white rounded-3xl shadow-sm border border-[#c6c5d4]/10 overflow-hidden">
        <div className="p-6 border-b border-[#c6c5d4]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-lg text-[#1b1b21]">Fluxo de Recebimentos</h3>
            <span className="px-3 py-1 bg-[#f5f2fb] text-[#000666] text-[10px] font-black rounded-full uppercase tracking-widest">
              {filteredReceivables.length} Lançamentos
            </span>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar cliente ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none w-64"
              />
            </div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#000666] focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Pago">Pago</option>
              <option value="Pendente">Pendente</option>
              <option value="Vencido">Vencido</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f5f2fb]/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição / OS</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Método</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d4]/10">
              {filteredReceivables.map((tx) => (
                <tr 
                  key={tx.id} 
                  className={cn(
                    "hover:bg-[#f5f2fb]/30 transition-colors group",
                    tx.referenceId && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (!tx.referenceId) return;
                    if (tx.category === 'Locação') {
                      onOpenRental(tx.referenceId);
                    } else if (tx.category === 'Vendas') {
                      onOpenSale(tx.referenceId);
                    } else {
                      onOpenOS(tx.referenceId);
                    }
                  }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#a0f399]/20 text-[#1b6d24] rounded-lg">
                        <ArrowUpRight size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1b1b21]">{tx.description}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{tx.category} {tx.referenceId && `• OS #${tx.referenceId}`}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-600">{tx.entity}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-[#000666] uppercase tracking-wider">{tx.paymentMethod || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar size={14} />
                      {tx.dueDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                      tx.status === 'Pago' ? "bg-[#a0f399] text-[#005312]" : 
                      tx.status === 'Pendente' ? "bg-[#f5f2fb] text-slate-500" : 
                      "bg-[#ffdad6] text-[#93000a]"
                    )}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-black text-[#000666]">R$ {tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(tx);
                        }}
                        className="p-2 hover:bg-[#000666]/10 text-[#000666] rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      {tx.referenceId && tx.paymentMethod?.includes('Cartão') && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMerge(tx);
                          }}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all"
                          title="Unificar Parcelas"
                        >
                          <Combine size={16} />
                        </button>
                      )}
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReceivables.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={48} strokeWidth={1} />
                      <p className="text-sm font-medium">Nenhum recebimento encontrado com os filtros atuais.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    <Plus size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-[#000666]">Novo Recebimento Manual</h3>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Descrição / Título</label>
                    <input 
                      required
                      type="text" 
                      value={addFormData.description}
                      onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                      placeholder="Ex: Consultoria Técnica, Venda de Peças..."
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente / Pagador</label>
                      <button 
                        type="button"
                        onClick={() => setIsClientModalOpen(true)}
                        className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                      >
                        <UserPlus size={12} /> Novo Cliente
                      </button>
                    </div>
                    <select 
                      required
                      value={addFormData.entity}
                      onChange={(e) => setAddFormData({ ...addFormData, entity: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.name}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Valor (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="text" 
                        value={addFormData.value}
                        onChange={(e) => setAddFormData({ ...addFormData, value: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vencimento</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="text" 
                        value={addFormData.dueDate}
                        onChange={(e) => setAddFormData({ ...addFormData, dueDate: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                        placeholder="DD/MM/AAAA"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Categoria</label>
                    <select 
                      value={addFormData.category}
                      onChange={(e) => setAddFormData({ ...addFormData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#000666] focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                    >
                      <option value="Serviços">Serviços</option>
                      <option value="Peças">Peças</option>
                      <option value="Vendas">Vendas</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status Inicial</label>
                    <select 
                      value={addFormData.status}
                      onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#000666] focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Método de Pagamento</label>
                    <select 
                      value={addFormData.paymentMethod}
                      onChange={(e) => setAddFormData({ ...addFormData, paymentMethod: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#000666] focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                    >
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="PIX">PIX</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Transferência">Transferência</option>
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Observações</label>
                    <textarea 
                      value={addFormData.notes}
                      onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-medium text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none resize-none h-20"
                      placeholder="Detalhes adicionais..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-4 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-[#000666] text-white font-bold rounded-2xl shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Criar Recebimento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ClientFormModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={handleSaveNewClient}
      />

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    <Edit2 size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-[#000666]">Editar Recebimento</h3>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Descrição</p>
                    <p className="text-sm font-bold text-[#1b1b21]">{editingTx?.description}</p>
                    <p className="text-xs text-slate-500">{editingTx?.entity}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                    <select 
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#000666] focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                      <option value="Vencido">Vencido</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Método de Pagamento</label>
                    <select 
                      value={editFormData.paymentMethod}
                      onChange={(e) => setEditFormData({ ...editFormData, paymentMethod: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#000666] focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                    >
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="PIX">PIX</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Boleto">Boleto</option>
                      <option value="Transferência">Transferência</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Data de Vencimento</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="text" 
                        value={editFormData.dueDate}
                        onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#000666] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                        placeholder="DD/MM/AAAA"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Observações</label>
                    <textarea 
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-medium text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none resize-none h-24"
                      placeholder="Adicione observações sobre este recebimento..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-4 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-[#000666] text-white font-bold rounded-2xl shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMergeModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMergeModalOpen(false)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-blue-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-xl">
                    <Combine size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-blue-900">Unificar Parcelas</h3>
                </div>
                <button onClick={() => setIsMergeModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={24} className="text-blue-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                  <p className="text-xs font-medium text-amber-800">
                    Esta ação irá somar todas as parcelas pendentes deste pagamento em um único lançamento. Esta operação não pode ser desfeita automaticamente.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo da Unificação</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <span className="text-sm text-slate-600 font-medium">Quantidade de Parcelas</span>
                      <span className="text-sm font-bold text-[#1b1b21]">{mergingTxs.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#000666]/5 rounded-xl border border-[#000666]/10">
                      <span className="text-sm text-[#000666] font-bold">Valor Total Unificado</span>
                      <span className="text-lg font-black text-[#000666]">
                        R$ {mergingTxs.reduce((acc, t) => acc + t.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsMergeModalOpen(false)}
                    className="flex-1 py-4 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleConfirmMerge}
                    className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Confirmar União
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
