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
      className="p-6 space-y-12 bg-white min-h-screen"
    >
      {/* Header — Light Mode */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-saffron flex items-center justify-center text-white mcd-glow-saffron shadow-lg relative italic font-black">
            <GitCompare size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight leading-none italic text-[#3E2C23]">WARD <span className="text-[#E76F2E]">DIFFERENTIAL</span></h1>
            <p className="text-[10px] font-bold text-[#6B5E57] uppercase tracking-[0.25em] mt-2 italic">
              Comparative Municipal Integrity & Reality Sync
            </p>
          </div>
        </div>
      </div>

      {/* Selector Console — Light Mode */}
      <div className="mcd-card border-[#3E2C23]/5 bg-[#FAF5ED]/50 relative overflow-hidden group p-10 rounded-[40px] shadow-sm">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform text-[#3E2C23]">
           <Columns size={120} />
        </div>
        
        <div className="relative z-10 flex flex-wrap gap-8 items-end">
          {dropdowns.map(({ label, val, set }) => (
            <div key={label} className="flex-1 min-w-[240px]">
              <label className="text-[9px] font-black text-[#6B5E57] uppercase tracking-widest block mb-3 ml-1 italic">{label}</label>
              <div className="relative group/select">
                <select
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  className="w-full bg-white border-2 border-[#3E2C23]/5 rounded-xl px-6 py-4 text-xs text-[#3E2C23] font-black uppercase focus:border-[#E76F2E]/30 transition-all appearance-none cursor-pointer group-hover/select:border-[#3E2C23]/10 tracking-widest italic"
                >
                  <option value="">SELECT WARD PLATFORM…</option>
                  {wards.map((w) => (
                    <option key={w.state_id} value={String(w.state_id)}>
                      {w.state}
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#6B5E57]/60 group-hover/select:text-[#E76F2E] transition-colors">
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50/50 border border-red-100 rounded-3xl p-8 text-sm font-black text-red-500 uppercase tracking-[0.2em] text-center italic shadow-sm">
          {error}
        </motion.div>
      )}

      {results && results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mcd-card border-[#3E2C23]/5 bg-white p-10 rounded-[40px] shadow-sm"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 border-b border-slate-50 pb-10 gap-6">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter italic text-[#3E2C23]">Intelligence <span className="text-[#E76F2E]">Delta</span> Results</h2>
              <p className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest mt-2 font-mono italic">Comparing {results.length} Municipal Zones</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {results.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/analysis/ward/${r.id}`)}
                  className="flex items-center gap-3 text-[10px] font-black px-5 py-2.5 rounded-xl bg-[#FAF5ED] text-[#6B5E57] hover:bg-[#E76F2E]/10 hover:text-[#E76F2E] transition-all uppercase border border-[#3E2C23]/5 italic shadow-sm"
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
        <div className="bg-[#FAF5ED]/30 rounded-[60px] border border-[#3E2C23]/10 border-dashed p-40 text-center relative overflow-hidden transition-all hover:bg-[#FAF5ED]/50">
          <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
          <GitCompare size={80} className="mx-auto text-[#6B5E57]/40 mb-8 opacity-50" />
          <p className="text-[#6B5E57] font-black uppercase tracking-[0.4em] text-sm italic">Select multiple wards to engage side-by-side audit sync</p>
        </div>
      )}
    </motion.div>
  );
}
