import { useState, useEffect } from 'react';
import { listBriefs, getBriefDetail, generateBrief, getDistricts, getConstituencies, getWards } from '../api/admin';
import { getStateRankings } from '../api/public';
import BriefViewer from '../components/BriefViewer';
import { formatDate } from '../utils/formatters';
import { Search, Printer } from 'lucide-react';

interface BriefSummary {
  id: string;
  title: string;
  scope: string;
  scope_name: string;
  generated_at: string;
}

interface GeoOption {
  id: number;
  name: string;
  type?: string;
}

export default function PolicyBriefs() {
  const [briefs, setBriefs] = useState<BriefSummary[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [states, setStates] = useState<GeoOption[]>([]);
  const [briefSearch, setBriefSearch] = useState('');

  // Generate form state — scope + cascading parent selectors
  const [genScope, setGenScope] = useState('state');
  const [genScopeId, setGenScopeId] = useState('');
  // cascade parents
  const [selStateId, setSelStateId] = useState('');
  const [selDistrictId, setSelDistrictId] = useState('');
  const [selConstId, setSelConstId] = useState('');
  // cascading options
  const [districts, setDistricts] = useState<GeoOption[]>([]);
  const [constituencies, setConstituencies] = useState<GeoOption[]>([]);
  const [wards, setWards] = useState<GeoOption[]>([]);
  // loading states for each level
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingConst, setLoadingConst] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  useEffect(() => {
    loadBriefs();
    getStateRankings().then((data: any[]) => {
      setStates(data.map((s: any) => ({ id: s.state_id, name: s.state })));
    }).catch(() => {});
  }, []);

  // When scope changes, reset all child selectors
  const changeScope = (scope: string) => {
    setGenScope(scope);
    setGenScopeId('');
    setSelStateId('');
    setSelDistrictId('');
    setSelConstId('');
    setDistricts([]);
    setConstituencies([]);
    setWards([]);
  };

  // Load districts when state is picked (for district/constituency/ward scopes)
  const handleStateSelect = async (stateId: string) => {
    setSelStateId(stateId);
    setSelDistrictId('');
    setSelConstId('');
    setGenScopeId('');
    setDistricts([]);
    setConstituencies([]);
    setWards([]);
    if (!stateId) return;
    setLoadingDistricts(true);
    try {
      const data = await getDistricts(Number(stateId));
      setDistricts(data);
    } finally {
      setLoadingDistricts(false);
    }
    // if scope is district, the state is just a filter — scope ID is set by district selection
    if (genScope === 'district') setGenScopeId('');
  };

  // Load constituencies when district is picked
  const handleDistrictSelect = async (districtId: string) => {
    setSelDistrictId(districtId);
    setSelConstId('');
    setGenScopeId('');
    setConstituencies([]);
    setWards([]);
    if (!districtId) return;
    if (genScope === 'district') {
      setGenScopeId(districtId);
      return;
    }
    setLoadingConst(true);
    try {
      const data = await getConstituencies(Number(districtId));
      setConstituencies(data);
    } finally {
      setLoadingConst(false);
    }
  };

  // Load wards when constituency is picked
  const handleConstSelect = async (constId: string) => {
    setSelConstId(constId);
    setGenScopeId('');
    setWards([]);
    if (!constId) return;
    if (genScope === 'constituency') {
      setGenScopeId(constId);
      return;
    }
    setLoadingWards(true);
    try {
      const data = await getWards(Number(constId));
      setWards(data);
    } finally {
      setLoadingWards(false);
    }
  };

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">AI Policy Briefs</h1>
        {selectedBrief && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium border border-slate-600"
          >
            <Printer size={14} /> Export PDF
          </button>
        )}
      </div>

      {/* Generate */}
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="font-bold mb-4">Generate New Brief</h2>
        <div className="flex flex-wrap gap-3 items-end">
          {/* Scope type */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Scope</label>
            <select
              value={genScope}
              onChange={(e) => changeScope(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="state">State</option>
              <option value="district">District</option>
              <option value="constituency">Constituency</option>
              <option value="ward">Ward</option>
            </select>
          </div>

          {/* State dropdown — always the first selector */}
          {genScope === 'state' ? (
            <div>
              <label className="text-xs text-slate-400 block mb-1">State</label>
              <select
                value={genScopeId}
                onChange={(e) => setGenScopeId(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-48"
              >
                <option value="">Select state…</option>
                {states.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              {/* State filter for district/constituency/ward */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">State</label>
                <select
                  value={selStateId}
                  onChange={(e) => handleStateSelect(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-40"
                >
                  <option value="">Select state…</option>
                  {states.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* District dropdown */}
              {selStateId && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {loadingDistricts ? 'Loading…' : 'District'}
                  </label>
                  <select
                    value={genScope === 'district' ? genScopeId : selDistrictId}
                    onChange={(e) => handleDistrictSelect(e.target.value)}
                    disabled={loadingDistricts || districts.length === 0}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-44 disabled:opacity-50"
                  >
                    <option value="">
                      {districts.length === 0 ? 'No districts found' : 'Select district…'}
                    </option>
                    {districts.map((d) => (
                      <option key={d.id} value={String(d.id)}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Constituency dropdown */}
              {(genScope === 'constituency' || genScope === 'ward') && selDistrictId && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {loadingConst ? 'Loading…' : 'Constituency'}
                  </label>
                  <select
                    value={genScope === 'constituency' ? genScopeId : selConstId}
                    onChange={(e) => handleConstSelect(e.target.value)}
                    disabled={loadingConst || constituencies.length === 0}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-44 disabled:opacity-50"
                  >
                    <option value="">
                      {constituencies.length === 0 ? 'No constituencies found' : 'Select constituency…'}
                    </option>
                    {constituencies.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}{c.type ? ` (${c.type})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ward dropdown */}
              {genScope === 'ward' && selConstId && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    {loadingWards ? 'Loading…' : 'Ward'}
                  </label>
                  <select
                    value={genScopeId}
                    onChange={(e) => setGenScopeId(e.target.value)}
                    disabled={loadingWards || wards.length === 0}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm w-44 disabled:opacity-50"
                  >
                    <option value="">
                      {wards.length === 0 ? 'No wards found' : 'Select ward…'}
                    </option>
                    {wards.map((w) => (
                      <option key={w.id} value={String(w.id)}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !genScopeId}
            className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? 'Generating…' : 'Generate Brief'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Brief List */}
        <div className="space-y-3">
          <h2 className="font-bold">Previous Briefs</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={briefSearch}
              onChange={(e) => setBriefSearch(e.target.value)}
              placeholder="Search briefs…"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
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
            briefs
              .filter((b) =>
                !briefSearch ||
                b.title.toLowerCase().includes(briefSearch.toLowerCase()) ||
                (b.scope_name || '').toLowerCase().includes(briefSearch.toLowerCase())
              )
              .map((b) => (
              <button
                key={b.id}
                onClick={() => viewBrief(b.id)}
                className={`w-full text-left bg-slate-800 rounded-xl p-4 border transition-colors ${
                  selectedBrief?.id === b.id ? 'border-blue-500' : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="font-medium text-sm">{b.title}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {b.scope_name || b.scope} • {formatDate(b.generated_at)}
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
