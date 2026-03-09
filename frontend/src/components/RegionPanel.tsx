import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { SENTIMENT_COLORS } from '../utils/colors';
import { Link } from 'react-router-dom';
import { getRegionAnalysis } from '../api/analysis';

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

  // Use analysis data if available, otherwise fall back to heatmap data
  const posCount = analysis?.sentiment_distribution?.positive ?? region.positive_count ?? 0;
  const negCount = analysis?.sentiment_distribution?.negative ?? region.negative_count ?? 0;
  const neuCount = analysis?.sentiment_distribution?.neutral ?? region.neutral_count ?? 0;
  const total = posCount + negCount + neuCount;
  const pos = total > 0 ? Math.round((posCount / total) * 100) : 0;
  const neg = total > 0 ? Math.round((negCount / total) * 100) : 0;
  const neu = Math.max(0, 100 - pos - neg);

  // Convert -1..+1 to 0..100 score
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

  // Top issues from analysis
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

  // If we have dominant_topic but no analysis yet, show it
  if (topIssues.length === 0 && region.dominant_topic) {
    topIssues.push({ topic: region.dominant_topic, sentiment: 'neutral' });
  }

  const badgeColors: Record<string, string> = {
    positive: 'bg-green-500',
    neutral: 'bg-yellow-500',
    negative: 'bg-red-500',
  };

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-md border-l border-slate-700/50 shadow-2xl z-[1000] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
        <h2 className="font-bold text-lg text-white">{region.name}</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-full transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* Big Sentiment Score */}
        <div className="text-center">
          <div className="text-6xl font-extrabold tracking-tight" style={{ color: scoreColor }}>
            {scoreNum}
          </div>
          <div className="text-xs text-slate-400 mt-1 uppercase tracking-wider">Sentiment Score</div>
        </div>

        {/* Donut Chart */}
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

        {/* Distribution Labels */}
        <div className="flex justify-center gap-6 text-center">
          <div>
            <div className="flex items-center gap-1.5 justify-center">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-slate-400">Positive</span>
            </div>
            <div className="text-sm font-bold text-white">{pos}%</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 justify-center">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-xs text-slate-400">Neutral</span>
            </div>
            <div className="text-sm font-bold text-white">{neu}%</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 justify-center">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-slate-400">Negative</span>
            </div>
            <div className="text-sm font-bold text-white">{neg}%</div>
          </div>
        </div>

        {/* Top Issues */}
        {topIssues.length > 0 && (
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Top Issues</div>
            <div className="space-y-2">
              {topIssues.map((issue, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2.5 border border-slate-700/40">
                  <span className="text-sm text-white font-medium">{issue.topic}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full text-white font-medium ${badgeColors[issue.sentiment]}`}>
                    {issue.sentiment}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voices Count */}
        <div className="text-center text-sm text-slate-400">
          <span className="font-semibold text-white">{total.toLocaleString('en-IN')}</span> voices analyzed
        </div>

        {/* Action Button */}
        <Link
          to={`/analysis/${region.type || 'state'}/${region.id}`}
          className="block w-full text-center py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors"
        >
          View Detailed Analysis
        </Link>

        {loadingAnalysis && (
          <div className="text-center text-xs text-slate-500">Loading details...</div>
        )}
      </div>
    </div>
  );
}
