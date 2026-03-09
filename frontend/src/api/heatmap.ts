import client from './client';

interface HeatmapParams {
  topic?: string;
  time_range?: string;
}

export async function getHeatmapStates(params?: HeatmapParams) {
  const { data } = await client.get('/api/heatmap/states', { params });
  return data;
}

export async function getHeatmapDistricts(stateId: number, params?: HeatmapParams) {
  const { data } = await client.get(`/api/heatmap/districts?state_id=${stateId}`, { params });
  return data;
}

export async function getHeatmapConstituencies(districtId: number, params?: HeatmapParams) {
  const { data } = await client.get(`/api/heatmap/constituencies?district_id=${districtId}`, { params });
  return data;
}

export async function getHeatmapWards(constituencyId: number, params?: HeatmapParams) {
  const { data } = await client.get(`/api/heatmap/wards?constituency_id=${constituencyId}`, { params });
  return data;
}
