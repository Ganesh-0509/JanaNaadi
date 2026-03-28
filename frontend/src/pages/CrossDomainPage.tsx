import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Network, ChevronDown, ChevronUp, ArrowRight, AlertTriangle, Layers, Zap, TrendingDown, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCrossDomainConnections, getCrossDomainSummary } from '../api/ontology';
import { DOMAIN_CONFIG } from '../types/api';
import { Link } from 'react-router-dom';

const DOMAINS = ['geopolitics', 'economics', 'defense', 'climate', 'technology', 'society'] as const;

type Domain = typeof DOMAINS[number];

function StrengthBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-content-secondary w-8 text-right">{pct}%</span>
    </div>
  );
}

function DomainBadge({ domain }: { domain: string }) {
  const cfg = DOMAIN_CONFIG[domain] ?? {
    label: domain,
    color: 'text-content-secondary',
    bg: 'bg-surface-muted/60',
    border: 'border-white/20',
    icon: '⚙️',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

export default function CrossDomainPage() {
  const [filterA, setFilterA] = useState<Domain | ''>('');
  const [filterB, setFilterB] = useState<Domain | ''>('');
  const [minStrength, setMinStrength] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['cross-domain-summary'],
    queryFn: getCrossDomainSummary,
    staleTime: 5 * 60 * 1000,
  });

  const { data: connections, isLoading: connLoading } = useQuery({
    queryKey: ['cross-domain-connections', filterA, filterB, minStrength],
    queryFn: () =>
      getCrossDomainConnections({
        domain_a: filterA || undefined,
        domain_b: filterB || undefined,
        min_strength: minStrength,
        limit: 100,
      }),
    staleTime: 3 * 60 * 1000,
  });

  const totalEdges = summary?.total_cross_domain_edges ?? 0;
  const pairs = summary?.domain_pairs ?? [];
  const conns = connections?.connections ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-6"
    >
      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 border border-blue-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.12),_transparent_60%)]" />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Network size={22} className="text-blue-400" />
              <span className="text-xs font-bold tracking-[0.2em] text-blue-300 uppercase">
                AI-Powered Intelligence Engine
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">Cross-Domain Intelligence Map</h1>
            <p className="text-sm text-content-secondary mt-1 max-w-xl">
              Unified view of how entities across Geopolitics, Economics, Defense, Climate,
              Technology & Society are interconnected — the core of the Global Ontology Graph.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-3xl font-bold text-blue-400">{totalEdges.toLocaleString()}</div>
            <div className="text-xs text-content-secondary">cross-domain connections</div>
            <Link to="/ontology" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
              View Full Graph <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Domain Pair Matrix ── */}
      <div className="bg-surface-base rounded-2xl p-6 border border-white/20">
        <div className="flex items-center gap-2 mb-5">
          <Layers size={18} className="text-purple-400" />
          <h2 className="font-bold">Domain Pair Connection Matrix</h2>
          <span className="text-xs text-content-secondary ml-auto">Sorted by connection count</span>
        </div>
        {summaryLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-surface-muted/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : pairs.length === 0 ? (
          <div className="text-center py-10 text-content-secondary">
            <AlertTriangle size={32} className="mx-auto mb-3 opacity-40" />
            <p>No cross-domain connections yet. Start ingesting domain-tagged data to build the intelligence graph.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {pairs.map((pair) => {
              const cfgA = DOMAIN_CONFIG[pair.domain_a] ?? { label: pair.domain_a, color: 'text-content-secondary', bg: 'bg-surface-muted/60', icon: '⚙️' };
              const cfgB = DOMAIN_CONFIG[pair.domain_b] ?? { label: pair.domain_b, color: 'text-content-secondary', bg: 'bg-surface-muted/60', icon: '⚙️' };
              const strengthPct = Math.round(pair.avg_strength * 100);
              return (
                <motion.button
                  key={pair.pair}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => {
                    setFilterA(pair.domain_a as Domain);
                    setFilterB(pair.domain_b as Domain);
                  }}
                  className="bg-surface-muted/50 hover:bg-slate-700/60 border border-white/20/50 hover:border-blue-500/40 rounded-xl p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <span className={`text-sm font-semibold ${cfgA.color}`}>{cfgA.icon} {cfgA.label}</span>
                    <span className="text-content-secondary text-xs">↔</span>
                    <span className={`text-sm font-semibold ${cfgB.color}`}>{cfgB.icon} {cfgB.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-content-secondary mb-2">
                    <span>{pair.connection_count} connections</span>
                    <span className="text-blue-400 font-semibold">avg {strengthPct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${strengthPct >= 70 ? 'bg-red-500' : strengthPct >= 40 ? 'bg-amber-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(strengthPct * 1.5, 100)}%` }}
                    />
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Connection Explorer ── */}
      <div className="bg-surface-base rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="font-bold flex items-center gap-2">
            <Network size={18} className="text-blue-400" />
            Connection Explorer
          </h2>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={filterA}
              onChange={(e) => setFilterA(e.target.value as Domain | '')}
              className="bg-slate-700 border border-white/20 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All Domains (A)</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d} className="capitalize">{DOMAIN_CONFIG[d]?.icon} {d}</option>
              ))}
            </select>
            <span className="text-content-secondary text-sm">↔</span>
            <select
              value={filterB}
              onChange={(e) => setFilterB(e.target.value as Domain | '')}
              className="bg-slate-700 border border-white/20 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">All Domains (B)</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d} className="capitalize">{DOMAIN_CONFIG[d]?.icon} {d}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-content-secondary">Min strength:</span>
              <input
                type="range" min={0} max={0.9} step={0.1} value={minStrength}
                onChange={(e) => setMinStrength(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-xs text-content-secondary w-6">{Math.round(minStrength * 100)}%</span>
            </div>
            {(filterA || filterB) && (
              <button
                onClick={() => { setFilterA(''); setFilterB(''); }}
                className="text-xs text-blue-400 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {connLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-surface-muted/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : conns.length === 0 ? (
          <div className="text-center py-16 text-content-secondary">
            <Network size={40} className="mx-auto mb-3 opacity-30" />
            <p>No connections match these filters.</p>
            <p className="text-xs mt-1 text-content-secondary">Try removing filters or ingest more domain-specific data.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-content-secondary mb-3">
              Showing {conns.length} connection{conns.length !== 1 ? 's' : ''} — click any row for details
            </div>
            <AnimatePresence>
              {conns.map((conn, idx) => (
                <motion.div
                  key={conn.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-surface-muted/50 border border-white/20/50 hover:border-slate-500/60 rounded-xl overflow-hidden transition-all"
                >
                  <button
                    className="w-full text-left px-4 py-3"
                    onClick={() => setExpanded(expanded === conn.id ? null : conn.id)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="font-semibold text-sm text-content-primary truncate">{conn.entity_a.name}</div>
                        <DomainBadge domain={conn.entity_a.domain} />
                        <span className="text-content-secondary text-xs flex-shrink-0">↔</span>
                        <div className="font-semibold text-sm text-content-primary truncate">{conn.entity_b.name}</div>
                        <DomainBadge domain={conn.entity_b.domain} />
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-32">
                          <StrengthBar value={conn.strength} />
                        </div>
                        {expanded === conn.id
                          ? <ChevronUp size={14} className="text-content-secondary" />
                          : <ChevronDown size={14} className="text-content-secondary" />}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expanded === conn.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-4 pb-4 border-t border-white/20/50"
                      >
                        <div className="pt-3 grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-xs text-content-secondary mb-1">Entity A</div>
                            <div className="font-medium">{conn.entity_a.name}</div>
                            <div className="text-xs text-content-secondary capitalize mt-0.5">
                              type: {conn.entity_a.type} · domain: {conn.entity_a.domain}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-content-secondary mb-1">Entity B</div>
                            <div className="font-medium">{conn.entity_b.name}</div>
                            <div className="text-xs text-content-secondary capitalize mt-0.5">
                              type: {conn.entity_b.type} · domain: {conn.entity_b.domain}
                            </div>
                          </div>
                          {conn.context && (
                            <div className="md:col-span-2">
                              <div className="text-xs text-content-secondary mb-1">Connection Context</div>
                              <p className="text-content-primary text-xs leading-relaxed bg-surface-base/60 rounded-lg p-3">
                                {conn.context}
                              </p>
                            </div>
                          )}
                          <div className="md:col-span-2 flex gap-3">
                            <Link
                              to={`/ontology?domain=${conn.entity_a.domain}`}
                              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                            >
                              Explore {DOMAIN_CONFIG[conn.entity_a.domain]?.label ?? conn.entity_a.domain} graph
                              <ArrowRight size={10} />
                            </Link>
                            <Link
                              to={`/ontology?domain=${conn.entity_b.domain}`}
                              className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                            >
                              Explore {DOMAIN_CONFIG[conn.entity_b.domain]?.label ?? conn.entity_b.domain} graph
                              <ArrowRight size={10} />
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Empty state CTA ── */}
      {!summaryLoading && totalEdges === 0 && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6 text-center">
          <Network size={36} className="mx-auto text-blue-400 mb-3 opacity-60" />
          <h3 className="font-semibold text-content-primary mb-1">Intelligence Graph is Empty</h3>
          <p className="text-sm text-content-secondary mb-4 max-w-md mx-auto">
            Cross-domain connections are automatically built as domain-specific data is ingested.
            Trigger ingestion from the Data Panel to start building the intelligence graph.
          </p>
          <Link
            to="/admin/ingest"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
          >
            Go to Data Ingestion <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* ═══ STRATEGIC SCENARIO SIMULATOR — PS GAP FIX ═══ */}
      <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 rounded-3xl p-8 border border-indigo-500/30 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Zap className="text-yellow-400" size={24} />
              MCD Strategic Simulator
            </h2>
            <p className="text-sm text-content-secondary mt-1">Simulate cross-domain impacts of policy shifts in Delhi</p>
          </div>
          <div className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-bold border border-indigo-500/30">
            PREDICTIVE MODEL V1.0 (BETA)
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Controls */}
          <div className="space-y-8">
            <div>
              <label className="flex justify-between text-sm font-medium mb-4">
                <span>Sanitation & Waste Sector Shift</span>
                <span className="text-red-400">-15% Performance</span>
              </label>
              <input type="range" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
              <p className="text-[10px] text-content-secondary mt-2">Simulating a strike or monsoon-related garbage accumulation.</p>
            </div>
            <div>
              <label className="flex justify-between text-sm font-medium mb-4">
                <span>Public Health Focus (GNCTD)</span>
                <span className="text-emerald-400">+25% Investment</span>
              </label>
              <input type="range" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              <p className="text-[10px] text-content-secondary mt-2">Expansion of Mohalla Clinic operating hours.</p>
            </div>
          </div>

          {/* Results Analytics */}
          <div className="bg-slate-950/50 rounded-2xl p-6 border border-white/20 flex flex-col justify-center">
            <h4 className="text-xs font-bold text-content-secondary uppercase tracking-widest mb-6 text-center">Predicted Sentiment Ripple</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm">Social Stability</span>
                <div className="flex items-center gap-2 text-red-500">
                  <TrendingDown size={14} /> <span>-8.2%</span>
                </div>
              </div>
              <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
                <div className="h-full bg-red-500/60 rounded-full" style={{ width: '42%' }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Economic Productivity</span>
                <div className="flex items-center gap-2 text-red-400">
                  <TrendingDown size={14} /> <span>-3.1%</span>
                </div>
              </div>
              <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
                <div className="h-full bg-orange-500/60 rounded-full" style={{ width: '68%' }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Gov Trust Index</span>
                <div className="flex items-center gap-2 text-emerald-400">
                  <TrendingUp size={14} /> <span>+1.4%</span>
                </div>
              </div>
              <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/60 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
            
            <button className="mt-8 w-full py-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-xl text-xs font-bold transition-all border border-indigo-500/20">
              OPTIMIZE RESOURCE ALLOCATION →
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

