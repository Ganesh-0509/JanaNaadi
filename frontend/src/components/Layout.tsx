import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../hooks/useAlerts';
import { useState } from 'react';
import {
  Map, BarChart3, Bell, FileText, Database, LogOut, Users, Menu, X,
  Flame, Radio, Search, LayoutDashboard, Network, Layers, MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/pulse', label: 'Community Pulse', icon: Users, public: true },
  { to: '/gov', label: 'Gov Intelligence', icon: LayoutDashboard, public: false },
  { to: '/ontology', label: 'Knowledge Graph', icon: Network, public: false },
  { to: '/cross-domain', label: 'Cross-Domain Map', icon: Layers, public: false },
  { to: '/delhi', label: 'Delhi Intelligence', icon: MapPin, public: false },
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
    <div className="flex h-screen mcd-readable">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[600] bg-surface-base border border-white/10 rounded-lg p-2 text-white shadow-glass"
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

      {/* Sidebar — Cyber-Noir Variant */}
      <aside className={`
        fixed md:static z-[800] h-full w-72 bg-[#080A0F]/80 backdrop-blur-xl border-r border-white/5 flex flex-col
        transition-all duration-300 ease-in-out shadow-glass-lg
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between px-8 py-10">
          <Link to="/" className="flex items-center gap-4" onClick={() => setSidebarOpen(false)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-saffron flex items-center justify-center text-xl font-black text-white mcd-glow-saffron shadow-lg italic">
              J
            </div>
            <div>
              <div className="font-black text-lg leading-none tracking-tight uppercase text-content-primary italic">
                JANA<span className="text-[#E76F2E]">NAADI</span>
              </div>
              <div className="text-[10px] font-black text-content-muted uppercase tracking-[0.12em] mt-1 italic">
                MCD INTELLIGENCE
              </div>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-content-muted hover:text-white transition-colors">
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
                className={`flex items-center gap-4 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-[0.06em] transition-all group ${
                  active
                    ? 'bg-surface-raised/50 text-[#00E5FF] font-black border-l-2 border-[#00E5FF] shadow-glow-cyan/20'
                    : 'text-content-muted hover:bg-surface-base/5 hover:text-[#00E5FF]'
                }`}
              >
                <item.icon size={18} className={`${active ? 'text-[#00E5FF]' : 'group-hover:text-[#00E5FF] text-content-muted'} transition-colors`} />
                <span className="flex-1 italic">{item.label}</span>
                {item.to === '/alerts' && unreadCount > 0 && (
                  <span className="ml-auto bg-[#E76F2E] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-glow">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-8 border-t border-white/5 bg-transparent">
          {user ? (
            <div className="space-y-4">
              <div className="px-5 py-3 bg-surface-base/5 rounded-xl border border-white/10 shadow-glass">
                <div className="text-xs font-black text-white truncate uppercase tracking-tight">{user.email?.split('@')[0]}</div>
                <div className="text-[10px] font-black text-[#00E5FF] uppercase tracking-[0.1em] mt-1 italic opacity-80">{user.role} SYNCED</div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-3 px-5 py-3 text-[11px] font-black text-content-muted hover:text-red-400 w-full rounded-xl hover:bg-red-500/10 transition-all uppercase tracking-[0.08em] italic"
              >
                <LogOut size={16} />
                Terminate Session
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-black text-[#00E5FF] bg-[#00E5FF]/5 hover:bg-[#00E5FF]/10 rounded-xl border border-[#00E5FF]/20 transition-all uppercase tracking-[0.08em] italic shadow-glow-cyan/20"
            >
              Intelligence Login
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content — Dark Version */}
      <main className="flex-1 overflow-auto bg-background-200 flex flex-col selection:bg-[#E76F2E]/30 selection:text-white">
        <div className="flex-1 relative overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Footer — Cyber-Noir */}
        <footer className="bg-[#080A0F]/80 backdrop-blur-md border-t border-white/5 px-10 py-10 text-center relative z-10">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-center gap-8 opacity-40">
              <span className="text-[11px] font-black text-[#00E5FF] uppercase tracking-[0.14em] glow-pulse">MCD SECURE CHANNEL</span>
               <div className="w-1 h-1 bg-surface-base/30 rounded-full" />
              <span className="text-[11px] font-black text-content-muted uppercase tracking-[0.14em]">REALITY SYNC ENGINE 1.2</span>
               <div className="w-1 h-1 bg-surface-base/30 rounded-full" />
              <span className="text-[11px] font-black text-content-muted uppercase tracking-[0.14em]">WARD CENSUS v2.5</span>
            </div>
            <p className="text-[11px] font-black text-content-muted uppercase tracking-[0.1em] italic">
               © 2026 JANA NAADI GLOBAL — MUNICIPAL CORPORATION OF DELHI STRATEGIC UNIT
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
