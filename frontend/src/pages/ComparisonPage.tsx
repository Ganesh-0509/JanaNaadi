import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getComparison } from '../api/analysis';
import { getStateRankings } from '../api/public';
import CompareView from '../components/CompareView';
import { GitCompare, ExternalLink, Columns, ChevronRight } from 'lucide-react';
import { type StateRanking } from '../types/api';

export default function ComparisonPage() {
  const [wards, setWards] = useState<StateRanking[]>([]);
  const [selA, setSelA] = useState('');
  const [selB, setSelB] = useState('');
  const [selC, setSelC] = useState('');
  const [comparing, setComparing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getStateRankings()
      .then((data: StateRanking[]) => setWards(data))
      .catch(() => {});
  }, []);

  const handleCompare = async () => {
    const ids = [selA, selB, selC].filter(Boolean).map(Number);
    if (ids.length < 2) return;
    setComparing(true);
    setError(null);
    try {
      const data = await getComparison({ scope: 'ward', ids });
      setResults(data);
    } catch (e) {
      console.error('Compare error:', e);
      setError('Failed to sync ward analytics. Please refresh and try again.');
    } finally {
      setComparing(false);
    }
  };

  const dropdowns = [
    { label: 'Primary Ward', val: selA, set: setSelA },
    { label: 'Secondary Ward', val: selB, set: setSelB },
    { label: 'Tertiary Ward (Optional)', val: selC, set: setSelC },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen space-y-12 bg-background-50 p-6 text-content-primary"
    >
      {/* Header — Light Mode */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-saffron flex items-center justify-center text-white mcd-glow-saffron shadow-lg relative italic font-black">
            <GitCompare size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight leading-none italic text-content-primary">WARD <span className="text-primary-500">DIFFERENTIAL</span></h1>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.25em] text-content-secondary italic">
              Comparative Municipal Integrity & Reality Sync
            </p>
          </div>
        </div>
      </div>

      {/* Selector Console — Light Mode */}
      <div className="group relative overflow-hidden rounded-[40px] border border-[var(--color-border)] bg-background-100 p-10 shadow-sm">
        <div className="pointer-events-none absolute right-0 top-0 p-12 opacity-[0.03] text-content-primary transition-transform group-hover:scale-110">
           <Columns size={120} />
        </div>
        
        <div className="relative z-10 flex flex-wrap gap-8 items-end">
          {dropdowns.map(({ label, val, set }) => (
            <div key={label} className="flex-1 min-w-[240px]">
              <label className="mb-3 ml-1 block text-[9px] font-black uppercase tracking-widest text-content-secondary italic">{label}</label>
              <div className="relative group/select">
                <select
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-xl border-2 border-[var(--color-border)] bg-surface-base px-6 py-4 text-xs font-black uppercase tracking-widest text-content-primary transition-all focus:border-primary-300 group-hover/select:border-content-muted/50 italic"
                >
                  <option value="">SELECT WARD PLATFORM…</option>
                  {wards.map((w) => (
                    <option key={w.state_id} value={String(w.state_id)}>
                      {w.state}
                    </option>
                  ))}
                </select>
                 <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-content-muted transition-colors group-hover/select:text-primary-500">
                   <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleCompare}
            disabled={!selA || !selB || comparing}
            className="flex items-center gap-4 px-12 py-5 bg-gradient-saffron hover:scale-[1.02] disabled:opacity-30 disabled:scale-100 rounded-2xl text-xl font-black text-white mcd-glow-saffron transition-all shadow-xl uppercase tracking-tighter italic"
          >
            {comparing ? 'INTEGRATING...' : 'SYNC AUDIT'}
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl border border-red-100 bg-red-50/50 p-8 text-center text-sm font-black uppercase tracking-[0.2em] text-red-500 italic shadow-sm">
          {error}
        </motion.div>
      )}

      {results && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[40px] border border-[var(--color-border)] bg-surface-base p-10 shadow-sm"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 border-b border-slate-50 pb-10 gap-6">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter italic text-content-primary">Intelligence <span className="text-primary-500">Delta</span> Results</h2>
              <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-content-secondary font-mono italic">Comparing {results.length} Municipal Zones</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {results.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/analysis/ward/${r.id}`)}
                  className="flex items-center gap-3 text-[10px] font-black px-5 py-2.5 rounded-xl bg-surface-base text-content-secondary hover:bg-[#E76F2E]/10 hover:text-[#E76F2E] transition-all uppercase border border-white/10 italic shadow-sm"
                >
                  <ExternalLink size={14} /> Audit: {r.name}
                </button>
              ))}
            </div>
          </div>
          <CompareView items={results} />
        </motion.div>
      )}

      {!results && !comparing && (
        <div className="bg-surface-base/30 rounded-[60px] border border-white/15 border-dashed p-40 text-center relative overflow-hidden transition-all hover:bg-surface-base/50">
          <div className="absolute inset-0 bg-[#E76F2E]/[0.03] pointer-events-none" />
          <GitCompare size={80} className="mx-auto text-content-secondary/40 mb-8 opacity-50" />
          <p className="text-content-secondary font-black uppercase tracking-[0.4em] text-sm italic">Select multiple wards to engage side-by-side audit sync</p>
        </div>
      )}
    </motion.div>
  );
}
