import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { SENTIMENT_COLORS } from '../utils/colors';

interface Props {
  positive: number;
  negative: number;
  neutral: number;
  size?: number;
}

export default function SentimentGauge({ positive, negative, neutral, size = 200 }: Props) {
  const total = positive + negative + neutral || 1;
  const data = [
    { name: 'Positive', value: positive, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: neutral, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: negative, color: SENTIMENT_COLORS.negative },
  ];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="85%"
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold">{((positive / total) * 100).toFixed(0)}%</div>
        <div className="text-xs text-[#6B5E57]">Positive</div>
      </div>
    </div>
  );
}
