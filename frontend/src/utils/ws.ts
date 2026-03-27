export function getWsUrl(path: string = '/ws/live'): string {
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (apiUrl && apiUrl.trim()) {
    const wsBase = apiUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
    return `${wsBase}${path}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const host = isLocalHost ? `${window.location.hostname}:8000` : window.location.host;
  return `${protocol}//${host}${path}`;
}
