import { useAlerts } from '../hooks/useAlerts';
import AlertCard from '../components/AlertCard';
import { useState, useEffect } from 'react';
import { CheckCheck } from 'lucide-react';

type Filter = 'all' | 'critical' | 'high' | 'medium' | 'low';

export default function AlertCenter() {
  const { alerts, loading, unreadCount, markRead, resolve } = useAlerts();
  const [filter, setFilter] = useState<Filter>('all');
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alert Center</h1>
          <p className="text-sm text-slate-400">
            {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-sm font-medium"
          >
            <CheckCheck size={14} /> Mark All Read
          </button>
        )}
      </div>

      {/* Severity Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'critical', 'high', 'medium', 'low'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              filter === f ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      {alertTypes.length > 2 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Type:</span>
          {alertTypes.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                typeFilter === t ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {t === 'all' ? 'All Types' : t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Alert List */}
      {loading ? (
        <div className="text-slate-400 text-center py-10">Loading alerts...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-10 border border-slate-700 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-lg font-medium">No alerts</div>
          <div className="text-sm text-slate-400 mt-1">Everything looks calm</div>
        </div>
      ) : (
        <div className="space-y-3">
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
    </div>
  );
}
