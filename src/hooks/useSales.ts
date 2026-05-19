import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  Timestamp,
  increment,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sale, SaleItem, PaymentMethod } from '../types';

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Sale[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Sale);
      });
      setSales(items);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const createSale = async (items: SaleItem[], total: number, paymentMethod: PaymentMethod) => {
    const batch = writeBatch(db);
    
    // Create Sale record
    const saleRef = doc(collection(db, 'sales'));
    batch.set(saleRef, {
      items,
      total,
      paymentMethod,
      timestamp: Timestamp.now()
    });

    // Update stock levels
    items.forEach((item) => {
      const productRef = doc(db, 'products', item.productId);
      batch.update(productRef, {
        stock: increment(-item.quantity)
      });
    });

    await batch.commit();
  };

  const voidSale = async (sale: Sale) => {
    const batch = writeBatch(db);

    // Delete sale
    batch.delete(doc(db, 'sales', sale.id));

    // Restore stock
    sale.items.forEach((item) => {
      const productRef = doc(db, 'products', item.productId);
      batch.update(productRef, {
        stock: increment(item.quantity)
      });
    });

    await batch.commit();
  };

  return { sales, loading, createSale, voidSale };
}
