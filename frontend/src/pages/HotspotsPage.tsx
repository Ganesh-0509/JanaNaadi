import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, TrendingDown, AlertTriangle, ArrowRight } from 'lucide-react';
import { getHotspots } from '../api/public';

interface Hotspot {
  state_id: number;
  state: string;
  state_code: string;
  urgency_score: number;
  avg_sentiment: number;
  volume: number;
}

function urgencyColor(score: number) {
  if (score >= 0.7) return { bar: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400 border-red-500/30' };
  if (score >= 0.4) return { bar: 'bg-amber-500', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  return { bar: 'bg-yellow-400', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
}

function urgencyLabel(score: number) {
  if (score >= 0.7) return 'Critical';
  if (score >= 0.4) return 'High';
  if (score >= 0.2) return 'Moderate';
  return 'Low';
}

export default function HotspotsPage() {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHotspots(15)
      .then(setHotspots)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame size={24} className="text-red-400" />
            Urgency Hotspots
          </h1>
          <p className="text-sm text-slate-400">States ranked by urgency — high negativity + volume in last 24h</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-2xl p-5 border border-slate-700 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-700" />
                  <div>
                    <div className="h-5 w-32 bg-slate-700 rounded mb-1" />
                    <div className="h-3 w-20 bg-slate-700 rounded" />
                  </div>
                </div>
                <div className="h-4 w-24 bg-slate-700 rounded" />
              </div>
              <div className="mt-3 h-2 w-full bg-slate-700 rounded-full" />
            </div>
          ))}
        </div>
      ) : hotspots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 gap-3">
          <AlertTriangle size={40} className="opacity-40" />
          <p>No hotspot data available yet</p>
          <p className="text-xs">Data will appear once voices are ingested</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hotspots.map((h, i) => {
            const colors = urgencyColor(h.urgency_score);
            return (
              <motion.div
                key={h.state_code}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Rank + Name */}
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm
                      ${i === 0 ? 'bg-red-500/20 text-red-400' : i === 1 ? 'bg-orange-500/20 text-orange-400' : i === 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700/50 text-slate-400'}
                    `}>
                      {i + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-base">{h.state}</div>
                      <div className="text-xs text-slate-500">
                        {h.volume.toLocaleString()} voices · Sentiment {h.avg_sentiment.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Urgency Badge + drill-down */}
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${colors.badge}`}>
                      {urgencyLabel(h.urgency_score)}
                    </span>
                    <span className={`text-sm font-mono font-bold ${colors.text}`}>
                      {(h.urgency_score * 100).toFixed(0)}
                    </span>
                    <Link
                      to={`/analysis/state/${h.state_code}`}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      Analyse <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>

                {/* Urgency bar */}
                <div className="mt-3 h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${h.urgency_score * 100}%` }}
                    transition={{ delay: i * 0.04 + 0.2, duration: 0.6 }}
                    className={`h-full rounded-full ${colors.bar}`}
                  />
                </div>

                {/* Sentiment breakdown bar */}
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <TrendingDown size={10} />
                  <span>Avg sentiment: {h.avg_sentiment > 0 ? '+' : ''}{h.avg_sentiment.toFixed(3)}</span>
                  <span className="ml-auto">Urgency score: {h.urgency_score.toFixed(4)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {!loading && hotspots.length > 0 && (
        <div className="flex items-center gap-6 text-xs text-slate-500 border-t border-slate-700/50 pt-4">
          <span className="font-semibold text-slate-400">Urgency scale:</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Low (&lt;20)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Moderate (20-40)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> High (40-70)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Critical (&gt;70)</span>
        </div>
      )}
    </motion.div>
  );
}
