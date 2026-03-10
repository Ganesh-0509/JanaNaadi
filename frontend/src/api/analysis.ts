import client from './client';

export async function getRegionAnalysis(type: string, id: number | string) {
  const { data } = await client.get(`/api/analysis/${type}/${id}`);
  return data;
}

export async function getSentimentTrend(params: { scope: string; scope_id?: number; period?: string }) {
  const { data } = await client.get('/api/trends/sentiment', { params });
  return data;
}

export async function getTopicTrend(scope: string, id: number | null, period = '30d') {
  const params = new URLSearchParams({ scope, period });
  if (id) params.set('id', String(id));
  const { data } = await client.get(`/api/trends/topics?${params}`);
  return data;
}

export async function getComparison(params: { scope: string; ids: number[]; period?: string }) {
  // Backend uses `type` not `scope` for the query param
  const { data } = await client.get('/api/trends/comparison', {
    params: { type: params.scope, scope_ids: params.ids.join(',') },
  });
  return data;
}

export async function summarizeRegion(type: string, id: number | string) {
  const { data } = await client.get(`/api/analysis/summarize/${type}/${id}`);
  return data as { summary: string; region: string; total_voices: number };
}

export async function searchEntries(params: Record<string, string | number | undefined>) {
  const { data } = await client.get('/api/search/entries', { params });
  return data;
}

export async function summarizeSearch(query: string, limit = 100) {
  const { data } = await client.post('/api/search/summarize', null, { params: { q: query, limit } });
  return data as {
    summary: string;
    key_themes: string[];
    sentiment_analysis: string;
    sentiment_overview: string;
    entry_count: number;
    sentiment_distribution: { positive: number; neutral: number; negative: number };
  };
}

export interface ForecastPoint {
  date: string;
  forecast_score: number;
  upper: number;
  lower: number;
  is_forecast: true;
}

export async function getForecast(scope: string, id: string | number, horizon = 7): Promise<ForecastPoint[]> {
  const { data } = await client.get('/api/trends/forecast', { params: { scope, id, horizon } });
  return data;
}
