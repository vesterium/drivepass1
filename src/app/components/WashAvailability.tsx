/**
 * WashAvailability — DrivePass+
 *
 * The one fact a subscriber actually wants on opening the app: can I wash right now, and if
 * not, when. Sits in the header gap above the scan button.
 *
 * Backed by GET /visits/availability, which runs the same _check_eligibility the real charge
 * runs -- so this can never say "можно мыть" for a wash scan_wash_qr would then refuse.
 * Renders nothing without an active subscription: the subscription card right below already
 * covers that case, and an empty-state chip there would just be noise.
 */

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, Clock } from 'lucide-react';
import { apiHeaders, apiUrl } from '../utils/apiClient';

interface Availability {
  canWash: boolean;
  reason: string | null;
  nextAvailableAt: string | null;
  washesLeft: number;
}

/** "через 4 ч" / "через 25 мин" -- the wait, not a wall-clock time the user has to subtract from. */
function formatWait(iso: string): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `через ${minutes} мин`;
  const hours = Math.round(minutes / 60);
  return `через ${hours} ч`;
}

export function WashAvailability({ accessToken, className = '' }: { accessToken: string | null; className?: string }) {
  const [data, setData] = useState<Availability | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return;
    fetch(apiUrl('/visits/availability'), { headers: apiHeaders(accessToken) })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [accessToken]);

  if (!data || data.reason === 'no_subscription') return null;

  const wait = data.nextAvailableAt ? formatWait(data.nextAvailableAt) : null;

  let text: string;
  let detail: string;
  if (data.canWash) {
    text = 'Можно мыть сейчас';
    detail = data.washesLeft === 1 ? 'осталась 1 мойка' : `осталось ${data.washesLeft} моек`;
  } else if (data.reason === 'exhausted') {
    text = 'Мойки закончились';
    detail = 'продлите подписку';
  } else if (data.reason === 'daily_limit') {
    text = 'Сегодня уже мыли';
    detail = wait ? `следующая ${wait}` : 'следующая завтра';
  } else {
    text = 'Мойка недоступна';
    detail = wait ? `можно ${wait}` : 'подождите немного';
  }

  const ready = data.canWash;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, type: 'spring', stiffness: 380, damping: 32 }}
      className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 ${className}`}
      style={{
        background: ready ? 'rgba(52,211,153,0.16)' : 'rgba(255,255,255,0.10)',
        border: `1px solid ${ready ? 'rgba(52,211,153,0.32)' : 'rgba(255,255,255,0.15)'}`,
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: ready ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.12)' }}
      >
        {ready ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
        ) : (
          <Clock className="w-4 h-4 text-blue-200" />
        )}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold leading-tight ${ready ? 'text-emerald-100' : 'text-white'}`}>{text}</p>
        <p className="text-[11px] text-blue-200 mt-0.5">{detail}</p>
      </div>
    </motion.div>
  );
}
