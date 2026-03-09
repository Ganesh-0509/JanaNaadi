interface Props {
  label: string;
  value: string | number;
  icon?: string;
  trend?: number; // positive = up, negative = down
  color?: string;
}

export default function StatCard({ label, value, icon, trend, color }: Props) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className="text-3xl font-bold" style={{ color }}>
        {value}
      </div>
      {trend !== undefined && (
        <div className={`text-xs mt-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% from last period
        </div>
      )}
    </div>
  );
}
