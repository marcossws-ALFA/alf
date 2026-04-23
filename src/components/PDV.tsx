"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  CreditCard, 
  DollarSign, 
  CheckCircle2,
  X,
  Package,
  Wrench,
  ChevronRight,
  ArrowRight,
  History,
  FileText,
  Receipt,
  Printer,
  Mail,
  MessageCircle,
  Download,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Part, Service, Client, Transaction, PDVOrder, Seller } from '@/src/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ClientFormModal from './ClientFormModal';
import { useFirebase } from '@/src/context/FirebaseContext';

interface PDVProps {
  parts: Part[];
  services: Service[];
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setParts: React.Dispatch<React.SetStateAction<Part[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  pdvOrders: PDVOrder[];
  setPdvOrders: React.Dispatch<React.SetStateAction<PDVOrder[]>>;
  sellers: Seller[];
  initialOrderId?: string | null;
  onModalClose?: () => void;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'part' | 'service';
}

export default function PDV({ parts, services, clients, setClients, setParts, setTransactions, pdvOrders, setPdvOrders, sellers, initialOrderId, onModalClose }: PDVProps) {
  const { actions } = useFirebase();
  const [activeTab, setActiveTab] = useState<'venda' | 'vendas' | 'orcamentos'>('venda');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('');
  const [sellerError, setSellerError] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'PIX' | 'Boleto' | 'Transferência'>('PIX');
  const [installments, setInstallments] = useState<string | number>(1);
  const [paymentMethod2, setPaymentMethod2] = useState<'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'PIX' | 'Boleto' | 'Transferência' | 'Nenhum'>('Nenhum');
  const [installments2, setInstallments2] = useState<string | number>(1);
  const [paidAmount1, setPaidAmount1] = useState<string>('');
  const [paidAmount2, setPaidAmount2] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Venda realizada com sucesso!');
  const [selectedOrder, setSelectedOrder] = useState<PDVOrder | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isPostSaleModalOpen, setIsPostSaleModalOpen] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<PDVOrder | null>(null);
  const [customNumber, setCustomNumber] = useState('');

  useEffect(() => {
    // Sugerir o próximo número sequencial por padrão
    const nextNumber = (pdvOrders.length + 1).toString().padStart(4, '0');
    setCustomNumber(nextNumber);
  }, [pdvOrders.length]);

  useEffect(() => {
    if (initialOrderId) {
      const order = pdvOrders.find(o => o.id === initialOrderId);
      if (order) {
        setSelectedOrder(order);
        setIsOrderDetailOpen(true);
      }
    }
  }, [initialOrderId, pdvOrders]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    
    const matchedParts = parts.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.code.toLowerCase().includes(term)
    ).map(p => ({ ...p, type: 'part' as const }));

    const matchedServices = services.filter(s => 
      s.name.toLowerCase().includes(term) || 
      s.code.toLowerCase().includes(term)
    ).map(s => ({ ...s, type: 'service' as const }));

    return [...matchedParts, ...matchedServices];
  }, [searchTerm, parts, services]);

  const addToCart = (item: Part | Service, type: 'part' | 'service') => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === type);
      if (existing) {
        return prev.map(i => (i.id === item.id && i.type === type) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { 
        id: item.id, 
        name: item.name, 
        price: item.price, 
        quantity: 1, 
        type 
      }];
    });
    setSearchTerm('');
  };

  const updateQuantity = (id: string, type: 'part' | 'service', delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && item.type === type) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string, type: 'part' | 'service') => {
    setCart(prev => prev.filter(i => !(i.id === id && i.type === type)));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCreateClient = async (newClient: Client) => {
    try {
      const docRef = await actions.add('clients', newClient);
      setSelectedClient({ id: docRef.id, ...newClient });
      setIsNewClientModalOpen(false);
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const convertQuoteToSale = async (order: PDVOrder) => {
    // 1. Create transactions
    const transactionsToAdd: Transaction[] = [];
    
    const processMethod = (method: string, amount: number, inst: number, isSecond: boolean = false) => {
      if (amount <= 0) return;

      // If it's Card, generate a single transaction even if it's installments
      if (method.includes('Cartão')) {
        const newTransaction: Transaction = {
          id: Math.random().toString(36).substr(2, 9),
          description: `Venda PDV #${order.number} - ${order.items.length} itens${isSecond ? ' (M2)' : ''}`,
          category: 'Vendas',
          type: 'Receita',
          entity: order.clientName,
          date: new Date().toLocaleDateString('pt-BR'),
          dueDate: new Date().toLocaleDateString('pt-BR'),
          paymentDate: order.status === 'Finalizado' ? new Date().toLocaleDateString('pt-BR') : undefined,
          status: 'Pendente',
          value: amount,
          paymentMethod: method,
          notes: order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
        };
        transactionsToAdd.push(newTransaction);
      } else {
        const installmentValue = amount / inst;
        const baseDate = new Date();

        for (let i = 0; i < inst; i++) {
          const dueDate = new Date(baseDate);
          dueDate.setMonth(baseDate.getMonth() + i);
          
          const newTransaction: Transaction = {
            id: Math.random().toString(36).substr(2, 9),
            description: `Venda PDV #${order.number} - ${order.items.length} itens ${inst > 1 ? `(${i + 1}/${inst})` : ''}${isSecond ? ' (M2)' : ''}`,
            category: 'Vendas',
            type: 'Receita',
            entity: order.clientName,
            date: new Date().toLocaleDateString('pt-BR'),
            dueDate: dueDate.toLocaleDateString('pt-BR'),
            paymentDate: (i === 0 && inst === 1) ? new Date().toLocaleDateString('pt-BR') : undefined,
            status: (i === 0 && inst === 1) ? 'Pago' : 'Pendente',
            value: installmentValue,
            paymentMethod: method,
            notes: order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')
          };
          transactionsToAdd.push(newTransaction);
        }
      }
    };

    const amount1 = order.paidAmount1 ?? order.total;
    const amount2 = order.paidAmount2 ?? 0;

    processMethod(order.paymentMethod, amount1, order.installments);
    if (order.paymentMethod2 && order.paymentMethod2 !== 'Nenhum') {
      processMethod(order.paymentMethod2, amount2, order.installments2 || 1, true);
    }

    try {
      // Add transactions
      for (const t of transactionsToAdd) {
        await actions.add('transactions', t);
      }

      // 2. Update stock
      for (const item of order.items) {
        if (item.type === 'part') {
          const part = parts.find(p => p.id === item.id);
          if (part) {
            await actions.update('parts', part.id, { stock: part.stock - item.quantity });
          }
        }
      }

      // 3. Update order status
      await actions.update('pdv_orders', order.id, { status: 'Finalizado' });

      setSuccessMessage('Orçamento convertido em venda!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error converting quote to sale:', error);
    }
  };

  const revertSaleToQuote = async (order: PDVOrder) => {
    try {
      // 1. Revert stock (add back items)
      for (const item of order.items) {
        if (item.type === 'part') {
          const part = parts.find(p => p.id === item.id);
          if (part) {
            await actions.update('parts', part.id, { stock: part.stock + item.quantity });
          }
        }
      }

      // 2. Update order status
      await actions.update('pdv_orders', order.id, { status: 'Orçamento' });

      setSuccessMessage('Venda retornada para orçamento!');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error reverting sale to quote:', error);
    }
  };

  const openOrderDetails = (order: PDVOrder) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };
  const calculateBoletoDueDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('pt-BR');
  };

  const getInstallmentsList = (amount: number, inst: string | number) => {
    let installmentTerms: number[] = [];

    if (typeof inst === 'string') {
      if (inst.includes('/')) {
        installmentTerms = inst.split('/').map(t => parseInt(t.trim())).filter(t => !isNaN(t));
      } else if (inst.includes('dias')) {
        installmentTerms = [parseInt(inst.split(' ')[0])];
      } else {
        const num = parseInt(inst);
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
      if (inst === 1) {
        installmentTerms = [0];
      } else {
        for (let i = 1; i <= inst; i++) {
          installmentTerms.push(i * 30);
        }
      }
    }

    if (installmentTerms.length === 0) installmentTerms = [0];

    const installmentValue = amount / installmentTerms.length;

    return installmentTerms.map((days) => {
      return {
        date: calculateBoletoDueDate(days),
        value: installmentValue
      };
    });
  };

  const handleFinalizeSale = async (status: 'Finalizado' | 'Orçamento' = 'Finalizado') => {
    if (!selectedSellerId) {
      setSellerError(true);
      return;
    }
    setSellerError(false);

    const orderNumber = customNumber || (pdvOrders.length + 1).toString().padStart(4, '0');
    const seller = sellers.find(s => s.id === selectedSellerId);
    
    const amount1 = parseFloat(paidAmount1.replace(/[^\d,]/g, '').replace(',', '.') || subtotal.toString());
    const amount2 = parseFloat(paidAmount2.replace(/[^\d,]/g, '').replace(',', '.') || '0');

    try {
      if (status === 'Finalizado') {
        const transactionsToAdd: Transaction[] = [];
        
        const processMethod = (method: string, amount: number, inst: string | number, isSecond: boolean = false) => {
          if (amount <= 0) return;

          const instList = getInstallmentsList(amount, inst);

          instList.forEach((item, idx) => {
            const newTransaction: Transaction = {
              id: Math.random().toString(36).substr(2, 9),
              description: `Venda PDV #${orderNumber} - ${cart.length} itens ${instList.length > 1 ? `(${idx + 1}/${instList.length})` : ''}${isSecond ? ' (M2)' : ''}`,
              category: 'Vendas',
              type: 'Receita',
              entity: selectedClient?.name || 'Cliente Consumidor',
              date: new Date().toLocaleDateString('pt-BR'),
              dueDate: item.date,
              paymentDate: (idx === 0 && instList.length === 1) ? new Date().toLocaleDateString('pt-BR') : undefined,
              status: (idx === 0 && instList.length === 1) ? 'Pago' : 'Pendente',
              value: item.value,
              paymentMethod: instList.length > 1 ? `${method} (${instList.length}x)` : method,
              notes: cart.map(i => `${i.quantity}x ${i.name}`).join(', ')
            };
            transactionsToAdd.push(newTransaction);
          });
        };

        processMethod(paymentMethod, amount1, installments);
        if (paymentMethod2 !== 'Nenhum') {
          processMethod(paymentMethod2, amount2, installments2, true);
        }

        // Add transactions
        for (const t of transactionsToAdd) {
          await actions.add('transactions', t);
        }

        // Update stock for parts
        for (const cartItem of cart) {
          if (cartItem.type === 'part') {
            const part = parts.find(p => p.id === cartItem.id);
            if (part) {
              await actions.update('parts', part.id, { stock: part.stock - cartItem.quantity });
            }
          }
        }
      }

      // Save PDV Order
      const orderData: any = {
        number: orderNumber,
        clientId: selectedClient?.id || null,
        clientName: selectedClient?.name || 'Cliente Consumidor',
        items: cart.map(item => ({ ...item })),
        total: subtotal,
        paymentMethod: Number(installments) > 1 ? `${paymentMethod} (${installments}x)` : paymentMethod,
        installments: installments,
        paymentMethod2: paymentMethod2 !== 'Nenhum' ? (Number(installments2) > 1 ? `${paymentMethod2} (${installments2}x)` : paymentMethod2) : null,
        installments2: paymentMethod2 !== 'Nenhum' ? installments2 : null,
        paidAmount1: amount1,
        paidAmount2: paymentMethod2 !== 'Nenhum' ? amount2 : null,
        sellerName: seller?.name || null,
        date: new Date().toLocaleDateString('pt-BR'),
        status
      };

      const docRef = await actions.add('pdv_orders', orderData);
      setLastCreatedOrder({ id: docRef.id, ...orderData });

      setCart([]);
      setSelectedClient(null);
      setSelectedSellerId('');
      setPaymentMethod('PIX');
      setInstallments(1);
      setPaymentMethod2('Nenhum');
      setInstallments2(1);
      setPaidAmount1('');
      setPaidAmount2('');
      setIsCheckoutModalOpen(false);
      setSuccessMessage(status === 'Finalizado' ? 'Venda realizada com sucesso!' : 'Orçamento salvo com sucesso!');
      setIsPostSaleModalOpen(true);
    } catch (error) {
      console.error('Error finalizing sale:', error);
    }
  };

  const generatePDF = (order: PDVOrder) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('ALFAMAQ MANUTENÇÃO', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Comprovante de Pedido', 105, 28, { align: 'center' });
    
    // Order Info
    doc.setFontSize(12);
    doc.text(`Pedido: #${order.number}`, 20, 40);
    doc.text(`Data: ${order.date}`, 20, 48);
    doc.text(`Status: ${order.status}`, 20, 56);
    
    // Client Info
    doc.text('Cliente:', 20, 70);
    doc.setFontSize(10);
    doc.text(order.clientName, 20, 76);

    if (order.sellerName) {
      doc.setFontSize(12);
      doc.text('Vendedor:', 140, 70);
      doc.setFontSize(10);
      doc.text(order.sellerName, 140, 76);
    }
    
    // Items Table
    const tableData = order.items.map(item => [
      item.name,
      item.quantity.toString(),
      `R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['Item', 'Qtd', 'Unitário', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 6, 102] }
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(14);
    doc.text(`TOTAL: R$ ${order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 190, finalY + 20, { align: 'right' });
    
    doc.setFontSize(10);
    doc.text(`Forma de Pagamento: ${order.paymentMethod}${order.paymentMethod2 ? ` + ${order.paymentMethod2}` : ''}`, 20, finalY + 20);

    return doc;
  };

  const handlePrint = (order: PDVOrder) => {
    const doc = generatePDF(order);
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const handleDownload = (order: PDVOrder) => {
    const doc = generatePDF(order);
    doc.save(`pedido_${order.number}.pdf`);
  };

  const handleWhatsApp = (order: PDVOrder) => {
    const message = `Olá! Segue o resumo do seu pedido #${order.number} na ALFAMAQ MANUTENÇÃO:\n\n` +
      `Data: ${order.date}\n` +
      (order.sellerName ? `Vendedor: ${order.sellerName}\n` : '') +
      `Total: R$ ${order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n` +
      `Pagamento: ${order.paymentMethod}${order.paymentMethod2 ? ` + ${order.paymentMethod2}` : ''}\n` +
      `Status: ${order.status}\n\n` +
      `Itens:\n` +
      order.items.map(i => `- ${i.quantity}x ${i.name}`).join('\n') +
      `\n\nObrigado pela preferência!`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleEmail = (order: PDVOrder) => {
    const subject = encodeURIComponent(`Pedido #${order.number} - ALFAMAQ MANUTENÇÃO`);
    const body = encodeURIComponent(`Olá!\n\nSegue o resumo do seu pedido #${order.number}:\n\nTotal: R$ ${order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nStatus: ${order.status}\n\nObrigado!`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const displayedOrders = useMemo(() => {
    if (activeTab === 'vendas') {
      return pdvOrders.filter(o => o.status === 'Finalizado');
    }
    if (activeTab === 'orcamentos') {
      return pdvOrders.filter(o => o.status === 'Orçamento');
    }
    return [];
  }, [pdvOrders, activeTab]);

  return (
    <div className="flex flex-col gap-4 lg:gap-6 lg:h-[calc(100vh-12rem)]">
      {/* PDV Header Tabs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#c6c5d4]/10 w-fit self-center lg:self-start overflow-x-auto max-w-full no-scrollbar">
        <button
          onClick={() => setActiveTab('venda')}
          className={cn(
            "px-4 lg:px-6 py-2.5 rounded-xl text-[10px] lg:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'venda' ? "bg-[#000666] text-white shadow-lg shadow-[#000666]/20" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <ShoppingCart size={16} className="shrink-0" />
          Nova Venda
        </button>
        <button
          onClick={() => setActiveTab('vendas')}
          className={cn(
            "px-4 lg:px-6 py-2.5 rounded-xl text-[10px] lg:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'vendas' ? "bg-[#000666] text-white shadow-lg shadow-[#000666]/20" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <History size={16} className="shrink-0" />
          Vendas
        </button>
        <button
          onClick={() => setActiveTab('orcamentos')}
          className={cn(
            "px-4 lg:px-6 py-2.5 rounded-xl text-[10px] lg:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap",
            activeTab === 'orcamentos' ? "bg-[#000666] text-white shadow-lg shadow-[#000666]/20" : "text-slate-500 hover:bg-slate-50"
          )}
        >
          <FileText size={16} className="shrink-0" />
          Orçamentos
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'venda' ? (
          <motion.div 
            key="venda"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden"
          >
            {/* Left Side: Search and Items */}
            <div className="flex-1 flex flex-col gap-4 lg:gap-6 overflow-hidden">
              <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-sm border border-[#c6c5d4]/10">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Buscar produto ou serviço..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 lg:py-4 bg-[#f5f2fb] border-none rounded-2xl text-base lg:text-lg font-medium text-[#1b1b21] placeholder:text-slate-400 focus:ring-2 focus:ring-[#000666]/5 outline-none transition-all"
                  />
                </div>

                <AnimatePresence>
                  {searchTerm && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-4 max-h-96 overflow-y-auto divide-y divide-[#c6c5d4]/10 scrollbar-thin scrollbar-thumb-slate-200"
                    >
                      {filteredItems.map((item) => (
                        <button 
                          key={`${item.type}-${item.id}`}
                          onClick={() => addToCart(item as any, item.type)}
                          className="w-full flex items-center justify-between p-4 hover:bg-[#f5f2fb] transition-colors text-left group"
                        >
                          <div className="flex items-center gap-3 lg:gap-4">
                            <div className={cn(
                              "p-2 rounded-xl",
                              item.type === 'part' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            )}>
                              {item.type === 'part' ? <Package size={18} /> : <Wrench size={18} />}
                            </div>
                            <div>
                              <p className="font-bold text-[#1b1b21] text-sm lg:text-base">{item.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                {item.type === 'part' ? `Estoque: ${(item as Part).stock}` : 'Serviço'} • {item.code}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 lg:gap-4">
                            <p className="font-black text-[#000666] text-sm lg:text-base">
                              R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <div className="p-1.5 bg-[#000666] text-white rounded-lg lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                              <Plus size={14} />
                            </div>
                          </div>
                        </button>
                      ))}
                      {filteredItems.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                          <p className="text-sm">Nenhum item encontrado para &quot;{searchTerm}&quot;</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex-1 bg-white rounded-3xl shadow-sm border border-[#c6c5d4]/10 p-6 lg:p-12 flex flex-col items-center justify-center text-slate-400 text-center min-h-[200px]">
                <div className="p-6 bg-[#f5f2fb] rounded-full mb-4">
                  <ShoppingCart size={48} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-500 mb-2">PDV Pronto</h3>
                <p className="max-w-xs text-sm">Adicione produtos e serviços para iniciar uma venda ou orçamento.</p>
              </div>
            </div>

            {/* Right Side: Cart */}
            <div className="w-full lg:w-96 flex flex-col gap-4 lg:gap-6 h-[400px] lg:h-auto">
              <div className="flex-1 bg-white rounded-3xl shadow-sm border border-[#c6c5d4]/10 flex flex-col overflow-hidden">
                <div className="p-4 lg:p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb]/50">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={18} className="text-[#000666]" />
                    <h3 className="font-bold text-[#1b1b21] text-sm lg:text-base">Carrinho</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-[#000666] text-white text-[9px] lg:text-[10px] font-black rounded-full">
                    {cart.reduce((acc, i) => acc + i.quantity, 0)} ITENS
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-2 lg:space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
                  {cart.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="p-3 bg-[#f5f2fb]/50 rounded-2xl border border-[#c6c5d4]/5 flex flex-col gap-2 lg:gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs lg:text-sm font-bold text-[#1b1b21] truncate">{item.name}</p>
                          <p className="text-[9px] lg:text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / un
                          </p>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.id, item.type)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-[#c6c5d4]/10 p-1">
                          <button 
                            onClick={() => updateQuantity(item.id, item.type, -1)}
                            className="p-1 hover:bg-slate-50 rounded text-slate-500"
                          >
                            <Minus size={10} />
                          </button>
                          <span className="w-6 lg:w-8 text-center text-[10px] lg:text-xs font-black text-[#000666]">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.type, 1)}
                            className="p-1 hover:bg-slate-50 rounded text-slate-500"
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                        <p className="text-xs lg:text-sm font-black text-[#000666]">
                          R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                      <ShoppingCart size={32} className="mb-2 opacity-10" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Carrinho Vazio</p>
                    </div>
                  )}
                </div>

                <div className="p-4 lg:p-6 bg-[#f5f2fb]/80 border-t border-[#c6c5d4]/10 space-y-3 lg:space-y-4">
                  <div className="space-y-1 lg:space-y-2">
                    <div className="flex justify-between text-slate-500">
                      <span className="text-[10px] lg:text-sm font-bold uppercase tracking-widest">Subtotal</span>
                      <span className="text-xs lg:text-sm font-bold">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[#c6c5d4]/10">
                      <span className="text-xs lg:text-sm font-black text-[#1b1b21] uppercase tracking-widest">Total</span>
                      <span className="text-xl lg:text-2xl font-black text-[#000666]">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <button 
                    disabled={cart.length === 0}
                    onClick={() => {
                      setSellerError(false);
                      setIsCheckoutModalOpen(true);
                    }}
                    className="w-full py-3 lg:py-4 bg-[#000666] text-white rounded-2xl font-bold shadow-lg shadow-[#000666]/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 text-xs lg:text-base"
                  >
                    Finalizar
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 bg-white rounded-3xl shadow-sm border border-[#c6c5d4]/10 overflow-hidden flex flex-col"
          >
            <div className="p-4 lg:p-6 border-b border-[#c6c5d4]/10 bg-[#f5f2fb]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#000666] text-white rounded-xl">
                  {activeTab === 'vendas' ? <History size={18} /> : <FileText size={18} />}
                </div>
                <h3 className="text-base lg:text-xl font-bold text-[#000666]">
                  {activeTab === 'vendas' ? 'Vendas' : 'Orçamentos'}
                </h3>
              </div>
              <span className="px-3 py-1 bg-[#000666]/10 text-[#000666] text-[10px] lg:text-xs font-black rounded-full">
                {displayedOrders.length} {activeTab === 'vendas' ? 'VENDAS' : 'ORÇAMENTOS'}
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {/* Desktop View */}
              <table className="hidden lg:table w-full text-left border-collapse">
                <thead className="bg-[#f5f2fb]/30">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Nº Pedido</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Cliente</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Vendedor</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Pagamento</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Total</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c6c5d4]/10">
                  {displayedOrders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      onClick={() => openOrderDetails(order)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-black text-[#000666]">#{order.number}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{order.date}</td>
                      <td className="px-6 py-4 text-sm font-bold text-[#1b1b21]">{order.clientName}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{order.sellerName || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {order.paymentMethod}
                        {order.paymentMethod2 && <span className="block text-[10px] text-slate-400">+ {order.paymentMethod2}</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          order.status === 'Finalizado' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        )}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-black text-[#1b1b21]">
                          R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {order.status === 'Orçamento' ? (
                            <button 
                              onClick={() => convertQuoteToSale(order)}
                              className="p-2 bg-[#000666] text-white rounded-lg hover:scale-105 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                            >
                              <CheckCircle2 size={12} />
                              Faturar
                            </button>
                          ) : (
                            <button 
                              onClick={() => revertSaleToQuote(order)}
                              className="p-2 bg-amber-500 text-white rounded-lg hover:scale-105 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                            >
                              <FileText size={12} />
                              Retornar
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsOrderDetailOpen(true);
                            }}
                            className="p-2 bg-[#f5f2fb] text-[#000666] rounded-lg hover:bg-white transition-all"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile View */}
              <div className="lg:hidden flex-1 overflow-y-auto divide-y divide-slate-100">
                {displayedOrders.map((order) => (
                  <div 
                    key={order.id} 
                    onClick={() => openOrderDetails(order)}
                    className="p-4 space-y-3 bg-white active:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-[#000666]">Pedido #{order.number}</span>
                        <span className="text-sm font-black text-[#1b1b21]">{order.clientName}</span>
                        <span className="text-[10px] text-slate-500">{order.date}</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest",
                        order.status === 'Finalizado' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                      <div className="text-sm font-black text-[#000666]">
                        R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="flex gap-2">
                        {order.status === 'Orçamento' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); convertQuoteToSale(order); }}
                            className="p-2 bg-[#000666] text-white rounded-lg text-[9px] font-black uppercase"
                          >
                            Faturar
                          </button>
                        )}
                        <ChevronRight size={18} className="text-slate-300" />
                      </div>
                    </div>
                  </div>
                ))}
                {displayedOrders.length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                    <History size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold uppercase tracking-widest">Nenhum registro encontrado</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutModalOpen(false)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 lg:p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    <CheckCircle2 size={18} className="lg:size-5" />
                  </div>
                  <h3 className="text-base lg:text-xl font-bold text-[#000666]">Finalizar</h3>
                </div>
                <button onClick={() => setIsCheckoutModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 p-4 lg:p-8 space-y-4 lg:space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Número do Pedido</label>
                  <input 
                    type="text" 
                    value={customNumber}
                    readOnly
                    className="w-full px-4 py-2.5 bg-[#f5f2fb] border-none rounded-xl text-xs lg:text-sm font-black text-[#000666] opacity-70 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cliente</label>
                    <button 
                      onClick={() => setIsNewClientModalOpen(true)}
                      className="text-[9px] font-black text-[#000666] uppercase tracking-widest flex items-center gap-1"
                    >
                      <Plus size={10} />
                      Novo
                    </button>
                  </div>
                  <select 
                    value={selectedClient?.id || ''}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === e.target.value);
                      setSelectedClient(client || null);
                    }}
                    className="w-full px-4 py-2.5 bg-[#f5f2fb] border-none rounded-xl text-xs lg:text-sm font-bold text-[#1b1b21] outline-none"
                  >
                    <option value="">Cliente Consumidor</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vendedor <span className="text-red-500">*</span></label>
                  <select 
                    value={selectedSellerId}
                    onChange={(e) => {
                      setSelectedSellerId(e.target.value);
                      setSellerError(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 bg-[#f5f2fb] border-none rounded-xl text-xs lg:text-sm font-bold text-[#1b1b21] outline-none",
                      sellerError && "ring-1 ring-red-500"
                    )}
                  >
                    <option value="">Selecione</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Method 1 */}
                <div className="space-y-3 p-3 lg:p-4 bg-[#f5f2fb]/50 rounded-2xl border border-[#c6c5d4]/10">
                  <h4 className="text-[9px] font-black text-[#000666] uppercase tracking-widest">Pagamento 1</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {(['PIX', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Boleto', 'Transferência'] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => {
                          setPaymentMethod(method);
                          if (!method.includes('Cartão') && method !== 'Boleto') setInstallments(1);
                        }}
                        className={cn(
                          "py-2 rounded-lg text-[9px] font-bold transition-all border",
                          paymentMethod === method 
                            ? "bg-[#000666] text-white border-[#000666]" 
                            : "bg-white text-slate-500 border-slate-100"
                        )}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Valor</label>
                      <input 
                        type="text"
                        value={paidAmount1}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const amount = parseInt(digits || '0') / 100;
                          setPaidAmount1(new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount));
                        }}
                        className="w-full px-3 py-2 bg-white border border-[#c6c5d4]/20 rounded-lg text-xs font-bold text-[#000666]"
                      />
                    </div>
                    {(paymentMethod === 'Cartão de Crédito' || paymentMethod === 'Boleto') && (
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Parcelas</label>
                        <select 
                          value={installments}
                          onChange={(e) => setInstallments(isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white border border-[#c6c5d4]/20 rounded-lg text-xs font-bold"
                        >
                          {paymentMethod === 'Boleto' ? (
                            <>
                              <option value="1">1x</option>
                              <option value="7 dias">7d</option>
                              <option value="15 dias">15d</option>
                              <option value="30 dias">30d</option>
                              <option value="28/56/84">28/56/84</option>
                            </>
                          ) : (
                            [1,2,3,4,5,6,10,12].map(n => <option key={n} value={n}>{n}x</option>)
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals and Buttons */}
                <div className="p-4 bg-[#000666] rounded-2xl text-white space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase opacity-60">Total</span>
                    <span className="text-xl lg:text-2xl font-black">R$ {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                    <button 
                      onClick={() => handleFinalizeSale('Orçamento')}
                      className="py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-bold uppercase transition-all"
                    >
                      Orçamento
                    </button>
                    <button 
                      onClick={() => handleFinalizeSale('Finalizado')}
                      className="py-2.5 bg-white text-[#000666] rounded-xl text-[10px] font-black uppercase shadow-lg transition-all"
                    >
                      Vender
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post-Sale Options Modal */}
      <AnimatePresence>
        {isPostSaleModalOpen && lastCreatedOrder && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#000666]/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={40} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-[#000666]">{successMessage}</h3>
                  <p className="text-slate-500 font-medium">Pedido <span className="font-bold text-[#000666]">#{lastCreatedOrder.number}</span> processado com sucesso.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button 
                    onClick={() => handlePrint(lastCreatedOrder)}
                    className="flex flex-col items-center justify-center gap-3 p-4 bg-[#f5f2fb] hover:bg-[#000666] hover:text-white rounded-3xl transition-all group"
                  >
                    <Printer size={24} className="text-[#000666] group-hover:text-white" />
                    <span className="text-xs font-bold uppercase tracking-widest">Imprimir A4</span>
                  </button>
                  
                  <button 
                    onClick={() => handleDownload(lastCreatedOrder)}
                    className="flex flex-col items-center justify-center gap-3 p-4 bg-[#f5f2fb] hover:bg-[#000666] hover:text-white rounded-3xl transition-all group"
                  >
                    <Download size={24} className="text-[#000666] group-hover:text-white" />
                    <span className="text-xs font-bold uppercase tracking-widest">Download PDF</span>
                  </button>

                  <button 
                    onClick={() => handleWhatsApp(lastCreatedOrder)}
                    className="flex flex-col items-center justify-center gap-3 p-4 bg-[#f5f2fb] hover:bg-[#25D366] hover:text-white rounded-3xl transition-all group"
                  >
                    <MessageCircle size={24} className="text-[#25D366] group-hover:text-white" />
                    <span className="text-xs font-bold uppercase tracking-widest">WhatsApp</span>
                  </button>

                  <button 
                    onClick={() => handleEmail(lastCreatedOrder)}
                    className="flex flex-col items-center justify-center gap-3 p-4 bg-[#f5f2fb] hover:bg-[#000666] hover:text-white rounded-3xl transition-all group"
                  >
                    <Mail size={24} className="text-[#000666] group-hover:text-white" />
                    <span className="text-xs font-bold uppercase tracking-widest">E-mail</span>
                  </button>
                </div>

                <button 
                  onClick={() => setIsPostSaleModalOpen(false)}
                  className="w-full py-4 bg-[#000666] text-white rounded-2xl font-bold shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Continuar Vendendo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {isOrderDetailOpen && selectedOrder && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsOrderDetailOpen(false);
                if (onModalClose) onModalClose();
              }}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 lg:p-6 border-b border-[#c6c5d4]/10 flex items-center justify-between bg-[#f5f2fb]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    <Receipt size={18} className="lg:size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm lg:text-xl font-bold text-[#000666]">Pedido #{selectedOrder.number}</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedOrder.date}</p>
                  </div>
                </div>
                <button onClick={() => {
                  setIsOrderDetailOpen(false);
                  if (onModalClose) onModalClose();
                }} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-4 lg:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                  <div className="p-3 bg-[#f5f2fb] rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                    <p className="text-xs lg:text-sm font-bold text-[#1b1b21]">{selectedOrder.clientName}</p>
                  </div>
                  <div className="p-3 bg-[#f5f2fb] rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                      selectedOrder.status === 'Finalizado' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="p-3 bg-[#f5f2fb] rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-sm lg:text-base font-black text-[#000666]">R$ {selectedOrder.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 lg:mb-3">Itens</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 lg:p-3 bg-white border border-[#c6c5d4]/10 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-1.5 rounded-lg",
                            item.type === 'part' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                          )}>
                            {item.type === 'part' ? <Package size={14} /> : <Wrench size={14} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] lg:text-sm font-bold text-[#1b1b21] truncate">{item.name}</p>
                            <p className="text-[9px] lg:text-[10px] text-slate-500 font-bold">
                              {item.quantity}x R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        <p className="text-[11px] lg:text-sm font-black text-[#000666]">
                          R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 lg:p-6 border-t border-[#c6c5d4]/10 bg-[#f5f2fb]/50 flex flex-col sm:flex-row justify-end gap-2 lg:gap-3">
                {selectedOrder.status === 'Orçamento' ? (
                  <button 
                    onClick={() => {
                      convertQuoteToSale(selectedOrder);
                      setIsOrderDetailOpen(false);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-[#000666] text-white rounded-xl text-xs lg:text-sm font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all text-center"
                  >
                    <CheckCircle2 size={16} />
                    Faturar
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      revertSaleToQuote(selectedOrder);
                      setIsOrderDetailOpen(false);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-white rounded-xl text-xs lg:text-sm font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all text-center"
                  >
                    <FileText size={16} />
                    Retornar
                  </button>
                )}
                <button 
                  onClick={() => handleDownload(selectedOrder)}
                  className="w-full sm:w-auto px-6 py-3 bg-[#f5f2fb] text-[#000666] rounded-xl text-xs lg:text-sm font-bold flex items-center justify-center gap-2 hover:bg-white transition-all border border-[#c6c5d4]/10 text-center"
                >
                  <Download size={16} />
                  PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] bg-[#1b6d24] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 size={24} />
            <p className="font-bold">{successMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
      {/* New Client Modal */}
      <ClientFormModal 
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        onSave={handleCreateClient}
      />
    </div>
  );
}
