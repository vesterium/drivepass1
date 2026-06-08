import { useState } from 'react';
import { createPortal } from 'react-dom';
import { openUrl } from '../core/native/capacitor';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Car, CreditCard, Smartphone, Shield, Loader2, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { PRICING_PACKAGES } from '../constants/pricing';
import { useLanguage } from '../contexts/LanguageContext';
import { apiHeaders } from '../utils/apiClient';

interface SubscriptionModalProps {
  accessToken: string;
  user: any;
  onClose: () => void;
  onActivated: () => void;
  initialTier?: 'personal' | 'business';
}

type Step = 'plan' | 'plate' | 'payment' | 'processing' | 'success';

export function SubscriptionModal({ accessToken, user, onClose, onActivated, initialTier }: SubscriptionModalProps) {
  const { language } = useLanguage();
  const [step, setStep] = useState<Step>('plan');
  const [selectedTier, setSelectedTier] = useState<'personal' | 'business'>(initialTier ?? 'personal');
  const [carPlate, setCarPlate] = useState(user?.user_metadata?.car_number || '');
  const [paymentProvider, setPaymentProvider] = useState<'payme' | 'click'>('payme');
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'sandbox' | 'real'>('sandbox');
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);

  const API = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;
  const headers = apiHeaders(accessToken);

  const formatCarPlate = (value: string) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    let formatted = '';
    for (let i = 0; i < cleaned.length && i < 9; i++) {
      if (i === 2 || i === 3 || i === 6) formatted += ' ';
      formatted += cleaned[i];
    }
    return formatted;
  };

  const handlePayment = async () => {
    if (!carPlate || carPlate.replace(/\s/g, '').length < 8) {
      toast.error('Введите госномер автомобиля');
      return;
    }
    setLoading(true);
    setStep('processing');
    try {
      const initRes = await fetch(`${API}/payment/initiate`, {
        method: 'POST', headers,
        body: JSON.stringify({ tier: selectedTier, carPlate: carPlate.replace(/\s/g, ''), provider: paymentProvider }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) {
        toast.error(initData.error || 'Ошибка инициализации платежа');
        setStep('payment'); setLoading(false); return;
      }
      if (paymentMode === 'real') {
        const urlRes = await fetch(`${API}/payment/redirect-url`, {
          method: 'POST', headers,
          body: JSON.stringify({ paymentId: initData.paymentId, provider: paymentProvider }),
        });
        const urlData = await urlRes.json();
        if (urlData.redirectUrl) {
          setPendingPaymentId(initData.paymentId);
          setRedirectUrl(urlData.redirectUrl);
          setLoading(false);
          return;
        }
        toast.info('Merchant ID не настроен — используется sandbox');
      }
      await new Promise(r => setTimeout(r, 1800));
      const confirmRes = await fetch(`${API}/payment/confirm`, {
        method: 'POST', headers,
        body: JSON.stringify({ paymentId: initData.paymentId }),
      });
      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) {
        toast.error(confirmData.error || 'Ошибка подтверждения платежа');
        setStep('payment'); setLoading(false); return;
      }
      setStep('success');
      setTimeout(() => { onActivated(); onClose(); }, 2500);
    } catch (e) {
      console.error('Payment error:', e);
      toast.error('Ошибка оплаты. Попробуйте снова.');
      setStep('payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!pendingPaymentId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/payment/confirm`, {
        method: 'POST', headers,
        body: JSON.stringify({ paymentId: pendingPaymentId }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setStep('success');
        setTimeout(() => { onActivated(); onClose(); }, 2500);
      } else {
        toast.error('Оплата ещё не поступила. Завершите в ' + (paymentProvider === 'payme' ? 'Payme' : 'Click'));
      }
    } catch { toast.error('Ошибка проверки'); }
    finally { setLoading(false); }
  };

  return (
    createPortal(
    <AnimatePresence>
      <motion.div
        key="sub-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed flex items-end justify-center z-[9999]"
        style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="sub-panel"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.85 }}
          className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden"
          style={{ maxHeight: '92vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-2 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'plan'       && 'Выберите тариф'}
              {step === 'plate'      && 'Госномер авто'}
              {step === 'payment'    && 'Способ оплаты'}
              {step === 'processing' && 'Обработка...'}
              {step === 'success'    && 'Подписка активна! 🎉'}
            </h2>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              style={{ minHeight: 0 }}
            >
              <X className="w-4 h-4 text-gray-600" />
            </motion.button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 76px)' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="px-6 py-5"
              >
                {/* STEP 1: Plan */}
                {step === 'plan' && (
                  <div className="space-y-3">
                    {/* Light */}
                    <motion.button
                      whileTap={{ scale: 0.985 }}
                      onClick={() => setSelectedTier('personal')}
                      className="w-full rounded-2xl p-5 text-left transition-all"
                      style={{
                        border: `2px solid ${selectedTier === 'personal' ? '#3b82f6' : '#e5e7eb'}`,
                        background: selectedTier === 'personal' ? '#eff6ff' : '#fff',
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-lg">Light</span>
                          </div>
                          <p className="text-gray-500 text-sm mt-1">4 мойки в месяц</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600">390 000</p>
                          <p className="text-xs text-gray-500">сум/мес</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>🏠 Мойке 80%: 312 000 сум</span>
                        <span>·</span>
                        <span>Экономия 35%</span>
                      </div>
                    </motion.button>

                    {/* Standard */}
                    <motion.button
                      whileTap={{ scale: 0.985 }}
                      onClick={() => setSelectedTier('business')}
                      className="w-full rounded-2xl p-5 text-left transition-all relative"
                      style={{
                        border: `2px solid ${selectedTier === 'business' ? '#7c3aed' : '#e5e7eb'}`,
                        background: selectedTier === 'business' ? '#faf5ff' : '#fff',
                      }}
                    >
                      <div className="absolute -top-3 left-4">
                        <span className="bg-violet-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full">★ ХИТ ПРОДАЖ</span>
                      </div>
                      <div className="flex items-start justify-between mb-3 mt-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-lg">Standard</span>
                          </div>
                          <p className="text-gray-500 text-sm mt-1">6 моек в месяц</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-violet-600">590 000</p>
                          <p className="text-xs text-gray-500">сум/мес</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>🏠 Мойке 80%: 472 000 сум</span>
                        <span>·</span>
                        <span>Экономия 41%</span>
                      </div>
                    </motion.button>

                    {/* Premium — mapped to 'business' type until backend supports 3 tiers */}
                    <motion.button
                      whileTap={{ scale: 0.985 }}
                      onClick={() => {
                        // Show Premium info — mapped to business tier for now
                        setSelectedTier('business');
                      }}
                      className="w-full rounded-2xl p-5 text-left transition-all"
                      style={{
                        border: '2px solid #e5e7eb',
                        background: '#fffbeb',
                        opacity: 0.7,
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-lg">Premium</span>
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Скоро</span>
                          </div>
                          <p className="text-gray-500 text-sm mt-1">10 моек в месяц</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-amber-500">890 000</p>
                          <p className="text-xs text-gray-500">сум/мес</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>🏠 Мойке 80%: 712 000 сум</span>
                        <span>·</span>
                        <span>Экономия 55%</span>
                      </div>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setStep('plate')}
                      className="w-full text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
                    >
                      Продолжить <ChevronRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                )}

                {/* STEP 2: Plate */}
                {step === 'plate' && (
                  <div className="space-y-5">
                    <div className="rounded-xl p-4 text-center" style={{ background: selectedTier === 'personal' ? '#eff6ff' : '#faf5ff' }}>
                      <p className="text-sm font-medium mb-1" style={{ color: selectedTier === 'personal' ? '#1d4ed8' : '#7c3aed' }}>
                        Тариф: {selectedTier === 'personal' ? 'Light' : 'Standard'}
                      </p>
                      <p className="text-2xl font-bold" style={{ color: selectedTier === 'personal' ? '#1e40af' : '#6d28d9' }}>
                        {selectedTier === 'personal' ? '390 000' : '590 000'} сум/мес
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Car className="w-4 h-4 text-blue-600" /> Госномер автомобиля
                      </label>
                      <input
                        type="text"
                        placeholder="30 A 777 AA"
                        value={carPlate}
                        onChange={e => setCarPlate(formatCarPlate(e.target.value))}
                        maxLength={11}
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 font-mono text-xl text-center tracking-widest text-gray-900 focus:outline-none focus:border-blue-500 uppercase transition-colors"
                      />
                      <p className="text-xs text-gray-400 mt-2 text-center">Пример: 01 A 123 AA или 30 T 777 BB</p>
                    </div>
                    <div className="rounded-xl p-4 flex gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                      <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">1 подписка = 1 автомобиль</p>
                        <p className="text-xs text-amber-700 mt-1">QR привязан к госномеру.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setStep('plan')} className="flex-1 border-2 border-gray-200 text-gray-700 py-4 rounded-xl font-semibold">Назад</button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setStep('payment')}
                        disabled={carPlate.replace(/\s/g, '').length < 8}
                        className="flex-1 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
                      >
                        К оплате <ChevronRight className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Payment */}
                {step === 'payment' && (
                  <div className="space-y-5">
                    {/* Summary */}
                    <div className="rounded-xl p-4" style={{ background: '#f9fafb' }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-sm">Тариф</span>
                        <span className="font-semibold text-gray-900">{selectedTier === 'personal' ? 'Personal' : 'Business (Такси)'}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-500 text-sm">Госномер</span>
                        <span className="font-mono font-bold text-gray-900">{carPlate}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 mt-1" style={{ borderTop: '1px solid #e5e7eb' }}>
                        <span className="font-bold text-gray-900">Итого</span>
                        <span className="font-bold text-xl text-blue-700">
                          {selectedTier === 'personal' ? '390 000' : '590 000'} сум
                        </span>
                      </div>
                    </div>

                    {/* Payment method */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3">Способ оплаты</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { id: 'payme', icon: CreditCard, label: 'Payme', activeColor: '#2563eb', activeBg: '#eff6ff', activeBorder: '#3b82f6' },
                          { id: 'click', icon: Smartphone, label: 'Click',  activeColor: '#16a34a', activeBg: '#f0fdf4', activeBorder: '#22c55e' },
                        ].map(({ id, icon: Icon, label, activeColor, activeBg, activeBorder }) => {
                          const active = paymentProvider === id;
                          return (
                            <motion.button
                              key={id}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => setPaymentProvider(id as 'payme' | 'click')}
                              className="p-4 rounded-xl text-center transition-all"
                              style={{
                                border: `2px solid ${active ? activeBorder : '#e5e7eb'}`,
                                background: active ? activeBg : '#fff',
                              }}
                            >
                              <Icon className="w-7 h-7 mx-auto mb-2" style={{ color: active ? activeColor : '#9ca3af' }} />
                              <p className="font-bold text-sm" style={{ color: active ? activeColor : '#6b7280' }}>{label}</p>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex rounded-xl p-1 gap-1" style={{ background: '#f3f4f6' }}>
                      {[
                        { id: 'sandbox', label: '🧪 Тест' },
                        { id: 'real',    label: '💳 Реальная' },
                      ].map(({ id, label }) => (
                        <motion.button
                          key={id}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setPaymentMode(id as 'sandbox' | 'real')}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: paymentMode === id ? '#fff' : 'transparent',
                            color: paymentMode === id ? '#111827' : '#9ca3af',
                            boxShadow: paymentMode === id ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                          }}
                        >
                          {label}
                        </motion.button>
                      ))}
                    </div>

                    <div
                      className="rounded-xl p-3 text-center text-xs"
                      style={{ background: paymentMode === 'sandbox' ? '#fffbeb' : '#eff6ff', border: `1px solid ${paymentMode === 'sandbox' ? '#fde68a' : '#bfdbfe'}` }}
                    >
                      <span style={{ color: paymentMode === 'sandbox' ? '#b45309' : '#1d4ed8' }}>
                        {paymentMode === 'sandbox'
                          ? '🧪 Тестовый режим — деньги не списываются'
                          : `💳 Оплата через ${paymentProvider === 'payme' ? 'Payme' : 'Click'} — нужен Merchant ID`}
                      </span>
                    </div>

                    {redirectUrl ? (
                      <div className="space-y-3">
                        <button
                          onClick={() => openUrl(redirectUrl)}
                          className="w-full text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', minHeight: 0 }}
                        >
                          <ExternalLink className="w-5 h-5" />
                          Открыть {paymentProvider === 'payme' ? 'Payme' : 'Click'} →
                        </button>
                        <button onClick={handleCheckPayment} disabled={loading}
                          className="w-full bg-green-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                          Проверить оплату
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button onClick={() => setStep('plate')} className="flex-1 border-2 border-gray-200 text-gray-700 py-4 rounded-xl font-semibold">Назад</button>
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={handlePayment}
                          disabled={loading}
                          className="flex-1 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', boxShadow: '0 4px 16px rgba(22,163,74,0.28)' }}
                        >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '💳'}
                          Оплатить
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: Processing */}
                {step === 'processing' && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Обработка платежа</h3>
                    <p className="text-gray-400 text-sm">Подождите несколько секунд...</p>
                  </div>
                )}

                {/* STEP 5: Success */}
                {step === 'success' && (
                  <div className="text-center py-8">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 24, delay: 0.1 }}
                      className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5"
                    >
                      <Check className="w-12 h-12 text-green-600" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Подписка активна!</h3>
                    <p className="text-gray-500 mb-5 text-sm">
                      Тариф {selectedTier === 'personal' ? 'Personal' : 'Business'} · {carPlate}
                    </p>
                    <div className="rounded-xl p-4 text-left space-y-2" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      {['QR-код готов к использованию', '1 мойка каждые 24 часа', 'Все партнёрские автомойки'].map(txt => (
                        <div key={txt} className="flex items-center gap-2 text-sm text-green-800">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" /><span>{txt}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-4">Закрытие через 2.5 секунды...</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    , document.body)
  );
}
