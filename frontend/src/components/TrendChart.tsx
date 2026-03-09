import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { SENTIMENT_COLORS } from '../utils/colors';

interface DataPoint {
  date: string;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  volume: number;
}

interface Props {
  data: DataPoint[];
  height?: number;
}

export default function TrendChart({ data, height = 300 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#f8fafc' }}
        />
        <Legend />
        <Line type="monotone" dataKey="positive_pct" name="Positive %" stroke={SENTIMENT_COLORS.positive} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="neutral_pct" name="Neutral %" stroke={SENTIMENT_COLORS.neutral} strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="negative_pct" name="Negative %" stroke={SENTIMENT_COLORS.negative} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
