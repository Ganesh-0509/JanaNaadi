import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import {
  Map, BarChart3, Bell, FileText, Database, Activity, LogOut, Home, Users, TrendingUp, Menu, X,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/pulse', label: 'Community Pulse', icon: Users, public: true },
  { to: '/map', label: 'Heatmap', icon: Map, public: false },
  { to: '/analysis/national/1', label: 'Deep Analysis', icon: TrendingUp, public: false },
  { to: '/alerts', label: 'Alerts', icon: Bell, admin: true },
  { to: '/briefs', label: 'AI Briefs', icon: FileText, admin: true },
  { to: '/admin/ingest', label: 'Ingestion', icon: Database, admin: true },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-[600] bg-slate-800 border border-slate-700 rounded-lg p-2"
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

      {/* Sidebar */}
      <aside className={`
        fixed md:static z-[800] h-full w-64 bg-slate-800 border-r border-slate-700 flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
          <Link to="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-lg font-bold">
              J
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">JanaNaadi</div>
              <div className="text-xs text-slate-400">Pulse of the People</div>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.admin && user?.role !== 'admin') return null;
            if (!item.public && !user) return null;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-slate-700">
          {user ? (
            <div className="space-y-2">
              <div className="px-3 py-1">
                <div className="text-sm font-medium truncate">{user.email}</div>
                <div className="text-xs text-slate-400 capitalize">{user.role}</div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white w-full rounded-lg hover:bg-slate-700"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-400 hover:bg-blue-500/20 rounded-lg"
            >
              Admin Login
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:ml-0">
        <Outlet />
      </main>
    </div>
  );
}
