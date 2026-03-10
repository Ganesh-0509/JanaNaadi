import React, { useState } from 'react';
import { KnowledgeGraph } from '../components/KnowledgeGraph';
import { useKnowledgeGraph, useGraphStats } from '../hooks/useKnowledgeGraph';
import { Entity } from '../api/ontology';
import { getEntityRelationships } from '../api/ontology';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Knowledge Graph
          </h1>
          <p className="text-slate-600">
            AI-Powered Global Ontology Engine - Explore entities, relationships, and intelligence across domains
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-blue-600">{stats.total_entities.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Total Entities</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-purple-600">{stats.total_relationships.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Relationships</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-green-600">{stats.total_mentions.toLocaleString()}</div>
              <div className="text-sm text-slate-600">Mentions</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
              <div className="text-2xl font-bold text-amber-600">
                {Object.keys(stats.entity_types).length}
              </div>
              <div className="text-sm text-slate-600">Entity Types</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="font-bold text-lg mb-4 text-slate-900">Filters</h3>

              {/* Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search Entity
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Entity Type Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Entity Type
                </label>
                <select
                  value={selectedEntityType}
                  onChange={(e) => setSelectedEntityType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {ENTITY_TYPES.map(type => (
                    <option key={type} value={type} className="capitalize">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Domain Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Intelligence Domain
                </label>
                <select
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Domains</option>
                  {DOMAINS.map(domain => (
                    <option key={domain} value={domain} className="capitalize">
                      {domain}
                    </option>
                  ))}
                </select>
              </div>

              {/* Min Mentions Slider */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Min Mentions: {minMentions}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={minMentions}
                  onChange={(e) => setMinMentions(parseInt(e.target.value))}
                  className="w-full"
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
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-md transition"
              >
                Reset Filters
              </button>
            </div>

            {/* Top Entities */}
            {stats && stats.top_entities.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-4 text-slate-900">Top Entities</h3>
                <div className="space-y-2">
                  {stats.top_entities.slice(0, 10).map((entity, idx) => (
                    <div key={entity.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 truncate flex-1">
                        {idx + 1}. {entity.name}
                      </span>
                      <span className="text-slate-500 ml-2">{entity.mention_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Graph Visualization */}
          <div className="lg:col-span-3">
            {graphLoading ? (
              <div className="bg-white p-12 rounded-lg shadow-sm border border-slate-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading knowledge graph...</p>
                </div>
              </div>
            ) : filteredNodes && filteredLinks ? (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    Showing {filteredNodes.length} entities, {filteredLinks.length} relationships
                  </div>
                  {selectedEntity && (
                    <button
                      onClick={() => {
                        setSelectedEntity(null);
                        setEntityDetails(null);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-700"
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
              <div className="bg-white p-12 rounded-lg shadow-sm border border-slate-200 text-center">
                <p className="text-slate-600">No data available. Start ingesting domain-specific data to build the knowledge graph.</p>
              </div>
            )}

            {/* Entity Details Panel */}
            {selectedEntity && entityDetails && (
              <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{selectedEntity.name}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <div className="text-sm text-slate-600">Type</div>
                    <div className="font-medium capitalize">{selectedEntity.entity_type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Mentions</div>
                    <div className="font-medium">{selectedEntity.mention_count}</div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-600">Sentiment</div>
                    <div className={`font-medium ${
                      selectedEntity.sentiment_score && selectedEntity.sentiment_score > 0 ? 'text-green-600' :
                      selectedEntity.sentiment_score && selectedEntity.sentiment_score < 0 ? 'text-red-600' :
                      'text-slate-600'
                    }`}>
                      {selectedEntity.sentiment_score?.toFixed(2) || 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedEntity.description && (
                  <div className="mb-6">
                    <div className="text-sm text-slate-600 mb-1">Description</div>
                    <p className="text-slate-800">{selectedEntity.description}</p>
                  </div>
                )}

                {selectedEntity.aliases && selectedEntity.aliases.length > 0 && (
                  <div className="mb-6">
                    <div className="text-sm text-slate-600 mb-2">Also Known As</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedEntity.aliases.map((alias, idx) => (
                        <span key={idx} className="bg-slate-100 px-3 py-1 rounded-full text-sm">
                          {alias}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {entityDetails.relationships && entityDetails.relationships.length > 0 && (
                  <div>
                    <div className="text-sm text-slate-600 mb-3">
                      Relationships ({entityDetails.relationships.length})
                    </div>
                    <div className="space-y-3">
                      {entityDetails.relationships.slice(0, 10).map((rel: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">
                              {rel.related_entity?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-slate-600 capitalize">
                              {rel.relationship_type.replace('_', ' ')}
                            </div>
                            {rel.context && (
                              <p className="text-xs text-slate-500 mt-1">{rel.context}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">
                              Strength: {(rel.strength * 100).toFixed(0)}%
                            </div>
                            {rel.sentiment && (
                              <div className={`text-xs font-medium ${
                                rel.sentiment === 'positive' ? 'text-green-600' :
                                rel.sentiment === 'negative' ? 'text-red-600' :
                                'text-slate-600'
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
      </div>
    </div>
  );
};

export default OntologyPage;
