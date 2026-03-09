import client from './client';

export async function getAlerts(params?: { severity?: string; unread?: boolean }) {
  const { data } = await client.get('/api/alerts', { params });
  return data;
}

export async function markAlertRead(id: string) {
  await client.post(`/api/alerts/${id}/read`);
}

export async function markAlertResolved(id: string) {
  await client.post(`/api/alerts/${id}/resolve`);
}
