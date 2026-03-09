import { useAlerts } from '../hooks/useAlerts';
import AlertCard from '../components/AlertCard';
import { useState } from 'react';

type Filter = 'all' | 'critical' | 'high' | 'medium' | 'low';

export default function AlertCenter() {
  const { alerts, loading, unreadCount, markRead, resolve } = useAlerts();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alert Center</h1>
          <p className="text-sm text-slate-400">
            {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Severity Filters */}
      <div className="flex gap-2">
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
