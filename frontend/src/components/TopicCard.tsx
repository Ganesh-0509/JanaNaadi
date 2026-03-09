import { sentimentColor } from '../utils/colors';

interface Props {
  topic: string;
  count: number;
  sentiment?: string;
  icon?: string;
  onClick?: () => void;
}

export default function TopicCard({ topic, count, sentiment, icon, onClick }: Props) {
  const color = sentiment ? sentimentColor(sentiment) : '#3b82f6';

  return (
    <div
      onClick={onClick}
      className={`bg-slate-800 rounded-xl p-4 border border-slate-700 transition-colors ${
        onClick ? 'hover:border-blue-500/50 hover:bg-slate-700/60 cursor-pointer active:scale-95' : 'hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xl">{icon || '📌'}</span>
        <h3 className="font-semibold text-sm">{topic}</h3>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-2xl font-bold">{count}</span>
        {sentiment && (
          <span
            className="text-xs font-medium px-2 py-1 rounded-full"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {sentiment}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="text-xs text-slate-400">mentions</div>
        {onClick && <div className="text-xs text-blue-400 opacity-0 group-hover:opacity-100">View →</div>}
      </div>
    </div>
  );
}
