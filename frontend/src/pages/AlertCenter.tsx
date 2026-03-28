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
      className="min-h-screen space-y-12 bg-background-200 p-6 text-content-primary"
    >
      {/* 🏙️ HEADER — MCD ALERT CORE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[24px] bg-gradient-saffron flex items-center justify-center text-white mcd-glow-saffron shadow-2xl relative">
            <Bell size={32} />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-4 border-background-200 bg-state-danger text-[10px] font-black text-white shadow-lg">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-5xl font-black leading-none tracking-tighter text-content-primary italic uppercase">
              ALERT <span className="text-primary-500">COMMAND</span>
            </h1>
            <p className="mt-3 text-[11px] font-black uppercase tracking-[0.4em] text-content-secondary italic">
              Real-time Municipal Reality Sync & Crisis Monitoring
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-3 rounded-xl border border-primary-200 bg-surface-base px-6 py-3 text-[10px] font-black uppercase tracking-widest text-primary-600 transition-all hover:bg-primary-50"
          >
            <CheckCheck size={16} /> Mark Engine Read
          </button>
        )}
      </div>

      {/* 🕹️ CONSOLE FILTERS */}
      <div className="mcd-card flex flex-col items-center gap-10 border-[var(--color-border)] md:flex-row">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="mr-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-content-secondary">
            <ShieldAlert size={14} className="text-primary-500" /> Severity Grid:
          </span>
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f ? 'bg-primary-500 text-white shadow-lg' : 'border border-[var(--color-border)] bg-surface-base text-content-secondary hover:text-content-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="h-8 w-[1px] bg-surface-base/10 hidden md:block" />

        <div className="flex items-center gap-4 flex-wrap">
          <span className="mr-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-content-secondary">
            <Filter size={14} className="text-purple-500" /> Type Sync:
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="cursor-pointer appearance-none rounded-xl border-2 border-[var(--color-border)] bg-background-100 px-5 py-2 text-[10px] font-black uppercase text-content-primary transition-all focus:border-primary-300"
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
           <Activity size={48} className="animate-pulse text-primary-500" />
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-content-secondary italic">Syncing Alert Matrix...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mcd-glass relative overflow-hidden rounded-[60px] border border-dashed border-[var(--color-border)] p-40 text-center">
          <div className="absolute inset-0 bg-[#E76F2E]/[0.03] pointer-events-none" />
          <CheckCheck size={80} className="mx-auto text-emerald-500/20 mb-8" />
          <h2 className="mb-4 text-2xl font-black uppercase tracking-tighter text-content-primary italic">SYSTEMS <span className="text-state-success">STABLE</span></h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-content-secondary">No critical discrepancies detected in active reality sync</p>
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
