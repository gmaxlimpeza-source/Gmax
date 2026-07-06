import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  minStock: number;
  category: string;
  createdAt: Timestamp;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export type PaymentMethod = 'cash' | 'card' | 'pix' | 'on_account';

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: PaymentMethod | 'multiple';
  payments?: SalePayment[];
  timestamp: Timestamp;
  isVoided?: boolean;
  voidedAt?: Timestamp;
  customerName?: string;
  customerCpf?: string;
  onAccountPaidAmount?: number;
  onAccountOutstandingAmount?: number;
  onAccountDueDate?: Timestamp;
  onAccountStatus?: 'pending' | 'paid';
  settledAt?: Timestamp;
}
