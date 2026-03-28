import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getRegionAnalysis, searchEntries, summarizeRegion, getForecast, type ForecastPoint } from '../api/analysis';
import { useSentimentTrend } from '../hooks/useSentimentTrend';
import SentimentGauge from '../components/SentimentGauge';
import TrendChart from '../components/TrendChart';
import VoiceTable from '../components/VoiceTable';
import StatCard from '../components/StatCard';
import { StatCardSkeleton, CardSkeleton } from '../components/Skeleton';
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
  const rawId = id || '0';
  const scope = type || 'state';
  const isNumericId = /^\d+$/.test(rawId);
  const numericId = isNumericId ? Number(rawId) : undefined;

  const [analysis, setAnalysis] = useState<any>(null);
  const [voices, setVoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [voicesPage, setVoicesPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState<'overview' | 'sources' | 'voices'>('overview');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastPoint[]>([]);

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await summarizeRegion(scope, rawId);
      setAiSummary(res.summary);
    } catch (e) {
      console.error('Summarize error:', e);
    } finally {
      setSummarizing(false);
    }
  };

  const exportCSV = () => {
    if (voices.length === 0) return;
    const header = 'text,source,language,sentiment,topic,location,created_at';
    const rows = voices.map((v: any) =>
      [
        `"${(v.text || '').replace(/"/g, '""')}"`,
        v.source || '',
        v.language || '',
        v.sentiment_score ?? '',
        v.topic || '',
        v.location || '',
        v.ingested_at || '',
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voices_${scope}_${rawId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadMoreVoices = async () => {
    setLoadingMore(true);
    const nextPage = voicesPage + 1;
    try {
      const voiceParams: Record<string, any> = isNumericId
        ? { [`${scope}_id`]: numericId, limit: 50, offset: nextPage * 50 }
        : { state: rawId, limit: 50, offset: nextPage * 50 };
      if (filters.topic) voiceParams.topic = filters.topic;
      if (filters.source) voiceParams.source = filters.source;
      if (filters.language) voiceParams.language = filters.language;
      const more = await searchEntries(voiceParams);
      if (more.length < 50) setHasMore(false);
      setVoices((prev) => [...prev, ...more]);
      setVoicesPage(nextPage);
    } catch (e) {
      console.error('Load more error:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  const { data: trendData, loading: trendLoading } = useSentimentTrend(scope, numericId ?? 0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setVoicesPage(0);
      setHasMore(true);
      try {
        const voiceParams: Record<string, any> = isNumericId
          ? { [`${scope}_id`]: numericId, limit: 50 }
          : { state: rawId, limit: 50 };
        if (filters.topic) voiceParams.topic = filters.topic;
        if (filters.source) voiceParams.source = filters.source;
        if (filters.language) voiceParams.language = filters.language;

        const [a, v, fc] = await Promise.all([
          getRegionAnalysis(scope, rawId),
          searchEntries(voiceParams),
          getForecast(scope, rawId).catch(() => []),
        ]);
        setAnalysis(a);
        setVoices(v);
        setForecastData(fc);
      } catch (e) {
        console.error('Analysis load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [scope, rawId, filters.timeRange, filters.topic, filters.source, filters.language]);

  if (loading) {
    return (
      <div className="space-y-6 bg-background-50 p-6 text-content-primary">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-background-200" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded-lg bg-background-200" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-content-secondary">No data found for this region</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 bg-background-50 p-6 text-content-primary"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{analysis.name}</h1>
          <p className="text-sm capitalize text-content-secondary">{scope} Analysis</p>
        </div>
        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
        >
          {summarizing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {summarizing ? 'Analyzing...' : 'Summarize Issues'}
        </button>
      </div>

      {aiSummary && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-secondary-200 bg-secondary-50 p-5"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-700">AI Policy Summary</p>
          <p className="text-sm leading-relaxed text-content-primary">{aiSummary}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Avg Sentiment" value={formatScore(analysis.avg_sentiment)} color={analysis.avg_sentiment > 0 ? 'success' : 'danger'} />
        <StatCard label="Total Voices" value={formatNumber(analysis.sentiment_distribution?.total || 0)} icon="📊" />
        <StatCard label="Top Issue" value={analysis.topic_breakdown?.[0]?.topic || '—'} icon="🔥" />
        <StatCard label="Sources" value={Object.keys(analysis.source_distribution || {}).length} icon="📡" />
      </div>

      <div className="flex w-fit gap-1 rounded-lg border border-[var(--color-border)] bg-surface-muted p-1">
        {(['overview', 'sources', 'voices'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize ${
              tab === t ? 'bg-secondary-500 text-white' : 'text-content-secondary hover:text-content-primary'
            }`}
          >
            {t === 'sources' ? 'Sources & Languages' : t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center rounded-2xl border border-[var(--color-border)] bg-surface-base p-6">
            <h3 className="mb-4 font-bold">Distribution</h3>
            <SentimentGauge
              positive={analysis.sentiment_distribution?.positive || 0}
              negative={analysis.sentiment_distribution?.negative || 0}
              neutral={analysis.sentiment_distribution?.neutral || 0}
              size={200}
            />
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-surface-base p-6 md:col-span-2">
            <h3 className="mb-4 font-bold">Sentiment Trend</h3>
            {forecastData.length > 0 && (() => {
              const last = forecastData[forecastData.length - 1];
              const first = forecastData[0];
              const delta = last.forecast_score - first.forecast_score;
              const isRising = delta > 0.02;
              const isFalling = delta < -0.02;
              const dirColor = isRising ? 'text-emerald-600' : isFalling ? 'text-red-600' : 'text-amber-600';
              const dirBg = isRising ? 'bg-emerald-50 border-emerald-200' : isFalling ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
              const DirIcon = isRising ? TrendingUp : isFalling ? TrendingDown : Minus;
              const label = isRising ? 'Rising' : isFalling ? 'Falling' : 'Stable';
              return (
                <div className={`mb-4 flex items-center gap-4 rounded-xl border px-4 py-3 text-sm ${dirBg}`}>
                  <div className={`flex items-center gap-1.5 font-semibold ${dirColor}`}>
                    <DirIcon size={16} />
                    <span>{label} Mood</span>
                  </div>
                  <div className="text-xs text-content-secondary">
                    Predicted score in 7 days: <span className={`font-bold ${dirColor}`}>{last.forecast_score.toFixed(3)}</span>
                    <span className="ml-2 opacity-60">(range {last.lower.toFixed(2)} to {last.upper.toFixed(2)})</span>
                  </div>
                  <div className="ml-auto hidden text-xs text-content-secondary md:block">AI linear forecast · 30-day history</div>
                </div>
              );
            })()}
            {trendLoading ? (
              <div className="py-10 text-center text-content-secondary">Loading trend...</div>
            ) : (
              <TrendChart data={trendData} forecastData={forecastData} />
            )}
          </div>
        </div>
      )}

      {tab === 'sources' && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-border)] bg-surface-base p-6">
            <h3 className="mb-4 font-bold">Source Breakdown</h3>
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
                        contentStyle={{ background: '#FFFFFF', border: '1px solid rgba(62,44,35,0.12)', borderRadius: 8, fontSize: 12 }}
                        formatter={(val: number) => [`${val} voices`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3">
                    {srcData.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-sm">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-content-secondary">{d.name}</span>
                        <span className="text-content-primary">({Math.round((d.value / totalVoices) * 100)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-surface-base p-6">
            <h3 className="mb-4 font-bold">Language Distribution</h3>
            {(() => {
              const langData = Object.entries(analysis.language_breakdown || {}).sort(([, a], [, b]) => (b as number) - (a as number));
              const maxCount = langData.length > 0 ? (langData[0][1] as number) : 1;
              const langColors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#22C55E', '#06B6D4', '#EF4444', '#F97316', '#14B8A6'];
              return (
                <div className="space-y-3">
                  {langData.map(([code, count], i) => (
                    <div key={code}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-content-secondary">{LANG_LABELS[code] || code}</span>
                        <span className="text-content-primary">{count as number} voices</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-background-100">
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
                    <div className="py-4 text-center text-content-secondary">No language data</div>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-surface-base p-6 md:col-span-2">
            <h3 className="mb-4 font-bold">Top Issues</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {(analysis.topic_breakdown || []).map((t: any, i: number) => (
                <div key={i} className="rounded-xl border border-[var(--color-border)] bg-background-50 p-4 text-center">
                  <div className="text-2xl font-bold text-content-primary">{t.count}</div>
                  <div className="mt-1 text-xs text-content-secondary">{t.topic}</div>
                </div>
              ))}
              {(!analysis.topic_breakdown || analysis.topic_breakdown.length === 0) && (
                <div className="col-span-full py-4 text-center text-content-secondary">No topic data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'voices' && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-surface-base p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold">Citizen Voices ({voices.length})</h3>
            <button
              onClick={exportCSV}
              disabled={voices.length === 0}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-background-100 px-3 py-1.5 text-xs font-medium text-content-primary hover:bg-background-200 disabled:opacity-50"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
          <VoiceTable voices={voices} />
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={loadMoreVoices}
                disabled={loadingMore}
                className="rounded-lg bg-secondary-500 px-6 py-2 text-sm font-medium text-white hover:bg-secondary-600 disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
