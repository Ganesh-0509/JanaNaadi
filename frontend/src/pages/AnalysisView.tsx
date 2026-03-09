import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getRegionAnalysis, getComparison, searchEntries } from '../api/analysis';
import { useSentimentTrend } from '../hooks/useSentimentTrend';
import SentimentGauge from '../components/SentimentGauge';
import TrendChart from '../components/TrendChart';
import CompareView from '../components/CompareView';
import VoiceTable from '../components/VoiceTable';
import StatCard from '../components/StatCard';
import { formatNumber, formatScore } from '../utils/formatters';
import { useFilters } from '../context/FilterContext';

export default function AnalysisView() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const { filters } = useFilters();
  const scopeId = Number(id);
  const scope = type || 'constituency';

  const [analysis, setAnalysis] = useState<any>(null);
  const [comparison, setComparison] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'compare' | 'voices'>('overview');

  const { data: trendData, loading: trendLoading } = useSentimentTrend(scope, scopeId);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [a, c, v] = await Promise.all([
          getRegionAnalysis(scope, scopeId),
          getComparison({ scope, ids: [scopeId], period: filters.timeRange }),
          searchEntries({ [`${scope}_id`]: scopeId, limit: 50 }),
        ]);
        setAnalysis(a);
        setComparison(c);
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
        <StatCard label="Total Voices" value={formatNumber(analysis.volume)} icon="📊" />
        <StatCard label="Top Issue" value={analysis.top_topics?.[0]?.topic || '—'} icon="🔥" />
        <StatCard label="Sources" value={analysis.source_breakdown?.length || 0} icon="📡" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit">
        {(['overview', 'compare', 'voices'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              tab === t ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t}
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

      {tab === 'compare' && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="font-bold mb-4">Comparison</h3>
          <CompareView items={comparison} />
        </div>
      )}

      {tab === 'voices' && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h3 className="font-bold mb-4">Citizen Voices</h3>
          <VoiceTable voices={voices} />
        </div>
      )}
    </div>
  );
}
