import { useState, useEffect, useRef } from 'react';
import { uploadCSV, submitManualEntry, triggerIngestion, getIngestStatus } from '../api/admin';
import StatCard from '../components/StatCard';
import { Upload, Play, RefreshCw, FileText, CheckCircle, XCircle, MapPin, Activity, Clock } from 'lucide-react';

function fmtLastRun(ts: string | null | undefined): string {
  if (!ts) return 'never';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

type Toast = { type: 'success' | 'error'; message: string };
type TriggerSource = 'twitter' | 'news' | 'reddit' | 'gnews';

const SOURCE_META: Record<TriggerSource, { label: string; icon: string; interval: string }> = {
  news:    { label: 'News RSS',     icon: '📰', interval: 'auto every 2h' },
  gnews:   { label: 'Google News',  icon: '🔍', interval: 'auto every 2h' },
  reddit:  { label: 'Reddit',       icon: '🟠', interval: 'auto every 2h' },
  twitter: { label: 'Twitter/X',    icon: '🐦', interval: 'manual only'   },
};

function ToastBar({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-medium animate-fade-in ${
      toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
      {toast.message}
    </div>
  );
}

export default function DataIngestion() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [manualText, setManualText] = useState('');
  const [manualSource, setManualSource] = useState('survey');
  const [manualLocation, setManualLocation] = useState('');
  const [manualLang, setManualLang] = useState('en');
  const [submitting, setSubmitting] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [triggerType, setTriggerType] = useState<TriggerSource>('news');
  const [triggering, setTriggering] = useState(false);
  const [polling, setPolling] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [newEntries, setNewEntries] = useState<number | null>(null);

  const [status, setStatus] = useState<any>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => setToast({ type, message });

  const refreshStatus = async (silent = false) => {
    try {
      const s = await getIngestStatus();
      setStatus(s);
      setLastRefreshed(new Date());
    } catch (e) {
      if (!silent) console.error('Status error:', e);
    }
  };

  // Load on mount + auto-refresh every 30 s so scheduler runs are reflected automatically
  useEffect(() => {
    refreshStatus();
    autoRefreshRef.current = setInterval(() => refreshStatus(true), 30_000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) { setGeoError('Geolocation not supported by browser'); return; }
    setGeoLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const parts = [addr.suburb || addr.neighbourhood || addr.village, addr.city || addr.town || addr.county, addr.state].filter(Boolean);
          setManualLocation(parts.join(', '));
        } catch { setGeoError('Could not resolve address — coordinates detected'); }
        finally { setGeoLocating(false); }
      },
      (err) => { setGeoLocating(false); setGeoError(err.code === 1 ? 'Location permission denied' : 'Location unavailable'); },
      { timeout: 10000 }
    );
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return;
    setUploading(true); setCsvResult(null); setUploadProgress(0);
    const tick = setInterval(() => setUploadProgress((p) => Math.min(p + 12, 85)), 300);
    try {
      const result = await uploadCSV(csvFile);
      clearInterval(tick); setUploadProgress(100); setCsvResult(result);
      showToast('success', `Processed ${result.processed ?? 0} rows${result.errors ? `, ${result.errors} errors` : ''}`);
      await refreshStatus(true);
    } catch { clearInterval(tick); setUploadProgress(0); showToast('error', 'Upload failed — check file format and try again'); }
    finally { setUploading(false); }
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;
    setSubmitting(true);
    try {
      await submitManualEntry({ text: manualText, source: manualSource, location_hint: manualLocation || undefined, language: manualLang });
      setManualText(''); setManualLocation('');
      showToast('success', 'Entry submitted and queued for NLP processing');
      await refreshStatus(true);
    } catch { showToast('error', 'Submission failed — please try again'); }
    finally { setSubmitting(false); }
  };

  const handleTrigger = async () => {
    setTriggering(true); setTriggerResult(null); setNewEntries(null);
    let baseline = status?.total_today ?? 0;
    try {
      await triggerIngestion(triggerType);
      const meta = SOURCE_META[triggerType];
      showToast('success', `${meta.label} ingestion started — monitoring for new entries…`);
      setPolling(true);
      let checks = 0;
      const poll = setInterval(async () => {
        checks++;
        try {
          const s = await getIngestStatus();
          setStatus(s); setLastRefreshed(new Date());
          const delta = (s.total_today ?? 0) - baseline;
          if (delta > 0) setNewEntries(delta);
        } catch {}
        if (checks >= 12) { clearInterval(poll); setPolling(false); setTriggerResult('done'); }
      }, 5000);
    } catch { showToast('error', 'Ingestion trigger failed'); setPolling(false); }
    finally { setTriggering(false); }
  };

  // Source-level last-run info from status
  const srcLastRun: Record<TriggerSource, string | null> = {
    news:    status?.news_last_run    ?? null,
    gnews:   status?.gnews_last_run   ?? null,
    reddit:  status?.reddit_last_run  ?? null,
    twitter: status?.twitter_last_run ?? null,
  };
  const srcLastCount: Record<TriggerSource, number | null> = {
    news:    status?.news_last_count    ?? null,
    gnews:   status?.gnews_last_count   ?? null,
    reddit:  status?.reddit_last_count  ?? null,
    twitter: status?.twitter_last_count ?? null,
  };
  const srcTodayCount: Record<string, number> = status?.source_counts ?? {};

  return (
    <div className="p-6 space-y-6">
      {toast && <ToastBar toast={toast} onDismiss={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity size={22} className="text-blue-400" /> Data Ingestion
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            News, Google News &amp; Reddit ingest automatically. Status refreshes every 30 s.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={11} /> refreshed {fmtLastRun(lastRefreshed.toISOString())}
            </span>
          )}
          <button
            onClick={() => refreshStatus()}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm hover:bg-slate-700"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Ingested Today" value={status?.total_today ?? '—'} icon="📊" />
        <StatCard label="News Today"     value={srcTodayCount['news']    ?? '—'} icon="📰" />
        <StatCard label="Reddit Today"   value={srcTodayCount['reddit']  ?? '—'} icon="🟠" />
        <StatCard label="CSV / Manual"   value={(srcTodayCount['csv'] ?? 0) + (srcTodayCount['manual'] ?? 0)} icon="✍️" />
      </div>

      {/* Per-source scheduler status */}
      <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
        <h2 className="font-semibold mb-4 text-sm uppercase text-slate-400 tracking-wide">Automatic Scheduler Status</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.entries(SOURCE_META) as [TriggerSource, typeof SOURCE_META[TriggerSource]][]).map(([key, meta]) => (
            <div key={key} className="bg-slate-700/50 rounded-xl p-3 border border-slate-600/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{meta.icon}</span>
                <div>
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="text-[11px] text-slate-500">{meta.interval}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Last run</span>
                  <span className={`font-medium ${srcLastRun[key] ? 'text-slate-200' : 'text-slate-500'}`}>
                    {fmtLastRun(srcLastRun[key])}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Added last run</span>
                  <span className={`font-medium ${(srcLastCount[key] ?? 0) > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                    {srcLastCount[key] != null ? `+${srcLastCount[key]}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Today (DB)</span>
                  <span className="font-medium text-blue-300">
                    {key === 'gnews' ? '(→ news)' : (srcTodayCount[key] ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Trigger */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Play size={18} /> Manual Trigger
        </h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Source</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as TriggerSource)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            >
              {(Object.entries(SOURCE_META) as [TriggerSource, typeof SOURCE_META[TriggerSource]][]).map(([key, m]) => (
                <option key={key} value={key}>{m.icon} {m.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleTrigger}
            disabled={triggering || polling}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg text-sm font-medium"
          >
            {triggering ? 'Starting…' : polling ? 'Running…' : 'Run Now'}
          </button>
          {polling && (
            <span className="flex items-center gap-2 text-sm text-amber-400 font-medium">
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Monitoring…
            </span>
          )}
          {newEntries != null && (
            <span className="text-sm text-green-400 font-semibold">
              ✅ +{newEntries} new {newEntries === 1 ? 'entry' : 'entries'} added
            </span>
          )}
          {triggerResult === 'done' && newEntries === 0 && (
            <span className="text-sm text-slate-400">
              ⚠️ No new entries — all items were duplicates or source returned nothing
            </span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* CSV Upload */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Upload size={18} /> CSV Upload
          </h2>
          <div className="space-y-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-500 file:text-white hover:file:bg-blue-600"
            />
            <button
              onClick={handleCSVUpload}
              disabled={!csvFile || uploading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-sm font-medium"
            >
              {uploading ? 'Uploading...' : 'Upload & Process'}
            </button>
            {uploading && (
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            {csvResult && (
              <div className="bg-slate-700/50 rounded-lg p-3 text-sm">
                <div>✅ Processed: <span className="font-bold text-green-400">{csvResult.processed}</span></div>
                {csvResult.errors > 0 && <div>⚠️ Errors: <span className="font-bold text-amber-400">{csvResult.errors}</span></div>}
              </div>
            )}
          </div>
        </div>

        {/* Manual Entry */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <FileText size={18} /> Manual Entry
          </h2>
          <div className="space-y-3">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Enter citizen voice text..."
              rows={3}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2.5 text-sm resize-none"
            />
            <div className="grid grid-cols-3 gap-2">
              <select value={manualSource} onChange={(e) => setManualSource(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                <option value="survey">Survey</option>
                <option value="field">Field Report</option>
                <option value="helpline">Helpline</option>
              </select>
              <div className="flex gap-1">
                <input
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="Location hint"
                  className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                />
                <button type="button" onClick={detectLocation} disabled={geoLocating} title="Detect my location"
                  className="flex-shrink-0 px-2 py-2 bg-slate-600 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-slate-300 transition-colors">
                  <MapPin size={14} className={geoLocating ? 'animate-pulse' : ''} />
                </button>
              </div>
              <select value={manualLang} onChange={(e) => setManualLang(e.target.value)} className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm">
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="bn">Bengali</option>
              </select>
            </div>
            {geoError && <p className="text-xs text-amber-400">{geoError}</p>}
            <button
              onClick={handleManualSubmit}
              disabled={submitting || !manualText.trim()}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm font-medium"
            >
              {submitting ? 'Submitting...' : 'Submit Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
