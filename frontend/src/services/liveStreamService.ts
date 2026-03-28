import { getWsUrl } from '../utils/ws';
import { getRecentVoices } from '../api/public';

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
  ward_id: number | null;
  ward: string | null;
  source: string;
  source_url: string | null;
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
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;

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
    this.reconnectAttempts = 0;
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
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
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
    const pulse = this.pulse ?? this.derivePulseFromEntries();
    return {
      status: this.status,
      pulse,
      entries: this.entries,
    };
  }

  private derivePulseFromEntries(): LivePulseSnapshot | null {
    if (this.entries.length === 0) return null;

    let sentimentTotal = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const topicCounts = new Map<string, number>();

    for (const entry of this.entries) {
      const score = Number(entry.sentiment_score ?? 0);
      sentimentTotal += score;

      if (entry.sentiment === 'positive') positiveCount += 1;
      else if (entry.sentiment === 'negative') negativeCount += 1;
      else neutralCount += 1;

      const topic = (entry.topic ?? '').trim();
      if (topic) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
      }
    }

    const top_3_issues = Array.from(topicCounts.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      avg_sentiment: sentimentTotal / this.entries.length,
      total_entries_24h: this.entries.length,
      positive_count: positiveCount,
      negative_count: negativeCount,
      neutral_count: neutralCount,
      top_3_issues,
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
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      this.reconnectAttempts = 0;
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
        const parsedIngestedAt = msg.ingested_at ? Date.parse(msg.ingested_at) : NaN;
        const receivedAt = Number.isFinite(parsedIngestedAt) ? parsedIngestedAt : Date.now();
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
          ward_id: msg.ward_id ?? null,
          ward: msg.ward ?? null,
          source: msg.source || 'unknown',
          source_url: msg.source_url ?? null,
          language: msg.language || 'en',
          historical: msg.historical ?? false,
          receivedAt,
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

      this.startPollingFallback();
      
      this.reconnectAttempts += 1;
      const delayMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
      this.reconnectTimer = setTimeout(() => this.connect(), delayMs);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  private startPollingFallback() {
    if (!this.shouldRun) return;

    this.setStatus('connecting');

    const poll = async () => {
      try {
        const rows = await getRecentVoices(Math.min(this.maxBuffer, 120), true);
        if (!Array.isArray(rows)) return;

        const nextEntries: LiveStreamEntry[] = rows.map((row: any, idx: number) => {
          const parsedIngestedAt = row.ingested_at ? Date.parse(row.ingested_at) : NaN;
          const receivedAt = Number.isFinite(parsedIngestedAt) ? parsedIngestedAt : Date.now();
          const fp = row.id
            ? `eid:${row.id}`
            : row.source_id
            ? `sid:${row.source_id}`
            : `txt:${(row.text || '').slice(0, 80)}`;

          this.seen.add(fp);

          return {
            id: `p-${receivedAt}-${idx}`,
            source_id: row.source_id ?? null,
            entry_id: row.id ?? null,
            text: row.text || '',
            sentiment: row.sentiment || 'neutral',
            sentiment_score: Number(row.sentiment_score ?? 0),
            topic: row.topic ?? null,
            state: row.state ?? null,
            state_id: row.state_id ?? null,
            ward_id: row.ward_id ?? null,
            ward: row.ward ?? null,
            source: row.source || 'unknown',
            source_url: row.source_url ?? null,
            language: row.language || 'en',
            historical: true,
            receivedAt,
          };
        });

        if (nextEntries.length > 0) {
          this.entries = nextEntries
            .sort((a, b) => b.receivedAt - a.receivedAt)
            .slice(0, this.maxBuffer);
          this.setStatus('connected');
        } else {
          this.setStatus('connecting');
        }
      } catch {
        this.setStatus('connecting');
      }
    };

    void poll();

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.pollTimer = setInterval(() => {
      void poll();
    }, 5_000);
  }
}

export const liveStreamService = new LiveStreamService();
