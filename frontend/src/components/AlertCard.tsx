import { sentimentColor } from '../utils/colors';
import { formatRelative } from '../utils/formatters';
import { AlertTriangle, TrendingDown, TrendingUp, Volume2 } from 'lucide-react';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  triggered_at: string;
  is_read: boolean;
}

interface Props {
  alert: Alert;
  onMarkRead?: (id: string) => void;
  onResolve?: (id: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#DC2626',
  high: '#EF4444',
  medium: '#EAB308',
  low: '#3B82F6',
};

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  sentiment_spike: TrendingDown,
  volume_spike: Volume2,
  new_issue: TrendingUp,
  urgency_high: AlertTriangle,
};

export default function AlertCard({ alert, onMarkRead, onResolve }: Props) {
  const color = SEVERITY_COLORS[alert.severity] || '#3B82F6';
  const Icon = TYPE_ICONS[alert.alert_type] || AlertTriangle;

  return (
    <div
      className={`bg-slate-800 rounded-xl p-4 border transition-colors ${
        alert.is_read ? 'border-slate-700' : 'border-l-4'
      }`}
      style={{ borderLeftColor: alert.is_read ? undefined : color }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold uppercase px-2 py-0.5 rounded"
              style={{ backgroundColor: `${color}30`, color }}
            >
              {alert.severity}
            </span>
            <span className="text-xs text-slate-400">{formatRelative(alert.triggered_at)}</span>
          </div>
          <h3 className="font-semibold text-sm mb-1">{alert.title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>
          <div className="flex gap-2 mt-3">
            {!alert.is_read && onMarkRead && (
              <button
                onClick={() => onMarkRead(alert.id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300"
              >
                Mark Read
              </button>
            )}
            {onResolve && (
              <button
                onClick={() => onResolve(alert.id)}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400"
              >
                Resolve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
