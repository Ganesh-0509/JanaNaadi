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
    <div className="min-h-screen bg-[#0F1419] text-[#E8E8E8] selection:bg-[#FF9933]/30 relative overflow-hidden">
      {/* 🎨 INTERACTIVE 3D MANDALA BACKGROUND */}
      <IndianMandalaBackground />

      {/* Navbar */}
      <header className="fixed top-0 left-0 w-full z-[100] border-b border-[#FF9933]/20 backdrop-blur-xl bg-[#0F1419]/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-saffron flex items-center justify-center text-xl font-black text-[#0F1419] mcd-glow-saffron">
              J
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none uppercase text-[#E8E8E8]">JANA NAADI</span>
              <span className="text-[10px] font-black text-[#FF9933] tracking-[0.3em] uppercase">Intelligence Engine</span>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <Link to="/pulse" className="text-[11px] font-black text-[#A8A8A8] hover:text-[#FF9933] transition-all uppercase tracking-widest">
              Public Pulse
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 bg-gradient-saffron hover:scale-105 text-[#0F1419] rounded-xl text-xs font-black transition-all shadow-xl mcd-glow-saffron uppercase tracking-widest"
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF9933]/10 border border-[#FF9933]/30 mb-10 shadow-lg backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse" />
              <span className="text-[10px] font-black text-[#FFB84D] uppercase tracking-[0.2em]">Live Delhi MCD Reality Sync Active</span>
            </motion.div>
            
            <motion.h1 
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } }}
              className="text-6xl md:text-[10rem] font-black mb-12 leading-[0.8] tracking-tighter uppercase text-[#E8E8E8] drop-shadow-2xl"
              style={{ textShadow: '0 0 30px rgba(255, 153, 51, 0.3)' }}
            >
              REALITY<br />
              <span className="text-gradient-india">INTELLIGENCE</span>
            </motion.h1>
            
            <motion.p 
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
              className="text-xl md:text-2xl text-[#A8A8A8] mb-16 max-w-3xl mx-auto font-medium leading-relaxed"
            >
              Transforming the Municipal Corporation of Delhi into a <span className="text-[#FFB84D] font-bold">Data-First Democracy</span>. 
              Integrated ward-level analytics across 250 zones.
            </motion.p>

            <motion.div 
              variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}
              className="flex flex-wrap justify-center gap-6"
            >
              <Link 
                to="/pulse" 
                className="px-12 py-6 bg-[#1A1F2E] border-2 border-[#FF9933] text-[#E8E8E8] hover:bg-[#FF9933]/20 rounded-[28px] text-lg font-black uppercase tracking-tighter transition-all flex items-center gap-4 group shadow-xl hover:shadow-[#FF9933]/40 hover:scale-105"
              >
                Launch Intelligence Core
                <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </Link>
              <Link 
                to="/submit" 
                className="px-12 py-6 bg-gradient-saffron rounded-[28px] text-[#0F1419] text-lg font-black uppercase tracking-tighter transition-all mcd-glow-saffron hover:scale-[1.02]"
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
              { label: 'Mapped Wards', val: '250', icon: Globe, color: 'text-[#20B2AA]' },
              { label: 'Active Zones', val: '12', icon: Landmark, color: 'text-[#FF9933]' },
              { label: 'Citizens Reached', val: '1.6Cr+', icon: Activity, color: 'text-[#20B2AA]' },
            ].map((s, i) => (
              <div
                key={i}
                className="mcd-glass p-8 rounded-[32px] border border-[#FF9933]/20 text-center transition-all hover:border-[#FF9933]/50 hover:-translate-y-1 group"
                style={{ backgroundColor: 'rgba(26, 31, 46, 0.82)' }}
              >
                <s.icon size={24} className={`mx-auto mb-4 ${s.color}`} />
                <div className="text-3xl font-black text-[#E8E8E8] mb-1 group-hover:text-gradient-saffron">{s.val}</div>
                <div className="text-[10px] font-black text-[#A8A8A8] uppercase tracking-widest leading-tight">{s.label}</div>
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
              style={{ backgroundColor: 'rgba(26, 31, 46, 0.88)' }}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#FF9933] flex items-center justify-center text-[#0F1419] mb-8 mcd-glow-saffron group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight text-[#E8E8E8]">Trust Integrity</h3>
              <p className="text-[#A8A8A8] text-sm leading-relaxed">Verifiable civic data streams mapped directly to Delhi delimitation gazettes. No bias, just ground-truth.</p>
            </motion.div>


            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.2 }}
              className="mcd-card group border-[#FF9933]/30"
              style={{ backgroundColor: 'rgba(26, 31, 46, 0.88)' }}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#FF9933] flex items-center justify-center text-[#0F1419] mb-8 mcd-glow-saffron group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                <TrendingUp size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight relative z-10 text-[#E8E8E8]">Delta Analytics</h3>
              <p className="text-[#A8A8A8] text-sm leading-relaxed relative z-10">Advanced sentiment forecasting and ward-performance comparative matrices for official planning.</p>
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF9933]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl z-0" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ delay: 0.3 }}
              className="mcd-card group"
              style={{ backgroundColor: 'rgba(26, 31, 46, 0.88)' }}
            >
              <div className="w-14 h-14 rounded-2xl bg-[#FF9933] flex items-center justify-center text-[#0F1419] mb-8 mcd-glow-saffron group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Zap size={32} />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-tight text-[#E8E8E8]">Rapid Response</h3>
              <p className="text-[#A8A8A8] text-sm leading-relaxed">AI-Triggered alerts for rapid municipal intervention in critical hotspots across the capital city.</p>
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
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4 text-[#E8E8E8]">Community <span className="text-gradient-india">Reality</span> Feed</h2>
              <p className="text-[#A8A8A8] font-black uppercase text-[10px] tracking-[0.3em]">Latest Verified Citizen Intelligence</p>
           </motion.div>
           
           <div className="space-y-4">
             {recentVoices.map((v, i) => (
               <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true, margin: "-50px" }}
                 transition={{ delay: i * 0.1 }}
                 key={i} 
                 className="mcd-glass p-8 rounded-[32px] border border-[#FF9933]/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-[#FF9933]/50 hover:shadow-[#FF9933]/20 hover:-translate-y-1 transition-all"
                 style={{ backgroundColor: 'rgba(26, 31, 46, 0.82)' }}
               >
                  <div className="flex-1">
                    <p className="text-lg text-[#E8E8E8] font-semibold mb-2">"{v.text}"</p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#FF9933] uppercase flex items-center gap-1 group-hover:text-[#FFB84D] transition-colors"><Globe size={10} /> {v.state}</span>
                      <span className="text-[10px] font-bold text-[#A8A8A8]">• {v.topic}</span>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-transform group-hover:scale-105 ${
                    v.sentiment === 'positive' ? 'bg-[#10B981]/20 text-[#4ADE80]' : 
                    v.sentiment === 'negative' ? 'bg-[#EF4444]/20 text-[#FCA5A5]' : 'bg-[#FF9933]/20 text-[#FFB84D]'
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
             className="mcd-glass p-16 rounded-[60px] border border-[#FF9933]/20 text-center relative overflow-hidden"
             style={{ backgroundColor: 'rgba(26, 31, 46, 0.82)' }}
           >
              <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-[#FF9933]/15 blur-[80px] rounded-full" />
              <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 leading-tight text-[#E8E8E8]">
                Empowering the <br />
                <span className="text-gradient-india">Next Era</span> of Delhi
              </h2>
              <p className="text-[#A8A8A8] text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
                Join the municipal revolution. Experience a city that listens, analyzes, and evolves with its citizens.
              </p>
              <Link 
                to="/pulse" 
                className="inline-block px-14 py-6 bg-gradient-saffron rounded-[32px] text-xl font-black uppercase tracking-tighter mcd-glow-saffron hover:scale-105 transition-all text-[#0F1419]"
              >
                Launch Dashboard
              </Link>
           </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-[#FF9933]/20 py-20 bg-[#0F1419]/80 text-center backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-[#A8A8A8] font-black text-[11px] uppercase tracking-[0.5em] mb-4">
            JANA NAADI • MUNICIPAL INTELLIGENCE ENGINE • NATIVE CENSUS SYNC ACTIVE
          </div>
          <div className="text-[#707070] font-bold text-[9px] uppercase tracking-widest">
            © 2026 MUNICIPAL CORPORATION OF DELHI • STRATEGIC DEFENSE OF DEMOCRACY
          </div>
        </div>
      </footer>
    </div>
  );
}
