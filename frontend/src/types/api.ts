/**
 * Shared API types for JanaNaadi frontend.
 *
 * Single source of truth — import from here in ALL pages/components.
 * Previously each page defined its own Pulse, Hotspot, Topic interfaces
 * locally, which caused stale mismatches when the API schema changed.
 */

// ─── Public API ────────────────────────────────────────────────────────────────

export interface Pulse {
  total_entries_24h: number;
  avg_sentiment: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  top_3_issues: Array<{ topic: string; count: number }>;
  top_3_positive: Array<{ topic: string; count: number }>;
  language_breakdown: Record<string, number>;
}

export interface StateRanking {
  state_id: number;
  state: string;
  state_code: string;
  avg_sentiment: number;
  volume: number;
  top_issue: string | null;
}

export interface TrendingTopic {
  topic: string;
  mention_count: number;
  sentiment_trend: number;
  seven_day_change: number;
}

export interface Hotspot {
  state_id: number;
  state: string;
  state_code: string;
  urgency_score: number;
  avg_sentiment: number;
  volume: number;
}

export interface Voice {
  text: string;
  sentiment: string;
  score: number;
  topic: string;
  state: string;
  time: string;
  source: string;
}

export interface PulseEntry {
  id: string;
  text: string;
  sentiment: string;
  sentiment_score: number;
  topic: string | null;
  state: string | null;
  source: string | null;
  source_url: string | null;
  language: string | null;
  ingested_at: string | null;
}

export interface AreaResult {
  found: boolean;
  state?: string;
  state_code?: string;
  avg_sentiment?: number;
  total_entries?: number;
  positive?: number;
  negative?: number;
  neutral?: number;
  top_issues?: Array<{ topic: string; count: number }>;
  message?: string;
}

// ─── Analysis API ──────────────────────────────────────────────────────────────

export interface RegionAnalysis {
  name: string;
  avg_sentiment: number;
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  };
  topic_breakdown: Array<{ topic: string; count: number }>;
  source_distribution: Record<string, number>;
  language_breakdown: Record<string, number>;
}

export interface ForecastPoint {
  date: string;
  forecast_score: number;
  lower: number;
  upper: number;
}

// ─── Ontology / Knowledge Graph ────────────────────────────────────────────────

export interface Entity {
  id: number;
  name: string;
  entity_type:
    | 'person'
    | 'organization'
    | 'location'
    | 'event'
    | 'policy'
    | 'technology'
    | 'infrastructure'
    | 'other';
  description?: string;
  aliases: string[];
  metadata: Record<string, unknown>;
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
  relationship_type:
    | 'supports'
    | 'opposes'
    | 'impacts'
    | 'related_to'
    | 'part_of'
    | 'causes'
    | 'mentioned_in'
    | 'located_in'
    | 'cross_domain_impact';
  strength: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  context?: string;
  source_entry_id?: string;
  created_at: string;
}

export interface KnowledgeGraphStats {
  total_entities: number;
  total_relationships: number;
  total_mentions: number;
  entities_by_type: Record<string, number>;
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
  key_factors: Array<{ topic_id?: number; mentions?: number; label?: string }>;
  entity_ids: number[];
  metadata: Record<string, unknown>;
  computed_at: string;
  created_at: string;
}

export interface CrossDomainConnection {
  id: number;
  entity_a: { id: number; name: string; type: string; domain: string };
  entity_b: { id: number; name: string; type: string; domain: string };
  strength: number;
  context: string;
  created_at: string;
}

export interface CrossDomainPair {
  pair: string;
  domain_a: string;
  domain_b: string;
  connection_count: number;
  avg_strength: number;
}

// ─── Alerts ────────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  triggered_at: string;
  is_read: boolean;
  state_id?: number;
  state_name?: string;
  ward_id?: number;
  ac_name?: string;
  priority_score?: number;
  population_impact?: number;
  is_strategic?: boolean;
  resolved_at?: string;
}

// ─── Policy Briefs ─────────────────────────────────────────────────────────────

export interface BriefSummary {
  id: string;
  title: string;
  scope: string;
  scope_name: string;
  generated_at: string;
}

export interface GeoOption {
  id: number;
  name: string;
  type?: string;
}

// ─── Utility helpers ───────────────────────────────────────────────────────────

/** Classify urgency score into label + colors */
export function urgencyConfig(score: number) {
  if (score >= 0.7)
    return {
      bar: 'bg-red-500',
      text: 'text-red-400',
      border: 'border-red-500/20',
      badge: 'bg-red-500/20 text-red-400 border-red-500/30',
      label: 'CRITICAL',
    };
  if (score >= 0.4)
    return {
      bar: 'bg-amber-500',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      label: 'HIGH',
    };
  if (score >= 0.2)
    return {
      bar: 'bg-yellow-400',
      text: 'text-yellow-400',
      border: 'border-yellow-500/20',
      badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      label: 'MODERATE',
    };
  return {
    bar: 'bg-[#FAF5ED]0',
    text: 'text-[#6B5E57]',
    border: 'border-slate-600',
    badge: 'bg-slate-600/30 text-[#6B5E57] border-slate-600',
    label: 'LOW',
  };
}

/** Classify sentiment score into label + tailwind classes */
export function moodConfig(score: number) {
  if (score > 0.15)
    return {
      label: 'Positive',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      trend: 'up' as const,
    };
  if (score < -0.15)
    return {
      label: 'Negative',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/30',
      trend: 'down' as const,
    };
  return {
    label: 'Mixed',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
    trend: 'neutral' as const,
  };
}

/** Domain color / icon map for consistent visual language */
export const DOMAIN_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: string }
> = {
  geopolitics: {
    label: 'Geopolitics',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: '🌐',
  },
  economics: {
    label: 'Economics',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: '📈',
  },
  defense: {
    label: 'Defense',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: '🛡️',
  },
  climate: {
    label: 'Climate',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    icon: '🌿',
  },
  technology: {
    label: 'Technology',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    icon: '💡',
  },
  society: {
    label: 'Society',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: '👥',
  },
};
