/**
 * WeatherWidget — DrivePass+
 *
 * Open-Meteo — free, no API key, same "don't add paid infra we don't need" choice already
 * made for the map (Leaflet + OpenStreetMap). Fixed to Samarkand for now, matching the map's
 * own SAMARKAND constant -- per-user location isn't worth the geolocation prompt for a
 * single-city product yet.
 */

import { useState, useEffect } from 'react';
import { Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Sun, CloudSun } from 'lucide-react';

const SAMARKAND_LAT = 39.655;
const SAMARKAND_LON = 66.96;

interface WeatherState {
  tempC: number;
  code: number;
}

// WMO weather codes -> icon + short Russian label. Buckets, not a 1:1 code map -- covers
// everything Open-Meteo returns without needing all ~30 codes spelled out.
function describeCode(code: number): { Icon: typeof Sun; label: string } {
  if (code === 0) return { Icon: Sun, label: 'Ясно' };
  if (code <= 2) return { Icon: CloudSun, label: 'Малооблачно' };
  if (code === 3) return { Icon: Cloud, label: 'Облачно' };
  if (code === 45 || code === 48) return { Icon: CloudFog, label: 'Туман' };
  if (code >= 51 && code <= 67) return { Icon: CloudRain, label: 'Дождь' };
  if (code >= 71 && code <= 77) return { Icon: CloudSnow, label: 'Снег' };
  if (code >= 80 && code <= 82) return { Icon: CloudRain, label: 'Ливень' };
  if (code >= 95) return { Icon: CloudLightning, label: 'Гроза' };
  return { Icon: Cloud, label: 'Облачно' };
}

export function WeatherWidget({ className = '' }: { className?: string }) {
  const [weather, setWeather] = useState<WeatherState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${SAMARKAND_LAT}&longitude=${SAMARKAND_LON}&current=temperature_2m,weather_code&timezone=Asia/Tashkent`,
    )
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data?.current) return;
        setWeather({ tempC: Math.round(data.current.temperature_2m), code: data.current.weather_code });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // No fake placeholder while loading or on failure -- the chip simply doesn't render
  // rather than show a fabricated temperature.
  if (!weather) return null;

  const { Icon, label } = describeCode(weather.code);

  return (
    <div
      className={`inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 ${className}`}
    >
      <Icon className="w-3.5 h-3.5 text-blue-200" />
      <span className="text-xs font-semibold text-white">{weather.tempC}°</span>
      <span className="text-xs text-blue-200">· {label} · Самарканд</span>
    </div>
  );
}
