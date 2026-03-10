import { useEffect, useRef, useState, useCallback } from 'react';

export interface LiveEntry {
  id: string; // local UUID for React key
  source_id: string | null;
  entry_id: string | null;
  text: string;
  sentiment: string;
  sentiment_score: number;
  topic: string | null;
  state: string | null;
  state_id: number | null;
  source: string;
  language: string;
  historical?: boolean;
  receivedAt: number; // Unix ms
}

type Status = 'connecting' | 'connected' | 'disconnected';

export function useLiveStream(maxEntries = 60) {
  const [entries, setEntries] = useState<LiveEntry[]>([]);
  const [status, setStatus] = useState<Status>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const unmountedRef = useRef(false);
  const idCounter = useRef(0);
  // Fingerprint set for dedup: entry_id → truthy, or source_id → truthy, or text-prefix
  const seenRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (unmountedRef.current) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/^https?/, protocol)
      : `${protocol}://${window.location.hostname}:8000`;

    setStatus('connecting');
    seenRef.current = new Set(); // Reset dedup state on each new connection
    const ws = new WebSocket(`${host}/ws/live`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) return;
      setStatus('connected');
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 20_000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type !== 'entry') return;

        // Build a stable fingerprint — prefer DB entry_id, then source_id, fallback to text prefix
        const fp: string =
          msg.entry_id
            ? `eid:${msg.entry_id}`
            : msg.source_id
            ? `sid:${msg.source_id}`
            : `txt:${(msg.text || '').slice(0, 80)}`;

        if (seenRef.current.has(fp)) return; // Already displayed — skip duplicate
        seenRef.current.add(fp);
        // Prevent the seen-set from growing unbounded
        if (seenRef.current.size > maxEntries * 3) {
          const oldest = [...seenRef.current].slice(0, maxEntries);
          seenRef.current = new Set(oldest);
        }

        idCounter.current += 1;
        const entry: LiveEntry = {
          id: `e-${Date.now()}-${idCounter.current}`,
          source_id: msg.source_id ?? null,
          entry_id: msg.entry_id ?? null,
          text: msg.text || '',
          sentiment: msg.sentiment || 'neutral',
          sentiment_score: msg.sentiment_score ?? 0,
          topic: msg.topic ?? null,
          state: msg.state ?? null,
          state_id: msg.state_id ?? null,
          source: msg.source || 'unknown',
          language: msg.language || 'en',
          historical: msg.historical ?? false,
          receivedAt: Date.now(),
        };
        setEntries((prev) => [entry, ...prev].slice(0, maxEntries));
      } catch {/* ignore */}
    };

    ws.onclose = () => {
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (unmountedRef.current) return;
      setStatus('disconnected');
      reconnectTimer.current = setTimeout(connect, 5_000);
    };

    ws.onerror = () => { ws.close(); };
  }, [maxEntries]);

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

  return { entries, status };
}
