import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface Props {
  label: string;
  value: string | number;
  icon?: string;
  trend?: number;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
}

const colorMap: Record<string, string> = {
  primary: 'text-primary-700',
  secondary: 'text-secondary-700',
  accent: 'text-accent-700',
  success: 'text-state-success',
  warning: 'text-state-warning',
  danger: 'text-state-danger',
  info: 'text-state-info',
};

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
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, inView, duration]);

  return { value, ref };
}

export default function StatCard({ label, value, icon, trend, color }: Props) {
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  const isNumeric = !isNaN(numericValue);
  const { value: animatedValue, ref } = useCountUp(isNumeric ? numericValue : 0);
  const displayColor = color ? colorMap[color] : 'text-content-primary';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mcd-card !p-6"
    >
      <div className="mb-3 flex items-center justify-between relative z-10">
        <span className="text-sm font-semibold text-content-muted">{label}</span>
        {icon && <span className="text-2xl opacity-80">{icon}</span>}
      </div>
      <div className={`text-3xl font-bold tracking-tight relative z-10 ${displayColor}`}>
        {isNumeric ? animatedValue.toLocaleString() : value}
      </div>
      {trend !== undefined && (
        <div className={`mt-2 text-xs font-semibold ${trend >= 0 ? 'text-state-success' : 'text-state-danger'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% from last period
        </div>
      )}
    </motion.div>
  );
}
