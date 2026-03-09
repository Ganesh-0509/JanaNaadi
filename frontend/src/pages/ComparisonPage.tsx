import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getComparison } from '../api/analysis';
import { getStateRankings } from '../api/public';
import CompareView from '../components/CompareView';
import { GitCompare, ExternalLink } from 'lucide-react';

interface StateOption {
  id: number;
  name: string;
}

export default function ComparisonPage() {
  const [states, setStates] = useState<StateOption[]>([]);
  const [selA, setSelA] = useState('');
  const [selB, setSelB] = useState('');
  const [selC, setSelC] = useState('');
  const [comparing, setComparing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getStateRankings()
      .then((data: any[]) =>
        setStates(data.map((s: any) => ({ id: s.state_id, name: s.state })))
      )
      .catch(() => {});
  }, []);

  const handleCompare = async () => {
    const ids = [selA, selB, selC].filter(Boolean).map(Number);
    if (ids.length < 2) return;
    setComparing(true);
    setError(null);
    try {
      const data = await getComparison({ scope: 'state', ids });
      setResults(data);
    } catch (e) {
      console.error('Compare error:', e);
      setError('Failed to load comparison data. Please try again.');
    } finally {
      setComparing(false);
    }
  };

  const dropdowns = [
    { label: 'State A', val: selA, set: setSelA },
    { label: 'State B', val: selB, set: setSelB },
    { label: 'State C (optional)', val: selC, set: setSelC },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold">Compare States</h1>
        <p className="text-sm text-slate-400">
          Select 2–3 states to see sentiment and top issues side by side
        </p>
      </div>

      {/* Selector */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex flex-wrap gap-4 items-end">
          {dropdowns.map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-xs text-slate-400 block mb-1">{label}</label>
              <select
                value={val}
                onChange={(e) => set(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-48"
              >
                <option value="">Select state…</option>
                {states.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <button
            onClick={handleCompare}
            disabled={!selA || !selB || comparing}
            className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            <GitCompare size={15} />
            {comparing ? 'Comparing…' : 'Compare'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {results && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
        >
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h2 className="font-bold">Comparison Results</h2>
            {/* Deep-drill links */}
            <div className="flex gap-2 flex-wrap">
              {results.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/analysis/state/${r.id}`)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-500/15 text-blue-400 hover:bg-blue-500/30 transition-colors"
                >
                  <ExternalLink size={11} /> Deep dive: {r.name}
                </button>
              ))}
            </div>
          </div>
          <CompareView items={results} />
        </motion.div>
      )}

      {!results && !comparing && (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed p-20 text-center">
          <GitCompare size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">Select states above and click Compare</p>
        </div>
      )}
    </motion.div>
  );
}
