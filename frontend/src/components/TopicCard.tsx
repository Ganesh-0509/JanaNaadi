import { sentimentColor } from '../utils/colors';
import { motion } from 'framer-motion';

interface Props {
  topic: string;
  count: number;
  sentiment?: string;
  icon?: string;
  onClick?: () => void;
}

export default function TopicCard({ topic, count, sentiment, icon, onClick }: Props) {
  const color = sentiment ? sentimentColor(sentiment) : '#E76F2E';

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -4 }}
      className={`mcd-card p-4 transition-all group ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center gap-3 mb-3 relative z-10">
        <span className="text-2xl drop-shadow-md opacity-90">{icon || '📌'}</span>
        <h3 className="font-black text-sm text-white uppercase tracking-wide truncate">{topic}</h3>
      </div>
      <div className="flex items-center justify-between relative z-10">
        <span className="text-3xl font-black text-white">{count}</span>
        {sentiment && (
          <span
            className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg backdrop-blur-md"
            style={{ backgroundColor: `${color}30`, color, border: `1px solid ${color}40` }}
          >
            {sentiment}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2 relative z-10">
        <div className="text-[10px] font-bold text-content-muted uppercase tracking-widest">mentions</div>
        {onClick && <div className="text-[10px] font-black text-[#00E5FF] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest flex items-center gap-1">View <span className="text-lg leading-none">→</span></div>}
      </div>
    </motion.div>
  );
}
