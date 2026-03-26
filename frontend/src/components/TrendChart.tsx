import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Area, ReferenceLine,
} from 'recharts';
import { SENTIMENT_COLORS } from '../utils/colors';
import type { ForecastPoint } from '../api/analysis';

// Custom dot renderer for forecast points — glowing purple circles
const ForecastDot = (props: any) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#818cf8" fillOpacity={0.2} />
      <circle cx={cx} cy={cy} r={3.5} fill="#818cf8" />
    </g>
  );
};

interface DataPoint {
  date: string;
  positive_pct: number;
  negative_pct: number;
  neutral_pct: number;
  volume: number;
}

// Merged data point used internally when forecast is present
interface MergedPoint {
  date: string;
  positive_pct?: number;
  negative_pct?: number;
  neutral_pct?: number;
  volume?: number;
  forecast_score?: number;
  upper?: number;
  lower?: number;
  is_forecast?: boolean;
}

interface Props {
  data: DataPoint[];
  forecastData?: ForecastPoint[];
  height?: number;
}

export default function TrendChart({ data, forecastData, height = 300 }: Props) {
  const merged: MergedPoint[] = [...data];

  if (forecastData && forecastData.length > 0) {
    // Scale forecast_score from [-1,1] to [0,100] so it sits on the same axis as pct values
    forecastData.forEach((f) => {
      merged.push({
        date: f.date,
        forecast_score: Math.round(((f.forecast_score + 1) / 2) * 100),
        upper: Math.round(((f.upper + 1) / 2) * 100),
        lower: Math.round(((f.lower + 1) / 2) * 100),
        is_forecast: true,
      });
    });
  }

  const showForecast = forecastData && forecastData.length > 0;
  // Find the date where forecast starts (first is_forecast point)
  const forecastStartDate = showForecast ? forecastData![0].date : null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#f8fafc' }}
          />
          <Legend />

          {/* Historical sentiment lines */}
          <Line type="monotone" dataKey="positive_pct" name="Positive %" stroke={SENTIMENT_COLORS.positive} strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="neutral_pct" name="Neutral %" stroke={SENTIMENT_COLORS.neutral} strokeWidth={2} dot={false} connectNulls />
          <Line type="monotone" dataKey="negative_pct" name="Negative %" stroke={SENTIMENT_COLORS.negative} strokeWidth={2} dot={false} connectNulls />

          {/* Forecast confidence band + centre line */}
          {showForecast && (
            <Area
              type="monotone"
              dataKey="upper"
              name="Forecast Upper"
              stroke="none"
              fill="#6366f1"
              fillOpacity={0.15}
              legendType="none"
              dot={false}
              connectNulls
            />
          )}
          {showForecast && (
            <Area
              type="monotone"
              dataKey="lower"
              name="Forecast Lower"
              stroke="none"
              fill="#1e293b"
              fillOpacity={1}
              legendType="none"
              dot={false}
              connectNulls
            />
          )}
          {showForecast && (
            <Line
              type="monotone"
              dataKey="forecast_score"
              name="Forecast (7-day)"
              stroke="#818cf8"
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={<ForecastDot />}
              activeDot={{ r: 6, fill: '#a5b4fc', stroke: '#818cf8', strokeWidth: 2 }}
              connectNulls
            />
          )}

          {/* Bold divider between history and forecast */}
          {forecastStartDate && (
            <ReferenceLine
              x={forecastStartDate}
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="4 2"
              label={{ value: '▶ Forecast', position: 'insideTopRight', fill: '#a5b4fc', fontSize: 11, fontWeight: 600 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {showForecast && (
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="inline-flex items-center gap-1 text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            <span className="w-4 h-0.5 bg-indigo-400 inline-block" style={{ borderTop: '2px dashed #818cf8' }} />
            7-day forecast
          </span>
          <span className="text-xs text-[#6B5E57]">· shaded band = confidence interval · linear regression on 30-day history</span>
        </div>
      )}
    </div>
  );
}
