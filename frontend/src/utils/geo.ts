/** GeoJSON helpers */

export function getRegionStyle(avgSentiment: number) {
  const color = sentimentToFillColor(avgSentiment);
  return {
    fillColor: color,
    weight: 1,
    opacity: 0.8,
    color: '#334155',
    fillOpacity: 0.6,
  };
}

function sentimentToFillColor(score: number): string {
  if (score > 0.2) return '#22C55E';
  if (score > -0.2) return '#EAB308';
  return '#EF4444';
}
