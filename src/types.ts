export interface CompanyData {
  id?: string;
  companyName: string;
  tradeName: string;
  document: string; // CNPJ
  stateRegistration?: string;
  email: string;
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  logoUrl?: string;
}

export interface Rental {
  id: string;
  equipmentId: string;
  equipmentName: string;
  clientId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  status: 'Ativo' | 'Finalizado' | 'Atrasado' | 'Orçamento';
  totalValue: number;
  dailyRate: number;
  discountValue: number;
  discountType: 'percentage' | 'fixed';
  ignoreSundays: boolean;
}

export type View = 
  | 'dashboard' 
  | 'pdv'
  | 'service-orders' 
  | 'clients' 
  | 'suppliers'
  | 'equipment' 
  | 'rentals'
  | 'parts' 
  | 'services' 
  | 'finance' 
  | 'receivables'
  | 'payables'
  | 'settings' 
  | 'support';

export interface Metric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  icon: string;
  color: string;
}

export interface ServiceOrderItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface PaymentInfo {
  method: 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'PIX' | 'Boleto' | 'Transferência';
  status: 'Pendente' | 'Pago';
  paidAmount: string;
  remainingAmount: string;
  dueDate?: string;
  paymentDate?: string;
  installments?: string | number;
  discountValue?: string;
  discountType?: 'percentage' | 'fixed';
  subtotal?: string;
  method2?: 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'PIX' | 'Boleto' | 'Transferência';
  paidAmount2?: string;
  installments2?: string | number;
  dueDate2?: string;
  status2?: 'Pendente' | 'Pago';
}

export interface ServiceOrder {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  clientDocument: string;
  clientPhone: string;
  equipmentId: string;
  equipmentName: string;
  defectDescription: string;
  technicalReport: string;
  accessories?: string;
  status: 'AGUARDANDO APROVAÇÃO' | 'CONCLUIDO' | 'EM ORÇAMENTO' | 'NÃO APROVADO';
  createdAt: string;
  completionDate?: string;
  total: string;
  technician?: string;
  seller?: string;
  location?: string;
  parts?: ServiceOrderItem[];
  services?: ServiceOrderItem[];
  payment?: PaymentInfo;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  mobile: string;
  osCount: number;
  status: 'Ativo' | 'Inativo' | 'Bloqueado';
  createdAt: string;
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  type: 'PF' | 'PJ';
  document: string;
  stateRegistration?: string;
  tradeName?: string;
  notes?: string;
  contacts?: {
    name: string;
    phone: string;
    email: string;
  }[];
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  category: string;
  status: 'Ativo' | 'Inativo';
  createdAt: string;
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  type: string;
  brand: string;
  model: string;
  serialNumber?: string;
  owner: string;
  ownerLogo?: string;
  status: 'Equipamento Ativo' | 'Em manutenção' | 'Equipamento Desativado';
  isForRental?: boolean;
  dailyRate?: number;
}

export interface CatalogItem {
  id: string;
  name: string;
  code: string;
  category: 'Peças' | 'Serviço' | 'Acessórios';
  stock: string;
  price: string;
  image?: string;
}

export interface Part {
  id: string;
  name: string;
  code: string;
  additionalCodes?: string[];
  category: string;
  stock: number;
  minStock: number;
  price: number;
  costPrice?: number;
  image?: string;
  brand?: string;
  location?: string;
}

export interface Service {
  id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  estimatedTime?: string;
  description?: string;
}

export interface Transaction {
  id: string;
  description: string;
  category: string;
  type: 'Receita' | 'Despesa';
  entity: string; // Client name or Supplier name
  date: string;
  dueDate: string;
  paymentDate?: string;
  status: 'Pago' | 'Pendente' | 'Vencido' | 'Cancelado';
  value: number;
  paymentMethod?: string;
  referenceId?: string; // OS ID or other reference
  notes?: string;
  isFixed?: boolean;
}

export interface FixedExpense {
  id: string;
  description: string;
  category: string;
  entity: string;
  value: number;
  dueDay: number;
  notes?: string;
}

export interface Mechanic {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  specialty?: string;
  status: 'Ativo' | 'Inativo';
  commission?: number; // Percentage
}

export interface Seller {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'Ativo' | 'Inativo';
  commission?: number; // Percentage
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: string;
  status: 'Ativo' | 'Inativo';
  lastLogin?: string;
  cpf?: string;
  pixKey?: string;
}

export interface PDVOrder {
  id: string;
  number: string;
  clientId?: string;
  clientName: string;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    type: 'part' | 'service';
  }[];
  total: number;
  paymentMethod: string;
  installments: number;
  paymentMethod2?: string;
  installments2?: number;
  paidAmount1?: number;
  paidAmount2?: number;
  date: string;
  status: 'Finalizado' | 'Orçamento';
}
