/**
 * useSamarkandWeather — DrivePass+
 *
 * One Open-Meteo call serving both weather consumers (the header chip and the rain
 * advisory), so opening the dashboard doesn't fire two near-identical requests at the same
 * free API. Fixed to Samarkand, matching the map's own SAMARKAND constant.
 *
 * Returns nulls on failure rather than throwing or inventing values -- every consumer is
 * expected to render nothing at all when the data isn't there.
 */

import { useState, useEffect } from 'react';

const SAMARKAND_LAT = 39.655;
const SAMARKAND_LON = 66.96;

export interface CurrentWeather {
  tempC: number;
  code: number;
}

export interface DayForecast {
  date: string;
  maxC: number;
  minC: number;
  code: number;
}

export interface HourForecast {
  /** Local Samarkand wall-clock, e.g. "2026-09-05T15:00" -- the API is queried in that tz. */
  time: string;
  /** Percent, 0-100. */
  precipitation: number;
  code: number;
}

export interface WeatherData {
  current: CurrentWeather | null;
  daily: DayForecast[] | null;
  hourly: HourForecast[] | null;
}

const EMPTY: WeatherData = { current: null, daily: null, hourly: null };

export function useSamarkandWeather(): WeatherData {
  const [data, setData] = useState<WeatherData>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${SAMARKAND_LAT}&longitude=${SAMARKAND_LON}` +
        `&current=temperature_2m,weather_code` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
        `&hourly=precipitation_probability,weather_code` +
        `&timezone=Asia/Tashkent&forecast_days=7`,
    )
      .then(r => (r.ok ? r.json() : null))
      .then(raw => {
        if (cancelled || !raw?.current) return;
        setData({
          current: {
            tempC: Math.round(raw.current.temperature_2m),
            code: raw.current.weather_code,
          },
          daily: raw.daily?.time
            ? raw.daily.time.map((date: string, i: number) => ({
                date,
                maxC: Math.round(raw.daily.temperature_2m_max[i]),
                minC: Math.round(raw.daily.temperature_2m_min[i]),
                code: raw.daily.weather_code[i],
              }))
            : null,
          hourly: raw.hourly?.time
            ? raw.hourly.time.map((time: string, i: number) => ({
                time,
                precipitation: raw.hourly.precipitation_probability?.[i] ?? 0,
                code: raw.hourly.weather_code[i],
              }))
            : null,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return data;
}
