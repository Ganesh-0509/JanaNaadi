import { Link } from 'react-router-dom';
import { Map, Activity, BarChart3, Shield, ArrowRight, Send, MessageSquare, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import LiveTicker from '../components/LiveTicker';
import { getNationalPulse, submitCitizenVoice, getRecentVoices } from '../api/public';
import { formatRelative } from '../utils/formatters';

export default function Landing() {
  const [entries, setEntries] = useState(0);
  const [voiceText, setVoiceText] = useState('');
  const [voiceArea, setVoiceArea] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recentVoices, setRecentVoices] = useState<Array<{ text: string; sentiment: string; topic: string; state: string; source: string; time?: string }>>([]);

  useEffect(() => {
    getNationalPulse().then((data) => setEntries(data.total_entries_24h ?? 0)).catch(() => {});
    getRecentVoices(8).then(setRecentVoices).catch(() => {});
  }, []);

  const handleSubmitVoice = async () => {
    if (voiceText.trim().length < 10) return;
    setSubmitting(true);
    try {
      await submitCitizenVoice(voiceText, voiceArea || undefined);
      setSubmitted(true);
      setVoiceText('');
      setVoiceArea('');
      setTimeout(() => setSubmitted(false), 4000);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navbar */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center text-lg font-bold">
              J
            </div>
            <span className="text-xl font-bold">JanaNaadi</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/pulse" className="text-sm text-slate-300 hover:text-white">
              Community Pulse
            </Link>
            <Link
              to="/login"
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Governance Login
            </Link>
          </div>
        </div>
      </header>

      {/* Live Ticker */}
      <LiveTicker entries={entries} />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 text-center relative overflow-hidden">
        {/* Pulsing background rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full border border-blue-500/10 animate-ping" style={{ animationDuration: '4s' }} />
          <div className="absolute w-[350px] h-[350px] rounded-full border border-emerald-500/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
          <div className="absolute w-[200px] h-[200px] rounded-full bg-blue-500/5 animate-pulse" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10"
        >
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20">
            🇮🇳 India Innovates 2026
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Your Voice.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              India's Pulse.
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-6 max-w-2xl mx-auto leading-relaxed">
            Report local issues anonymously. See how your community feels. Help policymakers understand the real India — powered by AI.
          </p>

          {/* Language showcase */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {['English', 'हिन्दी', 'தமிழ்', 'తెలుగు', 'বাংলা', 'मराठी', 'ಕನ್ನಡ', 'മലയാളം', 'ગુજરાતી'].map((lang, i) => (
              <motion.span
                key={lang}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.8 + i * 0.08 }}
                className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700"
              >
                {lang}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* 🎯 SUBMIT YOUR VOICE — the unique citizen participation feature */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-3xl p-8 border border-slate-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="text-blue-400" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Report Your Concern</h2>
                <p className="text-sm text-slate-400">Anonymous • AI-analyzed • Reaches policymakers</p>
              </div>
            </div>

            <textarea
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="What's the biggest issue in your area? e.g., 'Water supply is irregular in our ward for the past 2 weeks...'"
              className="w-full h-28 bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              maxLength={2000}
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-3">
              <div className="flex-1 flex items-center gap-2 bg-slate-900/60 border border-slate-600 rounded-xl px-4 py-2.5">
                <Search size={16} className="text-slate-400" />
                <input
                  value={voiceArea}
                  onChange={(e) => setVoiceArea(e.target.value)}
                  placeholder="Your area (e.g., Chennai, Lucknow)"
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                  maxLength={200}
                />
              </div>
              <button
                onClick={handleSubmitVoice}
                disabled={submitting || voiceText.trim().length < 10}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  submitted
                    ? 'bg-emerald-500 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {submitted ? (
                  <>✓ Voice Recorded</>
                ) : submitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Voice
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {voiceText.length}/2000 characters • Your submission is anonymous and processed by AI
            </p>
          </div>
        </div>
      </section>

      {/* LIVE COMMUNITY VOICES FEED */}
      {recentVoices.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Community Voices
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentVoices.map((v, i) => (
              <div
                key={i}
                className={`bg-slate-800 rounded-xl p-4 border ${
                  v.sentiment === 'positive'
                    ? 'border-emerald-500/30'
                    : v.sentiment === 'negative'
                    ? 'border-red-500/30'
                    : 'border-slate-700'
                }`}
              >
                <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 mb-3">
                  "{v.text}"
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{v.state} {v.time ? `· ${formatRelative(v.time)}` : ''}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        v.sentiment === 'positive'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : v.sentiment === 'negative'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-slate-600/50 text-slate-400'
                      }`}
                    >
                      {v.sentiment}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs">
                      {v.topic}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              to="/pulse"
              className="text-sm text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
            >
              See full community pulse <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      )}

      {/* CTA Buttons */}
      <section className="max-w-7xl mx-auto px-6 pb-16 text-center">
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/pulse"
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-semibold text-lg transition-colors"
          >
            <Activity size={20} />
            Community Pulse
            <ArrowRight size={18} />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-semibold text-lg transition-colors"
          >
            <Map size={20} />
            Governance Dashboard
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<MessageSquare className="text-blue-400" size={28} />}
            title="Be the Voice"
            description="Report local issues anonymously. Your concern gets AI-analyzed and mapped to your area's democratic geography."
            index={0}
          />
          <FeatureCard
            icon={<BarChart3 className="text-emerald-400" size={28} />}
            title="Multilingual AI Analysis"
            description="Powered by Gemini 2.5 Flash via Bytez. Understands 22+ Indian languages with contextual sentiment analysis."
            index={1}
          />
          <FeatureCard
            icon={<Shield className="text-amber-400" size={28} />}
            title="AI Policy Intelligence"
            description="Your voices become AI-generated policy briefs & alerts that reach governance analysts & policymakers."
            index={2}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-slate-500">
          JanaNaadi — Pulse of the People • Built for India Innovates 2026
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, index = 0 }: { icon: React.ReactNode; title: string; description: string; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-slate-600 transition-colors"
    >
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}
