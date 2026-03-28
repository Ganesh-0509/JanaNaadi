import { useFilters } from '../context/FilterContext';

const TIME_OPTIONS = ['24h', '7d', '30d'];
const TOPICS = [
  'Water Supply', 'Roads & Infrastructure', 'Healthcare', 'Education',
  'Corruption', 'Public Safety', 'Electricity', 'Sanitation',
  'Employment', 'Housing', 'Public Transport', 'Digital Services',
];
const SOURCES = ['twitter', 'news', 'reddit', 'citizen', 'survey', 'csv', 'manual'];
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'gu', name: 'Gujarati' },
];
const SENTIMENTS = ['positive', 'negative', 'neutral'];

interface Props {
  open?: boolean;
}

export default function FilterSidebar({ open = true }: Props) {
  const { filters, setFilters, resetFilters } = useFilters();

  const activeCount = [
    filters.topic,
    filters.source,
    filters.language,
    filters.sentiment,
    filters.timeRange !== '30d' ? filters.timeRange : null,
  ].filter(Boolean).length;

  if (!open) return null;

  return (
    <div className="w-64 flex-shrink-0 bg-[#080A0F]/80 backdrop-blur-xl border-r border-white/5 p-4 space-y-5 overflow-y-auto mcd-scrollbar selection:bg-[#E76F2E]/30 selection:text-white relative z-10 shadow-glass-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-sm text-white uppercase tracking-wide">Filters</h3>
          {activeCount > 0 && (
            <span className="bg-[#E76F2E] text-white text-xs font-black px-1.5 py-0.5 rounded-full leading-none shadow-glow">
              {activeCount}
            </span>
          )}
        </div>
        <button onClick={resetFilters} className="text-xs font-bold text-content-muted hover:text-[#00E5FF] transition-colors uppercase tracking-widest">
          Reset
        </button>
      </div>

      {/* Time Range */}
      <div>
        <label className="text-[10px] text-content-muted font-black uppercase tracking-widest block mb-2">Time Range</label>
        <div className="flex gap-1">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setFilters({ timeRange: t })}
              className={`flex-1 py-1.5 text-xs rounded-lg font-black transition-all ${
                filters.timeRange === t
                  ? 'bg-[#E76F2E] text-white shadow-glow'
                  : 'bg-surface-base/5 border border-white/10 text-content-muted hover:border-[#E76F2E]/50 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Topic */}
      <div>
        <label className="text-[10px] text-content-muted font-black uppercase tracking-widest block mb-2">Topic</label>
        <select
          value={filters.topic || ''}
          onChange={(e) => setFilters({ topic: e.target.value || null })}
          className="w-full bg-surface-base border border-white/10 rounded-lg px-3 py-2 text-sm text-content-primary font-medium outline-none focus:border-[#E76F2E] focus:ring-1 focus:ring-[#E76F2E]/20 transition-all shadow-glass"
        >
          <option value="">All Topics</option>
          {TOPICS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Source */}
      <div>
        <label className="text-[10px] text-content-muted font-black uppercase tracking-widest block mb-2">Source</label>
        <select
          value={filters.source || ''}
          onChange={(e) => setFilters({ source: e.target.value || null })}
          className="w-full bg-surface-base border border-white/10 rounded-lg px-3 py-2 text-sm text-content-primary font-medium outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/20 transition-all shadow-glass"
        >
          <option value="">All Sources</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Language */}
      <div>
        <label className="text-[10px] text-content-muted font-black uppercase tracking-widest block mb-2">Language</label>
        <select
          value={filters.language || ''}
          onChange={(e) => setFilters({ language: e.target.value || null })}
          className="w-full bg-surface-base border border-white/10 rounded-lg px-3 py-2 text-sm text-content-primary font-medium outline-none focus:border-[#E76F2E] focus:ring-1 focus:ring-[#E76F2E]/20 transition-all shadow-glass"
        >
          <option value="">All Languages</option>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Sentiment */}
      <div>
        <label className="text-[10px] text-content-muted font-black uppercase tracking-widest block mb-2">Sentiment</label>
        <select
          value={filters.sentiment || ''}
          onChange={(e) => setFilters({ sentiment: e.target.value || null })}
          className="w-full bg-surface-base border border-white/10 rounded-lg px-3 py-2 text-sm text-content-primary font-medium outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]/20 transition-all shadow-glass"
        >
          <option value="">All Sentiments</option>
          {SENTIMENTS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
