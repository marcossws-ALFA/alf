"use client";

import React, { useState } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ChevronRight,
  Mail,
  Phone,
  FileText,
  Download,
  Loader2,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Supplier, Transaction } from '@/src/types';
import { useFirebase } from '@/src/context/FirebaseContext';

interface SuppliersProps {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  transactions: Transaction[];
}

import SupplierFormModal from './SupplierFormModal';
import XMLImportPayableModal from './XMLImportPayableModal';

export default function Suppliers({ suppliers, setSuppliers, transactions }: SuppliersProps) {
  const { actions } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isXMLModalOpen, setIsXMLModalOpen] = useState(false);
  const [xmlImportData, setXmlImportData] = useState<any>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.document.includes(searchTerm)
  );

  const handleOpenModal = (supplier?: Supplier) => {
    setEditingSupplier(supplier || null);
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (supplier: Supplier) => {
    try {
      if (editingSupplier) {
        await actions.update('suppliers', editingSupplier.id, supplier);
      } else {
        await actions.add('suppliers', supplier);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving supplier:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
      try {
        await actions.remove('suppliers', id);
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  };

  const handleImportXML = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const xmlText = event.target?.result as string;
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      try {
        const emit = xmlDoc.getElementsByTagName("emit")[0];
        const ide = xmlDoc.getElementsByTagName("ide")[0];
        const total = xmlDoc.getElementsByTagName("total")[0];
        const cobr = xmlDoc.getElementsByTagName("cobr")[0];

        if (!emit || !ide || !total) {
          throw new Error("XML Inválido: Tags essenciais não encontradas.");
        }

        const supplier = {
          name: emit.getElementsByTagName("xNome")[0]?.textContent || "",
          cnpj: emit.getElementsByTagName("CNPJ")[0]?.textContent || emit.getElementsByTagName("CPF")[0]?.textContent || "",
          ie: emit.getElementsByTagName("IE")[0]?.textContent || "",
          phone: emit.getElementsByTagName("fone")[0]?.textContent || "",
          email: emit.getElementsByTagName("email")[0]?.textContent || "",
          address: {
            street: emit.getElementsByTagName("xLgr")[0]?.textContent || "",
            number: emit.getElementsByTagName("nro")[0]?.textContent || "",
            neighborhood: emit.getElementsByTagName("xBairro")[0]?.textContent || "",
            city: emit.getElementsByTagName("xMun")[0]?.textContent || "",
            state: emit.getElementsByTagName("UF")[0]?.textContent || "",
            zip: emit.getElementsByTagName("CEP")[0]?.textContent || "",
          }
        };

        const invoiceNumber = ide.getElementsByTagName("nNF")[0]?.textContent || "";
        const dhEmi = ide.getElementsByTagName("dhEmi")[0]?.textContent || "";
        const emissionDate = dhEmi ? new Date(dhEmi).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
        const totalValue = parseFloat(total.getElementsByTagName("vNF")[0]?.textContent || "0");

        const installments: any[] = [];
        if (cobr) {
          const dups = cobr.getElementsByTagName("dup");
          for (let i = 0; i < dups.length; i++) {
            const dup = dups[i];
            const dvenc = dup.getElementsByTagName("dVenc")[0]?.textContent || "";
            installments.push({
              number: dup.getElementsByTagName("nDup")[0]?.textContent || `${i+1}`,
              dueDate: dvenc ? new Date(dvenc + 'T12:00:00').toLocaleDateString('pt-BR') : emissionDate,
              value: parseFloat(dup.getElementsByTagName("vDup")[0]?.textContent || "0"),
              status: 'Pendente'
            });
          }
        }

        if (installments.length === 0) {
          installments.push({
            number: "1",
            dueDate: emissionDate,
            value: totalValue,
            status: 'Pendente'
          });
        }

        setXmlImportData({
          invoiceNumber,
          emissionDate,
          totalValue,
          supplier,
          installments
        });
        setIsXMLModalOpen(true);
      } catch (err) {
        alert("Erro ao processar XML: " + (err instanceof Error ? err.message : "Arquivo inválido"));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmXMLImport = async (data: any) => {
    const cnpj = data.supplier.cnpj.replace(/\D/g, '');
    const existingSupplier = suppliers.find(s => s.document.replace(/\D/g, '') === cnpj);
    
    try {
      if (existingSupplier) {
        await actions.update('suppliers', existingSupplier.id, {
          name: data.supplier.name,
          email: data.supplier.email,
          phone: data.supplier.phone,
          street: data.supplier.address.street,
          number: data.supplier.address.number,
          neighborhood: data.supplier.address.neighborhood,
          city: data.supplier.address.city,
          state: data.supplier.address.state,
          zipCode: data.supplier.address.zip,
        });
      } else {
        const newSupplier = {
          name: data.supplier.name,
          document: data.supplier.cnpj,
          email: data.supplier.email,
          phone: data.supplier.phone,
          category: 'Fornecedores',
          status: 'Ativo',
          createdAt: new Date().toLocaleDateString('pt-BR'),
          street: data.supplier.address.street,
          number: data.supplier.address.number,
          neighborhood: data.supplier.address.neighborhood,
          city: data.supplier.address.city,
          state: data.supplier.address.state,
          zipCode: data.supplier.address.zip,
        };
        await actions.add('suppliers', newSupplier);
      }

      setIsXMLModalOpen(false);
      setXmlImportData(null);
      alert('Fornecedor importado/atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao importar fornecedor do XML:', error);
      alert('Erro ao persistir fornecedor.');
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
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-[#000666]">Fornecedores</h1>
            <p className="text-slate-500 text-sm font-medium">Gestão de parceiros e fornecedores de peças.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="flex-1 sm:flex-none">
              <input 
                type="file" 
                id="xml-import-supplier" 
                className="hidden" 
                accept=".xml"
                onChange={handleImportXML}
              />
              <label 
                htmlFor="xml-import-supplier"
                className="w-full px-4 py-2.5 bg-white text-[#000666] text-xs sm:text-sm font-semibold rounded-xl border border-[#000666]/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:bg-slate-50"
              >
                <FileText size={18} /> XML
              </label>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#000666] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-[#000666]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Novo
            </button>
          </div>
        </div>
      </header>

      <section className="bg-white rounded-2xl shadow-sm border border-[#c6c5d4]/10 overflow-hidden">
        <div className="p-6 border-b border-[#c6c5d4]/10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou documento..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#c6c5d4]/20 rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2.5 bg-white border border-[#c6c5d4]/20 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
              <Filter size={18} />
            </button>
            <button className="p-2.5 bg-white border border-[#c6c5d4]/20 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
              <Download size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-[#c6c5d4]/10">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Fornecedor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Contato</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d4]/10">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#000666]/5 flex items-center justify-center text-[#000666]">
                        <Truck size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1b1b21]">{supplier.name}</p>
                        <p className="text-xs text-slate-500">{supplier.document}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Mail size={12} /> {supplier.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Phone size={12} /> {supplier.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      {supplier.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider",
                      supplier.status === 'Ativo' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {supplier.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleOpenModal(supplier)}
                        className="p-2 hover:bg-[#000666]/10 text-[#000666] rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(supplier.id)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={48} strokeWidth={1} />
                      <p className="text-sm font-medium">Nenhum fornecedor encontrado.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SupplierFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSupplier}
        editingSupplier={editingSupplier}
      />

      <XMLImportPayableModal 
        isOpen={isXMLModalOpen}
        onClose={() => setIsXMLModalOpen(false)}
        xmlData={xmlImportData}
        onConfirm={handleConfirmXMLImport}
        existingSuppliers={suppliers}
        existingTransactions={transactions}
      />
    </motion.div>
  );
}
