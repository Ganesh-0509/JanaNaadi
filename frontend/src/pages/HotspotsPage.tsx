import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, TrendingDown, AlertTriangle, ArrowRight } from 'lucide-react';
import { getHotspots } from '../api/public';
import { useFilters } from '../context/FilterContext';
import { type Hotspot, urgencyConfig } from '../types/api';

export default function HotspotsPage() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const { filters } = useFilters();

  useEffect(() => {
    setLoading(true);
    getHotspots(15)
      .then(setHotspots)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters.timeRange]); // Re-fetch when timeRange filter changes

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-8 bg-[#F5E9D8]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] flex items-center justify-center text-white mcd-glow-saffron">
            <Flame size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              URGENCY <span className="text-[#EF4444]">HOTSPOTS</span>
            </h1>
            <p className="text-[10px] font-bold text-[#6B5E57] uppercase tracking-widest">
              Wards ranked by criticality — High Negativity + Volume (Delhi MCD)
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-[#161B2E] rounded-3xl p-6 border border-white/5 animate-pulse h-28" />
          ))}
        </div>
      ) : hotspots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-[#6B5E57] gap-4">
          <AlertTriangle size={60} className="opacity-20" />
          <p className="font-black uppercase tracking-widest text-xs">No active hotspot data detected in core</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {hotspots.map((h, i) => {
            const colors = urgencyConfig(h.urgency_score);
            return (
              <motion.div
                key={h.state_code}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-[#161B2E] rounded-3xl p-6 border border-white/5 hover:border-[#E76F2E]/30 transition-all group mcd-card"
              >
                <div className="flex items-center justify-between gap-6">
                  {/* Rank + Name */}
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all
                      ${i === 0 ? 'bg-[#EF4444]/20 text-[#EF4444] shadow-lg shadow-[#EF4444]/10' : 
                        i === 1 ? 'bg-[#E76F2E]/20 text-[#E76F2E]' : 
                        i === 2 ? 'bg-[#EAB308]/20 text-[#EAB308]' : 'bg-[#F5E9D8] text-[#6B5E57]'}
                    `}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-black text-xl uppercase tracking-tight text-white group-hover:text-[#E76F2E] transition-colors">{h.state}</div>
                      <div className="text-[10px] font-bold text-[#6B5E57] uppercase tracking-widest mt-1">
                        {h.volume.toLocaleString()} reports ingested · Sentiment {h.avg_sentiment.toFixed(3)}
                      </div>
                    </div>
                  </div>

                  {/* Urgency Badge + drill-down */}
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>{colors.label}</div>
                      <div className={`text-2xl font-black font-mono ${colors.text}`}>
                        {(h.urgency_score * 100).toFixed(0)}
                      </div>
                    </div>
                    <Link
                      to={`/analysis/state/${h.state_code}`}
                      className="w-12 h-12 rounded-xl bg-[#F5E9D8] border border-white/5 flex items-center justify-center text-[#6B5E57] hover:text-[#E76F2E] hover:border-[#E76F2E]/50 transition-all"
                    >
                      <ArrowRight size={20} />
                    </Link>
                  </div>
                </div>

                {/* Urgency bar */}
                <div className="mt-6 h-1.5 w-full bg-[#F5E9D8] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${h.urgency_score * 100}%` }}
                    transition={{ delay: i * 0.04 + 0.2, duration: 0.6 }}
                    className={`h-full rounded-full ${colors.bar}`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {!loading && hotspots.length > 0 && (
        <div className="flex flex-wrap items-center gap-8 py-8 border-t border-white/5">
          <span className="font-black text-[10px] text-[#6B5E57] uppercase tracking-[0.2em]">Urgency Spectrum:</span>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EAB308]" />
            <span className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest">Stable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#E76F2E]" />
            <span className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
            <span className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <span className="text-[10px] font-black text-[#6B5E57] uppercase tracking-widest">High Alert</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
