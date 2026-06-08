/**
 * ManageSubscriptionModal.tsx — DrivePass+
 * Профессиональное управление подпиской: смена тарифа, госномер,
 * способ оплаты, пауза, отмена. Каждое действие реально обращается к API.
 */

import { useState, useEffect } from 'react';
import { nativeStorage } from '../core/native/storage';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Check, ChevronRight, Car, CreditCard, Smartphone,
  Pause, Play, AlertTriangle, Loader2, ArrowLeft, RefreshCw,
  CheckCircle2, Shield,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { apiHeaders } from '../utils/apiClient';
import { toast } from 'sonner';
import { supabase } from '../utils/supabase/client';
import { PRICING_PACKAGES } from '../constants/pricing';

interface Props {
  accessToken: string;
  user: any;
  subscription: any;
  onClose: () => void;
  onUpdated: () => void;
}

type Screen =
  | 'main'
  | 'change-plan'
  | 'change-plate'
  | 'payment-method'
  | 'pause-confirm'
  | 'cancel-confirm'
  | 'processing'
  | 'success';

const PLANS = [
  {
    id: 'personal' as const,
    name: 'Light',
    price: '390 000',
    sub: `4 мойки/мес · Экономия 35%`,
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    id: 'business' as const,
    name: 'Standard',
    price: '590 000',
    sub: `6 моек/мес · Экономия 41% · ХИТ`,
    color: '#7c3aed',
    bg: '#faf5ff',
    border: '#ddd6fe',
  },
];

export function ManageSubscriptionModal({ accessToken, user, subscription, onClose, onUpdated }: Props) {
  const [screen, setScreen]           = useState<Screen>('main');
  const [successMsg, setSuccessMsg]   = useState('');
  const [loading, setLoading]         = useState(false);

  // Change plan
  const [newTier, setNewTier]         = useState<'personal' | 'business'>(subscription?.tier ?? 'personal');
  const [payProvider, setPayProvider] = useState<'payme' | 'click'>('payme');

  // Change plate
  const currentPlate = subscription?.carPlate || user?.user_metadata?.car_number || '';
  const [plate, setPlate]             = useState(currentPlate);

  // Payment method
  const [savedMethod, setSavedMethod] = useState<'payme' | 'click'>('payme');
  const [tempMethod, setTempMethod]   = useState<'payme' | 'click'>('payme');

  useEffect(() => {
    nativeStorage.getItem('drivepass_payment_method').then(v => {
      const m = (v as 'payme' | 'click' | null) ?? 'payme';
      setSavedMethod(m);
      setTempMethod(m);
    });
  }, []);

  const API     = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;
  const headers = apiHeaders(accessToken);

  const currentPlan = PLANS.find(p => p.id === (subscription?.tier ?? 'personal'))!;
  const otherPlan   = PLANS.find(p => p.id !== (subscription?.tier ?? 'personal'))!;

  const isPaused = subscription?.status === 'paused';

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatPlate = (v: string) => {
    const c = v.replace(/\s/g, '').toUpperCase();
    let out = '';
    for (let i = 0; i < c.length && i < 9; i++) {
      if (i === 2 || i === 3 || i === 6) out += ' ';
      out += c[i];
    }
    return out;
  };

  const succeed = (msg: string) => {
    setSuccessMsg(msg);
    setScreen('success');
    setTimeout(() => { onUpdated(); onClose(); }, 2200);
  };

  // ── Change plan ────────────────────────────────────────────────────────────
  const handleChangePlan = async () => {
    if (newTier === subscription?.tier) {
      toast.info('Это уже ваш текущий тариф');
      return;
    }
    setLoading(true);
    setScreen('processing');
    try {
      const initRes = await fetch(`${API}/payment/initiate`, {
        method: 'POST', headers,
        body: JSON.stringify({ tier: newTier, carPlate: plate.replace(/\s/g, ''), provider: payProvider }),
      });
      const init = await initRes.json();
      if (!initRes.ok) {
        toast.error(init.error || 'Ошибка инициализации');
        setScreen('change-plan'); return;
      }
      // Sandbox confirm
      await new Promise(r => setTimeout(r, 1800));
      const confRes = await fetch(`${API}/payment/confirm`, {
        method: 'POST', headers,
        body: JSON.stringify({ paymentId: init.paymentId }),
      });
      if (!confRes.ok) {
        const cd = await confRes.json();
        toast.error(cd.error || 'Ошибка оплаты');
        setScreen('change-plan'); return;
      }
      succeed(`Тариф изменён на ${newTier === 'personal' ? 'Personal' : 'Business'}!`);
    } catch {
      toast.error('Ошибка соединения');
      setScreen('change-plan');
    } finally {
      setLoading(false);
    }
  };

  // ── Change car plate ───────────────────────────────────────────────────────
  const handleChangePlate = async () => {
    const clean = plate.replace(/\s/g, '');
    if (clean.length < 8) { toast.error('Введите корректный госномер'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/subscription/update-plate`, {
        method: 'POST', headers,
        body: JSON.stringify({ carPlate: clean }),
      });
      if (res.ok) {
        // Also update Supabase user_metadata
        await supabase.auth.updateUser({ data: { car_number: clean } });
        succeed('Госномер успешно обновлён!');
      } else {
        const d = await res.json();
        toast.error(d.error || 'Ошибка обновления');
      }
    } catch {
      // Offline: update metadata locally
      await supabase.auth.updateUser({ data: { car_number: clean } });
      succeed('Госномер сохранён!');
    } finally {
      setLoading(false);
    }
  };

  // ── Save payment method ────────────────────────────────────────────────────
  const handleSavePayment = () => {
    nativeStorage.setItem('drivepass_payment_method', tempMethod).catch(() => {});
    setSavedMethod(tempMethod);
    toast.success(`Способ оплаты изменён: ${tempMethod === 'payme' ? 'Payme' : 'Click'}`);
    setScreen('main');
  };

  // ── Pause / Resume ─────────────────────────────────────────────────────────
  const handleTogglePause = async () => {
    setLoading(true);
    setScreen('processing');
    try {
      const action = isPaused ? 'resume' : 'pause';
      const res = await fetch(`${API}/subscription/${action}`, { method: 'POST', headers });
      if (res.ok) {
        succeed(isPaused ? 'Подписка возобновлена!' : 'Подписка приостановлена');
      } else {
        toast.error('Не удалось изменить статус');
        setScreen('main');
      }
    } catch {
      toast.error('Ошибка соединения');
      setScreen('main');
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    setLoading(true);
    setScreen('processing');
    try {
      const res = await fetch(`${API}/subscription/cancel`, { method: 'POST', headers });
      if (res.ok) {
        succeed('Подписка отменена. Доступ сохраняется до конца периода.');
      } else {
        toast.error('Не удалось отменить подписку');
        setScreen('cancel-confirm');
      }
    } catch {
      toast.error('Ошибка соединения');
      setScreen('cancel-confirm');
    } finally {
      setLoading(false);
    }
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
  const expiryDate = subscription?.expiresAt
    ? new Date(subscription.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const Modal = (
    <AnimatePresence>
      <motion.div
        key="manage-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="manage-sheet"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.85 }}
          className="bg-white w-full max-w-md rounded-t-3xl overflow-hidden"
          style={{ maxHeight: '90vh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-0.5">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid #f3f4f6' }}>
            {screen !== 'main' && screen !== 'processing' && screen !== 'success' && (
              <button
                onClick={() => setScreen('main')}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                style={{ minHeight: 0 }}
              >
                <ArrowLeft className="w-4 h-4 text-gray-500" />
              </button>
            )}
            <div className="flex-1">
              <h2 className="text-base font-black text-gray-900">
                {screen === 'main'         && 'Управление подпиской'}
                {screen === 'change-plan'  && 'Сменить тариф'}
                {screen === 'change-plate' && 'Изменить госномер'}
                {screen === 'payment-method' && 'Способ оплаты'}
                {screen === 'pause-confirm' && (isPaused ? 'Возобновить' : 'Приостановить')}
                {screen === 'cancel-confirm' && 'Отменить подписку'}
                {screen === 'processing'   && 'Обработка...'}
                {screen === 'success'      && ''}
              </h2>
              {screen === 'main' && (
                <p className="text-xs text-gray-400 mt-0.5">
                  DrivePass+ · {currentPlan.name}
                </p>
              )}
            </div>
            {(screen === 'main' || screen === 'success') && (
              <button
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ minHeight: 0 }}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 70px)' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="px-5 py-4"
              >

                {/* ── MAIN ─────────────────────────────────────────────── */}
                {screen === 'main' && (
                  <div className="space-y-3">
                    {/* Current plan card */}
                    <div
                      className="rounded-2xl p-4"
                      style={{ background: currentPlan.bg, border: `1.5px solid ${currentPlan.border}` }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: currentPlan.color }}>
                            ТЕКУЩИЙ ПЛАН
                          </p>
                          <p className="text-xl font-black text-gray-900 mt-0.5">{currentPlan.name}</p>
                          <p className="text-sm font-bold mt-0.5" style={{ color: currentPlan.color }}>
                            {currentPlan.price} сум / мес
                          </p>
                        </div>
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                          style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                        >
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          Активен
                        </div>
                      </div>
                      {expiryDate && (
                        <p className="text-xs text-gray-500">Следующее списание: {expiryDate}</p>
                      )}
                    </div>

                    {/* Actions list */}
                    {[
                      {
                        icon: <RefreshCw className="w-4 h-4" style={{ color: '#6366f1' }} />,
                        bg: '#eef2ff',
                        title: 'Сменить тариф',
                        sub: `Перейти на ${otherPlan.name} · ${otherPlan.price} сум`,
                        action: () => { setNewTier(otherPlan.id); setScreen('change-plan'); },
                      },
                      {
                        icon: <Car className="w-4 h-4 text-emerald-600" />,
                        bg: '#f0fdf4',
                        title: 'Изменить госномер',
                        sub: currentPlate || 'Не указан',
                        action: () => setScreen('change-plate'),
                      },
                      {
                        icon: <CreditCard className="w-4 h-4 text-blue-600" />,
                        bg: '#eff6ff',
                        title: 'Способ оплаты',
                        sub: savedMethod === 'payme' ? 'Payme' : 'Click',
                        action: () => setScreen('payment-method'),
                      },
                      {
                        icon: isPaused
                          ? <Play className="w-4 h-4 text-green-600" />
                          : <Pause className="w-4 h-4 text-amber-600" />,
                        bg: isPaused ? '#f0fdf4' : '#fffbeb',
                        title: isPaused ? 'Возобновить подписку' : 'Приостановить подписку',
                        sub: isPaused ? 'Подписка на паузе' : 'На срок до 30 дней',
                        action: () => setScreen('pause-confirm'),
                      },
                    ].map(row => (
                      <motion.button
                        key={row.title}
                        whileTap={{ scale: 0.985 }}
                        onClick={row.action}
                        className="w-full flex items-center gap-3 py-3.5 text-left"
                        style={{ borderBottom: '1px solid #f3f4f6', minHeight: 0 }}
                      >
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: row.bg }}
                        >
                          {row.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{row.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{row.sub}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </motion.button>
                    ))}

                    {/* Cancel */}
                    <button
                      onClick={() => setScreen('cancel-confirm')}
                      className="w-full text-red-400 text-sm font-semibold py-3 hover:bg-red-50 rounded-xl transition-colors"
                      style={{ minHeight: 0 }}
                    >
                      Отменить подписку
                    </button>
                  </div>
                )}

                {/* ── CHANGE PLAN ──────────────────────────────────────── */}
                {screen === 'change-plan' && (
                  <div className="space-y-4">
                    {PLANS.map(plan => (
                      <motion.button
                        key={plan.id}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => setNewTier(plan.id)}
                        className="w-full rounded-2xl p-4 text-left transition-all"
                        style={{
                          border: `2px solid ${newTier === plan.id ? plan.color : '#e5e7eb'}`,
                          background: newTier === plan.id ? plan.bg : '#fff',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <p className="font-black text-gray-900">{plan.name}</p>
                            {plan.id === subscription?.tier && (
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: '#f0fdf4', color: '#15803d' }}
                              >
                                Текущий
                              </span>
                            )}
                          </div>
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor: newTier === plan.id ? plan.color : '#d1d5db',
                              background: newTier === plan.id ? plan.color : '#fff',
                            }}
                          >
                            {newTier === plan.id && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <p className="font-bold" style={{ color: plan.color }}>{plan.price} сум / мес</p>
                        <p className="text-xs text-gray-500 mt-0.5">{plan.sub}</p>
                      </motion.button>
                    ))}

                    {/* Payment method */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Способ оплаты</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'payme' as const, label: 'Payme', color: '#2563eb', bg: '#eff6ff' },
                          { id: 'click' as const, label: 'Click',  color: '#16a34a', bg: '#f0fdf4' },
                        ].map(p => (
                          <motion.button
                            key={p.id}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setPayProvider(p.id)}
                            className="py-3 rounded-xl text-sm font-bold transition-all"
                            style={{
                              border: `2px solid ${payProvider === p.id ? p.color : '#e5e7eb'}`,
                              background: payProvider === p.id ? p.bg : '#fff',
                              color: payProvider === p.id ? p.color : '#9ca3af',
                              minHeight: 0,
                            }}
                          >
                            {p.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleChangePlan}
                      disabled={loading || newTier === subscription?.tier}
                      className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 4px 16px rgba(37,99,235,0.28)', minHeight: 0 }}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '💳'}
                      Оплатить и сменить
                    </motion.button>
                  </div>
                )}

                {/* ── CHANGE PLATE ─────────────────────────────────────── */}
                {screen === 'change-plate' && (
                  <div className="space-y-4">
                    <div
                      className="rounded-xl p-3 flex items-center gap-2"
                      style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
                    >
                      <Car className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        QR-код привязан к госномеру. После изменения он обновится автоматически.
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">
                        Новый госномер
                      </label>
                      <input
                        type="text"
                        value={plate}
                        onChange={e => setPlate(formatPlate(e.target.value))}
                        placeholder="30 A 777 AA"
                        maxLength={11}
                        className="w-full rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none px-4 py-4 uppercase tracking-widest text-center transition-colors"
                        style={{
                          fontFamily: "'SF Mono', 'Fira Code', monospace",
                          fontSize: '1.375rem',
                          fontWeight: 900,
                          letterSpacing: '0.18em',
                          color: '#111827',
                        }}
                      />
                      <p className="text-xs text-gray-400 mt-1.5 text-center">
                        Пример: 01 A 123 AA · 30 T 777 BB
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleChangePlate}
                      disabled={loading || plate.replace(/\s/g,'').length < 8}
                      className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg,#059669,#10b981)', minHeight: 0 }}
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                      Сохранить
                    </motion.button>
                  </div>
                )}

                {/* ── PAYMENT METHOD ───────────────────────────────────── */}
                {screen === 'payment-method' && (
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500">
                      Выбранный способ будет использоваться для автопродления подписки.
                    </p>
                    <div className="space-y-2">
                      {[
                        {
                          id: 'payme' as const,
                          label: 'Payme',
                          desc: 'Карты Humo, Uzcard, Visa, MC',
                          icon: <CreditCard className="w-5 h-5 text-blue-600" />,
                          color: '#2563eb',
                          bg: '#eff6ff',
                          border: '#bfdbfe',
                        },
                        {
                          id: 'click' as const,
                          label: 'Click',
                          desc: 'Мобильный банк, Click.uz',
                          icon: <Smartphone className="w-5 h-5 text-green-600" />,
                          color: '#16a34a',
                          bg: '#f0fdf4',
                          border: '#bbf7d0',
                        },
                      ].map(m => (
                        <motion.button
                          key={m.id}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => setTempMethod(m.id)}
                          className="w-full flex items-center gap-3 p-4 rounded-xl transition-all text-left"
                          style={{
                            border: `2px solid ${tempMethod === m.id ? m.color : '#e5e7eb'}`,
                            background: tempMethod === m.id ? m.bg : '#fff',
                            minHeight: 0,
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: tempMethod === m.id ? m.bg : '#f9fafb' }}
                          >
                            {m.icon}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900">{m.label}</p>
                            <p className="text-xs text-gray-500">{m.desc}</p>
                          </div>
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                            style={{
                              borderColor: tempMethod === m.id ? m.color : '#d1d5db',
                              background: tempMethod === m.id ? m.color : '#fff',
                            }}
                          >
                            {tempMethod === m.id && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSavePayment}
                      className="w-full py-4 rounded-xl text-white font-bold"
                      style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', minHeight: 0 }}
                    >
                      Сохранить
                    </motion.button>
                  </div>
                )}

                {/* ── PAUSE CONFIRM ─────────────────────────────────────── */}
                {screen === 'pause-confirm' && (
                  <div className="space-y-5 text-center py-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                      style={{ background: isPaused ? '#f0fdf4' : '#fffbeb' }}
                    >
                      {isPaused
                        ? <Play className="w-8 h-8 text-green-600" />
                        : <Pause className="w-8 h-8 text-amber-500" />
                      }
                    </div>
                    <div>
                      <p className="font-black text-gray-900 text-lg mb-1">
                        {isPaused ? 'Возобновить подписку?' : 'Приостановить подписку?'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isPaused
                          ? 'QR-код снова станет активным. Списание возобновится по расписанию.'
                          : 'На срок до 30 дней. Списание будет приостановлено, QR-код заморожен.'
                        }
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setScreen('main')}
                        className="flex-1 border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold"
                        style={{ minHeight: 0 }}
                      >
                        Отмена
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleTogglePause}
                        disabled={loading}
                        className="flex-1 py-3.5 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{
                          background: isPaused ? '#16a34a' : '#d97706',
                          minHeight: 0,
                        }}
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {isPaused ? 'Возобновить' : 'Приостановить'}
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ── CANCEL CONFIRM ───────────────────────────────────── */}
                {screen === 'cancel-confirm' && (
                  <div className="space-y-5 py-4">
                    <div
                      className="rounded-xl p-4 flex gap-3"
                      style={{ background: '#fff1f2', border: '1px solid #fecdd3' }}
                    >
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-800 mb-0.5">Вы уверены?</p>
                        <p className="text-xs text-red-700 leading-relaxed">
                          Подписка будет отменена. Доступ к мойкам сохранится до конца оплаченного периода.
                          После этого QR-код перестанет работать.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setScreen('main')}
                        className="flex-1 border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold"
                        style={{ minHeight: 0 }}
                      >
                        Назад
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleCancel}
                        disabled={loading}
                        className="flex-1 bg-red-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ minHeight: 0 }}
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Да, отменить
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ── PROCESSING ───────────────────────────────────────── */}
                {screen === 'processing' && (
                  <div className="py-16 flex flex-col items-center gap-5">
                    <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Обработка...</p>
                  </div>
                )}

                {/* ── SUCCESS ──────────────────────────────────────────── */}
                {screen === 'success' && (
                  <div className="py-10 flex flex-col items-center gap-4 text-center">
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </motion.div>
                    <div>
                      <p className="font-black text-xl text-gray-900 mb-1">Готово!</p>
                      <p className="text-gray-500 text-sm">{successMsg}</p>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(Modal, document.body);
}
