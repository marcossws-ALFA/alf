"use client";

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  DollarSign, 
  Clock, 
  ThumbsUp, 
  Download, 
  Calendar,
  ChevronRight,
  User,
  Search
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from '@/src/lib/utils';
import { ServiceOrder, Transaction, PDVOrder } from '@/src/types';

interface DashboardProps {
  orders: ServiceOrder[];
  transactions: Transaction[];
  pdvOrders: PDVOrder[];
}

export default function Dashboard({ orders, transactions, pdvOrders }: DashboardProps) {
  const recentOrders = React.useMemo(() => {
    return [...orders].sort((a, b) => {
      try {
        const dateA = a.createdAt && typeof a.createdAt === 'string' ? new Date(a.createdAt.split('/').reverse().join('-')).getTime() : 0;
        const dateB = b.createdAt && typeof b.createdAt === 'string' ? new Date(b.createdAt.split('/').reverse().join('-')).getTime() : 0;
        return dateB - dateA;
      } catch (e) {
        return 0;
      }
    }).slice(0, 5);
  }, [orders]);
  
  const totalRevenue = transactions
    .filter(tx => tx.type === 'Receita' && tx.status === 'Pago')
    .reduce((acc, tx) => acc + tx.value, 0);

  const pendingReceivable = transactions
    .filter(tx => tx.type === 'Receita' && tx.status === 'Pendente')
    .reduce((acc, tx) => acc + tx.value, 0);

  const openOrdersCount = orders.filter(o => o.status !== 'CONCLUIDO' && o.status !== 'NÃO APROVADO').length;

  // Calculate monthly revenue for the chart
  const monthlyData = React.useMemo(() => {
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const currentYear = new Date().getFullYear();
    
    const data = months.map((month, index) => {
      const revenue = transactions
        .filter(tx => {
          if (!tx.date || typeof tx.date !== 'string') return false;
          try {
            const txDate = new Date(tx.date.split('/').reverse().join('-'));
            return tx.type === 'Receita' && 
                   tx.status === 'Pago' && 
                   txDate.getMonth() === index && 
                   txDate.getFullYear() === currentYear;
          } catch (e) {
            return false;
          }
        })
        .reduce((acc, tx) => acc + (tx.value || 0), 0);

      const previousRevenue = transactions
        .filter(tx => {
          if (!tx.date || typeof tx.date !== 'string') return false;
          try {
            const txDate = new Date(tx.date.split('/').reverse().join('-'));
            return tx.type === 'Receita' && 
                   tx.status === 'Pago' && 
                   txDate.getMonth() === index && 
                   txDate.getFullYear() === currentYear - 1;
          } catch (e) {
            return false;
          }
        })
        .reduce((acc, tx) => acc + (tx.value || 0), 0);

      return { name: month, current: revenue, previous: previousRevenue };
    });

    // Return only the last 6 months that have data or up to current month
    const currentMonth = new Date().getMonth();
    return data.slice(Math.max(0, currentMonth - 5), currentMonth + 1);
  }, [transactions]);

  // Calculate revenue distribution (Parts vs Services)
  const distributionData = React.useMemo(() => {
    let partsTotal = 0;
    let servicesTotal = 0;

    orders.forEach(order => {
      if (order.status === 'CONCLUIDO') {
        (order.parts || []).forEach(p => {
          if (p.totalPrice && typeof p.totalPrice === 'string') {
            partsTotal += parseFloat(p.totalPrice.replace(/[^\d,]/g, '').replace(',', '.') || '0');
          }
        });
        (order.services || []).forEach(s => {
          if (s.totalPrice && typeof s.totalPrice === 'string') {
            servicesTotal += parseFloat(s.totalPrice.replace(/[^\d,]/g, '').replace(',', '.') || '0');
          }
        });
      }
    });

    pdvOrders.forEach(order => {
      if (order.status === 'Finalizado') {
        (order.items || []).forEach(item => {
          if (item.type === 'part') partsTotal += (item.price || 0) * (item.quantity || 0);
          else servicesTotal += (item.price || 0) * (item.quantity || 0);
        });
      }
    });

    return [
      { name: 'Peças', value: partsTotal, color: '#000666' },
      { name: 'Serviços', value: servicesTotal, color: '#a0f399' }
    ];
  }, [orders, pdvOrders]);

  const averageTicket = React.useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'CONCLUIDO');
    const completedPDV = pdvOrders.filter(o => o.status === 'Finalizado');
    const totalCount = completedOrders.length + completedPDV.length;
    
    if (totalCount === 0) return 0;

    const totalVal = completedOrders.reduce((acc, o) => {
      const val = typeof o.total === 'string' ? parseFloat(o.total.replace(/[^\d,]/g, '').replace(',', '.') || '0') : (typeof o.total === 'number' ? o.total : 0);
      return acc + val;
    }, 0) + completedPDV.reduce((acc, o) => acc + (o.total || 0), 0);
    
    return totalVal / totalCount;
  }, [orders, pdvOrders]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-[#000666] tracking-tight">Dashboard</h2>
          <p className="text-slate-500 text-sm font-medium">Bem-vindo de volta. Aqui está sua visão operacional de hoje.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-[#1b1b21] border border-[#c6c5d4]/30 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors">
            <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
            Últimos 30 Dias
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#000666] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md active:scale-95 transition-all">
            <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
            Exportar
          </button>
        </div>
      </div>

      {/* Global Search Section */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-[#c6c5d4]/15 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-[#f5f2fb] rounded-full -mr-24 -mt-24 sm:-mr-32 sm:-mt-32 opacity-50"></div>
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-3 sm:space-y-6">
          <h3 className="text-lg sm:text-2xl font-black text-[#1b1b21]">O que você está procurando?</h3>
          <p className="text-slate-500 text-[10px] sm:text-sm">Pesquise clientes, ordens, equipamentos ou peças.</p>
          
          <div className="relative group">
            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-[#000666] group-focus-within:scale-110 transition-transform sm:w-6 sm:h-6 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="w-full pl-11 sm:pl-14 pr-6 py-3 sm:py-5 bg-[#f5f2fb] border-2 border-transparent rounded-2xl text-sm sm:text-lg font-medium focus:bg-white focus:border-[#000666]/10 focus:ring-4 focus:ring-[#000666]/5 transition-all outline-none shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Ordens Abertas', value: openOrdersCount, change: '+12%', trend: 'up', icon: Receipt, color: 'bg-[#e0e0ff] text-[#000767]', sub: 'tarefas urgentes restantes' },
          { label: 'Receita Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, change: '+8.4%', trend: 'up', icon: DollarSign, color: 'bg-[#a3f69c] text-[#002204]', sub: 'v.s mês passado' },
          { label: 'Ticket Médio', value: `R$ ${averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, change: '+5.2%', trend: 'up', icon: ThumbsUp, color: 'bg-[#bdc2ff] text-[#343d96]', sub: 'Baseado em vendas concluídas' },
          { label: 'Contas a Receber', value: `R$ ${pendingReceivable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, change: '-2%', trend: 'down', icon: Clock, color: 'bg-[#ffdbcf] text-[#380d00]', sub: `${transactions.filter(t => t.type === 'Receita' && t.status === 'Pendente').length} faturas pendentes` },
        ].map((metric) => (
          <div key={metric.label} className="bg-white p-6 rounded-xl shadow-sm border-b-2 border-[#000666]/10 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={cn("p-2 rounded-lg", metric.color)}>
                <metric.icon size={20} />
              </div>
              <span className={cn(
                "font-bold text-xs flex items-center gap-1",
                metric.trend === 'up' ? "text-[#1b6d24]" : metric.trend === 'down' ? "text-[#ba1a1a]" : "text-slate-500"
              )}>
                {metric.trend === 'up' && <TrendingUp size={14} />}
                {metric.trend === 'down' && <TrendingDown size={14} />}
                {metric.change}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{metric.label}</p>
            <h3 className="text-2xl font-black text-[#1b1b21]">{metric.value}</h3>
            <p className="text-[11px] text-slate-400 mt-2">{metric.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-lg font-bold text-[#1b1b21]">Crescimento de Receita</h4>
              <p className="text-xs text-slate-500">Acompanhamento mensal de desempenho financeiro</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#000666] rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ATUAL</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#bdc2ff] rounded-full"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ANTERIOR</span>
              </div>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, '']}
                />
                <Bar dataKey="previous" fill="#bdc2ff" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="current" fill="#000666" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#c6c5d4]/10 flex flex-col">
          <h4 className="text-lg font-bold text-[#1b1b21] mb-1">Mix de Receita</h4>
          <p className="text-xs text-slate-500 mb-6">Distribuição entre Peças e Serviços</p>
          
          <div className="flex-1 min-h-[200px] relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
              <span className="text-lg font-black text-[#000666]">
                R$ {(distributionData[0].value + distributionData[1].value).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {distributionData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-xs font-bold text-slate-600">{item.name}</span>
                </div>
                <span className="text-xs font-black text-[#1b1b21]">
                  {((item.value / (distributionData[0].value + distributionData[1].value || 1)) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders and Transactions Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Orders Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#c6c5d4]/10">
          <div className="p-6 border-b border-[#c6c5d4]/15 flex justify-between items-center bg-[#f5f2fb]/30">
            <h4 className="font-bold text-[#1b1b21]">Ordens de Serviço Recentes</h4>
            <button className="text-[#000666] text-xs font-bold hover:underline">Ver Todas</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f5f2fb]/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d4]/10">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#f5f2fb]/30 transition-colors group">
                    <td className="px-6 py-4 text-sm font-bold text-[#000666]">#{order.number}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold truncate max-w-[150px]">{order.clientName}</p>
                      <p className="text-[10px] text-slate-400">{order.createdAt}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                        order.status === 'CONCLUIDO' ? "bg-[#a0f399] text-[#005312]" : 
                        order.status === 'AGUARDANDO APROVAÇÃO' ? "bg-[#ffdbcf] text-[#802a00]" : 
                        order.status === 'NÃO APROVADO' ? "bg-[#ffdad6] text-[#93000a]" :
                        "bg-[#e0e0ff] text-[#343d96]"
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-right text-[#1b1b21]">{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-[#c6c5d4]/10">
          <div className="p-6 border-b border-[#c6c5d4]/15 flex justify-between items-center bg-[#f5f2fb]/30">
            <h4 className="font-bold text-[#1b1b21]">Fluxo de Caixa Recente</h4>
            <button className="text-[#000666] text-xs font-bold hover:underline">Ver Extrato</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f5f2fb]/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d4]/10">
                {transactions.slice(0, 5).map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#f5f2fb]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold truncate max-w-[150px]">{tx.description}</p>
                      <p className="text-[10px] text-slate-400">{tx.date}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "flex items-center gap-1.5 text-[10px] font-bold uppercase",
                        tx.type === 'Receita' ? "text-[#1b6d24]" : "text-[#ba1a1a]"
                      )}>
                        {tx.type === 'Receita' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {tx.type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                        tx.status === 'Pago' ? "bg-[#a0f399] text-[#005312]" : "bg-[#ffdbcf] text-[#802a00]"
                      )}>
                        {tx.status}
                      </span>
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-sm font-bold text-right",
                      tx.type === 'Receita' ? "text-[#1b6d24]" : "text-[#ba1a1a]"
                    )}>
                      {tx.type === 'Receita' ? '+' : '-'} R$ {tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const data = [
  { name: 'JAN', current: 60, previous: 40 },
  { name: 'FEB', current: 75, previous: 55 },
  { name: 'MAR', current: 90, previous: 45 },
  { name: 'APR', current: 80, previous: 60 },
  { name: 'MAY', current: 85, previous: 70 },
  { name: 'JUN', current: 95, previous: 50 },
];
