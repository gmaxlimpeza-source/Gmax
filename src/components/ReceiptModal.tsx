import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, XCircle, Copy, Send, Check, Share2, Phone } from 'lucide-react';
import { Sale } from '../types';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export function ReceiptModal({ sale, onClose }: ReceiptModalProps) {
  const [copied, setCopied] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sentToWhatsapp, setSentToWhatsapp] = useState(false);

  if (!sale) return null;

  const saleDate = sale.timestamp 
    ? (typeof sale.timestamp.toDate === 'function' 
        ? sale.timestamp.toDate() 
        : (sale.timestamp.seconds 
            ? new Date(sale.timestamp.seconds * 1000) 
            : new Date(sale.timestamp as any)))
    : new Date();

  const formattedDate = saleDate.toLocaleString('pt-BR');

  // Format payment method name
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Dinheiro';
      case 'card': return 'Cartão';
      case 'pix': return 'Pix';
      case 'on_account': return 'A Prazo / Aberto';
      case 'multiple': return 'Misto (Múltiplo)';
      default: return method;
    }
  };

  // Generate plain text receipt for WhatsApp or clipboard
  const generatePlainTextReceipt = () => {
    let text = `*GMAX DISTRIBUIDORA - COMPROVANTE*\n`;
    text += `====================================\n`;
    text += `*Pedido:* #${sale.id ? sale.id.substring(0, 8).toUpperCase() : 'N/A'}\n`;
    text += `*Data:* ${formattedDate}\n`;
    text += `*Cliente:* ${sale.customerName || 'CONSUMIDOR PADRÃO'}\n`;
    if (sale.customerCpf) {
      text += `*CPF:* ${sale.customerCpf}\n`;
    }
    text += `====================================\n`;
    text += `*ITENS:*\n`;
    
    sale.items.forEach((item, index) => {
      const itemTotal = item.price * item.quantity;
      text += `${(index + 1).toString().padStart(2, '0')}. ${item.quantity}x ${item.name.toUpperCase()}\n`;
      text += `    Un: R$ ${item.price.toFixed(2)} | Total: R$ ${itemTotal.toFixed(2)}\n`;
    });
    
    text += `====================================\n`;
    text += `*Valor Total:* R$ ${sale.total.toFixed(2)}\n`;
    
    if (sale.paymentMethod === 'multiple' && sale.payments) {
      text += `*Formas de Pagamento (Misto):*\n`;
      sale.payments.forEach(p => {
        text += `  - ${getPaymentMethodLabel(p.method)}: R$ ${p.amount.toFixed(2)}\n`;
      });
    } else {
      text += `*Forma de Pagamento:* ${getPaymentMethodLabel(sale.paymentMethod)}\n`;
    }

    if (sale.paymentMethod === 'on_account' || (sale.paymentMethod === 'multiple' && (sale.onAccountOutstandingAmount ?? 0) > 0)) {
      const outstanding = sale.onAccountOutstandingAmount ?? sale.total;
      const dueDate = sale.onAccountDueDate 
        ? (typeof sale.onAccountDueDate.toDate === 'function' 
            ? sale.onAccountDueDate.toDate() 
            : new Date(sale.onAccountDueDate as any))
        : null;
      text += `*A Prazo em Aberto:* R$ ${outstanding.toFixed(2)}\n`;
      if (dueDate) {
        text += `*Vencimento do Débito:* ${dueDate.toLocaleDateString('pt-BR')}\n`;
      }
    }

    text += `====================================\n`;
    text += `*OBRIGADO PELA PREFERÊNCIA!*\n`;
    text += `_Gmax PDV - Comprovante Não Fiscal_`;
    return text;
  };

  const handleCopyText = async () => {
    try {
      const text = generatePlainTextReceipt();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSendWhatsapp = () => {
    const text = encodeURIComponent(generatePlainTextReceipt());
    // Format phone number to clean digits (remove spaces, dashes, etc.)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // If no phone number provided, use general API link, otherwise target the number
    const whatsappUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    
    window.open(whatsappUrl, '_blank');
    setSentToWhatsapp(true);
    setTimeout(() => setSentToWhatsapp(false), 3000);
  };

  const handlePrint = () => {
    // Create an elegant print-only layout in a new window to ensure clean formatting
    const printWindow = window.open('', '_blank', 'width=600,height=800');
    if (!printWindow) return;

    const itemsHtml = sale.items.map((item, idx) => `
      <tr>
        <td style="padding: 4px 0; vertical-align: top;">
          ${(idx + 1).toString().padStart(2, '0')}. ${item.name.toUpperCase()}<br/>
          <small>${item.quantity}x R$ ${item.price.toFixed(2)}</small>
        </td>
        <td style="text-align: right; vertical-align: bottom; padding: 4px 0; font-weight: bold;">
          R$ ${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `).join('');

    let paymentDetailsHtml = '';
    if (sale.paymentMethod === 'multiple' && sale.payments) {
      paymentDetailsHtml = `
        <div style="border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px;">
          <strong>Detalhamento do Pagamento Misto:</strong><br/>
          ${sale.payments.map(p => `
            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 2px;">
              <span>${getPaymentMethodLabel(p.method)}:</span>
              <span>R$ ${p.amount.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      paymentDetailsHtml = `
        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
          <span>Forma de Pagamento:</span>
          <strong>${getPaymentMethodLabel(sale.paymentMethod).toUpperCase()}</strong>
        </div>
      `;
    }

    let onAccountHtml = '';
    if (sale.paymentMethod === 'on_account' || (sale.paymentMethod === 'multiple' && (sale.onAccountOutstandingAmount ?? 0) > 0)) {
      const outstanding = sale.onAccountOutstandingAmount ?? sale.total;
      const dueDate = sale.onAccountDueDate 
        ? (typeof sale.onAccountDueDate.toDate === 'function' 
            ? sale.onAccountDueDate.toDate().toLocaleDateString('pt-BR') 
            : new Date(sale.onAccountDueDate as any).toLocaleDateString('pt-BR'))
        : 'N/A';
      onAccountHtml = `
        <div style="border-top: 1px dashed #000; padding-top: 6px; margin-top: 6px; font-size: 11px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Valor Financiado (A Prazo):</span>
            <strong>R$ ${outstanding.toFixed(2)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 2px;">
            <span>Vencimento do Débito:</span>
            <strong>${dueDate}</strong>
          </div>
        </div>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Comprovante de Venda #${sale.id ? sale.id.substring(0, 8).toUpperCase() : 'N/A'}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.3; color: #000; background: #fff; }
              @page { margin: 0; }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              max-width: 80mm;
              margin: 0 auto;
              padding: 15px;
              box-sizing: border-box;
              font-size: 12px;
              color: #000;
              background: #fff;
            }
            .text-center { text-align: center; }
            .header { margin-bottom: 12px; }
            .logo { font-size: 18px; font-weight: bold; letter-spacing: -0.5px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
            .totals { margin: 8px 0; font-size: 12px; }
            .totals-row { display: flex; justify-content: space-between; padding: 2px 0; }
            .total-final { font-size: 15px; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin-top: 4px; }
            .footer { margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="text-center header">
            <div class="logo">GMAX DISTRIBUIDORA</div>
            <div style="font-size: 10px; margin-top: 2px;">PRODUTOS DE LIMPEZA E DESCARTÁVEIS</div>
            <div style="font-size: 10px;">CNPJ: 00.000.000/0001-00</div>
            <div style="font-size: 10px;">TEL: (41) 98431-3557</div>
          </div>
          
          <div class="divider"></div>
          
          <div>
            <strong>COMPROVANTE DE VENDA</strong><br/>
            PEDIDO: #${sale.id ? sale.id.toUpperCase() : 'N/A'}<br/>
            DATA: ${formattedDate}<br/>
            CLIENTE: ${sale.customerName || 'CONSUMIDOR PADRÃO'}<br/>
            ${sale.customerCpf ? `CPF/CNPJ: ${sale.customerCpf}<br/>` : ''}
          </div>
          
          <div class="divider"></div>
          
          <table class="items-table">
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left; padding-bottom: 4px;">ITEM</th>
                <th style="text-align: right; padding-bottom: 4px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <div class="totals">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>R$ ${sale.total.toFixed(2)}</span>
            </div>
            <div class="totals-row total-final">
              <span>VALOR TOTAL:</span>
              <span>R$ ${sale.total.toFixed(2)}</span>
            </div>
            
            ${paymentDetailsHtml}
            ${onAccountHtml}
          </div>
          
          <div class="divider"></div>
          
          <div class="text-center footer">
            <strong>OBRIGADO PELA PREFERÊNCIA!</strong><br/>
            Este documento não é um documento fiscal.<br/>
            GMAX PDV • Tecnologia Comercial
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-blue-950/80 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-slate-100 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Left / Top Side: Receipt Preview Mock */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="text-left mb-2">
              <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest block">Pré-visualização</span>
              <span className="text-[9px] text-gray-550 font-bold uppercase block">Cupom de Venda Simples</span>
            </div>
            
            {/* Skeuomorphic Paper Receipt Container */}
            <div className="flex-1 bg-white border border-slate-300 rounded-xl p-5 shadow-inner overflow-y-auto font-mono text-xs text-gray-900 leading-relaxed max-h-[50vh] md:max-h-none custom-scrollbar relative">
              {/* Receipt Content */}
              <div className="text-center space-y-1 mb-4">
                <p className="font-bold text-sm tracking-tight">GMAX DISTRIBUIDORA</p>
                <p className="text-[10px] text-gray-650 uppercase">Produtos de Limpeza & Descartáveis</p>
                <p className="text-[9px] text-gray-500">CNPJ: 00.000.000/0001-00</p>
                <p className="text-[9px] text-gray-500">Tel: (41) 98431-3557</p>
                <div className="border-t border-dashed border-gray-300 my-2" />
              </div>

              <div className="space-y-1 mb-3 text-[11px]">
                <p><span className="font-bold">CUPOM NÃO FISCAL</span></p>
                <p><span className="font-bold">PEDIDO:</span> #{sale.id ? sale.id.substring(0, 8).toUpperCase() : 'N/A'}</p>
                <p><span className="font-bold">DATA:</span> {formattedDate}</p>
                <p><span className="font-bold">CLIENTE:</span> {sale.customerName || 'CONSUMIDOR PADRÃO'}</p>
                {sale.customerCpf && <p><span className="font-bold">CPF/CNPJ:</span> {sale.customerCpf}</p>}
                <div className="border-t border-dashed border-gray-300 my-2" />
              </div>

              {/* Items List */}
              <div className="space-y-2 mb-3 text-[11px]">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-bold uppercase">{idx + 1}. {item.name}</p>
                      <p className="text-[10px] text-gray-500 font-medium">{item.quantity}x R$ {item.price.toFixed(2)}</p>
                    </div>
                    <span className="font-bold shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-dashed border-gray-300 my-2" />
              </div>

              {/* Totals */}
              <div className="space-y-1 mb-4 text-[11px]">
                <div className="flex justify-between font-bold text-sm border-b border-dashed border-gray-300 pb-1 mb-1">
                  <span>TOTAL COMPRA:</span>
                  <span>R$ {sale.total.toFixed(2)}</span>
                </div>
                
                {sale.paymentMethod === 'multiple' && sale.payments ? (
                  <div className="text-[10px] space-y-0.5 bg-gray-50 p-2 rounded-lg border border-gray-150 mt-2">
                    <p className="font-bold text-gray-600 uppercase tracking-widest text-[8px] mb-1">Detalhamento Misto:</p>
                    {sale.payments.map((p, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{getPaymentMethodLabel(p.method)}:</span>
                        <span className="font-bold">R$ {p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>FORMA DE PAGTO:</span>
                    <span className="font-bold uppercase">{getPaymentMethodLabel(sale.paymentMethod)}</span>
                  </div>
                )}

                {(sale.paymentMethod === 'on_account' || (sale.paymentMethod === 'multiple' && (sale.onAccountOutstandingAmount ?? 0) > 0)) && (
                  <div className="text-[10px] space-y-0.5 bg-amber-50/50 p-2 rounded-lg border border-amber-100 mt-2 text-amber-900">
                    <div className="flex justify-between">
                      <span>VALOR EM ABERTO:</span>
                      <span className="font-bold">R$ {(sale.onAccountOutstandingAmount ?? sale.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VENCIMENTO:</span>
                      <span className="font-bold">
                        {sale.onAccountDueDate 
                          ? (typeof sale.onAccountDueDate.toDate === 'function' 
                              ? sale.onAccountDueDate.toDate().toLocaleDateString('pt-BR') 
                              : new Date(sale.onAccountDueDate as any).toLocaleDateString('pt-BR'))
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center space-y-1 mt-6 text-[10px] text-gray-500">
                <div className="border-t border-dashed border-gray-300 my-2" />
                <p className="font-bold uppercase tracking-wider">Obrigado pela preferência!</p>
                <p>GMAX PDV • Tecnologia Comercial</p>
              </div>
            </div>
          </div>

          {/* Right / Bottom Side: Interactive Share Panel */}
          <div className="w-full md:w-56 shrink-0 flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Ações</span>
                <button 
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Primary Print Button */}
              <button
                onClick={handlePrint}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/15 transition-all"
              >
                <Printer className="w-4 h-4" />
                Imprimir Cupom
              </button>

              {/* Copy Plain Text Button */}
              <button
                onClick={handleCopyText}
                className={`w-full py-3 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 border-2 transition-all ${
                  copied 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiar Texto
                  </>
                )}
              </button>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">Enviar ao Celular</span>
                
                {/* Whatsapp phone number input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    placeholder="DDD + Celular do Cliente"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl outline-none font-bold text-xs"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                <button
                  onClick={handleSendWhatsapp}
                  className={`w-full py-2.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border-2 transition-all ${
                    sentToWhatsapp
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {sentToWhatsapp ? 'Enviado!' : 'Enviar p/ WhatsApp'}
                </button>
                <p className="text-[8px] text-gray-500 text-center font-bold uppercase tracking-wider leading-relaxed">
                  Insira o número (ex: 41984313557) ou clique em Enviar para compartilhar no próprio aplicativo do celular.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 active:scale-[0.98] text-slate-800 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
            >
              Fechar Guia
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
