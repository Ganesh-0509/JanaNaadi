import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface Props {
  label: string;
  value: string | number;
  icon?: string;
  trend?: number; // positive = up, negative = down
  color?: string;
}

function useCountUp(end: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || end === 0) return;
    const start = 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, inView, duration]);

  return { value, ref };
}

export default function StatCard({ label, value, icon, trend, color }: Props) {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  const isNumeric = !isNaN(numericValue) && typeof value !== 'string';
  const { value: animatedValue, ref } = useCountUp(isNumeric ? numericValue : 0);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[#141B2D] rounded-2xl p-6 border border-white/5 mcd-glass hover:border-white/10 transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className="text-3xl font-bold" style={{ color }}>
        {isNumeric ? animatedValue.toLocaleString() : value}
      </div>
      {trend !== undefined && (
        <div className={`text-xs mt-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% from last period
        </div>
      )}
    </motion.div>
  );
}
