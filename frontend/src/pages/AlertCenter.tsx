import { useAlerts } from '../hooks/useAlerts';
import AlertCard from '../components/AlertCard';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCheck, Bell, ShieldAlert, Filter, Activity, X } from 'lucide-react';
import { type Alert } from '../types/api';

type FilterState = 'all' | 'critical' | 'high' | 'medium' | 'low';

export default function AlertCenter() {
  const { alerts, loading, unreadCount, markRead, resolve } = useAlerts(true);
  const [filter, setFilter] = useState<FilterState>('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Request browser notification permission so push alerts work
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const alertTypes = ['all', ...Array.from(new Set(alerts.map((a) => a.alert_type)))];

  const filtered = alerts.filter((a) => {
    if (filter !== 'all' && a.severity !== filter) return false;
    if (typeFilter !== 'all' && a.alert_type !== typeFilter) return false;
    return true;
  });

  const markAllRead = () => {
    alerts.filter((a) => !a.is_read).forEach((a) => markRead(a.id));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-12 bg-[#F5E9D8] min-h-screen"
    >
      {/* 🏙️ HEADER — MCD ALERT CORE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[24px] bg-gradient-saffron flex items-center justify-center text-white mcd-glow-saffron shadow-2xl relative">
            <Bell size={32} />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 rounded-full border-4 border-[#F5E9D8] flex items-center justify-center text-[10px] font-black shadow-lg">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter leading-none italic">
              ALERT <span className="text-[#E76F2E]">COMMAND</span>
            </h1>
            <p className="text-[11px] font-black text-[#6B5E57] uppercase tracking-[0.4em] mt-3 italic">
              Real-time Municipal Reality Sync & Crisis Monitoring
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-[#E76F2E] uppercase tracking-widest transition-all border border-white/5"
          >
            <CheckCheck size={16} /> Mark Engine Read
          </button>
        )}
      </div>

      {/* 🕹️ CONSOLE FILTERS */}
      <div className="mcd-card border-white/5 flex flex-col md:flex-row items-center gap-10">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest mr-2 flex items-center gap-2">
            <ShieldAlert size={14} className="text-[#E76F2E]" /> Severity Grid:
          </span>
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-[#E76F2E] text-white mcd-glow-saffron shadow-lg' : 'bg-white/5 text-[#6B5E57] hover:text-white border border-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="h-8 w-[1px] bg-white/10 hidden md:block" />

        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest mr-2 flex items-center gap-2">
            <Filter size={14} className="text-purple-500" /> Type Sync:
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#F5E9D8] border-2 border-white/5 rounded-xl px-5 py-2 text-[10px] text-white font-black uppercase focus:border-[#E76F2E]/40 transition-all appearance-none cursor-pointer"
          >
            {alertTypes.map((t) => (
              <option key={t} value={t}>{t === 'all' ? 'All Alerts Matrix' : t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 📡 ALERT FEED */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
           <Activity size={48} className="text-[#E76F2E] animate-pulse" />
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#6B5E57] italic">Syncing Alert Matrix...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mcd-glass rounded-[60px] border border-white/5 border-dashed p-40 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
          <CheckCheck size={80} className="mx-auto text-emerald-500/20 mb-8" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 italic text-white/40">SYSTEMS <span className="text-emerald-500/50">STABLE</span></h2>
          <p className="text-[#6B5E57] font-black uppercase tracking-[0.4em] text-[10px]">No critical discrepancies detected in active reality sync</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 max-w-5xl">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkRead={markRead}
              onResolve={resolve}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
