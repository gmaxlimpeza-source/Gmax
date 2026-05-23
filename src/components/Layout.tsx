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
      <aside className="w-20 hover:w-64 bg-[#0a192f] border-r border-blue-500/10 flex flex-col overflow-hidden transition-all duration-300 group/sidebar z-20 shadow-[10px_0_40px_rgba(0,0,100,0.15)]">
        <div className="p-6 border-b border-white/5 flex justify-center group-hover/sidebar:justify-start">
          <div className="flex items-center gap-0 group-hover/sidebar:gap-3 transition-all duration-300">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/40 flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black tracking-tighter text-white whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 italic max-w-0 group-hover/sidebar:max-w-xs overflow-hidden">
              G<span className="text-blue-400">MAX</span>
            </h2>
          </div>
        </div>
        
        <nav className="flex-1 p-3 space-y-3 mt-6">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center justify-center group-hover/sidebar:justify-start gap-0 group-hover/sidebar:gap-4 px-4 py-4 rounded-2xl transition-all duration-300 relative group/item ${
                currentView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' 
                  : 'hover:bg-blue-500/10 text-blue-300 hover:text-white'
              }`}
            >
              <item.icon className={`w-6 h-6 flex-shrink-0 ${currentView === item.id ? 'text-white' : 'group-hover/item:text-white'}`} />
              <span className="font-black text-[10px] uppercase tracking-[0.2em] opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap max-w-0 group-hover/sidebar:max-w-xs overflow-hidden">
                {item.label}
              </span>
              {currentView === item.id && (
                <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={onSignOut}
            className="w-full flex items-center justify-center group-hover/sidebar:justify-start gap-0 group-hover/sidebar:gap-4 px-4 py-4 rounded-2xl text-blue-400/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group/logout"
          >
            <LogOut className="w-6 h-6 flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover/sidebar:opacity-100 transition-all duration-300 whitespace-nowrap text-inherit max-w-0 group-hover/sidebar:max-w-xs overflow-hidden">Sair</span>
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
