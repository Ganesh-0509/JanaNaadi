import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../hooks/useAlerts';
import { useState } from 'react';
import {
  Map, BarChart3, Bell, FileText, Database, LogOut, Users, Menu, X,
  Flame, Radio, Search, LayoutDashboard, Network, Layers,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/pulse', label: 'Community Pulse', icon: Users, public: true },
  { to: '/gov', label: 'Gov Intelligence', icon: LayoutDashboard, public: false },
  { to: '/ontology', label: 'Knowledge Graph', icon: Network, public: false },
  { to: '/cross-domain', label: 'Cross-Domain Map', icon: Layers, public: false },
  { to: '/map', label: 'Heatmap', icon: Map, public: false },
  { to: '/compare', label: 'Compare Wards', icon: BarChart3, public: false },
  { to: '/stream', label: 'Live Stream', icon: Radio, public: false },
  { to: '/search', label: 'Search', icon: Search, public: false },
  { to: '/alerts', label: 'Alerts', icon: Bell, admin: true },
  { to: '/briefs', label: 'AI Briefs', icon: FileText, admin: true },
  { to: '/admin/ingest', label: 'Ingestion', icon: Database, admin: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { unreadCount } = useAlerts(isAdmin);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[600] bg-[#3E2C23] border border-[#3E2C23]/20 rounded-lg p-2 text-white"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-[700]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — Light Ivory Variant */}
      <aside className={`
        fixed md:static z-[800] h-full w-72 bg-[#F5E9D8] border-r border-[#3E2C23]/10 flex flex-col
        transition-all duration-300 ease-in-out shadow-sm
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between px-8 py-10">
          <Link to="/" className="flex items-center gap-4" onClick={() => setSidebarOpen(false)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-saffron flex items-center justify-center text-xl font-black text-white mcd-glow-saffron shadow-lg italic">
              J
            </div>
            <div>
              <div className="font-black text-lg leading-none tracking-tight uppercase text-[#3E2C23] italic">
                JANA<span className="text-[#E76F2E]">NAADI</span>
              </div>
              <div className="text-[8px] font-black text-[#6B5E57] uppercase tracking-[0.2em] mt-1 italic">
                MCD INTELLIGENCE
              </div>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-[#6B5E57] hover:text-[#3E2C23] transition-colors">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto mcd-scrollbar">
          {NAV_ITEMS.map((item) => {
            if (item.admin && user?.role !== 'admin') return null;
            if (!item.public && !user) return null;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-4 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all group ${
                  active
                    ? 'bg-white text-[#E76F2E] font-black border-l-2 border-[#E76F2E] shadow-sm'
                    : 'text-[#6B5E57] hover:bg-white/50 hover:text-[#E76F2E]'
                }`}
              >
                <item.icon size={18} className={`${active ? 'text-[#E76F2E]' : 'group-hover:text-[#E76F2E] text-[#6B5E57]/60'} transition-colors`} />
                <span className="flex-1 italic">{item.label}</span>
                {item.to === '/alerts' && unreadCount > 0 && (
                  <span className="ml-auto bg-[#E76F2E] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-8 border-t border-[#3E2C23]/5 bg-[#FAF5ED]">
          {user ? (
            <div className="space-y-4">
              <div className="px-5 py-3 bg-white rounded-xl border border-[#3E2C23]/10 shadow-sm">
                <div className="text-[10px] font-black text-[#3E2C23] truncate uppercase tracking-tight">{user.email?.split('@')[0]}</div>
                <div className="text-[8px] font-black text-[#E76F2E] uppercase tracking-[0.15em] mt-1 italic opacity-80">{user.role} SYNCED</div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-5 py-3 text-[9px] font-black text-[#6B5E57] hover:text-red-500 w-full rounded-xl hover:bg-red-50 transition-all uppercase tracking-widest italic"
              >
                <LogOut size={16} />
                Terminate Session
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center gap-2 px-5 py-3 text-[10px] font-black text-[#E76F2E] bg-[#E76F2E]/5 hover:bg-[#E76F2E]/10 rounded-xl border border-[#E76F2E]/20 transition-all uppercase tracking-widest italic"
            >
              Intelligence Login
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content — Light Version */}
      <main className="flex-1 overflow-auto bg-white flex flex-col selection:bg-[#E76F2E]/20 selection:text-[#3E2C23]">
        <div className="flex-1">
          <Outlet />
        </div>
        
        {/* Footer — Subtle Light */}
        <footer className="bg-[#FAF5ED] border-t border-[#3E2C23]/10 px-10 py-10 text-center">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-center gap-8 opacity-40 grayscale opacity-10">
               <span className="text-[9px] font-black text-[#3E2C23] uppercase tracking-[0.3em]">MCD SECURE CHANNEL</span>
               <div className="w-1 h-1 bg-[#6B5E57] rounded-full" />
               <span className="text-[9px] font-black text-[#3E2C23] uppercase tracking-[0.3em]">REALITY SYNC ENGINE 1.2</span>
               <div className="w-1 h-1 bg-[#6B5E57] rounded-full" />
               <span className="text-[9px] font-black text-[#3E2C23] uppercase tracking-[0.3em]">WARD CENSUS v2.5</span>
            </div>
            <p className="text-[9px] font-black text-[#6B5E57] uppercase tracking-[0.25em] italic">
               © 2026 JANA NAADI GLOBAL — MUNICIPAL CORPORATION OF DELHI STRATEGIC UNIT
T
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
