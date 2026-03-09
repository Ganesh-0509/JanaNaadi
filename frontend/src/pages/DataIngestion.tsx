import { useState, useEffect } from 'react';
import { uploadCSV, submitManualEntry, triggerIngestion, getIngestStatus } from '../api/admin';
import StatCard from '../components/StatCard';
import { Upload, Play, RefreshCw, FileText, CheckCircle, XCircle, MapPin } from 'lucide-react';

function fmtLastRun(ts: string | null | undefined): string {
  if (!ts) return 'never';
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

type Toast = { type: 'success' | 'error'; message: string };

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

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported by browser');
      return;
    }
    setGeoLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          // Reverse geocode using nominatim (OpenStreetMap) — no API key needed
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          // Build a human-readable location hint: ward → suburb → city → state
          const parts = [
            addr.suburb || addr.neighbourhood || addr.village,
            addr.city || addr.town || addr.county,
            addr.state,
          ].filter(Boolean);
          setManualLocation(parts.join(', '));
        } catch {
          setGeoError('Could not resolve address — coordinates detected');
        } finally {
          setGeoLocating(false);
        }
      },
      (err) => {
        setGeoLocating(false);
        setGeoError(err.code === 1 ? 'Location permission denied' : 'Location unavailable');
      },
      { timeout: 10000 }
    );
  };

  const [triggerType, setTriggerType] = useState<'twitter' | 'news'>('news');
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [newEntries, setNewEntries] = useState<number | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => setToast({ type, message });

  // Load status on mount so cards are not empty initially
  useEffect(() => { refreshStatus(); }, []);

  const handleCSVUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    setCsvResult(null);
    setUploadProgress(0);
    // Simulate incremental progress while awaiting
    const tick = setInterval(() => setUploadProgress((p) => Math.min(p + 12, 85)), 300);
    try {
      const result = await uploadCSV(csvFile);
      clearInterval(tick);
      setUploadProgress(100);
      setCsvResult(result);
      showToast('success', `Processed ${result.processed ?? 0} rows${result.errors ? `, ${result.errors} errors` : ''}`);
    } catch (e) {
      clearInterval(tick);
      setUploadProgress(0);
      showToast('error', 'Upload failed — check file format and try again');
    } finally {
      setUploading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualText.trim()) return;
    setSubmitting(true);
    try {
      await submitManualEntry({
        text: manualText,
        source: manualSource,
        location_hint: manualLocation || undefined,
        language: manualLang,
      });
      setManualText('');
      setManualLocation('');
      showToast('success', 'Entry submitted and queued for NLP processing');
    } catch (e) {
      showToast('error', 'Submission failed — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerResult(null);
    setNewEntries(null);

    // Snapshot baseline count before triggering
    let baseline = 0;
    try {
      const s = await getIngestStatus();
      setStatus(s);
      baseline = s.total_today ?? 0;
    } catch {}

    try {
      await triggerIngestion(triggerType);
      const label = triggerType === 'twitter' ? 'Twitter' : 'News/RSS';
      showToast('success', `${label} ingestion started — monitoring for new entries…`);

      // Poll every 5 s for up to 60 s, show live delta
      setPolling(true);
      let checks = 0;
      const poll = setInterval(async () => {
        checks++;
        try {
          const s = await getIngestStatus();
          setStatus(s);
          const delta = (s.total_today ?? 0) - baseline;
          if (delta > 0) setNewEntries(delta);
        } catch {}
        if (checks >= 12) {
          clearInterval(poll);
          setPolling(false);
          setTriggerResult('done');
        }
      }, 5000);
    } catch {
      showToast('error', 'Ingestion trigger failed');
      setPolling(false);
    } finally {
      setTriggering(false);
    }
  };

  const refreshStatus = async () => {
    try {
      const s = await getIngestStatus();
      setStatus(s);
    } catch (e) {
      console.error('Status error:', e);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {toast && <ToastBar toast={toast} onDismiss={() => setToast(null)} />}
      <h1 className="text-2xl font-bold">Data Ingestion</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Twitter Last Run" value={fmtLastRun(status?.twitter_last_run)} icon="🐦" />
        <StatCard label="News Last Run" value={fmtLastRun(status?.news_last_run)} icon="📰" />
        <StatCard label="Ingested Today" value={status?.total_today ?? '—'} icon="📊" />
        <StatCard
          label="Last Run Added"
          value={
            status?.twitter_last_count != null || status?.news_last_count != null
              ? `T:${status?.twitter_last_count ?? 0} N:${status?.news_last_count ?? 0}`
              : '—'
          }
          icon="✅"
        />
      </div>

      <button
        onClick={refreshStatus}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm hover:bg-slate-700"
      >
        <RefreshCw size={14} />
        Refresh Status
      </button>

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
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
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
              <select
                value={manualSource}
                onChange={(e) => setManualSource(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="survey">Survey</option>
                <option value="field">Field Report</option>
                <option value="helpline">Helpline</option>
              </select>
              {/* Location field with GPS button */}
              <div className="flex gap-1">
                <input
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="Location hint"
                  className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={geoLocating}
                  title="Detect my location"
                  className="flex-shrink-0 px-2 py-2 bg-slate-600 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-slate-300 transition-colors"
                >
                  <MapPin size={14} className={geoLocating ? 'animate-pulse' : ''} />
                </button>
              </div>
              <select
                value={manualLang}
                onChange={(e) => setManualLang(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              >
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

      {/* Trigger Ingestion */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Play size={18} /> Trigger Ingestion
        </h2>
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Source</label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as 'twitter' | 'news')}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="twitter">Twitter</option>
              <option value="news">News/RSS</option>
            </select>
          </div>
          <button
            onClick={handleTrigger}
            disabled={triggering || polling}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg text-sm font-medium"
          >
            {triggering ? 'Starting…' : polling ? 'Running…' : 'Start Ingestion'}
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
    </div>
  );
}
