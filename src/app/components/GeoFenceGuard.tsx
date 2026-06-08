/**
 * GeoFenceGuard.tsx — DrivePass+
 * Геозащита: QR-код генерируется только в 500м от партнёрской мойки.
 * Мировой стандарт антифрода — как Uber Eats & Rappi delivery confirmation.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation, CheckCircle2, AlertTriangle, Loader2, Shield } from 'lucide-react';
import { ALL_CAR_WASHES, haversineMeters, USAGE_LIMITS } from '../constants/carWashes';
import { USAGE_LIMITS as LIMITS } from '../constants/pricing';
import { isNative, getCurrentPosition } from '../core/native/capacitor';

interface Coords {
  lat: number;
  lng: number;
}

// Реальные координаты всех партнёрских моек Узбекистана (из единого реестра)
const PARTNER_LOCATIONS = ALL_CAR_WASHES.map(w => ({
  id: w.id,
  name: `${w.name} · ${w.city}`,
  lat: w.lat,
  lng: w.lng,
}));

const GEOFENCE_RADIUS_M = LIMITS.geofenceRadiusM; // 500м
const DEV_OVERRIDE_ENABLED = import.meta.env.DEV;

type GeoStatus = 'idle' | 'checking' | 'inside' | 'outside' | 'denied' | 'error' | 'unavailable';

interface GeoFenceGuardProps {
  /** Вызывается когда пользователь в зоне (или dev-override) */
  onAllowed: () => void;
  /** Содержимое, пока идёт проверка (или уже пройдена) */
  children: React.ReactNode;
  /** Если true — блокирует children до подтверждения геозоны */
  blocking?: boolean;
}

export function GeoFenceGuard({ onAllowed, children, blocking = true }: GeoFenceGuardProps) {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [nearestWash, setNearestWash] = useState<{ name: string; distanceM: number } | null>(null);
  const [overridden, setOverridden] = useState(false);

  const handleDevOverride = useCallback(() => {
    setOverridden(true);
    onAllowed();
  }, [onAllowed]);

  const checkGeo = useCallback(async () => {
    // ── Native path: @capacitor/geolocation handles runtime permissions ────────
    if (isNative) {
      setStatus('checking');
      const coords = await getCurrentPosition();
      if (!coords) {
        if (DEV_OVERRIDE_ENABLED) { handleDevOverride(); return; }
        setStatus('denied');
        return;
      }

      let closest = { name: '', distanceM: Infinity };
      for (const loc of PARTNER_LOCATIONS) {
        const d = haversineMeters(coords, { lat: loc.lat, lng: loc.lng });
        if (d < closest.distanceM) {
          closest = { name: loc.name, distanceM: Math.round(d) };
        }
      }
      setNearestWash(closest);

      if (closest.distanceM <= GEOFENCE_RADIUS_M) {
        setStatus('inside');
        onAllowed();
      } else {
        setStatus('outside');
      }
      return;
    }

    // ── Web path: browser Geolocation API ─────────────────────────────────────

    // 1. Geolocation API совсем отсутствует
    if (!navigator.geolocation) {
      if (DEV_OVERRIDE_ENABLED) { handleDevOverride(); return; }
      setStatus('unavailable');
      return;
    }

    // 2. Внутри iframe — браузер блокирует geo по Permissions-Policy
    const inIframe = window.self !== window.top;
    if (inIframe && DEV_OVERRIDE_ENABLED) {
      handleDevOverride();
      return;
    }

    // 3. Permissions API: проверяем без вызова getCurrentPosition
    if ('permissions' in navigator) {
      try {
        const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (perm.state === 'denied') {
          if (DEV_OVERRIDE_ENABLED) { handleDevOverride(); return; }
          setStatus('denied');
          return;
        }
      } catch {
        // Permissions API не поддерживается — продолжаем к getCurrentPosition
      }
    }

    setStatus('checking');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const user: Coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        let closest = { name: '', distanceM: Infinity };
        for (const loc of PARTNER_LOCATIONS) {
          const d = haversineMeters(user, { lat: loc.lat, lng: loc.lng });
          if (d < closest.distanceM) {
            closest = { name: loc.name, distanceM: Math.round(d) };
          }
        }
        setNearestWash(closest);

        if (closest.distanceM <= GEOFENCE_RADIUS_M) {
          setStatus('inside');
          onAllowed();
        } else {
          setStatus('outside');
        }
      },
      (err) => {
        const msg = err.message ?? '';
        const isPolicy = msg.toLowerCase().includes('permissions policy') ||
                         msg.toLowerCase().includes('permission denied') ||
                         err.code === err.PERMISSION_DENIED;

        if (isPolicy && DEV_OVERRIDE_ENABLED) {
          handleDevOverride();
          return;
        }

        console.warn('[GeoFence]', msg);
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { timeout: 8000, maximumAge: 30_000, enableHighAccuracy: false },
    );
  }, [onAllowed, handleDevOverride]);

  useEffect(() => {
    // Для non-blocking режима: сначала сразу показываем children,
    // проверка идёт в фоне и вызывает onAllowed при успехе
    if (!blocking && DEV_OVERRIDE_ENABLED) {
      handleDevOverride();
      return;
    }
    checkGeo();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Non-blocking: всегда показываем children (проверка — фоновая)
  if (!blocking) {
    return <>{children}</>;
  }

  // Blocking: пускаем, как только подтверждено
  if (status === 'inside' || overridden) {
    return <>{children}</>;
  }

  // ── UI состояний (только для blocking режима) ────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="px-5 py-6"
      >
        {/* ── IDLE / CHECKING ── */}
        {(status === 'idle' || status === 'checking') && (
          <div className="flex flex-col items-center text-center gap-4 py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-4 border-blue-300 border-t-blue-600 flex-shrink-0"
            />
            <div>
              <p className="text-white font-black text-base mb-1">Определяем местоположение</p>
              <p className="text-blue-200 text-sm">Проверяем, что вы у мойки…</p>
            </div>
          </div>
        )}

        {/* ── OUTSIDE ── */}
        {status === 'outside' && nearestWash && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.3)' }}
            >
              <Navigation className="w-8 h-8 text-amber-300" />
            </motion.div>

            <h3 className="text-white font-black text-lg mb-1">Вы вне зоны мойки</h3>
            <p className="text-blue-200 text-sm mb-4">
              Ближайшая мойка: <span className="text-white font-semibold">{nearestWash.name}</span>
            </p>

            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <MapPin className="w-3.5 h-3.5 text-red-300" />
              <span className="text-red-200 text-sm font-bold">
                {nearestWash.distanceM >= 1000
                  ? `${(nearestWash.distanceM / 1000).toFixed(1)} км от мойки`
                  : `${nearestWash.distanceM} м от мойки`}
              </span>
            </div>

            <p className="text-blue-300 text-xs mb-5">
              QR-код активируется в радиусе {GEOFENCE_RADIUS_M} м от партнёрской мойки.
              Это защищает вас от мошенничества. 🛡️
            </p>

            <div
              className="rounded-xl p-3 mb-4 text-left"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5 text-blue-300" />
                <span className="text-xs text-blue-200 font-semibold">Как добраться</span>
              </div>
              <p className="text-blue-300 text-xs">
                Откройте вкладку <span className="text-white font-bold">«Локации»</span> → найдите мойку → нажмите «Маршрут»
              </p>
            </div>

            {DEV_OVERRIDE_ENABLED && (
              <button
                onClick={handleDevOverride}
                className="text-blue-300 text-xs underline opacity-50 hover:opacity-80 transition-opacity"
              >
                Dev: обойти геозону (только для разработки)
              </button>
            )}
          </div>
        )}

        {/* ── DENIED / ERROR / UNAVAILABLE ── */}
        {(status === 'denied' || status === 'error' || status === 'unavailable') && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertTriangle className="w-8 h-8 text-red-300" />
            </div>
            <h3 className="text-white font-black text-lg mb-1">Геолокация недоступна</h3>
            <p className="text-blue-200 text-sm mb-5">
              {status === 'denied'
                ? 'Разрешите доступ к геолокации в настройках браузера, чтобы подтвердить нахождение у мойки.'
                : status === 'unavailable'
                ? 'Геолокация не поддерживается вашим браузером.'
                : 'GPS сигнал не найден. Проверьте подключение.'}
            </p>

            <div className="flex flex-col gap-2.5">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={checkGeo}
                className="w-full py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: '#2563eb', minHeight: 0 }}
              >
                <Loader2 className="w-4 h-4" />
                Попробовать снова
              </motion.button>

              {DEV_OVERRIDE_ENABLED && (
                <button
                  onClick={handleDevOverride}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', minHeight: 0 }}
                >
                  <Shield className="w-4 h-4" />
                  Пропустить проверку
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── INSIDE badge (shown briefly) ── */}
        {status === 'inside' && (
          <div className="flex flex-col items-center text-center gap-3 py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.2)', border: '2px solid rgba(34,197,94,0.5)' }}
            >
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </motion.div>
            <p className="text-white font-black text-base">Вы у мойки!</p>
            <p className="text-green-300 text-sm">
              {nearestWash?.name} · {nearestWash?.distanceM} м
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
