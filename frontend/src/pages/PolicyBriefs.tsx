import { useState, useEffect } from 'react';
import { listBriefs, getBriefDetail, generateBrief } from '../api/admin';
import BriefViewer from '../components/BriefViewer';
import { formatDate } from '../utils/formatters';

interface BriefSummary {
  id: string;
  title: string;
  scope: string;
  scope_name: string;
  generated_at: string;
}

export default function PolicyBriefs() {
  const [briefs, setBriefs] = useState<BriefSummary[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Generate form state
  const [genScope, setGenScope] = useState('state');
  const [genScopeId, setGenScopeId] = useState('');

  useEffect(() => {
    loadBriefs();
  }, []);

  const loadBriefs = async () => {
    setLoading(true);
    try {
      const data = await listBriefs();
      setBriefs(data);
    } catch (e) {
      console.error('Failed to load briefs:', e);
    } finally {
      setLoading(false);
    }
  };

  const viewBrief = async (id: string) => {
    try {
      const data = await getBriefDetail(id);
      setSelectedBrief(data);
    } catch (e) {
      console.error('Failed to load brief:', e);
    }
  };

  const handleGenerate = async () => {
    if (!genScopeId) return;
    setGenerating(true);
    try {
      await generateBrief(genScope, Number(genScopeId));
      await loadBriefs();
    } catch (e) {
      console.error('Failed to generate brief:', e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Policy Briefs</h1>

      {/* Generate */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="font-bold mb-4">Generate New Brief</h2>
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Scope</label>
            <select
              value={genScope}
              onChange={(e) => setGenScope(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="state">State</option>
              <option value="district">District</option>
              <option value="constituency">Constituency</option>
              <option value="ward">Ward</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">ID</label>
            <input
              type="number"
              value={genScopeId}
              onChange={(e) => setGenScopeId(e.target.value)}
              placeholder="e.g. 1"
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-32"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? 'Generating...' : 'Generate Brief'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Brief List */}
        <div className="space-y-3">
          <h2 className="font-bold">Previous Briefs</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-slate-800 rounded-xl p-4 border border-slate-700 animate-pulse">
                  <div className="h-4 w-3/4 bg-slate-700/50 rounded" />
                  <div className="h-3 w-1/2 bg-slate-700/50 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : briefs.length === 0 ? (
            <div className="text-slate-400 text-sm">No briefs generated yet</div>
          ) : (
            briefs.map((b) => (
              <button
                key={b.id}
                onClick={() => viewBrief(b.id)}
                className={`w-full text-left bg-slate-800 rounded-xl p-4 border transition-colors ${
                  selectedBrief?.id === b.id ? 'border-blue-500' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="font-medium text-sm">{b.title}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {b.scope_name} • {formatDate(b.generated_at)}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Brief Detail */}
        <div className="md:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          {selectedBrief ? (
            <BriefViewer brief={selectedBrief} />
          ) : (
            <div className="text-center py-20 text-slate-400">
              Select a brief to view, or generate a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
