import { useState } from 'react';
import { QrCode, Lock, MapPin, Zap, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { ClientWashScanner } from './ClientWashScanner';
import { SubscriptionModal } from './SubscriptionModal';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

interface ScannerProps {
  accessToken: string | null;
  checkinToken?: string | null;
  onCheckinConsumed?: () => void;
}

export function Scanner({ accessToken, checkinToken, onCheckinConsumed }: ScannerProps) {
  const { user } = useAuth();
  const { hasActiveSubscription, loading: subLoading, refresh: refreshSubscription } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  if (!accessToken || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center px-6">
        <div className="text-center page-fade">
          <div className="w-20 h-20 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <QrCode className="w-10 h-10 text-white/70" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Требуется авторизация</p>
          <p className="text-blue-200 text-sm">Войдите в систему для сканирования QR мойки</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 pb-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="pt-safe px-5 pb-5">
        <div className="flex items-center gap-3 pt-5 mb-1">
          <div className="w-10 h-10 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-none">Сканировать QR мойки</h1>
            <p className="text-blue-200 text-xs mt-0.5">QR наклеен на самой мойке — отсканируйте на месте</p>
          </div>
        </div>
      </header>

      {!subLoading && !hasActiveSubscription ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pb-6">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center border border-white/20">
            <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
              <Lock className="w-16 h-16 text-blue-300 mx-auto mb-4 opacity-70" />
            </motion.div>
            <h3 className="text-xl text-white mb-2" style={{ fontWeight: 700 }}>Нет активной подписки</h3>
            <p className="text-blue-200 text-sm mb-6">Для списания мойки нужна активная подписка DrivePass+</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSubscriptionModal(true)}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white py-3 px-6 rounded-xl text-lg hover:from-green-500 hover:to-emerald-600 transition-all"
              style={{ fontWeight: 700 }}
            >
              Оформить — от 390 000 сум
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <ClientWashScanner accessToken={accessToken} initialToken={checkinToken} onTokenConsumed={onCheckinConsumed} />
      )}

      {/* ── Bottom info badges ───────────────────────────────────────────── */}
      <div className="px-5 mt-1">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: MapPin,      label: 'GPS',       sub: 'Проверка на месте', color: '#60A5FA' },
            { icon: Zap,         label: 'Мгновенно', sub: 'Без сотрудника',    color: '#A78BFA' },
            { icon: ShieldCheck, label: 'HMAC',       sub: 'Защита подписи',   color: '#34D399' },
          ].map(item => (
            <div
              key={item.label}
              className="relative flex flex-col items-center text-center rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.13)',
                backdropFilter: 'blur(12px)',
                padding: '14px 8px 12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 flex-shrink-0"
                style={{
                  background: `${item.color}22`,
                  border: `1px solid ${item.color}44`,
                  boxShadow: `0 0 12px ${item.color}33`,
                }}
              >
                <item.icon style={{ width: 16, height: 16, color: item.color, strokeWidth: 2 }} />
              </div>
              <p className="text-white leading-tight" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.01em' }}>{item.label}</p>
              <p style={{ fontSize: 9.5, color: 'rgba(147,197,253,0.75)', marginTop: 2, lineHeight: 1.3 }}>{item.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Subscription Modal ───────────────────────────────────────────── */}
      {showSubscriptionModal && (
        <SubscriptionModal
          accessToken={accessToken}
          user={user}
          onClose={() => setShowSubscriptionModal(false)}
          onActivated={async () => {
            setShowSubscriptionModal(false);
            await refreshSubscription();
          }}
        />
      )}
    </div>
  );
}
