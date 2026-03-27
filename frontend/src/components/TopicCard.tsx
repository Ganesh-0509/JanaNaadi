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
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon || '📌'}</span>
        <h3 className="font-black text-sm text-[#3E2C23] uppercase tracking-wide truncate">{topic}</h3>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-3xl font-black text-[#3E2C23]">{count}</span>
        {sentiment && (
          <span
            className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {sentiment}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="text-[10px] font-bold text-[#6B5E57] uppercase tracking-widest">mentions</div>
        {onClick && <div className="text-[10px] font-black text-[#E76F2E] opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest flex items-center gap-1">View <span className="text-lg leading-none">→</span></div>}
      </div>
    </motion.div>
  );
}
