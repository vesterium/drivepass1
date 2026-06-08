/**
 * Map.tsx (exported as YandexMap for backward compat)  —  DrivePass+
 *
 * Leaflet + OpenStreetMap — работает БЕЗ API-ключа, полностью бесплатно.
 * Те же пропсы, та же логика — просто меняем движок карты.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { LocateFixed, Loader2 } from 'lucide-react';
import { CITY_CENTERS } from '../constants/carWashes';

// ─── Public types (used by Locations.tsx) ────────────────────────────
export interface CarWashMarker {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  openNow: boolean;
  hasGreenCorridor: boolean;
  drivepassPartner?: boolean;
  district?: string;
  phone?: string;
  reviews?: number;
  hours?: string;
  distanceKm?: number;
  services?: string[];
}

interface Props {
  carWashes: CarWashMarker[];
  selectedId: string | null;
  onSelectWash: (id: string) => void;
  className?: string;
  centerCity?: string;
}

// Keep this export so nothing breaks if anyone imported it
export const YANDEX_MAPS_API_KEY = '';

const SAMARKAND: [number, number] = [39.6550, 66.9600];
const UZ_CENTER: [number, number] = [41.0, 64.5]; // center of Uzbekistan for "all" view

// ─── Build custom SVG pin ─────────────────────────────────────────────
function makePinSvg(wash: CarWashMarker, selected: boolean): string {
  const pinColor  = selected ? '#4f46e5' : wash.openNow ? '#2563eb' : '#6b7280';
  const icon      = wash.hasGreenCorridor ? '★' : '●';
  const iconSize  = wash.hasGreenCorridor ? 13 : 10;
  const iconColor = wash.hasGreenCorridor ? '#16a34a' : pinColor;
  const scale     = selected ? 1.3 : 1;

  return `
    <svg width="${40 * scale}" height="${52 * scale}" viewBox="0 0 40 52"
         xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2C11.716 2 5 8.716 5 17c0 4.24 1.652 8.093 4.34 10.97L20 50
               l10.66-22.03C33.348 25.093 35 21.24 35 17 35 8.716 28.284 2 20 2z"
            fill="${pinColor}" filter="drop-shadow(0 3px 5px rgba(0,0,0,.30))"/>
      <circle cx="20" cy="17" r="10" fill="white" opacity=".95"/>
      <text x="20" y="21" font-family="Arial,sans-serif"
            font-size="${iconSize}" font-weight="700" text-anchor="middle"
            fill="${iconColor}">${icon}</text>
    </svg>
  `;
}

// ─── Component ────────────────────────────────────────────────────────
export function YandexMap({ carWashes, selectedId, onSelectWash, className = '', centerCity }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const markerRefs    = useRef<Map<string, any>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const [ready, setReady]       = useState(false);
  const [locating, setLocating] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // ── Dynamically load Leaflet CSS + JS ────────────────────────────
  useEffect(() => {
    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id   = cssId;
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet/dist/leaflet.css';
      link.onerror = () => {
        console.error('[YandexMap] Failed to load Leaflet CSS');
        setLoadError(true);
      };
      document.head.appendChild(link);
    }

    const loadLeaflet = (): Promise<any> => {
      if ((window as any).L) return Promise.resolve((window as any).L);
      return new Promise((resolve, reject) => {
        const s  = document.createElement('script');
        s.src    = 'https://unpkg.com/leaflet/dist/leaflet.js';
        s.async  = true;
        s.onload = () => resolve((window as any).L);
        s.onerror = () => {
          console.error('[YandexMap] Failed to load Leaflet JS');
          reject(new Error('Leaflet load failed'));
        };
        document.head.appendChild(s);
      });
    };

    let cancelled = false;

    loadLeaflet()
      .then((L: any) => {
        if (cancelled || !containerRef.current || mapRef.current) return;

        // Fix broken default icon paths (Leaflet + bundler quirk)
        try {
          L.Icon.Default.prototype.options.imagePath =
            'https://unpkg.com/leaflet/dist/images/';
        } catch (e) {
          console.warn('[YandexMap] Icon path setup failed:', e);
        }

        const defaultCenter = centerCity && CITY_CENTERS[centerCity]
          ? CITY_CENTERS[centerCity]
          : carWashes.length > 0
            ? [carWashes[0].lat, carWashes[0].lng] as [number, number]
            : UZ_CENTER;
        const defaultZoom = centerCity ? 13 : 6;

        const map = L.map(containerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          zoomControl: false,
          attributionControl: false,
        });

        // Zoom control top-right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // OpenStreetMap tiles — no key needed
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        // Attribution (small, bottom-right)
        L.control.attribution({ position: 'bottomright', prefix: false })
          .addAttribution('© <a href="https://openstreetmap.org">OSM</a>')
          .addTo(map);

        // Add car-wash markers
        for (const wash of carWashes) {
          const isSelected = wash.id === selectedId;
          const svgHtml    = makePinSvg(wash, isSelected);
          const w = isSelected ? 52 : 40;
          const h = isSelected ? 67 : 52;

          const icon = L.divIcon({
            html: svgHtml,
            className: '',
            iconSize: [w, h],
            iconAnchor: [w / 2, h],
          });

          const marker = L.marker([wash.lat, wash.lng], { icon })
            .addTo(map)
            .on('click', () => onSelectWash(wash.id));

          markerRefs.current.set(wash.id, marker);
        }

        mapRef.current = map;
        setReady(true);
      })
      .catch(err => {
        console.error('[YandexMap] Map initialization failed:', err);
        setLoadError(true);
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync selected marker appearance + fly-to ─────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L: any = (window as any).L;
    if (!L) return;

    markerRefs.current.forEach((marker, id) => {
      const wash = carWashes.find(w => w.id === id);
      if (!wash) return;
      const isSelected = id === selectedId;
      const svgHtml    = makePinSvg(wash, isSelected);
      const w = isSelected ? 52 : 40;
      const h = isSelected ? 67 : 52;

      marker.setIcon(L.divIcon({
        html: svgHtml,
        className: '',
        iconSize: [w, h],
        iconAnchor: [w / 2, h],
      }));
    });

    if (selectedId) {
      const wash = carWashes.find(w => w.id === selectedId);
      if (wash) mapRef.current.flyTo([wash.lat, wash.lng], 15, { duration: 0.6 });
    }
  }, [selectedId, ready]);

  // ── Re-center when city changes ───────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (centerCity && CITY_CENTERS[centerCity]) {
      mapRef.current.flyTo(CITY_CENTERS[centerCity], 13, { duration: 0.8 });
    } else if (!centerCity && carWashes.length > 0) {
      // Fit bounds for all markers
      const L: any = (window as any).L;
      if (L && carWashes.length > 1) {
        const bounds = L.latLngBounds(carWashes.map((w: any) => [w.lat, w.lng]));
        mapRef.current.flyToBounds(bounds, { padding: [30, 30], duration: 0.8 });
      }
    }
  }, [centerCity, ready]);

  // ── Rebuild markers when carWashes change ─────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L: any = (window as any).L;
    if (!L) return;

    // Remove old markers
    markerRefs.current.forEach(marker => marker.remove());
    markerRefs.current.clear();

    // Add new markers
    for (const wash of carWashes) {
      const isSelected = wash.id === selectedId;
      const svgHtml = makePinSvg(wash, isSelected);
      const w = isSelected ? 52 : 40;
      const h = isSelected ? 67 : 52;

      const icon = L.divIcon({
        html: svgHtml,
        className: '',
        iconSize: [w, h],
        iconAnchor: [w / 2, h],
      });

      const marker = L.marker([wash.lat, wash.lng], { icon })
        .addTo(mapRef.current)
        .on('click', () => onSelectWash(wash.id));

      markerRefs.current.set(wash.id, marker);
    }
  }, [carWashes, ready]);

  // ── Geolocation ───────────────────────────────────────────────────
  const handleLocate = useCallback(() => {
    if (!navigator.geolocation || !mapRef.current) return;
    const L: any = (window as any).L;
    if (!L) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocating(false);

        if (userMarkerRef.current) userMarkerRef.current.remove();

        // Pulsing user dot
        const el = document.createElement('div');
        el.innerHTML = `
          <style>@keyframes dp-pulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}
          70%{box-shadow:0 0 0 12px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}</style>
          <div style="width:22px;height:22px;border-radius:50%;background:#ef4444;
                      border:3px solid white;animation:dp-pulse 2s ease-out infinite"></div>`;

        userMarkerRef.current = L.marker([lat, lng], {
          icon: L.divIcon({ html: el.innerHTML, className: '', iconSize: [22, 22], iconAnchor: [11, 11] }),
        }).addTo(mapRef.current);

        mapRef.current.flyTo([lat, lng], 15, { duration: 0.6 });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Map container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading shimmer */}
      {!ready && !loadError && (
        <div className="absolute inset-0 bg-blue-50 flex flex-col items-center justify-center z-20 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-blue-600 text-sm">Загрузка карты…</p>
        </div>
      )}

      {/* Error fallback */}
      {loadError && (
        <div className="absolute inset-0 bg-gray-50 flex flex-col items-center justify-center z-20 gap-3 p-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            <LocateFixed className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-gray-700 text-sm font-medium">Карта временно недоступна</p>
            <p className="text-gray-500 text-xs mt-1">Используйте список моек ниже</p>
          </div>
        </div>
      )}

      {/* Geolocation FAB */}
      {ready && !loadError && (
        <button
          onClick={handleLocate}
          disabled={locating}
          title="Моё местоположение"
          className="absolute bottom-4 right-4 z-[400] bg-white rounded-full p-3
                     shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-60"
        >
          {locating
            ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            : <LocateFixed className="w-5 h-5 text-blue-600" />
          }
        </button>
      )}
    </div>
  );
}
