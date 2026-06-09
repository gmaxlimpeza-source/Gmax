import { useState, useMemo, FormEvent } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  X, 
  AlertTriangle,
  ArrowUpDown,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { usePerformanceMode } from '../hooks/usePerformanceMode';

export function Inventory() {
  const { isPerformanceMode } = usePerformanceMode();
  const { products, addProduct, updateProduct, deleteProduct, loading } = useInventory();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode.includes(searchTerm)
    );
  }, [products, searchTerm]);

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      barcode: formData.get('barcode') as string,
      price: parseFloat(formData.get('price') as string),
      stock: parseInt(formData.get('stock') as string),
      minStock: parseInt(formData.get('minStock') as string),
      category: formData.get('category') as string,
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, data);
    } else {
      await addProduct(data);
    }
    
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteProduct(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  if (loading) return <div>Carregando inventário...</div>;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Pesquisar por nome ou barcode..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-blue-100 focus:ring-4 focus:ring-blue-100/50 focus:border-blue-500 outline-none transition-all font-black text-xs uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
        >
          <Plus className="w-5 h-5 shadow-sm" />
          Novo Produto
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-blue-50 border-b border-blue-150">
                <th className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-800">Produto</th>
                <th className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-800">Barcode</th>
                <th className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-800">Categoria</th>
                <th className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-800 text-right">Preço</th>
                <th className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-800 text-center">Estoque</th>
                <th className="px-6 py-5 font-black text-[10px] uppercase tracking-widest text-gray-800 text-right px-8">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="group hover:bg-blue-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-gray-950 uppercase text-xs">{p.name}</p>
                    {p.stock <= p.minStock && (
                      <span className="flex items-center gap-1 text-[9px] font-black text-red-600 uppercase mt-1 tracking-widest">
                        <AlertTriangle className="w-3 h-3" /> Estoque Crítico
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-[10px] text-gray-800 font-black tracking-tight">{p.barcode}</td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-black bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-full uppercase tracking-widest text-blue-900">
                      {p.category || 'Geral'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black text-right text-xs text-gray-900">R$ {p.price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-black ${p.stock <= p.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {p.stock}
                    </span>
                    <span className="text-[10px] text-gray-600 font-black ml-1 uppercase">un</span>
                  </td>
                  <td className="px-6 py-4 text-right px-8">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingProduct(p);
                          setIsFormOpen(true);
                        }}
                        className="p-2.5 hover:bg-blue-600 hover:text-white text-blue-400 bg-blue-50 rounded-xl transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="p-2.5 hover:bg-red-600 hover:text-white text-red-400 bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="py-24 text-center">
               <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-blue-400" />
               </div>
              <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Product Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div 
              initial={isPerformanceMode ? false : { opacity: 0 }}
              animate={isPerformanceMode ? { opacity: 1 } : { opacity: 1 }}
              exit={isPerformanceMode ? { opacity: 0 } : { opacity: 0 }}
              transition={isPerformanceMode ? { duration: 0 } : undefined}
              onClick={() => setIsFormOpen(false)}
              className="fixed inset-0 bg-blue-950/20 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={isPerformanceMode ? false : { opacity: 0, x: 400 }}
              animate={isPerformanceMode ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
              exit={isPerformanceMode ? { opacity: 0, x: 400 } : { opacity: 0, x: 400 }}
              transition={isPerformanceMode ? { duration: 0 } : undefined}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] p-8 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase tracking-widest text-slate-800">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-blue-50 text-blue-300 rounded-full">
                  <X className="w-6 h-6 shadow-sm" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <InputGroup label="Nome do Produto" name="name" defaultValue={editingProduct?.name} required />
                <InputGroup label="Código / Barcode" name="barcode" defaultValue={editingProduct?.barcode} required />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Preço (R$)" name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required />
                  <InputGroup label="Categoria" name="category" defaultValue={editingProduct?.category} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup label="Qtd em Estoque" name="stock" type="number" defaultValue={editingProduct?.stock} required />
                  <InputGroup label="Estoque Mínimo" name="minStock" type="number" defaultValue={editingProduct?.minStock} required />
                </div>

                <div className="pt-8">
                  <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 shadow-sm" />
                    {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={isPerformanceMode ? false : { opacity: 0 }}
              animate={isPerformanceMode ? { opacity: 1 } : { opacity: 1 }}
              exit={isPerformanceMode ? { opacity: 0 } : { opacity: 0 }}
              transition={isPerformanceMode ? { duration: 0 } : undefined}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-blue-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={isPerformanceMode ? false : { opacity: 0, scale: 0.9 }}
              animate={isPerformanceMode ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1 }}
              exit={isPerformanceMode ? { opacity: 0, scale: 0.9 } : { opacity: 0, scale: 0.9 }}
              transition={isPerformanceMode ? { duration: 0 } : undefined}
              className="relative bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl space-y-6 text-center border-t-8 border-red-500"
            >
              <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-blue-900 uppercase">Excluir Produto?</h3>
                <p className="text-[10px] text-blue-300 font-black uppercase leading-relaxed tracking-widest">Esta ação removerá permanentemente o item do catálogo.</p>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-4 bg-blue-50 text-blue-300 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-100 transition-all font-black"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 font-black"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InputGroup({ label, ...props }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-700 ml-2">{label}</label>
      <input 
        {...props}
        className="w-full p-4 bg-blue-50/30 rounded-2xl border-2 border-transparent focus:bg-white focus:border-blue-600 outline-none transition-all font-black text-xs uppercase"
      />
    </div>
  );
}
