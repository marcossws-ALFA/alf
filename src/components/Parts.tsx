"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2,
  Package,
  AlertTriangle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Hash,
  DollarSign,
  Tag,
  Image as ImageIcon,
  FileCode,
  MapPin,
  Percent,
  Coins,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { cn } from '@/src/lib/utils';
import { Part, Transaction, Supplier } from '@/src/types';
import XMLImportPayableModal from './XMLImportPayableModal';
import { useFirebase } from '@/src/context/FirebaseContext';

const initialParts: Part[] = [
  {
    id: '1',
    name: 'Filtro de Óleo Premium',
    code: 'PART-9920-X',
    additionalCodes: ['FO-9920', 'OIL-FLT-1'],
    category: 'Mecânica',
    stock: 42,
    minStock: 10,
    price: 89.90,
    costPrice: 45.00,
    image: 'https://picsum.photos/seed/filter/200/200'
  },
  {
    id: '2',
    name: 'Pneu Industrial Heavy Duty',
    code: 'PART-TYRE-44',
    additionalCodes: ['PNEU-HD-44'],
    category: 'Rodagem',
    stock: 3,
    minStock: 5,
    price: 1250.00,
    costPrice: 850.00,
    image: 'https://picsum.photos/seed/tyre/200/200'
  },
  {
    id: '3',
    name: 'Kit de Fiação Estrutural',
    code: 'PART-WIRE-SET',
    additionalCodes: ['KIT-EL-01'],
    category: 'Elétrica',
    stock: 15,
    minStock: 5,
    price: 345.50,
    costPrice: 180.00,
    image: 'https://picsum.photos/seed/wire/200/200'
  }
];

interface PartsProps {
  parts: Part[];
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
}

export default function Parts({ 
  parts, 
  setParts, 
  transactions, 
  setTransactions, 
  suppliers, 
  setSuppliers 
}: PartsProps) {
  const { actions } = useFirebase();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isXMLModalOpen, setIsXMLModalOpen] = useState(false);
  const [xmlImportData, setXmlImportData] = useState<any>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingImportParts, setPendingImportParts] = useState<Part[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [globalMarkup, setGlobalMarkup] = useState<number>(0);

  const [categories, setCategories] = useState<string[]>(['Mecânica', 'Elétrica', 'Hidráulica', 'Rodagem']);
  const [brands, setBrands] = useState<string[]>(['Bosch', 'Stihl', 'Husqvarna', 'Toyama', 'Honda']);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const [formData, setFormData] = useState<Partial<Part>>({
    name: '',
    code: '',
    additionalCodes: [],
    category: 'Mecânica',
    stock: 0,
    minStock: 0,
    price: 0,
    costPrice: 0,
    brand: '',
    location: ''
  });

  const filteredParts = (() => {
    // 1. Remover duplicados por Código SKU
    const uniqueList = parts.filter((item, index, self) => {
      const code = item.code?.toUpperCase().trim();
      if (!code) return true;
      return index === self.findIndex((t) => (
        t.code?.toUpperCase().trim() === code
      ));
    });

    // 2. Filtrar por busca
    return uniqueList.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.additionalCodes?.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  })();

  const handleOpenModal = (part?: Part) => {
    if (part) {
      setEditingPart(part);
      setFormData({
        name: part.name || '',
        code: part.code || '',
        additionalCodes: part.additionalCodes || [],
        category: part.category || 'Mecânica',
        stock: part.stock || 0,
        minStock: part.minStock || 0,
        price: part.price || 0,
        costPrice: part.costPrice || 0,
        brand: part.brand || '',
        location: part.location || '',
        image: part.image || ''
      });
    } else {
      setEditingPart(null);
      setFormData({
        name: '',
        code: '',
        additionalCodes: [],
        category: 'Mecânica',
        stock: 0,
        minStock: 0,
        price: 0,
        costPrice: 0,
        brand: '',
        location: '',
        image: ''
      });
    }
    setIsModalOpen(true);
  };

  const generateRandomSKU = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let sku = 'SKU-';
    for (let i = 0; i < 8; i++) {
      sku += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: sku }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar duplicidade (Código ou Nome)
    const codeUpper = formData.code?.toUpperCase().trim();
    const nameUpper = formData.name?.toUpperCase().trim();

    const isDuplicate = parts.some(p => {
      if (editingPart && p.id === editingPart.id) return false;
      
      const hasSameCode = codeUpper && p.code?.toUpperCase().trim() === codeUpper;
      const hasSameName = nameUpper && p.name?.toUpperCase().trim() === nameUpper;
      
      return hasSameCode || hasSameName;
    });

    if (isDuplicate) {
      alert('Erro: Já existe uma peça cadastrada com este Nome ou Código SKU.');
      return;
    }

    const finalData = {
      ...formData,
      additionalCodes: (formData.additionalCodes || []).map(c => c.trim()).filter(c => c !== '')
    };

    try {
      if (editingPart) {
        await actions.update('parts', editingPart.id, finalData);
      } else {
        await actions.add('parts', finalData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving part:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta peça?')) {
      try {
        await actions.remove('parts', id);
      } catch (error) {
        console.error('Error deleting part:', error);
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
        const items = xmlDoc.getElementsByTagName("det");
        const emit = xmlDoc.getElementsByTagName("emit")[0];
        const ide = xmlDoc.getElementsByTagName("ide")[0];
        const total = xmlDoc.getElementsByTagName("total")[0];
        const cobr = xmlDoc.getElementsByTagName("cobr")[0];

        if (!items.length || !emit || !ide || !total) {
          throw new Error("XML Inválido: Tags essenciais não encontradas.");
        }

        // Extract Parts
        const imported: Part[] = [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const prod = item.getElementsByTagName("prod")[0];
          
          if (prod) {
            const rawName = prod.getElementsByTagName("xProd")[0]?.textContent || "Item Importado";
            const xmlCode = prod.getElementsByTagName("cProd")[0]?.textContent || `XML-${Math.random().toString(36).substring(2, 7)}`;
            const stock = parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0");
            const costPrice = parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0");

            // Extrair SKU de 9 dígitos da descrição
            const skuMatch = rawName.match(/\b\d{9}\b/);
            const extractedSku = skuMatch ? skuMatch[0] : null;
            const code = extractedSku || xmlCode;

            const words = rawName.split(/\s+/);
            const extractedCodes: string[] = [];
            const nameWords: string[] = [];

            words.forEach(word => {
              // Se for o SKU extraído, não adiciona ao nome
              if (extractedSku && word.includes(extractedSku)) {
                return;
              }
              nameWords.push(word);
            });

            const cleanName = nameWords.join(' ').trim() || rawName;

            imported.push({
              id: Math.random().toString(36).substring(2, 11),
              name: cleanName,
              code,
              additionalCodes: extractedCodes,
              category: 'Mecânica',
              stock,
              minStock: 0,
              costPrice,
              price: costPrice,
              image: ''
            });
          }
        }

        // Extract Financial Data
        const supplierData = {
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

        if (imported.length > 0) {
          setPendingImportParts(imported);
          setSelectedImportIds(new Set(imported.map(p => p.id)));
          setXmlImportData({
            invoiceNumber,
            emissionDate,
            totalValue,
            supplier: supplierData,
            installments
          });
          setIsImportModalOpen(true);
        } else {
          alert("Nenhum item encontrado no XML. Verifique se é um arquivo de Nota Fiscal válido.");
        }
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
    
    let supplierName = data.supplier.name;

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

      for (const inst of data.installments) {
        await actions.add('transactions', {
          description: `NF ${data.invoiceNumber} - Parcela ${inst.number} (Peças)`,
          entity: supplierName,
          value: inst.value,
          date: new Date().toLocaleDateString('pt-BR'),
          dueDate: inst.dueDate,
          category: 'Fornecedores',
          type: 'Despesa',
          status: inst.status || 'Pendente',
          notes: `Importado via XML da NF ${data.invoiceNumber} no catálogo de peças`
        });
      }

      setIsXMLModalOpen(false);
      setXmlImportData(null);
      alert('Importação financeira e atualização de fornecedor concluídas!');
    } catch (error) {
      console.error('Erro ao importar financeiro do XML:', error);
      alert('Erro ao persistir dados financeiros do XML.');
    }
  };

  const confirmImport = async () => {
    const toImport = pendingImportParts.filter(p => selectedImportIds.has(p.id));
    
    try {
      for (const newPart of toImport) {
        const existingPart = parts.find(p => 
          p.code === newPart.code || 
          p.additionalCodes?.includes(newPart.code)
        );

        if (existingPart) {
          const mergedAdditional = Array.from(new Set([
            ...(existingPart.additionalCodes || []),
            ...(newPart.additionalCodes || [])
          ])).filter(c => c !== existingPart.code);

          await actions.update('parts', existingPart.id, {
            costPrice: newPart.costPrice,
            price: newPart.price,
            stock: (existingPart.stock || 0) + newPart.stock,
            additionalCodes: mergedAdditional
          });
        } else {
          // Remover o ID temporário gerado no import
          const { id, ...partData } = newPart;
          await actions.add('parts', partData);
        }
      }

      setIsImportModalOpen(false);
      setPendingImportParts([]);
      
      // After parts import, trigger financial review
      if (xmlImportData) {
        setIsXMLModalOpen(true);
      } else {
        alert('Importação de peças concluída!');
      }
    } catch (error) {
      console.error('Erro ao importar peças:', error);
      alert('Erro ao salvar as peças no banco de dados.');
    }
  };

  const applyGlobalMarkup = () => {
    if (globalMarkup <= 0) return;
    setPendingImportParts(prev => prev.map(p => ({
      ...p,
      price: p.costPrice ? p.costPrice * (1 + globalMarkup / 100) : p.price
    })));
  };

  const updatePendingPart = (id: string, field: keyof Part, value: any) => {
    setPendingImportParts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      // If cost price or markup changes, we could auto-update price, but let's keep it simple for now
      return updated;
    }));
  };

  const toggleSelectImport = (id: string) => {
    const next = new Set(selectedImportIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedImportIds(next);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold text-[#000666] tracking-tight">Catálogo de Peças</h2>
          <p className="text-slate-500 text-sm font-medium">Gerencie o inventário de peças e componentes.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            id="xml-import" 
            accept=".xml" 
            className="hidden" 
            onChange={handleImportXML}
          />
          <label 
            htmlFor="xml-import"
            className="bg-white text-[#000666] border-2 border-[#000666]/10 px-6 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer hover:bg-[#f5f2fb] transition-all"
          >
            <FileCode size={20} />
            Importar XML
          </label>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#000666] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus size={20} />
            Nova Peça
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total de Itens', value: parts.length, icon: Package, color: 'text-[#000666] bg-[#000666]/10' },
          { label: 'Estoque Baixo', value: parts.filter(p => p.stock <= p.minStock).length, icon: AlertTriangle, color: 'text-[#ba1a1a] bg-[#ba1a1a]/10' },
          { label: 'Valor Total', value: `R$ ${parts.reduce((acc, p) => acc + (p.price * p.stock), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-[#217128] bg-[#a0f399]/30' },
          { label: 'Categorias', value: new Set(parts.map(p => p.category)).size, icon: Tag, color: 'text-[#1b6d24] bg-[#1b6d24]/10' },
        ].map((metric, i) => (
          <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-transparent hover:border-[#c6c5d4]/15 transition-all">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2 text-slate-500">
              <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center", metric.color)}>
                <metric.icon size={18} className="sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">{metric.label}</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#1b1b21]">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-[#c6c5d4]/20 rounded-2xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2 w-full md:w-64">
          <div className="flex items-center bg-white rounded-2xl px-4 py-3 border border-[#c6c5d4]/20 flex-1 shadow-sm">
            <Filter className="text-slate-400 mr-2" size={18} />
            <select className="bg-transparent border-none text-xs w-full text-[#1b1b21] font-bold outline-none cursor-pointer">
              <option>Todas as Categorias</option>
              <option>Mecânica</option>
              <option>Elétrica</option>
              <option>Hidráulica</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#c6c5d4]/10">
        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f5f2fb]">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-500">Peça / Código</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-500">Categoria</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-500 text-right">Estoque</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-500 text-right">Preço Un.</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-slate-500 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d4]/10">
              {filteredParts.map((part) => (
                <tr key={part.id} className="hover:bg-[#f5f2fb]/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#efecf5] overflow-hidden flex items-center justify-center relative shadow-sm border border-white">
                        {part.image ? (
                          <Image 
                            src={part.image} 
                            alt={part.name} 
                            fill
                            className="object-cover" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <Package size={18} className="text-[#8690ee]" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-[#1b1b21] text-sm">{part.name}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <span className="text-[9px] text-slate-500 font-mono bg-slate-100 px-1 rounded">{part.code}</span>
                          {part.additionalCodes?.map((c, idx) => (
                            <span key={idx} className="text-[9px] text-slate-400 font-mono bg-slate-50 px-1 rounded border border-slate-100">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eae7ef] text-[#000666]">
                      {part.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <p className={cn("text-sm font-bold", part.stock <= part.minStock ? "text-[#ba1a1a]" : "text-[#1b1b21]")}>
                        {part.stock} un
                      </p>
                      {part.stock <= part.minStock && (
                        <span className="text-[9px] font-black text-[#ba1a1a] uppercase">Reposição Necessária</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-black text-[#000666]">
                      R$ {part.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleOpenModal(part)}
                        className="p-2 text-slate-400 hover:text-[#000666] hover:bg-[#000666]/5 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(part.id)}
                        className="p-2 text-slate-400 hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/5 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredParts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">Nenhum item encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden p-4 space-y-4 divide-y divide-slate-100 bg-white">
          {filteredParts.map((part) => (
            <div key={part.id} className="pt-4 first:pt-0 pb-4 last:pb-0 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#f5f2fb] overflow-hidden flex items-center justify-center shrink-0 shadow-sm border border-white relative">
                  {part.image ? (
                    <Image src={part.image} alt={part.name} fill className="object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Package size={24} className="text-[#8690ee]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[#1b1b21] leading-tight mb-1 truncate">{part.name}</p>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{part.code}</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 bg-[#eae7ef] text-[#000666] text-[9px] font-black uppercase rounded-md">{part.category}</span>
                    {part.stock <= part.minStock && (
                      <span className="px-2 py-0.5 bg-[#ffdad6] text-[#ba1a1a] text-[9px] font-black uppercase rounded-md">Estoque Baixo</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preço Sugerido</span>
                  <span className="text-lg font-black text-[#000666]">R$ {part.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estoque</span>
                  <span className={cn("text-base font-black", part.stock <= part.minStock ? "text-red-500" : "text-[#1b1b21]")}>{part.stock} un</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button 
                  onClick={() => handleOpenModal(part)}
                  className="flex-1 py-3 bg-[#f5f2fb] text-[#000666] rounded-xl font-bold text-xs hover:bg-[#e0e0ff] transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={14} /> Editar
                </button>
                <button 
                  onClick={() => handleDelete(part.id)}
                  className="px-4 py-3 bg-red-50 text-red-500 rounded-xl font-bold text-xs hover:bg-red-100 transition-all flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {filteredParts.length === 0 && (
            <div className="py-12 text-center text-slate-400 font-bold">Nenhum item disponível.</div>
          )}
        </div>

        <div className="px-6 py-4 flex items-center justify-between bg-white border-t border-[#c6c5d4]/10">
          <span className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Total: {filteredParts.length}</span>
          <div className="flex gap-2">
            <button className="p-2 rounded-xl bg-[#f5f2fb] text-[#1b1b21] disabled:opacity-50 hover:bg-slate-200 transition-all">
              <ChevronLeft size={18} />
            </button>
            <button className="p-2 rounded-xl bg-[#f5f2fb] text-[#1b1b21] hover:bg-slate-200 transition-all">
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
              className="relative w-full h-full sm:h-[90vh] sm:max-w-5xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#000666]">
                      {editingPart ? 'Editar Peça' : 'Nova Peça'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Gerencie as informações detalhadas do item no inventário</p>
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
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nome da Peça</label>
                        <div className="relative">
                          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            required
                            type="text" 
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="Ex: Filtro de Ar"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Código / SKU Principal</label>
                          <button 
                            type="button"
                            onClick={generateRandomSKU}
                            className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                          >
                            <RefreshCw size={10} /> SKU Aleatório
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
                            placeholder="Ex: PART-001"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">SKUs Adicionais</label>
                        <div className="flex flex-wrap gap-2 p-3 bg-[#f5f2fb] rounded-xl min-h-[50px]">
                          {formData.additionalCodes?.map((code, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-[#c6c5d4]/20 shadow-sm">
                              <span className="text-xs font-mono font-bold text-[#000666]">{code}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  const next = [...(formData.additionalCodes || [])];
                                  next.splice(idx, 1);
                                  setFormData({ ...formData, additionalCodes: next });
                                }}
                                className="text-slate-400 hover:text-[#ba1a1a] transition-colors"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <input 
                            type="text"
                            placeholder="Adicionar SKU..."
                            className="flex-1 bg-transparent border-none p-0 text-xs focus:ring-0 outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = e.currentTarget.value.trim();
                                if (val && val !== formData.code && !formData.additionalCodes?.includes(val)) {
                                  setFormData({ 
                                    ...formData, 
                                    additionalCodes: [...(formData.additionalCodes || []), val] 
                                  });
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Pressione Enter para adicionar múltiplos códigos.</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Categoria</label>
                          <button 
                            type="button"
                            onClick={() => { setIsAddingCategory(true); setIsAddingBrand(false); setNewItemName(''); }}
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
                              className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <select 
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                          >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Marca</label>
                          <button 
                            type="button"
                            onClick={() => { setIsAddingBrand(true); setIsAddingCategory(false); setNewItemName(''); }}
                            className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                          >
                            <Plus size={10} /> Nova Marca
                          </button>
                        </div>
                        {isAddingBrand ? (
                          <div className="flex gap-2">
                            <input 
                              autoFocus
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              className="flex-1 px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                              placeholder="Nome da marca..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (newItemName && !brands.includes(newItemName)) {
                                    setBrands(prev => [...prev, newItemName].sort());
                                    setFormData(prev => ({ ...prev, brand: newItemName }));
                                    setIsAddingBrand(false);
                                    setNewItemName('');
                                  }
                                }
                              }}
                            />
                            <button 
                              type="button"
                              onClick={() => {
                                if (newItemName && !brands.includes(newItemName)) {
                                  setBrands(prev => [...prev, newItemName].sort());
                                  setFormData(prev => ({ ...prev, brand: newItemName }));
                                  setIsAddingBrand(false);
                                  setNewItemName('');
                                }
                              }}
                              className="p-2 bg-[#000666] text-white rounded-xl hover:bg-[#000666]/90"
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setIsAddingBrand(false)}
                              className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <select 
                            value={formData.brand}
                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                            className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                          >
                            <option value="">Selecione a marca</option>
                            {brands.map(brand => (
                              <option key={brand} value={brand}>{brand}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Locação / Prateleira</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            value={formData.location || ''}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="Ex: A1-B2"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Seção: Financeiro e Estoque */}
                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-[#000666] uppercase tracking-widest border-l-4 border-[#000666] pl-3">Financeiro e Estoque</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Preço de Custo</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="number" 
                              step="0.01"
                              value={isNaN(formData.costPrice) ? '' : formData.costPrice}
                              onChange={(e) => {
                                const cost = parseFloat(e.target.value);
                                setFormData({ ...formData, costPrice: isNaN(cost) ? 0 : cost });
                              }}
                              className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Margem (%)</label>
                          <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="number" 
                              step="0.1"
                              value={formData.costPrice && formData.price ? (((formData.price - formData.costPrice) / formData.costPrice) * 100).toFixed(1) : 0}
                              onChange={(e) => {
                                const margin = parseFloat(e.target.value) || 0;
                                const cost = formData.costPrice || 0;
                                const newPrice = cost * (1 + margin / 100);
                                setFormData({ ...formData, price: parseFloat(newPrice.toFixed(2)) });
                              }}
                              className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                              placeholder="0.0"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Preço de Venda</label>
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
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Lucro Bruto</label>
                          <div className="relative">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              disabled
                              type="text" 
                              value={formData.price && formData.costPrice ? `R$ ${(formData.price - formData.costPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
                              className="w-full pl-9 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm text-slate-500 font-bold cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estoque Atual</label>
                          <input 
                            required
                            type="number" 
                            value={isNaN(formData.stock) ? '' : formData.stock}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setFormData({ ...formData, stock: isNaN(val) ? 0 : val });
                            }}
                            className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Estoque Mínimo</label>
                          <input 
                            required
                            type="number" 
                            value={isNaN(formData.minStock) ? '' : formData.minStock}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setFormData({ ...formData, minStock: isNaN(val) ? 0 : val });
                            }}
                            className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">URL da Imagem (Opcional)</label>
                        <div className="relative">
                          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input 
                            type="url" 
                            value={formData.image || ''}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                            placeholder="https://exemplo.com/imagem.jpg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-[#c6c5d4]/15 flex gap-4 bg-[#f5f2fb] shrink-0">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-sm text-slate-500 hover:bg-white transition-all border border-transparent hover:border-slate-200"
                  >
                    Descartar Alterações
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] px-8 py-4 bg-[#000666] text-white rounded-2xl font-bold text-sm shadow-xl shadow-[#000666]/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    {editingPart ? 'Salvar Alterações da Peça' : 'Finalizar Cadastro de Peça'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Importação XML */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    <FileCode size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1b1b21]">Conferência de Importação XML</h3>
                    <p className="text-xs text-slate-500">Revise os itens e aplique margens de lucro</p>
                  </div>
                </div>
                <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 bg-white border-b border-[#c6c5d4]/10 flex items-center gap-4">
                <div className="flex-1 flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#000666]" />
                  <span className="text-sm font-bold text-slate-600">Aplicar Margem Global (%):</span>
                  <input 
                    type="number" 
                    value={globalMarkup}
                    onChange={(e) => setGlobalMarkup(parseFloat(e.target.value))}
                    className="w-24 px-3 py-1.5 bg-[#f5f2fb] border-none rounded-lg text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                  />
                  <button 
                    onClick={applyGlobalMarkup}
                    className="bg-[#000666] text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-[#000666]/90 transition-all"
                  >
                    Aplicar
                  </button>
                </div>
                <div className="text-xs font-medium text-slate-400">
                  {selectedImportIds.size} de {pendingImportParts.length} itens selecionados
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#f5f2fb] z-10">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input 
                          type="checkbox" 
                          checked={selectedImportIds.size === pendingImportParts.length}
                          onChange={() => {
                            if (selectedImportIds.size === pendingImportParts.length) setSelectedImportIds(new Set());
                            else setSelectedImportIds(new Set(pendingImportParts.map(p => p.id)));
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-[#000666] focus:ring-[#000666]/20"
                        />
                      </th>
                      <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500">Descrição</th>
                      <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500">SKU / Código</th>
                      <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-right">Qtd</th>
                      <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-right">Custo Un.</th>
                      <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-right">Venda Un.</th>
                      <th className="px-4 py-3 text-[10px] uppercase font-black text-slate-500 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c6c5d4]/10">
                    {pendingImportParts.map((p) => {
                      const exists = parts.some(existing => 
                        existing.code === p.code || 
                        existing.additionalCodes?.includes(p.code)
                      );
                      return (
                        <tr key={p.id} className={cn("hover:bg-[#f5f2fb]/50 transition-colors", !selectedImportIds.has(p.id) && "opacity-50")}>
                          <td className="px-4 py-3">
                            <input 
                              type="checkbox" 
                              checked={selectedImportIds.has(p.id)}
                              onChange={() => toggleSelectImport(p.id)}
                              className="w-4 h-4 rounded border-slate-300 text-[#000666] focus:ring-[#000666]/20"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={p.name}
                              onChange={(e) => updatePendingPart(p.id, 'name', e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-xs font-bold text-[#1b1b21] focus:ring-0 focus:bg-white px-1 rounded"
                            />
                            {p.additionalCodes && p.additionalCodes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.additionalCodes.map((c, idx) => (
                                  <span key={idx} className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200">Extraído: {c}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text" 
                              value={p.code}
                              onChange={(e) => updatePendingPart(p.id, 'code', e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-xs text-slate-600 font-mono focus:ring-0 focus:bg-white px-1 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-xs font-bold text-slate-600">
                            {p.stock}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input 
                              type="number" 
                              value={isNaN(p.costPrice) ? '' : p.costPrice}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updatePendingPart(p.id, 'costPrice', isNaN(val) ? 0 : val);
                              }}
                              className="w-20 bg-transparent border-none p-0 text-xs text-right text-slate-600 focus:ring-0 focus:bg-white px-1 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input 
                              type="number" 
                              value={isNaN(p.price) ? '' : p.price}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                updatePendingPart(p.id, 'price', isNaN(val) ? 0 : val);
                              }}
                              className="w-20 bg-transparent border-none p-0 text-xs text-right font-bold text-[#000666] focus:ring-0 focus:bg-white px-1 rounded"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {exists ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold uppercase">Atualizar</span>
                                <span className="text-[8px] text-blue-600 font-bold">+{p.stock} ao estoque</span>
                              </div>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-bold uppercase">Novo</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-6 bg-slate-50 border-t border-[#c6c5d4]/10 flex justify-end gap-3">
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmImport}
                  disabled={selectedImportIds.size === 0}
                  className="bg-[#000666] text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  Confirmar Importação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <XMLImportPayableModal 
        isOpen={isXMLModalOpen}
        onClose={() => {
          setIsXMLModalOpen(false);
          setXmlImportData(null);
        }}
        xmlData={xmlImportData}
        onConfirm={handleConfirmXMLImport}
        existingSuppliers={suppliers}
        existingTransactions={transactions}
      />
    </motion.div>
  );
}
