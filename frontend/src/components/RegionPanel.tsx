import { X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { SENTIMENT_COLORS } from '../utils/colors';
import { formatScore } from '../utils/formatters';
import { Link } from 'react-router-dom';

interface RegionData {
  id: number;
  name: string;
  avg_sentiment: number;
  volume: number;
  dominant_topic?: string;
  type?: string;
}

interface Props {
  region: RegionData | null;
  onClose: () => void;
}

export default function RegionPanel({ region, onClose }: Props) {
  if (!region) return null;

  // Mock distribution for panel display
  const pos = Math.round(Math.max(0, region.avg_sentiment + 1) * 50);
  const neg = Math.round(Math.max(0, -region.avg_sentiment + 1) * 25);
  const neu = Math.max(0, 100 - pos - neg);

  const pieData = [
    { name: 'Positive', value: pos, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: neu, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: neg, color: SENTIMENT_COLORS.negative },
  ];

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-slate-800 border-l border-slate-700 shadow-2xl z-[1000] overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="font-bold text-lg">{region.name}</h2>
        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-6">
        {/* Sentiment Score */}
        <div className="text-center">
          <div className="text-4xl font-bold" style={{
            color: region.avg_sentiment > 0.2
              ? SENTIMENT_COLORS.positive
              : region.avg_sentiment < -0.2
              ? SENTIMENT_COLORS.negative
              : SENTIMENT_COLORS.neutral,
          }}>
            {formatScore(region.avg_sentiment)}
          </div>
          <div className="text-sm text-slate-400">Sentiment Score</div>
        </div>

        {/* Pie Chart */}
        <div className="flex justify-center">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-700/50 rounded-lg p-2">
            <div className="text-green-400 font-bold">{pos}%</div>
            <div className="text-xs text-slate-400">Positive</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2">
            <div className="text-yellow-400 font-bold">{neu}%</div>
            <div className="text-xs text-slate-400">Neutral</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2">
            <div className="text-red-400 font-bold">{neg}%</div>
            <div className="text-xs text-slate-400">Negative</div>
          </div>
        </div>

        {/* Volume */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="text-sm text-slate-400">Total Voices</div>
          <div className="text-2xl font-bold">{region.volume.toLocaleString()}</div>
        </div>

        {/* Top Issue */}
        {region.dominant_topic && (
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-sm text-slate-400">Top Issue</div>
            <div className="text-lg font-semibold">{region.dominant_topic}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Link
            to={`/analysis/${region.type || 'constituency'}/${region.id}`}
            className="block w-full text-center py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors"
          >
            View Detailed Analysis
          </Link>
          <button className="w-full py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium text-sm">
            Generate AI Brief
          </button>
        </div>
      </div>
    </div>
  );
}
