import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useHeatmapData } from '../hooks/useHeatmapData';
import HeatmapLegend from '../components/HeatmapLegend';
import RegionPanel from '../components/RegionPanel';
import FilterSidebar from '../components/FilterSidebar';
import { scoreToHeatColor } from '../utils/colors';
import L from 'leaflet';
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
  const [geoData, setGeoData] = useState<any>(null);

  // Load GeoJSON for state-level choropleth
  useEffect(() => {
    fetch('/geojson/india_states.geojson')
      .then((r) => r.json())
      .then(setGeoData)
      .catch((e) => console.error('GeoJSON load error:', e));
  }, []);

  // Build a lookup from state name → heatmap data
  const stateDataMap = useMemo(() => {
    const map = new Map<string, any>();
    data.forEach((d) => map.set(d.name, d));
    return map;
  }, [data]);

  // Merge heatmap data into GeoJSON features for choropleth
  const mergedGeoJson = useMemo(() => {
    if (!geoData || level !== 'state') return null;
    return {
      ...geoData,
      features: geoData.features.map((f: any) => ({
        ...f,
        properties: {
          ...f.properties,
          ...(stateDataMap.get(f.properties.name) || {}),
        },
      })),
    };
  }, [geoData, stateDataMap, level]);

  // Compute center from data or default to India
  const center: [number, number] =
    level !== 'state' && data.length > 0
      ? [
          data.reduce((s, d) => s + d.lat, 0) / data.length,
          data.reduce((s, d) => s + d.lng, 0) / data.length,
        ]
      : INDIA_CENTER;

  const zoom = ZOOM_LEVELS[level] || 5;

  // Style each state polygon by sentiment score
  const stateStyle = (feature: any) => {
    const score = feature?.properties?.avg_sentiment;
    const hasData = score !== undefined && feature?.properties?.volume > 0;
    return {
      fillColor: hasData ? scoreToHeatColor(score) : '#334155',
      fillOpacity: hasData ? 0.8 : 0.2,
      color: '#475569',
      weight: 1,
    };
  };

  // Interaction handlers for each state
  const onEachState = (feature: any, layer: L.Layer) => {
    const props = feature.properties;
    const hasData = props.avg_sentiment !== undefined && props.volume > 0;

    layer.bindTooltip(
      `<div style="text-align:center;font-family:system-ui;padding:2px">
        <div style="font-weight:700;font-size:13px;margin-bottom:2px">${props.name}</div>
        ${hasData
          ? `<div style="font-size:11px;color:#94a3b8">Score: ${Math.round(((props.avg_sentiment + 1) / 2) * 100)} · ${props.volume} voices</div>`
          : '<div style="font-size:11px;color:#64748b">No data</div>'}
      </div>`,
      { sticky: true, className: 'leaflet-tooltip-custom' }
    );

    (layer as any).on({
      mouseover: (e: any) => {
        e.target.setStyle({ fillOpacity: 0.9, weight: 2.5, color: '#60a5fa' });
        e.target.bringToFront();
      },
      mouseout: (e: any) => {
        e.target.setStyle(stateStyle(feature));
      },
      click: () => {
        if (hasData) {
          const heatmapPoint = stateDataMap.get(props.name);
          if (heatmapPoint) {
            setSelectedRegion({ ...heatmapPoint, type: 'state' });
          }
        }
      },
    });
  };

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
          zoomControl={true}
          minZoom={4}
          maxZoom={12}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />
          <MapUpdater center={center} zoom={zoom} />

          {/* State-level: choropleth polygons */}
          {level === 'state' && mergedGeoJson && (
            <GeoJSON
              key={JSON.stringify(data.map((d) => d.avg_sentiment))}
              data={mergedGeoJson}
              style={stateStyle}
              onEachFeature={onEachState}
            />
          )}

          {/* Sub-state levels: circle markers (districts/constituencies/wards) */}
          {level !== 'state' &&
            data.map((point) => (
              <CircleMarker
                key={point.id}
                center={[point.lat, point.lng]}
                radius={level === 'district' ? 14 : 10}
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
