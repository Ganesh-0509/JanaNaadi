import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRegionAnalysis, searchEntries } from '../api/analysis';
import { useSentimentTrend } from '../hooks/useSentimentTrend';
import SentimentGauge from '../components/SentimentGauge';
import TrendChart from '../components/TrendChart';
import VoiceTable from '../components/VoiceTable';
import StatCard from '../components/StatCard';
import { formatNumber, formatScore } from '../utils/formatters';
import { useFilters } from '../context/FilterContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const SOURCE_COLORS: Record<string, string> = {
  twitter: '#1DA1F2',
  news: '#F59E0B',
  reddit: '#FF4500',
  citizen: '#22C55E',
  survey: '#8B5CF6',
  unknown: '#64748B',
};

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
  kn: 'Kannada',
  ml: 'Malayalam',
  gu: 'Gujarati',
};

export default function AnalysisView() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const { filters } = useFilters();
  const scopeId = Number(id);
  const scope = type || 'constituency';

  const [analysis, setAnalysis] = useState<any>(null);
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'sources' | 'voices'>('overview');

  const { data: trendData, loading: trendLoading } = useSentimentTrend(scope, scopeId);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [a, v] = await Promise.all([
          getRegionAnalysis(scope, scopeId),
          searchEntries({ [`${scope}_id`]: scopeId, limit: 50 }),
        ]);
        setAnalysis(a);
        setVoices(v);
      } catch (e) {
        console.error('Analysis load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [scope, scopeId, filters.timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading analysis...</div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">No data found for this region</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{analysis.name}</h1>
        <p className="text-sm text-slate-400 capitalize">{scope} Analysis</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg Sentiment" value={formatScore(analysis.avg_sentiment)} color={analysis.avg_sentiment > 0 ? '#22C55E' : '#EF4444'} />
        <StatCard label="Total Voices" value={formatNumber(analysis.sentiment_distribution?.total || 0)} icon="📊" />
        <StatCard label="Top Issue" value={analysis.topic_breakdown?.[0]?.topic || '—'} icon="🔥" />
        <StatCard label="Sources" value={Object.keys(analysis.source_distribution || {}).length} icon="📡" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
        {(['overview', 'sources', 'voices'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              tab === t ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'sources' ? 'Sources & Languages' : t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Gauge */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col items-center">
            <h3 className="font-bold mb-4">Distribution</h3>
            <SentimentGauge
              positive={analysis.sentiment_distribution?.positive || 0}
              negative={analysis.sentiment_distribution?.negative || 0}
              neutral={analysis.sentiment_distribution?.neutral || 0}
              size={200}
            />
          </div>

          {/* Trend Chart */}
          <div className="md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-bold mb-4">Sentiment Trend</h3>
            {trendLoading ? (
              <div className="text-slate-400 text-center py-10">Loading trend...</div>
            ) : (
              <TrendChart data={trendData} />
            )}
          </div>
        </div>
      )}

      {tab === 'sources' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Source Distribution */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-bold mb-4">Source Breakdown</h3>
            {(() => {
              const srcData = Object.entries(analysis.source_distribution || {}).map(([name, count]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value: count as number,
                color: SOURCE_COLORS[name] || '#64748B',
              }));
              const totalVoices = srcData.reduce((s, d) => s + d.value, 0);
              return (
                <div className="flex flex-col items-center gap-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={srcData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {srcData.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                        formatter={(val: number) => [`${val} voices`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3">
                    {srcData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-slate-300">{d.name}</span>
                        <span className="text-slate-500">({Math.round((d.value / totalVoices) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Language Distribution */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-bold mb-4">Language Distribution</h3>
            {(() => {
              const langData = Object.entries(analysis.language_breakdown || {})
                .sort(([, a], [, b]) => (b as number) - (a as number));
              const maxCount = langData.length > 0 ? (langData[0][1] as number) : 1;
              const langColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#22C55E', '#06B6D4', '#EF4444', '#F97316', '#14B8A6'];
              return (
                <div className="space-y-3">
                  {langData.map(([code, count], i) => (
                    <div key={code}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{LANG_LABELS[code] || code}</span>
                        <span className="text-slate-400">{count as number} voices</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full transition-all"
                          style={{
                            width: `${((count as number) / maxCount) * 100}%`,
                            backgroundColor: langColors[i % langColors.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {langData.length === 0 && (
                    <div className="text-slate-400 text-center py-4">No language data</div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Top Issues Breakdown */}
          <div className="md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-bold mb-4">Top Issues</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {(analysis.topic_breakdown || []).map((t: any, i: number) => (
                <div key={i} className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{t.count}</div>
                  <div className="text-xs text-slate-400 mt-1">{t.topic}</div>
                </div>
              ))}
              {(!analysis.topic_breakdown || analysis.topic_breakdown.length === 0) && (
                <div className="col-span-full text-slate-400 text-center py-4">No topic data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'voices' && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="font-bold mb-4">Citizen Voices ({voices.length})</h3>
          <VoiceTable voices={voices} />
        </div>
      )}
    </div>
  );
}
