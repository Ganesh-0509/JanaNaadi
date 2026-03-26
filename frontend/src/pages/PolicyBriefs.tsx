import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { listBriefs, getBriefDetail, generateBrief, getDistricts, getConstituencies, getWards } from '../api/admin';
import { getStateRankings } from '../api/public';
import BriefViewer from '../components/BriefViewer';
import { formatDate } from '../utils/formatters';
import { Search, Printer, FileText, Sparkles, ChevronRight, Activity, Zap, Layers } from 'lucide-react';
import { type BriefSummary, type GeoOption } from '../types/api';

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
    if (genScope === 'district') setGenScopeId('');
  };

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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-12 bg-[#F5E9D8] min-h-screen"
    >
      {/* 🏙️ HEADER — MCD BRIEF CORE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-[24px] bg-gradient-saffron flex items-center justify-center text-white mcd-glow-saffron shadow-2xl relative">
            <FileText size={32} />
          </div>
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter leading-none italic">
              STRATEGIC <span className="text-[#E76F2E]">BRIEFS</span>
            </h1>
            <p className="text-[11px] font-black text-[#6B5E57] uppercase tracking-[0.4em] mt-3 italic">
              MCD Municipal Intelligence & Policy Extraction
            </p>
          </div>
        </div>
        
        {selectedBrief && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-[#E76F2E] uppercase tracking-widest transition-all border border-white/5"
          >
            <Printer size={16} /> Export Intelligence PDF
          </button>
        )}
      </div>

      {/* 🕹️ GENERATOR CONSOLE */}
      <div className="mcd-card border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
           <Sparkles size={200} className="text-white" />
        </div>
        
        <h2 className="text-xl font-black uppercase tracking-tighter mb-10 italic text-white/40 flex items-center gap-4">
          <Zap size={20} className="text-[#E76F2E]" />
          INITIALIZE <span className="text-[#E76F2E]">AI GENERATION</span>
        </h2>
        
        <div className="relative z-10 flex flex-wrap gap-10 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-black text-[#6B5E57] uppercase tracking-[0.2em] block mb-4 ml-1">Intelligence Scope</label>
            <select
              value={genScope}
              onChange={(e) => changeScope(e.target.value)}
              className="w-full bg-[#F5E9D8] border-2 border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black uppercase focus:border-[#E76F2E]/40 transition-all appearance-none cursor-pointer"
            >
              <option value="state">Global Ward Matrix</option>
              <option value="district">MCD Zone</option>
              <option value="constituency">AC Sector</option>
              <option value="ward">Target Ward</option>
            </select>
          </div>

          {genScope === 'state' ? (
            <div className="flex-1 min-w-[240px]">
              <label className="text-[10px] font-black text-[#6B5E57] uppercase tracking-[0.2em] block mb-4 ml-1">Target Entity</label>
              <select
                value={genScopeId}
                onChange={(e) => setGenScopeId(e.target.value)}
                className="w-full bg-[#F5E9D8] border-2 border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black uppercase focus:border-[#E76F2E]/40 transition-all appearance-none cursor-pointer"
              >
                <option value="">Select Platform Entity…</option>
                {states.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-black text-[#6B5E57] uppercase tracking-[0.2em] block mb-4 ml-1">Sync MCD Area</label>
                <select
                  value={selStateId}
                  onChange={(e) => handleStateSelect(e.target.value)}
                  className="w-full bg-[#F5E9D8] border-2 border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black uppercase focus:border-[#E76F2E]/40 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select Platform Area…</option>
                  {states.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>

              {selStateId && (
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] font-black text-[#6B5E57] uppercase tracking-[0.2em] block mb-4 ml-1">
                    {loadingDistricts ? 'Syncing Districts…' : 'Sync District'}
                  </label>
                  <select
                    value={genScope === 'district' ? genScopeId : selDistrictId}
                    onChange={(e) => handleDistrictSelect(e.target.value)}
                    disabled={loadingDistricts || districts.length === 0}
                    className="w-full bg-[#F5E9D8] border-2 border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black uppercase focus:border-[#E76F2E]/40 transition-all appearance-none cursor-pointer disabled:opacity-30"
                  >
                    <option value="">{districts.length === 0 ? 'No districts found' : 'Select target district…'}</option>
                    {districts.map((d) => (
                      <option key={d.id} value={String(d.id)}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Constituency dropdown */}
              {(genScope === 'constituency' || genScope === 'ward') && selDistrictId && (
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] font-black text-[#6B5E57] uppercase tracking-[0.2em] block mb-4 ml-1">
                    {loadingConst ? 'Syncing ACs…' : 'Sync AC'}
                  </label>
                  <select
                    value={genScope === 'constituency' ? genScopeId : selConstId}
                    onChange={(e) => handleConstSelect(e.target.value)}
                    disabled={loadingConst || constituencies.length === 0}
                    className="w-full bg-[#F5E9D8] border-2 border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black uppercase focus:border-[#E76F2E]/40 transition-all appearance-none cursor-pointer disabled:opacity-30"
                  >
                    <option value="">{constituencies.length === 0 ? 'No ACs detected' : 'Select target AC…'}</option>
                    {constituencies.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ward dropdown */}
              {genScope === 'ward' && selConstId && (
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] font-black text-[#6B5E57] uppercase tracking-[0.2em] block mb-4 ml-1">
                    {loadingWards ? 'Syncing Wards…' : 'Sync Ward'}
                  </label>
                  <select
                    value={genScopeId}
                    onChange={(e) => setGenScopeId(e.target.value)}
                    disabled={loadingWards || wards.length === 0}
                    className="w-full bg-[#F5E9D8] border-2 border-white/5 rounded-2xl px-6 py-4 text-sm text-white font-black uppercase focus:border-[#E76F2E]/40 transition-all appearance-none cursor-pointer disabled:opacity-30"
                  >
                    <option value="">{wards.length === 0 ? 'No wards found' : 'Select target ward…'}</option>
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
            className="px-12 py-5 bg-gradient-saffron hover:scale-105 disabled:opacity-30 disabled:scale-100 rounded-2xl text-lg font-black text-white mcd-glow-saffron transition-all shadow-2xl uppercase tracking-tighter flex items-center gap-4"
          >
            {generating ? <Activity size={24} className="animate-spin" /> : <Sparkles size={24} />}
            {generating ? 'GENERATING...' : 'GENERATE BRIEF'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Brief List Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <div className="mcd-card border-white/5 bg-[#161B2E]/50">
            <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic text-white/40 flex items-center gap-4">
              <Layers size={20} className="text-blue-500" />
               VALULT <span className="text-[#E76F2E]">LOGS</span>
            </h3>
            
            <div className="relative mb-8 group">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B5E57] group-focus-within:text-[#E76F2E] transition-colors" />
              <input
                value={briefSearch}
                onChange={(e) => setBriefSearch(e.target.value)}
                placeholder="Search vault sync…"
                className="w-full bg-[#F5E9D8] border-2 border-white/5 rounded-xl pl-12 pr-4 py-3 text-[10px] text-white font-black uppercase focus:border-[#E76F2E]/40 transition-all placeholder-slate-800"
              />
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
                   <Activity size={32} className="text-white animate-pulse" />
                   <p className="text-[8px] font-black uppercase tracking-widest text-white">Syncing Logs...</p>
                </div>
              ) : briefs.length === 0 ? (
                <div className="text-slate-700 text-[10px] font-black uppercase tracking-widest p-10 text-center">No logs detected</div>
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
                    className={`w-full text-left rounded-2xl p-6 transition-all border group ${
                      selectedBrief?.id === b.id 
                        ? 'bg-[#E76F2E]/15 border-[#E76F2E]/40 shadow-xl' 
                        : 'bg-[#F5E9D8] border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="font-black text-sm uppercase tracking-tight text-white mb-2 group-hover:translate-x-1 transition-transform">{b.title}</div>
                    <div className="text-[9px] font-black text-[#6B5E57] uppercase tracking-widest flex items-center gap-2">
                       <span className="text-[#E76F2E]">{b.scope_name || b.scope}</span> 
                       <span className="text-white/10">|</span> 
                       {formatDate(b.generated_at)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Brief Detail Main Viewer */}
        <div className="lg:col-span-3">
          {selectedBrief ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="mcd-card border-[#E76F2E]/10 bg-[#161B2E]/30 min-h-[600px] overflow-hidden">
               <BriefViewer brief={selectedBrief} />
            </motion.div>
          ) : (
            <div className="mcd-glass rounded-[60px] border border-white/5 border-dashed p-60 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-white/[0.01] pointer-events-none" />
              <FileText size={100} className="mx-auto text-[#3E2C23] mb-10 opacity-30" />
              <p className="text-[#6B5E57] font-black uppercase tracking-[0.6em] text-[10px]">Select intelligence brief to visualize or initialize generation sequence</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
