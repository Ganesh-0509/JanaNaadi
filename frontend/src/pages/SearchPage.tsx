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
  neutral: 'border-slate-700',
};
const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-emerald-500/20 text-emerald-400',
  negative: 'bg-red-500/20 text-red-400',
  neutral: 'bg-slate-600/30 text-slate-400',
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
  }, [query, sentiment, source, language, offset]);

  // Re-search when global timeRange filter changes
  useEffect(() => {
    if (searched) {
      doSearch(true);
    }
  }, [filters.timeRange]);

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
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search size={24} className="text-blue-400" />
          Global Search
        </h1>
        <p className="text-sm text-slate-400">Search all ingested voices with full-text + filter support</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch(true)}
            placeholder="Search voices, keywords, topics…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters((p) => !p)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={() => doSearch(true)}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-xl text-sm font-medium"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Search
        </button>

        {query.trim() && results.length > 0 && (
          <button
            onClick={doSummarize}
            disabled={summarizing}
            className="flex items-center gap-2 px-5 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded-xl text-sm font-medium"
          >
            {summarizing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            AI Summary
          </button>
        )}
      </div>

      {/* AI Summary Card */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-purple-900/40 to-slate-800 rounded-xl border border-purple-500/30 p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-400" />
              <h3 className="font-bold text-purple-200">AI Summary</h3>
            </div>
            <button onClick={() => setSummary(null)} className="text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed mb-3">{summary.summary}</p>
          {summary.key_themes.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-400 mb-1.5">Key Themes</p>
              <div className="flex flex-wrap gap-2">
                {summary.key_themes.map((theme, i) => (
                  <span key={i} className="px-2.5 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
          {summary.sentiment_analysis && (
            <div className="mb-3">
              <p className="text-xs text-slate-400 mb-1">Sentiment Analysis</p>
              <p className="text-xs text-slate-300">{summary.sentiment_analysis}</p>
            </div>
          )}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>{summary.entry_count} voices analyzed</span>
            <span className={`font-medium ${
              summary.sentiment_overview === 'positive' ? 'text-emerald-400' :
              summary.sentiment_overview === 'negative' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              Overall: {summary.sentiment_overview}
            </span>
            <span>
              {summary.sentiment_distribution.positive}+ / {summary.sentiment_distribution.neutral}~ / {summary.sentiment_distribution.negative}−
            </span>
          </div>
        </motion.div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sentiment</label>
              <select
                value={sentiment}
                onChange={(e) => setSentiment(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Any</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Any</option>
                <option value="twitter">Twitter</option>
                <option value="news">News</option>
                <option value="reddit">Reddit</option>
                <option value="citizen">Citizen</option>
                <option value="survey">Survey</option>
                <option value="csv">CSV Upload</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Any</option>
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="bn">Bengali</option>
                <option value="mr">Marathi</option>
                <option value="kn">Kannada</option>
                <option value="ml">Malayalam</option>
                <option value="gu">Gujarati</option>
              </select>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <X size={12} /> Clear all filters
            </button>
          )}
        </motion.div>
      )}

      {/* Results count */}
      {searched && !loading && (
        <p className="text-sm text-slate-400">
          {results.length === 0 ? 'No results found' : `Showing ${results.length} result${results.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Initial empty state */}
      {!searched && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
          <Search size={48} className="opacity-20" />
          <p className="text-sm">Enter a query to search across all ingested voices</p>
          <p className="text-xs text-slate-700">Supports full-text search + sentiment, source, language filters</p>
        </div>
      )}

      {/* Result cards */}
      <div className="space-y-3">
        {results.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-slate-800 rounded-xl p-4 border ${SENTIMENT_BORDER[entry.sentiment] ?? 'border-slate-700'}`}
          >
            <p className="text-sm text-slate-200 leading-relaxed mb-2">
              {entry.text}
            </p>
            <div className="flex items-center flex-wrap gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-full font-medium ${SENTIMENT_BADGE[entry.sentiment] ?? ''}`}>
                {entry.sentiment}
              </span>
              <span className={`font-mono ${
                entry.sentiment_score > 0 ? 'text-emerald-400' : entry.sentiment_score < 0 ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {entry.sentiment_score > 0 ? '+' : ''}{(entry.sentiment_score ?? 0).toFixed(3)}
              </span>
              {entry.topic && (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">{entry.topic}</span>
              )}
              {entry.state && (
                <span className="px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">{entry.state}</span>
              )}
              {entry.source && (
                entry.source_url ? (
                  <a
                    href={entry.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 capitalize hover:bg-purple-500/25 transition-colors"
                    title="View original source"
                  >
                    {entry.source} ↗
                  </a>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 capitalize">{entry.source}</span>
                )
              )}
              {entry.language && (
                <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-500 uppercase">{entry.language}</span>
              )}
              {entry.ingested_at && (
                <span className="ml-auto text-slate-600">{formatRelative(entry.ingested_at)}</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => doSearch(false)}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            Load more
          </button>
        </div>
      )}
    </motion.div>
  );
}
