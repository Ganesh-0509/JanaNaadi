import { useState } from 'react';
import { formatRelative } from '../utils/formatters';
import { AlertTriangle, TrendingDown, TrendingUp, Volume2, Lightbulb, ChevronDown, ChevronUp, Loader2, Building2, Network, Zap, Activity } from 'lucide-react';
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

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-state-danger/10', text: 'text-state-danger', border: 'border-state-danger/20' },
  high: { bg: 'bg-primary-100', text: 'text-primary-700', border: 'border-primary-200' },
  medium: { bg: 'bg-state-warning/10', text: 'text-state-warning', border: 'border-state-warning/20' },
  low: { bg: 'bg-state-info/10', text: 'text-state-info', border: 'border-state-info/20' },
};

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  sentiment_spike: TrendingDown,
  volume_spike: Volume2,
  new_issue: TrendingUp,
  urgency_high: AlertTriangle,
};

const PRIORITY_STYLES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  immediate: { label: 'Immediate (24h)', bg: 'bg-state-danger/10', text: 'text-state-danger', border: 'border-state-danger/20' },
  short_term: { label: '1–2 weeks', bg: 'bg-state-warning/10', text: 'text-state-warning', border: 'border-state-warning/20' },
  long_term: { label: '1–3 months', bg: 'bg-secondary-50', text: 'text-secondary-700', border: 'border-secondary-200' },
};

export default function AlertCard({ alert, onMarkRead, onResolve }: Props) {
  const severityStyle = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.low;
  const Icon = TYPE_ICONS[alert.alert_type] || AlertTriangle;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<{ summary: string; actions: Action[] } | null>(null);
  const [recError, setRecError] = useState<string | null>(null);

  const handleRecommend = async () => {
    if (recs) { setOpen(o => !o); return; }
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
      className={`group relative overflow-hidden rounded-3xl border bg-surface-base shadow-sm transition-all hover:shadow-lg ${
        alert.is_read ? 'border-gray-200 opacity-60' : `border-primary-200 ${severityStyle.border}`
      }`}
    >
      {!alert.is_read && (
        <div className="absolute left-0 top-0 h-full w-1.5 bg-primary-500 shadow-sm" />
      )}
      
      <div className="p-8">
        <div className="flex items-start gap-6">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border ${severityStyle.bg} ${severityStyle.text}`}>
            <Icon size={24} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className={`text-xs font-bold uppercase px-4 py-1.5 rounded-lg border tracking-wider shadow-sm ${severityStyle.bg} ${severityStyle.text} ${severityStyle.border}`}>
                {alert.severity} AUDIT
              </span>
              {alert.is_strategic && (
                <span className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary-700 shadow-sm">
                  STRATEGIC PRIORITY
                </span>
              )}
              <span className="text-xs font-semibold text-content-secondary">{formatRelative(alert.triggered_at)}</span>
            </div>
            
            <h3 className="mb-2 text-xl font-bold text-content-primary transition-colors group-hover:text-primary-600">{alert.title}</h3>
            <p className="mb-6 max-w-2xl text-sm text-content-secondary">{alert.description}</p>
            
            {(alert.ac_name || alert.population_impact) && (
              <div className="mb-8 flex w-fit gap-6 rounded-2xl border border-gray-200 bg-background-100 py-4 px-6 shadow-sm">
                {alert.ac_name && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-content-secondary">
                    <Building2 size={16} className="text-primary-600" />
                    <span>Sector:</span>
                    <span className="text-content-primary font-bold">{alert.ac_name}</span>
                  </div>
                )}
                {alert.population_impact && (
                  <div className="flex items-center gap-2 border-l border-gray-200 pl-6 text-xs font-semibold text-content-secondary">
                    <TrendingUp size={16} className="text-state-success" />
                    <span>Impact:</span>
                    <span className="text-content-primary font-bold">{alert.population_impact.toLocaleString()} Citizens</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              {!alert.is_read && onMarkRead && (
                <button
                  onClick={() => onMarkRead(alert.id)}
                  className="rounded-lg border border-gray-200 bg-background-100 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-content-secondary transition-all hover:bg-background-200 hover:text-content-primary shadow-sm"
                >
                  Sync Read
                </button>
              )}
              {onResolve && (
                <button
                  onClick={() => onResolve(alert.id)}
                  className="text-xs font-bold px-5 py-2.5 rounded-lg bg-state-success/10 text-state-success hover:bg-state-success/20 transition-all uppercase tracking-wider border border-state-success/20 shadow-sm"
                >
                  Resolve Audit
                </button>
              )}
              
              <button
                onClick={handleRecommend}
                className="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-primary-700 shadow-sm"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                Intelligence Plan
                {recs && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </button>

              <Link
                to={`/ontology?q=${encodeURIComponent(alert.title)}`}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-surface-base px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-content-secondary transition-all hover:border-primary-200 hover:text-primary-600 shadow-sm"
              >
                <Network size={14} />
                Explore Graph
              </Link>
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-background-100 px-8 pb-8 pt-8">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Activity size={32} className="animate-pulse text-primary-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-content-secondary">Generating action plan...</p>
            </div>
          )}
          {recError && (
            <p className="text-sm text-state-danger font-bold uppercase tracking-wider py-6 text-center">{recError}</p>
          )}
          {recs && (
            <div className="space-y-8">
              <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-surface-base p-8 shadow-sm">
                <div className="pointer-events-none absolute right-0 top-0 p-12 text-content-primary/10">
                  <Zap size={140} />
                </div>
                <div className="relative z-10 mb-4 flex items-center gap-3">
                  <div className="h-1 w-6 rounded-full bg-primary-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary-600">Commissioner's Brief</h4>
                </div>
                <p className="relative z-10 text-lg font-bold leading-snug text-content-primary">"{recs.summary}"</p>
              </div>

              <div>
                <h4 className="mb-6 text-xs font-bold uppercase tracking-wider text-content-secondary">Strategic Action Sequence</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  {recs.actions.map((a, i) => {
                    const ps = PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.short_term;
                    return (
                      <div key={i} className="group/action relative overflow-hidden rounded-3xl border border-gray-200 bg-surface-base p-8 shadow-sm transition-all hover:border-primary-200 hover:shadow-md">
                        <div className="absolute right-0 top-0 p-4 text-content-primary/5 transition-transform group-hover/action:scale-110">
                          <Zap size={40} />
                        </div>
                        <div className="flex items-center gap-3 mb-6 flex-wrap">
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider border ${ps.bg} ${ps.text} ${ps.border}`}>
                            {ps.label}
                          </span>
                          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-content-secondary">
                            <Building2 size={14} className="text-secondary-600" /> {a.department}
                          </span>
                        </div>
                        <p className="mb-3 text-base font-bold text-content-primary">{a.action}</p>
                        <p className="mb-6 text-sm text-content-secondary">Rationale: {a.rationale}</p>
                        <div className="flex items-center gap-3 border-t border-gray-200 pt-6">
                          <span className="text-xs font-bold text-state-success uppercase tracking-wider">MCD Metric:</span>
                          <p className="text-sm font-bold text-content-primary">{a.kpi}</p>
                        </div>
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
