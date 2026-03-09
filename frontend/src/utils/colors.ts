/** Sentiment → color mapping */

export const SENTIMENT_COLORS = {
  positive: '#22C55E',
  neutral: '#EAB308',
  negative: '#EF4444',
  critical: '#DC2626',
} as const;

export function sentimentColor(sentiment: string): string {
  return SENTIMENT_COLORS[sentiment as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral;
}

export function scoreToColor(score: number): string {
  if (score > 0.2) return SENTIMENT_COLORS.positive;
  if (score < -0.2) return SENTIMENT_COLORS.negative;
  return SENTIMENT_COLORS.neutral;
}

export function scoreToHeatColor(score: number): string {
  // Map -1..+1 to red..yellow..green
  const clamped = Math.max(-1, Math.min(1, score));
  if (clamped >= 0) {
    // yellow(0) → green(1)
    const r = Math.round(234 - clamped * 200);
    const g = Math.round(179 + clamped * 18);
    const b = Math.round(8 - clamped * 8);
    return `rgb(${r},${g},${b})`;
  } else {
    // red(-1) → yellow(0)
    const t = clamped + 1; // 0..1
    const r = Math.round(239 - t * 5);
    const g = Math.round(68 + t * 111);
    const b = Math.round(68 - t * 60);
    return `rgb(${r},${g},${b})`;
  }
}

/** Urgency 0..1 → color: green(0) → amber(0.5) → red(1) */
export function urgencyToHeatColor(score: number): string {
  const s = Math.max(0, Math.min(1, score));
  if (s <= 0.5) {
    const t = s * 2; // 0→1
    const r = Math.round(34 + t * (234 - 34));
    const g = Math.round(197 - t * (197 - 179));
    const b = Math.round(94 - t * 86);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (s - 0.5) * 2; // 0→1
    const r = Math.round(234 + t * (239 - 234));
    const g = Math.round(179 - t * 111);
    const b = Math.round(8 + t * 60);
    return `rgb(${r},${g},${b})`;
  }
}
