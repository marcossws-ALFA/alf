"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  Check, 
  MessageCircle, 
  Mail, 
  Trash2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Client } from '@/src/types';
import { formatDocument, formatCEP, formatPhone } from '@/src/lib/formatters';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  editingClient?: Client | null;
}

export default function ClientFormModal({ isOpen, onClose, onSave, editingClient }: ClientFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    mobile: '',
    status: 'Ativo' as Client['status'],
    zipCode: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    type: 'PF' as Client['type'],
    document: '',
    stateRegistration: '',
    tradeName: '',
    notes: '',
    contacts: [] as { name: string; phone: string; email: string; }[]
  });

  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [tempContact, setTempContact] = useState({ name: '', phone: '', email: '' });
  const lastFetchedCNPJ = React.useRef('');

  useEffect(() => {
    if (editingClient) {
      setFormData({
        name: editingClient.name || '',
        email: editingClient.email || '',
        phone: editingClient.phone || '',
        mobile: editingClient.mobile || '',
        status: editingClient.status || 'Ativo',
        zipCode: editingClient.zipCode || '',
        street: editingClient.street || '',
        number: editingClient.number || '',
        neighborhood: editingClient.neighborhood || '',
        city: editingClient.city || '',
        state: editingClient.state || '',
        type: editingClient.type || 'PF',
        document: editingClient.document || '',
        stateRegistration: editingClient.stateRegistration || '',
        tradeName: editingClient.tradeName || '',
        notes: editingClient.notes || '',
        contacts: editingClient.contacts || []
      });
      lastFetchedCNPJ.current = editingClient.document.replace(/\D/g, '');
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        mobile: '',
        status: 'Ativo',
        zipCode: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        type: 'PF',
        document: '',
        stateRegistration: '',
        tradeName: '',
        notes: '',
        contacts: []
      });
      lastFetchedCNPJ.current = '';
    }
  }, [editingClient, isOpen]);

  useEffect(() => {
    const cnpj = formData.document.replace(/\D/g, '').trim();
    
    if (cnpj === '') {
      lastFetchedCNPJ.current = '';
      return;
    }

    // Auto-switch to PJ if 14 digits are entered
    if (formData.type === 'PF' && cnpj.length === 14) {
      setFormData(prev => ({ ...prev, type: 'PJ' }));
      return; // The next effect run will handle the fetch
    }
    
    if (formData.type === 'PJ' && cnpj.length === 14 && cnpj !== lastFetchedCNPJ.current) {
      const fetchCNPJ = async () => {
        lastFetchedCNPJ.current = cnpj;
        setIsFetchingCNPJ(true);
        try {
          // Tenta a v2 primeiro pois ela contém as Inscrições Estaduais detalhadas
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v2/${cnpj}`);
          
          if (response.ok) {
            const data = await response.json();
            
            setFormData(prev => {
              // Tenta extrair a Inscrição Estadual (IE)
              let ie = '';
              if (data.inscricoes_estaduais && data.inscricoes_estaduais.length > 0) {
                // Busca a IE do estado da empresa, ou pega a primeira disponível
                const stateIE = data.inscricoes_estaduais.find((item: any) => item.estado === data.uf);
                ie = stateIE ? stateIE.inscricao_estadual : data.inscricoes_estaduais[0].inscricao_estadual;
              }

              return {
                ...prev,
                name: data.razao_social || data.nome_fantasia || prev.name,
                tradeName: data.nome_fantasia || data.razao_social || prev.tradeName,
                stateRegistration: ie || prev.stateRegistration,
                zipCode: formatCEP(data.cep || prev.zipCode),
                street: data.logradouro || prev.street,
                number: data.numero || prev.number,
                neighborhood: data.bairro || prev.neighborhood,
                city: data.municipio || prev.city,
                state: data.uf || prev.state,
                phone: formatPhone(data.ddd_telefone_1 || data.telefone || prev.phone),
                email: data.email || prev.email
              };
            });
          } else {
            // Fallback para v1 se a v2 falhar (v1 não tem IE, mas tem dados básicos)
            const responseV1 = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
            if (responseV1.ok) {
              const data = await responseV1.json();
              setFormData(prev => ({
                ...prev,
                name: data.razao_social || data.nome_fantasia || prev.name,
                tradeName: data.nome_fantasia || data.razao_social || prev.tradeName,
                zipCode: formatCEP(data.cep || prev.zipCode),
                street: data.logradouro || prev.street,
                number: data.numero || prev.number,
                neighborhood: data.bairro || prev.neighborhood,
                city: data.municipio || prev.city,
                state: data.uf || prev.state,
                phone: formatPhone(data.ddd_telefone_1 || data.telefone || prev.phone),
                email: data.email || prev.email
              }));
            }
          }
        } catch (error) {
          console.error('Erro ao buscar CNPJ:', error);
        } finally {
          setIsFetchingCNPJ(false);
        }
      };
      fetchCNPJ();
    }
  }, [formData.document, formData.type]);

  useEffect(() => {
    const cep = formData.zipCode.replace(/\D/g, '');
    if (cep.length === 8) {
      const fetchAddress = async () => {
        setIsFetchingAddress(true);
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const data = await response.json();
          
          if (!data.erro) {
            setFormData(prev => ({
              ...prev,
              street: data.logradouro,
              neighborhood: data.bairro,
              city: data.localidade,
              state: data.uf
            }));
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error);
        } finally {
          setIsFetchingAddress(false);
        }
      };
      fetchAddress();
    }
  }, [formData.zipCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client: Client = {
      id: editingClient ? editingClient.id : Math.random().toString(36).substring(2, 11),
      ...formData,
      osCount: editingClient ? editingClient.osCount : 0,
      createdAt: editingClient ? editingClient.createdAt : new Date().toLocaleDateString('pt-BR')
    };
    onSave(client);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm hidden sm:block"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white sm:rounded-3xl shadow-2xl w-full h-full sm:h-[90vh] sm:max-w-5xl overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-[#c6c5d4]/15 flex justify-between items-center bg-[#f5f2fb] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#000666] flex items-center justify-center text-white">
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#000666]">
                    {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Preencha as informações abaixo para {editingClient ? 'atualizar' : 'cadastrar'} o cliente</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Informações Básicas */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-[#000666] uppercase tracking-widest border-l-4 border-[#000666] pl-3">Informações Básicas</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo de Cliente</label>
                        <div className="flex bg-[#f5f2fb] rounded-xl p-1">
                          <button 
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'PF' })}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                              formData.type === 'PF' ? "bg-white text-[#000666] shadow-sm" : "text-slate-500"
                            )}
                          >
                            Pessoa Física
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFormData({ ...formData, type: 'PJ' })}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                              formData.type === 'PJ' ? "bg-white text-[#000666] shadow-sm" : "text-slate-500"
                            )}
                          >
                            CNPJ
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                          {formData.type === 'PF' ? 'CPF' : 'CNPJ'}
                          {isFetchingCNPJ && <span className="text-[10px] text-[#000666] animate-pulse">Buscando...</span>}
                        </label>
                        <input 
                          required
                          type="text" 
                          value={formData.document || ''}
                          onChange={(e) => setFormData({ ...formData, document: formatDocument(e.target.value, formData.type) })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                          placeholder={formData.type === 'PF' ? "000.000.000-00" : "00.000.000/0000-00"}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {formData.type === 'PF' ? 'Nome Completo' : 'Razão Social'}
                      </label>
                      <input 
                        required
                        type="text" 
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                        placeholder={formData.type === 'PF' ? "Ex: João da Silva" : "Empresa Exemplo LTDA"}
                      />
                    </div>

                    {formData.type === 'PJ' && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome Fantasia</label>
                          <input 
                            type="text" 
                            value={formData.tradeName || ''}
                            onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                            className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="Nome da Marca"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Inscrição Estadual</label>
                          <input 
                            type="text" 
                            value={formData.stateRegistration || ''}
                            onChange={(e) => setFormData({ ...formData, stateRegistration: e.target.value })}
                            className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="000.000.000.000"
                          />
                        </div>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">E-mail Principal</label>
                        <input 
                          required
                          type="email" 
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                          placeholder="exemplo@email.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                        <select 
                          value={formData.status || ''}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as Client['status'] })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Inativo">Inativo</option>
                          <option value="Bloqueado">Bloqueado</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Telefone Fixo</label>
                        <input 
                          type="text" 
                          value={formData.phone || ''}
                          onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                          placeholder="(00) 0000-0000"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Celular / WhatsApp</label>
                        <input 
                          required
                          type="text" 
                          value={formData.mobile || ''}
                          onChange={(e) => setFormData({ ...formData, mobile: formatPhone(e.target.value) })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                          placeholder="(00) 90000-0000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Endereço e Contatos */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-[#000666] uppercase tracking-widest border-l-4 border-[#000666] pl-3">Endereço e Localização</h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                          CEP
                          {isFetchingAddress && <span className="text-[10px] text-[#000666] animate-pulse">Buscando...</span>}
                        </label>
                        <input 
                          type="text" 
                          value={formData.zipCode || ''}
                          onChange={(e) => setFormData({ ...formData, zipCode: formatCEP(e.target.value) })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                          placeholder="00000-000"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rua / Logradouro</label>
                        <input 
                          type="text" 
                          value={formData.street || ''}
                          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                          placeholder="Nome da rua"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nº</label>
                        <input 
                          type="text" 
                          value={formData.number || ''}
                          onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                          placeholder="123"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bairro</label>
                        <input 
                          type="text" 
                          value={formData.neighborhood || ''}
                          onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                          placeholder="Bairro"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cidade</label>
                        <input 
                          type="text" 
                          value={formData.city || ''}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                          placeholder="Cidade"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">UF</label>
                        <input 
                          type="text" 
                          maxLength={2}
                          value={formData.state || ''}
                          onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                          className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                          placeholder="SP"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Observações / Complemento</label>
                      <textarea 
                        rows={2}
                        value={formData.notes || ''}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all resize-none"
                        placeholder="Ponto de referência, complemento, etc."
                      />
                    </div>
                  </div>
                </div>

                {formData.type === 'PJ' && (
                  <div className="space-y-4 pt-4 border-t border-[#c6c5d4]/10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-[#000666] uppercase tracking-widest border-l-4 border-[#000666] pl-3">Contatos / Colaboradores</h4>
                      {!isAddingContact && (
                        <button 
                          type="button"
                          onClick={() => {
                            setIsAddingContact(true);
                            setTempContact({ name: '', phone: '', email: '' });
                          }}
                          className="text-[10px] font-bold text-[#000666] bg-[#000666]/5 px-3 py-1.5 rounded-lg hover:bg-[#000666]/10 transition-all flex items-center gap-1.5"
                        >
                          <UserPlus size={12} />
                          Adicionar Colaborador
                        </button>
                      )}
                    </div>
                    
                    {isAddingContact && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-6 bg-[#000666]/5 border border-[#000666]/10 rounded-2xl space-y-4"
                      >
                        <p className="text-[10px] font-bold text-[#000666] uppercase tracking-widest">Novo Colaborador</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input 
                            type="text"
                            placeholder="Nome do Contato"
                            value={tempContact.name || ''}
                            onChange={(e) => setTempContact({ ...tempContact, name: e.target.value })}
                            className="w-full bg-white border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                          />
                          <input 
                            type="text"
                            placeholder="Telefone / Celular"
                            value={tempContact.phone || ''}
                            onChange={(e) => setTempContact({ ...tempContact, phone: formatPhone(e.target.value) })}
                            className="w-full bg-white border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                          />
                          <input 
                            type="email"
                            placeholder="E-mail"
                            value={tempContact.email || ''}
                            onChange={(e) => setTempContact({ ...tempContact, email: e.target.value })}
                            className="w-full bg-white border-none rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                          />
                        </div>
                        <div className="flex gap-3 justify-end">
                          <button 
                            type="button"
                            onClick={() => setIsAddingContact(false)}
                            className="px-4 py-2 bg-white text-slate-500 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
                          >
                            <X size={14} />
                            Cancelar
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              if (tempContact.name.trim()) {
                                setFormData({
                                  ...formData,
                                  contacts: [...formData.contacts, tempContact]
                                });
                                setIsAddingContact(false);
                              }
                            }}
                            className="px-4 py-2 bg-[#000666] text-white text-xs font-bold rounded-lg hover:bg-[#000666]/90 transition-all flex items-center gap-1.5"
                          >
                            <Check size={14} />
                            Confirmar Contato
                          </button>
                        </div>
                      </motion.div>
                    )}
                    
                    {formData.contacts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.contacts.map((contact, index) => (
                          <div key={index} className="p-4 bg-[#f5f2fb] rounded-2xl relative group/contact border border-transparent hover:border-[#000666]/10 transition-all">
                            <button 
                              type="button"
                              onClick={() => {
                                const newContacts = [...formData.contacts];
                                newContacts.splice(index, 1);
                                setFormData({ ...formData, contacts: newContacts });
                              }}
                              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover/contact:opacity-100 transition-all bg-white rounded-lg shadow-sm"
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#000666] font-bold text-xs shadow-sm">
                                {contact.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#1b1b21] truncate">{contact.name}</p>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <MessageCircle size={10} />
                                    {contact.phone || '---'}
                                  </p>
                                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <Mail size={10} />
                                    {contact.email || '---'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center border-2 border-dashed border-[#c6c5d4]/20 rounded-2xl bg-slate-50/50">
                        <p className="text-xs text-slate-400 font-medium">Nenhum colaborador cadastrado para esta empresa</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-[#c6c5d4]/15 flex gap-4 bg-[#f5f2fb] shrink-0">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-8 py-4 rounded-2xl font-bold text-sm text-slate-500 hover:bg-white transition-all border border-transparent hover:border-slate-200"
                >
                  Descartar Alterações
                </button>
                <button 
                  type="submit"
                  className="flex-[2] px-8 py-4 bg-[#000666] text-white rounded-2xl font-bold text-sm shadow-xl shadow-[#000666]/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  {editingClient ? 'Salvar Alterações do Cliente' : 'Finalizar Cadastro de Cliente'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
