import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product } from '../types';

export function useInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, 'products'), orderBy('name'));
        unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const items: Product[] = [];
            snapshot.forEach((doc) => {
              items.push({ id: doc.id, ...doc.data() } as Product);
            });
            setProducts(items);
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, 'products');
            setLoading(false);
          }
        );
      } else {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        setProducts([]);
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

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'products'), {
        ...product,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  const updateProduct = async (id: string, product: Partial<Product>) => {
    try {
      await updateDoc(doc(db, 'products', id), product);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  return { products, loading, addProduct, updateProduct, deleteProduct };
}
