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
  limit,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Sale, SaleItem, PaymentMethod, SalePayment } from '../types';

export function useSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(100));
        unsubscribeSnapshot = onSnapshot(
          q, 
          (snapshot) => {
            const items: Sale[] = [];
            snapshot.forEach((doc) => {
              items.push({ id: doc.id, ...doc.data() } as Sale);
            });
            setSales(items);
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'sales');
            setLoading(false);
          }
        );
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        setSales([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const createSale = async (
    items: SaleItem[], 
    total: number, 
    paymentMethod: PaymentMethod | 'multiple',
    extraData?: {
      customerName?: string;
      customerCpf?: string;
      onAccountPaidAmount?: number;
      onAccountOutstandingAmount?: number;
      onAccountDueDate?: Timestamp;
      onAccountStatus?: 'pending' | 'paid';
      payments?: SalePayment[];
    }
  ): Promise<string | undefined> => {
    try {
      const batch = writeBatch(db);
      
      // Create Sale record
      const saleRef = doc(collection(db, 'sales'));
      
      const saleData: Record<string, any> = {
        items,
        total,
        paymentMethod,
        timestamp: Timestamp.now()
      };

      if (extraData) {
        Object.entries(extraData).forEach(([key, val]) => {
          if (val !== undefined) {
            saleData[key] = val;
          }
        });
      }

      batch.set(saleRef, saleData);

      // Update stock levels
      items.forEach((item) => {
        const productRef = doc(db, 'products', item.productId);
        batch.update(productRef, {
          stock: increment(-item.quantity)
        });
      });

      await batch.commit();
      return saleRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sales');
    }
  };

  const settleSale = async (saleId: string) => {
    try {
      const batch = writeBatch(db);
      const saleRef = doc(db, 'sales', saleId);
      batch.update(saleRef, {
        onAccountStatus: 'paid',
        settledAt: serverTimestamp()
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${saleId}`);
    }
  };

  const voidSale = async (sale: Sale) => {
    try {
      const batch = writeBatch(db);

      // Update sale status to voided instead of deleting it
      const saleRef = doc(db, 'sales', sale.id);
      batch.update(saleRef, {
        isVoided: true,
        voidedAt: serverTimestamp()
      });

      // Restore stock for existing products in the sale items
      if (sale.items) {
        for (const item of sale.items) {
          if (item.productId) {
            const productRef = doc(db, 'products', item.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              batch.update(productRef, {
                stock: increment(item.quantity)
              });
            }
          }
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sales/${sale.id}`);
    }
  };

  const deleteSale = async (sale: Sale) => {
    try {
      const batch = writeBatch(db);
      const saleRef = doc(db, 'sales', sale.id);
      batch.delete(saleRef);

      // If the sale was not already voided, restore the stock of items that still exist
      if (!sale.isVoided && sale.items) {
        for (const item of sale.items) {
          if (item.productId) {
            const productRef = doc(db, 'products', item.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              batch.update(productRef, {
                stock: increment(item.quantity)
              });
            }
          }
        }
      }

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sales/${sale.id}`);
    }
  };

  return { sales, loading, createSale, voidSale, settleSale, deleteSale };
}
