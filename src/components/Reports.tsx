import { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  History, 
  Filter, 
  ArrowLeftRight, 
  Download,
  Trash2,
  AlertTriangle,
  CalendarDays
} from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { Sale, PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export function Reports() {
  const { sales, voidSale, loading } = useSales();
  const [filter, setFilter] = useState<'today' | 'month' | 'all'>('today');
  const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
      const d = s.timestamp.toDate();
      if (filter === 'today') {
        return d.getDate() === now.getDate() && 
               d.getMonth() === now.getMonth() && 
               d.getFullYear() === now.getFullYear();
      }
      if (filter === 'month') {
        return d.getMonth() === now.getMonth() && 
               d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [sales, filter]);

  const chartData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredSales.forEach(s => {
      const day = s.timestamp.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      data[day] = (data[day] || 0) + s.total;
    });
    return Object.entries(data).map(([name, total]) => ({ name, total }));
  }, [filteredSales]);

  const pieData = useMemo(() => {
    const data: Record<PaymentMethod, number> = { cash: 0, card: 0, pix: 0 };
    filteredSales.forEach(s => {
      data[s.paymentMethod] += s.total;
    });
    return [
      { name: 'Dinheiro', value: data.cash, color: '#F97316' },
      { name: 'Cartão', value: data.card, color: '#3B82F6' },
      { name: 'PIX', value: data.pix, color: '#14B8A6' }
    ].filter(d => d.value > 0);
  }, [filteredSales]);

  const handleVoid = async () => {
    if (saleToVoid) {
      await voidSale(saleToVoid);
      setSaleToVoid(null);
    }
  };

  if (loading) return <div>Carregando relatórios...</div>;

  return (
    <div className="space-y-8">
      {/* Filtering Header */}
      <div className="flex items-center justify-between">
        <div className="flex bg-white p-1 rounded-xl border border-blue-100 shadow-sm">
          {['today', 'month', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-blue-200 hover:text-blue-600'
              }`}
            >
              {f === 'today' ? 'Hoje' : f === 'month' ? 'Mensal' : 'Tudo'}
            </button>
          ))}
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#141414] transition-colors">
              <Download className="w-4 h-4" /> Exportar CSV
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales by Period */}
        <div className="bg-white p-8 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight">Faturamento Periódico</h3>
            <span className="text-[10px] uppercase font-black text-blue-300">Total: R$ {filteredSales.reduce((a, s) => a + s.total, 0).toFixed(2)}</span>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-8 rounded-2xl border border-blue-100 shadow-sm">
          <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight mb-8">Composição de Pagamento</h3>
          <div className="h-[250px] flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-1/2 space-y-4">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center justify-between border-b border-gray-50 pb-2">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-xs font-bold text-gray-400 uppercase">{d.name}</span>
                   </div>
                   <span className="text-sm font-black">R$ {d.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed History */}
      <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="p-6 bg-blue-50/50 border-b border-blue-100 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <History className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-blue-900">Histórico Detalhado</h3>
        </div>
        <div className="divide-y divide-blue-50">
          {filteredSales.map((sale) => (
            <div key={sale.id} className="p-6 hover:bg-blue-50/20 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-2xl ${
                  sale.paymentMethod === 'pix' ? 'bg-teal-50 text-teal-600' :
                  sale.paymentMethod === 'card' ? 'bg-blue-50 text-blue-600' :
                  'bg-orange-50 text-orange-600'
                }`}>
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-black text-xl text-blue-900 tracking-tight">R$ {sale.total.toFixed(2)}</p>
                    <span className="text-[9px] font-black bg-white px-2 py-1 rounded-full border border-blue-100 uppercase tracking-widest text-blue-400">{sale.paymentMethod}</span>
                  </div>
                  <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest mt-1">
                    ID: {sale.id.slice(0, 8)} • {sale.timestamp.toDate().toLocaleString('pt-BR')}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sale.items.map((item, idx) => (
                      <span key={idx} className="text-[9px] font-black border border-blue-50 bg-blue-50/30 px-3 py-1 rounded-full text-blue-400 uppercase">
                        {item.quantity}x {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSaleToVoid(sale)}
                className="flex items-center gap-2 text-[10px] font-black text-red-400 hover:text-red-600 transition-all uppercase tracking-widest bg-red-50 px-4 py-2.5 rounded-xl hover:bg-red-100"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Estornar Venda
              </button>
            </div>
          ))}
          {filteredSales.length === 0 && (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-blue-200" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-900/20">Nenhuma venda encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* Void Confirmation Modal */}
      <AnimatePresence>
        {saleToVoid && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSaleToVoid(null)}
              className="absolute inset-0 bg-blue-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl space-y-6 text-center border-t-8 border-orange-500"
            >
              <div className="mx-auto w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-blue-900 uppercase">Confirmar Estorno?</h3>
                <p className="text-xs text-blue-300 uppercase font-black tracking-widest">
                  A venda de <span className="text-blue-900">R$ {saleToVoid.total.toFixed(2)}</span> será excluída e os itens retornarão ao estoque.
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setSaleToVoid(null)}
                  className="flex-1 py-4 bg-blue-50 text-blue-400 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                >
                  Manter
                </button>
                <button 
                  onClick={handleVoid}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20"
                >
                  Estornar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
