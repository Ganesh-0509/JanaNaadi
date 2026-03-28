import { useEffect, useState } from 'react';
import { liveStreamService } from '../services/liveStreamService';

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
  const [pulse, setPulse] = useState<Pulse | null>(() => {
    const current = liveStreamService.getSnapshot().pulse;
    return current as Pulse | null;
  });
  const [status, setStatus] = useState<Status>(liveStreamService.getSnapshot().status);

  useEffect(() => {
    liveStreamService.start();
    const unsubscribe = liveStreamService.subscribe((snapshot) => {
      setStatus(snapshot.status);
      setPulse(snapshot.pulse as Pulse | null);
    });
    return unsubscribe;
  }, []);

  return { pulse, status };
}
