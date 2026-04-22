"use client";

import React from 'react';
import { 
  X, 
  Check, 
  AlertCircle, 
  Truck, 
  Calendar, 
  DollarSign, 
  FileText,
  User,
  MapPin,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Transaction, Supplier } from '@/src/types';

interface XMLPayableData {
  invoiceNumber: string;
  emissionDate: string;
  totalValue: number;
  supplier: {
    name: string;
    cnpj: string;
    ie: string;
    phone: string;
    email: string;
    address: {
      street: string;
      number: string;
      neighborhood: string;
      city: string;
      state: string;
      zip: string;
    }
  };
  installments: {
    number: string;
    dueDate: string;
    value: number;
    status: 'Pendente' | 'Pago';
  }[];
}

interface XMLImportPayableModalProps {
  isOpen: boolean;
  onClose: () => void;
  xmlData: XMLPayableData | null;
  onConfirm: (data: XMLPayableData) => void;
  existingSuppliers: Supplier[];
  existingTransactions: Transaction[];
}

export default function XMLImportPayableModal({ 
  isOpen, 
  onClose, 
  xmlData, 
  onConfirm,
  existingSuppliers,
  existingTransactions
}: XMLImportPayableModalProps) {
  const [editedData, setEditedData] = React.useState<XMLPayableData | null>(null);

  React.useEffect(() => {
    if (xmlData) {
      setEditedData(xmlData);
    }
  }, [xmlData]);

  if (!editedData) return null;

  const existingSupplier = existingSuppliers.find(s => 
    s.document.replace(/\D/g, '') === editedData.supplier.cnpj.replace(/\D/g, '')
  );

  const isDuplicateInvoice = existingTransactions.some(tx => 
    tx.notes?.includes(`NF ${editedData.invoiceNumber}`) && 
    tx.entity === editedData.supplier.name
  );

  const handleConfirm = () => {
    if (isDuplicateInvoice) {
      alert(`A Nota Fiscal ${editedData.invoiceNumber} já foi importada anteriormente.`);
      return;
    }
    onConfirm(editedData);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#ba1a1a] text-white rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#ba1a1a]">Conferência de Importação XML</h3>
                  <p className="text-xs text-slate-500 font-medium">Nota Fiscal: {editedData.invoiceNumber}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Supplier Info */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-[#ba1a1a]">
                  <Truck size={18} />
                  <h4 className="font-bold uppercase tracking-wider text-sm">Dados do Fornecedor</h4>
                </div>
                
                {isDuplicateInvoice && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-red-500 text-white rounded-lg">
                      <AlertCircle size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-800">Nota Fiscal já importada</p>
                      <p className="text-xs text-red-600">Esta NF ({editedData.invoiceNumber}) já possui lançamentos no sistema.</p>
                    </div>
                  </div>
                )}

                {existingSupplier ? (
                  <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-green-500 text-white rounded-lg">
                      <Check size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-800">Fornecedor já cadastrado</p>
                      <p className="text-xs text-green-600">Os dados serão atualizados se houver divergência.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-blue-500 text-white rounded-lg">
                      <Info size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-800">Novo Fornecedor</p>
                      <p className="text-xs text-blue-600">Um novo cadastro será criado automaticamente.</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome / Razão Social</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        value={editedData.supplier.name}
                        onChange={(e) => setEditedData({
                          ...editedData,
                          supplier: { ...editedData.supplier, name: e.target.value }
                        })}
                        className="w-full pl-9 pr-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CNPJ</label>
                    <input 
                      type="text" 
                      value={editedData.supplier.cnpj}
                      readOnly
                      className="w-full px-4 py-2 bg-slate-100 border-none rounded-xl text-sm font-bold text-slate-500 outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inscrição Estadual</label>
                    <input 
                      type="text" 
                      value={editedData.supplier.ie}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        supplier: { ...editedData.supplier, ie: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Telefone</label>
                    <input 
                      type="text" 
                      value={editedData.supplier.phone}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        supplier: { ...editedData.supplier, phone: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">E-mail</label>
                    <input 
                      type="text" 
                      value={editedData.supplier.email}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        supplier: { ...editedData.supplier, email: e.target.value }
                      })}
                      className="w-full px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CEP</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        value={editedData.supplier.address.zip}
                        onChange={(e) => setEditedData({
                          ...editedData,
                          supplier: { 
                            ...editedData.supplier, 
                            address: { ...editedData.supplier.address, zip: e.target.value } 
                          }
                        })}
                        className="w-full pl-9 pr-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                      />
                    </div>
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Logradouro</label>
                    <input 
                      type="text" 
                      value={editedData.supplier.address.street}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        supplier: { 
                          ...editedData.supplier, 
                          address: { ...editedData.supplier.address, street: e.target.value } 
                        }
                      })}
                      className="w-full px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Número</label>
                    <input 
                      type="text" 
                      value={editedData.supplier.address.number}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        supplier: { 
                          ...editedData.supplier, 
                          address: { ...editedData.supplier.address, number: e.target.value } 
                        }
                      })}
                      className="w-full px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bairro</label>
                    <input 
                      type="text" 
                      value={editedData.supplier.address.neighborhood}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        supplier: { 
                          ...editedData.supplier, 
                          address: { ...editedData.supplier.address, neighborhood: e.target.value } 
                        }
                      })}
                      className="w-full px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                    />
                  </div>
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cidade</label>
                    <input 
                      type="text" 
                      value={editedData.supplier.address.city}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        supplier: { 
                          ...editedData.supplier, 
                          address: { ...editedData.supplier.address, city: e.target.value } 
                        }
                      })}
                      className="w-full px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado (UF)</label>
                    <input 
                      type="text" 
                      value={editedData.supplier.address.state}
                      onChange={(e) => setEditedData({
                        ...editedData,
                        supplier: { 
                          ...editedData.supplier, 
                          address: { ...editedData.supplier.address, state: e.target.value } 
                        }
                      })}
                      className="w-full px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* Financial Info */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-[#ba1a1a]">
                  <DollarSign size={18} />
                  <h4 className="font-bold uppercase tracking-wider text-sm">Dados Financeiros</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-[#ba1a1a]/5 rounded-3xl border border-[#ba1a1a]/10">
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total da Nota</p>
                    <p className="text-2xl font-black text-[#ba1a1a]">
                      R$ {editedData.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data de Emissão</p>
                    <p className="text-lg font-bold text-[#1b1b21]">{editedData.emissionDate}</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Parcelas</p>
                    <p className="text-lg font-bold text-[#1b1b21]">{editedData.installments.length}x</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Detalhamento de Parcelas</label>
                  <div className="grid grid-cols-1 gap-2">
                    {editedData.installments.map((inst, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 bg-[#f5f2fb] rounded-2xl border border-transparent hover:border-[#ba1a1a]/20 transition-all">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#ba1a1a] font-bold shadow-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Vencimento</label>
                            <div className="flex items-center gap-2 text-sm font-bold text-[#1b1b21]">
                              <Calendar size={14} className="text-slate-400" />
                              <input 
                                type="text"
                                value={inst.dueDate}
                                onChange={(e) => {
                                  const newInst = [...editedData.installments];
                                  newInst[idx].dueDate = e.target.value;
                                  setEditedData({ ...editedData, installments: newInst });
                                }}
                                className="bg-transparent border-none p-0 focus:ring-0 w-24"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Valor</label>
                            <div className="flex items-center gap-1 text-sm font-bold text-[#ba1a1a]">
                              <span>R$</span>
                              <input 
                                type="number"
                                value={isNaN(inst.value) ? '' : inst.value}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  const newInst = [...editedData.installments];
                                  newInst[idx].value = isNaN(val) ? 0 : val;
                                  setEditedData({ ...editedData, installments: newInst });
                                }}
                                className="bg-transparent border-none p-0 focus:ring-0 w-full"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Status</label>
                            <select 
                              value={inst.status}
                              onChange={(e) => {
                                const newInst = [...editedData.installments];
                                newInst[idx].status = e.target.value as 'Pendente' | 'Pago';
                                setEditedData({ ...editedData, installments: newInst });
                              }}
                              className="w-full bg-transparent border-none p-0 text-sm font-bold text-[#1b1b21] focus:ring-0 outline-none appearance-none cursor-pointer"
                            >
                              <option value="Pendente">Pendente</option>
                              <option value="Pago">Pago</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {editedData.installments.length === 0 && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-amber-500 text-white rounded-lg">
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-800">Nenhuma parcela encontrada</p>
                    <p className="text-xs text-amber-600">O valor total será lançado como uma única parcela para hoje.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-[#f5f2fb] border-t border-[#c6c5d4]/10 flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-4 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirm}
                disabled={isDuplicateInvoice}
                className="flex-[2] py-4 bg-[#ba1a1a] text-white font-bold rounded-2xl shadow-lg shadow-[#ba1a1a]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Check size={20} />
                Confirmar Importação
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
