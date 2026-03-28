import { useEffect, useState } from 'react';
import { liveStreamService } from '../services/liveStreamService';

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
  ward_id: number | null;
  ward: string | null;
  source: string;
  source_url: string | null;
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
    liveStreamService.start();

    const unsubscribe = liveStreamService.subscribe((snapshot) => {
      setStatus(snapshot.status);
      setEntries(snapshot.entries.slice(0, maxEntries) as LiveEntry[]);
    });

    return () => {
      unsubscribe();
    };
  }, [maxEntries]);

  return { entries, status };
}
