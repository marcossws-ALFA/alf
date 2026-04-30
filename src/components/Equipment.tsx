"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  ChevronRight, 
  ChevronLeft, 
  Cpu, 
  Zap, 
  Forklift, 
  Settings, 
  MoreVertical,
  History,
  SlidersHorizontal,
  Printer,
  AlertTriangle,
  X,
  Check,
  Edit2,
  Trash2,
  FileText,
  Users,
  ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { cn } from '@/src/lib/utils';
import { Equipment as EquipmentType, Client, ServiceOrder } from '@/src/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import EquipmentFormModal from './EquipmentFormModal';
import { useFirebase } from '@/src/context/FirebaseContext';

interface EquipmentProps {
  equipmentList: EquipmentType[];
  setEquipmentList: React.Dispatch<React.SetStateAction<EquipmentType[]>>;
  clients: Client[];
  orders: ServiceOrder[];
  onOpenOS?: (orderId: string) => void;
}

const initialEquipmentTypes = [
  "Aparador de cerca viva",
  "Automower",
  "Compactador de Solo",
  "Cortador de Grama",
  "Gerador",
  "Giro zero",
  "Lavadora de alta pressão",
  "Lavadora média pressão",
  "Micro trator",
  "Motobomba",
  "Moto cultivador",
  "motor estacionário",
  "Motosserra",
  "Multifuncional",
  "Perfurador de solo",
  "Podador de galhos",
  "Pulverizador",
  "Rider",
  "Roçadeira",
  "Trator Agricola"
].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

const initialBrandOptions = [
  "Husqvarna", "Stihl", "Bufallo", "Briggs", "Branco", "Murray", "Trapp", "Troy-bilt", "Mtd", "Jacto", "Karcher", "Tramontina", "Brudden", "Bear Cat", "Terra", "Toyama", "Nakashi", "Kawashima", "Yamasaki", "CCM", "Einhell", "Honda", "Makita", "Vulcan", "Tekna", "Poulan"
].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

const registeredClients = [
  { id: '1', name: 'João Silva' },
  { id: '2', name: 'Maria Cavalcanti' },
  { id: '3', name: 'Ricardo Pereira' },
  { id: '4', name: 'Ana Lúcia Gomes' },
  { id: '5', name: 'Fernando Borges (Tech Indústria)' }
];

const initialBrandModels: Record<string, string[]> = {
  "Husqvarna": ["125B", "236", "435", "345FR", "545", "LC 140", "120 Mark II", "226R", "322R"],
  "Stihl": ["FS 55", "FS 85", "MS 170", "MS 180", "MS 250", "MS 260", "MS 382", "KA 85", "BG 86"],
  "Honda": ["GX160", "GX200", "GX390", "HRN216", "UMK435", "WB20", "WB30", "EU22i"],
  "Makita": ["DUC353", "DUR368", "EA3203S", "UC4041A", "DUR181", "DLM432"],
  "Toyama": ["TBC26", "TBC43", "TBC52", "TF55", "TG3000", "TDE70", "TME41"],
  "Tekna": ["RL460", "CC1200", "CS42", "CS53", "BC1250", "HL2000"],
  "Branco": ["B4T-6.5", "B4T-13.0", "B2T-2.0", "BTP-2.0", "BCT-43"],
  "Bufallo": ["BFG 900", "BFG 1100", "B4T 6.5", "BFG 260", "BFG 520"],
  "Karcher": ["K2", "K3", "K4", "K5", "HD 585", "NT 20/1"],
  "Jacto": ["PJH", "XP", "PJB", "HD 400", "PJM"],
  "Trapp": ["MC 50E", "MC 60E", "LF 600", "KM 350", "AR 70"],
  "Tramontina": ["CE30P", "CE35P", "CC40P", "CD40P", "CE45P"],
  "Briggs": ["Series 450", "Series 500", "Series 625", "Vanguard 6.5HP"],
  "Murray": ["M2500", "M2510", "MX500"],
  "Troy-bilt": ["TB110", "TB200", "TB230"],
  "Mtd": ["Optima 38", "Smart 32", "ThorX 35"],
  "Brudden": ["SS-20", "SS-10", "Practical 20"],
  "Bear Cat": ["SC3206", "SC3305"],
  "Terra": ["GRH-430", "GRH-520", "M-520"],
  "Nakashi": ["L 431-M", "L 331-M", "T 270-N"],
  "Kawashima": ["KW 26-L", "KW 33-L", "KW 43-L"],
  "Yamasaki": ["Y-52", "Y-43", "Y-26"],
  "CCM": ["CCM 260", "CCM 430", "CCM 520"],
  "Einhell": ["GC-BC 52", "GE-CM 36", "GC-PM 46"],
  "Vulcan": ["VR520H", "VR430H", "VJP430"],
  "Poulan": ["P3314", "P3816", "PP4218"]
};

export default function EquipmentView({ equipmentList, setEquipmentList, clients, orders, onOpenOS }: EquipmentProps) {
  const { actions } = useFirebase();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<string | null>(null);
  const [selectedEquipmentForHistory, setSelectedEquipmentForHistory] = useState<EquipmentType | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);
  const [showClientsInDownload, setShowClientsInDownload] = useState(false);

  const generatePDF = (filter: string, isClient = false) => {
    const doc = new jsPDF();
    let title = '';
    let dataToExport = [];

    if (isClient) {
      title = `Relatório de Equipamentos - Cliente: ${filter}`;
      dataToExport = equipmentList.filter(eq => eq.owner === filter);
    } else {
      title = filter === 'Todos' ? 'Relatório Geral de Equipamentos' : `Relatório de Equipamentos - ${filter}`;
      dataToExport = filter === 'Todos' 
        ? equipmentList 
        : equipmentList.filter(eq => eq.status === filter);
    }
    
    doc.setFontSize(18);
    doc.setTextColor(0, 6, 102); // #000666
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
    doc.text(`Total de itens: ${dataToExport.length}`, 14, 35);

    const tableData = dataToExport.map(eq => [
      eq.type,
      eq.brand,
      eq.model,
      eq.serialNumber || 'N/A',
      eq.owner,
      eq.status
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Tipo', 'Marca', 'Modelo', 'Série', 'Proprietário', 'Status']],
      body: tableData,
      headStyles: { fillColor: [0, 6, 102], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 242, 251] },
      margin: { top: 45 },
      styles: { fontSize: 8, cellPadding: 3 }
    });

    doc.save(`relatorio-equipamentos-${filter.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    setIsDownloadMenuOpen(false);
    setShowClientsInDownload(false);
  };

  const uniqueOwners = Array.from(new Set(equipmentList.map(eq => eq.owner))).sort();

  const openModal = (equipment: EquipmentType | null = null) => {
    setEditingEquipment(equipment);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
  };

  const handleSaveEquipment = async (equipment: EquipmentType) => {
    try {
      if (editingEquipment) {
        await actions.update('equipment', editingEquipment.id, equipment);
      } else {
        await actions.add('equipment', equipment);
      }
      closeModal();
    } catch (error) {
      console.error('Error saving equipment:', error);
    }
  };

  const openDeleteModal = (id: string) => {
    setEquipmentToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setEquipmentToDelete(null);
  };

  const confirmDelete = async () => {
    if (equipmentToDelete) {
      try {
        await actions.remove('equipment', equipmentToDelete);
        closeDeleteModal();
      } catch (error) {
        console.error('Error deleting equipment:', error);
      }
    }
  };

  const filteredEquipment = equipmentList.filter(eq => {
    const matchesSearch = 
      eq.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (eq.serialNumber && eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'Todos' || eq.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight text-[#000666]">Equipamentos</h2>
          <p className="text-slate-500 text-sm font-medium">Gestão de ativos e inventário de máquinas.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-[#000666] text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-[#000666]/20 active:scale-95 transition-all"
        >
          <Plus size={18} />
          <span className="text-sm">Novo Equipamento</span>
        </button>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-6 rounded-xl flex flex-col justify-between h-24 sm:h-32 border border-[#c6c5d4]/5 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
          <div className="flex items-end justify-between">
            <span className="text-xl sm:text-3xl font-black text-[#000666]">{equipmentList.length}</span>
          </div>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl flex flex-col justify-between h-24 sm:h-32 border border-[#c6c5d4]/5 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Ativos</span>
          <div className="flex items-end justify-between">
            <span className="text-xl sm:text-3xl font-black text-[#000666]">
              {equipmentList.filter(e => e.status === 'Equipamento Ativo').length}
            </span>
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-6 rounded-xl flex flex-col justify-between h-24 sm:h-32 border border-[#c6c5d4]/5 shadow-sm">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Manutenção</span>
          <div className="flex items-end justify-between">
            <span className="text-xl sm:text-3xl font-black text-[#ba1a1a]">
              {equipmentList.filter(e => e.status === 'Em manutenção').length}
            </span>
            <AlertTriangle className="text-[#ba1a1a]" size={16} />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#c6c5d4]/10">
        <div className="p-6 border-b border-[#c6c5d4]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
            <h3 className="text-sm font-bold text-[#1b1b21] whitespace-nowrap">Livro de Equipamentos</h3>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Buscar por marca, modelo, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-xs focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {['Todos', 'Equipamento Ativo', 'Em manutenção', 'Equipamento Desativado'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 text-[10px] font-bold rounded-full transition-all whitespace-nowrap",
                    statusFilter === status 
                      ? "bg-[#000666] text-white shadow-md shadow-[#000666]/10" 
                      : "bg-[#f5f2fb] text-slate-500 hover:bg-[#eae7ef]"
                  )}
                >
                  {status} {status === 'Todos' ? `(${equipmentList.length})` : `(${equipmentList.filter(e => e.status === status).length})`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto relative">
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
                      {!showClientsInDownload ? (
                        <>
                          {[
                            { label: 'Todos os Equipamentos', filter: 'Todos' },
                            { label: 'Equipamentos Ativos', filter: 'Equipamento Ativo' },
                            { label: 'Em Manutenção', filter: 'Em manutenção' },
                            { label: 'Equipamentos Desativados', filter: 'Equipamento Desativado' }
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
                          <button
                            onClick={() => setShowClientsInDownload(true)}
                            className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[#000666] hover:bg-[#f5f2fb] rounded-lg transition-colors flex items-center justify-between gap-2 border-t border-[#c6c5d4]/5 mt-1 pt-3"
                          >
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-[#000666]" />
                              Relatório por Cliente
                            </div>
                            <ChevronRight size={14} />
                          </button>
                        </>
                      ) : (
                        <div className="max-h-64 overflow-y-auto">
                          <button
                            onClick={() => setShowClientsInDownload(false)}
                            className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-[#000666] transition-colors flex items-center gap-1 mb-1"
                          >
                            <ChevronLeft size={12} /> VOLTAR
                          </button>
                          {uniqueOwners.map((owner) => (
                            <button
                              key={owner}
                              onClick={() => generatePDF(owner, true)}
                              className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-[#f5f2fb] hover:text-[#000666] rounded-lg transition-colors flex items-center gap-2"
                            >
                              <div className="w-6 h-6 rounded-full bg-[#000666]/5 flex items-center justify-center text-[10px] font-bold text-[#000666]">
                                {owner.charAt(0)}
                              </div>
                              <span className="truncate">{owner}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f5f2fb]/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Equipamento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Marca</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Modelo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Número de Série</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Proprietário (Cliente)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d4]/5">
              {filteredEquipment.map((eq) => (
                <tr 
                  key={eq.id} 
                  onClick={() => setSelectedEquipmentForHistory(eq)}
                  className="hover:bg-[#f5f2fb]/30 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#e0e0ff]/30 flex items-center justify-center text-[#000666]">
                        {eq.type.toLowerCase().includes('trator') && <Forklift size={18} />}
                        {eq.type.toLowerCase().includes('gerador') && <Zap size={18} />}
                        {eq.type.toLowerCase().includes('lavadora') && <Settings size={18} />}
                        {eq.type.toLowerCase().includes('motosserra') && <Cpu size={18} />}
                        {!['trator', 'gerador', 'lavadora', 'motosserra'].some(k => eq.type.toLowerCase().includes(k)) && <Settings size={18} />}
                      </div>
                      <span className="text-sm font-medium text-[#1b1b21]">{eq.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">{eq.brand}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{eq.model}</td>
                  <td className="px-6 py-4 text-sm font-mono text-[#000666] font-semibold">{eq.serialNumber}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {eq.ownerLogo ? (
                        <Image 
                          src={eq.ownerLogo} 
                          alt={eq.owner} 
                          width={20}
                          height={20}
                          className="h-5 w-5 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center">
                          <Users size={10} className="text-slate-400" />
                        </div>
                      )}
                      <span className="text-sm text-[#1b1b21] font-medium">{eq.owner}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                      eq.status === 'Equipamento Ativo' ? "bg-[#a0f399] text-[#005312]" : 
                      eq.status === 'Em manutenção' ? "bg-[#ffdbcf] text-[#5a1b00]" : 
                      "bg-[#eae7ef] text-slate-500"
                    )}>
                      {eq.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(eq);
                        }}
                        className="p-2 text-slate-400 hover:text-[#000666] transition-colors bg-slate-50 rounded-lg"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(eq.id);
                        }}
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
        
        <div className="p-6 border-t border-[#c6c5d4]/10 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium tracking-tight">Mostrando 1-{filteredEquipment.length} de {filteredEquipment.length} resultados</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg border border-[#c6c5d4]/30 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Anterior</button>
            <button className="px-3 py-1.5 rounded-lg border border-[#c6c5d4]/30 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">Próximo</button>
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      <EquipmentFormModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleSaveEquipment}
        editingEquipment={editingEquipment}
        clients={clients}
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
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-[#ffdbcf] text-[#ba1a1a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-[#1b1b21] mb-2">Excluir Equipamento?</h3>
                <p className="text-sm text-slate-500 mb-6">
                  Esta ação não pode ser desfeita. O histórico de manutenções deste equipamento será mantido, mas o registro será removido do inventário ativo.
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
      {/* OS History Modal */}
      <AnimatePresence>
        {selectedEquipmentForHistory && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEquipmentForHistory(null)}
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
                  <div className="p-2 bg-[#000666] text-white rounded-xl">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#000666]">Histórico de Manutenções</h3>
                    <p className="text-xs text-slate-500 font-medium">{selectedEquipmentForHistory.brand} {selectedEquipmentForHistory.model} • {selectedEquipmentForHistory.serialNumber}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEquipmentForHistory(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {orders.filter(o => o.equipmentId === selectedEquipmentForHistory.id).length > 0 ? (
                  <div className="space-y-4">
                    {orders
                      .filter(o => o.equipmentId === selectedEquipmentForHistory.id)
                      .sort((a, b) => new Date(b.createdAt.split('/').reverse().join('-')).getTime() - new Date(a.createdAt.split('/').reverse().join('-')).getTime())
                      .map((order) => (
                        <div 
                          key={order.id} 
                          onClick={() => onOpenOS?.(order.id)}
                          className="bg-[#f5f2fb]/30 rounded-2xl p-5 border border-[#c6c5d4]/10 hover:border-[#000666]/20 transition-all cursor-pointer group/os"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#000666] font-bold shadow-sm border border-[#c6c5d4]/10 group-hover/os:bg-[#000666] group-hover/os:text-white transition-colors">
                                #{order.number}
                              </div>
                              <div>
                                <h4 className="font-bold text-[#1b1b21]">{order.status}</h4>
                                <p className="text-xs text-slate-500">{order.createdAt} {order.completionDate ? `• Concluído em ${order.completionDate}` : ''}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-[#000666]">{order.total}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defeito Relatado</span>
                              <p className="text-sm text-slate-600 leading-relaxed">{order.defectDescription || 'Não informado'}</p>
                            </div>
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Laudo Técnico</span>
                              <p className="text-sm text-slate-600 leading-relaxed">{order.technicalReport || 'Pendente'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                      <ClipboardCheck size={40} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-400">Nenhuma Ordem de Serviço</h4>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto">Este equipamento ainda não possui histórico de manutenções registradas no sistema.</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-[#c6c5d4]/15 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setSelectedEquipmentForHistory(null)}
                  className="px-6 py-2 bg-white border border-[#c6c5d4]/30 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

