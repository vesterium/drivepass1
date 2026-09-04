/**
 * WeatherWidget — DrivePass+
 *
 * Open-Meteo — free, no API key, same "don't add paid infra we don't need" choice already
 * made for the map (Leaflet + OpenStreetMap). Fixed to Samarkand for now, matching the map's
 * own SAMARKAND constant -- per-user location isn't worth the geolocation prompt for a
 * single-city product yet.
 *
 * Tap the chip to reveal a 7-day strip -- stays a single compact chip by default, the week
 * is opt-in, not shown up front.
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, Sun, CloudSun, ChevronDown } from 'lucide-react';

const SAMARKAND_LAT = 39.655;
const SAMARKAND_LON = 66.96;
const WEEKDAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

interface WeatherState {
  tempC: number;
  code: number;
}

interface DayForecast {
  date: string;
  maxC: number;
  minC: number;
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

function dayLabel(dateStr: string, index: number): string {
  if (index === 0) return 'Сегодня';
  const d = new Date(dateStr);
  return WEEKDAY_LABELS[d.getDay()];
}

export function WeatherWidget({ className = '' }: { className?: string }) {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [daily, setDaily] = useState<DayForecast[] | null>(null);
  const [expanded, setExpanded] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${SAMARKAND_LAT}&longitude=${SAMARKAND_LON}` +
        `&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&timezone=Asia/Tashkent&forecast_days=7`,
    )
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data?.current) return;
        setWeather({ tempC: Math.round(data.current.temperature_2m), code: data.current.weather_code });
        if (data.daily?.time) {
          setDaily(
            data.daily.time.map((date: string, i: number) => ({
              date,
              maxC: Math.round(data.daily.temperature_2m_max[i]),
              minC: Math.round(data.daily.temperature_2m_min[i]),
              code: data.daily.weather_code[i],
            })),
          );
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // No fake placeholder while loading or on failure -- the chip simply doesn't render
  // rather than show a fabricated temperature.
  if (!weather) return null;

  const { Icon, label } = describeCode(weather.code);

  return (
    <div className={`flex flex-col items-end ${className}`}>
      {/* The chip appears only once the fetch lands, so it would otherwise pop in mid-render
          -- a short fade settles it instead of snapping the header layout. */}
      <motion.button
        initial={reduce ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
        whileTap={daily && !reduce ? { scale: 0.96 } : undefined}
        onClick={() => daily && setExpanded(p => !p)}
        className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 transition-colors hover:bg-white/15"
        style={{ minHeight: 0 }}
      >
        <Icon className="w-3.5 h-3.5 text-blue-200" />
        <span className="text-xs font-semibold text-white">{weather.tempC}°</span>
        <span className="text-xs text-blue-200">· {label} · Самарканд</span>
        {daily && (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="inline-flex"
          >
            <ChevronDown className="w-3 h-3 text-blue-200" />
          </motion.span>
        )}
      </motion.button>

      {/* AnimatePresence so collapsing animates too -- the previous version unmounted the
          strip instantly, which read as a glitch next to the chip's own transition. */}
      <AnimatePresence initial={false}>
        {expanded && daily && (
          <motion.div
            key="week"
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={
              reduce
                ? { duration: 0.12 }
                : { height: { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }, opacity: { duration: 0.18 } }
            }
            style={{ overflow: 'hidden' }}
          >
            <div className="flex gap-1.5 mt-2 bg-white/10 border border-white/15 rounded-2xl px-2.5 py-2 overflow-x-auto scrollbar-none">
              {daily.map((day, i) => {
                const { Icon: DayIcon } = describeCode(day.code);
                return (
                  <motion.div
                    key={day.date}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: reduce ? 0 : 0.05 + i * 0.035, type: 'spring', stiffness: 460, damping: 30 }}
                    className="flex flex-col items-center gap-1 px-1.5 flex-shrink-0"
                    style={{ minWidth: 40 }}
                  >
                    <span className="text-[10px] text-blue-200 font-medium">{dayLabel(day.date, i)}</span>
                    <DayIcon className="w-3.5 h-3.5 text-blue-200" />
                    <span className="text-[11px] text-white font-semibold">{day.maxC}°</span>
                    <span className="text-[10px] text-blue-300">{day.minC}°</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
