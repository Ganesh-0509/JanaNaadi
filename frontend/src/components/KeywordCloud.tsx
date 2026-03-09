interface Keyword {
  keyword: string;
  count: number;
}

interface Props {
  keywords: Keyword[];
}

const TAG_COLORS = [
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
];

export default function KeywordCloud({ keywords }: Props) {
  if (!keywords.length) {
    return <p className="text-slate-500 text-sm text-center py-4">No keywords yet</p>;
  }

  const maxCount = keywords[0]?.count || 1;

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((kw, i) => {
        // Font size proportional to frequency: 11px – 24px
        const ratio = kw.count / maxCount;
        const fontSize = Math.round(11 + ratio * 13);
        const colorClass = TAG_COLORS[i % TAG_COLORS.length];
        return (
          <span
            key={kw.keyword}
            title={`${kw.count} mentions`}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border cursor-default transition-transform hover:scale-105 ${colorClass}`}
            style={{ fontSize }}
          >
            {kw.keyword}
            <sup className="text-[9px] opacity-70">{kw.count}</sup>
          </span>
        );
      })}
    </div>
  );
}
