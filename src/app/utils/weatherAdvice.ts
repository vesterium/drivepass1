/**
 * weatherAdvice — DrivePass+
 *
 * The decision logic behind WeatherAdvisory, kept free of React so it can be reasoned about
 * (and exercised) on its own: when is rain worth interrupting someone over, and which day
 * should we point them at instead.
 */

import type { DayForecast, HourForecast } from '../hooks/useSamarkandWeather';

/** Percent chance at which rain is worth interrupting someone over. */
export const RAIN_THRESHOLD = 60;
/** How far ahead a wash is considered "about to be undone". */
export const LOOKAHEAD_HOURS = 12;
/** WMO 0-3 = clear..overcast, i.e. nothing actually falling out of the sky. */
const DAY_CODE_DRY_MAX = 3;

export interface RainWindow {
  at: string;
  chance: number;
}

/**
 * Earliest hour within the lookahead where rain crosses the threshold.
 *
 * Earliest rather than heaviest: the client is deciding whether to wash *now*, so the
 * useful fact is when the dry spell ends, not when the downpour peaks.
 */
export function findRain(hourly: HourForecast[] | null, now: number = Date.now()): RainWindow | null {
  if (!hourly) return null;
  const horizon = now + LOOKAHEAD_HOURS * 3600_000;
  for (const hour of hourly) {
    const ts = new Date(hour.time).getTime();
    if (!Number.isFinite(ts) || ts < now) continue;
    if (ts > horizon) break;
    if (hour.precipitation >= RAIN_THRESHOLD) return { at: hour.time, chance: hour.precipitation };
  }
  return null;
}

/** Nearest upcoming day with nothing falling -- the "wash then instead" suggestion. */
export function findNextDryDay(daily: DayForecast[] | null): DayForecast | null {
  if (!daily) return null;
  return daily.slice(1).find(d => d.code <= DAY_CODE_DRY_MAX) ?? null;
}

const WEEKDAYS = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];

/** "завтра" when it's the next day, otherwise the weekday -- never a bare date. */
export function dryDayLabel(day: DayForecast, todayIso: string): string {
  const target = new Date(day.date);
  const today = new Date(todayIso);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 1) return 'завтра';
  return WEEKDAYS[target.getDay()] ?? 'на днях';
}

/** "2026-09-05T15:00" -> "15:00" */
export function hourLabel(iso: string): string {
  return iso.slice(11, 16);
}
