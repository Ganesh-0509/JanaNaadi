import { useEffect, useRef, useState, useCallback } from 'react';

type Status = 'connecting' | 'connected' | 'disconnected';

interface Pulse {
  avg_sentiment: number;
  total_entries_24h: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  top_3_issues: { topic: string; count: number }[];
}

export function useLivePulse() {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/^https?/, protocol)
      : `${protocol}://${window.location.hostname}:8000`;
    const url = `${host}/ws/live`;

    setStatus('connecting');
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) return;
      setStatus('connected');
      // keep-alive ping every 20s
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 20_000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'pulse') setPulse(msg);
      } catch {/* ignore */}
    };

    ws.onclose = () => {
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (unmountedRef.current) return;
      setStatus('disconnected');
      // Reconnect after 10s (reduced from 5s to minimize console spam)
      reconnectTimer.current = setTimeout(connect, 10_000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { pulse, status };
}
