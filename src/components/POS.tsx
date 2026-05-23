import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Barcode,
  CreditCard,
  Banknote,
  QrCode,
  Zap,
  AlertCircle,
  Clock,
  HardDrive,
  User as UserIcon,
  ShoppingBag,
  Delete,
  XCircle,
  CheckCircle2,
  Trash2,
  Plus,
  Percent,
  Sparkles
} from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useSales } from '../hooks/useSales';
import { Product, SaleItem, PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';

const playScannerBeep = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(1400, audioCtx.currentTime); // 1400 Hz electronic scanner tone
    
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08); // 80 ms quick duration

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.08);
  } catch (e) {
    console.warn('Erro ao reproduzir áudio do bipe:', e);
  }
};

export function POS({ user }: { user?: any }) {
  const { products } = useInventory();
  const { createSale } = useSales();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [discount, setDiscount] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isLastSalesOpen, setIsLastSalesOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isItemDiscountModalOpen, setIsItemDiscountModalOpen] = useState(false);
  const [selectedDiscountIndex, setSelectedDiscountIndex] = useState<number | null>(null);
  const [itemDiscountInput, setItemDiscountInput] = useState('');
  const [customerName, setCustomerName] = useState('CONSUMIDOR PADRÃO');
  const [customerCpf, setCustomerCpf] = useState('');
  
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cashAmountReceived, setCashAmountReceived] = useState('');

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleFinishSale = () => {
    if (cart.length > 0 && !isProcessing) {
      setSelectedPaymentMethod('cash');
      setCashAmountReceived('');
      setIsPaymentModalOpen(true);
    }
  };

  const handleCancelSale = () => {
    if (cart.length > 0) {
      setCart([]);
      setDiscount(0);
      showToast('Venda cancelada', 'error');
    } else {
      showToast('Carrinho já está vazio');
    }
  };

  const handleRemoveLastItem = () => {
    if (cart.length > 0) {
      setCart(prev => prev.slice(0, -1));
      showToast('Último item removido');
    }
  };

  // Keyboard Shortcuts (F1-F12, DEL)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Prevent browser default for ALL function keys in PDV mode
      if (e.key.startsWith('F') && !isNaN(Number(e.key.substring(1)))) {
        e.preventDefault();
      }

      // If payment modal is open, we handle special keys (1, 2, 3, Enter, Escape)
      if (isPaymentModalOpen) {
        if (e.key === 'Escape') {
          setIsPaymentModalOpen(false);
          e.preventDefault();
          return;
        }

        if (document.activeElement?.tagName !== 'INPUT') {
          if (e.key === '1') {
            setSelectedPaymentMethod('cash');
            e.preventDefault();
            return;
          }
          if (e.key === '2') {
            setSelectedPaymentMethod('card');
            e.preventDefault();
            return;
          }
          if (e.key === '3') {
            setSelectedPaymentMethod('pix');
            e.preventDefault();
            return;
          }
        }

        if (e.key === 'Enter') {
          if (!isProcessing && selectedPaymentMethod) {
            handleCheckout(selectedPaymentMethod);
          }
          e.preventDefault();
          return;
        }
      }

      // F1 - Help
      if (e.key === 'F1') setIsHelpOpen(prev => !prev);

      // F2 - Status/Caixa
      if (e.key === 'F2') showToast('Caixa Operacional: PDV-001', 'success');

      // F3/F5/F12 - Search Focus
      if (['F3', 'F5', 'F12'].includes(e.key)) {
        searchInputRef.current?.focus();
      }

      // F4 - Last Sales
      if (e.key === 'F4') setIsLastSalesOpen(prev => !prev);

      // F6 - Identify Customer (Extra)
      if (e.key === 'F6') setIsCustomerModalOpen(prev => !prev);

      // F7 - Cancel Sale
      if (e.key === 'F7') handleCancelSale();

      // F8 - Finish Sale
      if (e.key === 'F8') handleFinishSale();

      // F9 - Item Discount
      if (e.key === 'F9') {
        if (cart.length > 0) {
          setSelectedDiscountIndex(cart.length - 1);
          setIsItemDiscountModalOpen(true);
        } else {
          showToast('Adicione um item primeiro');
        }
      }

      // ESC - Close Modals
      if (e.key === 'Escape') {
        setIsHelpOpen(false);
        setIsLastSalesOpen(false);
        setIsCustomerModalOpen(false);
        setIsItemDiscountModalOpen(false);
      }

      // DEL - Delete Item
      if (e.key === 'Delete') handleRemoveLastItem();

      // Barcode logic (Already active)
      const now = Date.now();
      const diff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      const isSearchFocused = document.activeElement === searchInputRef.current;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 2 && !isSearchFocused) {
          handleBarcode(barcodeBuffer.current);
          barcodeBuffer.current = '';
          e.preventDefault();
        } else {
          barcodeBuffer.current = '';
        }
      } else if (e.key.length === 1 && !['#', '$', '%'].includes(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (diff < 50) {
          barcodeBuffer.current += e.key;
        } else {
          barcodeBuffer.current = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [products, quantity, cart, isProcessing, isPaymentModalOpen, selectedPaymentMethod]);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBarcode = (code: string) => {
    const product = products.find(p => p.barcode === code);
    if (product) {
      addToCart(product);
    } else {
      showToast(`Produto não encontrado: ${code}`);
    }
  };

  const addToCart = (product: Product) => {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    if (product.stock < qty) {
      showToast('Estoque insuficiente');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { 
        productId: product.id, 
        name: product.name, 
        price: product.price, 
        quantity: qty
      }];
    });
    
    // Feedback and reset
    playScannerBeep();
    showToast(`${product.name} adicionado`, 'success');
    setQuantity(1);
    setSearchTerm('');
  };

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0), [cart]);
  const total = useMemo(() => subtotal * (1 - (discount / 100)), [subtotal, discount]);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.barcode.includes(searchTerm)
    ).slice(0, 3);
  }, [searchTerm, products]);

  const handleCheckout = async (method: PaymentMethod) => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      await createSale(cart, total, method);
      setCart([]);
      setDiscount(0);
      setIsPaymentModalOpen(false);
      showToast('Venda concluída com sucesso!', 'success');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } catch (error) {
      showToast('Falha crítica ao gravar venda');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const lastItem = cart[cart.length - 1];

  return (
    <div className="flex flex-col h-full font-sans select-none overflow-hidden">
      {/* Header - Status Bar (Moved to top as requested) */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 text-white h-14 flex items-center justify-between shadow-xl border-b-2 border-blue-400 shrink-0 z-30 px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <h1 className="text-xl font-black tracking-tighter uppercase italic text-white">
              GMAX <span className="text-blue-400">PDV</span>
            </h1>
          </div>
          <div className="h-6 w-[1px] bg-white/20" />
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest leading-none">Terminal PDV-01</span>
              <span className="text-[9px] text-white/60 font-bold uppercase mt-0.5">Operador: {user?.displayName || 'Admin'}</span>
            </div>
          </div>
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black italic tracking-[0.4em] text-blue-200 animate-pulse uppercase">
              {cart.length > 0 ? "Atendimento em Curso" : "Aguardando Venda"}
            </span>
            <span className="text-[8px] font-black text-blue-300/40 tracking-[0.2em] mt-0.5 uppercase">CUPOM FISCAL #9606</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
            <svg 
              className="w-4 h-4 text-emerald-400 fill-current" 
              viewBox="0 0 24 24" 
              aria-hidden="true"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.714 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="font-mono text-xs font-black tracking-tight text-emerald-400">
              (41) 98431-3557
            </span>
          </div>

          <div className="h-6 w-[1px] bg-white/20" />

          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">Caixa Aberto</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest">Servidor Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-header: Hotkeys */}
      <div className="bg-white border-b border-gray-100 p-2 shrink-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto grid grid-cols-5 md:grid-cols-10 gap-2">
          <Hotkey label="AJUDA" keyLabel="F1" color="blue" icon={<AlertCircle className="w-4 h-4" />} onClick={() => setIsHelpOpen(true)} />
          <Hotkey label="CAIXA" keyLabel="F2" color="indigo" icon={<HardDrive className="w-4 h-4" />} onClick={() => showToast('Terminal PDV-001 Ativo', 'success')} />
          <Hotkey label="BUSCA" keyLabel="F3" color="sky" icon={<SearchIcon className="w-4 h-4" />} onClick={() => searchInputRef.current?.focus()} />
          <Hotkey label="VENDAS" keyLabel="F4" color="purple" icon={<ShoppingBag className="w-4 h-4" />} onClick={() => setIsLastSalesOpen(true)} />
          <Hotkey label="PROD" keyLabel="F5" color="violet" icon={<Barcode className="w-4 h-4" />} onClick={() => searchInputRef.current?.focus()} />
          <Hotkey label="CLIENTE" keyLabel="F6" color="teal" icon={<UserIcon className="w-4 h-4" />} onClick={() => setIsCustomerModalOpen(true)} />
          <Hotkey label="CANCELAR" keyLabel="F7" color="red" icon={<XCircle className="w-4 h-4" />} onClick={handleCancelSale} />
          <Hotkey 
            label="FECHAR" 
            keyLabel="F8" 
            variant={cart.length > 0 ? 'active' : 'default'}
            color="green" 
            icon={<CheckCircle2 className="w-4 h-4" />} 
            onClick={handleFinishSale} 
          />
          <Hotkey 
            label="DESCONTO" 
            keyLabel="F9" 
            color="orange"
            icon={<Percent className="w-4 h-4" />} 
            onClick={() => {
              if (cart.length > 0) {
                setSelectedDiscountIndex(cart.length - 1);
                setIsItemDiscountModalOpen(true);
              } else {
                showToast('Carrinho vazio');
              }
            }} 
          />
          <Hotkey label="REMOVER" keyLabel="DEL" color="gray" icon={<Trash2 className="w-4 h-4" />} onClick={handleRemoveLastItem} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-4 lg:p-5">
        <div className="max-w-[1600px] mx-auto h-full flex flex-col gap-4">
          <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Column: Input and Details */}
        <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
          <div className="flex-1 bg-white p-6 rounded-3xl border border-blue-100 shadow-sm flex flex-col justify-between overflow-hidden">
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="relative">
                  <label className="text-[9px] font-black text-blue-600/50 uppercase tracking-[0.2em] block mb-1 px-1">
                    Scanner / Pesquisa [F12]
                  </label>
                  <div className="relative group">
                    <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-400 group-focus-within:text-blue-600 transition-colors" />
                    <input 
                      ref={searchInputRef}
                      type="text"
                      autoFocus
                      placeholder="Código de barras"
                      className="w-full pl-14 pr-4 py-4 bg-blue-50/30 rounded-2xl border-2 border-transparent focus:border-blue-600 focus:bg-white transition-all outline-none text-xl font-black"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const exactProduct = products.find(p => p.barcode === searchTerm);
                          if (exactProduct) {
                            addToCart(exactProduct);
                            e.preventDefault();
                            return;
                          }
                          if (filteredProducts.length === 1) {
                            addToCart(filteredProducts[0]);
                            e.preventDefault();
                          }
                        }
                      }}
                    />
                    
                    <AnimatePresence>
                      {searchTerm && filteredProducts.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-600 rounded-2xl shadow-3xl z-50 overflow-hidden"
                        >
                          {filteredProducts.map(p => (
                            <button
                              key={p.id}
                              onClick={() => addToCart(p)}
                              className="w-full p-4 flex items-center justify-between hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
                            >
                              <div className="text-left">
                                <p className="font-black text-xs uppercase text-gray-900">{p.name}</p>
                                <p className="text-[9px] text-gray-400 font-mono tracking-tighter">{p.barcode}</p>
                              </div>
                              <span className="font-black text-sm text-blue-600">R$ {p.price.toFixed(2)}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div className="mt-auto space-y-4 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Quantidade</label>
                    <input 
                      ref={qtyInputRef}
                      type="number" 
                      className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-600 focus:bg-white outline-none font-black text-xl text-center"
                      value={quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setQuantity('');
                        } else {
                          const parsed = parseInt(val, 10);
                          setQuantity(isNaN(parsed) ? '' : parsed);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-red-400 uppercase tracking-widest px-1">Desconto (%)</label>
                    <input 
                      type="number" 
                      className="w-full p-4 bg-red-50/30 rounded-2xl border-2 border-transparent focus:border-red-600 focus:bg-white outline-none font-black text-xl text-center text-red-600"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-dashed border-blue-50 mt-6">
                  <div className="p-4 bg-blue-50/50 rounded-2xl flex justify-between items-center group hover:bg-blue-600 transition-all cursor-default shadow-sm border border-blue-100/50">
                    <span className="text-[9px] font-black text-blue-600/60 uppercase group-hover:text-white/40 transition-colors">Unitário</span>
                    <span className="text-lg font-black text-blue-900 group-hover:text-white transition-colors">
                      {lastItem ? `R$ ${lastItem.price.toFixed(2)}` : 'R$ 0,00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: List and Totals */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-white rounded-3xl border border-blue-100 shadow-sm flex flex-col overflow-hidden">
            <div className="bg-blue-50/30 px-8 py-3 flex items-center justify-between border-b border-blue-50">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-500 rounded-lg">
                   <ShoppingBag className="w-4 h-4 text-white" />
                 </div>
                 <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-blue-900/60">ITENS</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-blue-600 bg-blue-100/50 border border-blue-200 px-3 py-1 rounded-full uppercase tracking-widest">{cart.length} PRODUTOS</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10 font-black text-[9px] text-blue-950 uppercase tracking-widest">
                  <tr>
                    <th className="py-5 px-8 border-b border-blue-50">#</th>
                    <th className="py-5 px-4 border-b border-blue-50">Item</th>
                    <th className="py-5 px-4 border-b border-blue-50 text-center">Quant</th>
                    <th className="py-5 px-4 border-b border-blue-50 text-right">Unit</th>
                    <th className="py-5 px-8 border-b border-blue-50 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="font-bold text-sm">
                  {cart.map((item, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx} 
                      className="odd:bg-blue-50/5 group hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="py-4 px-8 text-[10px] text-blue-300 font-mono">{(idx + 1).toString().padStart(3, '0')}</td>
                      <td className="py-4 px-4 text-gray-900 uppercase text-xs">{item.name}</td>
                      <td className="py-4 px-4 text-center text-xs">{item.quantity}</td>
                      <td className="py-4 px-4 text-right text-xs">R$ {item.price.toFixed(2)}</td>
                      <td className="py-4 px-8 text-right font-black text-gray-950">R$ {(item.price * item.quantity).toFixed(2)}</td>
                    </motion.tr>
                  ))}
                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-32 text-center">
                         <div className="flex flex-col items-center gap-6 opacity-10">
                            <Barcode className="w-32 h-32 text-blue-900" />
                            <p className="text-xl uppercase tracking-[0.8em] font-black italic text-blue-900">Caixa Pronto</p>
                         </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-blue-950 text-white flex items-center justify-between shadow-2xl relative overflow-hidden border-t-4 border-blue-500 shrink-0">
               <div className="absolute inset-x-0 bottom-0 top-0 bg-blue-400 opacity-5 pointer-events-none" />
               <div className="flex flex-col gap-1 relative z-10">
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] font-black opacity-40 uppercase tracking-[0.2em] text-blue-200">S-total: R$ {subtotal.toFixed(2)}</span>
                    <div className="h-2.5 w-[1px] bg-white/10" />
                    <span className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em]">Desconto: {discount}%</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">VALOR FINAL A RECEBER</span>
                  </div>
               </div>
               <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-lg font-bold opacity-30 tracking-tight text-blue-200">R$</span>
                  <span className="text-5xl font-black tracking-tighter text-white">
                    {total.toFixed(2).split('.')[0]}
                    <span className="text-2xl opacity-40">,{total.toFixed(2).split('.')[1]}</span>
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>


      {/* Bottom Information */}
      <div className="bg-white border-t border-gray-100 px-4 py-1 flex items-center justify-between text-[9px] font-black text-gray-700 uppercase tracking-[0.2em] shrink-0">
         <div className="flex gap-10">
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-gray-600" /> {currentTime.toLocaleDateString('pt-BR')}</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-gray-600" /> Conexão Segura</span>
         </div>
         <div className="flex items-center gap-6">
            <span className="text-green-500/80">Sincronizado com Nuvem GMAX</span>
            <span className="text-gray-700">{currentTime.toLocaleTimeString('pt-BR')}</span>
         </div>
      </div>

      {/* Modern Toast Overlay */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-10 py-5 rounded-3xl shadow-3xl flex items-center gap-6 font-black border-4 ${
              toast.type === 'error' 
                ? 'bg-red-600 text-white border-white' 
                : 'bg-green-600 text-white border-white'
            }`}
          >
            {toast.type === 'error' ? <XCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
            <span className="text-xl italic uppercase tracking-tighter">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {isProcessing && (
        <div className="fixed inset-0 bg-blue-950/95 backdrop-blur-xl z-[200] flex flex-col items-center justify-center text-white gap-8">
           <div className="relative">
             <Zap className="w-24 h-24 text-blue-500 animate-pulse fill-blue-500" />
             <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse" />
           </div>
           <p className="text-3xl font-black italic tracking-[0.5em] animate-pulse">GRAVANDO VENDA...</p>
        </div>
      )}

      {/* Modals & Overlays */}
      <AnimatePresence>
        {isHelpOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-blue-950/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
            onClick={() => setIsHelpOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-t-8 border-blue-600"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-black italic mb-6 text-blue-900 flex items-center gap-2">
                <AlertCircle className="text-blue-600" /> GUIA DE OPERAÇÃO
              </h2>
              <div className="space-y-3 font-bold text-xs uppercase tracking-widest text-blue-900/40">
                <div className="flex justify-between border-b border-blue-50 pb-2"><span>F12 / F3</span> <span className="text-blue-900">Pesquisar Produto</span></div>
                <div className="flex justify-between border-b border-blue-50 pb-2"><span>F8</span> <span className="text-blue-900">Finalizar Venda</span></div>
                <div className="flex justify-between border-b border-blue-50 pb-2"><span>F7</span> <span className="text-blue-900">Cancelar Tudo</span></div>
                <div className="flex justify-between border-b border-blue-50 pb-2"><span>DEL</span> <span className="text-blue-900">Remover Último Item</span></div>
                <div className="flex justify-between border-b border-blue-50 pb-2"><span>F4</span> <span className="text-blue-900">Consultar Vendas</span></div>
                <div className="flex justify-between border-b border-blue-50 pb-2"><span>ESC</span> <span className="text-blue-900">Fechar Menus</span></div>
              </div>
              <button 
                onClick={() => setIsHelpOpen(false)}
                className="mt-8 w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
              >
                Entendido (ESC)
              </button>
            </motion.div>
          </motion.div>
        )}

        {isLastSalesOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-blue-950/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
            onClick={() => setIsLastSalesOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border-t-8 border-blue-500"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic text-blue-900 uppercase">ÚLTIMAS VENDAS</h2>
                <button onClick={() => setIsLastSalesOpen(false)}><XCircle className="w-8 h-8 text-blue-100" /></button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2">
                 <p className="text-center py-20 text-blue-200 font-black uppercase text-xs tracking-[0.4em]">Sincronizando com GMAX Cloud...</p>
                 <div className="space-y-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="p-4 bg-blue-50/50 rounded-2xl flex justify-between items-center opacity-40">
                         <div>
                            <p className="font-black text-xs text-blue-900">VENDA #000{i}</p>
                            <p className="text-[10px] text-blue-400 font-black">Há {i*5} min atrás</p>
                         </div>
                         <p className="font-black text-blue-900">R$ 0,00</p>
                      </div>
                    ))}
                 </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isCustomerModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-blue-950/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
            onClick={() => setIsCustomerModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-t-8 border-blue-600"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-black italic mb-6 text-blue-900 flex items-center gap-2">
                <UserIcon className="text-blue-600" /> IDENTIFICAR CLIENTE
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Nome do Cliente</label>
                  <input 
                    type="text" 
                    placeholder="CONSUMIDOR PADRÃO"
                    className="w-full p-4 bg-blue-50/30 rounded-2xl border-2 border-transparent focus:border-blue-600 focus:bg-white outline-none font-black text-lg uppercase"
                    value={customerName === 'CONSUMIDOR PADRÃO' ? '' : customerName}
                    onChange={(e) => setCustomerName(e.target.value.toUpperCase() || 'CONSUMIDOR PADRÃO')}
                    autoFocus
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-blue-300 uppercase tracking-widest">CPF / CNPJ</label>
                  <input 
                    type="text" 
                    placeholder="000.000.000-00"
                    className="w-full p-4 bg-blue-50/30 rounded-2xl border-2 border-transparent focus:border-blue-600 focus:bg-white outline-none font-black text-lg font-mono"
                    value={customerCpf}
                    onChange={(e) => setCustomerCpf(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button 
                  onClick={() => {
                    setCustomerName('CONSUMIDOR PADRÃO');
                    setCustomerCpf('');
                    setIsCustomerModalOpen(false);
                  }}
                  className="py-4 bg-blue-50 text-blue-300 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 transition-all"
                >
                  Limpar
                </button>
                <button 
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isItemDiscountModalOpen && selectedDiscountIndex !== null && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#141414]/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
            onClick={() => setIsItemDiscountModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-t-8 border-red-500"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-black italic mb-2 text-[#141414] flex items-center gap-2">
                <Percent className="text-red-600" /> DESCONTO NO ITEM
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                Aplicando em: {cart[selectedDiscountIndex]?.name}
              </p>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor do Desconto (R$)</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full p-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-red-500 focus:bg-white outline-none font-black text-3xl text-center"
                    value={itemDiscountInput}
                    onChange={(e) => setItemDiscountInput(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = parseFloat(itemDiscountInput);
                        if (!isNaN(val)) {
                          setCart(prev => prev.map((item, i) => 
                            i === selectedDiscountIndex 
                              ? { ...item, price: Math.max(0, item.price - (val / item.quantity)) } 
                              : item
                          ));
                          setIsItemDiscountModalOpen(false);
                          setItemDiscountInput('');
                          showToast('Desconto aplicado!', 'success');
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-8">
                <button 
                  onClick={() => setIsItemDiscountModalOpen(false)}
                  className="py-4 bg-blue-50 text-blue-400 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-100 transition-all font-black"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    const val = parseFloat(itemDiscountInput);
                    if (!isNaN(val)) {
                      setCart(prev => prev.map((item, i) => 
                        i === selectedDiscountIndex 
                          ? { ...item, price: Math.max(0, item.price - (val / item.quantity)) } 
                          : item
                      ));
                      setIsItemDiscountModalOpen(false);
                      setItemDiscountInput('');
                      showToast('Desconto aplicado!', 'success');
                    }
                  }}
                  className="py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20"
                >
                  Aplicar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isPaymentModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-blue-950/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4"
            onClick={() => setIsPaymentModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-2xl w-full shadow-2xl border-t-8 border-blue-600 flex flex-col gap-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-2 border-b border-blue-50">
                <div>
                  <h2 className="text-2xl font-black italic text-blue-900 tracking-tight">FORMA DE PAGAMENTO</h2>
                  <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mt-1">
                    Cliente: {customerName} {customerCpf ? `(${customerCpf})` : ''}
                  </p>
                </div>
                <button 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-2 hover:bg-blue-50 text-blue-300 rounded-full transition-colors"
                >
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              {/* Show Total Amount Prominently */}
              <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100/50 flex items-center justify-between">
                <span className="text-xs font-black text-blue-900/40 uppercase tracking-[0.2em]">Total da Venda</span>
                <span className="text-4xl font-black text-blue-900 tracking-tight">
                  R$ {total.toFixed(2)}
                </span>
              </div>

              {/* Three selection options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* cash - Dinheiro */}
                <button
                  type="button"
                  onClick={() => setSelectedPaymentMethod('cash')}
                  className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all duration-200 relative ${
                    selectedPaymentMethod === 'cash'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-500/15'
                      : 'bg-white border-blue-100 hover:border-blue-300 hover:bg-blue-50/20 text-blue-900/60'
                  }`}
                >
                  <div className={`p-4 rounded-xl ${selectedPaymentMethod === 'cash' ? 'bg-emerald-500 text-white' : 'bg-blue-50 text-blue-500'}`}>
                    <Banknote className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-sm uppercase">Dinheiro</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5 opacity-60">Atalho [1]</p>
                  </div>
                </button>

                {/* card - Cartão */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod('card');
                    setCashAmountReceived('');
                  }}
                  className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all duration-200 relative ${
                    selectedPaymentMethod === 'card'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-lg shadow-blue-500/15'
                      : 'bg-white border-blue-100 hover:border-blue-300 hover:bg-blue-50/20 text-blue-900/60'
                  }`}
                >
                  <div className={`p-4 rounded-xl ${selectedPaymentMethod === 'card' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'}`}>
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-sm uppercase">Cartão</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5 opacity-60">Atalho [2]</p>
                  </div>
                </button>

                {/* pix - Pix */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaymentMethod('pix');
                    setCashAmountReceived('');
                  }}
                  className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all duration-200 relative ${
                    selectedPaymentMethod === 'pix'
                      ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-lg shadow-teal-500/15'
                      : 'bg-white border-blue-100 hover:border-blue-300 hover:bg-blue-50/20 text-blue-900/60'
                  }`}
                >
                  <div className={`p-4 rounded-xl ${selectedPaymentMethod === 'pix' ? 'bg-teal-500 text-white' : 'bg-blue-50 text-blue-500'}`}>
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div className="text-center">
                    <p className="font-black text-sm uppercase">Pix</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest mt-0.5 opacity-60">Atalho [3]</p>
                  </div>
                </button>
              </div>

              {/* Dynamic Helper/Interactive area based on selected method */}
              <div className="bg-blue-50/30 rounded-2xl p-6 border border-blue-100/50 min-h-[140px] flex flex-col justify-center">
                {selectedPaymentMethod === 'cash' && (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                      <div className="w-full space-y-1.5">
                        <label className="text-[10px] font-black text-blue-900/50 uppercase tracking-widest">Valor Recebido (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          className="w-full p-4 bg-white rounded-xl border-2 border-blue-100 focus:border-emerald-500 outline-none font-black text-xl text-center text-emerald-600 shadow-sm"
                          value={cashAmountReceived}
                          onChange={(e) => setCashAmountReceived(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (!isProcessing) {
                                handleCheckout('cash');
                              }
                            }
                          }}
                        />
                      </div>
                      
                      {(() => {
                        const paid = parseFloat(cashAmountReceived);
                        const change = paid - total;
                        return (
                          <div className="w-full text-center md:text-right flex flex-col items-center md:items-end justify-center">
                            <span className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">Troco a Devolver</span>
                            <span className={`text-3xl font-black mt-1 ${change >= 0 ? 'text-emerald-600' : 'text-blue-900/30'}`}>
                              R$ {change >= 0 ? change.toFixed(2) : '0,00'}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                    <p className="text-[9px] text-center text-blue-900/30 font-black uppercase tracking-widest">
                      Tecle <span className="text-emerald-600 font-extrabold">ENTER</span> para concluir a venda em Espécie
                    </p>
                  </div>
                )}

                {selectedPaymentMethod === 'card' && (
                  <div className="text-center space-y-3 py-2">
                    <div className="flex justify-center">
                      <CreditCard className="w-12 h-12 text-blue-500 animate-pulse" />
                    </div>
                    <p className="text-xs font-black text-blue-900 uppercase tracking-wider">
                      Insira ou aproxime o cartão na maquininha GMAX
                    </p>
                    <p className="text-[9px] text-blue-900/40 font-black uppercase tracking-widest animate-pulse">
                      Aguardando aprovação... Tecle <span className="text-blue-600 font-extrabold">ENTER</span> para simular transação
                    </p>
                  </div>
                )}

                {selectedPaymentMethod === 'pix' && (
                  <div className="flex flex-col md:flex-row items-center gap-6 py-2">
                    <div className="bg-white p-3 rounded-xl border border-teal-100 shadow-sm flex-shrink-0">
                      <div className="w-20 h-20 bg-teal-50 flex items-center justify-center rounded">
                        <QrCode className="w-16 h-16 text-teal-600 animate-pulse" />
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                      <p className="text-xs font-black text-teal-700 uppercase tracking-wider">
                        QR Code Pix gerado automaticamente
                      </p>
                      <p className="text-[10px] font-black text-blue-900/50 leading-relaxed uppercase">
                        Apresente o QR Code ao cliente para digitalização espontânea.
                      </p>
                      <p className="text-[9px] text-blue-900/40 font-black uppercase tracking-widest animate-pulse">
                        Sincronizando Pix... Tecle <span className="text-teal-600 font-extrabold">ENTER</span> para simular recebimento
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm / Cancel Buttons */}
              <div className="grid grid-cols-2 gap-4 mt-2">
                <button 
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="py-4 bg-blue-50 text-blue-400 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-100 transition-all font-black text-xs"
                >
                  Cancelar [ESC]
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (selectedPaymentMethod && !isProcessing) {
                      handleCheckout(selectedPaymentMethod);
                    }
                  }}
                  className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 text-xs"
                >
                  Confirmar [ENTER]
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Hotkey({ label, keyLabel, icon, variant = 'default', color = 'gray', onClick }: any) {
  const colorMap: Record<string, string> = {
    blue: 'hover:border-blue-500 hover:text-blue-500 text-blue-600/70',
    indigo: 'hover:border-indigo-500 hover:text-indigo-500 text-indigo-600/70',
    sky: 'hover:border-sky-500 hover:text-sky-500 text-sky-600/70',
    purple: 'hover:border-purple-500 hover:text-purple-500 text-purple-600/70',
    violet: 'hover:border-violet-500 hover:text-violet-500 text-violet-600/70',
    teal: 'hover:border-teal-500 hover:text-teal-500 text-teal-600/70',
    red: 'hover:border-red-500 hover:text-red-500 text-red-600/70',
    green: 'hover:border-green-500 hover:text-green-500 text-green-600/70',
    orange: 'hover:border-orange-500 hover:text-orange-500 text-orange-600/70',
    gray: 'hover:border-blue-900 hover:text-blue-900 text-blue-200',
  };

  const activeColorMap: Record<string, string> = {
    green: 'bg-green-600 border-green-600 text-white shadow-green-500/20',
    blue: 'bg-blue-600 border-blue-600 text-white shadow-blue-500/20',
    red: 'bg-red-600 border-red-600 text-white shadow-red-500/20',
    indigo: 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/20',
    sky: 'bg-sky-500 border-sky-500 text-white shadow-sky-500/20',
    purple: 'bg-purple-600 border-purple-600 text-white shadow-purple-500/20',
    violet: 'bg-violet-600 border-violet-600 text-white shadow-violet-500/20',
    teal: 'bg-teal-600 border-teal-600 text-white shadow-teal-500/20',
    orange: 'bg-orange-500 border-orange-500 text-white shadow-orange-500/20',
    gray: 'bg-gray-600 border-gray-600 text-white shadow-gray-500/20',
    default: 'bg-blue-600 border-blue-600 text-white shadow-blue-600/20'
  };

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition-all active:scale-95 text-center ${
        variant === 'active' 
          ? activeColorMap[color] || activeColorMap.default
          : `bg-blue-50/50 border-blue-100/50 ${colorMap[color]}`
      }`}
    >
      <div className="flex flex-col items-center">
         <span className={`text-[13px] font-black tracking-tight ${variant === 'active' ? 'text-white' : 'text-blue-950'}`}>{keyLabel}</span>
         <span className={`text-[10px] font-black uppercase leading-tight mt-1 tracking-wider ${variant === 'active' ? 'text-white/80' : 'text-blue-900/70'}`}>{label}</span>
      </div>
      <div className={`mt-1 ${variant === 'active' ? 'opacity-100' : 'opacity-80'}`}>
        {icon}
      </div>
    </button>
  );
}

function SearchIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
}

function MoreHorizontalIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>;
}
