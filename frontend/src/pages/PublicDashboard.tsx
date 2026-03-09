import { useState, useEffect } from 'react';
import { getNationalPulse, getStateRankings, getTrendingTopics, getRecentVoices, getAreaPulse } from '../api/public';
import SentimentGauge from '../components/SentimentGauge';
import StatCard from '../components/StatCard';
import TopicCard from '../components/TopicCard';
import { formatNumber } from '../utils/formatters';
import { Link } from 'react-router-dom';
import { Map, ArrowRight, Search, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Pulse {
  total_entries_24h: number;
  avg_sentiment: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  top_3_issues: Array<{ topic: string; count: number }>;
  top_3_positive: Array<{ topic: string; count: number }>;
  language_breakdown: Record<string, number>;
}

interface StateRanking {
  state: string;
  state_code: string;
  avg_sentiment: number;
  volume: number;
  top_issue: string | null;
}

interface TrendingTopic {
  topic: string;
  mention_count: number;
  sentiment_trend: number;
  seven_day_change: number;
}

interface Voice {
  text: string;
  sentiment: string;
  score: number;
  topic: string;
  state: string;
  time: string;
  source: string;
}

interface AreaResult {
  found: boolean;
  state?: string;
  avg_sentiment?: number;
  total_entries?: number;
  positive?: number;
  negative?: number;
  neutral?: number;
  top_issues?: Array<{ topic: string; count: number }>;
  message?: string;
}

export default function PublicDashboard() {
  const { user } = useAuth();
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [states, setStates] = useState<StateRanking[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);

  // Area lookup
  const [areaQuery, setAreaQuery] = useState('');
  const [areaResult, setAreaResult] = useState<AreaResult | null>(null);
  const [areaLoading, setAreaLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, s, t, v] = await Promise.all([
          getNationalPulse(),
          getStateRankings(),
          getTrendingTopics(),
          getRecentVoices(12),
        ]);
        setPulse(p);
        setStates(s);
        setTrending(t);
        setVoices(v);
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAreaSearch = async () => {
    if (!areaQuery.trim()) return;
    setAreaLoading(true);
    try {
      const result = await getAreaPulse(areaQuery.trim());
      setAreaResult(result);
    } catch {
      setAreaResult({ found: false, message: 'Search failed. Try again.' });
    } finally {
      setAreaLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading community pulse...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header — different for public vs authenticated */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {user ? (
              <>
                <TrendingUp size={24} className="text-blue-400" />
                National Analytics
              </>
            ) : (
              <>
                <Users size={24} className="text-emerald-400" />
                Community Pulse
              </>
            )}
          </h1>
          <p className="text-sm text-slate-400">
            {user
              ? 'Governance intelligence dashboard — real-time sentiment analytics'
              : 'See how India feels — powered by citizen voices & AI analysis'}
          </p>
        </div>
        {user ? (
          <Link
            to="/map"
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium"
          >
            <Map size={16} />
            Open Heatmap
            <ArrowRight size={14} />
          </Link>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
          >
            Governance Login <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* Stats Row */}
      {pulse && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Voices" value={formatNumber(pulse.total_entries_24h ?? 0)} icon="📊" />
          <StatCard
            label="Avg Sentiment"
            value={(pulse.avg_sentiment ?? 0).toFixed(2)}
            icon="📈"
            color={(pulse.avg_sentiment ?? 0) > 0 ? '#22C55E' : '#EF4444'}
          />
          <StatCard label="Top Issues" value={String(pulse.top_3_issues?.length ?? 0)} icon="📌" color="#3B82F6" />
          <StatCard label="Languages" value={String(Object.keys(pulse.language_breakdown ?? {}).length)} icon="🌐" color="#A855F7" />
        </div>
      )}

      {/* 🔍 AREA PULSE LOOKUP — unique public feature */}
      {!user && (
        <div className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 rounded-2xl p-6 border border-blue-500/20">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Search size={20} className="text-blue-400" />
            How Does Your Area Feel?
          </h2>
          <div className="flex gap-3">
            <input
              value={areaQuery}
              onChange={(e) => setAreaQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAreaSearch()}
              placeholder="Type a state name... e.g., Tamil Nadu, Maharashtra, Delhi"
              className="flex-1 bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleAreaSearch}
              disabled={areaLoading}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium disabled:opacity-40"
            >
              {areaLoading ? 'Searching...' : 'Lookup'}
            </button>
          </div>

          {areaResult && (
            <div className="mt-4">
              {areaResult.found ? (
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                  <h3 className="font-bold text-lg mb-3">{areaResult.state}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-slate-400 text-xs">Sentiment</div>
                      <div className={`text-xl font-bold ${
                        (areaResult.avg_sentiment ?? 0) > 0.1 ? 'text-emerald-400' :
                        (areaResult.avg_sentiment ?? 0) < -0.1 ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {(areaResult.avg_sentiment ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-slate-400 text-xs">Total Voices</div>
                      <div className="text-xl font-bold">{areaResult.total_entries ?? 0}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-slate-400 text-xs">Positive</div>
                      <div className="text-xl font-bold text-emerald-400">{areaResult.positive ?? 0}</div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="text-slate-400 text-xs">Negative</div>
                      <div className="text-xl font-bold text-red-400">{areaResult.negative ?? 0}</div>
                    </div>
                  </div>
                  {areaResult.top_issues && areaResult.top_issues.length > 0 && (
                    <div className="mt-3 flex gap-2">
                      <span className="text-xs text-slate-400">Top concerns:</span>
                      {areaResult.top_issues.map((issue) => (
                        <span key={issue.topic} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
                          {issue.topic} ({issue.count})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">{areaResult.message}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gauge + Trending Topics */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Gauge */}
        {pulse && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 flex flex-col items-center">
            <h2 className="text-lg font-bold mb-4">Sentiment Distribution</h2>
            <SentimentGauge
              positive={pulse.positive_count ?? 0}
              negative={pulse.negative_count ?? 0}
              neutral={pulse.neutral_count ?? 0}
              size={220}
            />
          </div>
        )}

        {/* Trending Topics */}
        <div className="md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold mb-4">Trending Topics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {trending.map((t) => (
              <TopicCard key={t.topic} topic={t.topic} count={t.mention_count} sentiment={t.sentiment_trend > 0 ? 'positive' : t.sentiment_trend < 0 ? 'negative' : 'neutral'} />
            ))}
          </div>
        </div>
      </div>

      {/* 📢 LIVE VOICES FEED — unique public feature */}
      {!user && voices.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-emerald-400" />
            Live Voices Across India
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {voices.map((v, i) => (
              <div key={i} className={`bg-slate-900/50 rounded-xl p-4 border ${
                v.sentiment === 'positive' ? 'border-emerald-500/20' :
                v.sentiment === 'negative' ? 'border-red-500/20' : 'border-slate-700'
              }`}>
                <p className="text-sm text-slate-300 leading-relaxed line-clamp-2 mb-2">"{v.text}"</p>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{v.state}</span>
                  <div className="flex gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded ${
                      v.sentiment === 'positive' ? 'bg-emerald-500/20 text-emerald-400' :
                      v.sentiment === 'negative' ? 'bg-red-500/20 text-red-400' : 'bg-slate-600/50 text-slate-400'
                    }`}>
                      {v.sentiment}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">{v.topic}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-600/30 text-slate-400">{v.source}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State Rankings — shown to everyone but labeled differently */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="text-lg font-bold mb-4">
          {user ? 'State Sentiment Rankings' : 'How States Are Feeling'}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-3 text-slate-400 font-medium">Rank</th>
                <th className="text-left py-3 px-3 text-slate-400 font-medium">State</th>
                <th className="text-left py-3 px-3 text-slate-400 font-medium">Sentiment</th>
                <th className="text-left py-3 px-3 text-slate-400 font-medium">Volume</th>
                <th className="text-left py-3 px-3 text-slate-400 font-medium">Top Issue</th>
              </tr>
            </thead>
            <tbody>
              {states.map((s, i) => (
                <tr key={s.state_code} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="py-3 px-3 font-bold text-slate-400">{i + 1}</td>
                  <td className="py-3 px-3 font-medium">
                    <Link to={`/analysis/state/${s.state_code}`} className="text-blue-400 hover:underline">
                      {s.state}
                    </Link>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`font-mono ${
                        s.avg_sentiment > 0.2
                          ? 'text-green-400'
                          : s.avg_sentiment < -0.2
                          ? 'text-red-400'
                          : 'text-yellow-400'
                      }`}
                    >
                      {(s.avg_sentiment ?? 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-300">{formatNumber(s.volume ?? 0)}</td>
                  <td className="py-3 px-3 text-slate-400">{s.top_issue || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
