"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { X, ArrowsOut } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

interface RouteMapProps {
  pickupAddress: string;
  pickupCity: string;
  pickupPincode: string;
  destinationAddress: string;
  destinationCity: string;
  destinationZipcode: string;
  destinationCountry?: string;
  destinationCountryName?: string;
  mode: 'international' | 'domestic';
}

const INDIA_CENTER: [number, number] = [77.2090, 28.6139];

const COUNTRY_COORDS: Record<string, [number, number]> = {
  US: [-77.04, 38.91], GB: [-0.13, 51.51], AE: [55.27, 25.20],
  CA: [-75.70, 45.42], AU: [149.13, -35.28], SG: [103.82, 1.35],
  DE: [13.41, 52.52], FR: [2.35, 48.86], JP: [139.69, 35.69],
  KR: [126.98, 37.57], NL: [4.90, 52.37], IT: [12.50, 41.90],
  ES: [-3.70, 40.42], SE: [18.07, 59.33], CH: [7.45, 46.95],
  NZ: [174.76, -41.29], MY: [101.69, 3.14], TH: [100.50, 13.76],
  PH: [120.98, 14.60], ID: [106.85, -6.21], VN: [105.83, 21.03],
  SA: [46.68, 24.71], QA: [51.53, 25.29], KW: [47.98, 29.38],
  BH: [50.56, 26.23], OM: [58.38, 23.59], BD: [90.41, 23.81],
  LK: [79.86, 6.93], NP: [85.32, 27.72], PK: [73.05, 33.68],
  ZA: [28.05, -26.20], KE: [36.82, -1.29], NG: [3.38, 6.52],
  EG: [31.24, 30.04], BR: [-47.88, -15.79], MX: [-99.13, 19.43],
  AR: [-58.38, -34.60], CL: [-70.67, -33.45], CO: [-74.07, 4.71],
  PE: [-77.04, -12.05], HK: [114.17, 22.32], TW: [121.57, 25.03],
  CN: [116.41, 39.90], RU: [37.62, 55.76], TR: [32.86, 39.93],
  IL: [35.21, 31.77], GR: [23.73, 37.98], PT: [-9.14, 38.72],
  PL: [21.01, 52.23], CZ: [14.44, 50.08], AT: [16.37, 48.21],
  BE: [4.35, 50.85], DK: [12.57, 55.68], NO: [10.75, 59.91],
  FI: [24.94, 60.17], IE: [-6.26, 53.35], HU: [19.04, 47.50],
  RO: [26.10, 44.43], MU: [57.55, -20.16], JO: [35.91, 31.95],
  LB: [35.50, 33.89], GH: [-0.19, 5.60], TZ: [39.21, -6.79],
  ET: [38.76, 9.03], UG: [32.58, 0.35], MM: [96.20, 16.87],
  KH: [104.93, 11.56], LA: [102.63, 17.98],
};

async function geocode(query: string, token: string): Promise<[number, number] | null> {
  if (!query || query.length < 3) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1`
    );
    const data = await res.json();
    const coords = data?.features?.[0]?.center;
    return coords ? [coords[0], coords[1]] : null;
  } catch { return null; }
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function generateArc(start: [number, number], end: [number, number], steps = 80): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(start[1]), lon1 = toRad(start[0]);
  const lat2 = toRad(end[1]), lon2 = toRad(end[0]);
  const d = 2 * Math.asin(Math.sqrt(
    Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
  ));
  if (d < 1e-10) return [start, end];
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    points.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return points;
}

function getBearing(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]), lat2 = toRad(b[1]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

async function resolveCoords(props: RouteMapProps, token: string) {
  const { pickupPincode, destinationCountry, mode } = props;
  if (mode === 'international') {
    let pickupCoords: [number, number] = INDIA_CENTER;
    if (pickupPincode) {
      const r = await geocode(`${pickupPincode}, India`, token);
      if (r) pickupCoords = r;
    }
    const cc = (destinationCountry || '').toUpperCase();
    let destCoords = COUNTRY_COORDS[cc] || null;
    if (!destCoords) {
      const q = props.destinationCountryName || destinationCountry || '';
      if (q) destCoords = await geocode(q, token);
    }
    if (!destCoords) return null;
    return { pickup: pickupCoords, dest: destCoords };
  }
  const [p, d] = await Promise.all([
    geocode(props.pickupPincode ? `${props.pickupPincode}, ${props.pickupCity || ''}, India` : `${props.pickupCity}, India`, token),
    geocode(props.destinationZipcode ? `${props.destinationZipcode}, ${props.destinationCity || ''}, India` : `${props.destinationCity}, India`, token),
  ]);
  if (!p || !d) return null;
  return { pickup: p, dest: d };
}

// Paper plane SVG marker element
// The SVG is drawn pointing UP (north) so bearing=0 needs no extra offset.
// Rotation is applied to the inner svg element via CSS transition so Mapbox's
// own translate transform on the wrapper div is never clobbered (fixes blinking).
function createPaperPlaneEl(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:36px;height:36px;pointer-events:none;';

  // 3-D looking paper plane pointing upward (nose at top = bearing 0 = north)
  wrapper.innerHTML = `
    <svg id="plane-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36"
      style="display:block;transition:transform 0.25s linear;transform-origin:center center;">
      <!-- shadow / depth base -->
      <polygon points="18,3 33,30 18,24 3,30" fill="#b30000" opacity="0.35"/>
      <!-- left wing (darker) -->
      <polygon points="18,3 3,30 18,24" fill="#cc0000"/>
      <!-- right wing (lighter highlight) -->
      <polygon points="18,3 33,30 18,24" fill="#ff2222"/>
      <!-- fuselage centre crease -->
      <polygon points="18,3 18,24 18,30" fill="#ff6666" opacity="0.6"/>
      <!-- belly fold -->
      <polygon points="3,30 18,24 33,30 18,28" fill="#990000" opacity="0.5"/>
    </svg>`;
  return wrapper;
}

function addPinMarker(map: mapboxgl.Map, coords: [number, number], color: string, label: string) {
  const el = document.createElement('div');
  el.style.cssText = `display:flex;flex-direction:column;align-items:center;pointer-events:none;`;
  el.innerHTML = `
    <div style="background:${color};color:white;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.25);margin-bottom:2px;">${label}</div>
    <div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>
  `;
  new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat(coords).addTo(map);
}

export default function RouteMap(props: RouteMapProps) {
  const { pickupPincode, destinationCountry, destinationCountryName, mode } = props;

  const mapContainer = useRef<HTMLDivElement>(null);
  const expandedMapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const expandedMapRef = useRef<mapboxgl.Map | null>(null);
  const planeMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const expandedPlaneMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const animRef = useRef<number>(0);
  const expandedAnimRef = useRef<number>(0);
  const arcRef = useRef<[number, number][]>([]);
  const idxRef = useRef(0);
  const expandedIdxRef = useRef(0);
  const lastTimeRef = useRef(0);
  const expandedLastTimeRef = useRef(0);

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [resolvedCoords, setResolvedCoords] = useState<{ pickup: [number, number]; dest: [number, number] } | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const mapKey = useMemo(
    () => mode === 'international'
      ? `intl-${pickupPincode}-${destinationCountry}`
      : `dom-${pickupPincode}-${props.destinationZipcode}`,
    [mode, pickupPincode, destinationCountry, props.destinationZipcode]
  );

  // Lock body scroll when expanded
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isExpanded]);

  // Close on Escape key
  useEffect(() => {
    if (!isExpanded) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsExpanded(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isExpanded]);

  // ── Initialize expanded map when modal opens ──
  useEffect(() => {
    if (!isExpanded || !token || !expandedMapContainer.current || !resolvedCoords) return;

    const { pickup, dest } = resolvedCoords;
    const km = haversineKm(pickup, dest);
    const arc = generateArc(pickup, dest, 180);

    const lngs = [pickup[0], dest[0]];
    const lats = [pickup[1], dest[1]];
    const pad = Math.min(Math.max(1.5, km * 0.001), 8);
    const bounds = new mapboxgl.LngLatBounds(
      [Math.min(...lngs) - pad, Math.min(...lats) - pad],
      [Math.max(...lngs) + pad, Math.max(...lats) + pad],
    );

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: expandedMapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      bounds,
      fitBoundsOptions: { padding: { top: 60, bottom: 60, left: 50, right: 50 }, maxZoom: mode === 'domestic' ? 8 : 5 },
      interactive: true,
      attributionControl: false,
      projection: 'mercator',
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: arc } },
      });
      map.addLayer({
        id: 'route-dash',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#F40000', 'line-width': 2.5, 'line-dasharray': [3, 4], 'line-opacity': 0.55 },
      });

      addPinMarker(map, pickup, '#3B82F6', props.pickupCity || 'India');
      addPinMarker(map, dest, '#10B981', props.destinationCountryName || props.destinationCity || 'Destination');

      const planeEl = createPaperPlaneEl();
      const planeSvg = planeEl.querySelector<SVGElement>('#plane-svg')!;
      const planeMarker = new mapboxgl.Marker({ element: planeEl, anchor: 'center', rotationAlignment: 'map' })
        .setLngLat(arc[0])
        .addTo(map);
      expandedPlaneMarkerRef.current = planeMarker;

      const FRAME_INTERVAL = 50;
      let lastBearing = getBearing(arc[0], arc[1]);
      planeSvg.style.transform = `rotate(${lastBearing}deg)`;
      expandedIdxRef.current = 0;

      const animate = (timestamp: number) => {
        if (timestamp - expandedLastTimeRef.current >= FRAME_INTERVAL) {
          expandedLastTimeRef.current = timestamp;
          if (arc.length < 2) { expandedAnimRef.current = requestAnimationFrame(animate); return; }
          expandedIdxRef.current = (expandedIdxRef.current + 1) % arc.length;
          const cur = arc[expandedIdxRef.current];
          const next = arc[(expandedIdxRef.current + 1) % arc.length];
          const bearing = getBearing(cur, next);
          planeMarker.setLngLat(cur);
          let delta = bearing - lastBearing;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          lastBearing = lastBearing + delta;
          planeSvg.style.transform = `rotate(${lastBearing}deg)`;
        }
        expandedAnimRef.current = requestAnimationFrame(animate);
      };
      expandedAnimRef.current = requestAnimationFrame(animate);
    });

    expandedMapRef.current = map;

    return () => {
      cancelAnimationFrame(expandedAnimRef.current);
      expandedPlaneMarkerRef.current?.remove();
      expandedMapRef.current?.remove();
      expandedMapRef.current = null;
    };
  }, [isExpanded, token, resolvedCoords]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize inline (small) map ──
  useEffect(() => {
    if (!mapContainer.current) return;

    if (mapRef.current) {
      cancelAnimationFrame(animRef.current);
      planeMarkerRef.current?.remove();
      mapRef.current.remove();
      mapRef.current = null;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    const init = async () => {
      try {
        const coords = await resolveCoords(props, token);
        if (cancelled || !coords || !mapContainer.current) {
          if (!cancelled) setError(true);
          setLoading(false);
          return;
        }

        setResolvedCoords(coords);
        const { pickup, dest } = coords;
        const km = haversineKm(pickup, dest);
        setDistanceKm(Math.round(km));

        const lngs = [pickup[0], dest[0]];
        const lats = [pickup[1], dest[1]];
        const pad = Math.min(Math.max(1.5, km * 0.001), 8);
        const bounds = new mapboxgl.LngLatBounds(
          [Math.min(...lngs) - pad, Math.min(...lats) - pad],
          [Math.max(...lngs) + pad, Math.max(...lats) + pad],
        );

        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          bounds,
          fitBoundsOptions: { padding: { top: 44, bottom: 44, left: 36, right: 36 }, maxZoom: mode === 'domestic' ? 8 : 5 },
          interactive: false,
          attributionControl: false,
          projection: 'mercator',
        });

        // Fallback: if map style fails to load within 10s, show error
        const loadTimeout = setTimeout(() => {
          if (cancelled) return;
          setError(true);
          setLoading(false);
          map.remove();
        }, 10000);

        map.on('error', () => {
          clearTimeout(loadTimeout);
          if (cancelled) return;
          setError(true);
          setLoading(false);
        });

        map.on('load', () => {
          clearTimeout(loadTimeout);
          if (cancelled) return;

          const arc = generateArc(pickup, dest, 180);
          arcRef.current = arc;
          idxRef.current = 0;

          map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: arc } },
          });
          map.addLayer({
            id: 'route-dash',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#F40000', 'line-width': 2, 'line-dasharray': [3, 4], 'line-opacity': 0.55 },
          });

          addPinMarker(map, pickup, '#3B82F6', props.pickupCity || 'India');
          addPinMarker(map, dest, '#10B981', props.destinationCountryName || props.destinationCity || 'Destination');

          const planeEl = createPaperPlaneEl();
          const planeSvg = planeEl.querySelector<SVGElement>('#plane-svg')!;
          const planeMarker = new mapboxgl.Marker({ element: planeEl, anchor: 'center', rotationAlignment: 'map' })
            .setLngLat(arc[0])
            .addTo(map);
          planeMarkerRef.current = planeMarker;

          const FRAME_INTERVAL = 50;
          let lastBearing = getBearing(arc[0], arc[1]);
          planeSvg.style.transform = `rotate(${lastBearing}deg)`;

          const animate = (timestamp: number) => {
            if (cancelled) return;
            if (timestamp - lastTimeRef.current >= FRAME_INTERVAL) {
              lastTimeRef.current = timestamp;
              const arcCoords = arcRef.current;
              if (arcCoords.length < 2) { animRef.current = requestAnimationFrame(animate); return; }

              idxRef.current = (idxRef.current + 1) % arcCoords.length;
              const cur = arcCoords[idxRef.current];
              const next = arcCoords[(idxRef.current + 1) % arcCoords.length];
              const bearing = getBearing(cur, next);

              planeMarker.setLngLat(cur);

              let delta = bearing - lastBearing;
              if (delta > 180) delta -= 360;
              if (delta < -180) delta += 360;
              lastBearing = lastBearing + delta;
              planeSvg.style.transform = `rotate(${lastBearing}deg)`;
            }
            animRef.current = requestAnimationFrame(animate);
          };
          animRef.current = requestAnimationFrame(animate);

          setLoading(false);
        });

        mapRef.current = map;
      } catch {
        if (!cancelled) { setError(true); setLoading(false); }
      }
    };

    init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animRef.current);
      planeMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, mapKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token || error) return null;

  const distanceLabel = mode === 'international' && destinationCountryName
    ? `India → ${destinationCountryName}`
    : mode === 'international' && destinationCountry
    ? `India → ${destinationCountry}`
    : 'Domestic';

  return (
    <>
      {/* Inline map — clickable to expand */}
      <div
        className="rounded-xl overflow-hidden border border-border bg-card cursor-pointer group relative"
        onClick={() => setIsExpanded(true)}
        role="button"
        tabIndex={0}
        aria-label="Click to expand map"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsExpanded(true); } }}
      >
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/60 backdrop-blur-sm">
              <div className="h-5 w-5 border-2 border-coke-red border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div ref={mapContainer} style={{ width: '100%', height: '200px' }} />
          {/* Expand hint overlay */}
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors duration-200 pointer-events-none">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
              <ArrowsOut className="h-3.5 w-3.5" weight="bold" />
              Tap to expand
            </div>
          </div>
        </div>
        {distanceKm !== null && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 border-t border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">✈ {distanceLabel}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-sm font-semibold">{distanceKm.toLocaleString('en-IN')} km</span>
          </div>
        )}
      </div>

      {/* Expanded map modal */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6"
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl bg-card rounded-2xl overflow-hidden border border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Shipment Route</span>
                  {distanceKm !== null && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">✈ {distanceLabel}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-sm font-semibold">{distanceKm.toLocaleString('en-IN')} km</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Close map"
                >
                  <X className="h-4 w-4" weight="bold" />
                </button>
              </div>
              {/* Map container */}
              <div ref={expandedMapContainer} style={{ width: '100%', height: 'min(70vh, 500px)' }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
