import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Flame, FileText, Map, BarChart3, ArrowRight,
  Activity, Users, Target, Globe, Zap, RefreshCw, Layers, Building2, ShieldHalf, Landmark, ChevronRight
} from 'lucide-react';
import { getNationalPulse, getHotspots, getTrendingTopics } from '../api/public';
import { getForecast } from '../api/analysis';
import { formatNumber, formatCurrency } from '../utils/formatters';
import { DomainIntelligenceGrid } from '../components/DomainIntelligenceCard';
import { useDomainIntelligence } from '../hooks/useKnowledgeGraph';
import { useNavigate } from 'react-router-dom';
import { useFilters } from '../context/FilterContext';
import { useQuery } from '@tanstack/react-query';
import { getCrossDomainSummary } from '../api/ontology';
import { type Pulse, type Hotspot, type TrendingTopic, urgencyConfig, moodConfig, DOMAIN_CONFIG } from '../types/api';

// MoodIcon helper
function MoodIcon({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
  if (trend === 'up') return <TrendingUp size={16} />;
  if (trend === 'down') return <TrendingDown size={16} />;
  return <Minus size={16} />;
}

// StrengthBar for cross-domain
function StrengthBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'bg-[#EF4444]' : pct >= 40 ? 'bg-[#E76F2E]' : 'bg-[#2FA4D7]';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-surface-base/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] font-black text-content-secondary w-6 text-right">{pct}%</span>
    </div>
  );
}

export default function GovDashboard() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [topics, setTopics] = useState<TrendingTopic[]>([]);
  const [forecast, setForecast] = useState<Array<{ forecast_score: number }>>([])
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const navigate = useNavigate();
  const { filters, setFilters } = useFilters();
  
  const { data: domainIntelligence, isLoading: domainLoading } = useDomainIntelligence({ scope: 'national' });
  
  const { data: crossDomainSummary } = useQuery({
    queryKey: ['cross-domain-summary'],
    queryFn: getCrossDomainSummary,
    staleTime: 10 * 60 * 1000,
  });
  const topDomainPairs = crossDomainSummary?.domain_pairs?.slice(0, 4) ?? [];

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h, t, fc] = await Promise.all([
        getNationalPulse(),
        getHotspots(6),
        getTrendingTopics(),
        getForecast('national', 0, 7).catch(() => []),
      ]);
      setPulse(p);
      setHotspots(h);
      setTopics(t);
      setForecast(fc);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error('GovDashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, filters.timeRange]);

  useEffect(() => {
    const interval = setInterval(() => loadData(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

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
    const label = delta > 0.03 ? '↑ RISING' : delta < -0.03 ? '↓ FALLING' : '→ STABLE';
    const color = delta > 0.03 ? 'text-[#10B981]' : delta < -0.03 ? 'text-[#EF4444]' : 'text-[#E76F2E]';
    return { forecastDelta: delta, forecastLabel: label, forecastColor: color };
  }, [forecast]);

  if (loading) {
    return (
      <div className="p-6 space-y-12 bg-background-200 min-h-screen">
        <div className="h-32 bg-surface-base rounded-[40px] animate-pulse" />
        <div className="grid grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 bg-surface-base rounded-[32px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-12 bg-background-200"
    >
      {/* ═══ OFFICIAL MCD INTELLIGENCE CORE — Light Version ═══ */}
      <div className="relative overflow-hidden mcd-card rounded-[40px] p-10 border border-white/10 shadow-sm bg-surface-base/50">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[100%] bg-[#E76F2E]/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-8">
             <div className="w-16 h-16 rounded-[24px] bg-gradient-saffron flex items-center justify-center text-white mcd-glow-saffron shadow-xl italic">
              <Landmark size={32} />
            </div>
            <div>
              <div className="text-[10px] font-black tracking-[0.3em] text-[#E76F2E] uppercase mb-3 italic opacity-80">
                MUNICIPAL CORPORATION OF DELHI — INTELLIGENT GOVERNANCE
              </div>
              <h1 className="text-3xl font-black text-content-primary uppercase tracking-tighter leading-none italic">
                CITY <span className="text-[#E76F2E]">STRATEGIC</span> BRIEF
              </h1>
              <div className="flex items-center gap-4 mt-5">
                 <div className="flex items-center gap-2 px-5 py-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                  <span className="text-[10px] font-black text-[#10B981] uppercase tracking-[0.2em]">Global Sync Active</span>
                </div>
                <div className="h-6 w-[1px] bg-surface-base/10 mx-2" />
                <span className="text-[11px] font-black text-content-secondary/60 uppercase tracking-[0.3em] font-mono">{today} <span className="text-content-primary/10 mx-2">|</span> {timeStr} IST</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-6">
            <div className="relative group">
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters({ timeRange: e.target.value })}
                className="bg-surface-base border-2 border-white/10 rounded-2xl px-10 py-6 text-xs text-content-primary font-black uppercase focus:border-[#E76F2E]/30 transition-all appearance-none cursor-pointer hover:border-white/15 shadow-sm"
              >
                <option value="24h">LOG: 24 Hours</option>
                <option value="7d">LOG: 7 Days</option>
                <option value="30d">LOG: 30 Days</option>
              </select>
              <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-[#E76F2E] pointer-events-none" size={18} />
            </div>
            <button onClick={() => loadData()} className="p-6 bg-surface-base border-2 border-white/10 rounded-2xl text-content-secondary hover:text-[#E76F2E] hover:border-[#E76F2E]/20 transition-all shadow-sm group">
              <RefreshCw size={28} className="group-hover:rotate-180 transition-transform duration-700" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ STRATEGIC KPI MATRIX — Light Version ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="mcd-card border-white/10 bg-surface-base relative overflow-hidden group rounded-[32px] transition-all hover:border-[#E76F2E]/20 shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Users size={50} className="text-[#E76F2E]" />
          </div>
          <h3 className="text-[10px] font-black text-content-secondary uppercase tracking-widest mb-6 italic">Ward Voices (24h)</h3>
          <div className="text-4xl font-black text-content-primary mb-2 tracking-tighter">{formatNumber(pulse?.total_entries_24h ?? 0)}</div>
          <div className="flex items-center gap-2 text-[#10B981] text-[9px] font-black uppercase tracking-widest">
            <TrendingUp size={12} /> Live Reality Sync
          </div>
        </div>

        <div className="mcd-card border-white/10 bg-surface-base relative overflow-hidden group rounded-[32px] transition-all hover:border-[#2FA4D7]/20 shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Activity size={50} className="text-[#2FA4D7]" />
          </div>
          <h3 className="text-[10px] font-black text-content-secondary uppercase tracking-widest mb-6 italic">City Mood Index</h3>
          <div className={`text-3xl font-black ${mood?.color ?? 'text-content-primary'} uppercase tracking-tighter mb-2 italic`}>{mood?.label ?? 'STABLE'}</div>
          <div className="text-[9px] font-black text-content-secondary uppercase tracking-widest italic opacity-70">Signal: {(pulse?.avg_sentiment ?? 0).toFixed(3)}</div>
        </div>

        <div className="mcd-card border-white/10 bg-surface-base relative overflow-hidden group rounded-[32px] transition-all hover:border-red-500/20 shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <AlertTriangle size={50} className={criticalCount > 0 ? 'text-[#EF4444]' : 'text-content-secondary/20'} />
          </div>
          <h3 className="text-[10px] font-black text-content-secondary uppercase tracking-widest mb-6 italic">Crisis Intelligence</h3>
          <div className={`text-4xl font-black ${criticalCount > 0 ? 'text-[#EF4444]' : 'text-content-primary'} mb-2 tracking-tighter`}>
            {criticalCount} <span className="text-[10px] font-black text-content-secondary uppercase tracking-widest ml-1">Alerts</span>
          </div>
          <div className="text-[9px] font-black text-content-secondary uppercase tracking-widest opacity-70">{highCount} Neutral Wards</div>
        </div>

        <div className="mcd-card border-white/10 bg-surface-base relative overflow-hidden group rounded-[32px] transition-all hover:border-purple-500/20 shadow-sm">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <Target size={50} className="text-[#A855F7]" />
          </div>
          <h3 className="text-[10px] font-black text-content-secondary uppercase tracking-widest mb-6 italic">Risk Forecast</h3>
          <div className={`text-3xl font-black ${forecastColor} tracking-tighter mb-2 italic`}>{forecastLabel}</div>
          <div className="text-[9px] font-black text-content-secondary uppercase tracking-widest italic opacity-70">7-Day Projection Sync</div>
        </div>
      </div>

      {/* ═══ MAIN INTELLIGENCE LAYOUT — Light Version ═══ */}
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="mcd-card border-white/10 bg-surface-base/50 relative overflow-hidden rounded-[40px] shadow-sm">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-content-primary">
             <Shield size={160} />
          </div>
          
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-sm">
                <Flame size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-content-primary italic">CRITICAL <span className="text-[#E76F2E]">AUDITS</span></h2>
                <p className="text-[9px] font-black text-content-secondary uppercase tracking-widest mt-1 italic">Active Crisis Sync by Ward</p>
              </div>
            </div>
            <Link to="/compare" className="px-5 py-2.5 bg-surface-base hover:bg-surface-base rounded-xl text-[9px] font-black text-[#E76F2E] uppercase tracking-widest flex items-center gap-2 transition-all border border-white/15 shadow-sm">
              Delta Report <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-4 relative z-10">
            {hotspots.slice(0, 6).map((h, i) => {
              const uc = urgencyConfig(h.urgency_score);
              return (
                <div key={h.state_code} className="group bg-surface-base rounded-[32px] p-7 border border-white/10 hover:border-[#E76F2E]/30 transition-all flex items-center justify-between shadow-sm hover:shadow-md">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                       <span className="text-xl font-black text-content-primary/10 group-hover:text-[#E76F2E]/40 transition-colors">#{String(i + 1).padStart(2, '0')}</span>
                       <h3 className="text-xl font-black text-content-primary uppercase tracking-tighter group-hover:translate-x-1 transition-transform">{h.state}</h3>
                       <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${uc.badge} border border-white/10 ml-auto shadow-sm`}>{uc.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-background-200 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${h.urgency_score * 100}%` }} className={`h-full ${uc.bar} rounded-full`} />
                    </div>
                  </div>
                  <Link to={`/analysis/ward/${h.state_code}`} className="w-12 h-12 rounded-2xl bg-background-200 flex items-center justify-center text-content-secondary hover:text-[#E76F2E] hover:bg-[#E76F2E]/10 transition-all ml-8 border border-white/15">
                    <ChevronRight size={24} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority City Issues — Light Version */}
        <div className="mcd-card border-white/10 bg-surface-base relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-content-primary">
             <BarChart3 size={200} />
          </div>
          <div className="flex items-center justify-between mb-12 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-[#2FA4D7]/10 flex items-center justify-center text-[#2FA4D7] border border-[#2FA4D7]/20 shadow-sm">
                <Target size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-content-primary italic">PRIORITY <span className="text-[#E76F2E]">DISCOURSE</span></h2>
                <p className="text-[10px] font-black text-content-secondary uppercase tracking-widest mt-2">Sentiment-Weighted City Issues</p>
              </div>
            </div>
            <Link to="/search" className="px-5 py-2.5 bg-surface-base hover:bg-surface-base rounded-xl text-[10px] font-black text-[#E76F2E] uppercase tracking-widest flex items-center gap-3 transition-all border border-white/15 shadow-sm">
              Grievance Vault <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-4 relative z-10">
            {topics.slice(0, 7).map((t, i) => {
              const isNeg = t.sentiment_trend < -0.1;
              return (
                <div key={t.topic} className={`flex items-center gap-6 bg-surface-base/50 rounded-[32px] p-6 border border-white/10 hover:border-[#E76F2E]/30 transition-all cursor-pointer group shadow-sm hover:shadow-md ${isNeg ? 'border-l-[#EF4444] border-l-4' : ''}`}>
                  <span className="text-xl font-black text-content-secondary/60 group-hover:text-[#E76F2E]/40 transition-colors">#{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-content-primary uppercase tracking-tighter group-hover:translate-x-1 transition-transform">{t.topic}</h3>
                    <div className="text-[9px] font-black text-content-secondary uppercase tracking-widest mt-1 italic">{formatNumber(t.mention_count)} Mentions sync</div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm border ${isNeg ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                    {isNeg ? 'CRITICAL AUDIT' : 'SYSTEM HEALTHY'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ MULTI-DOMAIN KNOWLEDGE GRAPH — Light Version ═══ */}
      <div className="bg-surface-base rounded-[40px] p-10 border border-white/10 mcd-card shadow-sm">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-content-primary flex items-center gap-4 italic">
              <Globe size={24} className="text-[#2FA4D7]" />
              Municipal Ontology Engine
            </h2>
            <p className="text-[10px] font-black text-content-secondary uppercase tracking-[0.2em] mt-2 italic">AI Node Extraction across 12 Delhi Zones</p>
          </div>
          <Link to="/ontology" className="px-6 py-2.5 bg-surface-base border border-white/15 hover:bg-surface-base text-content-secondary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm">
            Engagement Graph
          </Link>
        </div>
        <DomainIntelligenceGrid
          intelligences={domainIntelligence || []}
          loading={domainLoading}
          onDomainClick={(domain) => navigate(`/ontology?domain=${domain}`)}
        />
      </div>

      {/* ═══ MUNICIPAL ACTION CONSOLE — Light Version ═══ */}
      <div className="bg-surface-base/50 rounded-[48px] p-12 border border-white/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[100%] bg-[#E76F2E]/5 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-4 mb-12 relative z-10">
          <div className="p-3 bg-[#E76F2E]/10 rounded-xl border border-[#E76F2E]/20 shadow-sm">
            <Zap size={24} className="text-[#E76F2E]" />
          </div>
          <h2 className="text-xl font-black text-content-primary uppercase tracking-tighter italic">GOVERNANCE <span className="text-[#E76F2E]">ACTION</span> MATRIX</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 text-center relative z-10">
            {[
              { to: '/map', icon: Map, label: 'WARD MAP', sub: 'Geo-Sentiment' },
              { to: '/pulse', icon: ShieldHalf, label: 'PUBLIC PULSE', sub: 'Citizen View' },
              { to: '/briefs', icon: FileText, label: 'STRATEGIC BRIEFS', sub: 'Report Engine' },
              { to: '/ontology', icon: Globe, label: 'KNOWLEDGE GRAPH', sub: 'Entity Link' },
              { to: '/compare', icon: BarChart3, label: 'WARD COMPARE', sub: 'Delta Audit' },
              { to: '/cross-domain', icon: Layers, label: 'CROSS DOMAIN', sub: 'Multi-Issue' },
            ].map(({ to, icon: Icon, label, sub }) => (
              <Link key={to} to={to} className="group mcd-card bg-surface-base border border-white/10 rounded-[40px] p-10 hover:bg-surface-base hover:border-[#E76F2E]/20 transition-all flex flex-col items-center shadow-sm hover:shadow-xl">
                <Icon size={32} className="text-content-secondary/40 group-hover:text-[#E76F2E] group-hover:scale-110 transition-all mb-6" />
                <div className="text-[10px] font-black text-content-primary uppercase tracking-[0.2em]">{label}</div>
                <div className="text-[8px] font-black text-content-secondary mt-2 uppercase tracking-[0.3em] font-mono group-hover:text-[#E76F2E]/60 transition-colors">{sub}</div>
              </Link>
            ))}
        </div>
      </div>

      {/* ═══ ZONAL ACCOUNTABILITY RANKINGS — Light Version ═══ */}
      <div className="mcd-card border-white/10 bg-surface-base relative overflow-hidden shadow-sm rounded-[40px]">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none text-content-primary">
           <Building2 size={240} />
        </div>
        
        <div className="flex items-center justify-between mb-12 relative z-10 p-10 pb-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-[#2FA4D7]/10 flex items-center justify-center text-[#2FA4D7] border border-[#2FA4D7]/20 shadow-sm">
              <Building2 size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-content-primary italic">MCD <span className="text-[#2FA4D7]">ACCOUNTABILITY</span> RANKINGS</h2>
              <p className="text-[10px] font-black text-content-secondary uppercase tracking-widest mt-2 italic">Zonal Efficiency & Response Metrics</p>
            </div>
          </div>
          <span className="text-[11px] font-black text-[#2FA4D7] bg-[#2FA4D7]/10 px-5 py-2 rounded-xl uppercase tracking-widest border border-[#2FA4D7]/20 shadow-sm italic">TOP PERFORMANCE DATA</span>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 p-10 pt-0">
          {[
            { zone: 'Narela', wards: '25 Wards', score: 91, response: '1.4h' },
            { zone: 'Civil Lines', wards: '22 Wards', score: 88, response: '2.1h' },
            { zone: 'Rohini', wards: '24 Wards', score: 84, response: '3.5h' },
            { zone: 'Karol Bagh', wards: '19 Wards', score: 79, response: '4.2h' },
            { zone: 'South', wards: '23 Wards', score: 76, response: '5.1h' },
            { zone: 'Central', wards: '21 Wards', score: 92, response: '1.8h' },
          ].sort((a,b) => b.score - a.score).map((w, i) => (
            <div key={w.zone} className="bg-surface-base rounded-[32px] p-8 border border-white/10 hover:border-[#2FA4D7]/30 transition-all flex items-center justify-between group shadow-sm hover:shadow-md">
              <div className="flex items-center gap-6">
                 <div className="w-10 h-10 rounded-xl bg-surface-base text-content-secondary/20 text-xs font-black flex items-center justify-center group-hover:text-[#2FA4D7] transition-colors font-mono border border-white/10 italic">#{String(i+1).padStart(2, '0')}</div>
                 <div>
                   <div className="text-lg font-black text-content-primary uppercase tracking-tighter group-hover:translate-x-1 transition-transform italic">{w.zone} Zone</div>
                   <div className="text-[9px] font-black text-content-secondary uppercase tracking-widest mt-2 font-mono">{w.wards} <span className="text-content-primary/10 mx-2">|</span> Resp: {w.response}</div>
                 </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-[#2FA4D7] font-mono">{w.score}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-[10px] font-black text-content-secondary py-16 uppercase tracking-[0.6em] italic opacity-50">
        OFFICIAL MCD INTELLIGENCE CORE — RESTRICTED ACCESS SYNC SYSTEM
      </div>
    </motion.div>
  );
}
