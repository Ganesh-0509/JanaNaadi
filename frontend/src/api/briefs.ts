import apiClient from './client';

// ============================================================
// BRIEFS API - Intelligence Briefs & Policy Recommendations
// ============================================================

export interface PolicyRecommendation {
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  departments: string[];
  confidence: number;
}

export interface BriefRecommendations {
  insight_summary: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  confidence: number;
  sentiment: {
    negative: number;
    positive: number;
    neutral: number;
  };
  chain_depth: number;
  reasoning_type: 'direct' | 'multi_hop';
  evidence_count: number;
  recommended_actions: PolicyRecommendation[];
}

// ============================================================
// API FUNCTIONS
// ============================================================

/**
 * Get policy recommendations for a specific brief
 */
export const getBriefRecommendations = async (
  briefId: string
): Promise<BriefRecommendations> => {
  const response = await apiClient.post(
    `/api/briefs/${briefId}/recommendations`
  );
  return response.data;
};

/**
 * Generate policy recommendations from a direct insight
 */
export const generateRecommendations = async (
  insight: string,
  confidence: number,
  domains: string[],
  options?: {
    negativeSentiment?: number;
    positiveSentiment?: number;
    neutralSentiment?: number;
    relationshipType?: string;
    chainDepth?: number;
  }
): Promise<BriefRecommendations> => {
  const params = new URLSearchParams({
    insight,
    confidence: confidence.toString(),
    ...Object.fromEntries(domains.map((d, i) => [`domains`, d])),
    negative_sentiment: (options?.negativeSentiment || 50).toString(),
    positive_sentiment: (options?.positiveSentiment || 25).toString(),
    neutral_sentiment: (options?.neutralSentiment || 25).toString(),
    ...(options?.relationshipType && {
      relationship_type: options.relationshipType
    }),
    chain_depth: (options?.chainDepth || 1).toString()
  });

  const response = await apiClient.post(
    `/api/briefs/recommendations/generate?${params}`
  );
  return response.data;
};

/**
 * Generate policy recommendations for multiple insights in batch
 */
export const batchGenerateRecommendations = async (
  insights: Array<{
    insight: string;
    confidence: number;
    domains: string[];
    evidence_texts?: string[];
    sentiment?: {
      negative: number;
      positive: number;
      neutral: number;
    };
  }>
): Promise<BriefRecommendations[]> => {
  const response = await apiClient.post(
    `/api/briefs/recommendations/batch`,
    insights
  );
  return response.data;
};
