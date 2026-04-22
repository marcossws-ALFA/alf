"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Check,
  Settings,
  Cpu,
  Zap,
  Forklift,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { Equipment, Client } from '@/src/types';
import { GoogleGenAI, Type } from "@google/genai";

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: Equipment) => void;
  editingEquipment?: Equipment | null;
  clients: Client[];
  initialOwner?: string;
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

export default function EquipmentFormModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingEquipment, 
  clients,
  initialOwner
}: EquipmentFormModalProps) {
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>(initialEquipmentTypes);
  const [brandOptions, setBrandOptions] = useState<string[]>(initialBrandOptions);
  
  const [formData, setFormData] = useState({
    type: '',
    brand: '',
    model: '',
    serialNumber: '',
    owner: '',
    status: 'Equipamento Ativo' as Equipment['status'],
    dailyRate: 0
  });

  const [isAddingType, setIsAddingType] = useState(false);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  useEffect(() => {
    if (editingEquipment) {
      setFormData({
        type: editingEquipment.type || '',
        brand: editingEquipment.brand || '',
        model: editingEquipment.model || '',
        serialNumber: editingEquipment.serialNumber || '',
        owner: editingEquipment.owner || '',
        status: editingEquipment.status || 'Equipamento Ativo',
        dailyRate: editingEquipment.dailyRate || 0
      });
    } else {
      setFormData({
        type: '',
        brand: '',
        model: '',
        serialNumber: '',
        owner: initialOwner || '',
        status: 'Equipamento Ativo',
        dailyRate: 0
      });
    }
  }, [editingEquipment, isOpen, initialOwner]);

  const handleAddNewType = () => {
    if (newItemName && !equipmentTypes.includes(newItemName)) {
      setEquipmentTypes(prev => [...prev, newItemName].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })));
      setFormData(prev => ({ ...prev, type: newItemName }));
      setIsAddingType(false);
      setNewItemName('');
    }
  };

  const handleAddNewBrand = () => {
    if (newItemName && !brandOptions.includes(newItemName)) {
      setBrandOptions(prev => [...prev, newItemName].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })));
      setFormData(prev => ({ ...prev, brand: newItemName }));
      setIsAddingBrand(false);
      setNewItemName('');
    }
  };

  const handleAutoFill = async () => {
    if (!formData.model || formData.model.length < 2) return;
    
    setIsAutoFilling(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });
      const prompt = `Identifique o tipo de equipamento e a marca para o modelo: "${formData.model}".
      Retorne o resultado em formato JSON com as chaves "type" e "brand".
      O "type" deve ser um nome comum de equipamento em português (ex: Motosserra, Roçadeira, Gerador, etc).
      A "brand" deve ser a marca fabricante.
      
      Tipos conhecidos: ${equipmentTypes.join(', ')}
      Marcas conhecidas: ${brandOptions.join(', ')}
      
      Seja preciso. Se não souber, retorne vazio para os campos.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING },
              brand: { type: Type.STRING }
            },
            required: ["type", "brand"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      if (result.type || result.brand) {
        const newFormData = { ...formData };
        
        if (result.type) {
          const normalizedType = result.type.charAt(0).toUpperCase() + result.type.slice(1).toLowerCase();
          if (!equipmentTypes.includes(normalizedType)) {
            setEquipmentTypes(prev => [...prev, normalizedType].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })));
          }
          newFormData.type = normalizedType;
        }
        
        if (result.brand) {
          const normalizedBrand = result.brand.charAt(0).toUpperCase() + result.brand.slice(1).toLowerCase();
          if (!brandOptions.includes(normalizedBrand)) {
            setBrandOptions(prev => [...prev, normalizedBrand].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })));
          }
          newFormData.brand = normalizedBrand;
        }
        
        setFormData(newFormData);
      }
    } catch (error) {
      console.error("Erro ao auto-preencher:", error);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const getModelSuggestions = () => {
    if (!formData.brand) return [];
    return initialBrandModels[formData.brand] || [];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const equipment: Equipment = {
      id: editingEquipment ? editingEquipment.id : Math.random().toString(36).substring(2, 11),
      ...formData,
      ownerLogo: `https://picsum.photos/seed/${formData.owner}/100/100`
    };
    onSave(equipment);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-[#c6c5d4]/15 flex justify-between items-center bg-[#f5f2fb]">
              <h3 className="text-xl font-bold text-[#000666]">
                {editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tipo de Equipamento</label>
                  <button 
                    type="button"
                    onClick={() => { setIsAddingType(true); setIsAddingBrand(false); setNewItemName(''); }}
                    className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                  >
                    <Plus size={10} /> Adicionar Novo
                  </button>
                </div>
                {isAddingType ? (
                  <div className="flex gap-2">
                    <input 
                      autoFocus
                      type="text"
                      value={newItemName || ''}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-1 px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                      placeholder="Nome do tipo..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewType())}
                    />
                    <button 
                      type="button"
                      onClick={handleAddNewType}
                      className="p-2 bg-[#000666] text-white rounded-xl hover:bg-[#000666]/90"
                    >
                      <Check size={18} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsAddingType(false)}
                      className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <select 
                    required
                    value={formData.type || ''}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                  >
                    <option value="" disabled>Selecione o tipo</option>
                    {equipmentTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Marca</label>
                  <button 
                    type="button"
                    onClick={() => { setIsAddingBrand(true); setIsAddingType(false); setNewItemName(''); }}
                    className="text-[10px] font-bold text-[#000666] hover:underline flex items-center gap-1"
                  >
                    <Plus size={10} /> Novo
                  </button>
                </div>
                {isAddingBrand ? (
                  <div className="flex gap-2">
                    <input 
                      autoFocus
                      type="text"
                      value={newItemName || ''}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-1 px-4 py-2 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none"
                      placeholder="Nome da marca..."
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewBrand())}
                    />
                    <button 
                      type="button"
                      onClick={handleAddNewBrand}
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
                    required
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                  >
                    <option value="" disabled>Selecione a marca</option>
                    {brandOptions.map((brand) => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Modelo</label>
                <div className="relative">
                  <input 
                    required
                    type="text" 
                    list="model-suggestions"
                    value={formData.model || ''}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    onBlur={() => {
                      if (!formData.type || !formData.brand) {
                        handleAutoFill();
                      }
                    }}
                    className="w-full pl-4 pr-12 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                    placeholder="Ex: CAT 320D"
                  />
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    disabled={isAutoFilling || !formData.model}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#000666] hover:bg-white rounded-lg transition-all disabled:opacity-30"
                    title="Auto-preencher Tipo e Marca"
                  >
                    {isAutoFilling ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                  </button>
                </div>
                <datalist id="model-suggestions">
                  {getModelSuggestions().map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Número de Série</label>
                <input 
                  type="text" 
                  value={formData.serialNumber || ''}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                  placeholder="SN-000000 (Opcional)"
                />
              </div>

              {!initialOwner && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Proprietário (Cliente)</label>
                  <select 
                    required
                    value={formData.owner || ''}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                  >
                    <option value="" disabled>Selecione o cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.name}>{client.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</label>
                <select 
                  value={formData.status || ''}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Equipment['status'] })}
                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all appearance-none"
                >
                  <option value="Equipamento Ativo">Equipamento Ativo</option>
                  <option value="Em manutenção">Em manutenção</option>
                  <option value="Equipamento Desativado">Equipamento Desativado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Valor da Diária (R$)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={formData.dailyRate || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setFormData({ ...formData, dailyRate: isNaN(val) ? 0 : val });
                  }}
                  className="w-full px-4 py-3 bg-[#f5f2fb] border-none rounded-xl text-sm focus:ring-2 focus:ring-[#000666]/10 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 bg-[#000666] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#000666]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  {editingEquipment ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
