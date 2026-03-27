import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Target, GitCompare, Users, Layers, Search, X } from 'lucide-react';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import { useKnowledgeGraph, useGraphStats } from '../hooks/useKnowledgeGraph';
import { Entity } from '../api/ontology';
import { getEntityRelationships } from '../api/ontology';
import { formatNumber } from '../utils/formatters';

const ENTITY_TYPES = [
  'person', 'organization', 'location', 'event', 'policy', 'technology', 'infrastructure', 'other'
];

const DOMAINS = [
  'geopolitics', 'economics', 'defense', 'climate', 'technology', 'society'
];

export const OntologyPage: React.FC = () => {
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [minMentions, setMinMentions] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityDetails, setEntityDetails] = useState<any>(null);

  const { data: graphData, isLoading: graphLoading } = useKnowledgeGraph({
    entity_type: selectedEntityType || undefined,
    domain: selectedDomain || undefined,
    min_mentions: minMentions,
    limit: 150
  });

  const { data: stats } = useGraphStats();

  const handleNodeClick = async (node: Entity) => {
    setSelectedEntity(node);
    try {
      const details = await getEntityRelationships(node.id);
      setEntityDetails(details);
    } catch (error) {
      console.error('Failed to fetch entity details:', error);
    }
  };

  const filteredNodes = graphData?.nodes.filter(node =>
    !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLinks = graphData?.links.filter(link => {
    const sourceId = typeof link.source === 'number' ? link.source : (link.source as any).id;
    const targetId = typeof link.target === 'number' ? link.target : (link.target as any).id;
    return filteredNodes?.some(n => n.id === sourceId) && filteredNodes?.some(n => n.id === targetId);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-12 bg-[#F5E9D8] min-h-screen"
    >
      {/* ═══ MUNICIPAL ONTOLOGY ENGINE ═══ */}
      <div className="relative overflow-hidden mcd-glass rounded-[48px] p-12 border border-white/5 mcd-glow-saffron">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[100%] bg-[#E76F2E]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="flex items-center gap-10">
             <div className="w-24 h-24 rounded-[32px] bg-gradient-saffron flex items-center justify-center text-white mcd-glow-saffron shadow-2xl">
              <Globe size={48} />
            </div>
            <div>
              <div className="text-[11px] font-black tracking-[0.5em] text-[#E76F2E] uppercase mb-4 italic">
                Municipal Corporation of Delhi — Reality Sync Engine
              </div>
              <h1 className="text-6xl font-black text-white uppercase tracking-tighter leading-none italic">
                STRATEGIC <span className="text-[#E76F2E]">ONTOLOGY</span>
              </h1>
              <div className="flex items-center gap-4 mt-6">
                 <div className="flex items-center gap-2 px-5 py-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-2xl">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-[10px] font-black text-[#10B981] uppercase tracking-[0.2em]">Live Entity Extraction active</span>
                </div>
                <div className="h-6 w-[1px] bg-white/10 mx-2" />
                <p className="text-[11px] font-black text-[#6B5E57] uppercase tracking-[0.3em] font-mono italic">
                  Mapping relationships across 250 Delhi Wards
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 SYSTEM STATS MATRIX */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Identified Entities', val: stats.total_entities, color: 'text-blue-500', icon: Target },
            { label: 'Active Linkages', val: stats.total_relationships, color: 'text-purple-500', icon: GitCompare },
            { label: 'Reality Mentions', val: stats.total_mentions, color: 'text-emerald-500', icon: Users },
            { label: 'Entity Classes', val: Object.keys(stats.entities_by_type || {}).length, color: 'text-[#E76F2E]', icon: Layers },
          ].map((s) => (
            <div key={s.label} className="mcd-card border-white/5 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-110 transition-transform">
                  <s.icon size={40} className="text-white" />
               </div>
               <div className="text-[10px] font-black text-[#6B5E57] uppercase tracking-[0.2em] mb-4 italic">{s.label}</div>
               <div className={`text-4xl font-black ${s.color} tracking-tighter font-mono`}>{formatNumber(s.val)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <div className="mcd-card border-white/5 bg-[#161B2E]/50">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic text-[#F7F7F7]">CONSOLE <span className="text-[#E76F2E]">FILTERS</span></h3>

            {/* Search */}
            <div className="mb-8">
              <label className="text-[10px] font-black text-[#D8CCC0] uppercase tracking-[0.2em] block mb-4 ml-1">Entity Intelligence Search</label>
              <div className="relative group/input">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#6B5E57] group-focus-within/input:text-[#E76F2E] transition-colors" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Query Name..."
                  className="w-full bg-[#F5E9D8] border-2 border-[#3E2C23]/15 rounded-2xl pl-16 pr-6 py-4 text-sm text-[#3E2C23] font-black uppercase focus:border-[#E76F2E]/40 transition-all placeholder-[#6B5E57]"
                />
              </div>
            </div>

            {/* Entity Type Filter */}
            <div className="mb-8">
              <label className="text-[10px] font-black text-[#D8CCC0] uppercase tracking-[0.2em] block mb-4 ml-1">Entity Intelligence Type</label>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                className="w-full bg-[#F5E9D8] border-2 border-[#3E2C23]/15 rounded-2xl px-6 py-4 text-sm text-[#3E2C23] font-black uppercase focus:border-[#E76F2E]/40 transition-all appearance-none cursor-pointer"
              >
                <option value="">Detect All Types…</option>
                {ENTITY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Domain Filter */}
            <div className="mb-8">
              <label className="text-[10px] font-black text-[#D8CCC0] uppercase tracking-[0.2em] block mb-4 ml-1">Intelligence Area</label>
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="w-full bg-[#F5E9D8] border-2 border-[#3E2C23]/15 rounded-2xl px-6 py-4 text-sm text-[#3E2C23] font-black uppercase focus:border-[#E76F2E]/40 transition-all appearance-none cursor-pointer"
              >
                <option value="">Global Domain Sync…</option>
                {DOMAINS.map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </div>

            {/* Min Mentions Slider */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                 <label className="text-[10px] font-black text-[#D8CCC0] uppercase tracking-[0.2em] ml-1">Intensity Threshold</label>
                 <span className="text-xs font-mono font-black text-[#E76F2E]">{minMentions}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={minMentions}
                onChange={(e) => setMinMentions(parseInt(e.target.value))}
                className="w-full accent-[#E76F2E] h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setSelectedEntityType('');
                setSelectedDomain('');
                setMinMentions(1);
                setSearchQuery('');
              }}
              className="w-full bg-white/5 hover:bg-[#E76F2E]/10 text-[#6B5E57] hover:text-[#E76F2E] font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-white/5 hover:border-[#E76F2E]/20"
            >
              RESET ENGINE FILTERS
            </button>
          </div>

          {/* Top Entities */}
          {stats && stats.top_entities.length > 0 && (
            <div className="mcd-card border-white/5 bg-[#161B2E]/50">
              <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic text-[#F7F7F7]">HIGH <span className="text-[#E76F2E]">DENSITY</span> NODES</h3>
              <div className="space-y-4">
                {stats.top_entities.slice(0, 10).map((entity, idx) => (
                  <div key={entity.id} className="flex items-center justify-between text-[11px] font-black uppercase tracking-tight group hover:translate-x-1 transition-transform cursor-pointer">
                    <span className="text-[#D8CCC0] group-hover:text-[#E76F2E] mr-4 font-mono">{String(idx + 1).padStart(2, '0')}</span>
                    <span className="text-[#F2EBE1] truncate flex-1 group-hover:text-white transition-colors">
                      {entity.name}
                    </span>
                    <span className="text-[#D8CCC0] ml-2 font-mono group-hover:text-[#E76F2E] transition-colors">{entity.mention_count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Graph Visualization */}
        <div className="lg:col-span-3">
          {graphLoading ? (
            <div className="bg-[#3E2C23] p-12 rounded-lg border border-[#3E2C23]/20 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-[#6B5E57]">Loading knowledge graph...</p>
              </div>
            </div>
          ) : filteredNodes && filteredLinks ? (
            <div className="bg-[#3E2C23] p-4 rounded-lg border border-[#3E2C23]/20">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-[#E8E8E8]">
                  Showing {filteredNodes.length} entities, {filteredLinks.length} relationships
                </div>
                {selectedEntity && (
                  <button
                    onClick={() => {
                      setSelectedEntity(null);
                      setEntityDetails(null);
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              <KnowledgeGraph
                nodes={filteredNodes}
                links={filteredLinks}
                onNodeClick={handleNodeClick}
              />
            </div>
          ) : (
            <div className="bg-[#3E2C23] p-12 rounded-lg border border-[#3E2C23]/20 text-center">
              <p className="text-[#E8E8E8]">No data available. Start ingesting domain-specific data to build the knowledge graph.</p>
            </div>
          )}

          {/* Entity Details Panel */}
          {selectedEntity && entityDetails && (
            <div className="mt-6 bg-[#3E2C23] p-6 rounded-lg border border-[#3E2C23]/20">
              <h3 className="text-2xl font-bold text-slate-100 mb-4">{selectedEntity.name}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <div className="text-sm text-[#D8CCC0]">Type</div>
                  <div className="font-medium text-[#F2EBE1] capitalize">{selectedEntity.entity_type}</div>
                </div>
                <div>
                  <div className="text-sm text-[#D8CCC0]">Mentions</div>
                  <div className="font-medium text-[#F2EBE1]">{selectedEntity.mention_count}</div>
                </div>
                <div>
                  <div className="text-sm text-[#6B5E57]">Sentiment</div>
                  <div className={`font-medium ${
                    selectedEntity.sentiment_score && selectedEntity.sentiment_score > 0 ? 'text-green-400' :
                    selectedEntity.sentiment_score && selectedEntity.sentiment_score < 0 ? 'text-red-400' :
                    'text-[#6B5E57]'
                  }`}>
                    {selectedEntity.sentiment_score?.toFixed(2) || 'N/A'}
                  </div>
                </div>
              </div>

              {selectedEntity.description && (
                <div className="mb-6">
                  <div className="text-sm text-[#D8CCC0] mb-1">Description</div>
                  <p className="text-[#F2EBE1]">{selectedEntity.description}</p>
                </div>
              )}

              {selectedEntity.aliases && selectedEntity.aliases.length > 0 && (
                <div className="mb-6">
                  <div className="text-sm text-[#D8CCC0] mb-2">Also Known As</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntity.aliases.map((alias, idx) => (
                      <span key={idx} className="bg-slate-700 px-3 py-1 rounded-full text-sm text-[#F2EBE1]">
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {entityDetails.relationships && entityDetails.relationships.length > 0 && (
                <div>
                  <div className="text-sm text-[#D8CCC0] mb-3">
                    Relationships ({entityDetails.relationships.length})
                  </div>
                  <div className="space-y-3">
                    {entityDetails.relationships.slice(0, 10).map((rel: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-slate-700 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-slate-100">
                            {rel.related_entity?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-[#D8CCC0] capitalize">
                            {rel.relationship_type.replace('_', ' ')}
                          </div>
                          {rel.context && (
                            <p className="text-xs text-[#D8CCC0] mt-1">{rel.context}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[#D8CCC0]">
                            Strength: {(rel.strength * 100).toFixed(0)}%
                          </div>
                          {rel.sentiment && (
                            <div className={`text-xs font-medium ${
                              rel.sentiment === 'positive' ? 'text-green-400' :
                              rel.sentiment === 'negative' ? 'text-red-400' :
                              'text-[#6B5E57]'
                            }`}>
                              {rel.sentiment}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default OntologyPage;
