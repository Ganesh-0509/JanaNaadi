import client from './client';

export async function getRegionAnalysis(type: string, id: number) {
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
  const { data } = await client.get('/api/trends/comparison', {
    params: { scope: params.scope, scope_ids: params.ids.join(','), period: params.period },
  });
  return data;
}

export async function searchEntries(params: Record<string, string | number | undefined>) {
  const { data } = await client.get('/api/search/entries', { params });
  return data;
}
