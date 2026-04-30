"use client";

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronLeft, 
  Users, 
  Verified, 
  Clock, 
  TrendingUp, 
  MoreVertical,
  Upload,
  Download,
  Mail,
  Zap,
  X,
  Edit2,
  Trash2,
  Check,
  Cpu,
  Forklift,
  Settings,
  FileText,
  FileSpreadsheet,
  FileDown,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Client, Equipment, ServiceOrder } from '@/src/types';
import { formatDocument, formatCEP, formatPhone } from '@/src/lib/formatters';
import ClientFormModal from './ClientFormModal';
import { useFirebase } from '@/src/context/FirebaseContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ClientsProps {
  equipmentList: Equipment[];
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  orders: ServiceOrder[];
  onOpenOS?: (id: string) => void;
}

export default function Clients({ equipmentList, clients, setClients, orders, onOpenOS }: ClientsProps) {
  const { actions } = useFirebase();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [pendingImportClients, setPendingImportClients] = useState<Client[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [tempContact, setTempContact] = useState({ name: '', phone: '', email: '' });
  
  const [viewingEquipmentClient, setViewingEquipmentClient] = useState<Client | null>(null);
  const [viewingEquipmentOrders, setViewingEquipmentOrders] = useState<Equipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const generatePDF = (filter: string) => {
    const doc = new jsPDF();
    const title = filter === 'Todos' ? 'Relatório Geral de Clientes' : `Relatório de Clientes - ${filter}`;
    
    const dataToExport = filter === 'Todos' 
      ? clients 
      : clients.filter(c => c.status === filter);

    doc.setFontSize(18);
    doc.setTextColor(0, 6, 102); // #000666
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    doc.text(`Total de itens: ${dataToExport.length}`, 14, 35);

    const tableData = dataToExport.map(c => [
      c.name,
      c.type,
      c.document,
      c.email,
      c.phone,
      c.status
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Nome', 'Tipo', 'Documento', 'E-mail', 'Telefone', 'Status']],
      body: tableData,
      headStyles: { fillColor: [0, 6, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 242, 251] },
      margin: { top: 45 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`relatorio-clientes-${filter.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    setIsDownloadMenuOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataBuffer = evt.target?.result;
      const wb = XLSX.read(dataBuffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const newClients: Client[] = data.map((item: any) => {
        // Normalize document first to help identify type
        const rawDoc = String(item.Documento || item.document || '').replace(/\D/g, '');
        
        // Auto-identify type based on document length (11 for CPF, 14 for CNPJ)
        let type: Client['type'] = 'PF';
        if (rawDoc.length > 11) {
          type = 'PJ';
        } else if (item.Tipo || item.type) {
          // Fallback to provided type if document length is ambiguous
          const typeRaw = String(item.Tipo || item.type).toUpperCase();
          type = typeRaw === 'PJ' ? 'PJ' : 'PF';
        }
        
        // Normalize status
        let statusRaw = String(item.Status || item.status || 'Ativo');
        statusRaw = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase();
        const status = (['Ativo', 'Inativo', 'Bloqueado'].includes(statusRaw) ? statusRaw : 'Ativo') as Client['status'];

        return {
          id: Math.random().toString(36).substring(2, 11),
          name: String(item.Nome || item.name || 'Sem Nome'),
          email: String(item.Email || item.email || ''),
          phone: formatPhone(String(item.Telefone || item.phone || '')),
          mobile: formatPhone(String(item.Celular || item.mobile || '')),
          osCount: 0,
          status,
          createdAt: new Date().toLocaleDateString('pt-BR'),
          type,
          document: formatDocument(String(item.Documento || item.document || ''), type),
          zipCode: formatCEP(String(item.CEP || item.zipCode || '')),
          street: String(item.Rua || item.street || ''),
          number: String(item.Numero || item.number || ''),
          neighborhood: String(item.Bairro || item.neighborhood || ''),
          city: String(item.Cidade || item.city || ''),
          state: String(item.UF || item.state || '').toUpperCase().substring(0, 2),
          stateRegistration: String(item['Inscrição Estadual'] || item.stateRegistration || ''),
          notes: String(item.Observacoes || item.notes || '')
        };
      });

      setPendingImportClients(newClients);
      setSelectedImportIds(new Set(newClients.map(c => c.id)));
      setIsImportPreviewOpen(true);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  const confirmImport = async () => {
    const clientsToImport = pendingImportClients.filter(c => selectedImportIds.has(c.id));
    let importedCount = 0;
    let skippedCount = 0;

    for (const client of clientsToImport) {
      const docClean = client.document?.replace(/\D/g, '');
      const emailLower = client.email?.toLowerCase().trim();

      const exists = clients.some(c => {
        const hasSameEmail = emailLower && c.email?.toLowerCase().trim() === emailLower;
        const hasSameDoc = docClean && c.document?.replace(/\D/g, '') === docClean;
        return hasSameEmail || hasSameDoc;
      });

      if (!exists) {
        try {
          await actions.add('clients', client);
          importedCount++;
        } catch (e) {
          console.error('Error importing client:', e);
        }
      } else {
        skippedCount++;
      }
    }

    alert(`Importação concluída: ${importedCount} novos clientes adicionados. ${skippedCount} ignorados por já existirem.`);
    setIsImportPreviewOpen(false);
    setPendingImportClients([]);
    setSelectedImportIds(new Set());
  };

  const toggleSelectAllImport = () => {
    if (selectedImportIds.size === pendingImportClients.length) {
      setSelectedImportIds(new Set());
    } else {
      setSelectedImportIds(new Set(pendingImportClients.map(c => c.id)));
    }
  };

  const toggleSelectImport = (id: string) => {
    const next = new Set(selectedImportIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedImportIds(next);
  };

  const updatePendingClient = (id: string, field: keyof Client, value: any) => {
    setPendingImportClients(prev => prev.map(c => {
      if (c.id !== id) return c;
      
      let updatedClient = { ...c, [field]: value };
      
      // Re-format if necessary
      if (field === 'document' || field === 'type') {
        updatedClient.document = formatDocument(String(updatedClient.document), updatedClient.type);
      }
      if (field === 'zipCode') {
        updatedClient.zipCode = formatCEP(String(value));
      }
      if (field === 'phone' || field === 'mobile') {
        updatedClient[field] = formatPhone(String(value));
      }
      
      return updatedClient;
    }));
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        Nome: 'Exemplo Cliente',
        Email: 'cliente@exemplo.com',
        Telefone: '(11) 4444-4444',
        Celular: '(11) 99999-9999',
        Status: 'Ativo',
        Tipo: 'PF',
        Documento: '000.000.000-00',
        'Inscrição Estadual': '',
        CEP: '00000-000',
        Rua: 'Rua Exemplo',
        Numero: '123',
        Bairro: 'Centro',
        Cidade: 'São Paulo',
        UF: 'SP',
        Observacoes: 'Cliente VIP'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_importacao_clientes.xlsx");
  };

  const openModal = (client: Client | null = null) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSaveClient = async (client: Client) => {
    // Validar duplicidade (Email ou Documento)
    const emailLower = client.email?.toLowerCase().trim();
    const docClean = client.document?.replace(/\D/g, '');

    const isDuplicate = clients.some(c => {
      if (editingClient && c.id === editingClient.id) return false;
      
      const hasSameEmail = emailLower && c.email?.toLowerCase().trim() === emailLower;
      const hasSameDoc = docClean && c.document?.replace(/\D/g, '') === docClean;
      
      return hasSameEmail || hasSameDoc;
    });

    if (isDuplicate) {
      alert('Erro: Já existe um cliente cadastrado com este E-mail ou CPF/CNPJ.');
      return;
    }

    try {
      if (editingClient) {
        await actions.update('clients', editingClient.id, client);
      } else {
        await actions.add('clients', client);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const openDeleteModal = (id: string) => {
    setClientToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setClientToDelete(null);
  };

  const confirmDelete = async () => {
    if (clientToDelete) {
      try {
        await actions.remove('clients', clientToDelete);
        closeDeleteModal();
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
  };

  const filteredClients = (() => {
    // 1. Remover duplicados por Documento (CPF/CNPJ)
    const uniqueList = clients.filter((item, index, self) => {
      const doc = item.document?.replace(/\D/g, '');
      if (!doc) return true;
      return index === self.findIndex((t) => (
        t.document?.replace(/\D/g, '') === doc
      ));
    });

    // 2. Filtrar por Status e Busca
    return uniqueList.filter(client => {
      const matchesStatus = statusFilter === 'Todos' || client.status === statusFilter;
      const matchesSearch = 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.document && client.document.includes(searchTerm)) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.tradeName && client.tradeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.phone && client.phone.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))) ||
        (client.mobile && client.mobile.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')));
      
      return matchesStatus && matchesSearch;
    });
  })();

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-[#000666] tracking-tight">Clientes</h2>
          <p className="text-slate-500 text-sm font-medium">Base de dados centralizada de clientes e parceiros.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex-1 sm:flex-none flex bg-[#f5f2fb] p-1 rounded-xl border border-[#c6c5d4]/10">
            <button 
              onClick={downloadTemplate}
              className="flex-1 sm:flex-none p-2 text-slate-500 hover:text-[#000666] hover:bg-white rounded-lg transition-all flex items-center justify-center gap-2"
              title="Baixar Modelo de Planilha"
            >
              <FileDown size={18} />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Modelo</span>
            </button>
            <div className="w-px h-6 bg-[#c6c5d4]/20 self-center mx-1" />
            <label className="flex-1 sm:flex-none p-2 text-slate-500 hover:text-[#000666] hover:bg-white rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer" title="Importar Planilha">
              <FileSpreadsheet size={18} />
              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Importar</span>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </label>
          </div>

          <button 
            onClick={() => openModal()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#000666] text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-[#000666]/20 active:scale-95 transition-all"
          >
            <UserPlus size={18} />
            <span className="text-sm">Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total de Clientes', value: clients.length.toString(), change: '+12%', icon: Users, color: 'text-[#000666] bg-[#000666]/5' },
          { label: 'Clientes Ativos', value: clients.filter(c => c.status === 'Ativo').length.toString(), change: 'Ativos', icon: Verified, color: 'text-[#1b6d24] bg-[#1b6d24]/5' },
          { label: 'Ordens de Serviço', value: clients.reduce((acc, c) => acc + c.osCount, 0).toString(), change: '48 Pendentes', icon: Clock, color: 'text-[#5a1b00] bg-[#5a1b00]/5' },
          { label: 'Novos (Mensal)', value: '86', change: 'Crescimento', icon: TrendingUp, color: 'text-[#000666] bg-[#000666]/5' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-[#c6c5d4]/5">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 rounded-lg", stat.color)}>
                <stat.icon size={20} />
              </div>
              <span className={cn(
                "text-xs font-bold",
                stat.change.includes('+') || stat.change === 'Ativos' || stat.change === 'Crescimento' ? "text-[#1b6d24]" : "text-[#5a1b00]"
              )}>
                {stat.change}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
            <h3 className="text-2xl font-bold text-[#1b1b21]">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-[#c6c5d4]/5 overflow-hidden">
        <div className="p-6 border-b border-[#c6c5d4]/10 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex bg-[#f5f2fb] rounded-lg p-1">
              <button 
                onClick={() => setStatusFilter('Todos')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  statusFilter === 'Todos' ? "bg-white text-[#000666] shadow-sm" : "text-slate-500 hover:text-[#000666]"
                )}
              >
                Todos
              </button>
              <button 
                onClick={() => setStatusFilter('Ativo')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  statusFilter === 'Ativo' ? "bg-white text-[#000666] shadow-sm" : "text-slate-500 hover:text-[#000666]"
                )}
              >
                Ativos
              </button>
              <button 
                onClick={() => setStatusFilter('Inativo')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  statusFilter === 'Inativo' ? "bg-white text-[#000666] shadow-sm" : "text-slate-500 hover:text-[#000666]"
                )}
              >
                Inativos
              </button>
              <button 
                onClick={() => setStatusFilter('Bloqueado')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  statusFilter === 'Bloqueado' ? "bg-white text-[#000666] shadow-sm" : "text-slate-500 hover:text-[#000666]"
                )}
              >
                Bloqueados
              </button>
            </div>
            <div className="h-6 w-px bg-[#c6c5d4]/20"></div>
            <button className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#000666] transition-colors">
              <Filter size={18} />
              Filtros Avançados
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-[#f5f2fb] border-none rounded-lg text-xs font-bold focus:ring-2 focus:ring-[#000666]/10 outline-none w-64 transition-all"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                className="p-2 text-slate-400 hover:text-[#000666] transition-colors bg-[#f5f2fb] rounded-lg flex items-center gap-2"
                title="Download Relatório PDF"
              >
                <Download size={18} />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">PDF</span>
              </button>

              <AnimatePresence>
                {isDownloadMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-[60]" 
                      onClick={() => setIsDownloadMenuOpen(false)} 
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-[#c6c5d4]/20 z-[70] overflow-hidden"
                    >
                      <div className="p-3 border-b border-[#c6c5d4]/10 bg-[#f5f2fb]/50">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exportar Relatório</span>
                      </div>
                      <div className="p-1">
                        {[
                          { label: 'Todos os Clientes', filter: 'Todos' },
                          { label: 'Clientes Ativos', filter: 'Ativo' },
                          { label: 'Clientes Inativos', filter: 'Inativo' },
                          { label: 'Clientes Bloqueados', filter: 'Bloqueado' }
                        ].map((opt) => (
                          <button
                            key={opt.filter}
                            onClick={() => generatePDF(opt.filter)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-[#f5f2fb] hover:text-[#000666] rounded-lg transition-colors flex items-center gap-2"
                          >
                            <FileText size={14} className="text-slate-400" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <span className="text-xs text-slate-400 font-medium">Exibindo 1-{clients.length} de {clients.length}</span>
            <div className="flex gap-1">
              <button className="p-1 text-slate-400 hover:text-[#000666] disabled:opacity-30" disabled>
                <ChevronLeft size={20} />
              </button>
              <button className="p-1 text-slate-400 hover:text-[#000666]">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f5f2fb]/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">E-mail</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Endereço</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contatos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d4]/10">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-[#f5f2fb]/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#000666]/5 flex items-center justify-center text-[#000666] font-bold text-sm">
                        {client.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-[#1b1b21]">
                            {client.type === 'PJ' && client.tradeName ? client.tradeName : client.name}
                          </p>
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase",
                            client.type === 'PF' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                          )}>
                            {client.type}
                          </span>
                        </div>
                        {client.type === 'PJ' && client.tradeName && (
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                            {client.name}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 font-medium">{client.document}</p>
                        <p className="text-[10px] text-slate-300">Cadastrado em {client.createdAt}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {client.email ? (
                      <div className="flex items-center gap-2 group/email">
                        <span className="text-sm text-slate-600 truncate max-w-[180px]">{client.email}</span>
                        <a 
                          href={`mailto:${client.email}`}
                          className="p-1 text-slate-400 hover:text-[#000666] hover:bg-[#000666]/5 rounded-md transition-all opacity-0 group-hover/email:opacity-100"
                          title="Enviar E-mail"
                        >
                          <Mail size={14} />
                        </a>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-300 italic">Sem e-mail</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-600 truncate max-w-[200px]">
                      {client.street ? `${client.street}, ${client.number}` : '---'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {client.neighborhood ? `${client.neighborhood}, ` : ''}{client.city ? `${client.city} - ${client.state}` : ''}
                    </p>
                    {client.notes && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[200px]">
                        Obs: {client.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {client.phone && (
                        <p className="text-sm text-slate-600">{client.phone}</p>
                      )}
                      {client.mobile && (
                        <div className="flex items-center gap-2">
                          <p className="text-[11px] text-slate-400">{client.mobile}</p>
                          <a 
                            href={`https://wa.me/${client.mobile.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-[#25D366] hover:bg-[#25D366]/10 rounded-md transition-colors"
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle size={14} fill="currentColor" fillOpacity={0.1} />
                          </a>
                        </div>
                      )}
                      {!client.phone && !client.mobile && (
                        <p className="text-sm text-slate-300 italic">Sem contato</p>
                      )}
                      {client.type === 'PJ' && client.contacts && client.contacts.length > 0 && (
                        <div className="pt-1 border-t border-[#c6c5d4]/10 mt-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contatos</p>
                          {client.contacts.map((contact, idx) => (
                            <div key={idx} className="flex items-center gap-2 group/contact-row">
                              <p className="text-[10px] font-medium text-slate-500 truncate max-w-[100px]" title={contact.name}>
                                {contact.name}
                              </p>
                              <div className="flex items-center gap-1 opacity-0 group-hover/contact-row:opacity-100 transition-opacity">
                                {contact.phone && (
                                  <a 
                                    href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#25D366] hover:scale-110 transition-transform"
                                  >
                                    <MessageCircle size={10} fill="currentColor" fillOpacity={0.1} />
                                  </a>
                                )}
                                {contact.email && (
                                  <a 
                                    href={`mailto:${contact.email}`}
                                    className="text-slate-400 hover:text-[#000666] transition-colors"
                                  >
                                    <Mail size={10} />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold",
                      client.status === 'Ativo' ? "bg-[#a0f399] text-[#005312]" : 
                      client.status === 'Bloqueado' ? "bg-[#ffdbcf] text-[#ba1a1a]" :
                      "bg-[#eae7ef] text-slate-500"
                    )}>
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        client.status === 'Ativo' ? "bg-[#1b6d24]" : 
                        client.status === 'Bloqueado' ? "bg-[#ba1a1a]" :
                        "bg-slate-400"
                      )}></span>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 transition-opacity">
                      <button 
                        onClick={() => setViewingEquipmentClient(client)}
                        className="p-2 text-[#000666] hover:bg-[#000666] hover:text-white transition-all bg-[#000666]/5 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                        title="Ver Equipamentos"
                      >
                        <Settings size={14} />
                        Equipamentos
                      </button>
                      <button 
                        onClick={() => openModal(client)}
                        className="p-2 text-slate-400 hover:text-[#000666] transition-colors bg-slate-50 rounded-lg"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => openDeleteModal(client.id)}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-slate-50 rounded-lg"
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
      </div>

      {/* Modal */}
      <ClientFormModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveClient}
        editingClient={editingClient}
      />
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeleteModal}
              className="absolute inset-0 bg-[#ba1a1a]/10 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-[#ffdbcf] text-[#ba1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-[#1b1b21] mb-2">Excluir Cliente?</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Esta ação não pode ser desfeita. O histórico de ordens de serviço deste cliente será mantido, mas o vínculo será removido.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={closeDeleteModal}
                    className="flex-1 px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-6 py-3 bg-[#ba1a1a] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#ba1a1a]/20 hover:bg-[#93000a] transition-all"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Equipment List Modal */}
      <AnimatePresence>
        {viewingEquipmentClient && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingEquipmentClient(null)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#c6c5d4]/15 flex justify-between items-center bg-[#f5f2fb]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#000666] flex items-center justify-center text-white">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#000666]">Equipamentos Vinculados</h3>
                    <p className="text-xs text-slate-500 font-medium">Cliente: {viewingEquipmentClient.name}</p>
                  </div>
                </div>
                <button onClick={() => setViewingEquipmentClient(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {equipmentList.filter(eq => eq.owner === viewingEquipmentClient.name).length > 0 ? (
                  <div className="space-y-3">
                    {equipmentList
                      .filter(eq => eq.owner === viewingEquipmentClient.name)
                      .map((eq) => (
                        <button 
                          key={eq.id} 
                          onClick={() => setViewingEquipmentOrders(eq)}
                          className="w-full flex items-center justify-between p-4 bg-[#f5f2fb]/50 rounded-2xl border border-[#c6c5d4]/10 hover:border-[#000666]/40 hover:bg-white hover:shadow-md transition-all group/eq"
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#000666] group-hover/eq:bg-[#000666] group-hover/eq:text-white transition-colors">
                              {eq.type.toLowerCase().includes('trator') && <Forklift size={24} />}
                              {eq.type.toLowerCase().includes('gerador') && <Zap size={24} />}
                              {eq.type.toLowerCase().includes('lavadora') && <Settings size={24} />}
                              {eq.type.toLowerCase().includes('motosserra') && <Cpu size={24} />}
                              {!['trator', 'gerador', 'lavadora', 'motosserra'].some(k => eq.type.toLowerCase().includes(k)) && <Settings size={24} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#1b1b21]">{eq.type}</p>
                              <p className="text-xs text-slate-500 font-medium">{eq.brand} • {eq.model}</p>
                              <p className="text-[10px] font-mono text-[#000666] font-bold mt-0.5">S/N: {eq.serialNumber || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                                eq.status === 'Equipamento Ativo' ? "bg-[#a0f399] text-[#005312]" : 
                                eq.status === 'Em manutenção' ? "bg-[#ffdbcf] text-[#5a1b00]" : 
                                "bg-[#eae7ef] text-slate-500"
                              )}>
                                {eq.status}
                              </span>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 group-hover/eq:text-[#000666] transition-colors" />
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Settings size={32} />
                    </div>
                    <p className="text-slate-500 font-medium">Nenhum equipamento vinculado a este cliente.</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-[#c6c5d4]/10 flex justify-end">
                <button 
                  onClick={() => setViewingEquipmentClient(null)}
                  className="px-6 py-2.5 bg-[#000666] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Equipment Service Orders Modal */}
      <AnimatePresence>
        {viewingEquipmentOrders && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingEquipmentOrders(null)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-[#c6c5d4]/15 flex justify-between items-center bg-[#f5f2fb]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#000666] flex items-center justify-center text-white">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#000666]">Histórico de Ordens de Serviço</h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Equipamento: {viewingEquipmentOrders.brand} {viewingEquipmentOrders.model} ({viewingEquipmentOrders.type})
                    </p>
                  </div>
                </div>
                <button onClick={() => setViewingEquipmentOrders(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {orders.filter(os => os.equipmentId === viewingEquipmentOrders.id).length > 0 ? (
                  <div className="space-y-4">
                    {orders
                      .filter(os => os.equipmentId === viewingEquipmentOrders.id)
                      .sort((a, b) => new Date(b.createdAt.split('/').reverse().join('-')).getTime() - new Date(a.createdAt.split('/').reverse().join('-')).getTime())
                      .map((os) => (
                        <button 
                          key={os.id} 
                          onClick={() => onOpenOS?.(os.id)}
                          className="w-full text-left bg-white border border-[#c6c5d4]/15 rounded-2xl p-5 hover:shadow-md hover:border-[#000666]/30 transition-all group/os"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-black text-[#000666] bg-[#000666]/5 px-2 py-1 rounded group-hover/os:bg-[#000666] group-hover/os:text-white transition-colors">OS #{os.number}</span>
                                <span className={cn(
                                  "text-[10px] font-bold px-2 py-1 rounded-full",
                                  os.status === 'CONCLUIDO' ? "bg-[#a0f399] text-[#005312]" :
                                  os.status === 'EM ORÇAMENTO' ? "bg-blue-100 text-blue-700" :
                                  os.status === 'AGUARDANDO APROVAÇÃO' ? "bg-amber-100 text-amber-700" :
                                  "bg-red-100 text-red-700"
                                )}>
                                  {os.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 font-medium">Criada em {os.createdAt}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-[#1b1b21]">R$ {os.total}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Valor Total</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#f5f2fb]/50 p-3 rounded-xl">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Defeito Relatado</p>
                              <p className="text-xs text-slate-600 line-clamp-2">{os.defectDescription || 'Não informado'}</p>
                            </div>
                            <div className="bg-[#f5f2fb]/50 p-3 rounded-xl">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Laudo Técnico</p>
                              <p className="text-xs text-slate-600 line-clamp-2">{os.technicalReport || 'Pendente'}</p>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between pt-4 border-t border-[#c6c5d4]/10">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <Users size={12} />
                              </div>
                              <p className="text-[10px] font-bold text-slate-500">Técnico: {os.technician || 'Não atribuído'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {os.completionDate && (
                                <p className="text-[10px] font-bold text-[#1b6d24]">Concluída em {os.completionDate}</p>
                              )}
                              <ChevronRight size={14} className="text-slate-300 group-hover/os:text-[#000666] transition-colors" />
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                      <FileText size={40} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-400 mb-1">Nenhuma OS encontrada</h4>
                    <p className="text-sm text-slate-400">Este equipamento ainda não possui histórico de ordens de serviço.</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-[#c6c5d4]/10 flex justify-end">
                <button 
                  onClick={() => setViewingEquipmentOrders(null)}
                  className="px-8 py-3 bg-[#000666] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Voltar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Preview Modal */}
      <AnimatePresence>
        {isImportPreviewOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportPreviewOpen(false)}
              className="absolute inset-0 bg-[#000666]/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-[#c6c5d4]/15 flex justify-between items-center bg-[#f5f2fb]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#000666] flex items-center justify-center text-white">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#000666]">Verificar Dados de Importação</h3>
                    <p className="text-xs text-slate-500 font-medium">Revise os clientes antes de confirmar a importação ({pendingImportClients.length} registros)</p>
                  </div>
                </div>
                <button onClick={() => setIsImportPreviewOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <div className="border border-[#c6c5d4]/10 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#f5f2fb]/50">
                        <th className="px-4 py-3 w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedImportIds.size === pendingImportClients.length && pendingImportClients.length > 0}
                            onChange={toggleSelectAllImport}
                            className="w-4 h-4 rounded border-slate-300 text-[#000666] focus:ring-[#000666]/20"
                          />
                        </th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nome / Tipo</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Documento</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">I.E.</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">E-mail</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cidade / UF</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c6c5d4]/10">
                      {pendingImportClients.map((client) => (
                        <tr key={client.id} className={cn(
                          "hover:bg-[#f5f2fb]/30 transition-colors",
                          !selectedImportIds.has(client.id) && "opacity-50"
                        )}>
                          <td className="px-4 py-3">
                            <input 
                              type="checkbox" 
                              checked={selectedImportIds.has(client.id)}
                              onChange={() => toggleSelectImport(client.id)}
                              className="w-4 h-4 rounded border-slate-300 text-[#000666] focus:ring-[#000666]/20"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <input 
                                type="text"
                                value={client.name}
                                onChange={(e) => updatePendingClient(client.id, 'name', e.target.value)}
                                className="w-full bg-transparent border-none p-0 text-xs font-bold text-[#1b1b21] focus:ring-0 focus:bg-white px-1 rounded"
                              />
                              <select 
                                value={client.type}
                                onChange={(e) => updatePendingClient(client.id, 'type', e.target.value)}
                                className="bg-transparent border-none p-0 text-[9px] text-slate-400 uppercase font-bold focus:ring-0 appearance-none cursor-pointer"
                              >
                                <option value="PF">PF</option>
                                <option value="PJ">PJ</option>
                              </select>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text"
                              value={client.document}
                              onChange={(e) => updatePendingClient(client.id, 'document', e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-xs text-slate-600 font-medium focus:ring-0 focus:bg-white px-1 rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text"
                              value={client.stateRegistration || ''}
                              onChange={(e) => updatePendingClient(client.id, 'stateRegistration', e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-xs text-slate-600 font-medium focus:ring-0 focus:bg-white px-1 rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="text"
                              value={client.email}
                              onChange={(e) => updatePendingClient(client.id, 'email', e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-xs text-slate-600 focus:ring-0 focus:bg-white px-1 rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 items-center">
                              <input 
                                type="text"
                                value={client.city || ''}
                                placeholder="Cidade"
                                onChange={(e) => updatePendingClient(client.id, 'city', e.target.value)}
                                className="flex-1 bg-transparent border-none p-0 text-xs text-slate-600 focus:ring-0 focus:bg-white px-1 rounded"
                              />
                              <span className="text-slate-300">/</span>
                              <input 
                                type="text"
                                value={client.state || ''}
                                placeholder="UF"
                                maxLength={2}
                                onChange={(e) => updatePendingClient(client.id, 'state', e.target.value.toUpperCase())}
                                className="w-8 bg-transparent border-none p-0 text-xs text-slate-600 focus:ring-0 focus:bg-white px-1 rounded"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select 
                              value={client.status}
                              onChange={(e) => updatePendingClient(client.id, 'status', e.target.value)}
                              className={cn(
                                "bg-transparent border-none p-0 text-[9px] font-bold focus:ring-0 appearance-none cursor-pointer rounded px-1",
                                client.status === 'Ativo' ? "text-[#005312]" : 
                                client.status === 'Bloqueado' ? "text-[#ba1a1a]" :
                                "text-slate-500"
                              )}
                            >
                              <option value="Ativo">Ativo</option>
                              <option value="Inativo">Inativo</option>
                              <option value="Bloqueado">Bloqueado</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-[#c6c5d4]/10 flex justify-between items-center">
                <p className="text-xs text-slate-500 font-medium">
                  {selectedImportIds.size} de {pendingImportClients.length} contatos selecionados para importação
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsImportPreviewOpen(false)}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-white transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmImport}
                    disabled={selectedImportIds.size === 0}
                    className="px-6 py-2.5 bg-[#000666] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check size={18} />
                    Confirmar Importação
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
