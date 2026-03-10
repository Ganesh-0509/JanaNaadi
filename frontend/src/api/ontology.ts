import apiClient from './client';

// ============================================================
// ONTOLOGY API - Knowledge Graph & Entity Intelligence
// ============================================================

export interface Entity {
  id: number;
  name: string;
  entity_type: 'person' | 'organization' | 'location' | 'event' | 'policy' | 'technology' | 'infrastructure' | 'other';
  description?: string;
  aliases: string[];
  metadata: Record<string, any>;
  sentiment_score?: number;
  mention_count: number;
  first_seen?: string;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

export interface EntityRelationship {
  id: number;
  source_entity_id: number;
  target_entity_id: number;
  relationship_type: 'supports' | 'opposes' | 'impacts' | 'related_to' | 'part_of' | 'causes' | 'mentioned_in' | 'located_in';
  strength: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  context?: string;
  source_entry_id?: string;
  created_at: string;
}

export interface EntityMention {
  id: number;
  entity_id: number;
  entry_id: string;
  mention_context?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  created_at: string;
}

export interface KnowledgeGraphStats {
  total_entities: number;
  total_relationships: number;
  total_mentions: number;
  entity_types: Record<string, number>;
  relationship_types: Record<string, number>;
  top_entities: Array<{ id: number; name: string; mention_count: number }>;
}

export interface DomainIntelligence {
  id: number;
  domain: 'geopolitics' | 'economics' | 'defense' | 'climate' | 'technology' | 'society';
  scope: 'national' | 'state' | 'district';
  scope_id?: number;
  risk_score: number;
  sentiment_trend?: number;
  urgency_level: 'low' | 'moderate' | 'high' | 'critical';
  key_factors: string[];
  entity_ids: number[];
  metadata: Record<string, any>;
  computed_at: string;
  created_at: string;
}

export interface EntityWithRelationships extends Entity {
  relationships: Array<EntityRelationship & { related_entity: Entity }>;
}

// ============================================================
// API FUNCTIONS
// ============================================================

/**
 * Get list of entities with optional filters
 */
export const getEntities = async (params?: {
  entity_type?: string;
  domain?: string;
  min_mentions?: number;
  limit?: number;
  offset?: number;
}): Promise<Entity[]> => {
  const response = await apiClient.get('/ontology/entities', { params });
  return response.data;
};

/**
 * Get entity by ID
 */
export const getEntity = async (id: number): Promise<Entity> => {
  const response = await apiClient.get(`/ontology/entities/${id}`);
  return response.data;
};

/**
 * Get entity with all its relationships
 */
export const getEntityRelationships = async (id: number): Promise<EntityWithRelationships> => {
  const response = await apiClient.get(`/ontology/entities/${id}/relationships`);
  return response.data;
};

/**
 * Get knowledge graph statistics
 */
export const getGraphStats = async (): Promise<KnowledgeGraphStats> => {
  const response = await apiClient.get('/ontology/graph/stats');
  return response.data;
};

/**
 * Get domain intelligence scores
 */
export const getDomainIntelligence = async (params?: {
  domain?: string;
  scope?: string;
  scope_id?: number;
}): Promise<DomainIntelligence[]> => {
  const response = await apiClient.get('/ontology/domain/intelligence', { params });
  return response.data;
};

/**
 * Compute domain intelligence for a specific domain
 */
export const computeDomainIntelligence = async (
  domain: string,
  scope: string = 'national',
  scope_id?: number
): Promise<DomainIntelligence> => {
  const response = await apiClient.post(`/ontology/domain/${domain}/compute`, null, {
    params: { scope, scope_id }
  });
  return response.data;
};

/**
 * Extract entities from a specific sentiment entry
 */
export const extractEntitiesFromEntry = async (entryId: string): Promise<{
  entities: Entity[];
  relationships: EntityRelationship[];
  message: string;
}> => {
  const response = await apiClient.post(`/ontology/extract/${entryId}`);
  return response.data;
};

/**
 * Get entities for knowledge graph visualization
 * Returns entities with their relationships in a format ready for D3.js
 */
export const getGraphData = async (params?: {
  entity_type?: string;
  domain?: string;
  min_mentions?: number;
  limit?: number;
}): Promise<{
  nodes: Array<Entity & { group: number }>;
  links: Array<{
    source: number;
    target: number;
    type: string;
    strength: number;
    sentiment?: string;
  }>;
}> => {
  const entities = await getEntities({ ...params, limit: params?.limit || 100 });
  
  // Fetch relationships for all entities
  const relationshipsPromises = entities.map(e => 
    getEntityRelationships(e.id).catch(() => ({ ...e, relationships: [] }))
  );
  const entitiesWithRels = await Promise.all(relationshipsPromises);
  
  // Build nodes
  const nodes = entities.map(entity => ({
    ...entity,
    group: getEntityTypeGroup(entity.entity_type)
  }));
  
  // Build links (deduplicate bidirectional relationships)
  const linkMap = new Map<string, any>();
  entitiesWithRels.forEach(entity => {
    entity.relationships?.forEach(rel => {
      const key = [rel.source_entity_id, rel.target_entity_id].sort().join('-');
      if (!linkMap.has(key)) {
        linkMap.set(key, {
          source: rel.source_entity_id,
          target: rel.target_entity_id,
          type: rel.relationship_type,
          strength: rel.strength,
          sentiment: rel.sentiment
        });
      }
    });
  });
  
  const links = Array.from(linkMap.values());
  
  return { nodes, links };
};

// Helper to map entity types to visual groups
const getEntityTypeGroup = (type: string): number => {
  const groupMap: Record<string, number> = {
    person: 1,
    organization: 2,
    location: 3,
    event: 4,
    policy: 5,
    technology: 6,
    infrastructure: 7,
    other: 8
  };
  return groupMap[type] || 0;
};
