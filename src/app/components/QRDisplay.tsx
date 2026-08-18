/**
 * QRDisplay — DrivePass+
 *
 * Fetches GET /subscription/qr, a static PNG encoding a t.me deep link
 * (`?start=sub_<id>`) that the admin bot's own /start handler already parses -- so a mojka
 * scanning it opens the subscription card directly in the admin bot, same as if the owner
 * had typed the id by hand. No token rotation or countdown: the image itself never expires,
 * only the subscription behind it does. Eligibility (cooldown, exhausted washes, expiry) is
 * enforced server-side at charge time, not here -- this screen's only job is showing the code.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Car, CheckCircle2, Lock, WifiOff } from 'lucide-react';
import { apiHeaders, apiUrl } from '../utils/apiClient';
import { useSubscription } from '../contexts/SubscriptionContext';
import { nativeStorage } from '../core/native/storage';

const QR_CACHE_KEY = 'drivepass_qr_offline_cache';

interface QRDisplayProps {
  accessToken: string;
  user: any;
  onNeedSubscription: () => void;
}

export function QRDisplay({ accessToken, onNeedSubscription }: QRDisplayProps) {
  const { subscription, hasActiveSubscription, loading: subContextLoading } = useSubscription();

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [noSubscription, setNoSubscription] = useState(false);

  const carPlate = subscription?.carPlate || 'N/A';

  const fetchQr = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(apiUrl('/subscription/qr'), { headers: apiHeaders(accessToken) });
      if (res.status === 404) {
        setNoSubscription(true);
        return;
      }
      if (!res.ok) throw new Error(`qr fetch failed: ${res.status}`);

      const blob = await res.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      setNoSubscription(false);
      setOfflineMode(false);
      setQrDataUrl(dataUrl);
      nativeStorage.setItem(QR_CACHE_KEY, dataUrl).catch(() => {});
    } catch {
      const cached = await nativeStorage.getItem(QR_CACHE_KEY).catch(() => null);
      if (cached) {
        setQrDataUrl(cached);
        setOfflineMode(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (subContextLoading) return;
    if (!hasActiveSubscription) {
      setNoSubscription(true);
      setLoading(false);
      return;
    }
    fetchQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subContextLoading, hasActiveSubscription]);

  if (noSubscription) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pb-6">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center border border-white/20">
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
            <Lock className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-70" />
          </motion.div>
          <h3 className="text-xl text-white mb-2" style={{ fontWeight: 700 }}>Нет активной подписки</h3>
          <p className="text-blue-200 text-sm mb-6">Для получения QR-кода необходима подписка DrivePass+</p>
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-14 h-14 border-4 border-blue-300 border-t-white rounded-full"
        />
        <p className="text-blue-200 text-sm">Загружаем QR-код…</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="px-5 pb-4"
    >
      {offlineMode && (
        <div className="mb-3 bg-yellow-500/20 border border-yellow-400/40 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
          <WifiOff className="w-4 h-4 text-yellow-300 flex-shrink-0" />
          <p className="text-yellow-200 text-xs font-medium">Офлайн режим — QR из кэша</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-blue-50 border-2 border-blue-100 rounded-xl px-5 py-2 flex items-center gap-2.5">
              <Car className="w-4 h-4 text-blue-500" />
              <span className="font-mono text-blue-800 tracking-[0.2em]" style={{ fontWeight: 900, fontSize: '1.25rem' }}>
                {carPlate}
              </span>
            </div>
          </div>

          <div className="flex justify-center mb-4">
            {qrDataUrl && (
              <div className="p-3 rounded-2xl border-2 border-green-100 bg-white">
                <img src={qrDataUrl} alt="QR-код подписки" width={190} height={190} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs" style={{ fontWeight: 600 }}>Подписка активна</span>
            </div>
          </div>

          <button
            onClick={fetchQr}
            disabled={refreshing}
            className="text-[11px] text-gray-400 hover:text-blue-600 flex items-center gap-1 mx-auto transition-colors py-1 px-3 rounded-lg hover:bg-blue-50"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Обновляем…' : 'Обновить'}
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-3 backdrop-blur-sm rounded-xl p-4"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
      >
        <p className="text-white text-xs uppercase tracking-wider mb-2.5" style={{ fontWeight: 700 }}>Как использовать</p>
        <div className="space-y-2">
          {['Покажите QR мойщику', 'Мойщик сканирует и подтверждает мойку'].map((step, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span
                className="w-5 h-5 bg-blue-500/40 rounded-full flex items-center justify-center text-[10px] text-blue-100 flex-shrink-0"
                style={{ fontWeight: 900 }}
              >
                {i + 1}
              </span>
              <p className="text-blue-100 text-xs">{step}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
