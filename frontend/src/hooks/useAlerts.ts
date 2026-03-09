import { useState, useEffect } from 'react';
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

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
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

  useEffect(() => { fetch(); }, []);

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
