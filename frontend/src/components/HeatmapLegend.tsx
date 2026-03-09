import { scoreToHeatColor } from '../utils/colors';

export default function HeatmapLegend() {
  const steps = 11;
  const gradient = Array.from({ length: steps }, (_, i) => {
    const score = -1 + (i / (steps - 1)) * 2;
    return scoreToHeatColor(score);
  });

  return (
    <div className="bg-slate-800/90 backdrop-blur rounded-xl p-3 border border-slate-700">
      <div className="text-xs text-slate-400 mb-2 font-medium">Sentiment Scale</div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-red-400">Negative</span>
        <div className="flex-1 flex h-3 rounded overflow-hidden">
          {gradient.map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span className="text-xs text-green-400">Positive</span>
      </div>
    </div>
  );
}
