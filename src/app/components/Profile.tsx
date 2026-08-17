import { toast } from 'sonner';
import { useState, useRef, useEffect } from 'react';
import { openUrl } from '../core/native/capacitor';
import { nativeStorage } from '../core/native/storage';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ModalPortal } from './ModalPortal';
import {
  User, CreditCard, Bell, HelpCircle, LogOut, ChevronRight,
  Phone, Calendar, Award, Receipt, Settings, Globe,
  Car, Shield, TrendingUp, CheckCircle2, AlertCircle, Trophy,
  X, ArrowRight, RefreshCw, Zap,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { PRICING_PACKAGES } from '../constants/pricing';
import { SubscriptionModal } from './SubscriptionModal';
import { ManageSubscriptionModal } from './ManageSubscriptionModal';

// ── Slim iOS-style toggle ──────────────────────────────────────────────────
function SlimToggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      animate={{ backgroundColor: value ? '#2563eb' : '#d1d5db' }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        width: 42, height: 24, borderRadius: 12,
        position: 'relative', flexShrink: 0,
        opacity: disabled ? 0.4 : 1,
        minHeight: 0, padding: 0, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 600, damping: 38, mass: 0.6 }}
        style={{
          position: 'absolute', top: 2,
          width: 20, height: 20, borderRadius: 10,
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.22)',
        }}
      />
    </motion.button>
  );
}

interface ProfileProps {
  user?: any;
  onViewHistory: () => void;
  onViewLoyalty?: () => void;
  onViewFrugality?: () => void;
  onSignOut?: () => void;
  onShowLaunchChecklist?: () => void;
}

export function Profile({ user, onViewHistory, onViewLoyalty, onViewFrugality, onSignOut, onShowLaunchChecklist }: ProfileProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAppSettingsModal, setShowAppSettingsModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subInitialTier, setSubInitialTier] = useState<'personal' | 'business'>('personal');

  // Payment method preference (persisted)
  const [paymentMethod, setPaymentMethod] = useState<'payme' | 'click'>('payme');
  useEffect(() => {
    nativeStorage.getItem('drivepass_payment_method').then(v => {
      if (v === 'payme' || v === 'click') setPaymentMethod(v);
    });
  }, []);

  // Notification settings
  const [notifWash, setNotifWash] = useState(true);
  const [notifPromo, setNotifPromo] = useState(true);
  const [notifExpiry, setNotifExpiry] = useState(true);
  const [notifNews, setNotifNews] = useState(false);

  // App settings
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefreshQR, setAutoRefreshQR] = useState(true);

  // Version tap counter for LaunchChecklist easter egg
  const versionTapCount = useRef(0);
  const versionTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVersionTap = () => {
    versionTapCount.current += 1;
    if (versionTapTimer.current) clearTimeout(versionTapTimer.current);
    if (versionTapCount.current >= 5) {
      versionTapCount.current = 0;
      onShowLaunchChecklist?.();
      return;
    }
    if (versionTapCount.current === 3) {
      toast('Ещё 2 раза для открытия панели запуска 🚀', { duration: 1500 });
    }
    versionTapTimer.current = setTimeout(() => { versionTapCount.current = 0; }, 2000);
  };

  const { t, language, setLanguage } = useLanguage();

  // ── Задача 1: Реальные данные подписки из контекста ──────────────────────
  const { subscription, hasActiveSubscription, loading: subLoading, refresh: refreshSub } = useSubscription();
  const { accessToken } = useAuth();

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'uz', name: 'Uzbek', nativeName: "O'zbekcha" }
  ];

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const userPhone = user?.user_metadata?.formatted_phone || user?.user_metadata?.phone || 'Не указан';
  const carNumber = user?.user_metadata?.car_number || 'Не указан';
  const memberSince = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : 'Январь 2025';

  // ── Задача 4: Проверяем технический email — скрываем @drivepass.uz ───────
  const userEmail = user?.email ?? '';
  const isTechEmail = userEmail.endsWith('@drivepass.uz');
  // Показываем email только если это настоящий адрес пользователя
  const showEmail = !isTechEmail && userEmail.length > 0;

  // ── Задача 3: Цена в сумах из данных подписки ────────────────────────────
  const currentPkg = PRICING_PACKAGES[subscription?.tier as 'personal' | 'business'] ?? PRICING_PACKAGES.personal;
  const priceUzs = currentPkg.price.uzs.toLocaleString('ru-RU'); // "390 000" — "590 000"
  const tierName = hasActiveSubscription
    ? currentPkg.name[language as 'ru' | 'en' | 'uz']
    : null;
  const expiryDate = subscription?.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="min-h-screen" style={{ background: '#f7f8fa' }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden px-5 pt-safe pb-10" style={{ background: 'linear-gradient(145deg, #1d4ed8 0%, #2563eb 40%, #4f46e5 100%)' }}>
        {/* decorative circles */}
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute top-16 -left-8 w-32 h-32 rounded-full opacity-5" style={{ background: 'white' }} />

        <div className="relative flex items-center gap-4 pt-5 mb-7">
          {/* Avatar with initials */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-blue-700 font-black text-xl"
            style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-black text-white leading-tight truncate">{userName}</h1>
            <p className="text-blue-200 text-xs mt-0.5">{t('profile.memberSince')} {memberSince}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative grid grid-cols-3 gap-2">
          {[
            { value: '∞', label: t('profile.statWashes') },
            { value: '24ч', label: t('profile.statCooldown') },
            { value: null, label: 'DrivePass+', icon: <Trophy className="w-5 h-5 text-yellow-300 mx-auto mb-0.5" /> },
          ].map(({ value, label, icon }) => (
            <div
              key={label}
              className="text-center py-3 px-2 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
            >
              {icon ?? <p className="text-lg font-black text-white mb-0.5">{value}</p>}
              <p className="text-[10px] text-blue-100 font-medium tracking-wide">{label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* ── Subscription Card ──────────────────────────────────────── */}
      <div className="px-5 -mt-5 mb-5">
        <div
          className="bg-white rounded-3xl overflow-hidden"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)' }}
        >
          {subLoading ? (
            <div className="p-5 space-y-3">
              <div className="skeleton h-3.5 w-1/2 rounded" />
              <div className="skeleton h-6 w-3/4 rounded" />
              <div className="skeleton h-3 w-full rounded" />
            </div>
          ) : hasActiveSubscription ? (
            <div className="px-5 pb-5 pt-7">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.12em] font-bold mb-1">{t('profile.activePlan')}</p>
                  <p className="text-2xl font-black text-gray-900 leading-none">{tierName}</p>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}
                >
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {t('dashboard.active')}
                </div>
              </div>

              <div className="space-y-0 divide-y divide-gray-50">
                {subscription?.carPlate && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-400 text-sm">Госномер</span>
                    <span className="font-mono font-black text-gray-900 text-sm tracking-widest">{subscription.carPlate}</span>
                  </div>
                )}
                {expiryDate && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-400 text-sm">{t('profile.nextBilling')}</span>
                    <span className="text-gray-800 font-semibold text-sm">{expiryDate}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-400 text-sm">{t('profile.monthlyCost')}</span>
                  <span className="font-black text-gray-900 text-sm">
                    {priceUzs} <span className="font-normal text-gray-400 text-xs">сум</span>
                  </span>
                </div>
                {/* Payment method row — clickable */}
                <button
                  onClick={() => setShowPaymentMethodModal(true)}
                  className="w-full flex items-center justify-between py-3 hover:opacity-70 transition-opacity"
                >
                  <span className="text-gray-400 text-sm">Способ оплаты</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={paymentMethod === 'payme'
                        ? { background: '#eff6ff', color: '#1d4ed8' }
                        : { background: '#f0fdf4', color: '#15803d' }
                      }
                    >
                      {paymentMethod === 'payme' ? 'Payme' : 'Click'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowManageModal(true)}
                className="w-full mt-4 py-3.5 rounded-2xl text-white text-sm font-bold transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}
              >
                {t('profile.manageSubscription')}
              </button>
            </div>
          ) : (
            <div className="px-5 pb-5 pt-6">

              {/* Status row */}
              <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-[0.14em] font-semibold mb-1">DrivePass+</p>
                  <p className="text-sm font-bold text-gray-900">{t('profile.noSubscription')}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: '#f9f9f9', border: '1px solid #f0f0f0' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <span className="text-[11px] text-gray-400 font-medium">Inactive</span>
                </div>
              </div>

              {/* Tiers — clean list, clickable */}
              <div>
                {[
                  { name: 'Light',    price: '390 000', sub: 'Личный автомобиль · 4 мойки', accent: '#3B82F6', tier: 'personal' as const },
                  { name: 'Standard', price: '590 000', sub: '6 моек · ХИТ продаж',         accent: '#7c3aed', tier: 'business' as const },
                ].map(tier => (
                  <motion.button
                    key={tier.name}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => { setSubInitialTier(tier.tier); setShowSubModal(true); }}
                    className="w-full flex items-center justify-between py-3.5 text-left"
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-0.5 h-9 rounded-full flex-shrink-0" style={{ background: tier.accent }} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{tier.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{tier.sub}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{tier.price}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">сум / мес</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Payment method */}
              <button
                onClick={() => setShowPaymentMethodModal(true)}
                className="w-full flex items-center justify-between py-3.5 transition-colors"
                style={{ borderBottom: '1px solid #f3f4f6' }}
              >
                <span className="text-sm text-gray-500">Способ оплаты</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold" style={{ color: paymentMethod === 'payme' ? '#2563eb' : '#16a34a' }}>
                    {paymentMethod === 'payme' ? 'Payme' : 'Click'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </div>
              </button>

              {/* CTA */}
              <div className="pt-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setShowSubModal(true); setSubInitialTier('personal'); }}
                  className="w-full py-3.5 rounded-xl text-white text-sm font-semibold tracking-tight"
                  style={{ background: '#111827' }}
                >
                  {t('profile.subscribeFrom')}
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Account Section ────────────────────────────────────────── */}
      <div className="px-5 mb-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.14em] font-bold mb-2.5 px-1">{t('profile.account')}</p>
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {showEmail && (
            <ProfileRow icon={<Phone className="w-4 h-4 text-blue-500" />} iconBg="bg-blue-50" title={t('profile.email')} value={userEmail} />
          )}
          <ProfileRow icon={<Phone className="w-4 h-4 text-blue-500" />} iconBg="bg-blue-50" title={t('profile.phone')} value={userPhone} />
          <ProfileRow icon={<Car className="w-4 h-4 text-emerald-500" />} iconBg="bg-emerald-50" title={t('profile.carNumber')} value={<span className="font-mono font-bold text-sm">{carNumber}</span>} onPress={() => setShowManageModal(true)} />
          <ProfileRow icon={<CreditCard className="w-4 h-4 text-blue-500" />} iconBg="bg-blue-50" title={t('profile.paymentMethod')} value="Payme / Click" />
        </div>
      </div>

      {/* ── Preferences Section ────────────────────────────────────── */}
      <div className="px-5 mb-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.14em] font-bold mb-2.5 px-1">{t('profile.preferences')}</p>
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <button onClick={() => setShowLanguageModal(true)} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 text-sm font-semibold">{t('profile.language')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{languages.find(l => l.code === language)?.nativeName}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          </button>

          <button onClick={() => setShowNotificationsModal(true)} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 text-sm font-semibold">{t('profile.notifications')}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          </button>

          <button onClick={() => setShowAppSettingsModal(true)} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Settings className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 text-sm font-semibold">{t('profile.appSettings')}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          </button>

          <button onClick={onViewLoyalty} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 text-sm font-semibold">{t('profile.rewardsProgram')}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          </button>

          <button onClick={onViewFrugality} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 text-sm font-semibold">Индекс Бережливости</p>
              <p className="text-[11px] text-gray-400 mt-0.5">История ухода и сертификат</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="bg-indigo-100 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold">NEW</span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            </div>
          </button>
        </div>
      </div>

      {/* ── Activity Section ───────────────────────────────────────── */}
      <div className="px-5 mb-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.14em] font-bold mb-2.5 px-1">{t('profile.activity')}</p>
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <button onClick={onViewHistory} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 text-sm font-semibold">{t('profile.washHistory')}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          </button>
          <button onClick={() => setShowBillingModal(true)} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Receipt className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 text-sm font-semibold">{t('profile.billingHistory')}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* ── Support Section ────────────────────────────────────────── */}
      <div className="px-5 mb-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-[0.14em] font-bold mb-2.5 px-1">{t('profile.support')}</p>
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <button onClick={() => setShowHelpModal(true)} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 text-sm font-semibold">{t('profile.helpCenter')}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          </button>
          <button onClick={() => setShowContactModal(true)} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 text-sm font-semibold">{t('profile.contactSupport')}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">support@drivepass.uz</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────── */}
      <div className="px-5 pb-12">
        <div className="bg-white rounded-2xl overflow-hidden mb-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full flex items-center justify-center gap-2 text-red-400 py-4 hover:bg-red-50 transition-colors text-sm font-semibold border-b border-gray-50"
          >
            <AlertCircle className="w-4 h-4" />
            {t('profile.cancelSubscription')}
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 text-gray-400 py-4 hover:bg-gray-50 transition-colors text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            {t('profile.logOut')}
          </button>
        </div>
        <button
          onClick={handleVersionTap}
          className="w-full text-center text-[10px] text-gray-300 tracking-wide py-1 select-none"
        >
          DrivePass+ · {t('profile.version')} 1.0.0
        </button>
      </div>

      {/* ── Manage Subscription Modal ── */}
      {showManageModal && accessToken && (
        <ManageSubscriptionModal
          accessToken={accessToken}
          user={user}
          subscription={subscription}
          onClose={() => setShowManageModal(false)}
          onUpdated={() => { refreshSub(); setShowManageModal(false); }}
        />
      )}

      {/* ── Cancel Modal ───────────────────────────────────────────── */}
      {createPortal(
        <AnimatePresence>
          {showCancelModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed flex items-center justify-center p-5 z-[9999]"
              style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)' }}
              onClick={e => { if (e.target === e.currentTarget) setShowCancelModal(false); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('profile.cancelSubscription')}?</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">{t('profile.cancelConfirmText')}</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-colors font-semibold text-sm">{t('profile.keepBtn')}</button>
                  <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-colors font-semibold text-sm">{t('profile.cancelBtn')}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Language Modal ─────────────────────────────────────────── */}
      {createPortal(
        <AnimatePresence>
          {showLanguageModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed flex items-center justify-center p-5 z-[9999]"
              style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)' }}
              onClick={e => { if (e.target === e.currentTarget) setShowLanguageModal(false); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('profile.language')}</h3>
                <div className="space-y-2">
                  {languages.map(lang => (
                    <button key={lang.code} onClick={() => { setLanguage(lang.code as 'en' | 'ru' | 'uz'); setShowLanguageModal(false); }}
                      className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all border ${language === lang.code ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-900 border-gray-100 hover:bg-gray-100'}`}>
                      <span className="font-semibold text-sm">{lang.nativeName}</span>
                      {language === lang.code && <CheckCircle2 className="w-4 h-4 opacity-90" />}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowLanguageModal(false)} className="w-full mt-3 text-gray-400 py-3 hover:bg-gray-50 rounded-xl transition-colors text-sm font-medium">{t('profile.closeBtn')}</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Notifications Modal ───────────────────────────────────── */}
      {createPortal(<AnimatePresence>
        {showNotificationsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed flex items-end justify-center z-[9999]"
            style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowNotificationsModal(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="bg-white rounded-t-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
              <div className="flex items-center justify-between px-5 pt-3 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                <h3 className="text-base font-black text-gray-900">Уведомления</h3>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowNotificationsModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center" style={{ minHeight: 0 }}>
                  <X className="w-4 h-4 text-gray-500" />
                </motion.button>
              </div>
              <div className="px-5 py-2">
                {[
                  { label: 'Подтверждение мойки', sub: 'При каждой успешной мойке', val: notifWash, set: setNotifWash },
                  { label: 'Акции и скидки', sub: 'Специальные предложения партнёров', val: notifPromo, set: setNotifPromo },
                  { label: 'Истекает подписка', sub: 'За 3 дня до окончания', val: notifExpiry, set: setNotifExpiry },
                  { label: 'Новости DrivePass+', sub: 'Обновления и новые функции', val: notifNews, set: setNotifNews },
                ].map(({ label, sub, val, set }) => (
                  <div key={label} className="flex items-center justify-between py-3.5" style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </div>
                    <SlimToggle value={val} onChange={set} />
                  </div>
                ))}
              </div>
              <div className="px-5 py-4">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setShowNotificationsModal(false); toast.success('Настройки сохранены'); }}
                  className="w-full py-3.5 rounded-xl text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}
                >
                  Сохранить
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}

      {/* ── App Settings Modal ────────────────────────────────────── */}
      {createPortal(<AnimatePresence>
        {showAppSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed flex items-end justify-center z-[9999]"
            style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
            onClick={e => { if (e.target === e.currentTarget) setShowAppSettingsModal(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="bg-white rounded-t-3xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
              <div className="flex items-center justify-between px-5 pt-3 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                <h3 className="text-base font-black text-gray-900">Настройки</h3>
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowAppSettingsModal(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center" style={{ minHeight: 0 }}>
                  <X className="w-4 h-4 text-gray-500" />
                </motion.button>
              </div>
              <div className="px-5 py-2">
                {[
                  { label: 'Тактильный отклик', sub: 'Вибрация при нажатиях', val: hapticFeedback, set: setHapticFeedback },
                  { label: 'Тёмная тема', sub: 'Скоро', val: darkMode, set: setDarkMode, disabled: true },
                  { label: 'Авто-обновление QR', sub: 'Каждые 30 секунд', val: autoRefreshQR, set: setAutoRefreshQR },
                ].map(({ label, sub, val, set, disabled }) => (
                  <div key={label} className="flex items-center justify-between py-3.5" style={{ borderBottom: '1px solid #f9f9f9', opacity: disabled ? 0.45 : 1 }}>
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </div>
                    <SlimToggle value={val} onChange={v => !disabled && set(v)} disabled={disabled} />
                  </div>
                ))}
                <div className="pt-2 pb-1">
                  <button onClick={() => { nativeStorage.clear().then(() => toast.success('Кэш очищен')).catch(() => toast.error('Ошибка очистки кэша')); }}
                    className="w-full flex items-center justify-between py-3 rounded-xl px-3 hover:bg-red-50 transition-colors">
                    <span className="text-sm font-semibold text-red-500">Очистить кэш приложения</span>
                    <ChevronRight className="w-4 h-4 text-red-300" />
                  </button>
                </div>
              </div>
              <div className="px-5 py-4">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setShowAppSettingsModal(false); toast.success('Настройки сохранены'); }}
                  className="w-full py-3.5 rounded-xl text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}
                >
                  Готово
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}

      {/* ── Billing History Modal ─────────────────────────────────── */}
      <ModalPortal open={showBillingModal} onClose={() => setShowBillingModal(false)}>
        <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" style={{ maxHeight: '80vh' }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-black text-gray-900">История оплат</h3>
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowBillingModal(false)}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center" style={{ minHeight: 0 }}>
              <X className="w-4 h-4 text-gray-500" />
            </motion.button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 72px)' }}>
            {[
              { date: '10 марта 2026', amount: '590 000', method: 'Payme', plan: 'Standard' },
              { date: '8 февраля 2026', amount: '390 000', method: 'Click', plan: 'Light' },
              { date: '9 января 2026', amount: '390 000', method: 'Payme', plan: 'Light' },
            ].map((item, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 340, damping: 28 }}
                className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{item.plan} · {item.method}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-gray-900">{item.amount} <span className="font-normal text-gray-400 text-xs">сум</span></p>
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Оплачено</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </ModalPortal>

      {/* ── Help Center Modal ─────────────────────────────────────── */}
      <ModalPortal open={showHelpModal} onClose={() => setShowHelpModal(false)}>
        <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" style={{ maxHeight: '85vh' }}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-black text-gray-900">Центр помощи</h3>
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowHelpModal(false)}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center" style={{ minHeight: 0 }}>
              <X className="w-4 h-4 text-gray-500" />
            </motion.button>
          </div>
          <div className="overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: 'calc(85vh - 72px)' }}>
            {[
              { q: 'Как воспользоваться подпиской?', a: 'Откройте вкладку QR, покажите код на кассе автомойки. Персонал отсканирует код и подтвердит мойку.' },
              { q: 'Почему QR-код не работает?', a: 'QR-код действует 30 секунд и обновляется автоматически. Убедитесь, что подписка активна в разделе Профиль.' },
              { q: 'Сколько раз можно мыть машину?', a: 'Тариф Personal — неограниченно, но с интервалом 24 часа между мойками. Business — без ограничений для такси.' },
              { q: 'Как сменить госномер?', a: 'Профиль → Управление подпиской → Изменить госномер. Смена доступна 1 раз в 30 дней.' },
              { q: 'Как отменить подписку?', a: 'Профиль → Отменить подписку. Подписка остаётся активной до конца оплаченного периода.' },
              { q: 'Партнёрская программа?', a: 'Если вы владелец автомойки — перейдите в Partner Dashboard в нижней части профиля.' },
            ].map(({ q, a }, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 340, damping: 26 }}
                className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-bold text-gray-900 mb-1.5">{q}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </ModalPortal>

      {/* ── Contact Support Modal ─────────────────────────────────── */}
      <ModalPortal open={showContactModal} onClose={() => setShowContactModal(false)}>
        <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <h3 className="text-lg font-black text-gray-900">Связаться с нами</h3>
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowContactModal(false)}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center" style={{ minHeight: 0 }}>
              <X className="w-4 h-4 text-gray-500" />
            </motion.button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {[
              { icon: '📧', label: 'Email', value: 'support@drivepass.uz', action: () => { navigator.clipboard.writeText('support@drivepass.uz'); toast.success('Email скопирован'); } },
              { icon: '📞', label: 'Телефон', value: '+998 90 000 00 00', action: () => { openUrl('tel:+998900000000'); } },
              { icon: '💬', label: 'Telegram', value: '@drivepass_uz', action: () => { openUrl('https://t.me/drivepass_uz'); } },
              { icon: '🕐', label: 'Время работы', value: 'Пн–Пт: 9:00–18:00 (UTC+5)', action: null },
            ].map(({ icon, label, value, action }, i) => (
              <motion.button key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: 'spring', stiffness: 340, damping: 26 }}
                whileTap={action ? { scale: 0.97 } : undefined}
                onClick={() => action?.()}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 text-left transition-colors ${action ? 'hover:bg-gray-50' : 'cursor-default'}`}
                style={{ minHeight: 0 }}>
                <span className="text-xl">{icon}</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-sm font-semibold text-gray-900">{value}</p>
                </div>
                {action && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
              </motion.button>
            ))}
          </div>
        </div>
      </ModalPortal>

      {/* ── Payment Method Modal ──────────────────────────────────── */}
      {createPortal(
        <AnimatePresence>
          {showPaymentMethodModal && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed flex items-end justify-center z-[9999]"
              style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
              onClick={e => { if (e.target === e.currentTarget) setShowPaymentMethodModal(false); }}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                className="bg-white rounded-t-3xl w-full max-w-md pb-8 pt-5 px-5"
                style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.12)' }}
              >
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                <h3 className="text-lg font-black text-gray-900 mb-1">Способ оплаты</h3>
                <p className="text-xs text-gray-400 mb-5">Выберите платёжную систему для продления</p>
                <div className="space-y-3">
                  {[
                    { id: 'payme' as const, name: 'Payme', desc: 'Через Payme · карты Visa, Mastercard, Uzcard', emoji: '🔵', accent: '#1d4ed8', bg: '#eff6ff' },
                    { id: 'click' as const, name: 'Click', desc: 'Через Click · быстрая оплата в приложении', emoji: '🟢', accent: '#15803d', bg: '#f0fdf4' },
                  ].map(pm => (
                    <motion.button key={pm.id} whileTap={{ scale: 0.97 }}
                      onClick={() => { setPaymentMethod(pm.id); nativeStorage.setItem('drivepass_payment_method', pm.id).catch(() => {}); setShowPaymentMethodModal(false); toast.success(`Способ оплаты: ${pm.name}`); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
                      style={{ background: paymentMethod === pm.id ? pm.bg : '#fafafa', border: `2px solid ${paymentMethod === pm.id ? pm.accent + '40' : '#f0f0f0'}` }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: pm.bg }}>{pm.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{pm.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{pm.desc}</p>
                      </div>
                      {paymentMethod === pm.id && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: pm.accent }}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
                <button onClick={() => setShowPaymentMethodModal(false)} className="w-full mt-4 py-3 text-gray-400 text-sm font-medium hover:bg-gray-50 rounded-xl transition-colors">
                  Отмена
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Subscription Modal ────────────────────────────────────── */}
      {showSubModal && accessToken && (
        <SubscriptionModal
          accessToken={accessToken}
          user={user}
          initialTier={subInitialTier}
          onClose={() => setShowSubModal(false)}
          onActivated={async () => {
            setShowSubModal(false);
            await refreshSub();
          }}
        />
      )}
    </div>
  );
}

// ── ProfileRow Component ──────────────────────────────────────────
interface ProfileRowProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: string | React.ReactNode;
  onPress?: () => void;
}

function ProfileRow({ icon, iconBg, title, value, onPress }: ProfileRowProps) {
  return (
    <button onClick={onPress} className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors">
      <div className={`w-9 h-9 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-gray-900 text-sm font-semibold">{title}</p>
        <div className="text-xs text-gray-400 mt-0.5">{value}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300" />
    </button>
  );
}
