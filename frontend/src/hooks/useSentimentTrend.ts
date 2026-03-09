import { useState, useEffect } from 'react';
import { getSentimentTrend } from '../api/analysis';
import { useFilters } from '../context/FilterContext';

interface TrendPoint {
  date: string;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  volume: number;
}

export function useSentimentTrend(scope: string, scopeId: number) {
  const { filters } = useFilters();
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const result = await getSentimentTrend({
          scope,
          scope_id: scopeId,
          period: filters.timeRange,
        });
        if (!cancelled) setData(result);
      } catch (e) {
        console.error('Trend fetch error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [scope, scopeId, filters.timeRange]);

  return { data, loading };
}
