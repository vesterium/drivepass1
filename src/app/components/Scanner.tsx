import { useState } from 'react';
import { QrCode, Shield, RefreshCw, Wifi } from 'lucide-react';
import { QRDisplay } from './QRDisplay';
import { SubscriptionModal } from './SubscriptionModal';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

interface ScannerProps {
  accessToken: string | null;
}

export function Scanner({ accessToken }: ScannerProps) {
  const { user } = useAuth();
  const { refresh: refreshSubscription } = useSubscription();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionKey, setSubscriptionKey] = useState(0);

  if (!accessToken || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 flex items-center justify-center px-6">
        <div className="text-center page-fade">
          <div className="w-20 h-20 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <QrCode className="w-10 h-10 text-white/70" />
          </div>
          <p className="text-lg font-bold text-white mb-2">Требуется авторизация</p>
          <p className="text-blue-200 text-sm">Войдите в систему для доступа к QR-коду</p>
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
            <h1 className="text-lg font-black text-white leading-none">Мой QR-код</h1>
            <p className="text-blue-200 text-xs mt-0.5">Покажите мойщику для оплаты</p>
          </div>
        </div>
      </header>

      {/* ── QR Display ──────────────────────────────────────────────────── */}
      <QRDisplay
        key={subscriptionKey}
        accessToken={accessToken}
        user={user}
        onNeedSubscription={() => setShowSubscriptionModal(true)}
      />

      {/* ── Bottom info badges ───────────────────────────────────────────── */}
      <div className="px-5 mt-1">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: Shield,    label: 'HMAC',         sub: 'Защита подписи',  color: '#60A5FA' },
            { icon: RefreshCw, label: 'Авто-обновление', sub: 'Каждые 30 сек', color: '#A78BFA' },
            { icon: Wifi,      label: 'Офлайн',       sub: 'Кэш без сети',   color: '#34D399' },
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
              {/* Icon circle */}
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
            setSubscriptionKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
}
