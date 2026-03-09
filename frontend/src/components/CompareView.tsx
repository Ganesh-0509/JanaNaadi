import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatScore } from '../utils/formatters';

interface CompareItem {
  id: number;
  name: string;
  avg_sentiment: number;
  top_issue: string | null;
  volume: number;
}

interface Props {
  items: CompareItem[];
}

export default function CompareView({ items }: Props) {
  const chartData = items.map((item) => ({
    name: item.name,
    sentiment: item.avg_sentiment,
    volume: item.volume,
  }));

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          />
          <Bar dataKey="sentiment" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">{item.name}</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Sentiment</span>
                <span>{formatScore(item.avg_sentiment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Volume</span>
                <span>{item.volume.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Top Issue</span>
                <span>{item.top_issue || '—'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
