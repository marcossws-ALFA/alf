"use client";

import React, { useState } from 'react';
import { 
  User, 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  ChevronRight,
  Wrench,
  BadgeDollarSign,
  Mail,
  Phone,
  Check,
  MoreVertical,
  Building2,
  Save,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Mechanic, Seller, SystemUser, CompanyData } from '@/src/types';
import { useFirebase } from '@/src/context/FirebaseContext';
import Image from 'next/image';

interface SettingsProps {
  mechanics: Mechanic[];
  setMechanics: React.Dispatch<React.SetStateAction<Mechanic[]>>;
  sellers: Seller[];
  setSellers: React.Dispatch<React.SetStateAction<Seller[]>>;
  systemUsers: SystemUser[];
  setSystemUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  companyData: CompanyData;
  setCompanyData: React.Dispatch<React.SetStateAction<CompanyData>>;
}

export default function Settings({ mechanics, setMechanics, sellers, setSellers, systemUsers, setSystemUsers, companyData, setCompanyData }: SettingsProps) {
  const { user, actions, data } = useFirebase();
  const [activeTab, setActiveTab] = useState<'mechanics' | 'sellers' | 'users' | 'company' | 'maintenance'>('company');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Mechanic | Seller | SystemUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [customRoles, setCustomRoles] = useState<string[]>(['Admin', 'Gerente', 'Operador']);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);

  const [formData, setFormData] = useState<any>({
    name: '',
    email: '',
    phone: '',
    password: '',
    specialty: '',
    commission: '',
    status: 'Ativo',
    role: 'Operador',
    cpf: '',
    pixKey: ''
  });

  const [companyForm, setCompanyForm] = useState<CompanyData>(companyData);
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);

  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const fetchCNPJData = async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return;

    setIsLoadingCNPJ(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
      if (response.ok) {
        const data = await response.json();
        setCompanyForm(prev => ({
          ...prev,
          companyName: data.razao_social || prev.companyName,
          tradeName: data.nome_fantasia || data.razao_social || prev.tradeName,
          email: data.email || prev.email,
          phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0, 2)}) ${data.ddd_telefone_1.substring(2)}` : prev.phone,
          zipCode: data.cep || prev.zipCode,
          street: data.logradouro || prev.street,
          number: data.numero || prev.number,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.municipio || prev.city,
          state: data.uf || prev.state,
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
    } finally {
      setIsLoadingCNPJ(false);
    }
  };

  const filteredItems = (
    activeTab === 'mechanics' ? mechanics : 
    activeTab === 'sellers' ? sellers : 
    activeTab === 'users' ? systemUsers : []
  ).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.email && item.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (item?: Mechanic | Seller | SystemUser) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        email: item.email || '',
        phone: (item as any).phone || '',
        password: (item as any).password || '',
        status: item.status,
        commission: (item as any).commission?.toString() || '',
        specialty: (item as any).specialty || '',
        role: (item as any).role || 'Operador',
        cpf: (item as any).cpf || '',
        pixKey: (item as any).pixKey || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        status: 'Ativo',
        commission: '',
        specialty: '',
        role: 'Operador',
        cpf: '',
        pixKey: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (activeTab === 'mechanics') {
        const newItem: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          commission: formData.commission ? parseFloat(formData.commission) : undefined,
          specialty: formData.specialty
        };
        if (editingItem) {
          await actions.update('mechanics', editingItem.id, newItem);
        } else {
          await actions.add('mechanics', newItem);
        }
      } else if (activeTab === 'sellers') {
        const newItem: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          status: formData.status,
          commission: formData.commission ? parseFloat(formData.commission) : undefined
        };
        if (editingItem) {
          await actions.update('sellers', editingItem.id, newItem);
        } else {
          await actions.add('sellers', newItem);
        }
      } else {
        const newItem: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
          status: formData.status,
          lastLogin: (editingItem as SystemUser)?.lastLogin,
          cpf: formData.cpf,
          pixKey: formData.pixKey
        };
        if (editingItem) {
          await actions.update('users', editingItem.id, newItem);
        } else {
          await actions.add('users', newItem);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving setting item:', error);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await actions.set('company', 'settings', companyForm);
      alert('Dados da empresa salvos com sucesso!');
    } catch (error) {
      console.error('Error saving company data:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const itemType = activeTab === 'mechanics' ? 'mecânico' : activeTab === 'sellers' ? 'vendedor' : 'usuário';
    if (confirm(`Tem certeza que deseja excluir este ${itemType}?`)) {
      try {
        const col = activeTab === 'mechanics' ? 'mechanics' : activeTab === 'sellers' ? 'sellers' : 'users';
        await actions.remove(col, id);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <header>
        <div className="flex items-end justify-between">
          <div>
            <nav className="flex gap-2 text-[10px] text-slate-400 uppercase font-black tracking-widest mb-3">
              <span>Configurações</span>
              <ChevronRight size={10} className="mt-0.5" />
              <span className="text-[#000666]">
                {activeTab === 'mechanics' ? 'Cadastro de Mecânicos' : activeTab === 'sellers' ? 'Cadastro de Vendedores' : activeTab === 'users' ? 'Usuários do Sistema' : 'Dados da Empresa'}
              </span>
            </nav>
            <h1 className="text-5xl font-black tracking-tight text-[#1b1b21]">Configurações</h1>
          </div>
          {activeTab !== 'company' && (
            <button 
              onClick={() => handleOpenModal()}
              className="px-8 py-4 bg-[#000666] text-white text-sm font-black rounded-2xl shadow-xl shadow-[#000666]/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <Plus size={22} /> {activeTab === 'mechanics' ? 'Novo Mecânico' : activeTab === 'sellers' ? 'Novo Vendedor' : 'Novo Usuário'}
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-[#f5f2fb] rounded-3xl w-fit">
        <button 
          onClick={() => setActiveTab('company')}
          className={cn(
            "px-8 py-3.5 rounded-2xl text-sm font-black transition-all flex items-center gap-3",
            activeTab === 'company' ? "bg-white text-[#000666] shadow-md" : "text-slate-400 hover:text-[#000666]"
          )}
        >
          <Building2 size={18} /> Empresa
        </button>
        <button 
          onClick={() => setActiveTab('mechanics')}
          className={cn(
            "px-8 py-3.5 rounded-2xl text-sm font-black transition-all flex items-center gap-3",
            activeTab === 'mechanics' ? "bg-white text-[#000666] shadow-md" : "text-slate-400 hover:text-[#000666]"
          )}
        >
          <Wrench size={18} /> Mecânicos
        </button>
        <button 
          onClick={() => setActiveTab('sellers')}
          className={cn(
            "px-8 py-3.5 rounded-2xl text-sm font-black transition-all flex items-center gap-3",
            activeTab === 'sellers' ? "bg-white text-[#000666] shadow-md" : "text-slate-400 hover:text-[#000666]"
          )}
        >
          <BadgeDollarSign size={18} /> Vendedores
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-8 py-3.5 rounded-2xl text-sm font-black transition-all flex items-center gap-3",
            activeTab === 'users' ? "bg-white text-[#000666] shadow-md" : "text-slate-400 hover:text-[#000666]"
          )}
        >
          <Users size={18} /> Usuários
        </button>
        <button 
          onClick={() => setActiveTab('maintenance')}
          className={cn(
            "px-8 py-3.5 rounded-2xl text-sm font-black transition-all flex items-center gap-3",
            activeTab === 'maintenance' ? "bg-white text-red-600 shadow-md" : "text-slate-400 hover:text-red-400"
          )}
        >
          <Trash2 size={18} /> Manutenção
        </button>
      </div>

      {/* Content Section */}
      {activeTab === 'mechanics' || activeTab === 'sellers' || activeTab === 'users' ? (
        <section className="bg-white rounded-[40px] shadow-sm border border-[#c6c5d4]/10 overflow-hidden">
          <div className="p-8 border-b border-[#c6c5d4]/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <h3 className="font-black text-2xl text-[#1b1b21]">
              {activeTab === 'mechanics' ? 'Mecânicos Cadastrados' : activeTab === 'sellers' ? 'Vendedores Cadastrados' : 'Usuários Cadastrados'}
            </h3>
            <span className="px-4 py-1.5 bg-[#f5f2fb] text-[#000666] text-[10px] font-black rounded-full uppercase tracking-[0.2em]">
              {filteredItems.length} Registros
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-[#f5f2fb] border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#000666]/5 outline-none w-80 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#c6c5d4]/10">
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Nome</th>
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Contato</th>
                {activeTab === 'mechanics' && (
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Especialidade</th>
                )}
                {activeTab === 'users' && (
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Nível de Acesso</th>
                )}
                {(activeTab === 'mechanics' || activeTab === 'sellers') && (
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Comissão</th>
                )}
                {activeTab === 'users' && (
                  <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Último Acesso</th>
                )}
                <th className="px-8 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d4]/5">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#f5f2fb]/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#f5f2fb] flex items-center justify-center text-[#000666] shadow-sm">
                        <User size={24} />
                      </div>
                      <p className="text-base font-black text-[#1b1b21]">{item.name}</p>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1.5">
                      {item.email && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <Mail size={14} className="text-slate-300" /> {item.email}
                        </div>
                      )}
                      {item.phone && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <Phone size={14} className="text-slate-300" /> {item.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  {activeTab === 'mechanics' && (
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-slate-600">{(item as Mechanic).specialty || '-'}</span>
                    </td>
                  )}
                  {activeTab === 'users' && (
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                        (item as SystemUser).role === 'Admin' ? "bg-purple-100 text-purple-700" :
                        (item as SystemUser).role === 'Gerente' ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {(item as SystemUser).role}
                      </span>
                    </td>
                  )}
                  {(activeTab === 'mechanics' || activeTab === 'sellers') && (
                    <td className="px-8 py-6 text-center">
                      <span className="text-lg font-black text-[#000666]">{(item as any).commission}%</span>
                    </td>
                  )}
                  {activeTab === 'users' && (
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-slate-500">{(item as SystemUser).lastLogin || 'Nunca'}</span>
                    </td>
                  )}
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em]",
                      item.status === 'Ativo' ? "bg-[#a0f399] text-[#005312]" : "bg-slate-100 text-slate-500"
                    )}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleOpenModal(item)}
                        className="p-3 hover:bg-[#000666]/10 text-[#000666] rounded-xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-3 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <p className="text-sm">Nenhum registro encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      ) : activeTab === 'maintenance' ? (
        <section className="bg-white rounded-[40px] shadow-sm border border-[#c6c5d4]/10 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-red-600 text-white rounded-2xl">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="font-black text-2xl text-[#1b1b21]">Manutenção do Sistema</h3>
              <p className="text-sm font-bold text-slate-400">Limpeza e purgação de dados (CUIDADO: Ação Irreversível)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* Financial Reset */}
            <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4">
              <div>
                <h4 className="font-black text-red-900">Registros Financeiros</h4>
                <p className="text-xs text-red-700/60 font-bold uppercase tracking-wider">Transações e Despesas Fixas</p>
              </div>
              <p className="text-sm text-red-800/80">Apaga todo o histórico de entradas, saídas e contas a pagar/receber.</p>
              <button 
                disabled={isMaintenanceLoading}
                onClick={async () => {
                  if (confirm('ATENÇÃO: Deseja apagar TODOS os registros financeiros? Esta ação não pode ser desfeita.')) {
                    setIsMaintenanceLoading(true);
                    try {
                      await Promise.all([
                        ...data.transactions.map(t => actions.remove('transactions', t.id)),
                        ...data.fixedExpenses.map(f => actions.remove('fixed_expenses', f.id))
                      ]);
                      alert('Registros financeiros limpos!');
                    } catch (e) {
                      alert('Erro ao limpar registros financeiros.');
                    } finally {
                      setIsMaintenanceLoading(false);
                    }
                  }
                }}
                className={cn(
                  "w-full py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all",
                  isMaintenanceLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isMaintenanceLoading ? 'Processando...' : 'Limpar Financeiro'}
              </button>
            </div>

            {/* Service Orders Reset */}
            <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4">
              <div>
                <h4 className="font-black text-red-900">Ordens de Serviço</h4>
                <p className="text-xs text-red-700/60 font-bold uppercase tracking-wider">Histórico de OS</p>
              </div>
              <p className="text-sm text-red-800/80">Apaga todas as Ordens de Serviço cadastradas no sistema.</p>
              <button 
                disabled={isMaintenanceLoading}
                onClick={async () => {
                  if (confirm('ATENÇÃO: Deseja apagar TODAS as Ordens de Serviço?')) {
                    setIsMaintenanceLoading(true);
                    try {
                      await Promise.all(data.serviceOrders.map(o => actions.remove('service_orders', o.id)));
                      alert('Ordens de Serviço limpas!');
                    } catch (e) {
                      alert('Erro ao limpar ordens de serviço.');
                    } finally {
                      setIsMaintenanceLoading(false);
                    }
                  }
                }}
                className={cn(
                  "w-full py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all",
                  isMaintenanceLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isMaintenanceLoading ? 'Processando...' : 'Limpar Todas as OS'}
              </button>
            </div>

            {/* Sales Reset */}
            <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4">
              <div>
                <h4 className="font-black text-red-900">Vendas e Orçamentos (PDV)</h4>
                <p className="text-xs text-red-700/60 font-bold uppercase tracking-wider">PDV e Locações</p>
              </div>
              <p className="text-sm text-red-800/80">Apaga todos os pedidos de venda, orçamentos do PDV e contratos de locação.</p>
              <button 
                disabled={isMaintenanceLoading}
                onClick={async () => {
                  if (confirm('ATENÇÃO: Deseja apagar TODAS as vendas e locações?')) {
                    setIsMaintenanceLoading(true);
                    try {
                      await Promise.all([
                        ...data.pdvOrders.map(o => actions.remove('pdv_orders', o.id)),
                        ...data.rentals.map(r => actions.remove('rentals', r.id))
                      ]);
                      alert('Vendas e orçamentos limpos!');
                    } catch (e) {
                      alert('Erro ao limpar vendas e orçamentos.');
                    } finally {
                      setIsMaintenanceLoading(false);
                    }
                  }
                }}
                className={cn(
                  "w-full py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all",
                  isMaintenanceLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isMaintenanceLoading ? 'Processando...' : 'Limpar Vendas/Locações'}
              </button>
            </div>

            {/* Clients Reset */}
            <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4">
              <div>
                <h4 className="font-black text-red-900">Base de Clientes</h4>
                <p className="text-xs text-red-700/60 font-bold uppercase tracking-wider">Cadastros de Clientes</p>
              </div>
              <p className="text-sm text-red-800/80">Apaga todos os clientes cadastrados. Recomendado apenas para reset de testes.</p>
              <button 
                disabled={isMaintenanceLoading}
                onClick={async () => {
                  if (confirm('ATENÇÃO: Deseja apagar TODOS os clientes?')) {
                    setIsMaintenanceLoading(true);
                    try {
                      await Promise.all(data.clients.map(c => actions.remove('clients', c.id)));
                      alert('Base de clientes limpa!');
                    } catch (e) {
                      alert('Erro ao limpar base de clientes.');
                    } finally {
                      setIsMaintenanceLoading(false);
                    }
                  }
                }}
                className={cn(
                  "w-full py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all",
                  isMaintenanceLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isMaintenanceLoading ? 'Processando...' : 'Limpar Clientes'}
              </button>
            </div>

            {/* Equipment Reset */}
            <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4">
              <div>
                <h4 className="font-black text-red-900">Frota de Equipamentos</h4>
                <p className="text-xs text-red-700/60 font-bold uppercase tracking-wider">Ativos cadastrados</p>
              </div>
              <p className="text-sm text-red-800/80">Apaga todos os equipamentos vinculados ou não a clientes.</p>
              <button 
                disabled={isMaintenanceLoading}
                onClick={async () => {
                  if (confirm('ATENÇÃO: Deseja apagar TODOS os equipamentos?')) {
                    setIsMaintenanceLoading(true);
                    try {
                      await Promise.all(data.equipment.map(e => actions.remove('equipment', e.id)));
                      alert('Frota de equipamentos limpa!');
                    } catch (e) {
                      alert('Erro ao limpar frota de equipamentos.');
                    } finally {
                      setIsMaintenanceLoading(false);
                    }
                  }
                }}
                className={cn(
                  "w-full py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all",
                  isMaintenanceLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isMaintenanceLoading ? 'Processando...' : 'Limpar Equipamentos'}
              </button>
            </div>

            {/* Parts Reset */}
            <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4">
              <div>
                <h4 className="font-black text-red-900">Estoque de Peças</h4>
                <p className="text-xs text-red-700/60 font-bold uppercase tracking-wider">Produtos e Peças</p>
              </div>
              <p className="text-sm text-red-800/80">Apaga todo o cadastro de peças e produtos do estoque.</p>
              <button 
                disabled={isMaintenanceLoading}
                onClick={async () => {
                  if (confirm('ATENÇÃO: Deseja apagar TODAS as peças do estoque?')) {
                    setIsMaintenanceLoading(true);
                    try {
                      await Promise.all(data.parts.map(p => actions.remove('parts', p.id)));
                      alert('Estoque de peças limpo!');
                    } catch (e) {
                      alert('Erro ao limpar estoque de peças.');
                    } finally {
                      setIsMaintenanceLoading(false);
                    }
                  }
                }}
                className={cn(
                  "w-full py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all",
                  isMaintenanceLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isMaintenanceLoading ? 'Processando...' : 'Limpar Estoque de Peças'}
              </button>
            </div>

            {/* Services & Suppliers Reset */}
            <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4">
              <div>
                <h4 className="font-black text-red-900">Serviços e Fornecedores</h4>
                <p className="text-xs text-red-700/60 font-bold uppercase tracking-wider">Cadastros Base</p>
              </div>
              <p className="text-sm text-red-800/80">Apaga todos os serviços e fornecedores cadastrados.</p>
              <button 
                disabled={isMaintenanceLoading}
                onClick={async () => {
                  if (confirm('ATENÇÃO: Deseja apagar TODOS os serviços e fornecedores?')) {
                    setIsMaintenanceLoading(true);
                    try {
                      await Promise.all([
                        ...data.services.map(s => actions.remove('services', s.id)),
                        ...data.suppliers.map(sup => actions.remove('suppliers', sup.id))
                      ]);
                      alert('Serviços e fornecedores limpos!');
                    } catch (e) {
                      alert('Erro ao limpar serviços e fornecedores.');
                    } finally {
                      setIsMaintenanceLoading(false);
                    }
                  }
                }}
                className={cn(
                  "w-full py-3 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 transition-all",
                  isMaintenanceLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isMaintenanceLoading ? 'Processando...' : 'Limpar Serviços/Fornecedores'}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white rounded-[40px] shadow-sm border border-[#c6c5d4]/10 p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-[#000666] text-white rounded-2xl">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="font-black text-2xl text-[#1b1b21]">Dados da Empresa</h3>
              <p className="text-sm font-bold text-slate-400">Informações que aparecerão em orçamentos e recibos</p>
            </div>
          </div>

          <form onSubmit={handleSaveCompany} className="space-y-6 max-w-4xl">
            {/* Logo Section */}
            <div className="flex flex-col gap-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logotipo da Empresa</label>
              <div className="flex items-center gap-6">
                <div 
                  className="relative w-32 h-32 rounded-3xl bg-[#f5f2fb] border-2 border-dashed border-[#c6c5d4]/30 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-[#000666]/30 transition-all"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  {companyForm.logoUrl ? (
                    <>
                      <div className="relative w-full h-full">
                        <Image 
                          src={companyForm.logoUrl} 
                          alt="Logo" 
                          fill 
                          className="object-contain p-2" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <Upload className="text-white" size={24} />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-[#000666] transition-all">
                      <ImageIcon size={32} />
                      <span className="text-[10px] font-bold uppercase">Upload Logo</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-bold text-[#1b1b21]">Personalize sua marca</p>
                  <p className="text-xs text-slate-400">Recomendado: PNG ou JPG com fundo transparente. Tamanho máximo 2MB.</p>
                  <input 
                    id="logo-upload"
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setCompanyForm({ ...companyForm, logoUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {companyForm.logoUrl && (
                    <button 
                      type="button"
                      onClick={() => setCompanyForm({ ...companyForm, logoUrl: '' })}
                      className="text-[10px] font-bold text-red-500 hover:underline uppercase tracking-widest"
                    >
                      Remover Logotipo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Razão Social</label>
                <input 
                  required
                  type="text" 
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome Fantasia</label>
                <input 
                  required
                  type="text" 
                  value={companyForm.tradeName}
                  onChange={(e) => setCompanyForm({ ...companyForm, tradeName: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between">
                  CNPJ
                  {isLoadingCNPJ && <span className="text-[10px] text-[#000666] animate-pulse">Buscando dados...</span>}
                </label>
                <input 
                  required
                  type="text" 
                  value={companyForm.document}
                  onChange={(e) => {
                    const masked = maskCNPJ(e.target.value);
                    setCompanyForm({ ...companyForm, document: masked });
                    if (masked.replace(/\D/g, '').length === 14) {
                      fetchCNPJData(masked);
                    }
                  }}
                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Inscrição Estadual</label>
                <input 
                  type="text" 
                  value={companyForm.stateRegistration || ''}
                  onChange={(e) => setCompanyForm({ ...companyForm, stateRegistration: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">E-mail</label>
                <input 
                  required
                  type="email" 
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Telefone / WhatsApp</label>
                <input 
                  required
                  type="text" 
                  value={companyForm.phone}
                  onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-[#c6c5d4]/10">
              <h4 className="text-sm font-black text-[#1b1b21] mb-4">Endereço</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CEP</label>
                  <input 
                    required
                    type="text" 
                    value={companyForm.zipCode}
                    onChange={(e) => setCompanyForm({ ...companyForm, zipCode: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                    placeholder="00000-000"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logradouro</label>
                  <input 
                    required
                    type="text" 
                    value={companyForm.street}
                    onChange={(e) => setCompanyForm({ ...companyForm, street: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Número</label>
                  <input 
                    required
                    type="text" 
                    value={companyForm.number}
                    onChange={(e) => setCompanyForm({ ...companyForm, number: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bairro</label>
                  <input 
                    required
                    type="text" 
                    value={companyForm.neighborhood}
                    onChange={(e) => setCompanyForm({ ...companyForm, neighborhood: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cidade</label>
                  <input 
                    required
                    type="text" 
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estado (UF)</label>
                  <input 
                    required
                    type="text" 
                    value={companyForm.state}
                    onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button 
                type="submit"
                className="px-8 py-4 bg-[#000666] text-white font-black rounded-2xl shadow-xl shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <Save size={20} /> Salvar Dados da Empresa
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Modal */}
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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    {activeTab === 'mechanics' ? <Wrench size={20} /> : activeTab === 'sellers' ? <BadgeDollarSign size={20} /> : <Users size={20} />}
                  </div>
                  <h3 className="text-xl font-bold text-[#000666]">
                    {editingItem ? 'Editar' : 'Novo'} {activeTab === 'mechanics' ? 'Mecânico' : activeTab === 'sellers' ? 'Vendedor' : 'Usuário'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {activeTab === 'users' ? 'E-mail de Acesso' : 'E-mail'}
                    </label>
                    <input 
                      required={activeTab === 'users'}
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Telefone</label>
                    <input 
                      type="text" 
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                    />
                  </div>

                  {activeTab === 'users' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Senha de Acesso</label>
                      <input 
                        required={!editingItem}
                        type="password" 
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                        placeholder={editingItem ? "Deixe em branco para manter" : "Digite a senha"}
                      />
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CPF</label>
                        <input 
                          type="text" 
                          value={formData.cpf}
                          onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chave PIX</label>
                        <input 
                          type="text" 
                          value={formData.pixKey}
                          onChange={(e) => setFormData({ ...formData, pixKey: e.target.value })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                          placeholder="E-mail, CPF, Celular..."
                        />
                      </div>
                    </>
                  )}

                  {activeTab === 'users' && (
                    <div className="col-span-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nível de Acesso</label>
                        <button 
                          type="button"
                          onClick={() => {
                            const newRole = prompt('Digite o nome do novo nível de acesso:');
                            if (newRole && !customRoles.includes(newRole)) {
                              setCustomRoles(prev => [...prev, newRole]);
                              setFormData({ ...formData, role: newRole });
                            }
                          }}
                          className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} /> Novo Nível
                        </button>
                      </div>
                      <select 
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                      >
                        {customRoles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeTab === 'mechanics' && (
                    <div className="col-span-2 space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Especialidade</label>
                      <input 
                        type="text" 
                        value={formData.specialty}
                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                        placeholder="Ex: Motores, Elétrica, Suspensão"
                      />
                    </div>
                  )}

                  {(activeTab === 'mechanics' || activeTab === 'sellers') && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Comissão (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={formData.commission}
                        onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
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
                    Salvar Registro
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
