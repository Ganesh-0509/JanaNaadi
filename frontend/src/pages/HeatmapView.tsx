import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useHeatmapData } from '../hooks/useHeatmapData';
import HeatmapLegend from '../components/HeatmapLegend';
import RegionPanel from '../components/RegionPanel';
import FilterSidebar from '../components/FilterSidebar';
import { getHeatmapHistory } from '../api/heatmap';
import { scoreToHeatColor, urgencyToHeatColor } from '../utils/colors';
import { useFilters } from '../context/FilterContext';
import { SlidersHorizontal, Zap, TrendingDown } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const INDIA_CENTER: [number, number] = [22.5, 82.0];
const ZOOM_LEVELS: Record<string, number> = {
  state: 5,
  district: 7,
  constituency: 9,
  ward: 11,
};

const STATE_NAME_ALIASES: Record<string, string> = {
  'Andaman & Nicobar Island': 'Andaman and Nicobar Islands',
  'Arunanchal Pradesh': 'Arunachal Pradesh',
  'Jammu & Kashmir': 'Jammu and Kashmir',
  'NCT of Delhi': 'Delhi',
  'Dadra and Nagar Haveli': 'Dadra and Nagar Haveli and Daman and Diu',
};

const canonicalStateName = (name: string): string => {
  const trimmed = (name || '').trim();
  return STATE_NAME_ALIASES[trimmed] || trimmed;
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
  const { filters } = useFilters();
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [heatMode, setHeatMode] = useState<'sentiment' | 'urgency'>('sentiment');

  // Timeline: null = live (today), otherwise a YYYY-MM-DD date string
  const [timelineDay, setTimelineDay] = useState<number>(29); // 0=30daysAgo, 29=today
  const [isLive, setIsLive] = useState(true);
  const [historyData, setHistoryData] = useState<any[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Derive the date string for a given slider position (0=30daysAgo, 29=today)
  const sliderToDate = (day: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - day));
    return d.toISOString().slice(0, 10);
  };

  const handleSliderChange = async (val: number) => {
    setTimelineDay(val);
    if (val === 29) {
      setIsLive(true);
      setHistoryData(null);
      return;
    }
    setIsLive(false);
    const dateStr = sliderToDate(val);
    setLoadingHistory(true);
    try {
      const d = await getHeatmapHistory(dateStr);
      setHistoryData(d);
    } catch (e) {
      console.error('History fetch error:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Use history data when available, else live data
  const activeData = isLive ? data : (historyData ?? data);

  const activeFilterCount = [
    filters.topic,
    filters.source,
    filters.language,
    filters.sentiment,
    filters.timeRange !== '30d' ? filters.timeRange : null,
  ].filter(Boolean).length;

  // Load GeoJSON for state-level choropleth
  useEffect(() => {
    fetch('/geojson/india_states.geojson')
      .then((res) => {
        if (!res.ok) throw new Error('GeoJSON not found');
        return res.json();
      })
      .then((data) => {
        if (data?.features?.length > 0) {
          setGeoData(data);
        } else {
          console.warn('india_states.geojson is empty - map outlines will not render');
        }
      })
      .catch((err) => console.error('Failed to load map data:', err));
  }, []);

  // Build a lookup from state name → heatmap data
  const stateDataMap = useMemo(() => {
    const map = new Map<string, any>();
    activeData.forEach((d) => {
      const key = canonicalStateName(d.name);
      map.set(key, d);
      if (key !== d.name) {
        map.set(d.name, d);
      }
    });
    return map;
  }, [activeData]);

  // Merge heatmap data into GeoJSON features for choropleth
  const mergedGeoJson = useMemo(() => {
    if (!geoData || level !== 'state') return null;
    return {
      ...geoData,
      features: geoData.features.map((f: any) => ({
        ...f,
        properties: {
          ...f.properties,
          name: f.properties.ST_NM || f.properties.name || f.properties.NAME_1 || 'Unknown',
          ...(stateDataMap.get(canonicalStateName(f.properties.ST_NM || f.properties.name || f.properties.NAME_1 || 'Unknown')) || stateDataMap.get(f.properties.ST_NM || f.properties.name || f.properties.NAME_1 || 'Unknown') || {}),
        },
      })),
    };
  }, [geoData, stateDataMap, level]);

  // Compute center from data or default to India
  const center: [number, number] =
    level !== 'state' && activeData.length > 0
      ? [
          activeData.reduce((s, d) => s + d.lat, 0) / activeData.length,
          activeData.reduce((s, d) => s + d.lng, 0) / activeData.length,
        ]
      : INDIA_CENTER;

  const zoom = ZOOM_LEVELS[level] || 5;

  // Style each state polygon by sentiment or urgency score
  const stateStyle = (feature: any) => {
    const props = feature?.properties;
    const hasData = props.volume > 0;
    const color = heatMode === 'urgency'
      ? urgencyToHeatColor(props.urgency_score ?? 0)
      : scoreToHeatColor(props.avg_sentiment);
    return {
      fillColor: hasData ? color : '#334155',
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
          ? `<div style="font-size:11px;color:#94a3b8">Score: ${Math.round(((props.avg_sentiment + 1) / 2) * 100)} · ${props.volume} voices${props.urgency_score > 0 ? ` · Urgency: ${Math.round(props.urgency_score * 100)}` : ''}</div>`
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
      {/* Desktop sidebar — always visible */}
      <div className="hidden md:block">
        <FilterSidebar open />
      </div>

      {/* Mobile sidebar — drawer overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[2000] flex">
          <div className="w-64 h-full overflow-y-auto">
            <FilterSidebar open />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 relative">
        {/* Mobile filter toggle */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="md:hidden absolute top-4 left-4 z-[500] flex items-center gap-2 bg-[#3E2C23]/90 backdrop-blur border border-[#3E2C23]/20 rounded-lg px-3 py-2 text-sm font-medium"
        >
          <SlidersHorizontal size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Breadcrumbs */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0 z-[500] bg-[#3E2C23]/90 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 text-sm border border-[#3E2C23]/20">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-[#6B5E57]">›</span>}
              <button
                onClick={() => navigateTo(i)}
                className={`hover:text-blue-400 ${
                  i === breadcrumbs.length - 1 ? 'text-white font-medium' : 'text-[#D8CCC0]'
                }`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        {/* Mode Toggle — Sentiment vs Urgency */}
        <div className="absolute top-4 right-4 z-[500] flex gap-1 bg-[#3E2C23]/90 backdrop-blur rounded-lg p-1 border border-[#3E2C23]/20">
          <button
            onClick={() => setHeatMode('sentiment')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              heatMode === 'sentiment' ? 'bg-blue-500 text-white' : 'text-[#D8CCC0] hover:text-white'
            }`}
          >
            <TrendingDown size={12} /> Sentiment
          </button>
          <button
            onClick={() => setHeatMode('urgency')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              heatMode === 'urgency' ? 'bg-red-500 text-white' : 'text-[#D8CCC0] hover:text-white'
            }`}
          >
            <Zap size={12} /> Urgency
          </button>
        </div>

        {/* Timeline Slider */}
        <div className="absolute bottom-4 right-4 z-[500] bg-[#3E2C23]/90 backdrop-blur rounded-xl px-4 py-3 border border-[#3E2C23]/20 w-64">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#D8CCC0]">Timeline</span>
            <span className={`text-xs font-bold ${isLive ? 'text-green-400' : 'text-amber-400'}`}>
              {isLive ? '● LIVE' : sliderToDate(timelineDay)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={29}
            value={timelineDay}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-xs text-[#D8CCC0] mt-1">
            <span>-30d</span>
            <span>Today</span>
          </div>
          {loadingHistory && (
            <div className="text-xs text-[#D8CCC0] text-center mt-1 animate-pulse">Loading…</div>
          )}
        </div>

        {/* Legend */}
        <div className="absolute bottom-20 left-4 z-[500]">
          <HeatmapLegend mode={heatMode} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="absolute top-4 right-4 z-[500] bg-[#3E2C23]/90 backdrop-blur rounded-lg px-4 py-2 text-sm border border-[#3E2C23]/20">
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
              key={`${heatMode}-${timelineDay}-${filters.source || ''}-${filters.language || ''}-${filters.sentiment || ''}-${JSON.stringify(activeData.map((d) => d.avg_sentiment))}`}
              data={mergedGeoJson}
              style={stateStyle}
              onEachFeature={onEachState}
            />
          )}

          {/* Sub-state levels: circle markers (districts/constituencies/wards) */}
          {level !== 'state' &&
            activeData.map((point) => (
              <CircleMarker
                key={point.id}
                center={[point.lat, point.lng]}
                radius={level === 'district' ? 14 : 10}
                fillColor={heatMode === 'urgency'
                  ? urgencyToHeatColor((point as any).urgency_score ?? 0)
                  : scoreToHeatColor(point.avg_sentiment)
                }
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
