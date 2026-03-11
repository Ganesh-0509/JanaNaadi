import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Info, Copy } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const demoEmail = 'admin@jananaadi.demo';
  const demoPassword = 'JudgeDemo2026!';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const useDemoCredentials = () => {
    setEmail(demoEmail);
    setPassword(demoPassword);
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-xl bg-blue-500 items-center justify-center text-2xl font-bold mb-4">
            J
          </div>
          <h1 className="text-2xl font-bold">Admin Login</h1>
          <p className="text-slate-400 text-sm mt-1">Access the JanaNaadi command center</p>
        </div>

        {/* Demo Credentials Box for Judges */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="text-blue-400 mt-0.5 flex-shrink-0" size={20} />
            <div className="flex-1">
              <h3 className="text-blue-300 font-semibold text-sm mb-2">
                🎯 For Judges & Evaluators
              </h3>
              <p className="text-slate-300 text-xs mb-3">
                Use demo admin credentials to access all features including Knowledge Graph
              </p>
              <div className="bg-slate-900/50 rounded-lg p-3 space-y-2 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Email</div>
                    <div className="text-sm text-white font-mono">{demoEmail}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(demoEmail)}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Copy email"
                  >
                    <Copy size={14} className="text-slate-400" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400">Password</div>
                    <div className="text-sm text-white font-mono">{demoPassword}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(demoPassword)}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Copy password"
                  >
                    <Copy size={14} className="text-slate-400" />
                  </button>
                </div>
              </div>
              <button
                onClick={useDemoCredentials}
                className="mt-3 w-full py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 rounded-lg transition-colors font-medium"
              >
                Auto-fill Demo Credentials
              </button>
              {copied && (
                <div className="text-xs text-green-400 mt-2 text-center">
                  ✓ Copied to clipboard!
                </div>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4">
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm text-slate-400 block mb-1.5">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              placeholder="admin@jananaadi.in"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 block mb-1.5">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
