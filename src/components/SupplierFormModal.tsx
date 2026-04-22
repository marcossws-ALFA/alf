"use client";

import React, { useState } from 'react';
import { 
  Truck, 
  ChevronRight,
  Loader2,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Supplier } from '@/src/types';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  editingSupplier?: Supplier | null;
}

export default function SupplierFormModal({ isOpen, onClose, onSave, editingSupplier }: SupplierFormModalProps) {
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [formData, setFormData] = useState({
    name: editingSupplier?.name || '',
    email: editingSupplier?.email || '',
    phone: editingSupplier?.phone || '',
    document: editingSupplier?.document || '',
    category: editingSupplier?.category || 'Peças',
    status: editingSupplier?.status || 'Ativo' as Supplier['status'],
    zipCode: editingSupplier?.zipCode || '',
    street: editingSupplier?.street || '',
    number: editingSupplier?.number || '',
    neighborhood: editingSupplier?.neighborhood || '',
    city: editingSupplier?.city || '',
    state: editingSupplier?.state || '',
    notes: editingSupplier?.notes || ''
  });

  // Update form data when editingSupplier changes
  React.useEffect(() => {
    if (editingSupplier) {
      setFormData({
        name: editingSupplier.name,
        email: editingSupplier.email,
        phone: editingSupplier.phone,
        document: editingSupplier.document,
        category: editingSupplier.category,
        status: editingSupplier.status,
        zipCode: editingSupplier.zipCode || '',
        street: editingSupplier.street || '',
        number: editingSupplier.number || '',
        neighborhood: editingSupplier.neighborhood || '',
        city: editingSupplier.city || '',
        state: editingSupplier.state || '',
        notes: editingSupplier.notes || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        document: '',
        category: 'Peças',
        status: 'Ativo',
        zipCode: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        notes: ''
      });
    }
  }, [editingSupplier]);

  const handleCnpjLookup = async (cnpj: string) => {
    const cleanCnpj = cnpj.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) return;

    setIsLoadingCnpj(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          name: data.razao_social || data.nome_fantasia || prev.name,
          email: data.email || prev.email,
          phone: data.ddd_telefone_1 || prev.phone,
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
      setIsLoadingCnpj(false);
    }
  };

  const handleZipLookup = async (zip: string) => {
    const cleanZip = zip.replace(/\D/g, '');
    if (cleanZip.length !== 8) return;

    setIsLoadingZip(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanZip}`);
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          street: data.street || prev.street,
          neighborhood: data.neighborhood || prev.neighborhood,
          city: data.city || prev.city,
          state: data.state || prev.state,
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsLoadingZip(false);
    }
  };

  const maskDocument = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
    return cleanValue
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const maskPhone = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 10) {
      return cleanValue
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d{1,4})/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
    return cleanValue
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d{1,4})/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const maskZipCode = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue
      .replace(/(\d{5})(\d{1,3})/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier: Supplier = {
      id: editingSupplier?.id || Math.random().toString(36).substr(2, 9),
      ...formData,
      createdAt: editingSupplier?.createdAt || new Date().toLocaleDateString('pt-BR')
    };
    onSave(supplier);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[210] bg-[#f8fafc] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-white shadow-sm">
              <div className="flex items-center gap-4">
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500"
                >
                  <ChevronRight size={24} className="rotate-180" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    <Truck size={20} />
                  </div>
                  <div>
                    <nav className="flex gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      <span>Fornecedores</span>
                      <ChevronRight size={8} className="mt-0.5" />
                      <span className="text-[#000666]">Cadastro</span>
                    </nav>
                    <h3 className="text-xl font-bold text-[#1b1b21]">
                      {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="px-6 py-2.5 bg-white text-slate-500 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const form = document.getElementById('supplier-form-modal') as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }}
                  className="px-8 py-2.5 bg-[#000666] text-white font-bold rounded-xl shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
                >
                  {editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-5xl mx-auto">
                <form id="supplier-form-modal" onSubmit={handleSubmit} className="space-y-8">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#c6c5d4]/10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CNPJ / CPF</label>
                        <div className="relative">
                          <input 
                            required
                            type="text" 
                            value={formData.document}
                            onChange={(e) => {
                              const val = maskDocument(e.target.value);
                              setFormData({ ...formData, document: val });
                              if (val.replace(/\D/g, '').length === 14) {
                                handleCnpjLookup(val);
                              }
                            }}
                            className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none transition-all"
                            placeholder="00.000.000/0000-00"
                          />
                          {isLoadingCnpj && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                              <Loader2 size={20} className="animate-spin text-[#000666]" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome / Razão Social</label>
                        <input 
                          required
                          type="text" 
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none transition-all"
                          placeholder="Nome da empresa ou fornecedor"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">E-mail</label>
                        <input 
                          required
                          type="email" 
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none transition-all"
                          placeholder="exemplo@email.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Telefone</label>
                        <input 
                          required
                          type="text" 
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
                          className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none transition-all"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Categoria</label>
                        <select 
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#000666] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none appearance-none cursor-pointer"
                        >
                          <option value="Peças">Peças</option>
                          <option value="Serviços">Serviços</option>
                          <option value="Infraestrutura">Infraestrutura</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                        <select 
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                          className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#000666] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none appearance-none cursor-pointer"
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="p-1.5 bg-[#000666]/10 text-[#000666] rounded-lg">
                          <MapPin size={18} />
                        </div>
                        <h4 className="text-sm font-bold text-[#000666] uppercase tracking-widest">Endereço do Fornecedor</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">CEP</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={formData.zipCode}
                              onChange={(e) => {
                                const val = maskZipCode(e.target.value);
                                setFormData({ ...formData, zipCode: val });
                                if (val.replace(/\D/g, '').length === 8) {
                                  handleZipLookup(val);
                                }
                              }}
                              className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none transition-all"
                              placeholder="00000-000"
                            />
                            {isLoadingZip && (
                              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                <Loader2 size={20} className="animate-spin text-[#000666]" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logradouro</label>
                          <input 
                            type="text" 
                            value={formData.street}
                            onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                            className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none transition-all"
                            placeholder="Rua, Avenida, etc."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Número</label>
                          <input 
                            type="text" 
                            value={formData.number}
                            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                            className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none transition-all"
                            placeholder="Nº"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bairro</label>
                          <input 
                            type="text" 
                            value={formData.neighborhood}
                            onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                            className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none transition-all"
                            placeholder="Bairro"
                          />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cidade / UF</label>
                          <div className="flex gap-3">
                            <input 
                              type="text" 
                              placeholder="Cidade"
                              value={formData.city}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                              className="flex-1 px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none transition-all"
                            />
                            <input 
                              type="text" 
                              placeholder="UF"
                              maxLength={2}
                              value={formData.state}
                              onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                              className="w-20 px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none text-center transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Observações Internas</label>
                      <textarea 
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-5 py-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm font-medium text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 focus:border-[#000666]/20 outline-none resize-none h-32 transition-all"
                        placeholder="Notas adicionais sobre o fornecedor..."
                      />
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
