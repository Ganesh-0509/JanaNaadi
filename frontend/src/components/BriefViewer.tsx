interface BriefData {
  title: string;
  summary: string;
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

export default function BriefViewer({ brief }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">{brief.title}</h2>
        <p className="text-slate-300 leading-relaxed">{brief.summary}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{brief.raw_stats.total}</div>
          <div className="text-xs text-slate-400">Total Voices</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{brief.raw_stats.positive}</div>
          <div className="text-xs text-slate-400">Positive</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{brief.raw_stats.negative}</div>
          <div className="text-xs text-slate-400">Negative</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{brief.raw_stats.neutral}</div>
          <div className="text-xs text-slate-400">Neutral</div>
        </div>
      </div>

      {/* Key Findings */}
      <div>
        <h3 className="font-bold mb-3">Key Findings</h3>
        <div className="space-y-3">
          {brief.key_findings.map((f, i) => (
            <div key={i} className="bg-slate-700/50 rounded-lg p-4 border-l-4"
              style={{
                borderLeftColor: f.sentiment === 'positive' ? '#22C55E' : f.sentiment === 'negative' ? '#EF4444' : '#EAB308',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-600">{f.topic}</span>
                <span className="text-xs text-slate-400">{f.evidence_count} mentions</span>
              </div>
              <p className="text-sm">{f.finding}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="font-bold mb-3">Recommendations</h3>
        <div className="space-y-3">
          {brief.recommendations.map((r, i) => (
            <div key={i} className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold">{i + 1}.</span>
                <span
                  className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                  style={{
                    color: PRIORITY_COLORS[r.priority] || '#3B82F6',
                    backgroundColor: `${PRIORITY_COLORS[r.priority] || '#3B82F6'}20`,
                  }}
                >
                  {r.priority}
                </span>
              </div>
              <p className="text-sm font-medium mb-1">{r.action}</p>
              <p className="text-xs text-slate-400">{r.rationale}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
