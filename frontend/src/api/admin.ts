import client from './client';

export async function getAdminStats() {
  const { data } = await client.get('/api/admin/stats');
  return data;
}

export async function triggerIngestion(source: string) {
  const { data } = await client.post(`/api/ingest/${source}`);
  return data;
}

export async function getIngestStatus() {
  const { data } = await client.get('/api/ingest/status');
  return data;
}

export async function uploadCSV(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await client.post('/api/ingest/csv', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function submitManualEntry(entry: {
  text: string;
  source?: string;
  location_hint?: string;
  language?: string;
}) {
  const { data } = await client.post('/api/ingest/manual', entry);
  return data;
}

export async function generateBrief(scopeType: string, scopeId: number | null, period = 'weekly') {
  const { data } = await client.post('/api/briefs/generate', {
    scope_type: scopeType,
    scope_id: scopeId,
    period,
  });
  return data;
}

export async function listBriefs(scope?: string, scopeId?: number) {
  const params: Record<string, string> = {};
  if (scope) params.scope = scope;
  if (scopeId) params.scope_id = String(scopeId);
  const { data } = await client.get('/api/briefs', { params });
  return data;
}

export async function getBriefDetail(id: string) {
  const { data } = await client.get(`/api/briefs/${id}`);
  return data;
}

export async function triggerSnapshots() {
  const { data } = await client.post('/api/admin/snapshot/generate');
  return data;
}

export async function triggerAlertCheck() {
  const { data } = await client.post('/api/admin/check-alerts');
  return data;
}
