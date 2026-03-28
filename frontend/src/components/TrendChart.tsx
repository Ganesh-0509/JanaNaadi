import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Area, ReferenceLine,
} from 'recharts';
import type { ForecastPoint } from '../api/analysis';

const CHART_COLORS = {
  positive: '#22C55E',
  neutral: '#EAB308',
  negative: '#EF4444',
  forecast: '#2FA4D7',
  grid: 'rgba(148, 163, 184, 0.25)',
  text: '#C9D1D9',
};

const ForecastDot = (props: any) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={CHART_COLORS.forecast} fillOpacity={0.2} />
      <circle cx={cx} cy={cy} r={3.5} fill={CHART_COLORS.forecast} />
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
  const forecastStartDate = showForecast ? forecastData![0].date : null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
          <XAxis dataKey="date" stroke={CHART_COLORS.text} tick={{ fontSize: 12 }} interval="preserveStartEnd" />
          <YAxis stroke={CHART_COLORS.text} tick={{ fontSize: 12 }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: '#0F172A', border: `1px solid ${CHART_COLORS.grid}`, borderRadius: '0.75rem', color: '#E2E8F0' }}
            labelStyle={{ color: '#E2E8F0', fontWeight: 700 }}
          />
          <Legend wrapperStyle={{ fontSize: 13, color: CHART_COLORS.text }} />

          <Line 
            type="monotone" 
            dataKey="positive_pct" 
            name="Positive %" 
            stroke={CHART_COLORS.positive} 
            strokeWidth={2} 
            dot={false} 
            connectNulls 
          />
          <Line 
            type="monotone" 
            dataKey="neutral_pct" 
            name="Neutral %" 
            stroke={CHART_COLORS.neutral} 
            strokeWidth={2} 
            dot={false} 
            connectNulls 
          />
          <Line 
            type="monotone" 
            dataKey="negative_pct" 
            name="Negative %" 
            stroke={CHART_COLORS.negative} 
            strokeWidth={2} 
            dot={false} 
            connectNulls 
          />

          {showForecast && (
            <Area
              type="monotone"
              dataKey="upper"
              name="Forecast Upper"
              stroke="none"
              fill={CHART_COLORS.forecast}
              fillOpacity={0.12}
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
              fill="#0F172A"
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
              stroke={CHART_COLORS.forecast}
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={<ForecastDot />}
              activeDot={{ r: 6, fill: '#7ACCF9', stroke: CHART_COLORS.forecast, strokeWidth: 2 }}
              connectNulls
            />
          )}

          {forecastStartDate && (
            <ReferenceLine
              x={forecastStartDate}
              stroke={CHART_COLORS.forecast}
              strokeWidth={2}
              strokeDasharray="4 2"
              label={{ value: 'Forecast', position: 'insideTopRight', fill: CHART_COLORS.forecast, fontSize: 12, fontWeight: 700 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      {showForecast && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-secondary-200 bg-secondary-50 px-3 py-1.5 text-xs font-semibold text-secondary-700">
            <span className="inline-block h-0.5 w-5 bg-secondary-500" style={{ borderTop: '2px dashed #2FA4D7' }} />
            7-day forecast
          </span>
          <span className="text-xs text-content-secondary">shaded band = confidence interval</span>
        </div>
      )}
    </div>
  );
}
