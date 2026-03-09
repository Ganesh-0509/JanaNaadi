import { useState } from 'react';
import { uploadCSV, submitManualEntry, triggerIngestion, getIngestStatus } from '../api/admin';
import StatCard from '../components/StatCard';
import { Upload, Play, RefreshCw, FileText } from 'lucide-react';

export default function DataIngestion() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const [manualText, setManualText] = useState('');
  const [manualSource, setManualSource] = useState('survey');
  const [manualLocation, setManualLocation] = useState('');
  const [manualLang, setManualLang] = useState('en');
  const [submitting, setSubmitting] = useState(false);

  const [triggerType, setTriggerType] = useState<'twitter' | 'news'>('news');
  const [triggering, setTriggering] = useState(false);
  const [status, setStatus] = useState<any>(null);

  const handleCSVUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    try {
      const result = await uploadCSV(csvFile);
      setCsvResult(result);
    } catch (e) {
      console.error('Upload error:', e);
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
    } catch (e) {
      console.error('Submit error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerIngestion(triggerType);
    } catch (e) {
      console.error('Trigger error:', e);
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
      <h1 className="text-2xl font-bold">Data Ingestion</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Twitter" value={status?.twitter?.status || 'idle'} icon="🐦" />
        <StatCard label="News/RSS" value={status?.news?.status || 'idle'} icon="📰" />
        <StatCard label="Reddit" value={status?.reddit?.status || 'idle'} icon="💬" />
        <StatCard label="CSV" value={status?.csv?.status || 'idle'} icon="📁" />
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
            {csvResult && (
              <div className="bg-slate-700/50 rounded-lg p-3 text-sm">
                <div>Processed: {csvResult.processed}</div>
                <div>Errors: {csvResult.errors}</div>
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
              <input
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="Location hint"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
              />
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
            disabled={triggering}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-lg text-sm font-medium"
          >
            {triggering ? 'Running...' : 'Start Ingestion'}
          </button>
        </div>
      </div>
    </div>
  );
}
