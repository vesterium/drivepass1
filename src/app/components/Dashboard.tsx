import { useState, useEffect } from 'react';
import {
  Car, TrendingUp, Shield, CreditCard, Award, MapPin,
  Clock, QrCode, Timer, ChevronRight, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { BRAND } from '../constants/branding';
import { PRICING_PACKAGES } from '../constants/pricing';
import { toast } from 'sonner';
import { QRDisplay } from './QRDisplay';
import { SubscriptionModal } from './SubscriptionModal';

interface DashboardProps {
  user?: any;
  accessToken?: string | null;
  onGoToLocations?: () => void;
  onGoToHistory?: () => void;
}

export function Dashboard({ user, accessToken, onGoToLocations, onGoToHistory }: DashboardProps) {
  const { language } = useLanguage();
  const { subscription, hasActiveSubscription, refresh: refreshSubscription } = useSubscription();

  const [showQR,                setShowQR]                = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [loadingStatus,         setLoadingStatus]         = useState(false);

  // Actual cooldown/exhausted-washes eligibility is enforced server-side at charge time
  // (see visits.charge_visit) -- there's no live pre-check endpoint for the dashboard to
  // call before that, so the QR button is always enabled here and a scan that's genuinely
  // ineligible gets rejected at the mojka instead.
  const canWash = true;
  const timeLeft = '';

  const userName  = user?.firstName || 'Привет';
  const carNumber = subscription?.carPlate || '';

  const handleQRClick = () => {
    if (!hasActiveSubscription) { setShowSubscriptionModal(true); return; }
    if (!canWash) { toast.error(`Следующая мойка через ${timeLeft}`); return; }
    setShowQR(true);
  };

  const handleSubscriptionActivated = async () => {
    await refreshSubscription();
    toast.success('Подписка активирована!');
  };

  const currentPkg = PRICING_PACKAGES[subscription?.tier as 'personal' | 'business'] ?? PRICING_PACKAGES.personal;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 text-white pb-8">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="pt-safe px-5 pb-5"
      >
        {/* Brand row */}
        <div className="flex items-center justify-between pt-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 border border-white/20 rounded-xl flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight leading-none">{BRAND.name}</p>
              <p className="text-[11px] text-blue-200 mt-0.5">{BRAND.slogan}</p>
            </div>
          </div>
        </div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5"
        >
          <h1 className="text-2xl font-bold leading-tight mb-1.5">
            {userName}, добро пожаловать
          </h1>
          {carNumber ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5">
                <Car className="w-3.5 h-3.5 text-blue-200" />
                <span className="text-sm font-mono font-semibold text-white tracking-widest">{carNumber}</span>
              </div>
            </div>
          ) : (
            <p className="text-blue-300 text-sm">Добавьте госномер в профиле</p>
          )}
        </motion.div>

        {/* Trust strip */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Shield,     color: 'text-green-300',  label: 'Проверено' },
            { icon: CreditCard, color: 'text-blue-300',   label: 'Payme / Click' },
            { icon: Award,      color: 'text-yellow-300', label: 'Гарантия' },
          ].map(({ icon: Icon, color, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.07, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white/10 border border-white/10 rounded-xl p-2.5 flex flex-col items-center gap-1.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-[11px] text-blue-100 font-medium">{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.header>

      {/* ── QR SECTION ──────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="px-5 mb-4"
      >
        <AnimatePresence mode="wait">
          {showQR && hasActiveSubscription && accessToken ? (
            <motion.div
              key="qr-open"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-white">Ваш QR-код</p>
                <button
                  onClick={() => setShowQR(false)}
                  className="text-blue-200 text-xs font-medium px-3 py-1.5 bg-white/10 rounded-lg"
                >
                  Скрыть
                </button>
              </div>
              <QRDisplay
                accessToken={accessToken}
                user={user}
                onNeedSubscription={() => setShowSubscriptionModal(true)}
              />
            </motion.div>
          ) : (
            <motion.button
              key="qr-btn"
              onClick={handleQRClick}
              disabled={loadingStatus}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.01 }}
              className={`
                w-full flex items-center justify-between rounded-2xl p-5 shadow-xl
                ${!hasActiveSubscription
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600'
                  : canWash
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500 opacity-80 cursor-not-allowed'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  {!hasActiveSubscription
                    ? <CreditCard className="w-5 h-5 text-white" />
                    : canWash
                    ? <QrCode className="w-5 h-5 text-white" />
                    : <Timer className="w-5 h-5 text-white" />
                  }
                </div>
                <div className="text-left">
                  <p className="text-base font-bold text-white leading-tight">
                    {!hasActiveSubscription
                      ? 'Оформить подписку'
                      : canWash
                      ? 'Открыть QR-код'
                      : 'Кулдаун активен'}
                  </p>
                  <p className="text-xs text-white/70 mt-0.5">
                    {!hasActiveSubscription
                      ? 'от 390 000 сум/мес'
                      : canWash
                      ? 'Нажмите для получения'
                      : `Через ${timeLeft}`}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.section>

      {/* ── SUBSCRIPTION CARD ───────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="px-5 mb-4"
      >
        <div className="bg-white text-gray-900 rounded-2xl shadow-lg overflow-hidden">
          {hasActiveSubscription ? (
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-1">Активная подписка</p>
                  <p className="text-xl font-bold text-gray-900 leading-tight">
                    {currentPkg.price.uzs.toLocaleString('ru-RU')}
                    <span className="text-sm font-normal text-gray-400 ml-1">сум/мес</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {currentPkg.name[language as 'ru' | 'en' | 'uz']}
                    {subscription?.carPlate ? ` · ${subscription.carPlate}` : ''}
                    {' · '}24ч лимит
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-2.5 py-1.5 rounded-full text-xs font-semibold flex-shrink-0">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Активна
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  { icon: Timer,  text: '1 мойка каждые 24 часа' },
                  { icon: MapPin, text: 'Все мойки Самарканда' },
                  { icon: Zap,    text: '+10 баллов за мойку' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">Действует до</span>
                <span className="text-sm font-semibold text-gray-700">
                  {new Date(subscription!.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          ) : (
            <div className="px-5 py-5">
              {/* Header row */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.14em] font-semibold mb-1">DrivePass+</p>
                  <p className="text-base font-bold text-gray-900 leading-tight">Нет активной подписки</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <QrCode className="w-4 h-4 text-gray-300" />
                </div>
              </div>

              {/* Tiers — clean list style */}
              <div className="mb-4" style={{ borderTop: '1px solid #f3f4f6' }}>
                {[
                  { name: 'Light',    price: '390 000', sub: 'Личный автомобиль · 4 мойки', accent: '#3B82F6' },
                  { name: 'Standard', price: '590 000', sub: 'Личный авто · 6 моек',        accent: '#7c3aed' },
                  { name: 'Premium',  price: '890 000', sub: 'До 10 моек/мес',              accent: '#F59E0B' },
                ].map(tier => (
                  <div key={tier.name} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: tier.accent }} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{tier.name}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{tier.sub}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{tier.price}</p>
                      <p className="text-[10px] text-gray-400">сум/мес</p>
                    </div>
                  </div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSubscriptionModal(true)}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold tracking-tight"
                style={{ background: '#111827' }}
              >
                Активировать подписку
              </motion.button>
            </div>
          )}
        </div>
      </motion.section>

      {/* ── SAVINGS BLOCK ───────────────────────────────────────────────── */}
      {hasActiveSubscription && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="px-5 mb-4"
        >
          <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-emerald-200 font-medium uppercase tracking-wider mb-1">Ваша экономия</p>
                <p className="text-xl font-bold text-white">
                  {currentPkg.savings.monthly.toLocaleString('ru-RU')} сум
                </p>
                <p className="text-emerald-200 text-xs mt-0.5">
                  vs разовые мойки · {currentPkg.savings.percentage}% дешевле
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-emerald-300 flex-shrink-0" />
            </div>
          </div>
        </motion.section>
      )}

      {/* ── QUICK ACTIONS ───────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
        className="px-5 mb-4"
      >
        <p className="text-xs font-medium text-blue-200 uppercase tracking-wider mb-3">Быстрые действия</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { icon: MapPin, label: 'Найти мойку', sub: 'Рядом с вами', action: onGoToLocations },
            { icon: Clock,  label: 'История',      sub: 'Мои мойки',    action: onGoToHistory },
          ].map(({ icon: Icon, label, sub, action }, i) => (
            <motion.button
              key={label}
              onClick={action}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.36 + i * 0.06, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.93 }}
              whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.18)' }}
              className="flex flex-col items-start rounded-xl p-4 transition-colors text-left"
              style={{ minHeight: 0, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <Icon className="w-5 h-5 mb-2.5 text-blue-200" />
              <p className="text-sm font-semibold text-white leading-tight">{label}</p>
              <p className="text-[11px] text-blue-300 mt-0.5">{sub}</p>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* ── SUBSCRIPTION MODAL ──────────────────────────────────────────── */}
      {showSubscriptionModal && accessToken && (
        <SubscriptionModal
          accessToken={accessToken}
          user={user}
          onClose={() => setShowSubscriptionModal(false)}
          onActivated={handleSubscriptionActivated}
        />
      )}
    </div>
  );
}
