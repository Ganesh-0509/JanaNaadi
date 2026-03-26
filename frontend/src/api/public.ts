import client from './client';

export async function getNationalPulse() {
  const { data } = await client.get('/api/public/national-pulse');
  return data;
}

export async function getStateRankings() {
  const { data } = await client.get('/api/public/state-rankings');
  return data;
}

export async function getTrendingTopics() {
  const { data } = await client.get('/api/public/trending-topics');
  return data;
}

export function getOpenDataUrl(period = 'weekly') {
  return `${client.defaults.baseURL}/api/public/open-data?format=csv&period=${period}`;
}

export async function submitCitizenVoice(text: string, area?: string, category?: string) {
  const { data } = await client.post('/api/public/voice', { text, area, category });
  return data;
}

export async function getRecentVoices(limit = 20) {
  const { data } = await client.get(`/api/public/recent-voices?limit=${limit}`);
  return data;
}

export async function getAreaPulse(area: string) {
  const { data } = await client.get(`/api/public/area-pulse?area=${encodeURIComponent(area)}`);
  return data;
}

export async function getKeywords(limit = 40, stateId?: number): Promise<{ keyword: string; count: number }[]> {
  const params: Record<string, string | number> = { limit };
  if (stateId !== undefined) params.state_id = stateId;
  const { data } = await client.get('/api/public/keywords', { params });
  return data;
}

export async function getHotspots(limit = 15): Promise<{
  state_id: number; state: string; state_code: string;
  urgency_score: number; avg_sentiment: number; volume: number;
}[]> {
  const { data } = await client.get('/api/public/hotspots', { params: { limit } });
  return data;
}

export async function getMCDNews(): Promise<any[]> {
  const { data } = await client.get('/api/public/mcd-news');
  return data;
}
