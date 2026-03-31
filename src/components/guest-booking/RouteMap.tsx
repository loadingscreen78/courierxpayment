"use client";

import { useEffect, useRef, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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

// India center (New Delhi) - always the origin for all shipments
const INDIA_CENTER: [number, number] = [77.2090, 28.6139];

// Known country coordinates [lng, lat] for reliable international mapping
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

// Geocode using Mapbox Geocoding API
async function geocode(query: string, token: string): Promise<[number, number] | null> {
  if (!query || query.length < 3) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1`
    );
    const data = await res.json();
    const coords = data?.features?.[0]?.center;
    return coords ? [coords[0], coords[1]] : null;
  } catch {
    return null;
  }
}

// Haversine distance in km
function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Generate a great-circle arc between two points
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

/**
 * Resolve coordinates for the route.
 * International: India center as origin, known country coords or country-name geocode for destination.
 * Domestic: pincode-based geocoding for both ends (pincode + India is reliable).
 */
async function resolveCoords(
  props: RouteMapProps,
  token: string,
): Promise<{ pickup: [number, number]; dest: [number, number] } | null> {
  const { pickupCity, pickupPincode, destinationCity, destinationZipcode, destinationCountry, mode } = props;

  if (mode === 'international') {
    // Origin: always India — use pincode geocode if available, else India center
    let pickupCoords: [number, number] = INDIA_CENTER;
    if (pickupPincode) {
      const pincodeResult = await geocode(`${pickupPincode}, India`, token);
      if (pincodeResult) pickupCoords = pincodeResult;
    }

    // Destination: use known coords lookup first, then geocode by country name
    const countryCode = (destinationCountry || '').toUpperCase();
    let destCoords = COUNTRY_COORDS[countryCode] || null;
    if (!destCoords) {
      // Fallback: geocode by country name or code
      const countryQuery = props.destinationCountryName || destinationCountry || '';
      if (countryQuery) {
        destCoords = await geocode(countryQuery, token);
      }
    }
    if (!destCoords) return null;
    return { pickup: pickupCoords, dest: destCoords };
  }

  // Domestic: pincode-based geocoding (very reliable for India)
  const [pickupCoords, destCoords] = await Promise.all([
    geocode(pickupPincode ? `${pickupPincode}, ${pickupCity || ''}, India` : `${pickupCity}, India`, token),
    geocode(destinationZipcode ? `${destinationZipcode}, ${destinationCity || ''}, India` : `${destinationCity}, India`, token),
  ]);
  if (!pickupCoords || !destCoords) return null;
  return { pickup: pickupCoords, dest: destCoords };
}

export default function RouteMap(props: RouteMapProps) {
  const {
    pickupPincode, destinationCountry, destinationCountryName, mode,
  } = props;

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const animRef = useRef<number>(0);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Stable key to detect when we need to re-init the map
  const mapKey = useMemo(
    () => mode === 'international'
      ? `intl-${pickupPincode}-${destinationCountry}`
      : `dom-${pickupPincode}-${props.destinationZipcode}`,
    [mode, pickupPincode, destinationCountry, props.destinationZipcode]
  );

  useEffect(() => {
    if (!token || !mapContainer.current) return;

    // Clean up previous map
    if (mapRef.current) {
      cancelAnimationFrame(animRef.current);
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

        const { pickup: pickupCoords, dest: destCoords } = coords;
        const km = haversineKm(pickupCoords, destCoords);
        setDistanceKm(Math.round(km));

        const lngs = [pickupCoords[0], destCoords[0]];
        const lats = [pickupCoords[1], destCoords[1]];
        const pad = Math.max(2, km * 0.002);
        const bounds = new mapboxgl.LngLatBounds(
          [Math.min(...lngs) - pad, Math.min(...lats) - pad],
          [Math.max(...lngs) + pad, Math.max(...lats) + pad],
        );

        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/light-v11',
          bounds,
          fitBoundsOptions: { padding: { top: 48, bottom: 48, left: 40, right: 40 } },
          interactive: false,
          attributionControl: false,
          projection: 'mercator',
        });

        map.on('load', () => {
          if (cancelled) return;

          const arcCoords = generateArc(pickupCoords, destCoords);

          // Dotted route line
          map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: arcCoords } },
          });
          map.addLayer({
            id: 'route-dash',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#F40000', 'line-width': 2.5, 'line-dasharray': [2, 3], 'line-opacity': 0.6 },
          });

          // Flight icon (animated along the arc)
          map.addSource('flight', {
            type: 'geojson',
            data: { type: 'Feature', properties: { bearing: 0 }, geometry: { type: 'Point', coordinates: arcCoords[0] } },
          });

          const img = new Image(40, 40);
          img.onload = () => {
            if (map.hasImage('airplane')) return;
            map.addImage('airplane', img, { sdf: false });
            map.addLayer({
              id: 'flight-icon',
              type: 'symbol',
              source: 'flight',
              layout: {
                'icon-image': 'airplane',
                'icon-size': 0.5,
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
              },
            });
            let idx = 0;
            const animate = () => {
              idx = (idx + 1) % arcCoords.length;
              const next = (idx + 1) % arcCoords.length;
              const bearing = getBearing(arcCoords[idx], arcCoords[next]);
              const src = map.getSource('flight') as mapboxgl.GeoJSONSource;
              if (src) {
                src.setData({
                  type: 'Feature',
                  properties: { bearing },
                  geometry: { type: 'Point', coordinates: arcCoords[idx] },
                });
              }
              animRef.current = requestAnimationFrame(animate);
            };
            animRef.current = requestAnimationFrame(animate);
          };
          img.src = buildAirplaneSvgUrl();

          // Origin marker (India) — blue with package emoji
          addPulseMarker(map, pickupCoords, '#3B82F6', '📦');
          // Destination marker — green with pin emoji
          addPulseMarker(map, destCoords, '#10B981', '📍');

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
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, mapKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token || error) return null;

  // Build the distance bar label
  const distanceLabel = mode === 'international' && destinationCountryName
    ? `India → ${destinationCountryName}`
    : mode === 'international' && destinationCountry
    ? `India → ${destinationCountry}`
    : mode === 'domestic'
    ? 'Domestic'
    : '';

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card">
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/60 backdrop-blur-sm">
            <div className="h-5 w-5 border-2 border-coke-red border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={mapContainer} style={{ width: '100%', height: '200px' }} />
      </div>
      {distanceKm !== null && (
        <div className="flex items-center justify-center gap-2 py-2.5 px-4 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">Distance:</span>
          <span className="text-sm font-semibold">{distanceKm.toLocaleString('en-IN')} km</span>
          {distanceLabel && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{distanceLabel}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──

function getBearing(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]), lat2 = toRad(b[1]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function buildAirplaneSvgUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 256 256"><path fill="%23F40000" d="M240.85 63.15a24 24 0 0 0-34.63 1.26L172 103.59l-58.23-29.12a8 8 0 0 0-7.13.31l-24 14a8 8 0 0 0-1.17 12.93L119 133.41l-26.53 30.32L67.06 153a8 8 0 0 0-7.84.47l-16 10a8 8 0 0 0-.71 13.07l29.45 25.24 25.24 29.45a8 8 0 0 0 13.07-.71l10-16a8 8 0 0 0 .47-7.84l-10.69-25.41 30.32-26.53 31.7 37.55a8 8 0 0 0 12.93-1.17l14-24a8 8 0 0 0 .31-7.13L191.41 84l39.18-34.22a24 24 0 0 0 1.26-34.63Z"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${svg}`;
}

function addPulseMarker(map: mapboxgl.Map, coords: [number, number], color: string, emoji: string) {
  const el = document.createElement('div');
  el.innerHTML = `
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.2;animation:pulse-ring 2s ease-out infinite;"></div>
      <div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;font-size:13px;">${emoji}</div>
    </div>
  `;
  if (!document.getElementById('pulse-ring-style')) {
    const style = document.createElement('style');
    style.id = 'pulse-ring-style';
    style.textContent = `@keyframes pulse-ring{0%{transform:scale(1);opacity:0.25}100%{transform:scale(1.8);opacity:0}}`;
    document.head.appendChild(style);
  }
  new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(coords).addTo(map);
}
