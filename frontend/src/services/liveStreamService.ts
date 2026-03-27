import { getWsUrl } from '../utils/ws';

export type LiveStatus = 'connecting' | 'connected' | 'disconnected';

export interface LivePulseSnapshot {
  avg_sentiment: number;
  total_entries_24h: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  top_3_issues: { topic: string; count: number }[];
}

export interface LiveStreamEntry {
  id: string;
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
  receivedAt: number;
}

export interface LiveStreamSnapshot {
  status: LiveStatus;
  pulse: LivePulseSnapshot | null;
  entries: LiveStreamEntry[];
}

type SnapshotListener = (snapshot: LiveStreamSnapshot) => void;

class LiveStreamService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private shouldRun = false;

  private status: LiveStatus = 'disconnected';
  private pulse: LivePulseSnapshot | null = null;
  private entries: LiveStreamEntry[] = [];
  private listeners = new Set<SnapshotListener>();

  private seen = new Set<string>();
  private idCounter = 0;
  private readonly maxBuffer = 500;

  start() {
    if (this.shouldRun) return;
    this.shouldRun = true;
    this.connect();
  }

  stop() {
    this.shouldRun = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = 'disconnected';
    this.emit();
  }

  subscribe(listener: SnapshotListener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): LiveStreamSnapshot {
    return {
      status: this.status,
      pulse: this.pulse,
      entries: this.entries,
    };
  }

  private emit() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private setStatus(status: LiveStatus) {
    this.status = status;
    this.emit();
  }

  private connect() {
    if (!this.shouldRun) return;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');

    const ws = new WebSocket(getWsUrl('/ws/live'));
    this.ws = ws;

    ws.onopen = () => {
      if (!this.shouldRun) return;
      this.setStatus('connected');

      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 20_000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'pulse') {
          if (!msg.error) {
            this.pulse = {
              avg_sentiment: msg.avg_sentiment ?? 0,
              total_entries_24h: msg.total_entries_24h ?? 0,
              positive_count: msg.positive_count ?? 0,
              negative_count: msg.negative_count ?? 0,
              neutral_count: msg.neutral_count ?? 0,
              top_3_issues: msg.top_3_issues ?? [],
            };
            this.emit();
          }
          return;
        }

        if (msg.type !== 'entry') return;

        const fp = msg.entry_id
          ? `eid:${msg.entry_id}`
          : msg.source_id
          ? `sid:${msg.source_id}`
          : `txt:${(msg.text || '').slice(0, 80)}`;

        if (this.seen.has(fp)) return;
        this.seen.add(fp);

        this.idCounter += 1;
        const entry: LiveStreamEntry = {
          id: `e-${Date.now()}-${this.idCounter}`,
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

        this.entries = [entry, ...this.entries].slice(0, this.maxBuffer);

        if (this.seen.size > this.maxBuffer * 3) {
          const retained = this.entries
            .slice(0, this.maxBuffer)
            .map((e) => (e.entry_id ? `eid:${e.entry_id}` : e.source_id ? `sid:${e.source_id}` : `txt:${e.text.slice(0, 80)}`));
          this.seen = new Set(retained);
        }

        this.emit();
      } catch {
        // Ignore malformed messages and keep socket alive.
      }
    };

    ws.onclose = () => {
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }

      if (!this.shouldRun) return;

      this.setStatus('disconnected');
      this.reconnectTimer = setTimeout(() => this.connect(), 3_000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }
}

export const liveStreamService = new LiveStreamService();
