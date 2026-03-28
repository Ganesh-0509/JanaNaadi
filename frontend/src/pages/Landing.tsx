import { Link } from 'react-router-dom';
import { Activity, Shield, ArrowRight, Landmark, TrendingUp, Zap, BarChart3, Globe, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLivePulse } from '../hooks/useLivePulse';
import { useLiveStream } from '../hooks/useLiveStream';
import IndianMandalaBackground from '../components/IndianMandalaBackground';

export default function Landing() {
  const { pulse } = useLivePulse();
  const { entries } = useLiveStream(4);
  const recentVoices = entries.map((entry) => ({
    text: entry.text,
    state: entry.state ?? 'Delhi',
    topic: entry.topic ?? 'General civic issues',
    sentiment: entry.sentiment,
  }));

  return (
    <div className="min-h-screen bg-background-200 text-content-primary selection:bg-[#E76F2E]/30 selection:text-white relative overflow-hidden">
      {/* 🎨 INTERACTIVE 3D MANDALA BACKGROUND */}
      <IndianMandalaBackground />

      {/* Navbar */}
      <header className="fixed top-0 left-0 w-full z-[100] border-b border-white/10 backdrop-blur-xl bg-background-200/80 shadow-glass-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-saffron flex items-center justify-center text-xl font-black text-black mcd-glow-saffron">
              J
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none uppercase text-white drop-shadow-md">JANA NAADI</span>
              <span className="text-[10px] font-black text-[#00E5FF] tracking-[0.3em] uppercase drop-shadow-sm glow-pulse">Intelligence Engine</span>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <Link to="/pulse" className="text-[11px] font-black text-content-muted hover:text-[#00E5FF] transition-all uppercase tracking-widest drop-shadow-md">
              Public Pulse
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 bg-[#00E5FF]/20 border border-[#00E5FF] hover:bg-[#00E5FF]/40 text-white rounded-xl text-xs font-black transition-all shadow-glow-cyan uppercase tracking-widest backdrop-blur-md"
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
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
            }}
          >
            <motion.div 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00E5FF]/10 border border-[#00E5FF]/30 mb-10 shadow-glow-cyan/50 backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
              <span className="text-[10px] font-black text-[#00E5FF] uppercase tracking-[0.2em] drop-shadow-md">Live Delhi MCD Reality Sync Active</span>
            </motion.div>
            
            <motion.h1 
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
              className="text-6xl md:text-[10rem] font-black mb-12 leading-[0.8] tracking-tighter uppercase text-white drop-shadow-2xl"
              style={{ textShadow: '0 0 40px rgba(0, 229, 255, 0.4)' }}
            >
              REALITY<br />
              <span className="text-gradient-india relative z-10">INTELLIGENCE</span>
            </motion.h1>
            
            <motion.p 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="text-xl md:text-2xl text-content-primary drop-shadow-md mb-16 max-w-3xl mx-auto font-medium leading-relaxed"
            >
              Transforming the Municipal Corporation of Delhi into a <span className="text-[#00E5FF] drop-shadow-sm font-bold">Data-First Democracy</span>. 
              Integrated ward-level analytics across 250 zones.
            </motion.p>

            <motion.div 
              variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
              className="flex flex-wrap justify-center gap-6"
            >
              <Link 
                to="/pulse" 
                className="px-12 py-6 mcd-glass bg-[#080A0F]/80 text-white hover:bg-surface-base/10 rounded-[28px] text-lg font-black uppercase tracking-tighter transition-all flex items-center gap-4 group shadow-glass-lg hover:shadow-[#00E5FF]/40 hover:scale-105"
              >
                Launch Intelligence Core
                <ArrowRight className="group-hover:translate-x-2 transition-transform text-[#00E5FF]" />
              </Link>
              <Link 
                to="/submit" 
                className="px-12 py-6 bg-gradient-saffron rounded-[28px] text-black text-lg font-black uppercase tracking-tighter transition-all mcd-glow-saffron hover:scale-[1.02]"
              >
                Submit Voice
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Real-time Ticker / Stats */}
        <section className="max-w-7xl mx-auto px-6 mb-40">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8">
            {[
              { label: 'Mapped Wards', val: '250', icon: Globe, color: 'text-[#00E5FF]' },
              { label: 'Active Zones', val: '12', icon: Landmark, color: 'text-[#E76F2E]' },
              { label: 'Citizens Reached', val: '1.6Cr+', icon: Activity, color: 'text-[#00E5FF]' },
            ].map((s, i) => (
              <div
                key={i}
                className="mcd-glass p-8 rounded-[32px] text-center transition-all hover:border-[#00E5FF]/50 hover:-translate-y-1 group"
              >
                <s.icon size={24} className={`mx-auto mb-4 drop-shadow-md ${s.color}`} />
                <div className="text-3xl font-black text-white mb-1 group-hover:text-[#00E5FF] transition-colors">{s.val}</div>
                <div className="text-[10px] font-black text-content-muted uppercase tracking-widest leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Value Propositions */}
        <section className="max-w-7xl mx-auto px-6 mb-40">
          <div className="grid md:grid-cols-3 gap-10">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.1 }}
              className="mcd-card group"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-saffron flex items-center justify-center text-black mb-8 mcd-glow-saffron group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight text-white drop-shadow-sm">Trust Integrity</h3>
              <p className="text-content-muted text-sm leading-relaxed">Verifiable civic data streams mapped directly to Delhi delimitation gazettes. No bias, just ground-truth.</p>
            </motion.div>


            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.2 }}
              className="mcd-card group border-[#00E5FF]/30"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#00E5FF]/20 border border-[#00E5FF] flex items-center justify-center text-[#00E5FF] mb-8 shadow-glow-cyan group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                <TrendingUp size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight relative z-10 text-white drop-shadow-sm">Delta Analytics</h3>
              <p className="text-content-muted text-sm leading-relaxed relative z-10">Advanced sentiment forecasting and ward-performance comparative matrices for official planning.</p>
              <div className="absolute inset-0 bg-gradient-to-br from-[#00E5FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl z-0" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.3 }}
              className="mcd-card group"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-saffron flex items-center justify-center text-black mb-8 mcd-glow-saffron group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Zap size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight text-white drop-shadow-sm">Rapid Response</h3>
              <p className="text-content-muted text-sm leading-relaxed">AI-Triggered alerts for rapid municipal intervention in critical hotspots across the capital city.</p>
            </motion.div>
          </div>
        </section>

        {/* Global Reality Feed (Recent Voices) */}
        <section className="max-w-5xl mx-auto px-6 mb-40">
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             className="text-center mb-16"
           >
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4 text-white drop-shadow-md">Community <span className="text-gradient-india relative z-10">Reality</span> Feed</h2>
              <p className="text-[#00E5FF] font-black uppercase text-[10px] tracking-[0.3em] drop-shadow-sm">Latest Verified Citizen Intelligence</p>
           </motion.div>
           
           <div className="space-y-4">
             {recentVoices.map((v, i) => (
               <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true, margin: "-50px" }}
                 transition={{ delay: i * 0.1 }}
                 key={i} 
                 className="mcd-glass p-8 rounded-[32px] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-[#00E5FF]/50 hover:shadow-glow-cyan/20 hover:-translate-y-1 transition-all"
               >
                  <div className="flex-1">
                    <p className="text-lg text-content-primary font-semibold mb-2 drop-shadow-sm">"{v.text}"</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#00E5FF] uppercase flex items-center gap-1 group-hover:text-white transition-colors"><Globe size={10} /> {v.state}</span>
                      <span className="text-[10px] font-bold text-content-muted">• {v.topic}</span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform group-hover:scale-105 backdrop-blur-md border ${
                    v.sentiment === 'positive' ? 'bg-[#10B981]/20 text-[#4ADE80] border-[#10B981]/40' : 
                    v.sentiment === 'negative' ? 'bg-[#EF4444]/20 text-[#FCA5A5] border-[#EF4444]/40' : 'bg-[#FF9933]/20 text-[#FFB84D] border-[#FF9933]/40'
                  }`}>
                    {v.sentiment}
                  </div>
               </motion.div>
             ))}
           </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-6">
           <div
             className="mcd-glass p-16 rounded-[60px] border border-[#00E5FF]/20 text-center relative overflow-hidden shadow-glass-lg"
           >
              <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-[#00E5FF]/10 blur-[80px] rounded-full" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF9933]/15 blur-[60px] rounded-full" />
              
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 leading-tight text-white drop-shadow-md relative z-10">
                Empowering the <br />
                <span className="text-gradient-india relative z-10">Next Era</span> of Delhi
              </h2>
              <p className="text-content-primary text-lg mb-12 max-w-2xl mx-auto leading-relaxed relative z-10">
                Join the municipal revolution. Experience a city that listens, analyzes, and evolves with its citizens.
              </p>
              <Link 
                to="/pulse" 
                className="inline-block px-14 py-6 bg-[#00E5FF]/10 border border-[#00E5FF] rounded-[32px] text-xl font-black uppercase tracking-tighter shadow-glow-cyan hover:bg-[#00E5FF]/30 hover:scale-105 transition-all text-white backdrop-blur-md relative z-10"
              >
                Launch Dashboard
              </Link>
           </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-20 bg-background-200/90 text-center backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-[#00E5FF] font-black text-[11px] uppercase tracking-[0.5em] mb-4 glow-pulse">
            JANA NAADI • MUNICIPAL INTELLIGENCE ENGINE • NATIVE CENSUS SYNC ACTIVE
          </div>
          <div className="text-content-muted font-bold text-[9px] uppercase tracking-widest">
            © 2026 MUNICIPAL CORPORATION OF DELHI • STRATEGIC DEFENSE OF DEMOCRACY
          </div>
        </div>
      </footer>
    </div>
  );
}
