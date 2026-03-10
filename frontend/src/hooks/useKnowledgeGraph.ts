import { useQuery } from '@tanstack/react-query';
import { getGraphData, getGraphStats, getDomainIntelligence } from '../api/ontology';

export const useKnowledgeGraph = (params?: {
  entity_type?: string;
  domain?: string;
  min_mentions?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['knowledge-graph', params],
    queryFn: () => getGraphData(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useGraphStats = () => {
  return useQuery({
    queryKey: ['graph-stats'],
    queryFn: getGraphStats,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDomainIntelligence = (params?: {
  domain?: string;
  scope?: string;
  scope_id?: number;
}) => {
  return useQuery({
    queryKey: ['domain-intelligence', params],
    queryFn: () => getDomainIntelligence(params),
    staleTime: 5 * 60 * 1000,
  });
};
