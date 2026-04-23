"use client";

import React from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  X, 
  ChevronRight,
  Zap,
  ShoppingCart,
  Check,
  User,
  Tag,
  CreditCard,
  FileText,
  AlertCircle,
  DollarSign,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Transaction, Client, Supplier } from '@/src/types';
import { useFirebase } from '@/src/context/FirebaseContext';

interface FinanceProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  suppliers: Supplier[];
  clients: Client[];
  onViewChange: (view: any) => void;
}

export default function Finance({ transactions, setTransactions, suppliers, clients, onViewChange }: FinanceProps) {
  const { actions } = useFirebase();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'Todos' | 'Receita' | 'Despesa'>('Todos');
  const [showValues, setShowValues] = React.useState(true);

  const [formData, setFormData] = React.useState<Partial<Transaction>>({
    description: '',
    category: 'Serviços',
    type: 'Receita',
    entity: '',
    date: new Date().toLocaleDateString('pt-BR'),
    dueDate: new Date().toLocaleDateString('pt-BR'),
    status: 'Pendente',
    value: 0,
    paymentMethod: 'Dinheiro',
    notes: ''
  });

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tx.entity.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'Todos' || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalRevenue = transactions
    .filter(tx => tx.type === 'Receita' && tx.status === 'Pago')
    .reduce((acc, tx) => acc + tx.value, 0);

  const totalExpenses = transactions
    .filter(tx => tx.type === 'Despesa' && tx.status === 'Pago')
    .reduce((acc, tx) => acc + tx.value, 0);

  const pendingReceivable = transactions
    .filter(tx => tx.type === 'Receita' && tx.status === 'Pendente')
    .reduce((acc, tx) => acc + tx.value, 0);

  const pendingPayable = transactions
    .filter(tx => tx.type === 'Despesa' && tx.status === 'Pendente')
    .reduce((acc, tx) => acc + tx.value, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const parseDate = (dateStr: any) => {
    if (!dateStr || typeof dateStr !== 'string') return new Date();
    try {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return new Date();
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    } catch (e) {
      return new Date();
    }
  };

  const monthRevenue = transactions
    .filter(tx => {
      const date = parseDate(tx.date);
      return tx.type === 'Receita' && tx.status === 'Pago' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((acc, tx) => acc + tx.value, 0);

  const monthExpenses = transactions
    .filter(tx => {
      const date = parseDate(tx.date);
      return tx.type === 'Despesa' && tx.status === 'Pago' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((acc, tx) => acc + tx.value, 0);

  const grossProfit = monthRevenue - monthExpenses;

  const handleOpenModal = (tx?: Transaction) => {
    if (tx) {
      setEditingTransaction(tx);
      setFormData(tx);
    } else {
      setEditingTransaction(null);
      setFormData({
        description: '',
        category: 'Serviços',
        type: 'Receita',
        entity: '',
        date: new Date().toLocaleDateString('pt-BR'),
        dueDate: new Date().toLocaleDateString('pt-BR'),
        status: 'Pendente',
        value: 0,
        paymentMethod: 'Dinheiro',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await actions.update('transactions', editingTransaction.id, formData);
      } else {
        await actions.add('transactions', formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Erro ao salvar transação.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta transação?')) {
      try {
        await actions.remove('transactions', id);
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Erro ao excluir transação.');
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-[#000666]">Financeiro</h1>
            <p className="text-slate-500 text-sm font-medium">Controle de fluxo de caixa e gestão de transações.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-[#000666] text-xs sm:text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-[#c6c5d4]/20">
              <Download size={18} /> Exportar
            </button>
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#000666] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-[#000666]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Nova Transação
            </button>
          </div>
        </div>
      </header>

      {/* Summary Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        <div className="col-span-2 bg-white p-6 sm:p-8 rounded-xl shadow-sm relative overflow-hidden flex flex-col justify-between border border-[#c6c5d4]/10">
          <div className="z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 opacity-60">Lucro Bruto</span>
              <button 
                onClick={() => setShowValues(!showValues)}
                className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
              >
                {showValues ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
            <h2 className="text-2xl sm:text-5xl font-black mt-1 sm:mt-2 text-[#1b1b21] tabular-nums">
              {showValues ? `R$ ${grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ ••••••••'}
            </h2>
            <div className="mt-2 sm:mt-4 flex items-center gap-2 text-[#1b6d24] font-bold text-[10px] sm:text-sm">
              <TrendingUp size={14} className="sm:w-4 sm:h-4" />
              <span>Resultado positivo</span>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-32 h-32 sm:w-48 sm:h-48 bg-[#000666]/5 rounded-full blur-3xl"></div>
        </div>

        <div 
          onClick={() => onViewChange('receivables')}
          className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border-l-4 border-[#1b6d24] border-t border-r border-b border-[#c6c5d4]/10 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="bg-[#a0f399]/30 p-1.5 sm:p-2 rounded-lg w-fit mb-3 sm:mb-4 text-[#1b6d24]">
            <Wallet size={18} className="sm:w-5 sm:h-5" />
          </div>
          <span className="block text-[10px] sm:text-xs font-medium text-slate-500">A Receber</span>
          <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums">
            R$ {pendingReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div 
          onClick={() => onViewChange('payables')}
          className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border-l-4 border-[#ba1a1a] border-t border-r border-b border-[#c6c5d4]/10 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="bg-[#ffdad6]/30 p-1.5 sm:p-2 rounded-lg w-fit mb-3 sm:mb-4 text-[#ba1a1a]">
            <ArrowDownRight size={18} className="sm:w-5 sm:h-5" />
          </div>
          <span className="block text-[10px] sm:text-xs font-medium text-slate-500">A Pagar</span>
          <p className="text-lg sm:text-2xl font-bold mt-1 tabular-nums">
            R$ {pendingPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </section>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-[#004d40] p-6 rounded-xl text-white flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="font-bold text-lg mb-2">Próximos a Receber</h3>
            <p className="text-sm opacity-80 mb-6">Acompanhe as entradas previstas para o seu caixa.</p>
            <div className="space-y-4">
              {transactions
                .filter(t => t.type === 'Receita' && t.status === 'Pendente')
                .slice(0, 3)
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        <ArrowUpRight size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{t.description}</p>
                        <p className="text-[10px] opacity-70">Vence em {t.dueDate}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold">R$ {t.value.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              {transactions.filter(t => t.type === 'Receita' && t.status === 'Pendente').length === 0 && (
                <p className="text-sm opacity-60 italic">Nenhuma receita pendente.</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => onViewChange('receivables')}
            className="w-full py-3 mt-6 bg-white/10 border border-white/20 rounded-xl text-sm font-bold hover:bg-white/20 transition-colors"
          >
            Ver Contas a Receber
          </button>
        </div>

        <div className="bg-[#1a237e] p-6 rounded-xl text-white flex flex-col justify-between shadow-xl">
          <div>
            <h3 className="font-bold text-lg mb-2">Próximos Vencimentos</h3>
            <p className="text-sm opacity-80 mb-6">Controle as contas a pagar para evitar juros e multas.</p>
            <div className="space-y-4">
              {transactions
                .filter(t => t.type === 'Despesa' && t.status === 'Pendente')
                .slice(0, 3)
                .map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        {t.category === 'Utilidades' ? <Zap size={18} /> : <ShoppingCart size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{t.description}</p>
                        <p className="text-[10px] opacity-70">Vence em {t.dueDate}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold">R$ {t.value.toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              {transactions.filter(t => t.type === 'Despesa' && t.status === 'Pendente').length === 0 && (
                <p className="text-sm opacity-60 italic">Nenhum vencimento pendente.</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => onViewChange('payables')}
            className="w-full py-3 mt-6 bg-white/10 border border-white/20 rounded-xl text-sm font-bold hover:bg-white/20 transition-colors"
          >
            Ver Contas a Pagar
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#c6c5d4]/10">
        <div className="p-6 border-b border-[#c6c5d4]/15 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-lg">Transações Recentes</h3>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-[#f5f2fb] border-none rounded-lg text-xs focus:ring-1 focus:ring-[#000666]/20 outline-none w-48"
              />
            </div>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-1.5 text-xs font-semibold bg-[#f5f2fb] rounded-lg border-none focus:ring-1 focus:ring-[#000666]/20 outline-none"
            >
              <option value="Todos">Todos</option>
              <option value="Receita">Receitas</option>
              <option value="Despesa">Despesas</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f5f2fb]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente / Fornecedor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d4]/10">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#f5f2fb]/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        tx.type === 'Despesa' ? "bg-[#ffdad6] text-[#ba1a1a]" : "bg-[#a0f399]/20 text-[#1b6d24]"
                      )}>
                        {tx.type === 'Despesa' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{tx.description}</p>
                        <p className="text-[10px] text-slate-500">{tx.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{tx.entity}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{tx.dueDate}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      tx.status === 'Pago' ? "bg-[#a0f399] text-[#005312]" : 
                      tx.status === 'Pendente' ? "bg-[#f5f2fb] text-slate-500" : 
                      tx.status === 'Vencido' ? "bg-[#ffdad6] text-[#93000a]" :
                      "bg-slate-100 text-slate-400"
                    )}>
                      {tx.status}
                    </span>
                  </td>
                  <td className={cn("px-6 py-4 text-sm font-bold text-right tabular-nums", tx.type === 'Despesa' && "text-[#ba1a1a]")}>
                    {tx.type === 'Despesa' ? `- R$ ${tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `R$ ${tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModal(tx);
                        }}
                        className="p-1.5 hover:bg-[#000666]/10 text-[#000666] rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(tx.id);
                        }}
                        className="p-1.5 hover:bg-[#ba1a1a]/10 text-[#ba1a1a] rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    <Wallet size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-[#000666]">
                    {editingTransaction ? 'Editar Transação' : 'Nova Transação'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Descrição</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="text" 
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                        placeholder="Ex: Pagamento Fornecedor X"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                    >
                      <option value="Receita">Receita (A Receber)</option>
                      <option value="Despesa">Despesa (A Pagar)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                        placeholder="Ex: Serviços, Peças, Aluguel"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      {formData.type === 'Receita' ? 'Cliente' : 'Fornecedor'}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select 
                        required
                        value={formData.entity}
                        onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none font-bold"
                      >
                        <option value="">Selecione...</option>
                        {formData.type === 'Receita' ? (
                          clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)
                        ) : (
                          suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Valor (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        value={isNaN(formData.value) ? '' : formData.value}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setFormData({ ...formData, value: isNaN(val) ? 0 : val });
                        }}
                        className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Data de Vencimento</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required
                        type="text" 
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                        placeholder="DD/MM/AAAA"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                      <option value="Vencido">Vencido</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Forma de Pagamento</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        value={formData.paymentMethod}
                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                        placeholder="Ex: PIX, Cartão, Boleto"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-[#000666] text-white font-bold rounded-2xl shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Salvar Transação
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
