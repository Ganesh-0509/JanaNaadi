import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Landmark,
  ShieldHalf,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import TopicCard from '../components/TopicCard';
import KeywordCloud from '../components/KeywordCloud';
import { TableRowSkeleton } from '../components/Skeleton';
import { formatNumber } from '../utils/formatters';
import { useLivePulse } from '../hooks/useLivePulse';
import { useLiveStream } from '../hooks/useLiveStream';
import { resolveMcdEntity } from '../utils/wardMapping';
import { type Pulse, type StateRanking, type TrendingTopic } from '../types/api';

type Hotspot = {
  state_id: number;
  state: string;
  state_code: string;
  urgency_score: number;
  avg_sentiment: number;
  volume: number;
};

type NewsCard = {
  title: string;
  link: string | null;
  summary: string;
  source: string;
  published: string;
};

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'have', 'has', 'had', 'are', 'was', 'were', 'not',
  'you', 'your', 'our', 'but', 'all', 'any', 'can', 'will', 'about', 'into', 'out', 'just', 'more', 'very',
  'they', 'them', 'their', 'there', 'what', 'when', 'where', 'why', 'how', 'who', 'which', 'should', 'would',
  'could', 'than', 'then', 'also', 'because', 'been', 'being', 'over', 'under', 'after', 'before', 'near', 'ward',
  'delhi', 'mcd', 'civic', 'issues', 'issue', 'please', 'need', 'needs', 'still', 'much', 'many', 'some', 'make',
  'made', 'doing', 'done', 'across', 'within', 'without', 'through', 'between', 'today', 'yesterday',
]);

function sanitizeTopic(topic: string | null | undefined): string {
  const val = (topic ?? '').trim();
  return val.length > 0 ? val : 'General civic issues';
}

function tokenizeKeywords(text: string): string[] {
  return (text.toLowerCase().match(/[a-z]{3,}/g) ?? [])
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function sentimentLed(score: number): { label: string; color: string } {
  if (score <= -0.12) {
    return { label: 'critical', color: '#ef4444' };
  }
  if (score <= 0.08) {
    return { label: 'monitor', color: '#facc15' };
  }
  return { label: 'stable', color: '#22c55e' };
}

export default function PublicDashboard() {
  const { pulse: livePulse, status: pulseStatus } = useLivePulse();
  const { entries: liveEntries, status: streamStatus } = useLiveStream(300);

  const dashboardData = useMemo(() => {
    const delhiEntries = liveEntries.filter((entry) => {
      const combined = `${entry.state ?? ''} ${entry.ward ?? ''} ${entry.text ?? ''}`.toLowerCase();
      return combined.includes('delhi') || combined.includes('mcd') || entry.ward_id !== null || (entry.ward ?? '').trim().length > 0;
    });

    const byEntity = new Map<string, {
      state_code: string;
      ward_id: number | null;
      label: string;
      zone: string;
      volume: number;
      sentimentTotal: number;
      positive: number;
      negative: number;
      neutral: number;
    }>();
    const byTopic = new Map<string, { mentions: number; scoreTotal: number }>();
    const keywordCounts = new Map<string, number>();

    let sentimentTotal = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    for (const entry of delhiEntries) {
      const score = Number(entry.sentiment_score ?? 0);
      sentimentTotal += score;

      if (entry.sentiment === 'positive') positiveCount += 1;
      else if (entry.sentiment === 'negative') negativeCount += 1;
      else neutralCount += 1;

      const resolved = resolveMcdEntity({
        wardId: entry.ward_id,
        ward: entry.ward,
        state: entry.state,
        text: entry.text,
      });

      const entityKey = resolved.stateCode;
      const current = byEntity.get(entityKey) ?? {
        state_code: resolved.stateCode,
        ward_id: resolved.wardId,
        label: resolved.label,
        zone: resolved.zone,
        volume: 0,
        sentimentTotal: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
      };

      current.volume += 1;
      current.sentimentTotal += score;
      if (entry.sentiment === 'positive') current.positive += 1;
      else if (entry.sentiment === 'negative') current.negative += 1;
      else current.neutral += 1;
      byEntity.set(entityKey, current);

      const topic = sanitizeTopic(entry.topic);
      const topicCurrent = byTopic.get(topic) ?? { mentions: 0, scoreTotal: 0 };
      topicCurrent.mentions += 1;
      topicCurrent.scoreTotal += score;
      byTopic.set(topic, topicCurrent);

      for (const token of tokenizeKeywords(entry.text ?? '')) {
        keywordCounts.set(token, (keywordCounts.get(token) ?? 0) + 1);
      }
    }

    const entityValues = Array.from(byEntity.values());

    const wards: StateRanking[] = entityValues
      .map((stats, index) => ({
        state_id: stats.ward_id ?? index + 1001,
        state: stats.label,
        state_code: stats.state_code,
        avg_sentiment: stats.volume > 0 ? stats.sentimentTotal / stats.volume : 0,
        volume: stats.volume,
        top_issue: stats.zone,
      }))
      .sort((a, b) => b.avg_sentiment - a.avg_sentiment);

    const trending: TrendingTopic[] = Array.from(byTopic.entries())
      .map(([topic, stats]) => ({
        topic,
        mention_count: stats.mentions,
        sentiment_trend: stats.mentions > 0 ? stats.scoreTotal / stats.mentions : 0,
        seven_day_change: 0,
      }))
      .sort((a, b) => b.mention_count - a.mention_count)
      .slice(0, 10);

    const keywords = Array.from(keywordCounts.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 40);

    const hotspots: Hotspot[] = entityValues
      .map((stats, index) => {
        const avg = stats.volume > 0 ? stats.sentimentTotal / stats.volume : 0;
        const volNorm = 1 - Math.exp(-stats.volume / 50);
        const negIntensity = Math.max(0, -avg);
        const urgency = Math.max(0, Math.min(1, 0.5 * negIntensity + 0.5 * volNorm));
        return {
          state_id: stats.ward_id ?? index + 1001,
          state: stats.label,
          state_code: stats.state_code,
          urgency_score: urgency,
          avg_sentiment: avg,
          volume: stats.volume,
        };
      })
      .sort((a, b) => b.urgency_score - a.urgency_score)
      .slice(0, 10);

    const mcdNews: NewsCard[] = delhiEntries.slice(0, 6).map((entry) => ({
      title: entry.text.length > 92 ? `${entry.text.slice(0, 92)}...` : entry.text,
      link: entry.source_url,
      summary: entry.text,
      source: entry.source,
      published: entry.receivedAt ? new Date(entry.receivedAt).toLocaleTimeString() : 'Now',
    }));

    const pulseFromEntries: Pulse | null = delhiEntries.length > 0
      ? {
          total_entries_24h: delhiEntries.length,
          avg_sentiment: sentimentTotal / delhiEntries.length,
          positive_count: positiveCount,
          negative_count: negativeCount,
          neutral_count: neutralCount,
          top_3_issues: Array.from(byTopic.entries())
            .map(([topic, stats]) => ({ topic, count: stats.mentions }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3),
          top_3_positive: [],
          language_breakdown: {},
        }
      : null;

    return {
      wards,
      trending,
      keywords,
      hotspots,
      mcdNews,
      pulseFromEntries,
    };
  }, [liveEntries]);

  const pulse: Pulse | null = useMemo(() => {
    if (livePulse) {
      return {
        total_entries_24h: livePulse.total_entries_24h,
        avg_sentiment: livePulse.avg_sentiment,
        positive_count: livePulse.positive_count,
        negative_count: livePulse.negative_count,
        neutral_count: livePulse.neutral_count,
        top_3_issues: livePulse.top_3_issues,
        top_3_positive: [],
        language_breakdown: {},
      };
    }
    return dashboardData.pulseFromEntries;
  }, [dashboardData.pulseFromEntries, livePulse]);

  const wards = dashboardData.wards;
  const trending = dashboardData.trending;
  const keywords = dashboardData.keywords;
  const hotspots = dashboardData.hotspots;
  const mcdNews = dashboardData.mcdNews;

  const loading = useMemo(() => {
    return streamStatus === 'connecting' && liveEntries.length === 0 && !pulse;
  }, [liveEntries.length, pulse, streamStatus]);

  const avgSentiment = pulse?.avg_sentiment ?? 0;
  const govPerformanceIndex = Math.max(0, Math.min(100, ((avgSentiment + 1) / 2) * 100));
  const activeWardCount = wards.filter((w) => w.volume > 0).length;
  const wardCoverage = activeWardCount || wards.length || hotspots.length;
  const topHotspot = hotspots.length > 0 ? hotspots[0] : null;
  const topHotspotUrgencyPct = topHotspot ? Math.round((topHotspot.urgency_score ?? 0) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen space-y-8 bg-[#0B0C10] p-6 text-slate-100">
        <TableRowSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative space-y-5 overflow-hidden bg-[#0B0C10] p-4 text-slate-100 md:p-6"
    >
      <div className="pointer-events-none absolute -left-16 top-0 h-72 w-72 rounded-full bg-[#00E5FF]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-[#FF8C42]/10 blur-3xl" />

      <section className="relative z-10 rounded-2xl border border-[#1a1f2b] bg-[#0f1219]/95 p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#00E5FF]/20 bg-[#00E5FF]/10 text-[#00E5FF]">
              <Users size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-100 md:text-2xl">
                Community Core Command Grid
              </h1>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Municipal Corporation of Delhi | {formatNumber(wardCoverage)} mapped entities
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/10 px-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.8)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#9cefff]">
              {streamStatus === 'connected' && pulseStatus === 'connected' ? 'Live Data Signal' : 'Signal Syncing'}
            </span>
          </div>
        </div>
      </section>

      <section className="relative z-10 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#1a1f2b] bg-[#111622] p-5">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-slate-400">
            <span>Top Hotspot Urgency</span>
            <Landmark size={14} className="text-[#FF8C42]" />
          </div>
          <div className="font-mono text-3xl font-black text-[#FF8C42]">{topHotspotUrgencyPct}%</div>
          <div className="mt-2 text-xs uppercase tracking-[0.08em] text-slate-300">{topHotspot?.state || 'MCD Strategic Center'}</div>
        </div>

        <div className="rounded-2xl border border-[#1a1f2b] bg-[#111622] p-5">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-slate-400">
            <span>Gov Performance Index</span>
            <ShieldHalf size={14} className="text-[#00E5FF]" />
          </div>
          <div className="font-mono text-3xl font-black text-[#00E5FF]">{govPerformanceIndex.toFixed(1)}%</div>
          <div className="mt-2 text-xs uppercase tracking-[0.08em] text-slate-300">
            {govPerformanceIndex >= 70 ? 'Systems Optimal' : 'Needs Attention'}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1a1f2b] bg-[#111622] p-5">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-slate-400">
            <span>Active Realities Sync</span>
            <Zap size={14} className="text-[#00E5FF]" />
          </div>
          <div className="font-mono text-3xl font-black text-slate-100">{formatNumber(pulse?.total_entries_24h ?? 0)}</div>
          <div className="mt-2 text-xs uppercase tracking-[0.08em] text-slate-300">Integrated across {formatNumber(wardCoverage)} entities</div>
        </div>

        <div className="rounded-2xl border border-[#1a1f2b] bg-[#111622] p-5">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-slate-400">
            <span>Negative Signals</span>
            <Activity size={14} className="text-[#FF8C42]" />
          </div>
          <div className="font-mono text-3xl font-black text-[#FF8C42]">{formatNumber(pulse?.negative_count ?? 0)}</div>
          <div className="mt-2 text-xs uppercase tracking-[0.08em] text-slate-300">Critical stream monitoring</div>
        </div>
      </section>

      <section className="relative z-10 overflow-hidden rounded-2xl border border-[#1a1f2b] bg-[#0f1219]/95">
        <div className="flex flex-col gap-4 border-b border-[#1d2331] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-100 md:text-xl">
              Ward Integrity Rankings
            </h2>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
              Sentiment-volume matrix across {formatNumber(wards.length || wardCoverage)} mapped entities
            </p>
          </div>
          <Link
            to="/compare"
            className="inline-flex items-center gap-2 rounded-lg border border-[#00E5FF]/35 bg-[#00E5FF]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9cefff]"
          >
            Full Matrix Audit <ArrowRight size={12} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1d2331] bg-[#0d1017] text-left">
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-400">Rank</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-400">Ward / Zone</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-400">ID</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-400">Integrity</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-400">Volume</th>
                <th className="px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {wards.length > 0 ? wards.slice(0, 8).map((w, i) => {
                const led = sentimentLed(w.avg_sentiment);
                return (
                  <tr key={w.state_code} className="border-b border-[#151a25] hover:bg-[#121826]">
                    <td className="px-4 py-3 font-mono text-sm font-bold text-slate-400">#{String(i + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3 text-sm font-semibold uppercase tracking-[0.05em] text-slate-100">{w.state}</td>
                    <td className="px-4 py-3 font-mono text-sm text-[#9cefff]">{w.state_code}</td>
                    <td className={`px-4 py-3 font-mono text-sm font-black ${w.avg_sentiment > 0 ? 'text-[#22c55e]' : 'text-[#FF8C42]'}`}>
                      {w.avg_sentiment > 0 ? '+' : ''}{w.avg_sentiment.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-slate-300">{formatNumber(w.volume)}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: led.color,
                            boxShadow: `0 0 10px ${led.color}`,
                          }}
                        />
                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{led.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    No ward ranking data available right now
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="relative z-10 rounded-2xl border border-[#1a1f2b] bg-[#0f1219]/95 p-4 md:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#FF8C42]/30 bg-[#FF8C42]/10 text-[#FF8C42]">
            <TrendingUp size={16} />
          </div>
          <h2 className="text-lg font-black uppercase tracking-tight text-slate-100 md:text-xl">
            Real-Time MCD Intelligence Feed
          </h2>
          <div className="ml-auto inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9cefff]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.75)]" /> RSS active
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {mcdNews.slice(0, 6).map((n, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -3 }}
              className="flex h-full flex-col rounded-xl border border-[#1d2331] bg-[#111622] p-4"
            >
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.13em] text-[#FF8C42]">{n.source}</div>
              <h4 className="mb-3 text-sm font-bold leading-tight text-slate-100">{n.title}</h4>
              <p className="mb-4 line-clamp-3 text-xs leading-relaxed text-slate-400">{n.summary}</p>
              <div className="mt-auto flex items-center justify-between border-t border-[#1d2331] pt-3">
                <span className="font-mono text-[11px] text-slate-500">{n.published || 'Just now'}</span>
                <a
                  href={n.link || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[#9cefff]"
                >
                  Read <ArrowRight size={11} />
                </a>
              </div>
            </motion.div>
          ))}
          {mcdNews.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-[#1d2331] bg-[#111622] py-12 text-center">
              <Activity size={42} className="mx-auto mb-3 text-slate-600" />
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Awaiting Live Source Events</p>
            </div>
          )}
        </div>
      </section>

      <section className="relative z-10 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-2xl border border-[#1a1f2b] bg-[#0f1219]/95 p-4 xl:col-span-3">
          <h2 className="mb-4 text-lg font-black uppercase tracking-tight text-slate-100 md:text-xl">
            Crisis Intensity Areas
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {trending.length > 0 ? trending.slice(0, 6).map((t) => (
              <TopicCard
                key={t.topic}
                topic={t.topic}
                count={t.mention_count}
                sentiment={t.sentiment_trend > 0 ? 'positive' : t.sentiment_trend < 0 ? 'negative' : 'neutral'}
                onClick={() => {}}
              />
            )) : (
              <div className="col-span-2 py-10 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Loading trending topics
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#1a1f2b] bg-[#0f1219]/95 p-4 xl:col-span-2">
          <h2 className="mb-4 text-lg font-black uppercase tracking-tight text-slate-100 md:text-xl">
            Discourse Keywords
          </h2>
          <div className="min-h-[240px]">
            {keywords.length > 0 ? (
              <KeywordCloud keywords={keywords} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Loading keywords
              </div>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
