import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Copy, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import IndianMandalaBackground from '../components/IndianMandalaBackground';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<'email' | 'password' | null>(null);

  const demoEmail = useMemo(() => (import.meta.env.VITE_DEMO_LOGIN_EMAIL || '').trim(), []);
  const demoPassword = useMemo(() => (import.meta.env.VITE_DEMO_LOGIN_PASSWORD || '').trim(), []);
  const hasDemoCredentials = demoEmail.length > 0 && demoPassword.length > 0;

  const copyText = async (value: string, field: 'email' | 'password') => {
    if (!value) {
      setError('Demo credentials are not configured in environment variables.');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1200);
    } catch {
      const area = document.createElement('textarea');
      area.value = value;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1200);
    }
  };

  const autofillDemo = () => {
    if (!hasDemoCredentials) {
      setError('Demo credentials are not configured in environment variables.');
      return;
    }
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/pulse');
    } catch {
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1419] text-[#E8E8E8] relative overflow-hidden selection:bg-[#FF9933]/30">
      <IndianMandalaBackground />

      <div className="relative z-10 min-h-screen px-6 py-12 md:py-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF9933]/10 border border-[#FF9933]/30 shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#FF9933] animate-pulse" />
              <span className="text-[10px] font-black text-[#FFB84D] uppercase tracking-[0.2em]">Secure Civic Intelligence Access</span>
            </div>

            <div>
              <h1 className="text-5xl md:text-7xl font-black uppercase leading-[0.9] tracking-tighter text-[#E8E8E8]">
                Gov <span className="text-gradient-saffron">Access</span>
              </h1>
              <p className="mt-5 text-lg text-[#B3BCC7] max-w-xl leading-relaxed">
                Enter the Jana Naadi command layer for ward-level planning, alerts, and response operations.
              </p>
            </div>

            <div className="mcd-glass rounded-[28px] border border-[#FF9933]/20 p-6 md:p-8" style={{ backgroundColor: 'rgba(26, 31, 46, 0.82)' }}>
              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#FF9933] text-[#0F1419] flex items-center justify-center mcd-glow-saffron">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#FFB84D] font-black">Demo Credentials</p>
                    <p className="text-xs text-[#A8A8A8]">Env-driven and never embedded in component code.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={autofillDemo}
                  disabled={!hasDemoCredentials}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-saffron text-[#0F1419] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Autofill
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[#FF9933]/20 bg-[#0F1419]/60 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#FFB84D]">Email</p>
                    <p className="text-sm md:text-base text-[#E8E8E8] truncate">{demoEmail || 'Not configured'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(demoEmail, 'email')}
                    disabled={!demoEmail}
                    className="shrink-0 px-3 py-2 rounded-lg border border-[#FF9933]/30 text-[#FFB84D] hover:bg-[#FF9933]/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wide flex items-center gap-2"
                  >
                    <Copy size={14} /> {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="rounded-2xl border border-[#FF9933]/20 bg-[#0F1419]/60 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#FFB84D]">Password</p>
                    <p className="text-sm md:text-base text-[#E8E8E8] truncate">{demoPassword || 'Not configured'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(demoPassword, 'password')}
                    disabled={!demoPassword}
                    className="shrink-0 px-3 py-2 rounded-lg border border-[#FF9933]/30 text-[#FFB84D] hover:bg-[#FF9933]/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wide flex items-center gap-2"
                  >
                    <Copy size={14} /> {copiedField === 'password' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section>
            <form
              onSubmit={handleSubmit}
              className="mcd-glass rounded-[32px] border border-[#FF9933]/20 p-7 md:p-10 space-y-5"
              style={{ backgroundColor: 'rgba(26, 31, 46, 0.88)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#E8E8E8]">Authenticate</h2>
                <Link to="/" className="text-[11px] font-black text-[#A8A8A8] hover:text-[#FF9933] uppercase tracking-widest">
                  Back
                </Link>
              </div>

              {error && (
                <div className="text-[#FCA5A5] text-sm bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-3">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-[#FFB84D] block mb-2">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A8A8]" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#0F1419]/80 border border-[#2D384B] rounded-xl pl-11 pr-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#FF9933]/70"
                    placeholder="Enter your official email"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-[#FFB84D] block mb-2">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A8A8]" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-[#0F1419]/80 border border-[#2D384B] rounded-xl pl-11 pr-4 py-3 text-[#E8E8E8] focus:outline-none focus:border-[#FF9933]/70"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-saffron hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed text-[#0F1419] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Signing In...' : 'Sign In to Command Center'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
