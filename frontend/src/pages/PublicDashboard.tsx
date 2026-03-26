import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getNationalPulse, getStateRankings, getTrendingTopics, getRecentVoices, getAreaPulse, getKeywords, getHotspots, getMCDNews } from '../api/public';
import SentimentGauge from '../components/SentimentGauge';
import StatCard from '../components/StatCard';
import TopicCard from '../components/TopicCard';
import KeywordCloud from '../components/KeywordCloud';
import { StatCardSkeleton, VoiceCardSkeleton, TopicCardSkeleton, TableRowSkeleton, CardSkeleton } from '../components/Skeleton';
import { formatNumber, formatRelative, formatCurrency } from '../utils/formatters';
import { Link, useNavigate } from 'react-router-dom';
import { Map, ArrowRight, Search, MessageSquare, Users, TrendingUp, Send, Activity, ShieldHalf, Landmark, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFilters } from '../context/FilterContext';
import {
  type Pulse, type StateRanking, type TrendingTopic, type Voice, type AreaResult
} from '../types/api';

export default function PublicDashboard() {
  const { user } = useAuth();
  const { filters } = useFilters();
  const navigate = useNavigate();
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [wards, setWards] = useState<StateRanking[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [keywords, setKeywords] = useState<{ keyword: string; count: number }[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [mcdNews, setMcdNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Area lookup
  const [areaQuery, setAreaQuery] = useState('');
  const [areaResult, setAreaResult] = useState<AreaResult | null>(null);
  const [areaLoading, setAreaLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [p, s, t, v, kw, h, n] = await Promise.all([
          getNationalPulse(),
          getStateRankings(),
          getTrendingTopics(),
          getRecentVoices(12),
          getKeywords(40),
          getHotspots(10),
          getMCDNews(),
        ]);
        setPulse(p);
        setWards(s);
        setTrending(t);
        setVoices(v);
        setKeywords(kw);
        setHotspots(h);
        setMcdNews(n);
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [filters.timeRange]);

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
      <div className="p-6 space-y-8 bg-white min-h-screen">
        <TableRowSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-12 bg-white"
    >
      {/* 🏙️ HEADER — MCD INTELLIGENCE CORE — Light Ivory Variant */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-saffron flex items-center justify-center text-white mcd-glow-saffron shadow-lg relative italic">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight leading-none text-[#3E2C23] italic">
              COMMUNITY <span className="text-[#E76F2E]">CORE</span>
            </h1>
            <p className="text-[10px] font-bold text-[#6B5E57] uppercase tracking-[0.25em] mt-2 italic">
              Municipal Corporation of Delhi <span className="text-[#6B5E57]/40 mx-2">|</span> 250 Wards Sync Active
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 px-5 py-2.5 bg-[#FAF5ED] border border-[#3E2C23]/10 rounded-2xl shadow-sm group transition-all hover:bg-[#FAF5ED]/50">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
          <span className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest italic">Global MCD Systems Operational</span>
        </div>
      </div>

      {/* 📊 TOP-LEVEL REVENUE & PERFORMANCE SYNC */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="mcd-card border-[#3E2C23]/5 bg-white relative overflow-hidden group hover:border-[#E76F2E]/20 transition-all rounded-[32px] shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform pointer-events-none text-[#E76F2E]">
            <Landmark size={60} />
          </div>
          <h3 className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest mb-6 italic">MCD Fund Transfer (24h)</h3>
          <div className="text-4xl font-black text-[#3E2C23] mb-2 tracking-tighter">₹142.8 Cr</div>
          <div className="flex items-center gap-2 text-[#10B981] text-[10px] font-black uppercase tracking-widest">
            <TrendingUp size={14} /> +4.2% Capacity
          </div>
        </div>

        <div className="mcd-card border-[#3E2C23]/5 bg-white relative overflow-hidden group hover:border-[#0FD2B5]/20 transition-all rounded-[32px] shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform pointer-events-none text-[#0FD2B5]">
            <ShieldHalf size={60} />
          </div>
          <h3 className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest mb-6 italic">Gov Performance Index</h3>
          <div className="text-4xl font-black text-[#3E2C23] mb-2 tracking-tighter">86.4%</div>
          <div className="flex items-center gap-2 text-[#10B981] text-[10px] font-black uppercase tracking-widest">
            <Activity size={14} /> Systems Optimal
          </div>
        </div>

        <div className="mcd-card border-[#3E2C23]/5 bg-white relative overflow-hidden group hover:border-[#E76F2E]/20 transition-all rounded-[32px] shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform pointer-events-none text-[#E76F2E]">
            <Zap size={60} />
          </div>
          <h3 className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest mb-6 italic">Active Realities Sync</h3>
          <div className="text-4xl font-black text-[#3E2C23] mb-2 tracking-tighter">{formatNumber(pulse?.total_entries_24h ?? 0)}</div>
          <div className="flex items-center gap-2 text-[#6B5E57] text-[10px] font-black uppercase tracking-widest italic">
             Integrated across 25 Wards
          </div>
        </div>
      </div>

      {/* 🔍 WARD / ZONE LOOKUP — Light ivory Version */}
      <div className="mcd-card rounded-[40px] p-10 border border-[#3E2C23]/5 bg-[#FAF5ED]/40 relative overflow-hidden group shadow-sm transition-all hover:shadow-lg">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[100%] bg-[#E76F2E]/5 blur-[100px] rounded-full group-hover:bg-[#E76F2E]/8 transition-all duration-700" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 italic text-[#3E2C23]">
              SYNC YOUR <span className="text-[#E76F2E]">WARD PULSE</span>
            </h2>
            <p className="text-[#6B5E57] text-[10px] font-black uppercase tracking-widest leading-relaxed max-w-sm italic opacity-80">
              Analyze sentiment metrics, active budget allocations, and reality voices for any Delhi Ward in real-time.
            </p>
          </div>
          <div className="flex-[1.5] w-full relative group">
            <div className="absolute inset-0 bg-[#E76F2E]/5 blur-xl rounded-2xl group-focus-within:bg-[#E76F2E]/10 transition-all opacity-0 group-focus-within:opacity-100" />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#6B5E57] group-focus-within/input:text-[#E76F2E] transition-colors" size={20} />
            <input
              value={areaQuery}
              onChange={(e) => setAreaQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAreaSearch()}
              placeholder="SEARCH WARD (E.G. NARELA, ROHINI, DWARKA)..."
              className="w-full bg-white border-2 border-[#3E2C23]/5 rounded-2xl pl-16 pr-8 py-4 text-xs text-[#3E2C23] font-black uppercase placeholder-slate-400 focus:border-[#E76F2E]/30 focus:outline-none transition-all shadow-sm tracking-widest"
            />
          </div>
          <button
            onClick={handleAreaSearch}
            className="px-10 py-4 bg-gradient-saffron hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-[10px] font-black mcd-glow-saffron transition-all shadow-xl uppercase tracking-widest shadow-[#E76F2E]/10"
          >
            SYNC AREA
          </button>
        </div>

        {areaResult && areaResult.found && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="mt-12 pt-12 border-t border-[#3E2C23]/5 grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <div className="p-6 bg-white rounded-[24px] border border-[#3E2C23]/5 hover:border-[#E76F2E]/20 transition-all group/stat shadow-sm">
              <div className="text-[9px] font-black text-[#6B5E57] uppercase tracking-widest mb-3 italic">Target Ward Entity</div>
              <div className="text-xl font-black text-[#3E2C23] uppercase tracking-tighter group-hover/stat:translate-x-1 transition-transform">{areaResult.state}</div>
            </div>
            <div className="p-6 bg-white rounded-[24px] border border-[#3E2C23]/5 hover:border-emerald-500/20 transition-all group/stat shadow-sm">
              <div className="text-[9px] font-black text-[#6B5E57] uppercase tracking-widest mb-3 italic">Integrity Sync Score</div>
              <div className="text-xl font-black text-emerald-600 font-mono group-hover/stat:translate-x-1 transition-transform">{(areaResult.avg_sentiment ?? 0 + 0.5).toFixed(3)}</div>
            </div>
            <div className="p-6 bg-white rounded-[24px] border border-[#3E2C23]/5 hover:border-[#E76F2E]/20 transition-all group/stat shadow-sm">
              <div className="text-[9px] font-black text-[#6B5E57] uppercase tracking-widest mb-3 italic">Active Reality Voices</div>
              <div className="text-xl font-black text-[#3E2C23] group-hover/stat:translate-x-1 transition-transform">{formatNumber(areaResult.total_entries)}</div>
            </div>
            <div className="p-6 bg-white rounded-[24px] border border-[#3E2C23]/5 hover:border-red-500/20 transition-all group/stat shadow-sm">
              <div className="text-[9px] font-black text-[#6B5E57] uppercase tracking-widest mb-3 italic">Strategic Risk Status</div>
              <div className={`text-xl font-black uppercase tracking-tighter group-hover/stat:translate-x-1 transition-transform ${((areaResult?.negative ?? 0) > 5) ? 'text-[#EF4444]' : 'text-[#6B5E57]'}`}>
                {((areaResult?.negative ?? 0) > 5) ? 'HIGH AUDIT' : 'STABLE'}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 🏆 WARD PERFORMANCE RANKINGS — Light Version */}
      <div className="mcd-card border-[#3E2C23]/5 relative overflow-hidden bg-[#FAF5ED]/20 shadow-sm p-0 rounded-[40px]">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-[#3E2C23]">
           <Landmark size={200} />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-0 gap-6 relative z-10 p-10 pb-6 border-b border-[#3E2C23]/5 bg-white/50">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter italic text-[#3E2C23]">WARD <span className="text-[#E76F2E]">INTEGRITY</span> RANKINGS</h2>
            <p className="text-[9px] font-black text-[#6B5E57] uppercase tracking-[0.3em] mt-2 italic">Sentiment-Volume Delta Analysis across 250 Wards</p>
          </div>
          <Link to="/compare" className="px-6 py-3 bg-white hover:bg-[#FAF5ED] rounded-xl text-[9px] font-black text-[#E76F2E] uppercase tracking-widest flex items-center gap-2 transition-all border border-[#3E2C23]/10 shadow-sm">
            Full Matrix Audit <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto relative z-10">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-[#3E2C23]/5 bg-[#FAF5ED]/30">
                <th className="py-6 px-10 text-[9px] font-black text-[#6B5E57] uppercase tracking-[0.2em] italic">Rank</th>
                <th className="py-6 px-10 text-[9px] font-black text-[#6B5E57] uppercase tracking-[0.2em] italic">Ward Intelligence Entity</th>
                <th className="py-6 px-10 text-[9px] font-black text-[#6B5E57] uppercase tracking-[0.2em] italic">Integrity Score</th>
                <th className="py-6 px-10 text-[9px] font-black text-[#6B5E57] uppercase tracking-[0.2em] italic">Audit Volume</th>
                <th className="py-6 px-10 text-[9px] font-black text-[#6B5E57] uppercase tracking-[0.2em] italic">Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {wards.slice(0, 10).map((w, i) => (
                <tr key={w.state_code} className="group hover:bg-[#FAF5ED]/80 transition-all cursor-pointer">
                  <td className="py-6 px-10">
                    <span className="text-lg font-black text-[#6B5E57]/60 group-hover:text-[#E76F2E]/40 transition-colors uppercase tracking-tight italic">#{String(i + 1).padStart(2, '0')}</span>
                  </td>
                  <td className="py-6 px-10">
                    <div className="font-black text-[#3E2C23] text-sm uppercase tracking-tight group-hover:translate-x-1 transition-transform italic">{w.state}</div>
                    <div className="text-[8px] font-black text-[#6B5E57] uppercase tracking-widest mt-1">MCD Zonal Intelligence Unit</div>
                  </td>
                  <td className="py-6 px-10">
                    <div className={`text-sm font-black font-mono ${w.avg_sentiment > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {w.avg_sentiment > 0 ? '+' : ''}{w.avg_sentiment.toFixed(3)}
                    </div>
                  </td>
                  <td className="py-8 px-6">
                    <div className="text-lg font-black text-[#6B5E57] font-mono">{formatNumber(w.volume)}</div>
                  </td>
                  <td className="py-8 px-6 text-right">
                    <div className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      w.avg_sentiment < -0.1 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                      'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    }`}>
                      {w.avg_sentiment < -0.1 ? 'CRITICAL AUDIT' : 'HEALTHY SYNC'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📰 REAL-TIME MCD NEWS FEED — DIRECT RSS SYNC — Light Version */}
      <div className="bg-[#FAF5ED]/50 rounded-[40px] p-10 border border-[#3E2C23]/5 mcd-card shadow-sm">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-10 h-10 rounded-xl bg-[#E76F2E]/10 flex items-center justify-center text-[#E76F2E] border border-[#E76F2E]/20 italic">
            <TrendingUp size={20} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-[#3E2C23] italic">Real-Time MCD <span className="text-[#E76F2E]">Intelligence</span> Feed</h2>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
            <span className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest italic">RSS Stream Active</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mcdNews.slice(0, 6).map((n, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white rounded-[32px] p-8 border border-[#3E2C23]/5 hover:border-[#E76F2E]/20 transition-all shadow-sm hover:shadow-xl flex flex-col h-full italic"
            >
              <div className="text-[10px] font-black text-[#E76F2E] uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShieldHalf size={12} /> {n.source}
              </div>
              <h4 className="text-[#3E2C23] font-black text-lg leading-tight mb-4 group-hover:text-[#E76F2E] transition-all">
                {n.title}
              </h4>
              <p className="text-[#6B5E57] text-xs leading-relaxed line-clamp-3 mb-6 font-medium">
                {n.summary}
              </p>
              <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#6B5E57] uppercase tracking-widest">{n.published || 'Just now'}</span>
                <a href={n.link} target="_blank" rel="noreferrer" className="text-[9px] font-black text-[#3E2C23] hover:text-[#E76F2E] uppercase transition-all flex items-center gap-1 italic">
                  Read Audit <ArrowRight size={10} />
                </a>
              </div>
            </motion.div>
          ))}
          {mcdNews.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-[#3E2C23]/10 rounded-3xl">
              <p className="text-[#6B5E57] font-black uppercase tracking-widest italic">Integrating Live MCD News Sources…</p>
            </div>
          )}
        </div>
      </div>

      {/* 🏷️ TOPIC MAP & TRENDS */}
      <div className="grid md:grid-cols-2 gap-10">
        <div className="mcd-card border-[#3E2C23]/5 bg-white shadow-sm">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-10 italic text-[#3E2C23]">Crisis Intensity <span className="text-[#E76F2E]">Areas</span></h2>
          <div className="grid grid-cols-2 gap-6">
            {trending.slice(0, 6).map((t) => (
              <TopicCard
                key={t.topic}
                topic={t.topic}
                count={t.mention_count}
                sentiment={t.sentiment_trend > 0 ? 'positive' : t.sentiment_trend < 0 ? 'negative' : 'neutral'}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>

        <div className="mcd-card border-[#3E2C23]/5 bg-white shadow-sm flex flex-col">
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-10 italic text-[#3E2C23]">Discourse <span className="text-[#E76F2E]">Keywords</span></h2>
          <div className="flex-1 min-h-[300px]">
             <KeywordCloud keywords={keywords} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
