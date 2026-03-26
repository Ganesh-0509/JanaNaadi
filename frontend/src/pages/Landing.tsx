import { Link } from 'react-router-dom';
import { Activity, Shield, ArrowRight, MessageSquare, Landmark, TrendingUp, Zap, BarChart3, Globe, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getRecentVoices } from '../api/public';
import { formatNumber } from '../utils/formatters';
import { useLivePulse } from '../hooks/useLivePulse';

export default function Landing() {
  const { pulse } = useLivePulse();
  const [recentVoices, setRecentVoices] = useState<any[]>([]);

  useEffect(() => {
    getRecentVoices(4).then(setRecentVoices).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#F5E9D8] text-white selection:bg-[#E76F2E]/30">
      {/* 🏙️ ATMOSPHERIC HERO BACKGROUND */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#E76F2E]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#0FD2B5]/5 blur-[120px] rounded-full" />
      </div>

      {/* Navbar */}
      <header className="fixed top-0 left-0 w-full z-[100] border-b border-white/5 backdrop-blur-xl bg-[#F5E9D8]/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-saffron flex items-center justify-center text-xl font-black text-white mcd-glow-saffron">
              J
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none uppercase">JANA NAADI</span>
              <span className="text-[10px] font-black text-[#E76F2E] tracking-[0.3em] uppercase">Intelligence Engine</span>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <Link to="/pulse" className="text-[11px] font-black text-[#6B5E57] hover:text-[#E76F2E] transition-all uppercase tracking-widest">
              Public Pulse
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 bg-gradient-saffron hover:scale-105 text-white rounded-xl text-xs font-black transition-all shadow-xl mcd-glow-saffron uppercase tracking-widest"
            >
              Gov Access
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 pt-44 pb-32">
        <section className="max-w-7xl mx-auto px-6 text-center mb-32">
          <motion.div 
            initial={{ opacity: 0, y: 40 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-10">
              <span className="w-2 h-2 rounded-full bg-[#E76F2E] animate-pulse" />
              <span className="text-[10px] font-black text-[#6B5E57] uppercase tracking-[0.2em]">Live Delhi MCD Reality Sync Active</span>
            </div>
            
            <h1 className="text-6xl md:text-[10rem] font-black mb-12 leading-[0.8] tracking-tighter uppercase italic">
              REALITY<br />
              <span className="text-gradient-saffron">INTELLIGENCE</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-[#6B5E57] mb-16 max-w-3xl mx-auto font-medium leading-relaxed">
              Transforming the Municipal Corporation of Delhi into a <span className="text-white">Data-First Democracy</span>. 
              Integrated ward-level analytics across 250 zones.
            </p>

            <div className="flex flex-wrap justify-center gap-6">
              <Link 
                to="/pulse" 
                className="px-12 py-6 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-[28px] text-lg font-black uppercase tracking-tighter transition-all flex items-center gap-4 group"
              >
                Launch Intelligence Core
                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </Link>
              <Link 
                to="/submit" 
                className="px-12 py-6 bg-gradient-saffron rounded-[28px] text-lg font-black uppercase tracking-tighter transition-all mcd-glow-saffron hover:scale-[1.02]"
              >
                Submit Voice
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Real-time Ticker / Stats */}
        <section className="max-w-7xl mx-auto px-6 mb-40">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {[
              { label: 'Ingested Voices', val: formatNumber(pulse?.total_entries_24h ?? 0), icon: MessageSquare, color: 'text-[#E76F2E]' },
              { label: 'Mapped Wards', val: '250', icon: Globe, color: 'text-[#0FD2B5]' },
              { label: 'Active Zones', val: '12', icon: Landmark, color: 'text-[#E76F2E]' },
              { label: 'Citizens Reached', val: '1.6Cr+', icon: Activity, color: 'text-[#0FD2B5]' },
            ].map((s, i) => (
              <div key={i} className="mcd-glass p-8 rounded-[32px] border border-white/5 text-center transition-all hover:border-white/10">
                <s.icon size={24} className={`mx-auto mb-4 ${s.color}`} />
                <div className="text-3xl font-black text-white mb-1">{s.val}</div>
                <div className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Value Propositions */}
        <section className="max-w-7xl mx-auto px-6 mb-40">
          <div className="grid md:grid-cols-3 gap-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="mcd-card group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#E76F2E]/10 flex items-center justify-center text-[#E76F2E] mb-8 group-hover:scale-110 transition-transform">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Trust Integrity</h3>
              <p className="text-[#6B5E57] text-sm leading-relaxed">Verifiable civic data streams mapped directly to Delhi delimitation gazettes. No bias, just ground-truth.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="mcd-card group border-[#E76F2E]/20"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#E76F2E] flex items-center justify-center text-white mb-8 mcd-glow-saffron group-hover:scale-110 transition-transform">
                <TrendingUp size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Delta Analytics</h3>
              <p className="text-[#6B5E57] text-sm leading-relaxed">Advanced sentiment forecasting and ward-performance comparative matrices for official planning.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="mcd-card group"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#E76F2E]/10 flex items-center justify-center text-[#E76F2E] mb-8 group-hover:scale-110 transition-transform">
                <Zap size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Rapid Response</h3>
              <p className="text-[#6B5E57] text-sm leading-relaxed">AI-Triggered alerts for rapid municipal intervention in critical hotspots across the capital city.</p>
            </motion.div>
          </div>
        </section>

        {/* Global Reality Feed (Recent Voices) */}
        <section className="max-w-5xl mx-auto px-6 mb-40">
           <div className="text-center mb-16">
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4">Community <span className="text-gradient-saffron">Reality</span> Feed</h2>
              <p className="text-[#6B5E57] font-black uppercase text-[10px] tracking-[0.3em]">Latest Verified Citizen Intelligence</p>
           </div>
           
           <div className="space-y-4">
             {recentVoices.map((v, i) => (
               <div key={i} className="mcd-glass p-8 rounded-[32px] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-[#E76F2E]/20 transition-all">
                  <div className="flex-1">
                    <p className="text-lg text-[#6B5E57]/40 font-medium italic mb-2">"{v.text}"</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#E76F2E] uppercase">{v.state}</span>
                      <span className="text-[10px] font-bold text-[#6B5E57]">• {v.topic}</span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                    v.sentiment === 'positive' ? 'bg-[#10B981]/10 text-[#10B981]' : 
                    v.sentiment === 'negative' ? 'bg-[#EF4444]/10 text-[#EF4444]' : 'bg-[#3E2C23] text-[#6B5E57]'
                  }`}>
                    {v.sentiment}
                  </div>
               </div>
             ))}
           </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6">
           <div className="mcd-glass p-16 rounded-[60px] border border-white/5 text-center relative overflow-hidden">
              <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-[#E76F2E]/10 blur-[80px] rounded-full" />
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 leading-tight">
                Empowering the <br />
                <span className="text-gradient-saffron">Next Era</span> of Delhi
              </h2>
              <p className="text-[#6B5E57] text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
                Join the municipal revolution. Experience a city that listens, analyzes, and evolves with its citizens.
              </p>
              <Link 
                to="/pulse" 
                className="inline-block px-14 py-6 bg-gradient-saffron rounded-[32px] text-xl font-black uppercase tracking-tighter mcd-glow-saffron hover:scale-105 transition-all text-white"
              >
                Launch Dashboard
              </Link>
           </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-20 bg-black/40 text-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-[#6B5E57] font-black text-[11px] uppercase tracking-[0.5em] mb-4">
            JANA NAADI • MUNICIPAL INTELLIGENCE ENGINE • NATIVE CENSUS SYNC ACTIVE
          </div>
          <div className="text-slate-700 font-bold text-[9px] uppercase tracking-widest">
            © 2026 MUNICIPAL CORPORATION OF DELHI • STRATEGIC DEFENSE OF DEMOCRACY
          </div>
        </div>
      </footer>
    </div>
  );
}
