import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { GitBranch, Activity, Flame } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const DELHI_CENTER: [number, number] = [28.6139, 77.209];
const DELHI_ZOOM = 11;

const INCIDENT_COLORS: Record<string, string> = {
  infrastructure_failure: '#f59e0b',
  public_safety: '#ef4444',
  environmental: '#22c55e',
  civic_disruption: '#8b5cf6',
  health: '#ec4899',
  economic: '#3b82f6',
  political: '#6366f1',
};

const SEVERITY_RADIUS: Record<string, number> = {
  low: 6,
  moderate: 10,
  high: 15,
  critical: 22,
};

interface Incident {
  id: string;
  title: string;
  incident_type: string;
  severity: string;
  chain_depth: number;
  ward: { id: number; name: string; lat: number; lng: number } | null;
}

interface ChainEdge {
  cause_incident_id: string;
  effect_incident_id: string;
  causal_mechanism: string;
  confidence: number;
}

interface ChainNodeData {
  incident?: { title?: string; ward_id?: number };
  causal_mechanism?: string;
  confidence?: number;
  downstream?: ChainNodeData[];
}

interface ChainTree {
  total_affected_wards?: number;
  chain?: ChainNodeData[];
}

interface Stats {
  active: number;
  total: number;
  max_chain_depth: number;
  by_severity?: Record<string, number>;
}

export default function DelhiDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [chainEdges, setChainEdges] = useState<ChainEdge[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [chainTree, setChainTree] = useState<ChainTree | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [chainMap, statsRes] = await Promise.all([
        axios.get('/api/incidents/delhi/chain-map'),
        axios.get('/api/incidents/delhi/stats'),
      ]);
      setIncidents(chainMap.data.nodes || []);
      setChainEdges(chainMap.data.edges || []);
      setStats(statsRes.data || null);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Delhi dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleIncidentClick = async (incident: Incident) => {
    setSelectedIncident(incident);
    try {
      const res = await axios.get(`/api/incidents/delhi/${incident.id}/chain`);
      setChainTree(res.data);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Chain fetch error:', error);
      setChainTree(null);
    }
  };

  const incidentCoords: Record<string, [number, number]> = {};
  incidents.forEach((inc) => {
    if (inc.ward?.lat && inc.ward?.lng) {
      incidentCoords[inc.id] = [inc.ward.lat, inc.ward.lng];
    }
  });

  return (
    <div className="flex h-screen bg-background-50 text-content-primary">
      <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-r border-[var(--color-border)] bg-surface-base">
        <div className="border-b border-[var(--color-border)] p-4">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Flame size={20} className="text-primary-500" />
            Delhi Incident Intelligence
          </h1>
          <p className="mt-0.5 text-xs text-content-secondary">Ward-level chain effect tracking</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-2 border-b border-[var(--color-border)] p-4">
            <div className="rounded-lg border border-[var(--color-border)] bg-background-100 p-3 text-center">
              <div className="text-2xl font-bold text-state-danger">{stats.active}</div>
              <div className="text-xs text-content-secondary">Active</div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-background-100 p-3 text-center">
              <div className="text-2xl font-bold text-state-warning">{stats.total}</div>
              <div className="text-xs text-content-secondary">Total</div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-background-100 p-3 text-center">
              <div className="text-2xl font-bold text-state-danger">{stats.by_severity?.critical || 0}</div>
              <div className="text-xs text-content-secondary">Critical</div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-background-100 p-3 text-center">
              <div className="text-2xl font-bold text-secondary-500">{stats.max_chain_depth}</div>
              <div className="text-xs text-content-secondary">Max Chain</div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {incidents
            .filter((inc) => inc.ward?.lat)
            .map((inc) => (
              <button
                key={inc.id}
                onClick={() => {
                  void handleIncidentClick(inc);
                }}
                className={`w-full text-left rounded-xl p-3 border transition-all ${
                  selectedIncident?.id === inc.id
                    ? 'border-secondary-500 bg-secondary-50'
                    : 'border-[var(--color-border)] bg-surface-base hover:border-content-muted/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ backgroundColor: INCIDENT_COLORS[inc.incident_type] || '#6b7280' }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-content-primary">{inc.title}</p>
                    <p className="text-xs text-content-secondary">{inc.ward?.name || 'MCD Strategic Center'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-xs font-bold uppercase ${
                          inc.severity === 'critical'
                            ? 'text-red-400'
                            : inc.severity === 'high'
                              ? 'text-amber-400'
                              : inc.severity === 'moderate'
                                ? 'text-yellow-400'
                                : 'text-content-secondary'
                        }`}
                      >
                        {inc.severity}
                      </span>
                      {inc.chain_depth > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-secondary-500">
                          <GitBranch size={10} /> depth {inc.chain_depth}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}

          {!loading && incidents.length === 0 && (
            <div className="py-12 text-center text-content-secondary">
              <Activity size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active incidents</p>
              <p className="text-xs mt-1">Run incident detection to populate</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        <MapContainer center={DELHI_CENTER} zoom={DELHI_ZOOM} className="h-full w-full" style={{ background: '#f7f1e8' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="&copy; OpenStreetMap &copy; CARTO"
          />

          {chainEdges.map((edge) => {
            const from = incidentCoords[edge.cause_incident_id];
            const to = incidentCoords[edge.effect_incident_id];
            if (!from || !to) {
              return null;
            }
            return (
              <Polyline
                key={`${edge.cause_incident_id}-${edge.effect_incident_id}`}
                positions={[from, to]}
                color={`rgba(139, 92, 246, ${Math.max(0.15, edge.confidence || 0.25)})`}
                weight={2}
                dashArray="6 4"
              />
            );
          })}

          {incidents
            .filter((inc) => inc.ward?.lat && inc.ward?.lng)
            .map((inc) => (
              <CircleMarker
                key={inc.id}
                center={[inc.ward!.lat, inc.ward!.lng]}
                radius={SEVERITY_RADIUS[inc.severity] || 8}
                fillColor={INCIDENT_COLORS[inc.incident_type] || '#6b7280'}
                fillOpacity={selectedIncident?.id === inc.id ? 1 : 0.75}
                color={selectedIncident?.id === inc.id ? '#ffffff' : '#1e293b'}
                weight={selectedIncident?.id === inc.id ? 3 : 1.5}
                eventHandlers={{
                  click: () => {
                    void handleIncidentClick(inc);
                  },
                }}
              >
                <Tooltip>
                  <div className="text-xs">
                    <strong>{inc.title}</strong>
                    <br />
                    {inc.ward?.name} · {inc.severity}
                    <br />
                    {inc.chain_depth > 0 ? `Chain depth: ${inc.chain_depth}` : 'Root incident'}
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
        </MapContainer>

        <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur rounded-xl p-4 border border-slate-700 z-[500]">
          <p className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Incident Types</p>
          {Object.entries(INCIDENT_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {type.replace('_', ' ')}
            </div>
          ))}
          <div className="mt-2 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-6 border-t-2 border-dashed border-purple-400" />
              Chain effect link
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedIncident && chainTree && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            className="w-80 flex-shrink-0 overflow-y-auto space-y-4 border-l border-[var(--color-border)] bg-surface-base p-4"
          >
            <div>
              <h3 className="font-bold text-lg">{selectedIncident.title}</h3>
              <p className="text-xs text-content-secondary">{selectedIncident.ward?.name}</p>
              <span
                className={`text-xs font-bold uppercase mt-1 inline-block ${
                  selectedIncident.severity === 'critical'
                    ? 'text-red-400'
                    : selectedIncident.severity === 'high'
                      ? 'text-amber-400'
                      : 'text-yellow-400'
                }`}
              >
                {selectedIncident.severity}
              </span>
            </div>

            {(chainTree.chain?.length || 0) > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-content-secondary">
                  <GitBranch size={12} /> Chain Effects ({chainTree.total_affected_wards || 0} wards)
                </h4>
                <ChainNode effects={chainTree.chain || []} depth={0} />
              </div>
            )}

            <button
              onClick={() => {
                setSelectedIncident(null);
                setChainTree(null);
              }}
              className="w-full rounded-lg bg-background-100 py-2 text-xs text-content-secondary transition-colors hover:bg-background-200 hover:text-content-primary"
            >
              Close
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChainNode({ effects, depth }: { effects: ChainNodeData[]; depth: number }) {
  return (
    <div className={`space-y-2 ${depth > 0 ? 'ml-4 border-l border-[var(--color-border)] pl-3' : ''}`}>
      {effects.map((effect, index) => (
        <div key={`${effect.incident?.title || 'effect'}-${index}`} className="rounded-lg border border-[var(--color-border)] bg-background-100 p-3">
          <p className="text-xs font-medium text-content-primary">{effect.incident?.title || 'Effect'}</p>
          <p className="mt-0.5 text-xs text-content-secondary">
            {effect.incident?.ward_id ? `Ward ${effect.incident.ward_id}` : ''}
          </p>
          <p className="mt-1 text-xs text-secondary-600">
            ↳ {effect.causal_mechanism?.replace(/_/g, ' ') || 'spillover'}
            {effect.confidence ? ` (${Math.round(effect.confidence * 100)}%)` : ''}
          </p>
          {(effect.downstream?.length || 0) > 0 && <ChainNode effects={effect.downstream || []} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}
