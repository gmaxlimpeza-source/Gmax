import { useMemo, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  ShoppingBag, 
  AlertTriangle, 
  ArrowUpRight,
  Package,
  Calendar,
  Trash2
} from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useSales } from '../hooks/useSales';
import { motion, AnimatePresence } from 'motion/react';
import { Sale } from '../types';

export function Dashboard() {
  const { products } = useInventory();
  const { sales, deleteSale } = useSales();
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  const stats = useMemo(() => {
    const parseTS = (timestamp: any): Date => {
      if (!timestamp) return new Date();
      if (typeof timestamp.toDate === 'function') return timestamp.toDate();
      if (timestamp instanceof Date) return timestamp;
      if (typeof timestamp === 'string') return new Date(timestamp);
      if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
      return new Date();
    };

    const now = new Date();
    const todaySales = sales.filter(s => {
      const saleDate = parseTS(s.timestamp);
      return !s.isVoided &&
             saleDate.getDate() === now.getDate() &&
             saleDate.getMonth() === now.getMonth() &&
             saleDate.getFullYear() === now.getFullYear();
    });

    const revenue = todaySales.reduce((acc, s) => acc + s.total, 0);
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

    // Prepare chart data (last 7 days)
    const chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const daySales = sales.filter(s => {
        const sd = parseTS(s.timestamp);
        return !s.isVoided && sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth();
      });
      return {
        date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        value: daySales.reduce((acc, s) => acc + s.total, 0)
      };
    });

    return {
      revenue,
      salesCount: todaySales.length,
      lowStockCount,
      chartData,
      recentSales: sales.slice(0, 5)
    };
  }, [sales, products]);

  return (
    <div className="space-y-8">
      {/* Upper Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Faturamento do Dia" 
          value={`R$ ${stats.revenue.toFixed(2)}`} 
          icon={TrendingUp} 
          color="blue"
          trend="+12%"
        />
        <StatCard 
          title="Vendas Hoje" 
          value={stats.salesCount.toString()} 
          icon={ShoppingBag} 
          color="indigo"
          trend="+5%"
        />
        <StatCard 
          title="Estoque Crítico" 
          value={stats.lowStockCount.toString()} 
          icon={AlertTriangle} 
          color={stats.lowStockCount > 0 ? "orange" : "blue"}
          trend={stats.lowStockCount > 0 ? "Revisar" : "Tudo OK"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Desempenho Comercial</h3>
              <p className="text-xs text-gray-800 font-black uppercase tracking-wider">Últimos 7 dias de operação</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    fontSize: '10px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2563eb" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Sales Feed */}
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm h-full">
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-6">Últimas Vendas</h3>
          <div className="space-y-4">
            {stats.recentSales.map((sale, i) => (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={sale.id} 
                className={`flex items-center justify-between p-3 rounded-xl transition-all cursor-default border ${
                  sale.isVoided 
                    ? 'bg-red-50/40 border-red-100 opacity-75 hover:bg-red-50/60' 
                    : 'hover:bg-blue-50 border-transparent hover:border-blue-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    sale.isVoided
                      ? 'bg-red-100/60 text-red-600'
                      : sale.paymentMethod === 'pix' ? 'bg-teal-50 text-teal-600' :
                        sale.paymentMethod === 'card' ? 'bg-blue-50 text-blue-600' :
                        'bg-orange-50 text-orange-600'
                  }`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <p className={`text-sm font-black ${sale.isVoided ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                      R$ {sale.total.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-gray-700 font-bold uppercase tracking-tighter">
                      {sale.paymentMethod} {sale.isVoided && <span className="text-red-600 font-black">• ESTORNADA</span>} • {(sale.timestamp ? (typeof sale.timestamp.toDate === 'function' ? sale.timestamp.toDate() : (sale.timestamp.seconds ? new Date(sale.timestamp.seconds * 1000) : new Date(sale.timestamp))) : new Date()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sale.isVoided ? (
                    <span className="text-[8px] font-black bg-red-100 border border-red-200 text-red-700 px-2 py-1 rounded-full uppercase tracking-wider shrink-0">
                      Estorno
                    </span>
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-blue-200 shrink-0" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSaleToDelete(sale);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all shrink-0"
                    title="Excluir Registro de Venda"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
            {stats.recentSales.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-blue-200" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900/20">Nenhuma venda registrada</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for deletion */}
      <AnimatePresence>
        {saleToDelete && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 text-left">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSaleToDelete(null)}
              className="absolute inset-0 bg-blue-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl space-y-6 text-center border-t-8 border-red-500"
            >
              <div className="mx-auto w-15 h-15 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                <Trash2 className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-blue-900 uppercase">Excluir Registro?</h3>
                <p className="text-xs text-blue-300 uppercase font-black tracking-widest leading-relaxed">
                  Esta ação excluirá permanentemente o registro de venda de <span className="text-blue-900">R$ {saleToDelete.total.toFixed(2)}</span> do histórico.
                  {!saleToDelete.isVoided && (
                    <span className="block mt-2 text-amber-600 font-extrabold bg-amber-50 rounded-xl p-2.5 border border-amber-200 normal-case tracking-normal">
                      ⚠️ Nota: O estoque dos produtos comprados será restaurado.
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setSaleToDelete(null)}
                  className="flex-1 py-4 bg-blue-50 text-blue-400 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-100 transition-all text-xs"
                >
                  Manter
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await deleteSale(saleToDelete);
                      setSaleToDelete(null);
                    } catch (err) {
                      console.error("Erro ao excluir venda:", err);
                    }
                  }}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 text-xs"
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

function StatCard({ title, value, icon: Icon, color, trend }: any) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
    gray: 'bg-slate-50 text-slate-400',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-blue-50 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-blue-500/5 transition-all">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-500">
        <Icon className="w-16 h-16" />
      </div>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-6">
          <div className={`p-3 rounded-2xl ${colorMap[color] || colorMap.gray}`}>
            <Icon className="w-6 h-6" />
          </div>
          <span className="text-[9px] font-black text-slate-400 border border-slate-100 px-3 py-1.5 rounded-full uppercase tracking-widest">
            {trend}
          </span>
        </div>
        <div>
          <h4 className="text-gray-700 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</h4>
          <p className="text-3xl font-black text-gray-950 tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}
