import { scoreToHeatColor } from '../utils/colors';

export default function HeatmapLegend() {
  const steps = 20;
  const gradient = Array.from({ length: steps }, (_, i) => {
    const score = -1 + (i / (steps - 1)) * 2;
    return scoreToHeatColor(score);
  });

  return (
    <div className="bg-slate-800/90 backdrop-blur rounded-xl px-4 py-3 border border-slate-700">
      <div className="text-xs text-slate-300 mb-2 font-semibold">Sentiment Score</div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400 font-medium">Low</span>
        <div className="flex-1 flex h-2.5 rounded-full overflow-hidden">
          {gradient.map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="text-xs text-green-400 font-medium">High</span>
      </div>
    </div>
  );
}
