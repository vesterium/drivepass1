/**
 * QRDisplay — DrivePass+
 *
 * Антифрод-логика (согласно supabase-anti-fraud.txt):
 *  • Кулдаун проверяется через supabase.rpc('check_wash_eligibility', { vehicle_plate_input })
 *    вместо REST /cooldown — данные идут напрямую из БД, минуя Edge Function.
 *  • eligible: true  → показываем анимированный QR-код
 *  • eligible: false → показываем WashCooldownScreen «Ваша машина ещё чистая!»
 *
 * QR-стратегия (двойной режим):
 *  1. LOCAL QR: { userId, carNumber, timestamp } — всегда доступен, обновляется каждые 30 сек
 *  2. SERVER QR (HMAC-токен): запрашивается в фоне через Edge Function /qr/generate
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Clock, Car, CheckCircle2, Lock, WifiOff } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { apiHeaders } from '../utils/apiClient';
import { WashCooldownScreen } from './WashCooldownScreen';
import { useSubscription } from '../contexts/SubscriptionContext';
import { GeoFenceGuard } from './GeoFenceGuard';
import { nativeStorage } from '../core/native/storage';

const QR_CACHE_KEY = 'drivepass_qr_offline_cache';

interface QRDisplayProps {
  accessToken: string;
  user: any;
  onNeedSubscription: () => void;
}

interface ServerQRData {
  token: string;
  expiresAt: number;
  carPlate: string;
}

// ── Хелпер: форматирует секунды в «Xч Yм» ───────────────────────────────────
function fmtCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

export function QRDisplay({ accessToken, user, onNeedSubscription }: QRDisplayProps) {
  // ── Read from SubscriptionContext first — avoids unnecessary server call ──
  const { hasActiveSubscription, loading: subContextLoading } = useSubscription();

  // ── LOCAL QR (всегда доступен) ────────────────────────────────────────────
  const [localTs, setLocalTs] = useState(() => Math.floor(Date.now() / 30000) * 30000);

  // ── SERVER QR (в фоне) ───────────────────────────────────────────────────
  const [serverQR,         setServerQR]         = useState<ServerQRData | null>(null);
  const [serverSecondsLeft, setServerSecondsLeft] = useState(0);
  const [refreshing,       setRefreshing]       = useState(false);

  // ── Состояния-ограничители ───────────────────────────────────────────────
  const [noSubscription,   setNoSubscription]   = useState(false);
  const [cooldownSecs,     setCooldownSecs]     = useState<number | null>(null);
  const [offlineMode,      setOfflineMode]      = useState(false);
  const [initialLoading,   setInitialLoading]   = useState(true);

  const serverTimerRef  = useRef<ReturnType<typeof setInterval>  | null>(null);
  const serverRefreshRef = useRef<ReturnType<typeof setTimeout>   | null>(null);
  const initDoneRef     = useRef(false);

  const API      = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;
  const headers  = apiHeaders(accessToken);

  const userId   = user?.id ?? 'unknown';
  const carNumber = user?.user_metadata?.car_number ?? '';
  const carPlate  = serverQR?.carPlate || carNumber || 'N/A';

  // ── 30-секундный таймер LOCAL QR ─────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setLocalTs(Math.floor(Date.now() / 30000) * 30000);
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  // ── Проверка кулдауна через supabase.rpc ─────────────────────────────────
  const checkEligibility = useCallback(async (): Promise<boolean> => {
    if (!carNumber) return true;
    try {
      const { data, error } = await supabase.rpc('check_wash_eligibility', {
        vehicle_plate_input: carNumber,
      });
      if (error) {
        const isMissingFn = error.message.includes('schema cache') || error.message.includes('Could not find');
        if (!isMissingFn) console.warn('[QR] RPC error:', error.message);
        setCooldownSecs(null);
        return true;
      }
      const result = data as { eligible: boolean; seconds_remaining: number };
      if (!result.eligible) {
        setCooldownSecs(result.seconds_remaining);
        return false;
      }
      setCooldownSecs(null);
      return true;
    } catch {
      return true;
    }
  }, [carNumber]);

  // ── Запрос серверного QR ─────────────────────────────────────────────────
  const fetchServerQR = useCallback(async () => {
    if (!accessToken) return;
    setRefreshing(true);
    try {
      const res  = await fetch(`${API}/qr/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setNoSubscription(true);
          // 403 is expected when subscription is absent — not a real error
          console.log('[QR] No active subscription — showing subscribe screen');
        } else if (res.status === 429 && data.cooldown) {
          setCooldownSecs(data.secondsRemaining ?? 3600);
        } else {
          console.warn('[QR] Server QR error:', res.status, data.error);
        }
        return;
      }

      setNoSubscription(false);
      setCooldownSecs(null);
      setServerQR({ token: data.token, expiresAt: data.expiresAt, carPlate: data.carPlate });
      setServerSecondsLeft(Math.floor((data.expiresAt - Date.now()) / 1000));

      // Cache QR for offline use — works on both native (Preferences) and web (SW or localStorage)
      const cachePayload = { userId: accessToken.slice(0, 20), ...data, cachedAt: Date.now() };
      nativeStorage.setItem(QR_CACHE_KEY, JSON.stringify(cachePayload)).catch(() => {});
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const mc = new MessageChannel();
        navigator.serviceWorker.controller.postMessage(
          { type: 'SAVE_QR_OFFLINE', data: cachePayload },
          [mc.port2]
        );
      }

      if (serverRefreshRef.current) clearTimeout(serverRefreshRef.current);
      const refreshIn = data.expiresAt - Date.now() - 30_000;
      if (refreshIn > 0) {
        serverRefreshRef.current = setTimeout(fetchServerQR, refreshIn);
      }
    } catch {
      setOfflineMode(true);
      // Try native Preferences cache first (works on both native and web)
      const nativeCached = await nativeStorage.getItem(QR_CACHE_KEY).catch(() => null);
      if (nativeCached) {
        try {
          const parsed = JSON.parse(nativeCached);
          if (parsed?.expiresAt > Date.now()) {
            setServerQR({ token: parsed.token, expiresAt: parsed.expiresAt, carPlate: parsed.carPlate });
            setServerSecondsLeft(Math.floor((parsed.expiresAt - Date.now()) / 1000));
          }
        } catch {}
      } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const mc = new MessageChannel();
        const cached = await new Promise<any>((resolve) => {
          mc.port1.onmessage = (e) => resolve(e.data.cached);
          navigator.serviceWorker.controller!.postMessage(
            { type: 'GET_QR_OFFLINE', data: { userId: accessToken.slice(0, 20) } },
            [mc.port2]
          );
          setTimeout(() => resolve(null), 1000);
        });
        if (cached && cached.expiresAt > Date.now()) {
          setServerQR({ token: cached.token, expiresAt: cached.expiresAt, carPlate: cached.carPlate });
          setServerSecondsLeft(Math.floor((cached.expiresAt - Date.now()) / 1000));
        }
      }
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, [accessToken]);

  // ── И��ициализация: ждём SubscriptionContext, потом запускаем ─────────────
  // Short-circuit: если контекст уже знает, что подписки нет — не идём на сервер
  useEffect(() => {
    if (subContextLoading) return;          // ещё загружается — ждём
    if (initDoneRef.current) return;        // уже запустили
    initDoneRef.current = true;

    if (!hasActiveSubscription) {
      // Контекст говорит: нет подписки — сразу показываем экран без лишнего запроса
      setNoSubscription(true);
      setInitialLoading(false);
      return;
    }

    (async () => {
      const eligible = await checkEligibility();
      if (eligible) {
        await fetchServerQR();
      } else {
        setInitialLoading(false);
      }
    })();
  }, [subContextLoading, hasActiveSubscription]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (serverTimerRef.current)  clearInterval(serverTimerRef.current);
      if (serverRefreshRef.current) clearTimeout(serverRefreshRef.current);
    };
  }, []);

  // ── Таймер обратного отсчёта серверного QR ───────────────────────────────
  useEffect(() => {
    if (serverTimerRef.current) clearInterval(serverTimerRef.current);
    if (serverQR) {
      serverTimerRef.current = setInterval(() => {
        const left = Math.floor((serverQR.expiresAt - Date.now()) / 1000);
        setServerSecondsLeft(left);
        if (left <= 0) {
          clearInterval(serverTimerRef.current!);
          setServerQR(null);
          fetchServerQR();
        }
      }, 1000);
    }
    return () => { if (serverTimerRef.current) clearInterval(serverTimerRef.current); };
  }, [serverQR]);

  // ── Стабилизированные QR-значения (useMemo MUST be before any early returns) ──
  const stableLocalQr = useMemo(
    () => JSON.stringify({ userId, carNumber, timestamp: localTs }),
    [userId, carNumber, localTs]
  );

  const stableDisplayQr = useMemo(
    () => serverQR?.token ?? stableLocalQr,
    [serverQR?.token, stableLocalQr]
  );

  const isHmacQr      = Boolean(serverQR?.token);
  const urgentSoon    = isHmacQr && serverSecondsLeft < 60;
  const minutes       = Math.floor(serverSecondsLeft / 60);
  const secs          = serverSecondsLeft % 60;
  const localSecsLeft = Math.max(0, 30 - Math.floor((Date.now() - localTs) / 1000));

  // ── ЭКРАН: Нет подписки ──────────────────────────────────────────────────
  if (noSubscription) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pb-6"
      >
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center border border-white/20">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Lock className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-70" />
          </motion.div>
          <h3 className="text-xl text-white mb-2" style={{ fontWeight: 700 }}>Нет активной подписки</h3>
          <p className="text-blue-200 text-sm mb-6">
            Для получения QR-кода необходима подписка DrivePass+
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onNeedSubscription}
            className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white py-3 px-6 rounded-xl text-lg hover:from-green-500 hover:to-emerald-600 transition-all"
            style={{ fontWeight: 700 }}
          >
            Оформить — от 390 000 сум
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // ── ЭКРАН: Кулдаун активен (новый компонент) ─────────────────────────────
  if (cooldownSecs !== null && cooldownSecs > 0) {
    return (
      <WashCooldownScreen
        secondsRemaining={cooldownSecs}
        carPlate={carPlate}
        onCooldownEnd={async () => {
          // Когда таймер дошёл до 0 — перепроверяем через RPC и получаем QR
          setCooldownSecs(null);
          setInitialLoading(true);
          const eligible = await checkEligibility();
          if (eligible) {
            await fetchServerQR();
          } else {
            setInitialLoading(false);
          }
          toast.success('Кулдаун завершён! Можно мыться 🚗');
        }}
      />
    );
  }

  // ── ЭКРАН: Загрузка ──────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 border-4 border-blue-300 border-t-white rounded-full"
        />
        <p className="text-blue-200 text-sm">Проверка статуса…</p>
      </div>
    );
  }

  return (
    <GeoFenceGuard onAllowed={() => {}} blocking={false}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="px-5 pb-4"
      >
        {/* Офлайн-баннер */}
        <AnimatePresence>
          {offlineMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 bg-yellow-500/20 border border-yellow-400/40 rounded-xl px-4 py-2.5 flex items-center gap-2.5"
            >
              <WifiOff className="w-4 h-4 text-yellow-300 flex-shrink-0" />
              <p className="text-yellow-200 text-xs font-medium">Офлайн режим — QR из кэша</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* QR Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {urgentSoon && (
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400"
            />
          )}

          <div className="p-5 text-center">
            {/* Госномер */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <div className="bg-blue-50 border-2 border-blue-100 rounded-xl px-5 py-2 flex items-center gap-2.5">
                <Car className="w-4 h-4 text-blue-500" />
                <span className="font-mono text-blue-800 tracking-[0.2em]" style={{ fontWeight: 900, fontSize: '1.25rem' }}>
                  {carPlate}
                </span>
              </div>
            </motion.div>

            {/* QR Code */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center mb-4"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={stableDisplayQr.slice(-12)}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.25 }}
                  className={`p-3 rounded-2xl border-2 transition-colors duration-300 ${
                    urgentSoon
                      ? 'border-amber-300 bg-amber-50'
                      : isHmacQr
                      ? 'border-green-100 bg-white'
                      : 'border-blue-100 bg-white'
                  }`}
                >
                  <QRCodeSVG
                    value={stableDisplayQr}
                    size={190}
                    level="H"
                    includeMargin={false}
                    fgColor="#1e40af"
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Таймер */}
            <div className={`flex items-center justify-center gap-1.5 mb-3 ${urgentSoon ? 'text-amber-600' : 'text-gray-500'}`}>
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs" style={{ fontWeight: 600 }}>
                {isHmacQr
                  ? (urgentSoon
                      ? `Обновится через ${secs}с`
                      : `Действителен ещё ${minutes}м ${secs.toString().padStart(2, '0')}с`)
                  : `Обновление через ${localSecsLeft}с`}
              </span>
            </div>

            {/* Прогресс */}
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-4 mx-4">
              {isHmacQr ? (
                <motion.div
                  className={`h-full rounded-full ${urgentSoon ? 'bg-amber-400' : 'bg-blue-500'}`}
                  animate={{ width: `${Math.max(0, (serverSecondsLeft / 300) * 100)}%` }}
                  transition={{ duration: 1 }}
                />
              ) : (
                <motion.div
                  className="h-full rounded-full bg-indigo-400"
                  animate={{ width: `${Math.max(0, (localSecsLeft / 30) * 100)}%` }}
                  transition={{ duration: 1 }}
                />
              )}
            </div>

            {/* Статус */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs" style={{ fontWeight: 600 }}>Подписка активна</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${isHmacQr ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}
                style={{ fontWeight: 700 }}
              >
                {isHmacQr ? '🔐 HMAC' : '📱 Локальный'}
              </span>
            </div>

            {/* Обновить */}
            <button
              onClick={() => { setServerQR(null); fetchServerQR(); }}
              disabled={refreshing}
              className="text-[11px] text-gray-400 hover:text-blue-600 flex items-center gap-1 mx-auto transition-colors py-1 px-3 rounded-lg hover:bg-blue-50"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Обновляем…' : 'Обновить вручную'}
            </button>
          </div>
        </div>

        {/* Инструкция */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 backdrop-blur-sm rounded-xl p-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <p className="text-white text-xs uppercase tracking-wider mb-2.5" style={{ fontWeight: 700 }}>Как использовать</p>
          <div className="space-y-2">
            {[
              'Покажите QR мойщику',
              'Мойщик сканирует и подтверждает',
              '+10 бонусных баллов на счёт',
              'Следующая мойка — через 24 часа',
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                className="flex items-center gap-2.5"
              >
                <span
                  className="w-5 h-5 bg-blue-500/40 rounded-full flex items-center justify-center text-[10px] text-blue-100 flex-shrink-0"
                  style={{ fontWeight: 900 }}
                >
                  {i + 1}
                </span>
                <p className="text-blue-100 text-xs">{step}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </GeoFenceGuard>
  );
}
