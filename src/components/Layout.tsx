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
    <div className="flex flex-col md:flex-row h-screen bg-blue-50/20 text-gray-900 font-sans">
      {/* Compact Sidebar on Desktop, Bottom bar on Mobile */}
      <aside className="w-full h-16 md:w-20 md:h-full bg-[#0a192f] border-t md:border-t-0 md:border-r border-blue-500/10 flex flex-row md:flex-col justify-between overflow-hidden z-20 shadow-[0_-10px_30px_rgba(0,0,100,0.1)] md:shadow-[10px_0_40px_rgba(0,0,100,0.15)] shrink-0 order-last md:order-first">
        <div className="hidden md:flex p-4 border-b border-white/5 justify-center">
          <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" title="GMAX PDV">
            <img src="/gmax_logo_clean.png" alt="GMAX Logo" className="w-[44px] h-[44px] object-contain rounded-xl hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
          </div>
        </div>
        
        <nav className="flex-1 flex md:flex-col items-center justify-around md:justify-start p-2 md:p-3 gap-1 md:space-y-3 md:mt-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              title={item.label}
              className={`flex-1 md:w-full flex items-center justify-center py-2 md:py-4 rounded-xl md:rounded-2xl transition-all duration-300 relative group/item-nav ${
                currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' 
                  : 'hover:bg-blue-500/10 text-blue-300 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 text-inherit" />
              {currentView === item.id && (
                <div className="absolute bottom-0 md:bottom-auto md:left-0 h-1 md:h-6 w-8 md:w-1.5 bg-white rounded-t-full md:rounded-t-none md:rounded-r-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-2 md:p-4 border-l md:border-l-0 md:border-t border-white/10 flex items-center justify-center">
          <button 
            onClick={onSignOut}
            title="Sair"
            className="flex items-center justify-center p-2.5 md:py-4 rounded-xl text-blue-400/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
          >
            <LogOut className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
