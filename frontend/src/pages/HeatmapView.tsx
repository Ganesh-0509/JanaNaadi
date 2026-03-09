import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useHeatmapData } from '../hooks/useHeatmapData';
import HeatmapLegend from '../components/HeatmapLegend';
import RegionPanel from '../components/RegionPanel';
import FilterSidebar from '../components/FilterSidebar';
import { scoreToHeatColor } from '../utils/colors';
import 'leaflet/dist/leaflet.css';

const INDIA_CENTER: [number, number] = [22.5, 82.0];
const ZOOM_LEVELS: Record<string, number> = {
  state: 5,
  district: 7,
  constituency: 9,
  ward: 11,
};

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

export default function HeatmapView() {
  const { data, loading, level, breadcrumbs, drillDown, navigateTo } = useHeatmapData();
  const [selectedRegion, setSelectedRegion] = useState<any>(null);

  // Compute center from data or default to India
  const center: [number, number] =
    data.length > 0
      ? [
          data.reduce((s, d) => s + d.lat, 0) / data.length,
          data.reduce((s, d) => s + d.lng, 0) / data.length,
        ]
      : INDIA_CENTER;

  const zoom = ZOOM_LEVELS[level] || 5;

  return (
    <div className="flex h-full">
      <FilterSidebar />

      <div className="flex-1 relative">
        {/* Breadcrumbs */}
        <div className="absolute top-4 left-4 z-[500] bg-slate-800/90 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 text-sm border border-slate-700">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-500">›</span>}
              <button
                onClick={() => navigateTo(i)}
                className={`hover:text-blue-400 ${
                  i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-slate-400'
                }`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[500]">
          <HeatmapLegend />
        </div>

        {/* Loading */}
        {loading && (
          <div className="absolute top-4 right-4 z-[500] bg-slate-800/90 backdrop-blur rounded-lg px-4 py-2 text-sm border border-slate-700">
            Loading...
          </div>
        )}

        {/* Map */}
        <MapContainer
          center={INDIA_CENTER}
          zoom={5}
          className="h-full w-full"
          style={{ background: '#0F172A' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />
          <MapUpdater center={center} zoom={zoom} />

          {data.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={level === 'state' ? 20 : level === 'district' ? 14 : 10}
              fillColor={scoreToHeatColor(point.avg_sentiment)}
              fillOpacity={0.8}
              stroke={true}
              color="#1e293b"
              weight={2}
              eventHandlers={{
                click: () => {
                  if (level !== 'ward') {
                    drillDown(point.id, point.name);
                  }
                  setSelectedRegion({ ...point, type: level });
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <div className="text-center">
                  <div className="font-bold">{point.name}</div>
                  <div>Sentiment: {point.avg_sentiment.toFixed(2)}</div>
                  <div>Volume: {point.volume.toLocaleString()}</div>
                  {point.dominant_topic && <div>Top: {point.dominant_topic}</div>}
                </div>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Region Panel */}
        <RegionPanel
          region={selectedRegion}
          onClose={() => setSelectedRegion(null)}
        />
      </div>
    </div>
  );
}
