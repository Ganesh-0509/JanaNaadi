import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X, Loader2, Sparkles } from 'lucide-react';
import { searchEntries, summarizeSearch } from '../api/analysis';
import { formatRelative } from '../utils/formatters';
import { useSearchParams } from 'react-router-dom';
import { useFilters } from '../context/FilterContext';
import { type PulseEntry } from '../types/api';

interface Summary {
  summary: string;
  key_themes: string[];
  sentiment_analysis: string;
  sentiment_overview: string;
  entry_count: number;
  sentiment_distribution: { positive: number; neutral: number; negative: number };
}

const SENTIMENT_BORDER: Record<string, string> = {
  positive: 'border-emerald-500/20',
  negative: 'border-red-500/20',
  neutral: 'border-white/15',
};
const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-emerald-500/10 text-emerald-600',
  negative: 'bg-red-500/10 text-red-600',
  neutral: 'bg-surface-base text-content-secondary',
};

const PAGE_SIZE = 30;

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const { filters } = useFilters();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [sentiment, setSentiment] = useState('');
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState('');
  const [results, setResults] = useState<PulseEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searched, setSearched] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const doSummarize = async () => {
    if (!query.trim()) return;
    setSummarizing(true);
    try {
      const result = await summarizeSearch(query.trim(), 100);
      setSummary(result);
    } catch (e) {
      console.error('Summarize error:', e);
    } finally {
      setSummarizing(false);
    }
  };

  const doSearch = useCallback(async (reset = true) => {
    setLoading(true);
    const newOffset = reset ? 0 : offset;
    try {
      const params: Record<string, string | number> = {
        limit: PAGE_SIZE,
        offset: newOffset,
      };
      if (query.trim()) params.q = query.trim();
      if (sentiment) params.sentiment = sentiment;
      if (source) params.source = source;
      if (language) params.language = language;
      if (filters.timeRange !== '24h') params.time_range = filters.timeRange;

      const data: PulseEntry[] = await searchEntries(params);
      if (reset) {
        setResults(data);
        setOffset(PAGE_SIZE);
      } else {
        setResults((prev) => [...prev, ...data]);
        setOffset(newOffset + PAGE_SIZE);
      }
      setHasMore(data.length === PAGE_SIZE);
      setSearched(true);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, [query, sentiment, source, language, offset, filters.timeRange]);

  // Re-search when global timeRange filter changes
  useEffect(() => {
    if (searched) {
      doSearch(true);
    }
  }, [filters.timeRange, searched, doSearch]);

  // Auto-search when navigated here with ?q= URL param
  useEffect(() => {
    const initialQ = searchParams.get('q');
    if (!initialQ) return;
    setLoading(true);
    searchEntries({ q: initialQ, limit: PAGE_SIZE, offset: 0, time_range: filters.timeRange !== '24h' ? filters.timeRange : undefined })
      .then((data: PulseEntry[]) => {
        setResults(data);
        setOffset(PAGE_SIZE);
        setHasMore(data.length === PAGE_SIZE);
        setSearched(true);
      })
      .catch((e) => console.error('Auto-search error:', e))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = () => {
    setSentiment('');
    setSource('');
    setLanguage('');
  };

  const activeFilterCount = [sentiment, source, language].filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-6 space-y-12 bg-surface-base min-h-screen"
    >
      {/* Header — Light Mode */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-4">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-saffron flex items-center justify-center text-white mcd-glow-saffron shadow-lg relative italic">
            <Search size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight leading-none italic text-content-primary">
              INTELLIGENCE <span className="text-[#E76F2E]">SEARCH</span>
            </h1>
            <p className="text-[10px] font-bold text-content-secondary uppercase tracking-[0.25em] mt-2 italic">
              Audit all ingested citizen voices across 250 Delhi MCD Wards
            </p>
          </div>
        </div>
      </div>

      {/* Search bar console — Light Mode */}
      <div className="bg-surface-base/50 border border-white/10 relative overflow-hidden flex flex-col md:flex-row gap-4 items-stretch p-4 rounded-[28px] shadow-sm">
        <div className="relative flex-1 group/input">
          <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-content-secondary/60 group-focus-within/input:text-[#E76F2E] transition-colors" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch(true)}
            placeholder="SEARCH VOICES, KEYWORDS, TOPICS…"
            className="w-full bg-surface-base border-2 border-white/10 rounded-xl pl-14 pr-10 py-4 text-xs text-content-primary placeholder-slate-200 focus:outline-none focus:border-[#E76F2E]/30 transition-all font-black uppercase tracking-widest italic"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-content-secondary/60 hover:text-content-primary transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`flex items-center gap-3 px-6 py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all italic ${
            showFilters || activeFilterCount > 0
              ? 'bg-[#E76F2E]/10 border-[#E76F2E]/30 text-[#E76F2E] shadow-sm'
              : 'bg-surface-base border-white/10 text-content-secondary hover:bg-surface-base hover:text-content-primary'
          }`}
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-[#E76F2E] text-white text-[8px] rounded-md px-1.5 py-0.5 mcd-glow-saffron">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={() => doSearch(true)}
          disabled={loading}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-saffron hover:scale-[1.02] disabled:opacity-30 disabled:scale-100 rounded-xl text-[10px] font-black text-white mcd-glow-saffron transition-all shadow-sm uppercase tracking-widest italic"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          SEARCH
        </button>

        {query.trim() && results.length > 0 && (
          <button
            onClick={doSummarize}
            disabled={summarizing}
            className="flex items-center gap-3 px-8 py-4 bg-surface-base hover:bg-surface-base text-content-secondary border border-white/15 rounded-xl text-[10px] font-black transition-all shadow-sm uppercase tracking-widest italic"
          >
            {summarizing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} className="text-[#E76F2E]" />}
            AI SYNC
          </button>
        )}
      </div>

      {showFilters && (
        <div className="bg-surface-base/50 border border-white/10 rounded-[32px] p-8 -mt-8 flex flex-wrap gap-6 items-end italic shadow-sm">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[9px] font-black text-content-secondary uppercase tracking-widest block mb-3 pl-1">Sentiment Filter</label>
            <select value={sentiment} onChange={e => setSentiment(e.target.value)} className="w-full bg-surface-base border-2 border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-content-primary focus:outline-none focus:border-[#E76F2E]/30">
              <option value="">All Emotional Signals</option>
              <option value="positive">Positive Only</option>
              <option value="negative">Negative Only</option>
              <option value="neutral">Neutral Hubs</option>
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[9px] font-black text-content-secondary uppercase tracking-widest block mb-3 pl-1">Data Source</label>
            <select value={source} onChange={e => setSource(e.target.value)} className="w-full bg-surface-base border-2 border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-content-primary focus:outline-none focus:border-[#E76F2E]/30">
              <option value="">All Sync Channels</option>
              <option value="twitter">X (Twitter)</option>
              <option value="grievance">Portal Data</option>
              <option value="whatsapp">Support Logs</option>
            </select>
          </div>
          <button onClick={clearFilters} className="px-6 py-3.5 text-[9px] font-black text-content-secondary uppercase tracking-widest hover:text-red-500 transition-colors">Clear Matrix</button>
        </div>
      )}

      {/* Results summary bar — Light Mode */}
      {searched && !loading && (
        <div className="flex items-center gap-4 px-6 italic">
           <div className="w-1.5 h-1.5 rounded-full bg-[#E76F2E] shadow-[0_0_8px_rgba(255,153,51,0.5)]" />
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-content-secondary">
             {results.length === 0 ? 'No records detected' : `Intelligence Matrix: Loaded ${results.length} unique ward signals`}
           </p>
        </div>
      )}

      {/* Result cards - Waterfall Grid — Light Mode */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {results.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-surface-base rounded-[32px] p-8 border hover:shadow-xl transition-all group relative overflow-hidden shadow-sm ${entry.sentiment === 'positive' ? 'border-emerald-100' : entry.sentiment === 'negative' ? 'border-red-100' : 'border-white/10'}`}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 rounded-full transition-all group-hover:opacity-20 ${entry.sentiment === 'positive' ? 'bg-emerald-500' : entry.sentiment === 'negative' ? 'bg-red-500' : 'bg-slate-300'}`} />
            
            <p className="text-lg text-content-primary leading-[1.6] font-medium mb-8 italic relative z-10 antialiased">
              "{entry.text}"
            </p>
            <div className="flex flex-wrap items-center gap-3 relative z-10">
              <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${
                entry.sentiment === 'positive' ? 'bg-emerald-50/50 text-emerald-600 border border-emerald-100' : 
                entry.sentiment === 'negative' ? 'bg-red-50/50 text-red-600 border border-red-100' : 'bg-surface-base text-content-secondary border border-white/10'
              }`}>
                {entry.sentiment}
              </span>
              <span className={`font-black font-mono text-xs ${
                entry.sentiment_score > 0 ? 'text-emerald-500' : entry.sentiment_score < 0 ? 'text-red-500' : 'text-yellow-500'
              }`}>
                {entry.sentiment_score > 0 ? '+' : ''}{(entry.sentiment_score ?? 0).toFixed(4)}
              </span>
              
              <div className="flex items-center gap-2 ml-2">
                {entry.topic && (
                  <span className="px-3 py-1 rounded-lg bg-surface-base text-content-secondary text-[9px] font-black uppercase tracking-widest border border-white/10 italic">{entry.topic}</span>
                )}
                {entry.state && (
                  <span className="px-3 py-1 rounded-lg bg-[#E76F2E]/5 text-[#E76F2E] text-[9px] font-black uppercase tracking-widest border border-[#E76F2E]/10 italic">MCD: {entry.state}</span>
                )}
              </div>

              <div className="ml-auto flex items-center gap-4 italic opacity-80">
                 <span className="text-[9px] font-black text-content-secondary/60 uppercase tracking-widest">{entry.source}</span>
                 <span className="text-[9px] font-black text-content-secondary/60 uppercase tracking-widest border-l border-white/10 pl-4">{formatRelative(entry.ingested_at || '')}</span>
              </div>
            </div>
          </motion.div>
        ))}
        {searched && results.length === 0 && !loading && (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-white/10 rounded-[40px] italic">
            <p className="text-content-secondary/60 font-black uppercase tracking-[0.4em]">No records sync detected in specified signal range</p>
          </div>
        )}
      </div>

      {/* Load more — Light Mode */}
      {hasMore && (
        <div className="flex justify-center pt-8">
          <button
            onClick={() => doSearch(false)}
            disabled={loading}
            className="flex items-center gap-3 px-10 py-5 bg-surface-base border border-white/15 hover:border-[#E76F2E]/50 text-content-secondary hover:text-content-primary rounded-2xl text-base font-black transition-all shadow-sm italic"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            LOAD MORE RECORDS
          </button>
        </div>
      )}
    </motion.div>
  );
}
