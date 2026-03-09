import { scoreToHeatColor, urgencyToHeatColor } from '../utils/colors';

interface Props {
  mode?: 'sentiment' | 'urgency';
}

export default function HeatmapLegend({ mode = 'sentiment' }: Props) {
  const steps = 20;
  const gradient = Array.from({ length: steps }, (_, i) => {
    const t = i / (steps - 1);
    return mode === 'urgency'
      ? urgencyToHeatColor(t)
      : scoreToHeatColor(-1 + t * 2);
  });

  return (
    <div className="bg-slate-800/90 backdrop-blur rounded-xl px-4 py-3 border border-slate-700">
      <div className="text-xs text-slate-300 mb-2 font-semibold">
        {mode === 'urgency' ? 'Urgency Level' : 'Sentiment Score'}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-green-400 font-medium">
          {mode === 'urgency' ? 'Low' : 'Neg'}
        </span>
        <div className="flex-1 flex h-2.5 rounded-full overflow-hidden">
          {gradient.map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="text-xs text-red-400 font-medium">
          {mode === 'urgency' ? 'High' : 'Pos'}
        </span>
      </div>
    </div>
  );
}
