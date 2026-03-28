import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { getRegionAnalysis } from '../api/analysis';

const SENTIMENT_COLORS = {
  positive: '#22C55E',
  neutral: '#EAB308',
  negative: '#EF4444',
};

interface RegionData {
  id: number;
  name: string;
  avg_sentiment: number;
  volume: number;
  dominant_topic?: string;
  type?: string;
  positive_count?: number;
  negative_count?: number;
  neutral_count?: number;
}

interface Props {
  region: RegionData | null;
  onClose: () => void;
}

export default function RegionPanel({ region, onClose }: Props) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    if (!region) { setAnalysis(null); return; }
    setLoadingAnalysis(true);
    getRegionAnalysis(region.type || 'state', region.id)
      .then(setAnalysis)
      .catch(() => setAnalysis(null))
      .finally(() => setLoadingAnalysis(false));
  }, [region?.id, region?.type]);

  if (!region) return null;

  const posCount = analysis?.sentiment_distribution?.positive ?? region.positive_count ?? 0;
  const negCount = analysis?.sentiment_distribution?.negative ?? region.negative_count ?? 0;
  const neuCount = analysis?.sentiment_distribution?.neutral ?? region.neutral_count ?? 0;
  const total = posCount + negCount + neuCount;
  const pos = total > 0 ? Math.round((posCount / total) * 100) : 0;
  const neg = total > 0 ? Math.round((negCount / total) * 100) : 0;
  const neu = Math.max(0, 100 - pos - neg);

  const scoreNum = Math.round(((region.avg_sentiment + 1) / 2) * 100);
  const scoreColor = region.avg_sentiment > 0.2
    ? SENTIMENT_COLORS.positive
    : region.avg_sentiment < -0.2
    ? SENTIMENT_COLORS.negative
    : SENTIMENT_COLORS.neutral;

  const pieData = [
    { name: 'Positive', value: pos || 1, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: neu || 1, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: neg || 1, color: SENTIMENT_COLORS.negative },
  ];

  const topIssues: { topic: string; sentiment: string }[] = (analysis?.topic_breakdown || [])
    .slice(0, 5)
    .map((t: any, i: number) => ({
      topic: t.topic,
      sentiment: i === 0 && region.avg_sentiment < -0.3
        ? 'negative'
        : i === 0 && region.avg_sentiment > 0.3
        ? 'positive'
        : 'neutral',
    }));

  if (topIssues.length === 0 && region.dominant_topic) {
    topIssues.push({ topic: region.dominant_topic, sentiment: 'neutral' });
  }

  const badgeColors: Record<string, string> = {
    positive: 'bg-state-success text-white',
    neutral: 'bg-state-warning text-black',
    negative: 'bg-state-danger text-white',
  };

  const trend7d: number[] = analysis?.trend_7d || [];
  let trendDir: 'up' | 'down' | 'flat' = 'flat';
  if (trend7d.length >= 2) {
    const last = trend7d[trend7d.length - 1];
    const prev = trend7d[trend7d.length - 2];
    const diff = last - prev;
    if (diff > 0.05) trendDir = 'up';
    else if (diff < -0.05) trendDir = 'down';
  }

  return (
    <div className="fixed right-0 top-0 z-[1000] h-full w-80 overflow-y-auto border-l border-gray-200 bg-surface-base/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-bold text-content-primary">{region.name}</h2>
        <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-background-100">
          <X size={18} />
        </button>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="text-center">
          <div className="text-5xl font-bold tracking-tight" style={{ color: scoreColor }}>
            {scoreNum}
          </div>
          <div className="mt-2 text-xs uppercase tracking-wider text-content-secondary font-semibold">Sentiment Score</div>
          {trend7d.length >= 2 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {trendDir === 'up' && <TrendingUp size={16} className="text-state-success" />}
              {trendDir === 'down' && <TrendingDown size={16} className="text-state-danger" />}
              {trendDir === 'flat' && <Minus size={16} className="text-content-secondary" />}
              <span className={`text-xs font-semibold ${trendDir === 'up' ? 'text-state-success' : trendDir === 'down' ? 'text-state-danger' : 'text-content-secondary'}`}>
                {trendDir === 'up' ? 'Improving' : trendDir === 'down' ? 'Declining' : 'Stable'} (7d)
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
              >
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-6 text-center">
          <div>
            <div className="flex items-center gap-1.5 justify-center mb-1">
              <span className="w-2 h-2 rounded-full bg-state-success" />
              <span className="text-xs text-content-secondary">Positive</span>
            </div>
            <div className="text-sm font-bold text-content-primary">{pos}%</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 justify-center mb-1">
              <span className="w-2 h-2 rounded-full bg-state-warning" />
              <span className="text-xs text-content-secondary">Neutral</span>
            </div>
            <div className="text-sm font-bold text-content-primary">{neu}%</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 justify-center mb-1">
              <span className="w-2 h-2 rounded-full bg-state-danger" />
              <span className="text-xs text-content-secondary">Negative</span>
            </div>
            <div className="text-sm font-bold text-content-primary">{neg}%</div>
          </div>
        </div>

        {topIssues.length > 0 && (
          <div>
            <div className="mb-4 text-xs font-bold uppercase tracking-wider text-content-secondary">Top Issues</div>
            <div className="space-y-2">
              {topIssues.map((issue, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 bg-background-50 px-3 py-2.5">
                  <span className="text-sm font-medium text-content-primary">{issue.topic}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badgeColors[issue.sentiment]}`}>
                    {issue.sentiment}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-sm text-content-secondary">
          <span className="font-bold text-content-primary">{total.toLocaleString('en-IN')}</span> voices analyzed
        </div>

        <Link
          to={`/analysis/${region.type || 'state'}/${region.id}`}
          className="block w-full rounded-lg bg-secondary-600 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-secondary-700"
        >
          View Detailed Analysis
        </Link>

        {loadingAnalysis && (
          <div className="text-center text-xs text-content-secondary">Loading details...</div>
        )}
      </div>
    </div>
  );
}
