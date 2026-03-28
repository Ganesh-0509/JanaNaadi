interface BriefData {
  id?: string;
  title: string;
  summary: string;
  scope?: string;
  scope_name?: string;
  key_findings: Array<{
    finding: string;
    sentiment: string;
    topic: string;
    evidence_count: number;
  }>;
  recommendations: Array<{
    action: string;
    priority: string;
    rationale: string;
  }>;
  raw_stats: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    avg_score: number;
  };
  generated_at?: string;
}

interface Props {
  brief: BriefData;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#EAB308',
  low: '#3B82F6',
};

const PRIORITY_LABELS: Record<string, string> = {
  high: '🔴 HIGH PRIORITY',
  medium: '🟡 MEDIUM PRIORITY',
  low: '🔵 LOW PRIORITY',
};

function sentimentIcon(s: string) {
  if (s === 'positive') return '✅';
  if (s === 'negative') return '⚠️';
  return '📋';
}

export default function BriefViewer({ brief }: Props) {
  const dateStr = brief.generated_at
    ? new Date(brief.generated_at).toLocaleDateString('en-IN', { dateStyle: 'long' })
    : new Date().toLocaleDateString('en-IN', { dateStyle: 'long' });
  const sentimentPct = brief.raw_stats.total > 0
    ? Math.round((brief.raw_stats.negative / brief.raw_stats.total) * 100)
    : 0;
  const overallTone =
    brief.raw_stats.avg_score > 0.1 ? 'Predominantly Positive'
    : brief.raw_stats.avg_score < -0.1 ? 'Predominantly Negative'
    : 'Mixed/Neutral';

  return (
    <div className="space-y-0 brief-document" id="brief-print-area">

      {/* ══ DOCUMENT HEADER (letterhead-style) ══ */}
      <div className="relative overflow-hidden rounded-t-2xl border-x border-t border-[#2FA4D7]/30 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-6 py-5">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-white/50 to-green-500 opacity-70" />
        <div className="flex items-start justify-between gap-4 mt-1">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🇮🇳</span>
            <div>
              <div className="text-[10px] font-bold tracking-[0.18em] text-[#2FA4D7] uppercase">
                Government Intelligence — JanaNaadi Platform
              </div>
              <div className="text-xs font-semibold text-content-secondary mt-0.5">
                {brief.scope_name || brief.scope || 'Regional'} Policy Intelligence Brief
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-semibold tracking-wider text-red-400 uppercase border border-red-500/30 rounded px-2 py-0.5 bg-red-500/10 mb-1">
              RESTRICTED
            </div>
            <div className="text-[10px] text-content-secondary">{dateStr}</div>
          </div>
        </div>
      </div>

      {/* ══ TITLE SECTION ══ */}
      <div className="bg-surface-base border-x border-white/10 px-6 py-4">
        <h2 className="text-xl font-bold text-white leading-tight mb-1">{brief.title}</h2>
        <div className="flex flex-wrap items-center gap-4 text-xs text-content-secondary">
          <span className={`font-semibold ${
            brief.raw_stats.avg_score > 0.1 ? 'text-emerald-400'
            : brief.raw_stats.avg_score < -0.1 ? 'text-red-400'
            : 'text-yellow-400'
          }`}>Overall Tone: {overallTone}</span>
          <span>·</span>
          <span>Based on {brief.raw_stats.total} citizen voices</span>
          <span>·</span>
          <span>{sentimentPct}% negative sentiment</span>
        </div>
      </div>

      {/* ══ STATS ROW ══ */}
      <div className="grid grid-cols-4 gap-px bg-slate-700/40 border-x border-white/10">
        {[
          { label: 'Total Voices', value: brief.raw_stats.total, color: 'text-white' },
          { label: 'Positive', value: brief.raw_stats.positive, color: 'text-emerald-400' },
          { label: 'Negative', value: brief.raw_stats.negative, color: 'text-red-400' },
          { label: 'Neutral', value: brief.raw_stats.neutral, color: 'text-yellow-400' },
        ].map((s) => (
          <div key={s.label} className="bg-background-200 px-4 py-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-content-secondary uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-background-200 border-x border-white/10 px-6 py-5 space-y-5">

        {/* Executive Summary */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold tracking-[0.15em] text-content-secondary uppercase">Executive Summary</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>
          <p className="text-sm text-content-primary leading-relaxed bg-surface-base rounded-xl px-4 py-3 border border-white/10">
            {brief.summary}
          </p>
        </div>

        {/* Key Findings */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold tracking-[0.15em] text-content-secondary uppercase">Key Findings</span>
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-[10px] text-content-secondary">{brief.key_findings.length} findings</span>
          </div>
          <div className="space-y-2.5">
            {brief.key_findings.map((f, i) => (
              <div
                key={i}
                className="rounded-xl p-4 border-l-4 bg-surface-base"
                style={{
                  borderLeftColor: f.sentiment === 'positive' ? '#22C55E' : f.sentiment === 'negative' ? '#EF4444' : '#EAB308',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{sentimentIcon(f.sentiment)}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-700 text-content-primary">{f.topic}</span>
                  <span className="text-xs text-content-secondary">{f.evidence_count} citizen mentions</span>
                </div>
                <p className="text-sm text-content-primary leading-relaxed">{f.finding}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold tracking-[0.15em] text-content-secondary uppercase">Policy Recommendations</span>
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-[10px] text-content-secondary">Ordered by priority</span>
          </div>
          <div className="space-y-2.5">
            {brief.recommendations.map((r, i) => (
              <div key={i} className="bg-surface-base rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-black text-content-secondary w-6 text-center bg-slate-700 rounded py-0.5">{i + 1}</span>
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded"
                    style={{
                      color: PRIORITY_COLORS[r.priority] || '#3B82F6',
                      backgroundColor: `${PRIORITY_COLORS[r.priority] || '#3B82F6'}18`,
                    }}
                  >
                    {PRIORITY_LABELS[r.priority] || r.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white mb-1">{r.action}</p>
                <p className="text-xs text-content-secondary leading-relaxed">{r.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ DOCUMENT FOOTER ══ */}
      <div className="rounded-b-2xl border border-white/10 bg-background-200 px-6 py-3 flex items-center justify-between">
        <div className="text-[10px] text-content-secondary">
          Generated by JanaNaadi AI Intelligence Platform &bull; {dateStr}
        </div>
        <div className="text-[10px] text-content-secondary">
          FOR OFFICIAL USE ONLY — NOT FOR PUBLIC DISTRIBUTION
        </div>
      </div>
    </div>
  );
}

