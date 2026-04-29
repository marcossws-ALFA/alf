"use client";

import React from 'react';
import { 
  FileText, 
  Search, 
  Trash2, 
  Edit2, 
  Calendar, 
  User, 
  CreditCard 
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { ImportedInvoice } from '@/src/types';
import { useFirebase } from '@/src/context/FirebaseContext';

interface ImportedInvoicesListProps {
  invoices: ImportedInvoice[];
}

export default function ImportedInvoicesList({ invoices }: ImportedInvoicesListProps) {
  const { actions } = useFirebase();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredInvoices = invoices.filter(inv => {
    const invoiceNumber = inv?.invoiceNumber?.toLowerCase() || '';
    const issuerName = inv?.issuerName?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return invoiceNumber.includes(search) ||
           issuerName.includes(search) ||
           (inv?.issuerDocument && inv.issuerDocument.includes(searchTerm));
  }).sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este registro de importação? (As transações financeiras geradas não serão removidas automaticamente)')) {
      try {
        await actions.remove('imported_invoices', id);
      } catch (error) {
        console.error('Erro ao excluir fatura importada:', error);
        alert('Erro ao excluir registro.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por número, fornecedor ou CNPJ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#c6c5d4]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
          />
        </div>
        <div className="text-right">
          <span className="px-3 py-1 bg-[#f5f2fb] text-[#000666] text-[10px] font-black rounded-full uppercase tracking-widest">
            {filteredInvoices.length} Notas Encontradas
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#c6c5d4]/10 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-[#c6c5d4]/10">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Número / Data</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fornecedor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Itens</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Importado em</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d4]/10">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#f5f2fb] text-[#000666] flex items-center justify-center">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1b1b21]">NF {inv.invoiceNumber}</p>
                        <p className="text-[10px] text-slate-400 font-medium">Emissão: {inv.date}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <User size={14} className="text-slate-400" />
                       <div>
                         <p className="text-sm font-medium text-slate-600">{inv.issuerName}</p>
                         <p className="text-[10px] text-slate-400">{inv.issuerDocument}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600">{inv.itemsCount || 0} pçs</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-[#000666]">
                    R$ {inv.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Calendar size={12} />
                      {new Date(inv.importedAt).toLocaleString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        className="p-2 hover:bg-[#000666]/10 text-[#000666] rounded-lg transition-all"
                        onClick={() => alert('Edição de metadados da NF em breve.')}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(inv.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FileText size={48} strokeWidth={1} />
                      <p className="text-sm font-medium">Nenhuma nota fiscal importada encontrada.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
