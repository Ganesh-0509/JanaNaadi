import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Flame, FileText, Map, BarChart3, ArrowRight,
  Activity, Users, Target, Globe, Bell, Zap,
} from 'lucide-react';
import { getNationalPulse, getHotspots, getTrendingTopics } from '../api/public';
import { getForecast } from '../api/analysis';
import { formatNumber } from '../utils/formatters';
import { DomainIntelligenceGrid } from '../components/DomainIntelligenceCard';
import { useDomainIntelligence } from '../hooks/useKnowledgeGraph';
import { useNavigate } from 'react-router-dom';

interface Pulse {
  total_entries_24h: number;
  avg_sentiment: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  top_3_issues: Array<{ topic: string; count: number }>;
  language_breakdown: Record<string, number>;
}
interface Hotspot {
  state: string;
  state_code: string;
  urgency_score: number;
  avg_sentiment: number;
  volume: number;
}
interface Topic {
  topic: string;
  mention_count: number;
  sentiment_trend: number;
}

function moodConfig(score: number) {
  if (score > 0.15) return { label: 'Positive', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', Icon: TrendingUp };
  if (score < -0.15) return { label: 'Negative', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', Icon: TrendingDown };
  return { label: 'Mixed', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', Icon: Minus };
}

function urgencyConfig(score: number) {
  if (score >= 0.7) return { bar: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/20', label: 'CRITICAL' };
  if (score >= 0.4) return { bar: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/20', label: 'HIGH' };
  return { bar: 'bg-yellow-400', text: 'text-yellow-400', border: 'border-yellow-500/20', label: 'MODERATE' };
}

export default function GovDashboard() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [forecast, setForecast] = useState<Array<{ forecast_score: number }>>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Fetch domain intelligence data
  const { data: domainIntelligence, isLoading: domainLoading } = useDomainIntelligence({ scope: 'national' });

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  useEffect(() => {
    Promise.all([
      getNationalPulse(),
      getHotspots(6),
      getTrendingTopics(),
      getForecast('national', 0, 7).catch(() => []),
    ]).then(([p, h, t, fc]) => {
      setPulse(p);
      setHotspots(h);
      setTopics(t);
      setForecast(fc);
    }).finally(() => setLoading(false));
  }, []);

  // Memoized computed values for performance
  const criticalCount = useMemo(() => 
    hotspots.filter(h => h.urgency_score >= 0.7).length, 
    [hotspots]
  );
  
  const highCount = useMemo(() => 
    hotspots.filter(h => h.urgency_score >= 0.4 && h.urgency_score < 0.7).length,
    [hotspots]
  );
  
  const mood = useMemo(() => 
    pulse ? moodConfig(pulse.avg_sentiment) : null,
    [pulse]
  );
  
  const { forecastDelta, forecastLabel, forecastColor } = useMemo(() => {
    const delta = forecast.length >= 2
      ? forecast[forecast.length - 1].forecast_score - forecast[0].forecast_score
      : 0;
    const label = delta > 0.03 ? '↑ Rising' : delta < -0.03 ? '↓ Falling' : '→ Stable';
    const color = delta > 0.03 ? 'text-emerald-400' : delta < -0.03 ? 'text-red-400' : 'text-yellow-400';
    return { forecastDelta: delta, forecastLabel: label, forecastColor: color };
  }, [forecast]);
  
  const totalLanguages = useMemo(() => 
    pulse ? Object.keys(pulse.language_breakdown ?? {}).length : 0,
    [pulse]
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-20 bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-slate-800 rounded-2xl" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-800 rounded-2xl" />
          <div className="h-64 bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-6"
    >
      {/* ═══ OFFICIAL HEADER ═══ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-950 via-slate-900 to-slate-900 rounded-2xl p-6 border border-blue-500/30">
        {/* Decorative stripe */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-white/80 to-green-500 opacity-70" />
        <div className="flex items-center justify-between flex-wrap gap-4 mt-1">
          <div className="flex items-center gap-5">
            <div className="text-4xl select-none">🇮🇳</div>
            <div>
              <div className="text-xs font-semibold tracking-[0.2em] text-blue-300 uppercase mb-0.5">
                Government of India — Citizen Intelligence Platform
              </div>
              <h1 className="text-2xl font-bold text-white">National Sentiment Intelligence Brief</h1>
              <p className="text-sm text-slate-400 mt-0.5">{today} &bull; {timeStr} IST &bull; Powered by JanaNaadi AI</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-emerald-400 tracking-wide">LIVE INTELLIGENCE</span>
            </div>
            <div className="text-xs text-slate-500">Auto-refreshes every session</div>
          </div>
        </div>
      </div>

      {/* ═══ KPI STRIP ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Citizen Voices */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users size={16} className="text-blue-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Citizen Voices</span>
          </div>
          <div className="text-3xl font-bold">{formatNumber(pulse?.total_entries_24h ?? 0)}</div>
          <div className="text-xs text-slate-500 mt-1">recorded in 24h</div>
        </div>

        {/* National Mood */}
        <div className={`rounded-2xl p-5 border ${mood?.bg ?? 'bg-slate-800 border-slate-700'} hover:opacity-90 transition-opacity`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center">
              <Activity size={16} className={mood?.color ?? 'text-slate-400'} />
            </div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">National Mood</span>
          </div>
          <div className={`text-3xl font-bold ${mood?.color ?? 'text-slate-200'}`}>{mood?.label ?? '—'}</div>
          <div className="text-xs text-slate-500 mt-1">score: {(pulse?.avg_sentiment ?? 0).toFixed(3)}</div>
        </div>

        {/* Alert States */}
        <div className={`rounded-2xl p-5 border transition-colors ${
          criticalCount > 0 ? 'bg-red-500/10 border-red-500/30' : highCount > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800 border-slate-700'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-700/60 flex items-center justify-center">
              <AlertTriangle size={16} className={criticalCount > 0 ? 'text-red-400' : highCount > 0 ? 'text-amber-400' : 'text-slate-400'} />
            </div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Alert Zones</span>
          </div>
          <div className={`text-3xl font-bold ${criticalCount > 0 ? 'text-red-400' : highCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
            {criticalCount} <span className="text-base font-normal text-slate-500">critical</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{highCount} high priority states</div>
        </div>

        {/* Forecast */}
        <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Target size={16} className="text-purple-400" />
            </div>
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">7-Day Outlook</span>
          </div>
          <div className={`text-3xl font-bold ${forecastColor}`}>{forecastLabel}</div>
          <div className="text-xs text-slate-500 mt-1">AI linear forecast</div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Critical States Panel */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold flex items-center gap-2">
              <Flame size={18} className="text-red-400" />
              States Requiring Attention
            </h2>
            <Link to="/hotspots" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              Full Hotspot Report <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-3">
            {hotspots.slice(0, 6).map((h, i) => {
              const uc = urgencyConfig(h.urgency_score);
              return (
                <div key={h.state_code} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${uc.border} bg-slate-900/30`}>
                  <span className="text-xs text-slate-500 w-5 text-center font-bold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold">{h.state}</span>
                      <span className={`text-[10px] font-bold tracking-wide ${uc.text}`}>{uc.label}</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${h.urgency_score * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className={`h-full ${uc.bar} rounded-full`}
                      />
                    </div>
                  </div>
                  <Link
                    to={`/analysis/state/${h.state_code}`}
                    className="text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap"
                  >
                    Drill down →
                  </Link>
                </div>
              );
            })}
            {hotspots.length === 0 && (
              <div className="text-slate-400 text-sm text-center py-6">
                ✓ No critical alerts at this time
              </div>
            )}
          </div>
        </div>

        {/* Priority Issues Panel */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-400" />
              Priority National Issues
            </h2>
            <Link to="/search" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              Search Voices <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-2">
            {topics.slice(0, 7).map((t, i) => {
              const isNeg = t.sentiment_trend < -0.1;
              const isPos = t.sentiment_trend > 0.1;
              const pct = topics[0]?.mention_count
                ? Math.round((t.mention_count / topics[0].mention_count) * 100)
                : 0;
              return (
                <Link
                  key={t.topic}
                  to={`/search?q=${encodeURIComponent(t.topic)}`}
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border transition-all hover:scale-[1.02] ${
                    isNeg ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10' :
                    isPos ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10' :
                    'bg-slate-700/30 border-slate-700 hover:bg-slate-700/50'
                  }`}
                >
                  <span className="text-xs text-slate-500 w-4 font-bold">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium truncate">{t.topic}</span>
                  <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden hidden md:block">
                    <div
                      className={`h-full rounded-full ${isNeg ? 'bg-red-500' : isPos ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-20 text-right">{formatNumber(t.mention_count)}</span>
                  <span className={`text-xs font-semibold w-20 text-right ${isNeg ? 'text-red-400' : isPos ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {isNeg ? '⚠ Concern' : isPos ? '✓ Support' : '~ Neutral'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ SENTIMENT BAR ═══ */}
      {pulse && pulse.total_entries_24h > 0 && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">National Sentiment Distribution (Last 24h)</h2>
            <div className="text-xs text-slate-500">{totalLanguages} languages tracked</div>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden mb-3 gap-0.5">
            <motion.div
              initial={{ flex: 0 }}
              animate={{ flex: pulse.positive_count }}
              transition={{ duration: 1 }}
              className="bg-emerald-500 rounded-l-full"
            />
            <motion.div
              initial={{ flex: 0 }}
              animate={{ flex: pulse.neutral_count }}
              transition={{ duration: 1, delay: 0.2 }}
              className="bg-yellow-500"
            />
            <motion.div
              initial={{ flex: 0 }}
              animate={{ flex: pulse.negative_count }}
              transition={{ duration: 1, delay: 0.4 }}
              className="bg-red-500 rounded-r-full"
            />
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-slate-400">Positive</span>
              <span className="font-bold">{formatNumber(pulse.positive_count)}</span>
              <span className="text-slate-500 text-xs">({Math.round((pulse.positive_count / pulse.total_entries_24h) * 100)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
              <span className="text-slate-400">Neutral</span>
              <span className="font-bold">{formatNumber(pulse.neutral_count)}</span>
              <span className="text-slate-500 text-xs">({Math.round((pulse.neutral_count / pulse.total_entries_24h) * 100)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span className="text-slate-400">Negative</span>
              <span className="font-bold">{formatNumber(pulse.negative_count)}</span>
              <span className="text-slate-500 text-xs">({Math.round((pulse.negative_count / pulse.total_entries_24h) * 100)}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MULTI-DOMAIN INTELLIGENCE ═══ */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold flex items-center gap-2 text-lg">
              <Globe size={20} className="text-blue-400" />
              Multi-Domain Intelligence Scores
            </h2>
            <p className="text-xs text-slate-400 mt-1">AI-powered risk assessment across strategic domains</p>
          </div>
          <Link to="/ontology" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
            View Knowledge Graph <ArrowRight size={11} />
          </Link>
        </div>
        <DomainIntelligenceGrid
          intelligences={domainIntelligence || []}
          loading={domainLoading}
          onDomainClick={(domain) => navigate(`/ontology?domain=${domain}`)}
        />
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <div className="bg-gradient-to-br from-blue-950/50 to-slate-800 rounded-2xl p-6 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-blue-400" />
          <h2 className="font-bold text-blue-300 text-sm uppercase tracking-wide">Intelligence Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { to: '/map', icon: Map, label: 'Sentiment Map', sub: 'State heatmap', color: 'text-blue-400', hover: 'hover:border-blue-500/40' },
            { to: '/hotspots', icon: Flame, label: 'Hotspot Report', sub: 'Critical zones', color: 'text-red-400', hover: 'hover:border-red-500/40' },
            { to: '/briefs', icon: FileText, label: 'Policy Briefs', sub: 'AI-generated', color: 'text-purple-400', hover: 'hover:border-purple-500/40' },
            { to: '/analysis/national/0', icon: TrendingUp, label: 'Deep Analysis', sub: 'National drill', color: 'text-emerald-400', hover: 'hover:border-emerald-500/40' },
            { to: '/compare', icon: BarChart3, label: 'State Compare', sub: 'Side-by-side', color: 'text-amber-400', hover: 'hover:border-amber-500/40' },
            { to: '/search', icon: Shield, label: 'Voice Search', sub: 'Full-text AI', color: 'text-teal-400', hover: 'hover:border-teal-500/40' },
          ].map(({ to, icon: Icon, label, sub, color, hover }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1.5 bg-slate-800 ${hover} hover:bg-slate-700/80 rounded-xl px-3 py-4 border border-slate-700 transition-all text-center`}
            >
              <Icon size={22} className={color} />
              <div className="text-xs font-semibold">{label}</div>
              <div className="text-[10px] text-slate-500">{sub}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══ FOOTER LEGAL NOTE ═══ */}
      <div className="text-center text-xs text-slate-600 pt-2 pb-1 border-t border-slate-800">
        JanaNaadi — AI-powered Citizen Sentiment Intelligence &bull; Data sourced from citizen voices, news, social media &bull; For official use by authorised government personnel
      </div>
    </motion.div>
  );
}
