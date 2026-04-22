"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2,
  Wrench,
  Clock,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Hash,
  DollarSign,
  Tag,
  FileText,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Service } from '@/src/types';
import { useFirebase } from '@/src/context/FirebaseContext';

const initialServices: Service[] = [
  {
    id: '1',
    name: 'Mão de Obra Especializada',
    code: 'SRV-001',
    category: 'Manutenção',
    price: 180.00,
    estimatedTime: '1h',
    description: 'Serviço técnico especializado em equipamentos industriais.'
  },
  {
    id: '2',
    name: 'Diagnóstico Computadorizado',
    code: 'SRV-002',
    category: 'Diagnóstico',
    price: 250.00,
    estimatedTime: '45min',
    description: 'Análise completa de sistemas eletrônicos e sensores.'
  },
  {
    id: '3',
    name: 'Limpeza e Lubrificação Geral',
    code: 'SRV-003',
    category: 'Preventiva',
    price: 120.00,
    estimatedTime: '2h',
    description: 'Limpeza técnica profunda e lubrificação de pontos críticos.'
  }
];

interface ServicesProps {
  services: Service[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
}

export default function Services({ services, setServices }: ServicesProps) {
  const { actions } = useFirebase();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<string[]>(['Manutenção', 'Diagnóstico', 'Preventiva', 'Instalação']);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const [formData, setFormData] = useState<Partial<Service>>({
    name: '',
    code: '',
    category: 'Manutenção',
    price: 0,
    estimatedTime: '',
    description: ''
  });

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (service?: Service) => {
    setIsAddingCategory(false);
    setNewItemName('');
    if (service) {
      setEditingService(service);
      setFormData(service);
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        code: '',
        category: 'Manutenção',
        price: 0,
        estimatedTime: '',
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const generateRandomCode = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = 'SRV-';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingService) {
        await actions.update('services', editingService.id, formData);
      } else {
        await actions.add('services', formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving service:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      try {
        await actions.remove('services', id);
      } catch (error) {
        console.error('Error deleting service:', error);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold text-[#000666] tracking-tight">Catálogo de Serviços</h2>
          <p className="text-slate-500 text-sm font-medium">Gerencie os serviços e mão de obra oferecidos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#000666] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={20} />
          Novo Serviço
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Serviços Ativos', value: services.length, icon: Wrench, color: 'text-[#000666] bg-[#000666]/10' },
          { label: 'Tempo Médio', value: '1.5h', icon: Clock, color: 'text-[#1b6d24] bg-[#1b6d24]/10' },
          { label: 'Ticket Médio', value: `R$ ${(services.reduce((acc, s) => acc + s.price, 0) / (services.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-[#217128] bg-[#a0f399]/30' },
          { label: 'Categorias', value: new Set(services.map(s => s.category)).size, icon: Tag, color: 'text-[#1b6d24] bg-[#1b6d24]/10' },
        ].map((metric, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-transparent hover:border-[#c6c5d4]/15 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", metric.color)}>
                <metric.icon size={20} />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{metric.label}</span>
            </div>
            <p className="text-2xl font-black text-[#1b1b21]">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#c6c5d4]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="flex items-center bg-white rounded-xl px-3 py-2 border border-[#c6c5d4]/20 flex-1 md:w-64">
            <Filter className="text-slate-400 mr-2" size={18} />
            <select className="bg-transparent border-none focus:ring-0 text-xs w-full text-[#1b1b21] font-semibold outline-none">
              <option>Todas as Categorias</option>
              <option>Manutenção</option>
              <option>Diagnóstico</option>
              <option>Preventiva</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#c6c5d4]/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f5f2fb]">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-500">Serviço / Código</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-500">Categoria</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-500 text-right">Tempo Est.</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-500 text-right">Preço</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-500 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d4]/10">
              {filteredServices.map((service) => (
                <tr key={service.id} className="hover:bg-[#f5f2fb]/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#efecf5] overflow-hidden flex items-center justify-center">
                        <Wrench size={18} className="text-[#8690ee]" />
                      </div>
                      <div>
                        <p className="font-bold text-[#1b1b21] text-sm">{service.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{service.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eae7ef] text-[#000666]">
                      {service.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-[#1b1b21]">
                      {service.estimatedTime || 'N/A'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-black text-[#000666]">
                      R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleOpenModal(service)}
                        className="p-2 text-slate-400 hover:text-[#000666] hover:bg-[#000666]/5 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(service.id)}
                        className="p-2 text-slate-400 hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/5 rounded-lg transition-all"
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
        <div className="px-6 py-4 flex items-center justify-between bg-white border-t border-[#c6c5d4]/10">
          <span className="text-xs text-slate-500 font-medium">Exibindo {filteredServices.length} de {services.length} serviços</span>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-[#f5f2fb] text-[#1b1b21] disabled:opacity-50">
              <ChevronLeft size={18} />
            </button>
            <button className="p-2 rounded-lg bg-[#f5f2fb] text-[#1b1b21]">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal CRUD */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm hidden sm:block"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full h-full sm:h-[90vh] sm:max-w-4xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    <Wrench size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#000666]">
                      {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Defina os parâmetros técnicos e comerciais do serviço</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Seção: Identificação */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-[#000666] uppercase tracking-widest border-l-4 border-[#000666] pl-3">Identificação</h4>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome do Serviço</label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            required
                            type="text" 
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="Ex: Mão de Obra Especializada"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Código do Serviço</label>
                          <button 
                            type="button"
                            onClick={generateRandomCode}
                            className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                          >
                            <RefreshCw size={10} /> Código Aleatório
                          </button>
                        </div>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            required
                            type="text" 
                            value={formData.code || ''}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="Ex: SRV-001"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Categoria</label>
                          <button 
                            type="button"
                            onClick={() => setIsAddingCategory(true)}
                            className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                          >
                            <Plus size={10} /> Nova Categoria
                          </button>
                        </div>
                        {isAddingCategory ? (
                          <div className="flex gap-2">
                            <input 
                              autoFocus
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              className="flex-1 px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                              placeholder="Nome da categoria..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newItemName && !categories.includes(newItemName)) {
                                    setCategories(prev => [...prev, newItemName].sort());
                                    setFormData(prev => ({ ...prev, category: newItemName }));
                                    setIsAddingCategory(false);
                                    setNewItemName('');
                                  }
                                }
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                if (newItemName && !categories.includes(newItemName)) {
                                  setCategories(prev => [...prev, newItemName].sort());
                                  setFormData(prev => ({ ...prev, category: newItemName }));
                                  setIsAddingCategory(false);
                                  setNewItemName('');
                                }
                              }}
                              className="p-2 bg-[#000666] text-white rounded-xl hover:bg-[#000666]/90"
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setIsAddingCategory(false)}
                              className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <select 
                            value={formData.category || ''}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Seção: Detalhes e Preço */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-[#000666] uppercase tracking-widest border-l-4 border-[#000666] pl-3">Detalhes e Preço</h4>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Preço do Serviço</label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            required
                            type="number" 
                            step="0.01"
                            value={isNaN(formData.price) ? '' : formData.price}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setFormData({ ...formData, price: isNaN(val) ? 0 : val });
                            }}
                            className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tempo Estimado</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            value={formData.estimatedTime || ''}
                            onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
                            className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="Ex: 1h 30min"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Descrição Detalhada</label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-4 text-slate-400" size={14} />
                          <textarea 
                            rows={4}
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all resize-none"
                            placeholder="Descreva o que está incluso no serviço..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-white border-t border-[#c6c5d4]/10 flex gap-4 justify-end shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-8 py-3 bg-white text-slate-500 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
                  >
                    <X size={18} />
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="px-12 py-3 bg-[#000666] text-white text-sm font-bold rounded-xl hover:bg-[#000666]/90 transition-all flex items-center gap-2 shadow-lg shadow-[#000666]/20"
                  >
                    <Check size={18} />
                    {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
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
