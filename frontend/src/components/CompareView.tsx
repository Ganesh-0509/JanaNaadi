import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { formatScore } from '../utils/formatters';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface CompareItem {
  id: number;
  name: string;
  avg_sentiment: number;
  top_issue: string | null;
  top_topics: string[];
  volume: number;
  positive: number;
  negative: number;
  neutral: number;
  urgency_score: number;
}

interface Props {
  items: CompareItem[];
}

const PALETTE = ['#3B82F6', '#F59E0B', '#22C55E'];
const SENTIMENT_COLORS = { positive: '#22C55E', negative: '#EF4444', neutral: '#94A3B8' };

function SentimentArrow({ score }: { score: number }) {
  if (score > 0.1) return <TrendingUp size={14} className="text-emerald-400 inline" />;
  if (score < -0.1) return <TrendingDown size={14} className="text-red-400 inline" />;
  return <Minus size={14} className="text-[#6B5E57] inline" />;
}

function UrgencyBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct > 60 ? 'bg-red-500' : pct > 35 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#6B5E57] w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function CompareView({ items }: Props) {
  // ----- Bar chart: sentiment + volume -----
  const barData = items.map((item, i) => ({
    name: item.name,
    sentiment: parseFloat(item.avg_sentiment.toFixed(3)),
    volume: item.volume,
    fill: PALETTE[i % PALETTE.length],
  }));

  // ----- Stacked sentiment breakdown -----
  const stackData = items.map((item, i) => ({
    name: item.name,
    Positive: item.positive,
    Negative: item.negative,
    Neutral: item.neutral,
    fill: PALETTE[i % PALETTE.length],
  }));

  // ----- Radar chart (normalized 0-100 across dimensions) -----
  const maxVol = Math.max(...items.map((i) => i.volume), 1);
  const radarData = [
    { metric: 'Volume', ...Object.fromEntries(items.map((it) => [it.name, Math.round((it.volume / maxVol) * 100)])) },
    { metric: 'Positivity', ...Object.fromEntries(items.map((it) => [it.name, Math.round(Math.max(0, it.avg_sentiment + 1) * 50)])) },
    { metric: 'Safety', ...Object.fromEntries(items.map((it) => [it.name, Math.round((1 - it.urgency_score) * 100)])) },
    { metric: 'Engagement', ...Object.fromEntries(items.map((it) => [it.name, Math.min(100, Math.round((it.positive + it.negative) / Math.max(it.volume, 1) * 100))])) },
    { metric: 'Neutral%', ...Object.fromEntries(items.map((it) => [it.name, Math.round(it.neutral / Math.max(it.volume, 1) * 100)])) },
  ];

  // ----- Winner badges -----
  const bestSentiment = [...items].sort((a, b) => b.avg_sentiment - a.avg_sentiment)[0];
  const mostVoices = [...items].sort((a, b) => b.volume - a.volume)[0];
  const leastUrgent = [...items].sort((a, b) => a.urgency_score - b.urgency_score)[0];

  return (
    <div className="space-y-8">

      {/* Winner row */}
      <div className="grid grid-cols-3 gap-4 text-center text-xs">
        {[
          { label: '🌟 Best Sentiment', winner: bestSentiment },
          { label: '📢 Most Voices', winner: mostVoices },
          { label: '🛡️ Least Urgent', winner: leastUrgent },
        ].map(({ label, winner }) => (
          <div key={label} className="bg-slate-700/40 rounded-xl p-3 border border-slate-600">
            <div className="text-[#6B5E57] mb-1">{label}</div>
            <div className="font-bold text-white">{winner?.name ?? '—'}</div>
          </div>
        ))}
      </div>

      {/* Side-by-side stat cards */}
      <div className={`grid gap-4 ${items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {items.map((item, i) => {
          const total = Math.max(item.volume, 1);
          const posP = Math.round((item.positive / total) * 100);
          const negP = Math.round((item.negative / total) * 100);
          const neuP = 100 - posP - negP;
          return (
            <div key={item.id}
              className="bg-slate-700/50 rounded-2xl p-5 border border-slate-600 space-y-4"
              style={{ borderTopColor: PALETTE[i % PALETTE.length], borderTopWidth: 3 }}
            >
              <div className="font-bold text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                {item.name}
              </div>

              {/* Sentiment score */}
              <div>
                <div className="text-xs text-[#6B5E57] mb-1">Avg Sentiment</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <SentimentArrow score={item.avg_sentiment} />
                  <span className={item.avg_sentiment > 0 ? 'text-emerald-400' : item.avg_sentiment < 0 ? 'text-red-400' : 'text-[#6B5E57]'}>
                    {formatScore(item.avg_sentiment)}
                  </span>
                </div>
              </div>

              {/* Sentiment bar */}
              <div>
                <div className="text-xs text-[#6B5E57] mb-1">Sentiment Split</div>
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  <div style={{ width: `${posP}%`, background: SENTIMENT_COLORS.positive }} className="rounded-l-full" />
                  <div style={{ width: `${negP}%`, background: SENTIMENT_COLORS.negative }} />
                  <div style={{ width: `${neuP}%`, background: SENTIMENT_COLORS.neutral }} className="rounded-r-full" />
                </div>
                <div className="flex justify-between text-[10px] mt-1 text-[#6B5E57]">
                  <span className="text-emerald-400">{posP}% pos</span>
                  <span className="text-red-400">{negP}% neg</span>
                  <span>{neuP}% neu</span>
                </div>
              </div>

              {/* Urgency */}
              <div>
                <div className="text-xs text-[#6B5E57] mb-1 flex items-center gap-1">
                  <AlertTriangle size={10} /> Urgency
                </div>
                <UrgencyBar value={item.urgency_score} />
              </div>

              {/* Volume */}
              <div className="flex justify-between text-sm">
                <span className="text-[#6B5E57]">Total Voices</span>
                <span className="font-semibold">{item.volume.toLocaleString()}</span>
              </div>

              {/* Top topics */}
              <div>
                <div className="text-xs text-[#6B5E57] mb-2">Top Issues</div>
                <div className="flex flex-wrap gap-1">
                  {(item.top_topics || [item.top_issue]).filter(Boolean).map((t) => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[#2FA4D7]/15 text-[#2FA4D7]">
                      {t}
                    </span>
                  ))}
                  {!(item.top_topics?.length) && !item.top_issue && (
                    <span className="text-[#6B5E57] text-xs">No data</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sentiment score bar chart */}
      <div>
        <h3 className="text-sm font-semibold text-[#6B5E57]/60 mb-3">Sentiment Score</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[-1, 1]} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={(v: number) => [v.toFixed(3), 'Sentiment']}
            />
            <Bar dataKey="sentiment" radius={[6, 6, 0, 0]}>
              {barData.map((entry, i) => (
                <Cell key={i} fill={
                  entry.sentiment > 0.1 ? '#22C55E'
                  : entry.sentiment < -0.1 ? '#EF4444'
                  : '#94A3B8'
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stacked sentiment breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-[#6B5E57]/60 mb-3">Voice Volume Breakdown</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stackData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Positive" stackId="a" fill={SENTIMENT_COLORS.positive} radius={[0, 0, 0, 0]} />
            <Bar dataKey="Negative" stackId="a" fill={SENTIMENT_COLORS.negative} />
            <Bar dataKey="Neutral" stackId="a" fill={SENTIMENT_COLORS.neutral} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar chart */}
      {items.length >= 2 && (
        <div>
          <h3 className="text-sm font-semibold text-[#6B5E57]/60 mb-3">Multi-dimension Radar</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} />
              {items.map((item, i) => (
                <Radar
                  key={item.id}
                  name={item.name}
                  dataKey={item.name}
                  stroke={PALETTE[i % PALETTE.length]}
                  fill={PALETTE[i % PALETTE.length]}
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
