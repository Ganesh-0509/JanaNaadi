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
    <div className="min-h-screen bg-background-200 text-content-primary relative overflow-hidden selection:bg-[#00E5FF]/30 selection:text-white">
      <IndianMandalaBackground />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_18%_22%,rgba(0,229,255,0.14),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,153,51,0.12),transparent_38%),linear-gradient(180deg,rgba(6,9,17,0.7),rgba(6,9,17,0.88))]" />

      <div className="relative z-20 min-h-screen px-4 py-8 sm:px-6 sm:py-10 md:py-14 lg:py-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.05fr_0.95fr] gap-8 xl:gap-12 items-center">
          <section className="order-2 lg:order-1 space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00E5FF]/12 border border-[#00E5FF]/35 shadow-glow-cyan/40 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
              <span className="text-[10px] font-black text-[#7DEBFF] uppercase tracking-[0.2em] drop-shadow-md">Secure Civic Intelligence Access</span>
            </div>

            <div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black uppercase leading-[0.9] tracking-tighter text-white drop-shadow-lg">
                Gov <span className="text-gradient-saffron relative z-10">Access</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-content-primary/95 drop-shadow-sm max-w-xl leading-relaxed">
                Enter the Jana Naadi command layer for ward-level planning, alerts, and response operations.
              </p>
            </div>

            <div className="mcd-glass rounded-[28px] border border-white/12 p-5 sm:p-6 md:p-8 bg-[#080A0F]/70">
              <div className="flex items-start sm:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF] text-[#00E5FF] flex items-center justify-center shadow-glow-cyan">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#7DEBFF] font-black drop-shadow-md">Demo Credentials</p>
                    <p className="text-xs text-content-secondary">Env-driven and never embedded in component code.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={autofillDemo}
                  disabled={!hasDemoCredentials}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-surface-base/10 text-white hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] border border-white/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glass"
                >
                  Autofill
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-background-200/85 px-4 py-3 flex items-center justify-between gap-3 shadow-glass">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF]">Email</p>
                    <p className="text-sm md:text-base text-white truncate drop-shadow-sm">{demoEmail || 'Not configured'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(demoEmail, 'email')}
                    disabled={!demoEmail}
                    className="shrink-0 px-3 py-2 rounded-lg border border-white/15 text-content-secondary hover:text-white hover:bg-surface-base/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-all"
                  >
                    <Copy size={14} /> {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-background-200/85 px-4 py-3 flex items-center justify-between gap-3 shadow-glass">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF]">Password</p>
                    <p className="text-sm md:text-base text-white truncate drop-shadow-sm">{demoPassword || 'Not configured'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(demoPassword, 'password')}
                    disabled={!demoPassword}
                    className="shrink-0 px-3 py-2 rounded-lg border border-white/15 text-content-secondary hover:text-white hover:bg-surface-base/10 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-all"
                  >
                    <Copy size={14} /> {copiedField === 'password' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="order-1 lg:order-2">
            <form
              onSubmit={handleSubmit}
              className="mcd-glass rounded-[30px] border border-white/12 p-6 sm:p-7 md:p-9 lg:p-10 space-y-6 shadow-glass-lg relative z-10 bg-[#060A12]/78"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white drop-shadow-md">Authenticate</h2>
                <Link to="/" className="text-[11px] font-black text-content-secondary hover:text-[#00E5FF] uppercase tracking-widest transition-colors">
                  Back
                </Link>
              </div>

              <p className="text-sm text-content-secondary/95 -mt-2">
                Use your authorized civic account to enter the command center.
              </p>

              {error && (
                <div className="text-[#FCA5A5] text-sm bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-3">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-[#00E5FF] block mb-2 drop-shadow-md">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-12 bg-background-200/85 border border-white/20 rounded-xl pl-14 pr-4 py-0 text-sm leading-normal text-white placeholder:text-content-secondary/70 focus:outline-none focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/30 transition-all shadow-inner"
                    placeholder="Enter your official email"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-[#00E5FF] block mb-2 drop-shadow-md">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 bg-background-200/85 border border-white/20 rounded-xl pl-14 pr-4 py-0 text-sm leading-normal text-white placeholder:text-content-secondary/70 focus:outline-none focus:border-[#00E5FF] focus:ring-2 focus:ring-[#00E5FF]/30 transition-all shadow-inner"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-xl bg-[#00E5FF]/22 border border-[#00E5FF] text-white hover:bg-[#00E5FF]/40 disabled:opacity-60 disabled:cursor-not-allowed text-[15px] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-glow-cyan backdrop-blur-md"
              >
                {loading ? 'Authenticating...' : 'Sign In to Command Center'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
