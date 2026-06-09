import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Reports } from './components/Reports';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Loader2 } from 'lucide-react';
import { usePerformanceMode } from './hooks/usePerformanceMode';

export default function App() {
  const { isPerformanceMode } = usePerformanceMode();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'pos' | 'inventory' | 'reports'>('pos');

  useEffect(() => {
    // Restore last known user session to prevent login screen flicker during loading/offline moments
    const savedUser = localStorage.getItem('gmax_last_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('gmax_last_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        const userData = {
          uid: u.uid,
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
        };
        localStorage.setItem('gmax_last_user', JSON.stringify(userData));
        setUser(userData);
      } else {
        localStorage.removeItem('gmax_last_user');
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('gmax_last_user');
      await auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Signout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900 p-4 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl space-y-8 border border-white/20"
        >
          <div className="space-y-3">
            <div className="w-24 h-24 mx-auto flex items-center justify-center">
              <img src="/gmax_logo_clean.png" alt="GMAX Logo" className="w-24 h-24 object-contain rounded-[24px] shadow-lg shadow-blue-950/20" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 uppercase italic">GMAX <span className="text-blue-600">POS</span></h1>
            <p className="text-blue-900/40 text-xs font-black uppercase tracking-[0.2em]">Gestão Comercial de Alta Performance</p>
          </div>
          
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-5 px-6 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all font-black uppercase tracking-widest text-xs active:scale-[0.98]"
          >
            Acessar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'pos': return <POS user={user} />;
      case 'inventory': return <Inventory />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView} user={user} onSignOut={handleSignOut}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentView}
          initial={isPerformanceMode ? false : { opacity: 0, x: 10 }}
          animate={isPerformanceMode ? { opacity: 1, x: 0 } : { opacity: 1, x: 0 }}
          exit={isPerformanceMode ? { opacity: 0 } : { opacity: 0, x: -10 }}
          transition={isPerformanceMode ? { duration: 0 } : { duration: 0.2 }}
          className={`h-full ${currentView !== 'pos' ? 'overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar' : ''}`}
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
