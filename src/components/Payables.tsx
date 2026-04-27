"use client";

import React from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  TrendingDown, 
  Calendar, 
  ArrowDownRight, 
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
  ShoppingCart,
  Truck,
  Zap,
  UserCheck,
  Wrench as WrenchIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Transaction, Supplier, FixedExpense, ServiceOrder, Mechanic, Seller } from '@/src/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SupplierFormModal from './SupplierFormModal';
import { useFirebase } from '@/src/context/FirebaseContext';
import XMLImportPayableModal from './XMLImportPayableModal';

interface PayablesProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  fixedExpenses: FixedExpense[];
  setFixedExpenses: React.Dispatch<React.SetStateAction<FixedExpense[]>>;
  orders: ServiceOrder[];
  mechanics: Mechanic[];
  sellers: Seller[];
  onBack: () => void;
  onOpenOS?: (osId: string) => void;
  onUnsavedChanges?: (hasChanges: boolean) => void;
}

export default function Payables({ 
  transactions, 
  setTransactions, 
  suppliers, 
  setSuppliers, 
  fixedExpenses,
  setFixedExpenses,
  orders,
  mechanics,
  sellers,
  onBack, 
  onOpenOS,
  onUnsavedChanges
}: PayablesProps) {
  const { actions } = useFirebase();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'Todos' | 'Pago' | 'Pendente' | 'Vencido'>('Todos');
  const [activeTab, setActiveTab] = React.useState<'lancamentos' | 'fixas' | 'comissoes'>('lancamentos');

  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = React.useState(false);
  const [isXMLModalOpen, setIsXMLModalOpen] = React.useState(false);
  const [isFixedModalOpen, setIsFixedModalOpen] = React.useState(false);

  // Track if there are unsaved imports
  React.useEffect(() => {
    if (onUnsavedChanges) {
      onUnsavedChanges(isXMLModalOpen || isAddModalOpen || isSupplierModalOpen || isFixedModalOpen);
    }
    return () => {
      if (onUnsavedChanges) onUnsavedChanges(false);
    };
  }, [isXMLModalOpen, isAddModalOpen, isSupplierModalOpen, isFixedModalOpen, onUnsavedChanges]);
  const [editingFixed, setEditingFixed] = React.useState<FixedExpense | null>(null);
  
  const [xmlImportData, setXmlImportData] = React.useState<any>(null);
  const [editingTx, setEditingTx] = React.useState<Transaction | null>(null);
  const [editFormData, setEditFormData] = React.useState({
    status: 'Pendente' as Transaction['status'],
    dueDate: '',
    notes: ''
  });

  const [fixedFormData, setFixedFormData] = React.useState({
    description: '',
    category: 'Infraestrutura',
    entity: '',
    value: '',
    dueDay: '10'
  });

  const [addFormData, setAddFormData] = React.useState({
    description: '',
    entity: '',
    value: '',
    dueDate: new Date().toLocaleDateString('pt-BR'),
    category: 'Fornecedores',
    status: 'Pendente' as Transaction['status'],
    notes: ''
  });

  const payables = transactions.filter(tx => tx.type === 'Despesa');

  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const dueDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const getEffectiveStatus = (tx: Transaction) => {
    if (tx.status === 'Pago' || tx.status === 'Cancelado') return tx.status;
    if (isOverdue(tx.dueDate)) return 'Vencido';
    return tx.status;
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditFormData({
      status: tx.status,
      dueDate: tx.dueDate,
      notes: tx.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    try {
      await actions.update('transactions', editingTx.id, { 
        status: editFormData.status, 
        dueDate: editFormData.dueDate,
        notes: editFormData.notes,
        paymentDate: editFormData.status === 'Pago' ? new Date().toLocaleDateString('pt-BR') : editingTx.paymentDate
      });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Erro ao salvar alteração.');
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

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTx = {
      description: addFormData.description,
      entity: addFormData.entity,
      value: parseFloat(addFormData.value.replace(',', '.')),
      date: new Date().toLocaleDateString('pt-BR'),
      dueDate: addFormData.dueDate,
      category: addFormData.category,
      type: 'Despesa' as const,
      status: addFormData.status,
      notes: addFormData.notes,
      paymentDate: addFormData.status === 'Pago' ? new Date().toLocaleDateString('pt-BR') : undefined
    };

    try {
      await actions.add('transactions', newTx);
      setIsAddModalOpen(false);
      setAddFormData({
        description: '',
        entity: '',
        value: '',
        dueDate: new Date().toLocaleDateString('pt-BR'),
        category: 'Fornecedores',
        status: 'Pendente',
        notes: ''
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Erro ao adicionar transação.');
    }
  };

  const handleSaveNewSupplier = async (supplier: Supplier) => {
    try {
      await actions.add('suppliers', supplier);
      setAddFormData(prev => ({ ...prev, entity: supplier.name }));
      setIsSupplierModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      alert('Erro ao persistir fornecedor no banco de dados.');
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
    
    let supplierName = data.supplier.name;

    try {
      const supplierData = {
        name: data.supplier.name,
        email: data.supplier.email,
        phone: data.supplier.phone,
        street: data.supplier.address.street,
        number: data.supplier.address.number,
        neighborhood: data.supplier.address.neighborhood,
        city: data.supplier.address.city,
        state: data.supplier.address.state,
        zipCode: data.supplier.address.zip,
        updatedAt: new Date().toISOString()
      };

      if (existingSupplier && existingSupplier.id && existingSupplier.id.length > 5) {
        try {
          console.log(`Atualizando fornecedor: ${existingSupplier.name}`);
          await actions.update('suppliers', existingSupplier.id, supplierData);
        } catch (error: any) {
          if (error.message?.includes('not-found') || error.code === 'not-found') {
            await actions.add('suppliers', {
              ...supplierData,
              document: data.supplier.cnpj,
              category: 'Fornecedores',
              status: 'Ativo',
              createdAt: new Date().toLocaleDateString('pt-BR')
            });
          } else {
            throw error;
          }
        }
      } else {
        await actions.add('suppliers', {
          ...supplierData,
          document: data.supplier.cnpj,
          category: 'Fornecedores',
          status: 'Ativo',
          createdAt: new Date().toLocaleDateString('pt-BR')
        });
      }

      for (const inst of data.installments) {
        await actions.add('transactions', {
          description: `NF ${data.invoiceNumber} - Parcela ${inst.number}`,
          entity: supplierName,
          value: inst.value,
          date: new Date().toLocaleDateString('pt-BR'),
          dueDate: inst.dueDate,
          category: 'Fornecedores',
          type: 'Despesa',
          status: inst.status || 'Pendente',
          notes: `Importado via XML da NF ${data.invoiceNumber}`,
          createdAt: new Date().toISOString()
        });
      }

      setIsXMLModalOpen(false);
      setXmlImportData(null);
      alert('Importação XML realizada com sucesso!');
    } catch (error) {
      console.error('Erro ao importar XML:', error);
      alert('Erro ao persistir dados do XML.');
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const title = 'Relatório de Contas a Pagar';
    
    doc.setFontSize(18);
    doc.setTextColor(186, 26, 26); // #ba1a1a
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    doc.text(`Total a Pagar: R$ ${totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 35);
    doc.text(`Total Pago: R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 40);

    const tableData = filteredPayables.map(tx => [
      tx.description,
      tx.entity,
      tx.dueDate,
      getEffectiveStatus(tx),
      `R$ ${tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Descrição', 'Fornecedor', 'Vencimento', 'Status', 'Valor']],
      body: tableData,
      headStyles: { fillColor: [186, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [255, 248, 247] },
      margin: { top: 50 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`relatorio-pagaveis-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredPayables = payables.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tx.entity.toLowerCase().includes(searchTerm.toLowerCase());
    const effectiveStatus = getEffectiveStatus(tx);
    const matchesStatus = statusFilter === 'Todos' || effectiveStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddFixedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const fixedData = {
      description: fixedFormData.description,
      category: fixedFormData.category,
      entity: fixedFormData.entity,
      value: parseFloat(fixedFormData.value.replace(',', '.')),
      dueDay: parseInt(fixedFormData.dueDay, 10)
    };

    try {
      if (editingFixed) {
        await actions.update('fixed_expenses', editingFixed.id, fixedData);
      } else {
        await actions.add('fixed_expenses', fixedData);
      }
      setIsFixedModalOpen(false);
      setEditingFixed(null);
      setFixedFormData({
        description: '',
        category: 'Infraestrutura',
        entity: '',
        value: '',
        dueDay: '10'
      });
    } catch (error) {
      console.error('Erro ao salvar conta fixa:', error);
      alert('Erro ao salvar conta fixa.');
    }
  };

  const handleLaunchFixed = async () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const monthStr = month < 10 ? `0${month}` : month;

    const toLaunch = fixedExpenses.filter(f => {
      const dueDayStr = f.dueDay < 10 ? `0${f.dueDay}` : f.dueDay;
      const dueDateStr = `${dueDayStr}/${monthStr}/${year}`;
      return !transactions.some(t => 
        t.isFixed && 
        t.description === f.description && 
        t.dueDate === dueDateStr
      );
    });

    if (toLaunch.length === 0) {
      alert('Todas as contas fixas deste mês já foram lançadas.');
      return;
    }

    try {
      for (const f of toLaunch) {
        const dueDayStr = f.dueDay < 10 ? `0${f.dueDay}` : f.dueDay;
        const dueDate = `${dueDayStr}/${monthStr}/${year}`;
        
        await actions.add('transactions', {
          description: f.description,
          entity: f.entity,
          value: f.value,
          date: today.toLocaleDateString('pt-BR'),
          dueDate: dueDate,
          category: f.category,
          type: 'Despesa',
          status: 'Pendente',
          isFixed: true,
          notes: 'Lançamento automático de conta fixa'
        });
      }
      alert(`${toLaunch.length} contas fixas lançadas com sucesso!`);
    } catch (error) {
      console.error('Erro ao lançar contas fixas:', error);
      alert('Erro ao lançar algumas contas.');
    }
  };

  const handleDeleteFixed = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta conta fixa?')) {
      try {
        await actions.remove('fixed_expenses', id);
      } catch (error) {
        console.error('Error deleting fixed expense:', error);
        alert('Erro ao excluir conta fixa.');
      }
    }
  };

  const handleOpenEditFixed = (fixed: FixedExpense) => {
    setEditingFixed(fixed);
    setFixedFormData({
      description: fixed.description,
      category: fixed.category,
      entity: fixed.entity,
      value: fixed.value.toString().replace('.', ','),
      dueDay: fixed.dueDay.toString()
    });
    setIsFixedModalOpen(true);
  };

  const commissions = React.useMemo(() => {
    const list: any[] = [];
    
    // Mechanics Commissions
    orders.filter(o => o.status === 'CONCLUIDO' && o.technician).forEach(order => {
      const mechanic = mechanics.find(m => m.name === order.technician);
      if (mechanic && mechanic.commission) {
        const commissionId = `mech-${order.id}`;
        // Check if already launched
        const isLaunched = transactions.some(t => t.referenceId === commissionId);
        if (isLaunched) return;

        // Base value for mechanic commission is only services total
        const servicesTotal = (order.services || []).reduce((acc, s) => {
          const price = parseFloat(s.totalPrice.replace(/[^\d,]/g, '').replace(',', '.') || '0');
          return acc + price;
        }, 0);

        const commissionValue = (servicesTotal * mechanic.commission) / 100;
        
        list.push({
          id: commissionId,
          personName: mechanic.name,
          role: 'Mecânico',
          reference: `O.S. #${order.number}`,
          baseValue: servicesTotal,
          commissionPercent: mechanic.commission,
          commissionValue: commissionValue,
          date: order.completionDate || order.createdAt,
          status: 'Pendente'
        });
      }
    });

    // Sellers Commissions
    orders.filter(o => o.status === 'CONCLUIDO' && o.seller).forEach(order => {
      const seller = sellers.find(s => s.name === order.seller);
      if (seller && seller.commission) {
        const commissionId = `sell-${order.id}`;
        // Check if already launched
        const isLaunched = transactions.some(t => t.referenceId === commissionId);
        if (isLaunched) return;

        const totalValue = parseFloat(order.total.replace(/[^\d,]/g, '').replace(',', '.'));
        const commissionValue = (totalValue * seller.commission) / 100;
        
        list.push({
          id: commissionId,
          personName: seller.name,
          role: 'Vendedor',
          reference: `O.S. #${order.number}`,
          baseValue: totalValue,
          commissionPercent: seller.commission,
          commissionValue: commissionValue,
          date: order.completionDate || order.createdAt,
          status: 'Pendente'
        });
      }
    });

    return list;
  }, [orders, mechanics, sellers, transactions]);

  const totalPayable = payables
    .filter(tx => {
      const status = getEffectiveStatus(tx);
      return status === 'Pendente' || status === 'Vencido';
    })
    .reduce((acc, tx) => acc + tx.value, 0);

  const totalPaid = payables
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
              <h1 className="text-2xl md:text-4xl font-black tracking-tight text-[#ba1a1a]">Contas a Pagar</h1>
              <p className="text-slate-500 text-sm font-medium">Gestão de despesas e obrigações financeiras.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-[#ba1a1a] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#ba1a1a]/20"
            >
              <Plus size={18} /> Novo
            </button>
            <div className="flex-1 sm:flex-none">
              <input 
                type="file" 
                id="xml-import" 
                className="hidden" 
                accept=".xml"
                onChange={handleImportXML}
              />
              <label 
                htmlFor="xml-import"
                className="w-full px-4 py-2.5 bg-white text-[#ba1a1a] text-xs sm:text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-[#ba1a1a]/20 cursor-pointer"
              >
                <FileText size={18} /> XML
              </label>
            </div>
            <button 
              onClick={generatePDF}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-[#ba1a1a] text-xs sm:text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border border-[#ba1a1a]/20"
            >
              <Download size={18} /> PDF
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-[#f5f2fb] rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('lancamentos')}
          className={cn(
            "flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'lancamentos' ? "bg-white text-[#000666] shadow-sm" : "text-slate-500 hover:text-[#000666]"
          )}
        >
          Lançamentos
        </button>
        <button 
          onClick={() => setActiveTab('fixas')}
          className={cn(
            "flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'fixas' ? "bg-white text-[#ba1a1a] shadow-sm" : "text-slate-500 hover:text-[#ba1a1a]"
          )}
        >
          Contas Fixas
        </button>
        <button 
          onClick={() => setActiveTab('comissoes')}
          className={cn(
            "flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'comissoes' ? "bg-white text-[#000666] shadow-sm" : "text-slate-500 hover:text-[#000666]"
          )}
        >
          Comissões
        </button>
      </div>

      {activeTab === 'lancamentos' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c6c5d4]/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-xl">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total a Pagar</p>
                  <h3 className="text-2xl font-black text-[#1b1b21]">R$ {totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#ba1a1a] h-full" style={{ width: '45%' }}></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c6c5d4]/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-[#000666]/10 text-[#000666] rounded-xl">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Pago</p>
                  <h3 className="text-2xl font-black text-[#1b1b21]">R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#000666] h-full" style={{ width: '90%' }}></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#c6c5d4]/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-[#ffdad6] text-[#ba1a1a] rounded-xl">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vencidos</p>
                  <h3 className="text-2xl font-black text-[#ba1a1a]">
                    R$ {payables.filter(t => getEffectiveStatus(t) === 'Vencido').reduce((acc, t) => acc + t.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Evite multas e juros</p>
            </div>
          </div>

          {/* List Section */}
          <section className="bg-white rounded-3xl shadow-sm border border-[#c6c5d4]/10 overflow-hidden">
            <div className="p-6 border-b border-[#c6c5d4]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-lg text-[#1b1b21]">Fluxo de Pagamentos</h3>
                <span className="px-3 py-1 bg-[#f5f2fb] text-[#000666] text-[10px] font-black rounded-full uppercase tracking-widest">
                  {filteredPayables.length} Lançamentos
                </span>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar fornecedor ou descrição..."
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
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fornecedor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Vencimento</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c6c5d4]/10">
                  {filteredPayables.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className={cn(
                        "hover:bg-[#f5f2fb]/30 transition-colors group",
                        (tx.referenceId && onOpenOS) && "cursor-pointer"
                      )}
                      onClick={() => (tx.referenceId && onOpenOS) && onOpenOS(tx.referenceId)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            tx.isFixed ? "bg-[#f5f2fb] text-[#000666]" : "bg-[#ffdad6] text-[#ba1a1a]"
                          )}>
                            {tx.isFixed ? <Clock size={16} /> : <ArrowDownRight size={16} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1b1b21]">{tx.description}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{tx.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-600">{tx.entity}</p>
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
                          getEffectiveStatus(tx) === 'Pago' ? "bg-[#a0f399] text-[#005312]" : 
                          getEffectiveStatus(tx) === 'Pendente' ? "bg-[#f5f2fb] text-slate-500" : 
                          "bg-[#ffdad6] text-[#93000a]"
                        )}>
                          {getEffectiveStatus(tx)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-black text-[#ba1a1a]">R$ {tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(tx);
                            }}
                            className="p-2 hover:bg-[#ba1a1a]/10 text-[#ba1a1a] rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(tx.id);
                            }}
                            className="p-2 hover:bg-[#ba1a1a]/10 text-[#ba1a1a] rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPayables.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <Search size={48} strokeWidth={1} />
                          <p className="text-sm font-medium">Nenhuma conta a pagar encontrada com os filtros atuais.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : activeTab === 'fixas' ? (
        <section className="bg-white rounded-3xl shadow-sm border border-[#c6c5d4]/10 overflow-hidden">
          <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-[#1b1b21]">Gestão de Contas Fixas</h3>
              <p className="text-xs text-slate-500 font-medium">Contas que se repetem todos os meses</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleLaunchFixed}
                className="px-5 py-2.5 bg-[#000666] text-white text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-[#000666]/20"
              >
                <Zap size={18} /> Lançar Contas do Mês
              </button>
              <button 
                onClick={() => {
                  setEditingFixed(null);
                  setFixedFormData({
                    description: '',
                    category: 'Infraestrutura',
                    entity: '',
                    value: '',
                    dueDay: '10'
                  });
                  setIsFixedModalOpen(true);
                }}
                className="px-5 py-2.5 bg-[#ba1a1a] text-white text-sm font-semibold rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-[#ba1a1a]/20"
              >
                <Plus size={18} /> Nova Conta Fixa
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f5f2fb]/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fornecedor</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Dia Venc.</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d4]/10">
                {fixedExpenses.map((f) => (
                  <tr key={f.id} className="hover:bg-[#f5f2fb]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#f5f2fb] text-[#000666] rounded-lg">
                          <Clock size={16} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1b1b21]">{f.description}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{f.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-600">{f.entity}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                        Todo dia {f.dueDay}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-black text-[#ba1a1a]">R$ {f.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleOpenEditFixed(f)}
                          className="p-2 hover:bg-[#ba1a1a]/10 text-[#ba1a1a] rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteFixed(f.id)}
                          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {fixedExpenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <p className="text-sm">Nenhuma conta fixa cadastrada.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="space-y-6">
          {/* Summary Cards by Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(
              commissions.reduce((acc, curr) => {
                if (!acc[curr.personName]) {
                  acc[curr.personName] = { 
                    value: 0, 
                    role: curr.role,
                    count: 0
                  };
                }
                acc[curr.personName].value += curr.commissionValue;
                acc[curr.personName].count += 1;
                return acc;
              }, {} as Record<string, { value: number; role: string; count: number }>)
            ).map(([name, data]: [string, any]) => (
              <motion.div 
                key={name} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-5 rounded-2xl border border-[#c6c5d4]/10 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    data.role === 'Mecânico' ? "bg-[#f5f2fb] text-[#000666]" : "bg-[#fff8f7] text-[#ba1a1a]"
                  )}>
                    {data.role === 'Mecânico' ? <WrenchIcon size={18} /> : <UserCheck size={18} />}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                    data.role === 'Mecânico' ? "bg-[#f5f2fb] text-[#000666]" : "bg-[#fff8f7] text-[#ba1a1a]"
                  )}>
                    {data.role}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1b1b21] truncate mb-1">{name}</p>
                  <p className="text-2xl font-black text-[#1b1b21] tracking-tight">
                    R$ {data.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{data.count} pendentes</p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {commissions.length === 0 && (
              <div className="col-span-full bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                <p className="text-slate-400 text-sm font-medium">Nenhuma comissão pendente para exibir no resumo.</p>
              </div>
            )}
          </div>

          <section className="bg-white rounded-3xl shadow-sm border border-[#c6c5d4]/10 overflow-hidden">
            <div className="p-6 border-b border-[#c6c5d4]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-[#1b1b21]">Detalhamento de Comissões</h3>
                <p className="text-xs text-slate-500 font-medium">Lista individual de comissões por Ordem de Serviço</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#f5f2fb] rounded-xl border border-[#c6c5d4]/10 self-start sm:self-auto">
                <TrendingDown className="text-[#ba1a1a]" size={16} />
                <span className="text-xs font-bold text-slate-600">Total Geral: </span>
                <span className="text-sm font-black text-[#ba1a1a]">
                  R$ {commissions.reduce((acc, c) => acc + c.commissionValue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f5f2fb]/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Colaborador</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Referência</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor Base</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">%</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Comissão</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d4]/10">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-[#f5f2fb]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          c.role === 'Mecânico' ? "bg-[#f5f2fb] text-[#000666]" : "bg-[#fff8f7] text-[#ba1a1a]"
                        )}>
                          {c.role === 'Mecânico' ? <WrenchIcon size={16} /> : <UserCheck size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1b1b21]">{c.personName}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{c.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-600">{c.reference}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar size={14} />
                        {c.date}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-medium text-slate-500">R$ {c.baseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold">
                        {c.commissionPercent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-black text-[#000666]">R$ {c.commissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={async () => {
                          const today = new Date();
                          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                          const dueDateStr = lastDay.toLocaleDateString('pt-BR');

                          try {
                            await actions.add('transactions', {
                              description: `Comissão - ${c.reference}`,
                              entity: c.personName,
                              value: c.commissionValue,
                              date: today.toLocaleDateString('pt-BR'),
                              dueDate: dueDateStr,
                              category: 'Salários',
                              type: 'Despesa',
                              status: 'Pendente',
                              referenceId: c.id,
                              notes: `Comissão de ${c.role} referente à ${c.reference}`
                            });
                            alert('Pagamento de comissão lançado com sucesso!');
                          } catch (error) {
                            console.error('Erro ao lançar comissão:', error);
                            alert('Erro ao lançar pagamento de comissão.');
                          }
                        }}
                        className="px-4 py-2 bg-[#000666] text-white text-[10px] font-bold rounded-xl hover:bg-[#000666]/90 transition-all shadow-sm"
                      >
                        Lançar Pagamento
                      </button>
                    </td>
                  </tr>
                ))}
                {commissions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <p className="text-sm">Nenhuma comissão pendente encontrada.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-[#ba1a1a]/10 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#fff8f7]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#ba1a1a] text-white rounded-xl">
                    <Plus size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-[#ba1a1a]">Novo Pagamento Manual</h3>
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
                      className="w-full px-4 py-3 bg-[#fff8f7] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                      placeholder="Ex: Aluguel, Energia, Compra de Peças..."
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fornecedor / Favorecido</label>
                      <button 
                        type="button"
                        onClick={() => setIsSupplierModalOpen(true)}
                        className="text-[10px] font-bold text-[#ba1a1a] hover:underline flex items-center gap-1"
                      >
                        <Truck size={12} /> Novo Fornecedor
                      </button>
                    </div>
                    <select 
                      required
                      value={addFormData.entity}
                      onChange={(e) => setAddFormData({ ...addFormData, entity: e.target.value })}
                      className="w-full px-4 py-3 bg-[#fff8f7] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none appearance-none"
                    >
                      <option value="">Selecione um fornecedor...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
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
                        className="w-full pl-10 pr-4 py-3 bg-[#fff8f7] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
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
                        className="w-full pl-10 pr-4 py-3 bg-[#fff8f7] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                        placeholder="DD/MM/AAAA"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Categoria</label>
                    <select 
                      value={addFormData.category}
                      onChange={(e) => setAddFormData({ ...addFormData, category: e.target.value })}
                      className="w-full px-4 py-3 bg-[#fff8f7] border-none rounded-xl text-sm font-bold text-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none appearance-none"
                    >
                      <option value="Fornecedores">Fornecedores</option>
                      <option value="Infraestrutura">Infraestrutura</option>
                      <option value="Impostos">Impostos</option>
                      <option value="Salários">Salários</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status Inicial</label>
                    <select 
                      value={addFormData.status}
                      onChange={(e) => setAddFormData({ ...addFormData, status: e.target.value as any })}
                      className="w-full px-4 py-3 bg-[#fff8f7] border-none rounded-xl text-sm font-bold text-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none appearance-none"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                    </select>
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Observações</label>
                    <textarea 
                      value={addFormData.notes}
                      onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-[#fff8f7] border-none rounded-xl text-sm font-medium text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none resize-none h-20"
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
                    className="flex-1 py-4 bg-[#ba1a1a] text-white font-bold rounded-2xl shadow-lg shadow-[#ba1a1a]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Criar Pagamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SupplierFormModal 
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSave={handleSaveNewSupplier}
      />

      <XMLImportPayableModal 
        isOpen={isXMLModalOpen}
        onClose={() => setIsXMLModalOpen(false)}
        xmlData={xmlImportData}
        onConfirm={handleConfirmXMLImport}
        existingSuppliers={suppliers}
        existingTransactions={transactions}
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
              className="absolute inset-0 bg-[#ba1a1a]/10 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#fff5f5]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#ba1a1a] text-white rounded-xl">
                    <Edit2 size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-[#ba1a1a]">Editar Pagamento</h3>
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
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none appearance-none"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                      <option value="Vencido">Vencido</option>
                      <option value="Cancelado">Cancelado</option>
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
                        className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#ba1a1a] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none"
                        placeholder="DD/MM/AAAA"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Observações</label>
                    <textarea 
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-medium text-[#1b1b21] focus:ring-2 focus:ring-[#ba1a1a]/10 outline-none resize-none h-24"
                      placeholder="Adicione observações sobre este pagamento..."
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
                    className="flex-1 py-4 bg-[#ba1a1a] text-white font-bold rounded-2xl shadow-lg shadow-[#ba1a1a]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Fixed Expense Modal */}
      <AnimatePresence>
        {isFixedModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFixedModalOpen(false)}
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
                    <Clock size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-[#000666]">
                    {editingFixed ? 'Editar Conta Fixa' : 'Nova Conta Fixa'}
                  </h3>
                </div>
                <button onClick={() => setIsFixedModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleAddFixedExpense} className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Descrição</label>
                    <input 
                      required
                      type="text" 
                      value={fixedFormData.description}
                      onChange={(e) => setFixedFormData({ ...fixedFormData, description: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                      placeholder="Ex: Aluguel, Internet, etc."
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Empresa / Prestador</label>
                      <button 
                        type="button"
                        onClick={() => setIsSupplierModalOpen(true)}
                        className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                      >
                        <Truck size={12} /> Novo Cadastro
                      </button>
                    </div>
                    <select 
                      required
                      value={fixedFormData.entity}
                      onChange={(e) => setFixedFormData({ ...fixedFormData, entity: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none appearance-none"
                    >
                      <option value="">Selecione...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Valor (R$)</label>
                    <input 
                      required
                      type="text" 
                      value={fixedFormData.value}
                      onChange={(e) => setFixedFormData({ ...fixedFormData, value: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                      placeholder="0,00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dia do Vencimento</label>
                    <input 
                      required
                      type="number" 
                      min="1"
                      max="31"
                      value={fixedFormData.dueDay}
                      onChange={(e) => setFixedFormData({ ...fixedFormData, dueDay: e.target.value })}
                      className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold text-[#1b1b21] focus:ring-2 focus:ring-[#000666]/10 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsFixedModalOpen(false)}
                    className="flex-1 py-4 bg-white text-slate-500 font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-[#000666] text-white font-bold rounded-2xl shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Salvar
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
