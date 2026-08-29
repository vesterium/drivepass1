/**
 * SubscriptionModal — DrivePass+
 *
 * Purchase flow wired to the real backend: GET /plans for real pricing (per car class),
 * POST /purchase, POST /payment/confirm. Production runs PAYMENT_PROVIDER=card -- the
 * client transfers money to the owner's card by hand and taps "Я оплатил", the backend
 * notifies the owner via bot, and the owner confirms manually after checking their bank.
 * There is no automatic activation for card payments, so this never shows a fake instant
 * "success" screen -- only "ждём подтверждения владельца" until they actually confirm it.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Car, Shield, Loader2, ChevronRight, Clock, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { apiHeaders, apiUrl } from '../utils/apiClient';
import { LegalDocument } from './LegalDocument';
import { PUBLIC_OFFER, PRIVACY_POLICY } from '../constants/legal';

interface SubscriptionModalProps {
  accessToken: string;
  user: any;
  onClose: () => void;
  onActivated: () => void;
  initialTier?: 'personal' | 'business';
}

interface PlanOut {
  code: string;
  washesCount: number;
  carsAllowed: number;
  validityDays: number;
  priceByClass: Record<string, number>;
}

type Step = 'carClass' | 'plan' | 'plate' | 'payment' | 'pending' | 'success';
type CarClass = 'sedan' | 'crossover' | 'suv';

const CAR_CLASS_LABELS: Record<CarClass, string> = {
  sedan: 'Седан',
  crossover: 'Кроссовер',
  suv: 'Внедорожник',
};

export function SubscriptionModal({ accessToken, onClose, onActivated }: SubscriptionModalProps) {
  const [step, setStep] = useState<Step>('carClass');
  const [carClass, setCarClass] = useState<CarClass>('sedan');
  const [plans, setPlans] = useState<PlanOut[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanOut | null>(null);
  const [plates, setPlates] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [cardNumber, setCardNumber] = useState<string | null>(null);
  const [cardHolderName, setCardHolderName] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    fetch(apiUrl('/plans'))
      .then(r => r.json())
      .then((data: PlanOut[]) => setPlans(data))
      .catch(() => toast.error('Не удалось загрузить тарифы'))
      .finally(() => setPlansLoading(false));
  }, []);

  const formatPlate = (value: string) => {
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    let formatted = '';
    for (let i = 0; i < cleaned.length && i < 9; i++) {
      if (i === 2 || i === 3 || i === 6) formatted += ' ';
      formatted += cleaned[i];
    }
    return formatted;
  };

  const platesValid = plates.every(p => p.replace(/\s/g, '').length >= 8);

  const handlePurchase = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/purchase'), {
        method: 'POST',
        headers: apiHeaders(accessToken),
        body: JSON.stringify({
          planCode: selectedPlan.code,
          carClass,
          plates: plates.map(p => p.replace(/\s/g, '')),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Не удалось оформить подписку');
        return;
      }
      setPaymentId(data.paymentId);
      setAmount(data.amount);
      setCardNumber(data.cardNumber ?? null);
      setCardHolderName(data.cardHolderName ?? null);
      setStep('payment');
    } catch {
      toast.error('Ошибка сети. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPaid = async () => {
    if (!paymentId) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/payment/confirm'), {
        method: 'POST',
        headers: apiHeaders(accessToken),
        body: JSON.stringify({ paymentId: Number(paymentId) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.detail || 'Ошибка подтверждения');
        return;
      }
      if (data.status === 'confirmed') {
        setStep('success');
        setTimeout(() => { onActivated(); onClose(); }, 2200);
      } else {
        setStep('pending');
      }
    } catch {
      toast.error('Ошибка сети. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const copyCard = () => {
    if (!cardNumber) return;
    navigator.clipboard?.writeText(cardNumber.replace(/\s/g, ''));
    toast.success('Номер карты скопирован');
  };

  return <>{createPortal(
    <AnimatePresence>
      <motion.div
        key="sub-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed flex items-end justify-center z-[9999]"
        style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget && step !== 'pending') onClose(); }}
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
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          <div className="flex items-center justify-between px-6 pt-2 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
            <h2 className="text-lg font-bold text-gray-900">
              {step === 'carClass' && 'Класс автомобиля'}
              {step === 'plan'      && 'Выберите тариф'}
              {step === 'plate'     && (selectedPlan && selectedPlan.carsAllowed > 1 ? 'Госномера авто' : 'Госномер авто')}
              {step === 'payment'   && 'Оплата'}
              {step === 'pending'   && 'Ждём подтверждения'}
              {step === 'success'   && 'Подписка активна! 🎉'}
            </h2>
            {step !== 'pending' && (
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                style={{ minHeight: 0 }}
              >
                <X className="w-4 h-4 text-gray-600" />
              </motion.button>
            )}
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
                {/* STEP: Car class */}
                {step === 'carClass' && (
                  <div className="space-y-3">
                    {(Object.keys(CAR_CLASS_LABELS) as CarClass[]).map(cls => (
                      <motion.button
                        key={cls}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => setCarClass(cls)}
                        className="w-full rounded-2xl p-4 text-left flex items-center gap-3 transition-all"
                        style={{
                          border: `2px solid ${carClass === cls ? '#3b82f6' : '#e5e7eb'}`,
                          background: carClass === cls ? '#eff6ff' : '#fff',
                        }}
                      >
                        <Car className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">{CAR_CLASS_LABELS[cls]}</span>
                      </motion.button>
                    ))}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setStep('plan')}
                      className="w-full text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
                    >
                      Продолжить <ChevronRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                )}

                {/* STEP: Plan */}
                {step === 'plan' && (
                  <div className="space-y-3">
                    {plansLoading ? (
                      <div className="py-10 flex justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                      </div>
                    ) : (
                      plans.map(plan => {
                        const price = plan.priceByClass[carClass] ?? 0;
                        const active = selectedPlan?.code === plan.code;
                        return (
                          <motion.button
                            key={plan.code}
                            whileTap={{ scale: 0.985 }}
                            onClick={() => setSelectedPlan(plan)}
                            className="w-full rounded-2xl p-5 text-left transition-all"
                            style={{
                              border: `2px solid ${active ? '#7c3aed' : '#e5e7eb'}`,
                              background: active ? '#faf5ff' : '#fff',
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className="font-bold text-gray-900 text-lg capitalize">{plan.code}</span>
                                <p className="text-gray-500 text-sm mt-1">
                                  {plan.washesCount} моек · {plan.validityDays} дней
                                  {plan.carsAllowed > 1 ? ` · до ${plan.carsAllowed} авто` : ''}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold" style={{ color: active ? '#7c3aed' : '#111827' }}>
                                  {price.toLocaleString('ru-RU')}
                                </p>
                                <p className="text-xs text-gray-500">сум</p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })
                    )}
                    <div className="flex gap-3 pt-1">
                      <button onClick={() => setStep('carClass')} className="flex-1 border-2 border-gray-200 text-gray-700 py-4 rounded-xl font-semibold">Назад</button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setPlates(Array(selectedPlan?.carsAllowed ?? 1).fill(''));
                          setStep('plate');
                        }}
                        disabled={!selectedPlan}
                        className="flex-1 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
                      >
                        Продолжить <ChevronRight className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* STEP: Plate(s) */}
                {step === 'plate' && selectedPlan && (
                  <div className="space-y-5">
                    <div className="rounded-xl p-4 text-center" style={{ background: '#faf5ff' }}>
                      <p className="text-sm font-medium mb-1 capitalize" style={{ color: '#7c3aed' }}>
                        {selectedPlan.code} · {CAR_CLASS_LABELS[carClass]}
                      </p>
                      <p className="text-2xl font-bold" style={{ color: '#6d28d9' }}>
                        {(selectedPlan.priceByClass[carClass] ?? 0).toLocaleString('ru-RU')} сум
                      </p>
                    </div>
                    {plates.map((plate, i) => (
                      <div key={i}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Car className="w-4 h-4 text-blue-600" />
                          Госномер {plates.length > 1 ? `авто ${i + 1}` : 'автомобиля'}
                        </label>
                        <input
                          type="text"
                          placeholder="30 A 777 AA"
                          value={plate}
                          onChange={e => setPlates(p => p.map((v, idx) => (idx === i ? formatPlate(e.target.value) : v)))}
                          maxLength={11}
                          className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 font-mono text-xl text-center tracking-widest text-gray-900 focus:outline-none focus:border-blue-500 uppercase transition-colors"
                        />
                      </div>
                    ))}
                    <div className="rounded-xl p-4 flex gap-3" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                      <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">QR привязан к госномеру — сканирует мойщик при визите.</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setStep('plan')} className="flex-1 border-2 border-gray-200 text-gray-700 py-4 rounded-xl font-semibold">Назад</button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handlePurchase}
                        disabled={!platesValid || loading}
                        className="flex-1 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>К оплате <ChevronRight className="w-5 h-5" /></>}
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* STEP: Payment (card transfer) */}
                {step === 'payment' && (
                  <div className="space-y-5">
                    <div className="rounded-xl p-4 text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <p className="text-sm text-green-700 mb-1">К переводу</p>
                      <p className="text-3xl font-bold text-green-700">{amount.toLocaleString('ru-RU')} сум</p>
                    </div>

                    {cardNumber ? (
                      <div className="rounded-xl p-4" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                        <p className="text-xs text-gray-500 mb-1">Номер карты</p>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="font-mono text-lg font-bold text-gray-900 tracking-wide">{cardNumber}</span>
                          <button onClick={copyCard} className="p-2 rounded-lg bg-gray-100 flex-shrink-0">
                            <Copy className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                        {cardHolderName && (
                          <>
                            <p className="text-xs text-gray-500 mb-1">Получатель</p>
                            <p className="text-sm font-semibold text-gray-800">{cardHolderName}</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl p-4 text-center text-sm text-gray-500" style={{ background: '#f9fafb' }}>
                        Реквизиты для перевода уточните у владельца.
                      </div>
                    )}

                    <div className="rounded-xl p-3 text-center text-xs" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                      <span style={{ color: '#b45309' }}>
                        Переведите сумму на карту, затем нажмите «Я оплатил». Подписка активируется, когда владелец подтвердит платёж.
                      </span>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleConfirmPaid}
                      disabled={loading}
                      className="w-full text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #059669)', boxShadow: '0 4px 16px rgba(22,163,74,0.28)' }}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '💳'}
                      Я оплатил
                    </motion.button>

                    <p className="text-center text-[11px] text-gray-400 leading-relaxed">
                      Оплачивая, вы принимаете условия{' '}
                      <button onClick={() => setShowOfferModal(true)} className="underline text-gray-500">
                        публичной оферты
                      </button>{' '}
                      и{' '}
                      <button onClick={() => setShowPrivacyModal(true)} className="underline text-gray-500">
                        политики конфиденциальности
                      </button>
                      .
                    </p>
                  </div>
                )}

                {/* STEP: Pending owner confirmation */}
                {step === 'pending' && (
                  <div className="text-center py-8">
                    <motion.div
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5"
                    >
                      <Clock className="w-10 h-10 text-amber-600" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ждём подтверждения оплаты</h3>
                    <p className="text-gray-500 text-sm mb-5">
                      Владелец проверит перевод и подтвердит его вручную — обычно это занимает немного времени. Подписка появится на главном экране сразу после подтверждения.
                    </p>
                    <button
                      onClick={onClose}
                      className="w-full border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold"
                    >
                      Понятно
                    </button>
                  </div>
                )}

                {/* STEP: Success (mock/instant providers only) */}
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
                    <p className="text-gray-500 text-sm">QR-код уже готов к использованию</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )}
    <LegalDocument open={showOfferModal} onClose={() => setShowOfferModal(false)} title="Публичная оферта" sections={PUBLIC_OFFER} />
    <LegalDocument open={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} title="Политика конфиденциальности" sections={PRIVACY_POLICY} />
  </>;
}
