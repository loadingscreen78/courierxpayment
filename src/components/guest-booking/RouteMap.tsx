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
  mode: 'international' | 'domestic';
}

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

export default function RouteMap({
  pickupAddress, pickupCity, pickupPincode,
  destinationAddress, destinationCity, destinationZipcode,
  destinationCountry, mode,
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const animRef = useRef<number>(0);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const pickupQuery = useMemo(
    () => [pickupAddress, pickupCity, pickupPincode, 'India'].filter(Boolean).join(', '),
    [pickupAddress, pickupCity, pickupPincode]
  );
  const destQuery = useMemo(
    () => [destinationAddress, destinationCity, destinationZipcode, destinationCountry || ''].filter(Boolean).join(', '),
    [destinationAddress, destinationCity, destinationZipcode, destinationCountry]
  );

  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;

    let cancelled = false;

    const init = async () => {
      try {
        const [pickupCoords, destCoords] = await Promise.all([
          geocode(pickupQuery, token),
          geocode(destQuery, token),
        ]);

        if (cancelled || !pickupCoords || !destCoords || !mapContainer.current) {
          if (!cancelled) setError(true);
          setLoading(false);
          return;
        }

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

          // Load airplane icon
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
            // Start animation
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

          // Pickup marker
          addPulseMarker(map, pickupCoords, '#3B82F6', '📦');
          // Destination marker
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
  }, [token, pickupQuery, destQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token || error) return null;

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
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground capitalize">{mode}</span>
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
  // Inject pulse keyframes if not already present
  if (!document.getElementById('pulse-ring-style')) {
    const style = document.createElement('style');
    style.id = 'pulse-ring-style';
    style.textContent = `@keyframes pulse-ring{0%{transform:scale(1);opacity:0.25}100%{transform:scale(1.8);opacity:0}}`;
    document.head.appendChild(style);
  }
  new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat(coords).addTo(map);
}
