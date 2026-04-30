"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Filter, 
  Download, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight,
  PlusCircle,
  UserPlus,
  Search,
  Settings,
  Cpu,
  Forklift,
  Zap,
  Tractor,
  X,
  Edit2,
  Trash2,
  Plus,
  User,
  Wrench,
  Calendar,
  FileText,
  ClipboardCheck,
  Check,
  Hash,
  MessageCircle,
  Mail,
  CreditCard,
  DollarSign,
  Package,
  FileDown,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { ServiceOrder, Client, Equipment, Part, Service, Transaction, Mechanic, Seller } from '@/src/types';
import ClientFormModal from './ClientFormModal';
import EquipmentFormModal from './EquipmentFormModal';
import { generateOSPDF, generateBudgetPDF, sendOSWhatsApp, generateOSListPDF } from '../lib/pdfGenerator';
import { useFirebase } from '@/src/context/FirebaseContext';

interface ServiceOrdersProps {
  orders: ServiceOrder[];
  setOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  equipment: Equipment[];
  setEquipment: React.Dispatch<React.SetStateAction<Equipment[]>>;
  partsList: Part[];
  servicesList: Service[];
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  mechanics: Mechanic[];
  sellers: Seller[];
  triggerNewModal?: boolean;
  initialOrderId?: string | null;
  hideList?: boolean;
  onClose?: () => void;
}

export default function ServiceOrders({ 
  orders, 
  setOrders, 
  clients, 
  setClients, 
  equipment, 
  setEquipment, 
  partsList, 
  servicesList,
  transactions,
  setTransactions,
  mechanics,
  sellers,
  triggerNewModal,
  initialOrderId,
  hideList,
  onClose
}: ServiceOrdersProps) {
  const { actions } = useFirebase();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'general' | 'parts' | 'services' | 'payment'>('general');

  const [formData, setFormData] = useState<Partial<ServiceOrder>>({
    number: '',
    clientId: '',
    equipmentId: '',
    defectDescription: '',
    technicalReport: '',
    accessories: '',
    status: 'EM ORÇAMENTO',
    technician: '',
    total: 'R$ 0,00',
    createdAt: new Date().toLocaleDateString('pt-BR'),
    completionDate: '',
    parts: [],
    services: [],
    payment: {
      method: 'PIX',
      status: 'Pendente',
      paidAmount: 'R$ 0,00',
      remainingAmount: 'R$ 0,00',
      installments: 1,
      discountValue: '0',
      discountType: 'fixed',
      subtotal: 'R$ 0,00',
      method2: undefined,
      paidAmount2: 'R$ 0,00',
      installments2: 1,
      dueDate2: undefined,
      status2: 'Pendente'
    }
  });

  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isNewEquipmentModalOpen, setIsNewEquipmentModalOpen] = useState(false);

  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [showPartResults, setShowPartResults] = useState(false);

  const [serviceSearchTerm, setServiceSearchTerm] = useState('');
  const [showServiceResults, setShowServiceResults] = useState(false);

  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [showClientResults, setShowClientResults] = useState(false);

  const [osSearchTerm, setOsSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [lastSavedOrder, setLastSavedOrder] = useState<{order: ServiceOrder, client: Client, equip: Equipment | undefined} | null>(null);

  useEffect(() => {
    if (formData.payment) {
      const partsTotal = (formData.parts || []).reduce((acc, item) => {
        const price = parseFloat(item.totalPrice.replace(/[^\d,]/g, '').replace(',', '.') || '0');
        return acc + price;
      }, 0);
      const servicesTotal = (formData.services || []).reduce((acc, item) => {
        const price = parseFloat(item.totalPrice.replace(/[^\d,]/g, '').replace(',', '.') || '0');
        return acc + price;
      }, 0);
      
      const subtotalVal = partsTotal + servicesTotal;
      
      let discount = 0;
      const discountInput = formData.payment.discountValue || '0';
      const discountVal = parseFloat(discountInput.replace(/[^\d,]/g, '').replace(',', '.') || '0');
      
      if (formData.payment.discountType === 'percentage') {
        discount = subtotalVal * (discountVal / 100);
      } else {
        discount = discountVal;
      }
      
      const totalVal = Math.max(0, subtotalVal - discount);
      const paidVal1 = parseFloat(formData.payment.paidAmount.replace(/[^\d,]/g, '').replace(',', '.') || '0');
      const paidVal2 = parseFloat((formData.payment.paidAmount2 || '0').replace(/[^\d,]/g, '').replace(',', '.') || '0');
      const totalPaid = paidVal1 + paidVal2;
      
      const formattedTotal = formatCurrency((totalVal * 100).toFixed(0));
      const formattedRemaining = formatCurrency(((totalVal - totalPaid) * 100).toFixed(0));
      const formattedSubtotal = formatCurrency((subtotalVal * 100).toFixed(0));

      if (formattedTotal !== formData.total || 
          formattedRemaining !== formData.payment.remainingAmount || 
          formattedSubtotal !== formData.payment.subtotal) {
        setFormData(prev => ({
          ...prev,
          total: formattedTotal,
          payment: {
            ...prev.payment!,
            remainingAmount: formattedRemaining,
            subtotal: formattedSubtotal
          }
        }));
      }
    }
  }, [formData.parts, formData.services, formData.payment, formData.total]);

  const calculateBoletoDueDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const getInstallmentsList = (amountStr: string, installments: string | number, customDueDate?: string) => {
    if (!formData.payment || !amountStr) return [];
    
    const totalVal = parseFloat(amountStr.replace(/[^\d,]/g, '').replace(',', '.') || '0');
    let installmentTerms: number[] = [];

    if (typeof installments === 'string') {
      if (installments.includes('/')) {
        installmentTerms = installments.split('/').map(t => parseInt(t.trim())).filter(t => !isNaN(t));
      } else if (installments.includes('dias')) {
        installmentTerms = [parseInt(installments.split(' ')[0])];
      } else {
        const num = parseInt(installments);
        if (!isNaN(num)) {
          if (num === 1) {
            installmentTerms = [0];
          } else {
            for (let i = 1; i <= num; i++) {
              installmentTerms.push(i * 30);
            }
          }
        }
      }
    } else {
      if (installments === 1) {
        installmentTerms = [0];
      } else {
        for (let i = 1; i <= installments; i++) {
          installmentTerms.push(i * 30);
        }
      }
    }

    if (installmentTerms.length === 0) installmentTerms = [0];

    const installmentValue = totalVal / installmentTerms.length;

    return installmentTerms.map((days, index) => {
      let dateStr = calculateBoletoDueDate(days);
      if (index === 0 && days === 0 && customDueDate) {
        dateStr = customDueDate;
      }
      
      return {
        date: dateStr,
        value: formatCurrency((installmentValue * 100).toFixed(0))
      };
    });
  };

  const filteredPartsList = partsList.filter(p => 
    p.name.toLowerCase().includes(partSearchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(partSearchTerm.toLowerCase()) ||
    p.additionalCodes?.some(c => c.toLowerCase().includes(partSearchTerm.toLowerCase()))
  );

  const filteredServicesList = servicesList.filter(s => 
    s.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) || 
    s.code.toLowerCase().includes(serviceSearchTerm.toLowerCase())
  );

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
    c.document.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    c.phone.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    c.mobile.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const amount = parseInt(digits || '0') / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const calculateTotal = (parts: any[], services: any[]) => {
    const partsTotal = parts.reduce((acc, item) => {
      const price = parseFloat((item.totalPrice || '0').replace(/[^\d,]/g, '').replace(',', '.') || '0');
      return acc + price;
    }, 0);
    const servicesTotal = services.reduce((acc, item) => {
      const price = parseFloat((item.totalPrice || '0').replace(/[^\d,]/g, '').replace(',', '.') || '0');
      return acc + price;
    }, 0);
    return formatCurrency(((partsTotal + servicesTotal) * 100).toFixed(0));
  };

  const calculateDuration = (start: string, end?: string) => {
    if (!end || end === '') return 'Em andamento';
    
    const parseDate = (dateStr: string) => {
      const parts = dateStr.split(' ');
      const dateParts = parts[0].split('/');
      const day = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1;
      const year = parseInt(dateParts[2]);
      
      if (parts[1]) {
        const timeParts = parts[1].split(':');
        const hour = parseInt(timeParts[0]);
        const minute = parseInt(timeParts[1]);
        const second = parseInt(timeParts[2] || '0');
        return new Date(year, month, day, hour, minute, second);
      }
      return new Date(year, month, day);
    };

    try {
      const startDate = parseDate(start);
      const endDate = parseDate(end);
      const diffMs = endDate.getTime() - startDate.getTime();
      
      if (diffMs < 0) return 'N/A';

      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffDays > 0) {
        return `${diffDays}d ${diffHours}h`;
      }
      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}m`;
      }
      return `${diffMinutes}m`;
    } catch (e) {
      return 'N/A';
    }
  };

  const handleAddPart = (catalogPart?: Part) => {
    const newPart = {
      id: Math.random().toString(36).substring(2, 11),
      description: catalogPart ? catalogPart.name : '',
      quantity: 1,
      unitPrice: catalogPart ? formatCurrency((catalogPart.price * 100).toString()) : 'R$ 0,00',
      totalPrice: catalogPart ? formatCurrency((catalogPart.price * 100).toString()) : 'R$ 0,00'
    };
    setFormData(prev => {
      const newParts = [...(prev.parts || []), newPart];
      const newTotal = calculateTotal(newParts, prev.services || []);
      return {
        ...prev,
        parts: newParts,
        total: newTotal
      };
    });
  };

  const handleAddService = (catalogService?: Service) => {
    const newService = {
      id: Math.random().toString(36).substring(2, 11),
      description: catalogService ? catalogService.name : '',
      quantity: 1,
      unitPrice: catalogService ? formatCurrency((catalogService.price * 100).toString()) : 'R$ 0,00',
      totalPrice: catalogService ? formatCurrency((catalogService.price * 100).toString()) : 'R$ 0,00'
    };
    setFormData(prev => {
      const newServices = [...(prev.services || []), newService];
      const newTotal = calculateTotal(prev.parts || [], newServices);
      return {
        ...prev,
        services: newServices,
        total: newTotal
      };
    });
  };

  const updateItem = (type: 'parts' | 'services', id: string, field: string, value: any) => {
    setFormData(prev => {
      const items = [...(prev[type] || [])];
      const index = items.findIndex(i => i.id === id);
      if (index > -1) {
        items[index] = { ...items[index], [field]: value };
        
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = items[index].quantity;
          const price = parseFloat(items[index].unitPrice.replace(/[^\d,]/g, '').replace(',', '.') || '0');
          items[index].totalPrice = formatCurrency(((qty * price) * 100).toFixed(0));
        }
      }
      const newTotal = calculateTotal(
        type === 'parts' ? items : (prev.parts || []),
        type === 'services' ? items : (prev.services || [])
      );
      return { ...prev, [type]: items, total: newTotal };
    });
  };

  const removeItem = (type: 'parts' | 'services', id: string) => {
    setFormData(prev => {
      const items = (prev[type] || []).filter(i => i.id !== id);
      const newTotal = calculateTotal(
        type === 'parts' ? items : (prev.parts || []),
        type === 'services' ? items : (prev.services || [])
      );
      return { ...prev, [type]: items, total: newTotal };
    });
  };

  const handleSaveNewClient = (newClient: Client) => {
    setClients(prev => [...prev, newClient]);
    setFormData(prev => ({ ...prev, clientId: newClient.id }));
    setIsNewClientModalOpen(false);
  };

  const handleSaveNewEquipment = (newEquip: Equipment) => {
    setEquipment(prev => [...prev, newEquip]);
    setFormData(prev => ({ ...prev, equipmentId: newEquip.id }));
    setIsNewEquipmentModalOpen(false);
  };

  const formatDate = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{4})\d+?$/, '$1');
  };

  const handleOpenModal = useCallback((order?: ServiceOrder) => {
    setActiveTab('general');
    setClientSearchTerm('');
    if (order) {
      setEditingOrder(order);
      setFormData({
        number: order.number || '',
        clientId: order.clientId || '',
        equipmentId: order.equipmentId || '',
        defectDescription: order.defectDescription || '',
        technicalReport: order.technicalReport || '',
        accessories: order.accessories || '',
        status: order.status || 'EM ORÇAMENTO',
        technician: order.technician || '',
        total: order.total || 'R$ 0,00',
        createdAt: order.createdAt || new Date().toLocaleString('pt-BR'),
        completionDate: order.completionDate || '',
        parts: order.parts || [],
        services: order.services || [],
        payment: order.payment || {
          method: 'PIX',
          status: 'Pendente',
          paidAmount: 'R$ 0,00',
          remainingAmount: order.total || 'R$ 0,00',
          installments: 1,
          discountValue: '0',
          discountType: 'fixed',
          subtotal: order.total || 'R$ 0,00',
          method2: undefined,
          paidAmount2: 'R$ 0,00',
          installments2: 1,
          dueDate2: undefined,
          status2: 'Pendente'
        }
      });
    } else {
      setEditingOrder(null);
      setFormData({
        number: (orders.length + 8821).toString(),
        clientId: '',
        equipmentId: '',
        defectDescription: '',
        technicalReport: '',
        accessories: '',
        status: 'EM ORÇAMENTO',
        technician: '',
        total: 'R$ 0,00',
        createdAt: new Date().toLocaleString('pt-BR'),
        completionDate: '',
        parts: [],
        services: [],
        payment: {
          method: 'PIX',
          status: 'Pendente',
          paidAmount: 'R$ 0,00',
          remainingAmount: 'R$ 0,00',
          installments: 1,
          discountValue: '0',
          discountType: 'fixed',
          subtotal: 'R$ 0,00',
          method2: undefined,
          paidAmount2: 'R$ 0,00',
          installments2: 1,
          dueDate2: undefined,
          status2: 'Pendente'
        }
      });
    }
    setIsModalOpen(true);
  }, [orders.length]);

  useEffect(() => {
    if (triggerNewModal) {
      handleOpenModal();
    }
  }, [triggerNewModal, handleOpenModal]);

  useEffect(() => {
    if (initialOrderId) {
      const order = orders.find(o => o.id === initialOrderId);
      if (order) {
        handleOpenModal(order);
      }
    }
  }, [initialOrderId, orders, handleOpenModal]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientId || !formData.equipmentId) {
      return;
    }

    const client = clients.find(c => c.id === formData.clientId);
    const equip = equipment.find(e => e.id === formData.equipmentId);

    const orderData: any = {
      ...formData,
      clientName: client?.name || '',
      clientDocument: client?.document || '',
      clientPhone: client?.phone || '',
      equipmentName: equip ? `${equip.brand} ${equip.model}` : '',
      completionDate: formData.status === 'CONCLUIDO' && !formData.completionDate 
        ? new Date().toLocaleString('pt-BR') 
        : formData.completionDate
    };

    try {
      let savedOrderId = editingOrder?.id;
      if (editingOrder) {
        await actions.update('service_orders', editingOrder.id, orderData);
      } else {
        const docRef = await actions.add('service_orders', orderData);
        savedOrderId = docRef.id;
        
        if (client) {
          setLastSavedOrder({ order: { ...orderData, id: savedOrderId }, client, equip });
          setShowSaveConfirmation(true);
        }
      }

      // Handle transactions
      if (formData.status === 'CONCLUIDO') {
        const otherTransactions = transactions.filter(t => t.referenceId !== savedOrderId);
        const newTransactions: any[] = [];
        
        if (formData.payment) {
          const amount1 = formData.payment.method2 ? formData.payment.paidAmount : formData.total || 'R$ 0,00';
          const instList1 = getInstallmentsList(amount1, formData.payment.installments || 1, formData.payment.dueDate);
          
          instList1.forEach((inst, idx) => {
            newTransactions.push({
              description: `OS #${orderData.number}${instList1.length > 1 ? ` - Parc. ${idx + 1}/${instList1.length}` : ''}`,
              category: 'Serviços',
              type: 'Receita',
              entity: client?.name || 'Cliente Desconhecido',
              date: new Date().toLocaleDateString('pt-BR'),
              dueDate: inst.date.split('-').reverse().join('/'),
              paymentDate: formData.payment?.status === 'Pago' ? new Date().toLocaleDateString('pt-BR') : undefined,
              status: formData.payment?.status === 'Pago' ? 'Pago' : 'Pendente',
              value: parseFloat(inst.value.replace(/[^\d,]/g, '').replace(',', '.') || '0'),
              paymentMethod: formData.payment?.method || 'Dinheiro',
              referenceId: savedOrderId
            });
          });

          if (formData.payment.method2 && formData.payment.paidAmount2 && formData.payment.paidAmount2 !== 'R$ 0,00') {
            const instList2 = getInstallmentsList(formData.payment.paidAmount2, formData.payment.installments2 || 1, formData.payment.dueDate2);
            instList2.forEach((inst, idx) => {
              newTransactions.push({
                description: `OS #${orderData.number} (M2)${instList2.length > 1 ? ` - Parc. ${idx + 1}/${instList2.length}` : ''}`,
                category: 'Serviços',
                type: 'Receita',
                entity: client?.name || 'Cliente Desconhecido',
                date: new Date().toLocaleDateString('pt-BR'),
                dueDate: inst.date.split('-').reverse().join('/'),
                paymentDate: formData.payment?.status2 === 'Pago' ? new Date().toLocaleDateString('pt-BR') : undefined,
                status: formData.payment?.status2 === 'Pago' ? 'Pago' : 'Pendente',
                value: parseFloat(inst.value.replace(/[^\d,]/g, '').replace(',', '.') || '0'),
                paymentMethod: formData.payment?.method2 || 'Dinheiro',
                referenceId: savedOrderId
              });
            });
          }
        }
        
        // Update transactions in Firestore
        // This is a bit complex because we need to delete old ones and add new ones
        // For simplicity in this demo, we'll just add them. 
        // In a real app, you'd have a more robust transaction management.
        for (const t of newTransactions) {
          await actions.add('transactions', t);
        }
      }

      // Update equipment status
      if (formData.equipmentId) {
        await actions.update('equipment', formData.equipmentId, {
          status: formData.status === 'CONCLUIDO' ? 'Equipamento Ativo' : 'Em manutenção'
        });
      }

      setIsModalOpen(false);
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving service order:', error);
    }
  };

  const handleDelete = async () => {
    if (orderToDelete) {
      try {
        const order = orders.find(o => o.id === orderToDelete);
        if (order && order.equipmentId) {
          await actions.update('equipment', order.equipmentId, { status: 'Equipamento Ativo' });
        }
        await actions.remove('service_orders', orderToDelete);
        setIsDeleteModalOpen(false);
        setOrderToDelete(null);
      } catch (error) {
        console.error('Error deleting service order:', error);
      }
    }
  };

  const handleExport = () => {
    const filteredOrders = orders.filter(order => {
      const search = osSearchTerm.toLowerCase();
      const matchesSearch = (
        order.number.toLowerCase().includes(search) ||
        order.clientName.toLowerCase().includes(search) ||
        order.clientDocument.toLowerCase().includes(search) ||
        order.clientPhone.toLowerCase().includes(search)
      );
      const matchesStatus = statusFilter === 'TODOS' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const headers = ['Nº O.S.', 'Cliente', 'Equipamento', 'Status', 'Criação', 'Total'];
    const rows = filteredOrders.map(order => {
      const client = clients.find(c => c.id === order.clientId)?.name || 'N/A';
      const equip = equipment.find(e => e.id === order.equipmentId);
      const equipName = equip ? `${equip.brand} ${equip.model}` : 'N/A';
      return [
        order.number,
        `"${client}"`,
        `"${equipName}"`,
        order.status,
        order.createdAt,
        `"${order.total}"`
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Ordens_de_Servico_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    const filteredOrders = orders.filter(order => {
      const search = osSearchTerm.toLowerCase();
      const matchesSearch = (
        order.number.toLowerCase().includes(search) ||
        order.clientName.toLowerCase().includes(search) ||
        order.clientDocument.toLowerCase().includes(search) ||
        order.clientPhone.toLowerCase().includes(search)
      );
      const matchesStatus = statusFilter === 'TODOS' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const doc = generateOSListPDF(filteredOrders);
    doc.save(`Relatorio_OS_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
  };

  const filteredEquipment = equipment.filter(e => e.owner === clients.find(c => c.id === formData.clientId)?.name);

  return (
    <div className={cn(hideList ? "fixed inset-0 z-[200]" : "space-y-8")}>
      {!hideList && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-[#000666] tracking-tight">Ordens de Serviço</h2>
          <p className="text-slate-500 text-sm font-medium">Gerencie manutenções, orçamentos e atendimentos.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button 
            onClick={() => handleOpenModal()}
            className="flex-1 sm:flex-none bg-[#000666] text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#000666]/20 active:scale-95 transition-all"
          >
            <PlusCircle size={18} />
            Nova O.S.
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="flex-1 sm:flex-none bg-[#eae7ef] px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#dbd9e1] transition-colors"
          >
            <FileDown size={18} />
            PDF
          </button>
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-none bg-[#eae7ef] px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#dbd9e1] transition-colors"
          >
            <Download size={18} />
            CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Pesquisar O.S., Cliente..."
            value={osSearchTerm}
            onChange={(e) => setOsSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 sm:py-4 bg-white border border-[#c6c5d4]/20 rounded-2xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#c6c5d4]/20 rounded-2xl px-4 py-2.5 shadow-sm sm:min-w-[200px]">
          <Filter size={18} className="text-slate-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-[#1b1b21] outline-none w-full cursor-pointer"
          >
            <option value="TODOS">Todos Status</option>
            <option value="EM ORÇAMENTO">Em Orçamento</option>
            <option value="AGUARDANDO APROVAÇÃO">Aguardando Aprovação</option>
            <option value="APROVADO">Aprovado</option>
            <option value="EM MANUTENÇÃO">Em Manutenção</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="NÃO APROVADO">Não Aprovado</option>
            <option value="ENTREGUE">Entregue</option>
          </select>
        </div>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-sm flex flex-col justify-between group border border-[#c6c5d4]/10">
          <div className="flex justify-between items-start">
            <div className="p-2 sm:p-3 bg-[#1a237e]/10 rounded-xl text-[#1a237e]">
              <Clock size={20} className="sm:w-6 sm:h-6" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-[#1b6d24] flex items-center gap-1">
              <TrendingUp size={12} className="sm:w-[14px] sm:h-[14px]" />
              +12%
            </span>
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm font-medium text-slate-500">Ordens em Aberto</p>
            <h3 className="text-2xl sm:text-4xl font-black text-[#1b1b21] mt-1">{orders.filter(o => o.status !== 'CONCLUIDO').length}</h3>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm flex flex-col justify-between border border-[#c6c5d4]/10">
          <div className="p-2 sm:p-3 bg-[#a0f399]/20 rounded-xl text-[#1b6d24]">
            <CheckCircle size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm font-medium text-slate-500">Finalizadas</p>
            <h3 className="text-2xl sm:text-3xl font-black text-[#1b1b21] mt-1">{orders.filter(o => o.status === 'CONCLUIDO').length}</h3>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm flex flex-col justify-between border border-[#c6c5d4]/10">
          <div className="p-2 sm:p-3 bg-[#ffdad6]/20 rounded-xl text-[#ba1a1a]">
            <AlertCircle size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="mt-3 sm:mt-4">
            <p className="text-xs sm:text-sm font-medium text-slate-500">Não Aprovadas</p>
            <h3 className="text-2xl sm:text-3xl font-black text-[#1b1b21] mt-1">{orders.filter(o => o.status === 'NÃO APROVADO').length}</h3>
          </div>
        </div>
      </div>

      {/* Table / List View */}
      <div className="bg-white rounded-xl shadow-sm border border-[#c6c5d4]/10 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#f5f2fb] border-b border-[#c6c5d4]/20">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Nº O.S.</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Equipamento</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Mecânico</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Criação</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Duração</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d4]/5">
              {orders
                .filter(order => {
                  const search = osSearchTerm.toLowerCase();
                  const matchesSearch = (
                    order.number.toLowerCase().includes(search) ||
                    order.clientName.toLowerCase().includes(search) ||
                    order.clientDocument.toLowerCase().includes(search) ||
                    order.clientPhone.toLowerCase().includes(search) ||
                    (order.technician && order.technician.toLowerCase().includes(search))
                  );
                  const matchesStatus = statusFilter === 'TODOS' || order.status === statusFilter;
                  return matchesSearch && matchesStatus;
                })
                .map((order) => (
                <tr key={order.id} className="hover:bg-[#f5f2fb] transition-colors group">
                  <td className="px-6 py-4 text-sm font-mono text-[#000666] font-semibold">#{order.number}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-[#1b1b21]">{order.clientName}</span>
                      <span className="text-[11px] text-slate-500">{order.clientDocument}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Cpu size={18} className="text-slate-400" />
                      <span className="text-sm">{order.equipmentName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Wrench size={16} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-600">{order.technician || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold",
                      order.status === 'CONCLUIDO' ? "bg-[#a0f399] text-[#005312]" : 
                      order.status === 'AGUARDANDO APROVAÇÃO' ? "bg-[#ffdbcf] text-[#802a00]" : 
                      order.status === 'NÃO APROVADO' ? "bg-[#ffdad6] text-[#93000a]" :
                      "bg-[#e0e0ff] text-[#343d96]"
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{order.createdAt}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 text-right">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold",
                      order.status === 'CONCLUIDO' ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {calculateDuration(order.createdAt, order.completionDate)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono font-bold text-right">{order.total}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => {
                          const client = clients.find(c => c.id === order.clientId);
                          const equip = equipment.find(e => e.id === order.equipmentId);
                          if (client) {
                            const doc = generateBudgetPDF(order, client, equip);
                            doc.save(`Orcamento_${order.number}.pdf`);
                          }
                        }}
                        title="Baixar Orçamento"
                        className="p-1.5 hover:bg-[#000666]/10 text-[#000666] rounded-lg transition-all"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          const client = clients.find(c => c.id === order.clientId);
                          const equip = equipment.find(e => e.id === order.equipmentId);
                          if (client) {
                            const doc = generateOSPDF(order, client, equip);
                            doc.save(`OS_${order.number}.pdf`);
                          }
                        }}
                        title="Baixar O.S"
                        className="p-1.5 hover:bg-[#000666]/10 text-[#000666] rounded-lg transition-all"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(order)}
                        className="p-1.5 hover:bg-[#000666]/10 text-[#000666] rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setOrderToDelete(order.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all"
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

        {/* Mobile List View (Cards) */}
        <div className="lg:hidden divide-y divide-slate-100">
          {orders
            .filter(order => {
              const search = osSearchTerm.toLowerCase();
              const matchesSearch = (
                order.number.toLowerCase().includes(search) ||
                order.clientName.toLowerCase().includes(search) ||
                order.clientDocument.toLowerCase().includes(search) ||
                order.clientPhone.toLowerCase().includes(search)
              );
              const matchesStatus = statusFilter === 'TODOS' || order.status === statusFilter;
              return matchesSearch && matchesStatus;
            })
            .map((order) => (
              <div key={order.id} className="p-4 space-y-4 bg-white active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-[#000666] font-bold">#{order.number}</span>
                    <span className="text-sm font-black text-[#1b1b21]">{order.clientName}</span>
                    <span className="text-[10px] text-slate-500">{order.equipmentName}</span>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                    order.status === 'CONCLUIDO' ? "bg-[#a0f399] text-[#005312]" : 
                    order.status === 'AGUARDANDO APROVAÇÃO' ? "bg-[#ffdbcf] text-[#802a00]" : 
                    order.status === 'NÃO APROVADO' ? "bg-[#ffdad6] text-[#93000a]" :
                    "bg-[#e0e0ff] text-[#343d96]"
                  )}>
                    {order.status}
                  </span>
                </div>

                <div className="flex justify-between items-end border-t border-slate-50 pt-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar size={12} />
                      <span className="text-[10px] font-medium">{order.createdAt}</span>
                    </div>
                    <div className="text-sm font-black text-[#000666]">{order.total}</div>
                  </div>
                  
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleOpenModal(order)}
                      className="p-2 bg-[#f5f2fb] text-[#000666] rounded-xl hover:bg-[#e0e0ff] transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        const client = clients.find(c => c.id === order.clientId);
                        const equip = equipment.find(e => e.id === order.equipmentId);
                        if (client) {
                          const doc = generateOSPDF(order, client, equip);
                          doc.save(`OS_${order.number}.pdf`);
                        }
                      }}
                      className="p-2 bg-[#f5f2fb] text-[#000666] rounded-xl hover:bg-[#e0e0ff] transition-all"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setOrderToDelete(order.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          }
          {orders.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-bold">Nenhuma ordem de serviço encontrada.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )}

  {/* Modal CRUD */}
      <AnimatePresence>
        {showSaveConfirmation && lastSavedOrder && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSaveConfirmation(false)}
              className="absolute inset-0 bg-[#000666]/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-[#a0f399]/30 text-[#005312] rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
                  <CheckCircle size={40} />
                </div>
                <h3 className="text-2xl font-black text-[#1b1b21] mb-2 tracking-tight">O.S. Gerada com Sucesso!</h3>
                <p className="text-slate-500 mb-8 text-sm leading-relaxed">
                  A Ordem de Serviço <span className="font-bold text-[#000666]">#{lastSavedOrder.order.number}</span> foi registrada. Como você deseja prosseguir agora?
                </p>
                
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => {
                      const doc = generateOSPDF(lastSavedOrder.order, lastSavedOrder.client, lastSavedOrder.equip);
                      doc.save(`OS_${lastSavedOrder.order.number}.pdf`);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 bg-[#f5f2fb] hover:bg-[#eae7ef] text-[#000666] rounded-2xl font-bold transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                        <Download size={18} />
                      </div>
                      <span>Baixar PDF</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>

                  <button 
                    onClick={() => {
                      sendOSWhatsApp(lastSavedOrder.order, lastSavedOrder.client);
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#075E54] rounded-2xl font-bold transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                        <MessageCircle size={18} className="text-[#25D366]" />
                      </div>
                      <span>Enviar via WhatsApp</span>
                    </div>
                    <ChevronRight size={16} className="text-[#25D366]/40" />
                  </button>

                  <button 
                    onClick={() => {
                      if (lastSavedOrder.client.email) {
                        const subject = encodeURIComponent(`Ordem de Serviço #${lastSavedOrder.order.number} - Alfamaq`);
                        const body = encodeURIComponent(`Olá ${lastSavedOrder.client.name},\n\nSegue em anexo a sua Ordem de Serviço #${lastSavedOrder.order.number}.\n\nEquipamento: ${lastSavedOrder.equip?.brand} ${lastSavedOrder.equip?.model}\nStatus: ${lastSavedOrder.order.status}\n\nAtenciosamente,\nEquipe Alfamaq`);
                        window.location.href = `mailto:${lastSavedOrder.client.email}?subject=${subject}&body=${body}`;
                      } else {
                        alert('Este cliente não possui e-mail cadastrado.');
                      }
                    }}
                    className="w-full flex items-center justify-between px-6 py-4 bg-[#000666]/5 hover:bg-[#000666]/10 text-[#000666] rounded-2xl font-bold transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                        <Mail size={18} className="text-[#000666]" />
                      </div>
                      <span>Enviar via E-mail</span>
                    </div>
                    <ChevronRight size={16} className="text-[#000666]/40" />
                  </button>

                  <button 
                    onClick={() => setShowSaveConfirmation(false)}
                    className="w-full mt-4 py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                  >
                    Agora não, fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

  {/* Modal CRUD */}
      <AnimatePresence>
        {isModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setIsModalOpen(false);
                    if (onClose) onClose();
                  }}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl h-[90vh] bg-white shadow-2xl overflow-hidden flex flex-col rounded-3xl"
            >
              <div className="p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb]">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#000666] text-white rounded-xl">
                      <FileText size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#1b1b21]">
                        {editingOrder ? `Editar O.S. #${formData.number}` : 'Nova Ordem de Serviço'}
                      </h3>
                      <p className="text-xs text-slate-500">Gestão completa da manutenção</p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex bg-white/50 p-1 rounded-xl border border-[#c6c5d4]/20">
                    <button 
                      onClick={() => setActiveTab('general')}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                        activeTab === 'general' ? "bg-[#000666] text-white shadow-md" : "text-slate-500 hover:bg-white"
                      )}
                    >
                      <Settings size={14} />
                      Geral
                    </button>
                    <button 
                      onClick={() => setActiveTab('parts')}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                        activeTab === 'parts' ? "bg-[#000666] text-white shadow-md" : "text-slate-500 hover:bg-white"
                      )}
                    >
                      <Cpu size={14} />
                      Peças
                    </button>
                    <button 
                      onClick={() => setActiveTab('services')}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                        activeTab === 'services' ? "bg-[#000666] text-white shadow-md" : "text-slate-500 hover:bg-white"
                      )}
                    >
                      <Zap size={14} />
                      Serviços
                    </button>
                    <button 
                      onClick={() => setActiveTab('payment')}
                      className={cn(
                        "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                        activeTab === 'payment' ? "bg-[#000666] text-white shadow-md" : "text-slate-500 hover:bg-white"
                      )}
                    >
                      <CreditCard size={14} />
                      Pagamento
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {formData.clientId && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const client = clients.find(c => c.id === formData.clientId);
                          const equip = equipment.find(e => e.id === formData.equipmentId);
                          if (client) {
                            const doc = generateOSPDF({ 
                              ...formData, 
                              id: editingOrder?.id || 'new' 
                            } as any, client, equip);
                            doc.save(`OS_${formData.number || 'Rascunho'}.pdf`);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-[#000666] border border-[#000666]/10 rounded-xl text-sm font-bold hover:bg-[#000666]/5 transition-all shadow-sm"
                      >
                        <Download size={16} />
                        Baixar O.S
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const client = clients.find(c => c.id === formData.clientId);
                          const equip = equipment.find(e => e.id === formData.equipmentId);
                          if (client) {
                            const doc = generateBudgetPDF({ 
                              ...formData, 
                              id: editingOrder?.id || 'new' 
                            } as any, client, equip);
                            doc.save(`Orcamento_${formData.number || 'Rascunho'}.pdf`);
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#f5f2fb] text-[#000666] border border-[#000666]/10 rounded-xl text-sm font-bold hover:bg-[#000666]/5 transition-all shadow-sm"
                      >
                        <FileText size={16} />
                        Baixar Orçamento
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      if (onClose) onClose();
                    }}
                    className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSave} className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-8 space-y-8">
                  {activeTab === 'general' && (
                    <>
                      {/* Cabeçalho de Dados */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-[#f5f2fb]/50 rounded-3xl border border-[#c6c5d4]/10">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Número da O.S.</label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              required
                              type="text" 
                              value={formData.number || ''}
                              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                              className="w-full pl-9 pr-4 py-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                              placeholder="8821"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status Atual</label>
                          <select 
                            value={formData.status || ''}
                            onChange={(e) => {
                              const newStatus = e.target.value as any;
                              
                              // Check if trying to set to CONCLUIDO without full payment
                              if (newStatus === 'CONCLUIDO') {
                                const remainingVal = parseFloat(formData.payment?.remainingAmount.replace(/[^\d,]/g, '').replace(',', '.') || '0');
                                if (remainingVal > 0) {
                                  // Optionally show a message or just don't update
                                  return;
                                }
                              }

                              const updates: any = { status: newStatus };
                              if (newStatus === 'CONCLUIDO' && !formData.completionDate) {
                                updates.completionDate = new Date().toLocaleDateString('pt-BR');
                              }
                              setFormData({ ...formData, ...updates });
                            }}
                            className="w-full px-4 py-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                          >
                            <option value="EM ORÇAMENTO">EM ORÇAMENTO</option>
                            <option value="AGUARDANDO APROVAÇÃO">AGUARDANDO APROVAÇÃO</option>
                            <option 
                              value="CONCLUIDO" 
                              disabled={parseFloat(formData.payment?.remainingAmount.replace(/[^\d,]/g, '').replace(',', '.') || '0') > 0}
                            >
                              CONCLUIDO {parseFloat(formData.payment?.remainingAmount.replace(/[^\d,]/g, '').replace(',', '.') || '0') > 0 ? '(Pendente de Pagamento)' : ''}
                            </option>
                            <option value="NÃO APROVADO">NÃO APROVADO</option>
                          </select>
                          {parseFloat(formData.payment?.remainingAmount.replace(/[^\d,]/g, '').replace(',', '.') || '0') > 0 && (
                            <p className="text-[10px] text-amber-600 font-bold flex items-center gap-1 mt-1">
                              <AlertCircle size={10} /> Status &quot;CONCLUIDO&quot; bloqueado: existe saldo restante.
                            </p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Data de Criação</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="text" 
                              value={formData.createdAt || ''}
                              onChange={(e) => setFormData({ ...formData, createdAt: formatDate(e.target.value) })}
                              className="w-full pl-9 pr-4 py-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                              placeholder="DD/MM/AAAA"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Data de Conclusão</label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="text" 
                              value={formData.completionDate || ''}
                              onChange={(e) => setFormData({ ...formData, completionDate: formatDate(e.target.value) })}
                              className="w-full pl-9 pr-4 py-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                              placeholder="DD/MM/AAAA"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Coluna Cliente e Equipamento */}
                        <div className="space-y-8">
                          <h4 className="text-sm font-bold text-[#000666] uppercase tracking-widest border-l-4 border-[#000666] pl-3">Vínculo e Identificação</h4>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente <span className="text-red-500">*</span></label>
                              <button 
                                type="button"
                                onClick={() => setIsNewClientModalOpen(true)}
                                className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                              >
                                <Plus size={10} /> Novo Cliente
                              </button>
                            </div>
                            <div className="relative">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input 
                                  type="text"
                                  required
                                  value={clientSearchTerm || (formData.clientId ? clients.find(c => c.id === formData.clientId)?.name : '')}
                                  onChange={(e) => {
                                    setClientSearchTerm(e.target.value);
                                    setShowClientResults(true);
                                    if (formData.clientId) {
                                      setFormData({ ...formData, clientId: '', equipmentId: '' });
                                    }
                                  }}
                                  onFocus={() => setShowClientResults(true)}
                                  className="w-full pl-9 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                                  placeholder="Pesquisar por nome, CPF/CNPJ ou celular..."
                                />
                                {formData.clientId && (
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setFormData({ ...formData, clientId: '', equipmentId: '' });
                                      setClientSearchTerm('');
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>

                              <AnimatePresence>
                                {showClientResults && clientSearchTerm.length > 0 && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#c6c5d4]/20 z-[120] max-h-64 overflow-y-auto"
                                  >
                                    {filteredClients.length > 0 ? (
                                      <div className="p-2 space-y-1">
                                        {filteredClients.map(c => (
                                          <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                              setFormData({ ...formData, clientId: c.id, equipmentId: '' });
                                              setClientSearchTerm(c.name);
                                              setShowClientResults(false);
                                            }}
                                            className="w-full text-left p-3 hover:bg-[#f5f2fb] rounded-xl transition-colors flex items-center justify-between group"
                                          >
                                            <div className="flex flex-col">
                                              <span className="text-sm font-bold text-[#1b1b21] group-hover:text-[#000666]">{c.name}</span>
                                              <span className="text-[10px] text-slate-400 font-mono">{c.document}</span>
                                            </div>
                                            <div className="text-right">
                                              <div className="text-[10px] font-bold text-slate-500">{c.mobile || c.phone}</div>
                                              <div className="text-[9px] text-slate-400 uppercase tracking-widest">{c.type}</div>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="p-8 text-center text-slate-400 italic text-sm">
                                        Nenhum cliente encontrado para &quot;{clientSearchTerm}&quot;
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              
                              {showClientResults && clientSearchTerm.length > 0 && (
                                <div 
                                  className="fixed inset-0 z-[115]" 
                                  onClick={() => setShowClientResults(false)}
                                />
                              )}
                            </div>
                          </div>

                        {formData.clientId && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-[#000666]/5 rounded-2xl space-y-2 border border-[#000666]/10"
                          >
                            <div className="flex items-center gap-2 text-xs font-bold text-[#000666]">
                              <User size={14} />
                              Dados do Cliente Selecionado
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="text-slate-500">Documento: <span className="text-slate-900">{clients.find(c => c.id === formData.clientId)?.document}</span></div>
                              <div className="text-slate-500">Telefone: <span className="text-slate-900">{clients.find(c => c.id === formData.clientId)?.phone}</span></div>
                            </div>
                          </motion.div>
                        )}

                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Equipamento <span className="text-red-500">*</span></label>
                            <button 
                              type="button"
                              disabled={!formData.clientId}
                              onClick={() => setIsNewEquipmentModalOpen(true)}
                              className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1 disabled:opacity-50"
                            >
                              <Plus size={10} /> Novo Equipamento
                            </button>
                          </div>
                          <select 
                            required
                            disabled={!formData.clientId}
                            value={formData.equipmentId || ''}
                            onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                            className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none disabled:opacity-50"
                          >
                            <option value="">Selecione o equipamento</option>
                            {filteredEquipment.map(e => (
                              <option key={e.id} value={e.id}>{e.brand} {e.model} ({e.serialNumber})</option>
                            ))}
                          </select>
                          {!formData.clientId && <p className="text-[10px] text-slate-400 mt-1">Selecione um cliente primeiro</p>}
                        </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Wrench size={14} className="text-[#000666]" />
                              Mecânico Responsável
                            </label>
                            <select 
                              value={formData.technician || ''}
                              onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                              className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                            >
                              <option value="">Selecione o mecânico</option>
                              {mechanics.map(m => (
                                <option key={m.id} value={m.name}>{m.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                              <Package size={14} className="text-[#000666]" />
                              Acessórios
                            </label>
                          <div className="relative">
                            <textarea 
                              rows={3}
                              value={formData.accessories || ''}
                              onChange={(e) => setFormData({ ...formData, accessories: e.target.value })}
                              className="w-full px-4 py-3 bg-[#f5f2fb] border-2 border-transparent focus:border-[#000666]/10 rounded-2xl text-sm focus:ring-0 outline-none transition-all resize-none shadow-inner"
                              placeholder="Liste os acessórios que acompanham o equipamento..."
                            />
                            <div className="absolute -left-2 top-4 w-4 h-4 bg-[#f5f2fb] rotate-45 border-l-2 border-b-2 border-transparent" />
                          </div>
                        </div>
                      </div>

                      {/* Coluna Descrições */}
                      <div className="space-y-8">
                        <h4 className="text-sm font-bold text-[#000666] uppercase tracking-widest border-l-4 border-[#000666] pl-3">Relato e Laudo</h4>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <MessageCircle size={14} className="text-[#000666]" />
                            Defeito Informado
                          </label>
                          <div className="relative">
                            <textarea 
                              rows={4}
                              value={formData.defectDescription || ''}
                              onChange={(e) => setFormData({ ...formData, defectDescription: e.target.value })}
                              className="w-full px-4 py-3 bg-[#f5f2fb] border-2 border-transparent focus:border-[#000666]/10 rounded-2xl text-sm focus:ring-0 outline-none transition-all resize-none shadow-inner"
                              placeholder="Descreva o problema relatado pelo cliente..."
                            />
                            <div className="absolute -left-2 top-4 w-4 h-4 bg-[#f5f2fb] rotate-45 border-l-2 border-b-2 border-transparent" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <ClipboardCheck size={14} className="text-[#000666]" />
                            Laudo Técnico
                          </label>
                          <div className="relative">
                            <textarea 
                              rows={6}
                              value={formData.technicalReport || ''}
                              onChange={(e) => setFormData({ ...formData, technicalReport: e.target.value })}
                              className="w-full px-4 py-3 bg-[#f0ebf8] border-2 border-transparent focus:border-[#000666]/10 rounded-2xl text-sm focus:ring-0 outline-none transition-all resize-none shadow-inner"
                              placeholder="Descreva a solução técnica, peças trocadas e diagnóstico final..."
                            />
                            <div className="absolute -left-2 top-4 w-4 h-4 bg-[#f0ebf8] rotate-45 border-l-2 border-b-2 border-transparent" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Valor Total da O.S.</label>
                          <div className="text-4xl font-black text-[#000666] font-mono">
                            {formData.total}
                          </div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Calculado automaticamente com base em peças e serviços</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                  {activeTab === 'parts' && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-[#1b1b21]">Adição de Peças</h4>
                          <p className="text-sm text-slate-500">Selecione peças do catálogo ou adicione manualmente</p>
                        </div>
                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                          <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="text"
                              value={partSearchTerm}
                              onChange={(e) => {
                                setPartSearchTerm(e.target.value);
                                setShowPartResults(true);
                              }}
                              onFocus={() => setShowPartResults(true)}
                              className="w-full pl-9 pr-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                              placeholder="Buscar por nome ou SKU..."
                            />
                            
                            <AnimatePresence>
                              {showPartResults && partSearchTerm.length > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#c6c5d4]/20 z-[110] max-h-64 overflow-y-auto"
                                >
                                  {filteredPartsList.length > 0 ? (
                                    <div className="p-2 space-y-1">
                                      {filteredPartsList.map(p => (
                                        <button
                                          key={`cat-part-${p.id}`}
                                          type="button"
                                          onClick={() => {
                                            handleAddPart(p);
                                            setPartSearchTerm('');
                                            setShowPartResults(false);
                                          }}
                                          className="w-full text-left p-3 hover:bg-[#f5f2fb] rounded-xl transition-colors flex items-center justify-between group"
                                        >
                                          <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[#1b1b21] group-hover:text-[#000666]">{p.name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono uppercase">{p.code}</span>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm font-black text-[#000666]">R$ {p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                            <div className={cn(
                                              "text-[10px] font-bold",
                                              p.stock <= p.minStock ? "text-red-500" : "text-green-500"
                                            )}>
                                              Estoque: {p.stock}
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-8 text-center text-slate-400 italic text-sm">
                                      Nenhuma peça encontrada para &quot;{partSearchTerm}&quot;
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                            
                            {showPartResults && partSearchTerm.length > 0 && (
                              <div 
                                className="fixed inset-0 z-[105]" 
                                onClick={() => setShowPartResults(false)}
                              />
                            )}
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleAddPart()}
                            className="bg-[#000666] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#000666]/90 transition-all"
                          >
                            <Plus size={18} />
                            Manual
                          </button>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-[#c6c5d4]/20 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#f5f2fb]">
                            <tr>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Descrição da Peça</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-24">Qtd</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-40">V. Unitário</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-40 text-right">V. Total</th>
                              <th className="px-6 py-4 w-16"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#c6c5d4]/10">
                            {(formData.parts || []).map((part) => (
                              <tr key={part.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3">
                                  <input 
                                    type="text"
                                    value={part.description}
                                    onChange={(e) => updateItem('parts', part.id, 'description', e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-[#1b1b21]"
                                    placeholder="Nome da peça..."
                                  />
                                </td>
                                <td className="px-6 py-3">
                                  <input 
                                    type="number"
                                    min="1"
                                    value={isNaN(part.quantity) ? '' : part.quantity}
                                    onChange={(e) => updateItem('parts', part.id, 'quantity', parseInt(e.target.value) || 0)}
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-mono text-[#000666] font-bold"
                                  />
                                </td>
                                <td className="px-6 py-3">
                                  <input 
                                    type="text"
                                    value={part.unitPrice}
                                    onChange={(e) => updateItem('parts', part.id, 'unitPrice', formatCurrency(e.target.value))}
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-mono text-slate-600"
                                  />
                                </td>
                                <td className="px-6 py-3 text-right text-sm font-black font-mono text-[#000666]">
                                  {part.totalPrice}
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <button 
                                    type="button"
                                    onClick={() => removeItem('parts', part.id)}
                                    className="p-2 text-slate-300 hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/5 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {(formData.parts || []).length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                  Nenhuma peça adicionada ainda. Selecione uma no catálogo acima.
                                </td>
                              </tr>
                            )}
                          </tbody>
                          {(formData.parts || []).length > 0 && (
                            <tfoot className="bg-[#f5f2fb]/50 border-t border-[#c6c5d4]/20">
                              <tr>
                                <td colSpan={3} className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">
                                  Total em Peças:
                                </td>
                                <td className="px-6 py-4 text-right text-lg font-black text-[#000666] font-mono">
                                  {formatCurrency((formData.parts?.reduce((acc, p) => acc + parseFloat(p.totalPrice.replace(/[^\d,]/g, '').replace(',', '.')), 0) * 100).toString())}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'services' && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h4 className="text-lg font-bold text-[#1b1b21]">Adição de Serviços</h4>
                          <p className="text-sm text-slate-500">Selecione serviços do catálogo ou adicione manualmente</p>
                        </div>
                        <div className="flex flex-wrap gap-3 w-full md:w-auto">
                          <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input 
                              type="text"
                              value={serviceSearchTerm}
                              onChange={(e) => {
                                setServiceSearchTerm(e.target.value);
                                setShowServiceResults(true);
                              }}
                              onFocus={() => setShowServiceResults(true)}
                              className="w-full pl-9 pr-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                              placeholder="Buscar serviço por nome ou código..."
                            />
                            
                            <AnimatePresence>
                              {showServiceResults && serviceSearchTerm.length > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#c6c5d4]/20 z-[110] max-h-64 overflow-y-auto"
                                >
                                  {filteredServicesList.length > 0 ? (
                                    <div className="p-2 space-y-1">
                                      {filteredServicesList.map(s => (
                                        <button
                                          key={`cat-serv-${s.id}`}
                                          type="button"
                                          onClick={() => {
                                            handleAddService(s);
                                            setServiceSearchTerm('');
                                            setShowServiceResults(false);
                                          }}
                                          className="w-full text-left p-3 hover:bg-[#f5f2fb] rounded-xl transition-colors flex items-center justify-between group"
                                        >
                                          <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[#1b1b21] group-hover:text-[#000666]">{s.name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono uppercase">{s.code}</span>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-sm font-black text-[#000666]">R$ {s.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.category}</div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="p-8 text-center text-slate-400 italic text-sm">
                                      Nenhum serviço encontrado para &quot;{serviceSearchTerm}&quot;
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                            
                            {showServiceResults && serviceSearchTerm.length > 0 && (
                              <div 
                                className="fixed inset-0 z-[105]" 
                                onClick={() => setShowServiceResults(false)}
                              />
                            )}
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleAddService()}
                            className="bg-[#000666] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#000666]/90 transition-all"
                          >
                            <Plus size={18} />
                            Manual
                          </button>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl border border-[#c6c5d4]/20 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-[#f5f2fb]">
                            <tr>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Descrição do Serviço</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-24">Qtd</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-40">V. Unitário</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest w-40 text-right">V. Total</th>
                              <th className="px-6 py-4 w-16"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#c6c5d4]/10">
                            {(formData.services || []).map((service) => (
                              <tr key={service.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-3">
                                  <input 
                                    type="text"
                                    value={service.description}
                                    onChange={(e) => updateItem('services', service.id, 'description', e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium text-[#1b1b21]"
                                    placeholder="Ex: Limpeza de carburador..."
                                  />
                                </td>
                                <td className="px-6 py-3">
                                  <input 
                                    type="number"
                                    min="1"
                                    value={isNaN(service.quantity) ? '' : service.quantity}
                                    onChange={(e) => updateItem('services', service.id, 'quantity', parseInt(e.target.value) || 0)}
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-mono text-[#000666] font-bold"
                                  />
                                </td>
                                <td className="px-6 py-3">
                                  <input 
                                    type="text"
                                    value={service.unitPrice}
                                    onChange={(e) => updateItem('services', service.id, 'unitPrice', formatCurrency(e.target.value))}
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-mono text-slate-600"
                                  />
                                </td>
                                <td className="px-6 py-3 text-right text-sm font-black font-mono text-[#000666]">
                                  {service.totalPrice}
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <button 
                                    type="button"
                                    onClick={() => removeItem('services', service.id)}
                                    className="p-2 text-slate-300 hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/5 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {(formData.services || []).length === 0 && (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                                  Nenhum serviço adicionado ainda. Selecione um no catálogo acima.
                                </td>
                              </tr>
                            )}
                          </tbody>
                          {(formData.services || []).length > 0 && (
                            <tfoot className="bg-[#f5f2fb]/50 border-t border-[#c6c5d4]/20">
                              <tr>
                                <td colSpan={3} className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">
                                  Total em Serviços:
                                </td>
                                <td className="px-6 py-4 text-right text-lg font-black text-[#000666] font-mono">
                                  {formatCurrency((formData.services?.reduce((acc, s) => acc + parseFloat(s.totalPrice.replace(/[^\d,]/g, '').replace(',', '.')), 0) * 100).toString())}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'payment' && (
                    <div className="space-y-8 max-w-4xl mx-auto">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-[#000666]/10 text-[#000666] rounded-2xl">
                          <CreditCard size={24} />
                        </div>
                        <div>
                          <h4 className="text-xl font-bold text-[#1b1b21]">Informações de Pagamento</h4>
                          <p className="text-sm text-slate-500">Gerencie a forma de pagamento e o status financeiro desta O.S.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="bg-white p-6 rounded-3xl border border-[#c6c5d4]/20 shadow-sm space-y-4">
                            <h5 className="text-sm font-bold text-[#000666] uppercase tracking-widest">Configuração</h5>
                            
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Método de Pagamento</label>
                              <select 
                                value={formData.payment?.method || ''}
                                onChange={(e) => {
                                  const method = e.target.value as any;
                                  const isSingleInstallment = ['PIX', 'Dinheiro', 'Cartão de Débito'].includes(method);
                                  let installments = formData.payment?.installments || 1;
                                  
                                  if (isSingleInstallment) {
                                    installments = 1;
                                  } else if (method === 'Cartão de Crédito') {
                                    // Ensure installments is a number and <= 10
                                    const currentInst = typeof installments === 'string' ? parseInt(installments) : installments;
                                    if (currentInst > 10) installments = 10;
                                  }

                                  setFormData({
                                    ...formData,
                                    payment: { 
                                      ...formData.payment!, 
                                      method,
                                      installments
                                    }
                                  });
                                }}
                                className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                              >
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="PIX">PIX</option>
                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                <option value="Cartão de Débito">Cartão de Débito</option>
                                <option value="Boleto">Boleto</option>
                                <option value="Transferência">Transferência</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Valor Pago (Método 1)</label>
                              <input 
                                type="text"
                                value={formData.payment?.paidAmount || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  payment: { ...formData.payment!, paidAmount: formatCurrency(e.target.value) }
                                })}
                                className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-mono text-[#000666] font-bold focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status do Pagamento</label>
                              <div className="flex gap-2">
                                {['Pendente', 'Pago'].map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => setFormData({
                                      ...formData,
                                      payment: { ...formData.payment!, status: status as any }
                                    })}
                                    className={cn(
                                      "flex-1 py-2 rounded-xl text-xs font-bold transition-all border",
                                      formData.payment?.status === status 
                                        ? "bg-[#000666] text-white border-[#000666]" 
                                        : "bg-white text-slate-500 border-[#c6c5d4]/20 hover:bg-slate-50"
                                    )}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Parcelas</label>
                              {formData.payment?.method === 'Boleto' ? (
                                <select
                                  value={formData.payment?.installments || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    let dueDate = formData.payment?.dueDate;
                                    
                                    // Handle "X dias" or "X/Y/Z" patterns
                                    if (val.includes('dias') || val.includes('/')) {
                                      const firstTerm = val.split(/[^\d]/)[0];
                                      if (firstTerm) {
                                        dueDate = calculateBoletoDueDate(parseInt(firstTerm));
                                      }
                                    }
                                    
                                    setFormData({
                                      ...formData,
                                      payment: { 
                                        ...formData.payment!, 
                                        installments: val,
                                        dueDate
                                      }
                                    });
                                  }}
                                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                                >
                                  <option value="1">1x (À vista)</option>
                                  <option value="7 dias">7 dias</option>
                                  <option value="14 dias">14 dias</option>
                                  <option value="21 dias">21 dias</option>
                                  <option value="28 dias">28 dias</option>
                                  <option value="30 dias">30 dias</option>
                                  <option value="45 dias">45 dias</option>
                                  <option value="20/40">20/40</option>
                                  <option value="21/42">21/42</option>
                                  <option value="28/56">28/56</option>
                                  <option value="28/56/84">28/56/84</option>
                                  <option value="30/60">30/60</option>
                                  <option value="30/60/90">30/60/90</option>
                                  <option value="2">2x</option>
                                  <option value="3">3x</option>
                                  <option value="4">4x</option>
                                  <option value="5">5x</option>
                                  <option value="6">6x</option>
                                  <option value="10">10x</option>
                                  <option value="12">12x</option>
                                </select>
                              ) : (
                                <input 
                                  type="number"
                                  min="1"
                                  max={formData.payment?.method === 'Cartão de Crédito' ? 10 : 12}
                                  disabled={['PIX', 'Dinheiro', 'Cartão de Débito'].includes(formData.payment?.method || '')}
                                  value={formData.payment?.installments || ''}
                                  onChange={(e) => {
                                    let val = parseInt(e.target.value) || 1;
                                    if (formData.payment?.method === 'Cartão de Crédito' && val > 10) val = 10;
                                    setFormData({
                                      ...formData,
                                      payment: { ...formData.payment!, installments: val }
                                    });
                                  }}
                                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              )}
                            </div>

                            {formData.payment?.method === 'Boleto' && (
                              <div className="mt-4 space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalhamento das Parcelas</p>
                                <div className="bg-[#f5f2fb]/50 rounded-2xl border border-[#c6c5d4]/10 overflow-hidden">
                                  {getInstallmentsList(formData.total || 'R$ 0,00', formData.payment?.installments || 1, formData.payment?.dueDate).map((inst, idx) => (
                                    <div key={idx} className="flex justify-between items-center px-4 py-3 border-b border-[#c6c5d4]/5 last:border-0">
                                      <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-[#000666]/5 flex items-center justify-center text-[10px] font-bold text-[#000666]">
                                          {idx + 1}
                                        </div>
                                        <span className="text-xs font-medium text-slate-600">Vencimento: {inst.date.split('-').reverse().join('/')}</span>
                                      </div>
                                      <span className="text-xs font-bold text-[#000666]">{inst.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {formData.payment?.method2 ? (
                            <div className="bg-white p-6 rounded-3xl border border-[#c6c5d4]/20 shadow-sm space-y-4 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-2">
                                <button 
                                  type="button"
                                  onClick={() => setFormData({
                                    ...formData,
                                    payment: { ...formData.payment!, method2: undefined, paidAmount2: 'R$ 0,00' }
                                  })}
                                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              <h5 className="text-sm font-bold text-[#000666] uppercase tracking-widest">Segundo Método</h5>
                              
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Método de Pagamento 2</label>
                                <select 
                                  value={formData.payment?.method2 || ''}
                                  onChange={(e) => {
                                    const method = e.target.value as any;
                                    const isSingleInstallment = ['PIX', 'Dinheiro', 'Cartão de Débito'].includes(method);
                                    let installments = formData.payment?.installments2 || 1;
                                    
                                    if (isSingleInstallment) {
                                      installments = 1;
                                    } else if (method === 'Cartão de Crédito') {
                                      const currentInst = typeof installments === 'string' ? parseInt(installments) : installments;
                                      if (currentInst > 10) installments = 10;
                                    }

                                    setFormData({
                                      ...formData,
                                      payment: { 
                                        ...formData.payment!, 
                                        method2: method,
                                        installments2: installments
                                      }
                                    });
                                  }}
                                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                                >
                                  <option value="Dinheiro">Dinheiro</option>
                                  <option value="PIX">PIX</option>
                                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                                  <option value="Cartão de Débito">Cartão de Débito</option>
                                  <option value="Boleto">Boleto</option>
                                  <option value="Transferência">Transferência</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Valor Pago (Método 2)</label>
                                <input 
                                  type="text"
                                  value={formData.payment?.paidAmount2 || ''}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    payment: { ...formData.payment!, paidAmount2: formatCurrency(e.target.value) }
                                  })}
                                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-mono text-[#000666] font-bold focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status do Pagamento 2</label>
                                <div className="flex gap-2">
                                  {['Pendente', 'Pago'].map((status) => (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => setFormData({
                                        ...formData,
                                        payment: { ...formData.payment!, status2: status as any }
                                      })}
                                      className={cn(
                                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all border",
                                        formData.payment?.status2 === status 
                                          ? "bg-[#000666] text-white border-[#000666]" 
                                          : "bg-white text-slate-500 border-[#c6c5d4]/20 hover:bg-slate-50"
                                      )}
                                    >
                                      {status}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Parcelas (Método 2)</label>
                                {formData.payment?.method2 === 'Boleto' ? (
                                  <select
                                    value={formData.payment?.installments2 || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      let dueDate = formData.payment?.dueDate2;
                                      
                                      if (val.includes('dias') || val.includes('/')) {
                                        const firstTerm = val.split(/[^\d]/)[0];
                                        if (firstTerm) {
                                          dueDate = calculateBoletoDueDate(parseInt(firstTerm));
                                        }
                                      }
                                      
                                      setFormData({
                                        ...formData,
                                        payment: { 
                                          ...formData.payment!, 
                                          installments2: val,
                                          dueDate2: dueDate
                                        }
                                      });
                                    }}
                                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                                  >
                                    <option value="1">1x (À vista)</option>
                                    <option value="7 dias">7 dias</option>
                                    <option value="14 dias">14 dias</option>
                                    <option value="21 dias">21 dias</option>
                                    <option value="28 dias">28 dias</option>
                                    <option value="30 dias">30 dias</option>
                                    <option value="45 dias">45 dias</option>
                                    <option value="20/40">20/40</option>
                                    <option value="21/42">21/42</option>
                                    <option value="28/56">28/56</option>
                                    <option value="28/56/84">28/56/84</option>
                                    <option value="30/60">30/60</option>
                                    <option value="30/60/90">30/60/90</option>
                                    <option value="2">2x</option>
                                    <option value="3">3x</option>
                                    <option value="4">4x</option>
                                    <option value="5">5x</option>
                                    <option value="6">6x</option>
                                    <option value="10">10x</option>
                                    <option value="12">12x</option>
                                  </select>
                                ) : (
                                  <input 
                                    type="number"
                                    min="1"
                                    max={formData.payment?.method2 === 'Cartão de Crédito' ? 10 : 12}
                                    disabled={['PIX', 'Dinheiro', 'Cartão de Débito'].includes(formData.payment?.method2 || '')}
                                    value={formData.payment?.installments2 || ''}
                                    onChange={(e) => {
                                      let val = parseInt(e.target.value) || 1;
                                      if (formData.payment?.method2 === 'Cartão de Crédito' && val > 10) val = 10;
                                      setFormData({
                                        ...formData,
                                        payment: { ...formData.payment!, installments2: val }
                                      });
                                    }}
                                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                )}
                              </div>

                              {formData.payment?.method2 === 'Boleto' && (
                                <div className="mt-4 space-y-2">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalhamento das Parcelas (M2)</p>
                                  <div className="bg-[#f5f2fb]/50 rounded-2xl border border-[#c6c5d4]/10 overflow-hidden">
                                    {getInstallmentsList(formData.payment.paidAmount2 || 'R$ 0,00', formData.payment.installments2 || 1, formData.payment.dueDate2).map((inst, idx) => (
                                      <div key={idx} className="flex justify-between items-center px-4 py-3 border-b border-[#c6c5d4]/5 last:border-0">
                                        <div className="flex items-center gap-3">
                                          <div className="w-6 h-6 rounded-full bg-[#000666]/5 flex items-center justify-center text-[10px] font-bold text-[#000666]">
                                            {idx + 1}
                                          </div>
                                          <span className="text-xs font-medium text-slate-600">Vencimento: {inst.date.split('-').reverse().join('/')}</span>
                                        </div>
                                        <span className="text-xs font-bold text-[#000666]">{inst.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                payment: { ...formData.payment!, method2: 'Dinheiro', paidAmount2: 'R$ 0,00' }
                              })}
                              className="w-full py-4 border-2 border-dashed border-[#c6c5d4]/30 rounded-3xl text-slate-400 hover:text-[#000666] hover:border-[#000666]/30 hover:bg-[#000666]/5 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                            >
                              <Plus size={18} />
                              Adicionar Segundo Método de Pagamento
                            </button>
                          )}
                        </div>

                        <div className="space-y-6">
                          <div className="bg-white p-6 rounded-3xl border border-[#c6c5d4]/15 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-[#000666] uppercase tracking-widest border-l-4 border-[#000666] pl-3">Desconto</h4>
                              <div className="flex bg-[#f5f2fb] rounded-lg p-1">
                                <button 
                                  type="button"
                                  onClick={() => setFormData({
                                    ...formData,
                                    payment: { ...formData.payment!, discountType: 'fixed' }
                                  })}
                                  className={cn(
                                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                    formData.payment?.discountType === 'fixed' ? "bg-white text-[#000666] shadow-sm" : "text-slate-500"
                                  )}
                                >
                                  R$ Fixo
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => setFormData({
                                    ...formData,
                                    payment: { ...formData.payment!, discountType: 'percentage' }
                                  })}
                                  className={cn(
                                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                                    formData.payment?.discountType === 'percentage' ? "bg-white text-[#000666] shadow-sm" : "text-slate-500"
                                  )}
                                >
                                  % Porcentagem
                                </button>
                              </div>
                            </div>

                            <div className="relative">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">
                                {formData.payment?.discountType === 'fixed' ? 'R$' : '%'}
                              </div>
                              <input 
                                type="text"
                                value={formData.payment?.discountValue || ''}
                                onChange={(e) => {
                                  const val = formData.payment?.discountType === 'fixed' 
                                    ? formatCurrency(e.target.value)
                                    : e.target.value.replace(/[^\d,]/g, '');
                                  
                                  setFormData({
                                    ...formData,
                                    payment: { ...formData.payment!, discountValue: val }
                                  });
                                }}
                                className="w-full pl-10 pr-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                                placeholder={formData.payment?.discountType === 'fixed' ? '0,00' : '0'}
                              />
                            </div>
                          </div>

                          <div className="bg-[#000666] p-8 rounded-3xl text-white shadow-xl shadow-[#000666]/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                              <DollarSign size={80} />
                            </div>
                            
                            <div className="relative z-10 space-y-6">
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">Total da Ordem</p>
                                  <p className="text-4xl font-black">{formData.total}</p>
                                </div>
                                {formData.payment?.discountValue && formData.payment?.discountValue !== '0' && formData.payment?.discountValue !== 'R$ 0,00' && (
                                  <div className="text-right">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Subtotal</p>
                                    <p className="text-sm font-bold text-white/60 line-through">{formData.payment.subtotal}</p>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">
                                      {formData.payment?.method2 ? `Valor Pago (${formData.payment.method})` : 'Valor Pago'}
                                    </p>
                                    <input 
                                      type="text"
                                      value={formData.payment?.paidAmount || ''}
                                      onChange={(e) => {
                                        const val = formatCurrency(e.target.value);
                                        setFormData({
                                          ...formData,
                                          payment: { 
                                            ...formData.payment!, 
                                            paidAmount: val
                                          }
                                        });
                                      }}
                                      className="w-full bg-white/10 border-none rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-white/20 outline-none"
                                    />
                                  </div>
                                  {formData.payment?.method2 && (
                                    <div>
                                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Valor Pago ({formData.payment.method2})</p>
                                      <input 
                                        type="text"
                                        value={formData.payment?.paidAmount2 || ''}
                                        onChange={(e) => {
                                          const val = formatCurrency(e.target.value);
                                          setFormData({
                                            ...formData,
                                            payment: { 
                                              ...formData.payment!, 
                                              paidAmount2: val
                                            }
                                          });
                                        }}
                                        className="w-full bg-white/10 border-none rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-white/20 outline-none"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Restante</p>
                                  <p className="text-lg font-bold">{formData.payment?.remainingAmount}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-[#c6c5d4]/10 p-6 flex gap-4 justify-end shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      if (onClose) onClose();
                    }}
                    className="px-8 py-3 bg-white text-slate-500 text-sm font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
                  >
                    <X size={18} />
                    Cancelar
                  </button>
                  {editingOrder && (
                    <button 
                      type="button"
                      onClick={() => {
                        const client = clients.find(c => c.id === formData.clientId);
                        const equip = equipment.find(e => e.id === formData.equipmentId);
                        if (client) {
                          const doc = generateBudgetPDF(formData as ServiceOrder, client, equip);
                          doc.save(`Orcamento_${formData.number}.pdf`);
                        }
                      }}
                      className="px-8 py-3 bg-[#f5f2fb] text-[#000666] text-sm font-bold rounded-xl border border-[#000666]/10 hover:bg-[#000666]/5 transition-all flex items-center gap-2"
                    >
                      <FileText size={18} />
                      Baixar Orçamento
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={!formData.clientId || !formData.equipmentId}
                    className="px-12 py-3 bg-[#000666] text-white text-sm font-bold rounded-xl hover:bg-[#000666]/90 transition-all flex items-center gap-2 shadow-lg shadow-[#000666]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check size={18} />
                    {editingOrder ? 'Salvar Alterações' : 'Gerar Ordem de Serviço'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Novo Cliente (Full) */}
      <ClientFormModal 
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        onSave={handleSaveNewClient}
      />

      {/* Modal Novo Equipamento (Full) */}
      <EquipmentFormModal 
        isOpen={isNewEquipmentModalOpen}
        onClose={() => setIsNewEquipmentModalOpen(false)}
        onSave={handleSaveNewEquipment}
        clients={clients}
        initialOwner={clients.find(c => c.id === formData.clientId)?.name}
      />

      {/* Modal Deletar */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setIsDeleteModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-[#1b1b21] mb-2">Excluir Ordem?</h3>
              <p className="text-slate-500 text-sm mb-8">Esta ação não pode ser desfeita. A O.S. será removida permanentemente.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
