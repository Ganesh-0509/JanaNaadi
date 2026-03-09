import { useState, useEffect, useRef } from 'react';
import { getAlerts, markAlertRead, markAlertResolved } from '../api/alerts';

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  triggered_at: string;
  is_read: boolean;
}

export function useAlerts(isAdmin = false) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const fetch = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await getAlerts();
      setAlerts(data);
    } catch (e) {
      console.error('Alerts fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => { fetch(); }, [isAdmin]);

  // Poll every 30 s for new alerts
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Fire a browser push notification when a new critical/high alert arrives
  useEffect(() => {
    if (alerts.length === 0) return;
    const currentIds = new Set(alerts.map((a) => a.id));
    if (prevIdsRef.current.size > 0) {
      for (const a of alerts) {
        if (
          !prevIdsRef.current.has(a.id) &&
          !a.is_read &&
          (a.severity === 'critical' || a.severity === 'high')
        ) {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`JanaNaadi ⚠️ ${a.severity.toUpperCase()}`, {
              body: a.title,
              icon: '/favicon.ico',
            });
          }
        }
      }
    }
    prevIdsRef.current = currentIds;
  }, [alerts]);

  const handleMarkRead = async (id: string) => {
    await markAlertRead(id);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
  };

  const handleResolve = async (id: string) => {
    await markAlertResolved(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return { alerts, loading, unreadCount, markRead: handleMarkRead, resolve: handleResolve, refetch: fetch };
}
