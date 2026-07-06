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
  CalendarDays,
  Printer
} from 'lucide-react';
import { useSales } from '../hooks/useSales';
import { Sale, PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { usePerformanceMode } from '../hooks/usePerformanceMode';
import { ReceiptModal } from './ReceiptModal';

export function Reports() {
  const { isPerformanceMode } = usePerformanceMode();
  const { sales, voidSale, loading, settleSale, deleteSale } = useSales();
  const [filter, setFilter] = useState<'today' | 'month' | 'all'>('today');
  const [saleToVoid, setSaleToVoid] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  const filteredSales = useMemo(() => {
    const parseTS = (timestamp: any): Date => {
      if (!timestamp) return new Date();
      if (typeof timestamp.toDate === 'function') return timestamp.toDate();
      if (timestamp instanceof Date) return timestamp;
      if (typeof timestamp === 'string') return new Date(timestamp);
      if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
      return new Date();
    };

    const now = new Date();
    return sales.filter(s => {
      const d = parseTS(s.timestamp);
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

  const activeSales = useMemo(() => {
    return filteredSales.filter(s => !s.isVoided);
  }, [filteredSales]);

  const chartData = useMemo(() => {
    const parseTS = (timestamp: any): Date => {
      if (!timestamp) return new Date();
      if (typeof timestamp.toDate === 'function') return timestamp.toDate();
      if (timestamp instanceof Date) return timestamp;
      if (typeof timestamp === 'string') return new Date(timestamp);
      if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
      return new Date();
    };

    const data: Record<string, number> = {};
    activeSales.forEach(s => {
      const day = parseTS(s.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      data[day] = (data[day] || 0) + s.total;
    });
    return Object.entries(data).map(([name, total]) => ({ name, total }));
  }, [activeSales]);

  const pieData = useMemo(() => {
    const data: Record<PaymentMethod, number> = { cash: 0, card: 0, pix: 0, on_account: 0 };
    activeSales.forEach(s => {
      if (s.paymentMethod === 'multiple' && s.payments && s.payments.length > 0) {
        s.payments.forEach(p => {
          if (p.method in data) {
            data[p.method] += p.amount;
          }
        });
      } else {
        const method = s.paymentMethod === 'multiple' ? 'cash' : (s.paymentMethod || 'cash');
        data[method] = (data[method] || 0) + s.total;
      }
    });
    return [
      { name: 'Dinheiro', value: data.cash ?? 0, color: '#F97316' },
      { name: 'Cartão', value: data.card ?? 0, color: '#3B82F6' },
      { name: 'PIX', value: data.pix ?? 0, color: '#14B8A6' },
      { name: 'A Prazo', value: data.on_account ?? 0, color: '#D97706' }
    ].filter(d => d.value > 0);
  }, [activeSales]);

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
            <span className="text-[10px] uppercase font-black text-blue-300">Total: R$ {activeSales.reduce((a, s) => a + s.total, 0).toFixed(2)}</span>
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
        <div className="p-6 bg-blue-50 border-b border-blue-100 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <History className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-900">Histórico Detalhado</h3>
        </div>
        <div className="divide-y divide-blue-50">
          {filteredSales.map((sale) => (
            <div key={sale.id} className={`p-6 transition-colors flex flex-col gap-4 ${
              sale.isVoided 
                ? 'bg-red-50/10 hover:bg-red-50/20 opacity-75' 
                : 'hover:bg-blue-50/20'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-4 rounded-2xl shrink-0 ${
                    sale.isVoided
                      ? 'bg-red-50 text-red-600'
                      : sale.paymentMethod === 'pix' ? 'bg-teal-50 text-teal-600' :
                        sale.paymentMethod === 'card' ? 'bg-blue-50 text-blue-600' :
                        sale.paymentMethod === 'on_account' ? 'bg-amber-50 text-amber-700' :
                        sale.paymentMethod === 'multiple' ? 'bg-purple-50 text-purple-700' :
                        'bg-orange-50 text-orange-600'
                  }`}>
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className={`font-black text-xl tracking-tight ${sale.isVoided ? 'text-red-600 line-through' : 'text-gray-950'}`}>
                        R$ {sale.total.toFixed(2)}
                      </p>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full border uppercase tracking-widest ${
                        sale.paymentMethod === 'on_account' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                        sale.paymentMethod === 'pix' ? 'bg-teal-50 border-teal-200 text-teal-850' :
                        sale.paymentMethod === 'card' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                        sale.paymentMethod === 'multiple' ? 'bg-purple-550 border-purple-200 text-purple-800' :
                        'bg-orange-50 border-orange-200 text-orange-800'
                      }`}>
                        {sale.paymentMethod === 'on_account' ? 'A Prazo / Aberto' : 
                         sale.paymentMethod === 'multiple' ? 'Misto' : 
                         sale.paymentMethod === 'cash' ? 'Dinheiro' : sale.paymentMethod}
                      </span>
                      {sale.isVoided && (
                        <span className="text-[9px] font-black bg-red-100 border border-red-200 text-red-700 px-2 py-1 rounded-full uppercase tracking-widest">
                          Estornada
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-800 font-extrabold uppercase tracking-widest mt-1">
                      ID: {sale.id.slice(0, 8)} • {(sale.timestamp ? (typeof sale.timestamp.toDate === 'function' ? sale.timestamp.toDate() : (sale.timestamp.seconds ? new Date(sale.timestamp.seconds * 1000) : new Date(sale.timestamp))) : new Date()).toLocaleString('pt-BR')}
                      {sale.customerName && ` • Cliente: ${sale.customerName}`}
                      {sale.customerCpf && ` (${sale.customerCpf})`}
                    </p>
                    {sale.paymentMethod === 'multiple' && sale.payments && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[8px] font-black uppercase text-purple-900/60 tracking-wider">Misto:</span>
                        {sale.payments.map((p, idx) => (
                          <span key={idx} className="text-[8px] font-black uppercase border border-purple-100 bg-purple-50/50 text-purple-800 px-2 py-0.5 rounded-full">
                            {p.method === 'cash' ? 'Dinheiro' : p.method === 'card' ? 'Cartão' : p.method === 'pix' ? 'Pix' : 'A Prazo'}: R$ {p.amount.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {sale.items.map((item, idx) => (
                        <span key={idx} className={`text-[9px] font-extrabold border px-3 py-1 rounded-full uppercase ${
                          sale.isVoided
                            ? 'border-red-100 bg-red-50/40 text-red-900/60'
                            : 'border-blue-200 bg-blue-100/60 text-blue-950'
                        }`}>
                          {item.quantity}x {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button 
                    onClick={() => setSelectedSaleForReceipt(sale)}
                    className="flex items-center gap-2 text-[10px] font-black text-blue-600 hover:text-blue-850 transition-all uppercase tracking-widest bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl border border-transparent hover:border-blue-200 shrink-0"
                    title="Imprimir Comprovante Simples"
                  >
                    <Printer className="w-4 h-4" />
                    Comprovante
                  </button>
                  {sale.isVoided ? (
                    <div className="flex items-center gap-2 text-[10px] font-black text-red-600 border border-red-200 bg-red-100/40 px-4 py-2.5 rounded-xl uppercase tracking-widest select-none">
                      Venda Estornada {sale.voidedAt && `• ${(typeof sale.voidedAt.toDate === 'function' ? sale.voidedAt.toDate() : (sale.voidedAt.seconds ? new Date(sale.voidedAt.seconds * 1000) : new Date(sale.voidedAt))).toLocaleDateString('pt-BR')}`}
                    </div>
                  ) : (
                    <button 
                      onClick={() => setSaleToVoid(sale)}
                      className="flex items-center gap-2 text-[10px] font-black text-red-400 hover:text-red-650 transition-all uppercase tracking-widest bg-red-50 px-4 py-2.5 rounded-xl hover:bg-red-100"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      Estornar Venda
                    </button>
                  )}
                  <button
                    onClick={() => setSaleToDelete(sale)}
                    className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-red-650 transition-all uppercase tracking-widest bg-gray-50 hover:bg-red-50 p-2.5 rounded-xl border border-transparent hover:border-red-100 shrink-0"
                    title="Excluir Registro de Venda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Outstanding payment details Settlement section */}
              {!sale.isVoided && (sale.paymentMethod === 'on_account' || (sale.paymentMethod === 'multiple' && (sale.onAccountOutstandingAmount ?? 0) > 0)) && (
                <div className="mt-2 p-4 bg-amber-50/40 rounded-2xl border border-amber-200/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs">
                    <span className="font-extrabold text-amber-800 uppercase text-[9.5px] tracking-widest block">Controle de Venda a Prazo</span>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1 text-gray-500 font-bold">
                      <span>Valor de Entrada: <strong className="text-gray-800">R$ {(sale.onAccountPaidAmount || 0).toFixed(2)}</strong></span>
                      <span>Valor em Aberto: <strong className="text-amber-700">R$ {(sale.onAccountOutstandingAmount ?? sale.total).toFixed(2)}</strong></span>
                      <span>Vencimento: <strong className="text-gray-800">{(sale.onAccountDueDate ? (typeof sale.onAccountDueDate.toDate === 'function' ? sale.onAccountDueDate.toDate() : (sale.onAccountDueDate.seconds ? new Date(sale.onAccountDueDate.seconds * 1000) : new Date(sale.onAccountDueDate))) : new Date()).toLocaleDateString('pt-BR')}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sale.onAccountStatus === 'paid' ? (
                      <span className="text-[9px] font-black bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-full uppercase tracking-widest">
                        Débito Quitado
                      </span>
                    ) : (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Confirmar quitação do saldo pendente de R$ ${(sale.onAccountOutstandingAmount ?? sale.total).toFixed(2)} para o cliente ${sale.customerName || 'CONSUMIDOR PADRÃO'}?`)) {
                            try {
                              await settleSale(sale.id);
                            } catch (e) {
                              console.error(e);
                            }
                          }
                        }}
                        className="bg-amber-500 hover:bg-amber-600 border-2 border-amber-400 text-white text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest transition-all shadow-md active:scale-95 hover:shadow-lg"
                      >
                        Quitar Aberto
                      </button>
                    )}
                  </div>
                </div>
              )}
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
              initial={isPerformanceMode ? false : { opacity: 0 }}
              animate={isPerformanceMode ? { opacity: 1 } : { opacity: 1 }}
              exit={isPerformanceMode ? { opacity: 0 } : { opacity: 0 }}
              transition={isPerformanceMode ? { duration: 0 } : undefined}
              onClick={() => setSaleToVoid(null)}
              className="absolute inset-0 bg-blue-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={isPerformanceMode ? false : { opacity: 0, scale: 0.9 }}
              animate={isPerformanceMode ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
              exit={isPerformanceMode ? { opacity: 0, scale: 0.9 } : { opacity: 0, scale: 0.9 }}
              transition={isPerformanceMode ? { duration: 0 } : undefined}
              className="relative bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl space-y-6 text-center border-t-8 border-orange-500"
            >
              <div className="mx-auto w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-blue-900 uppercase">Confirmar Estorno?</h3>
                <p className="text-xs text-blue-300 uppercase font-black tracking-widest">
                  A venda de <span className="text-blue-900">R$ {saleToVoid.total.toFixed(2)}</span> será estornada e os itens retornarão ao estoque.
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

        {saleToDelete && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 text-left">
            <motion.div 
              initial={isPerformanceMode ? false : { opacity: 0 }}
              animate={isPerformanceMode ? { opacity: 1 } : { opacity: 1 }}
              exit={isPerformanceMode ? { opacity: 0 } : { opacity: 0 }}
              transition={isPerformanceMode ? { duration: 0 } : undefined}
              onClick={() => setSaleToDelete(null)}
              className="absolute inset-0 bg-blue-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={isPerformanceMode ? false : { opacity: 0, scale: 0.9 }}
              animate={isPerformanceMode ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
              exit={isPerformanceMode ? { opacity: 0, scale: 0.9 } : { opacity: 0, scale: 0.9 }}
              transition={isPerformanceMode ? { duration: 0 } : undefined}
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

      <ReceiptModal 
        sale={selectedSaleForReceipt} 
        onClose={() => setSelectedSaleForReceipt(null)}
      />
    </div>
  );
}
