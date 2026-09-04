/**
 * WeatherAdvisory — DrivePass+
 *
 * A wash is a scarce resource here: a plan carries 2-8 of them across 45 days, and one
 * spent an hour before a downpour is simply gone. So this doesn't report the weather --
 * the header chip already does that -- it warns before the client burns a wash on a day
 * the rain will undo, and points at the next dry day when there is one.
 *
 * Deliberately quiet:
 *  - only when rain is actually likely (>= RAIN_THRESHOLD within the next 12h)
 *  - only for someone who has a subscription to spend
 *  - once per calendar day, dismissal remembered per device
 *  - after the dashboard's own entrance animation, not competing with it
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CloudRain, X, Sun } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { DayForecast, HourForecast } from '../hooks/useSamarkandWeather';
import { findRain, findNextDryDay, dryDayLabel, hourLabel } from '../utils/weatherAdvice';

const DISMISS_KEY = 'drivepass_weather_advisory_dismissed';
/** Let the dashboard finish animating in before saying anything. */
const APPEAR_DELAY_MS = 1400;


function readDismissedDate(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY);
  } catch {
    // Private windows and blocked site-data throw on access -- treat as "not dismissed"
    // rather than letting the whole dashboard fail.
    return null;
  }
}

function writeDismissedDate(date: string): void {
  try {
    localStorage.setItem(DISMISS_KEY, date);
  } catch {
    // Nothing to do: worst case the advisory shows again next open.
  }
}

interface WeatherAdvisoryProps {
  hourly: HourForecast[] | null;
  daily: DayForecast[] | null;
  /** No point warning someone who has no wash to spend. */
  enabled: boolean;
}

export function WeatherAdvisory({ hourly, daily, enabled }: WeatherAdvisoryProps) {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  const rain = enabled && hourly ? findRain(hourly) : null;
  const todayIso = daily?.[0]?.date ?? '';

  useEffect(() => {
    if (!rain || !todayIso) return;
    if (readDismissedDate() === todayIso) return;
    const timer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => clearTimeout(timer);
  }, [rain?.at, todayIso]);

  const close = () => {
    setVisible(false);
    if (todayIso) writeDismissedDate(todayIso);
  };

  if (!rain) return null;

  const dryDay = findNextDryDay(daily);

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          key="advisory-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[9998] flex items-end justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
          onClick={e => { if (e.target === e.currentTarget) close(); }}
        >
          <motion.div
            key="advisory-card"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
            transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 32, mass: 0.9 }}
            className="w-full max-w-sm bg-white rounded-3xl overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(15,23,42,0.28)', marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-start gap-3.5 p-5 pb-4">
              <motion.div
                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.08, type: 'spring', stiffness: 420, damping: 22 }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#eff6ff' }}
              >
                <CloudRain className="w-5 h-5 text-blue-500" />
              </motion.div>

              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-gray-900 leading-tight">
                  Скоро дождь — мойка может пропасть
                </p>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                  Около <span className="font-semibold text-gray-700">{hourLabel(rain.at)}</span> ожидается дождь,
                  вероятность {rain.chance}%.
                  {dryDay && (
                    <> Сухо будет <span className="font-semibold text-gray-700">{dryDayLabel(dryDay, todayIso)}</span> — возможно, лучше помыть тогда.</>
                  )}
                </p>
              </div>

              <motion.button
                whileTap={reduce ? undefined : { scale: 0.88 }}
                onClick={close}
                aria-label="Закрыть"
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
                style={{ minHeight: 0 }}
              >
                <X className="w-4 h-4 text-gray-500" />
              </motion.button>
            </div>

            {dryDay && (
              <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50/60">
                <Sun className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-xs text-gray-500">
                  {dryDayLabel(dryDay, todayIso).replace(/^в /, '')}: до {dryDay.maxC}°, без осадков
                </span>
              </div>
            )}

            <div className="px-5 pb-5 pt-1">
              <motion.button
                whileTap={reduce ? undefined : { scale: 0.98 }}
                onClick={close}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm"
              >
                Понятно
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
