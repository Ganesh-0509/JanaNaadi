import { useState, useEffect, useCallback } from 'react';
import { getHeatmapStates, getHeatmapDistricts, getHeatmapConstituencies, getHeatmapWards } from '../api/heatmap';
import { useFilters } from '../context/FilterContext';

type Level = 'state' | 'district' | 'constituency' | 'ward';

interface HeatmapPoint {
  id: number;
  name: string;
  code?: string;
  lat: number;
  lng: number;
  avg_sentiment: number;
  volume: number;
  dominant_topic?: string;
  positive_count?: number;
  negative_count?: number;
  neutral_count?: number;
}

export function useHeatmapData() {
  const { filters } = useFilters();
  const [level, setLevel] = useState<Level>('state');
  const [parentId, setParentId] = useState<number | null>(null);
  const [data, setData] = useState<HeatmapPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ level: Level; id: number | null; name: string }>>([
    { level: 'state', id: null, name: 'India' },
  ]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        topic: filters.topic || undefined,
        time_range: filters.timeRange,
        source: filters.source || undefined,
        language: filters.language || undefined,
        sentiment: filters.sentiment || undefined,
      };
      let result: HeatmapPoint[] = [];
      switch (level) {
        case 'state':
          result = await getHeatmapStates(params);
          break;
        case 'district':
          if (parentId) result = await getHeatmapDistricts(parentId, params);
          break;
        case 'constituency':
          if (parentId) result = await getHeatmapConstituencies(parentId, params);
          break;
        case 'ward':
          if (parentId) result = await getHeatmapWards(parentId, params);
          break;
      }
      setData(result);
    } catch (e) {
      console.error('Heatmap fetch error:', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [level, parentId, filters.topic, filters.timeRange, filters.source, filters.language, filters.sentiment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const drillDown = (id: number, name: string) => {
    const NEXT: Record<Level, Level> = {
      state: 'district',
      district: 'constituency',
      constituency: 'ward',
      ward: 'ward',
    };
    if (level === 'ward') return;
    const next = NEXT[level];
    setBreadcrumbs((prev) => [...prev, { level: next, id, name }]);
    setLevel(next);
    setParentId(id);
  };

  const navigateTo = (index: number) => {
    const crumb = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setLevel(crumb.level);
    setParentId(crumb.id);
  };

  return { data, loading, level, breadcrumbs, drillDown, navigateTo };
}
