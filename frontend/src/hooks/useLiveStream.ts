import { useEffect, useState } from 'react';
import { liveStreamService } from '../services/liveStreamService';
import { getRecentVoices } from '../api/public';

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

export function useLiveStream(maxEntries = 60) {
  const [entries, setEntries] = useState<LiveEntry[]>(() =>
    liveStreamService.getSnapshot().entries.slice(0, maxEntries) as LiveEntry[]
  );
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>(
    liveStreamService.getSnapshot().status
  );

  useEffect(() => {
    let cancelled = false;

    const hydrateFromRecent = async () => {
      try {
        const existing = liveStreamService.getSnapshot().entries;
        if (existing.length > 0) return;

        const rows = await getRecentVoices(Math.min(maxEntries, 40));
        if (cancelled || !Array.isArray(rows)) return;

        const fallback: LiveEntry[] = rows.map((row: any, idx: number) => ({
          id: `fallback-${Date.now()}-${idx}`,
          source_id: row.source_id ?? null,
          entry_id: row.id ?? null,
          text: row.text ?? row.original_text ?? '',
          sentiment: row.sentiment ?? 'neutral',
          sentiment_score: Number(row.sentiment_score ?? 0),
          topic: row.topic ?? null,
          state: row.state ?? null,
          state_id: row.state_id ?? null,
          source: row.source ?? 'unknown',
          language: row.language ?? 'en',
          historical: true,
          receivedAt: row.ingested_at ? Date.parse(row.ingested_at) || Date.now() : Date.now(),
        }));

        if (fallback.length > 0 && liveStreamService.getSnapshot().entries.length === 0) {
          setEntries(fallback.slice(0, maxEntries));
        }
      } catch {
        // Keep WS retry behavior; fallback is best-effort only.
      }
    };

    liveStreamService.start();
    hydrateFromRecent();

    const unsubscribe = liveStreamService.subscribe((snapshot) => {
      setStatus(snapshot.status);
      setEntries(snapshot.entries.slice(0, maxEntries) as LiveEntry[]);

      if (snapshot.status === 'disconnected' && snapshot.entries.length === 0) {
        hydrateFromRecent();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [maxEntries]);

  return { entries, status };
}
