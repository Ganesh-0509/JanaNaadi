import { useState } from 'react';
import { formatRelative } from '../utils/formatters';
import { AlertTriangle, TrendingDown, TrendingUp, Volume2, Lightbulb, ChevronDown, ChevronUp, Loader2, Building2, Network } from 'lucide-react';
import { getAlertRecommendations } from '../api/alerts';
import { Link } from 'react-router-dom';
import { type Alert } from '../types/api';

interface Action {
  priority: 'immediate' | 'short_term' | 'long_term';
  department: string;
  action: string;
  rationale: string;
  kpi: string;
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

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  immediate:   { label: 'Immediate (24h)',  cls: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  short_term:  { label: '1–2 weeks',        cls: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  long_term:   { label: '1–3 months',       cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
};

export default function AlertCard({ alert, onMarkRead, onResolve }: Props) {
  const color = SEVERITY_COLORS[alert.severity] || '#3B82F6';
  const Icon = TYPE_ICONS[alert.alert_type] || AlertTriangle;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<{ summary: string; actions: Action[] } | null>(null);
  const [recError, setRecError] = useState<string | null>(null);

  const handleRecommend = async () => {
    if (recs) { setOpen((o) => !o); return; }
    setOpen(true);
    setLoading(true);
    setRecError(null);
    try {
      const data = await getAlertRecommendations(alert.id);
      setRecs(data);
    } catch {
      setRecError('Could not generate recommendations. Check Gemini API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`bg-[#141B2D] rounded-xl border transition-all mcd-glass ${
        alert.is_read ? 'border-white/5 opacity-80' : 'border-l-4 mcd-glow-saffron'
      }`}
      style={{ borderLeftColor: alert.is_read ? undefined : color }}
    >
      {/* Main card body */}
      <div className="p-4">
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
              {alert.is_strategic && (
                <span className="text-[10px] font-black bg-[#FF9933]/20 text-[#FF9933] px-3 py-1 rounded-full border border-[#FF9933]/30 animate-pulse tracking-widest uppercase mcd-glow-saffron">
                  STRATEGIC PRIORITY
                </span>
              )}
              <span className="text-xs text-slate-400">{formatRelative(alert.triggered_at)}</span>
            </div>
            <h3 className="font-semibold text-sm mb-1">{alert.title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>
            
            {/* Strategic Metadata Bar */}
            {(alert.ac_name || alert.population_impact) && (
              <div className="flex gap-4 mt-3 py-2 px-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
                {alert.ac_name && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <Building2 size={12} className="text-blue-400" />
                    AC: <span className="text-slate-200 font-semibold">{alert.ac_name}</span>
                  </div>
                )}
                {alert.population_impact && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <TrendingUp size={12} className="text-emerald-400" />
                    IMPACT: <span className="text-slate-200 font-semibold">{alert.population_impact.toLocaleString()} Citizens</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
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
              {/* AI Recommend button */}
              <button
                onClick={handleRecommend}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 transition-colors"
              >
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Lightbulb size={12} />
                )}
                AI Recommendations
                {recs && (open ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
              </button>
              {/* Explore Knowledge Graph link */}
              <Link
                to={`/ontology?q=${encodeURIComponent(alert.title)}`}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors"
              >
                <Network size={12} />
                Explore Graph
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable recommendations panel */}
      {open && (
        <div className="border-t border-slate-700 px-4 pb-4">
          {loading && (
            <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Asking Gemini for action plan...
            </div>
          )}
          {recError && (
            <p className="text-xs text-red-400 py-3">{recError}</p>
          )}
          {recs && (
            <div className="space-y-4 pt-4">
              {/* Crisis summary */}
              <div className="bg-slate-700/50 rounded-lg p-3">
                <p className="text-xs font-semibold text-purple-300 mb-1 uppercase tracking-wider">Minister's Brief</p>
                <p className="text-sm text-slate-200 leading-relaxed">{recs.summary}</p>
              </div>

              {/* Action items */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Action Plan</p>
                <div className="space-y-2">
                  {recs.actions.map((a, i) => {
                    const ps = PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.short_term;
                    return (
                      <div key={i} className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ps.cls}`}>
                            {ps.label}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Building2 size={11} /> {a.department}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-white mb-1">{a.action}</p>
                        <p className="text-xs text-slate-400 mb-1.5">{a.rationale}</p>
                        <p className="text-xs text-emerald-400 font-medium">✓ KPI: {a.kpi}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
