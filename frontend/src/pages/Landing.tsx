import { Link } from 'react-router-dom';
import { Activity, Shield, ArrowRight, Send, MessageSquare, Search, Wifi, Globe, Cpu, Layers, Network, Zap, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import LiveTicker from '../components/LiveTicker';
import { submitCitizenVoice, getRecentVoices } from '../api/public';
import { formatRelative } from '../utils/formatters';
import { useLivePulse } from '../hooks/useLivePulse';

export default function Landing() {
  const { pulse, status } = useLivePulse();
  const [voiceText, setVoiceText] = useState('');
  const [voiceArea, setVoiceArea] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recentVoices, setRecentVoices] = useState<Array<{ text: string; sentiment: string; topic: string; state: string; source: string; time?: string }>>([]);

  const entries = pulse?.total_entries_24h ?? 0;

  useEffect(() => {
    getRecentVoices(8).then(setRecentVoices).catch(() => {});
  }, []);

  const handleSubmitVoice = async () => {
    if (voiceText.trim().length < 10) return;
    setSubmitting(true);
    try {
      await submitCitizenVoice(voiceText, voiceArea || undefined);
      setVoiceText('');
      setVoiceArea('');
    } catch { /* silent */ } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-[#F8FAFC]">
      {/* 🏙️ ATMOSPHERIC HERO BACKGROUND */}
      <div className="absolute top-0 left-0 w-full h-[85vh] overflow-hidden pointer-events-none">
        <img 
          src="/jana_naadi_hero_mcd_1774418640719.png" 
          alt="Hero background" 
          className="w-full h-full object-cover opacity-20 blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B0F1A]/80 to-[#0B0F1A]" />
      </div>

      {/* Navbar */}
      <header className="relative z-50 border-b border-white/5 backdrop-blur-md bg-[#0B0F1A]/40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF9933] to-[#FF5E14] flex items-center justify-center text-xl font-black text-white mcd-glow-saffron">
              J
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight leading-none uppercase">JANA NAADI</span>
              <span className="text-[10px] font-bold text-[#FF9933] tracking-[0.2em] uppercase">Intelligence Engine</span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <Link to="/pulse" className="text-sm font-bold text-slate-400 hover:text-[#FF9933] transition-colors">
              Public Pulse
            </Link>
            <Link
              to="/login"
              className="px-6 py-2.5 bg-[#FF9933] hover:bg-[#FF8000] text-white rounded-xl text-sm font-black transition-all shadow-lg mcd-glow-saffron"
            >
              Governance Access
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-28 pb-20 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-5xl md:text-8xl font-black mb-10 leading-[0.9] tracking-tighter uppercase">
            MUNICIPAL<br />
            <span className="text-gradient-saffron">INTELLIGENCE</span> ENGINE
          </h1>
          <p className="text-xl text-slate-400 mb-14 max-w-3xl mx-auto font-medium leading-relaxed">
            A specialized digital twin for the <span className="text-white">City of Delhi</span>. 
            Aggregating citizen voices and municipal data from <span className="text-white">250 Official Wards</span> 
            to drive democratic accountability in real-time.
          </p>
        </motion.div>
      </section>

      {/* PROFESSIONAL LANDING: Value, Features, Testimonials, CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        {/* Value Proposition Row */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="mcd-glass p-10 rounded-[40px] border border-white/5 relative overflow-hidden group text-center">
            <Network className="mx-auto mb-6 text-[#FF9933]" size={52} />
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tight text-white">Unified Civic Intelligence</h3>
            <p className="text-slate-400 text-sm leading-relaxed">All your city’s voices, grievances, and news in one place. Real-time, AI-powered, and mapped to every ward.</p>
          </div>
          <div className="mcd-glass p-10 rounded-[40px] border border-white/5 relative overflow-hidden group text-center">
            <BarChart3 className="mx-auto mb-6 text-[#0FD2B5]" size={52} />
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tight text-white">Actionable Analytics</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Instant dashboards, trends, and alerts for officials and citizens. See what matters, when it matters.</p>
          </div>
          <div className="mcd-glass p-10 rounded-[40px] border border-white/5 relative overflow-hidden group text-center">
            <Shield className="mx-auto mb-6 text-[#FF9933]" size={52} />
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tight text-white">Trust & Transparency</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Boost public trust with transparent, accessible, and verifiable civic data for every resident.</p>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-[#101624] rounded-3xl border border-white/5 p-10 mb-16">
          <h2 className="text-3xl font-black mb-6 uppercase tracking-tight text-white text-center">Features</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <Activity className="mx-auto mb-3 text-[#FF9933]" size={36} />
              <div className="font-black text-white mb-1">Live Data Ingestion</div>
              <div className="text-slate-400 text-xs">News, grievances, and social signals ingested every 15 minutes.</div>
            </div>
            <div>
              <Layers className="mx-auto mb-3 text-[#0FD2B5]" size={36} />
              <div className="font-black text-white mb-1">AI/NLP Processing</div>
              <div className="text-slate-400 text-xs">Entities, sentiment, and topics extracted and mapped to wards.</div>
            </div>
            <div>
              <BarChart3 className="mx-auto mb-3 text-[#FF9933]" size={36} />
              <div className="font-black text-white mb-1">Ward Analytics</div>
              <div className="text-slate-400 text-xs">Population-weighted impact, trends, and performance metrics.</div>
            </div>
            <div>
              <Wifi className="mx-auto mb-3 text-[#0FD2B5]" size={36} />
              <div className="font-black text-white mb-1">Real-Time Dashboards</div>
              <div className="text-slate-400 text-xs">Interactive dashboards and maps for all users.</div>
            </div>
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="bg-[#0B0F1A] rounded-3xl border border-white/5 p-10 mb-16">
          <h2 className="text-3xl font-black mb-6 uppercase tracking-tight text-white text-center">What People Say</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-left">
              <div className="font-black text-white mb-2">“JanaNaadi helped us spot and resolve issues in our ward faster than ever.”</div>
              <div className="text-slate-400 text-xs">— MCD Official, Delhi</div>
            </div>
            <div className="text-left">
              <div className="font-black text-white mb-2">“I finally feel heard as a citizen. My complaint was tracked and solved.”</div>
              <div className="text-slate-400 text-xs">— Resident, Narela Zone</div>
            </div>
          </div>
        </div>

        {/* Call to Action Section */}
        <div className="bg-[#101624] rounded-3xl border border-white/5 p-10 mb-16 text-center">
          <h2 className="text-3xl font-black mb-6 uppercase tracking-tight text-white">Ready to experience better governance?</h2>
          <p className="text-slate-400 text-lg mb-8">Join thousands of residents and officials using JanaNaadi for a smarter, more responsive city.</p>
          <Link to="/pulse" className="inline-block px-8 py-4 bg-[#FF9933] hover:bg-[#FF8000] text-white rounded-2xl text-lg font-black transition-all shadow-lg mcd-glow-saffron">Explore Public Pulse</Link>
        </div>
      </section>

        {/* Live Stats (example, can be enhanced with real data) */}
        <div className="bg-[#0B0F1A] rounded-3xl border border-white/5 p-10 mb-16">
          <h2 className="text-3xl font-black mb-6 uppercase tracking-tight text-white text-center">Live Stats</h2>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="font-black text-white text-2xl mb-1">{entries}</div>
              <div className="text-slate-400 text-xs">Entries (24h)</div>
            </div>
            <div>
              <div className="font-black text-white text-2xl mb-1">12</div>
              <div className="text-slate-400 text-xs">Zones</div>
            </div>
            <div>
              <div className="font-black text-white text-2xl mb-1">250</div>
              <div className="text-slate-400 text-xs">Wards</div>
            </div>
            <div>
              <div className="font-black text-white text-2xl mb-1">1.6Cr+</div>
              <div className="text-slate-400 text-xs">Citizens</div>
            </div>
          </div>
        </div>

      {/* 🎯 CITIZEN CONSOLE */}
      <section className="relative z-20 max-w-5xl mx-auto px-6 pb-24">
        <div className="mcd-glass rounded-[40px] p-1 w-full mcd-glow-saffron">
          <div className="bg-[#0B0F1A]/80 rounded-[38px] p-10 border border-white/5 overflow-hidden">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-16 h-16 rounded-2xl bg-[#FF9933] flex items-center justify-center mcd-glow-saffron shadow-lg">
                <MessageSquare className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black tracking-tight uppercase">Submit Reality Pulse</h2>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Direct Citizen to Governance Sync</p>
              </div>
            </div>

            <textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Report ward issues... e.g. Water supply irregularity in Narela Zone."
              className="w-full h-32 bg-white/[0.03] border-2 border-white/5 rounded-2xl p-6 text-lg text-white"
            />

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <input
                value={voiceArea}
                onChange={(e) => setVoiceArea(e.target.value)}
                placeholder="Ward / AC Name"
                className="flex-1 bg-white/[0.03] border-2 border-white/5 rounded-2xl px-6 py-4 font-bold text-white"
              />
              <button
                onClick={handleSubmitVoice}
                disabled={submitting || voiceText.trim().length < 10}
                className="bg-[#FF9933] hover:bg-[#FF8000] px-10 py-4 rounded-2xl font-black text-white"
              >
                {submitting ? 'SYNCING...' : 'PUSH TO CORE'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 bg-black/20 text-center">
        <div className="text-slate-600 font-black text-[10px] uppercase tracking-widest">
          JANA NAADI • MUNICIPAL INTELLIGENCE ENGINE • NATIVE CENSUS SYNC
        </div>
      </footer>
    </div>
  );
}
