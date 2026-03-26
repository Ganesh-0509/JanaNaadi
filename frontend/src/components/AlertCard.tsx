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
  immediate:   { label: 'Immediate (24h)',  cls: 'bg-red-50 text-red-600 border border-red-100 shadow-sm' },
  short_term:  { label: '1–2 weeks',        cls: 'bg-amber-50 text-amber-600 border border-amber-100 shadow-sm' },
  long_term:   { label: '1–3 months',       cls: 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm' },
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
      className={`bg-white rounded-[32px] border transition-all relative overflow-hidden group shadow-sm hover:shadow-xl ${
        alert.is_read ? 'border-[#3E2C23]/5 opacity-60' : 'border-[#E76F2E]/10'
      }`}
    >
      {!alert.is_read && (
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E76F2E] shadow-sm shadow-[#E76F2E]/30" />
      )}
      
      {/* Main card body — Light Mode */}
      <div className="p-7">
        <div className="flex items-start gap-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-50 italic"
            style={{ backgroundColor: `${color}10`, color: color }}
          >
            <Icon size={24} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <span
                className="text-[9px] font-black uppercase px-3 py-1 rounded-lg border border-slate-50 tracking-widest shadow-sm italic opacity-80"
                style={{ backgroundColor: `${color}15`, color: color }}
              >
                {alert.severity} AUDIT
              </span>
              {alert.is_strategic && (
                <span className="text-[9px] font-black bg-[#E76F2E]/10 text-[#E76F2E] px-3 py-1 rounded-lg border border-[#E76F2E]/20 tracking-[0.1em] uppercase shadow-sm italic">
                  STRATEGIC PRIORITY
                </span>
              )}
              <div className="h-3 w-[1px] bg-[#FAF5ED] mx-1" />
              <span className="text-[9px] font-black text-[#6B5E57] uppercase tracking-widest italic">{formatRelative(alert.triggered_at)}</span>
            </div>
            
            <h3 className="text-xl font-black text-[#3E2C23] uppercase tracking-tight mb-2 group-hover:text-[#E76F2E] transition-colors leading-tight italic">{alert.title}</h3>
            <p className="text-xs font-medium text-[#6B5E57] leading-relaxed max-w-2xl mb-6 italic opacity-90">{alert.description}</p>
            
            {/* Strategic Metadata Bar — Light Mode */}
            {(alert.ac_name || alert.population_impact) && (
              <div className="flex gap-6 mb-8 py-3 px-5 bg-[#FAF5ED]/50 rounded-[20px] border border-[#3E2C23]/5 w-fit shadow-sm">
                {alert.ac_name && (
                  <div className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-widest italic">
                    <Building2 size={14} className="text-[#E76F2E]" />
                    <span className="text-[#6B5E57] mr-1">Sector:</span>
                    <span className="text-[#3E2C23]">{alert.ac_name}</span>
                  </div>
                )}
                {alert.population_impact && (
                  <div className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-widest border-l border-[#3E2C23]/5 pl-6 italic">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-[#6B5E57] mr-1">Impact:</span>
                    <span className="text-[#3E2C23]">{alert.population_impact.toLocaleString()} Citizens</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4 flex-wrap">
              {!alert.is_read && onMarkRead && (
                <button
                  onClick={() => onMarkRead(alert.id)}
                  className="text-[10px] font-black px-6 py-3 rounded-xl bg-[#FAF5ED] hover:bg-[#FAF5ED]/50 text-[#6B5E57] hover:text-[#3E2C23] transition-all uppercase tracking-widest border border-[#3E2C23]/10 italic shadow-sm"
                >
                  Sync Read
                </button>
              )}
              {onResolve && (
                <button
                  onClick={() => onResolve(alert.id)}
                  className="text-[10px] font-black px-6 py-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100/50 transition-all uppercase tracking-widest border border-emerald-100 shadow-sm italic"
                >
                  Resolve Audit
                </button>
              )}
              
              <button
                onClick={handleRecommend}
                className="flex items-center gap-3 text-[10px] font-black px-6 py-3 rounded-xl bg-[#E76F2E] hover:scale-[1.02] text-white transition-all uppercase tracking-widest shadow-sm mcd-glow-saffron italic"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                Intelligence Plan
                {recs && (open ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
              </button>

              <Link
                to={`/ontology?q=${encodeURIComponent(alert.title)}`}
                className="flex items-center gap-3 text-[10px] font-black px-6 py-3 rounded-xl bg-white border border-[#3E2C23]/10 text-[#6B5E57] hover:text-[#E76F2E] hover:border-[#E76F2E]/30 transition-all uppercase tracking-widest shadow-sm italic"
              >
                <Network size={14} />
                Explore Graph
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable recommendations panel — Light Mode */}
      {open && (
        <div className="border-t border-slate-50 px-8 pb-8 pt-8 bg-[#FAF5ED]/30">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Activity size={32} className="text-[#E76F2E] animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-[#6B5E57] italic">Asking Gemini for action plan...</p>
            </div>
          )}
          {recError && (
            <p className="text-xs text-red-500 font-bold uppercase tracking-widest py-6 text-center italic">{recError}</p>
          )}
          {recs && (
            <div className="space-y-10">
              {/* Crisis summary — Light Mode */}
              <div className="bg-white rounded-[32px] p-8 border border-[#3E2C23]/5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none text-[#3E2C23]">
                    <Zap size={140} />
                </div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="w-1.5 h-6 bg-[#E76F2E] rounded-full" />
                   <h4 className="text-[10px] font-black text-[#E76F2E] uppercase tracking-[0.3em] italic">Commissioner's Direct Brief</h4>
                </div>
                <p className="text-lg font-black text-[#3E2C23]/90 leading-tight tracking-tight italic relative z-10 antialiased">"{recs.summary}"</p>
              </div>

              {/* Action items — Light Mode */}
              <div>
                <h4 className="text-[10px] font-black text-[#6B5E57] uppercase tracking-[0.4em] mb-8 ml-2 italic">Strategic Action Sequence</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  {recs.actions.map((a, i) => {
                    const ps = PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.short_term;
                    return (
                      <div key={i} className="bg-white rounded-[32px] p-8 border border-[#3E2C23]/5 hover:border-[#E76F2E]/20 transition-all group/action relative overflow-hidden shadow-sm hover:shadow-md">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover/action:scale-110 transition-transform text-[#3E2C23]">
                           <Zap size={40} />
                        </div>
                        <div className="flex items-center gap-4 mb-6 flex-wrap">
                          <span className={`text-[9px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest ${ps.cls}`}>
                            {ps.label}
                          </span>
                          <span className="flex items-center gap-2 text-[9px] font-black text-[#6B5E57] uppercase tracking-widest italic">
                            <Building2 size={14} className="text-blue-500" /> {a.department}
                          </span>
                        </div>
                        <p className="text-lg font-black text-[#3E2C23] mb-3 uppercase tracking-tighter italic">{a.action}</p>
                        <p className="text-xs font-medium text-[#6B5E57] mb-6 leading-relaxed italic opacity-80">Rationale: {a.rationale}</p>
                        <div className="flex items-center gap-3 pt-6 border-t border-slate-50">
                           <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">MCD Success Metric:</span>
                           <p className="text-xs font-black text-[#3E2C23] uppercase tracking-tight italic">{a.kpi}</p>
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
