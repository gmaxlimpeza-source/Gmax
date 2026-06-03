import { ReactNode } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { User } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  setView: (view: any) => void;
  user: any;
  onSignOut: () => void;
}

export function Layout({ children, currentView, setView, user, onSignOut }: LayoutProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'PDV / Vendas', icon: ShoppingCart },
    { id: 'inventory', label: 'Estoque', icon: Package },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-blue-50/20 text-gray-900 font-sans">
      {/* Compact Sidebar */}
      <aside className="w-20 bg-[#0a192f] border-r border-blue-500/10 flex flex-col justify-between overflow-hidden z-20 shadow-[10px_0_40px_rgba(0,0,100,0.15)] shrink-0">
        <div className="p-4 border-b border-white/5 flex justify-center">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" title="GMAX PDV">
            <img src="/gmax_logo_clean.png" alt="GMAX Logo" className="w-[44px] h-[44px] object-contain rounded-xl hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-3 mt-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              title={item.label}
              className={`w-full flex items-center justify-center py-4 rounded-2xl transition-all duration-300 relative group/item ${
                currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' 
                  : 'hover:bg-blue-500/10 text-blue-300 hover:text-white'
              }`}
            >
              <item.icon className="w-6 h-6 flex-shrink-0 text-inherit" />
              {currentView === item.id && (
                <div className="absolute left-0 w-1.5 h-6 bg-white rounded-r-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={onSignOut}
            title="Sair"
            className="w-full flex items-center justify-center py-4 rounded-2xl text-blue-400/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
          >
            <LogOut className="w-6 h-6 flex-shrink-0" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
