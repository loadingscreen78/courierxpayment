"use client";

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapPoint {
  label: string;
  address: string;
  color: string;
}

interface ShipmentMapProps {
  origin: string;
  destination: string;
  destinationCountry?: string;
  currentLeg: string;
  currentStatus: string;
}

// Geocode an address string to [lng, lat] using Mapbox Geocoding API
async function geocode(address: string, token: string): Promise<[number, number] | null> {
  if (!address || address.length < 3) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`
    );
    const data = await res.json();
    const coords = data?.features?.[0]?.center;
    return coords ? [coords[0], coords[1]] : null;
  } catch {
    return null;
  }
}

// CourierX warehouse locations for the route midpoint
const WAREHOUSES: Record<string, [number, number]> = {
  maharashtra: [73.8567, 18.5204], // Pune
  odisha: [85.8830, 20.4625],      // Cuttack
};

export default function ShipmentMap({ origin, destination, destinationCountry, currentLeg, currentStatus }: ShipmentMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;

    const initMap = async () => {
      try {
        // Geocode origin and destination
        const [originCoords, destCoords] = await Promise.all([
          geocode(origin, token),
          geocode(destination + (destinationCountry ? `, ${destinationCountry}` : ''), token),
        ]);

        if (!originCoords && !destCoords) {
          setMapError(true);
          return;
        }

        // Pick warehouse midpoint (default to Maharashtra)
        const warehouseCoords = WAREHOUSES.odisha; // Default; could be dynamic

        // Build route points
        const points: [number, number][] = [];
        if (originCoords) points.push(originCoords);
        // Add warehouse as midpoint for international shipments
        if (destinationCountry && destinationCountry !== 'IN') {
          points.push(warehouseCoords);
        }
        if (destCoords) points.push(destCoords);

        if (points.length < 2) {
          setMapError(true);
          return;
        }

        // Calculate bounds
        const lngs = points.map(p => p[0]);
        const lats = points.map(p => p[1]);
        const bounds = new mapboxgl.LngLatBounds(
          [Math.min(...lngs) - 2, Math.min(...lats) - 2],
          [Math.max(...lngs) + 2, Math.max(...lats) + 2]
        );

        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          bounds,
          fitBoundsOptions: { padding: 60 },
          interactive: true,
          attributionControl: false,
        });

        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

        map.on('load', () => {
          // Add route line
          const routeCoords = points;

          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: routeCoords },
            },
          });

          // Dashed background line
          map.addLayer({
            id: 'route-bg',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#ffffff', 'line-width': 2, 'line-opacity': 0.15 },
          });

          // Animated route line
          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '#F40000',
              'line-width': 3,
              'line-dasharray': [2, 2],
            },
          });

          // Add markers
          const markerConfigs: { coords: [number, number]; label: string; color: string; size: string }[] = [];

          if (originCoords) {
            markerConfigs.push({ coords: originCoords, label: '📦 Pickup', color: '#3B82F6', size: '12px' });
          }
          if (destinationCountry && destinationCountry !== 'IN') {
            markerConfigs.push({ coords: warehouseCoords, label: '🏭 Warehouse', color: '#F59E0B', size: '12px' });
          }
          if (destCoords) {
            markerConfigs.push({ coords: destCoords, label: '📍 Delivery', color: '#10B981', size: '12px' });
          }

          markerConfigs.forEach(({ coords, label, color }) => {
            const el = document.createElement('div');
            el.style.cssText = `
              width: 32px; height: 32px; border-radius: 50%;
              background: ${color}; border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
            `;

            new mapboxgl.Marker({ element: el })
              .setLngLat(coords)
              .setPopup(new mapboxgl.Popup({ offset: 25, closeButton: false })
                .setHTML(`<div style="font-family:system-ui;font-size:13px;font-weight:600;padding:2px 4px;">${label}</div>`))
              .addTo(map);
          });

          // Animate dash offset
          let dashOffset = 0;
          const animateDash = () => {
            dashOffset = (dashOffset + 0.5) % 4;
            map.setPaintProperty('route-line', 'line-dasharray', [2, 2]);
            requestAnimationFrame(animateDash);
          };
          animateDash();
        });

        mapRef.current = map;
      } catch (err) {
        console.error('[ShipmentMap] Error:', err);
        setMapError(true);
      }
    };

    initMap();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token, origin, destination, destinationCountry, currentLeg, currentStatus]);

  if (!token || mapError) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
      <div ref={mapContainer} style={{ width: '100%', height: '280px' }} />
    </div>
  );
}
