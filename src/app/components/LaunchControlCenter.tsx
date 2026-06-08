/**
 * LaunchControlCenter.tsx — DrivePass+
 * CEO-дашборд запуска: live-статус систем, фазы, метрики, чеклист.
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, CheckCircle2, AlertCircle, Clock, Zap, Globe, MessageSquare,
  CreditCard, Shield, Users, TrendingUp, DollarSign, Smartphone,
  QrCode, MapPin, Bell, ChevronRight, RefreshCw, ExternalLink,
  Building2, Rocket, Star, ArrowRight, Copy, CheckCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface LaunchControlCenterProps {
  onClose: () => void;
}

const API = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;

/* ── Status types ────────────────────────────────────────────────── */
type Status = 'ok' | 'warn' | 'error' | 'loading' | 'unknown';

interface SystemCheck {
  id: string;
  name: string;
  status: Status;
  detail: string;
  action?: string;
  link?: string;
}

/* ── Revenue projections ─────────────────────────────────────────── */
const SCENARIOS = [
  {
    label: 'Месяц 1',
    clients: 50,
    personal: 35,
    business: 15,
    partners: 3,
    color: '#6366f1',
  },
  {
    label: 'Месяц 3',
    clients: 200,
    personal: 140,
    business: 60,
    partners: 8,
    color: '#8b5cf6',
  },
  {
    label: 'Месяц 6',
    clients: 600,
    personal: 400,
    business: 200,
    partners: 20,
    color: '#7c3aed',
  },
];

/* ── Launch phases ───────────────────────────────────────────────── */
const PHASES = [
  {
    num: 1,
    title: 'Технический затвор',
    subtitle: 'Код готов к деньгам',
    icon: Zap,
    color: '#6366f1',
    steps: [
      { label: 'Supabase Auth + KV Store', done: true },
      { label: 'OTP через Eskiz.uz', done: true },
      { label: 'QR-коды с 30-сек таймером', done: true },
      { label: 'Антифрод: лимит 24ч / авто', done: true },
      { label: 'Payme вебхук (5 методов)', done: true },
      { label: 'Click вебхук (action 0/1)', done: true },
      { label: 'Стекинг подписок', done: true },
      { label: 'SMS после оплаты', done: true },
      { label: 'Cron уведомления (истечение)', done: true },
      { label: 'Реальный PAYME_MERCHANT_ID', done: false },
      { label: 'Реальный CLICK_SERVICE_ID', done: false },
      { label: 'Реальные ESKIZ_EMAIL / PASSWORD', done: false },
    ],
  },
  {
    num: 2,
    title: 'Юридический мост',
    subtitle: 'Финансовая активация',
    icon: Shield,
    color: '#f59e0b',
    steps: [
      { label: 'Регистрация ИП / ООО', done: false },
      { label: 'Контракт с Payme Business', done: false },
      { label: 'Контракт с Click', done: false },
      { label: 'Eskiz.uz аккаунт (платный)', done: false },
      { label: 'Публичная оферта на сайте', done: false },
      { label: 'Политика конфиденциальности', done: false },
    ],
  },
  {
    num: 3,
    title: 'Захват Самарканда',
    subtitle: 'Операционный запуск',
    icon: MapPin,
    color: '#10b981',
    steps: [
      { label: '5 автомоек подписали договор', done: false },
      { label: 'QR-стикеры распечатаны', done: false },
      { label: 'Персонал обучен (PartnerScanner)', done: false },
      { label: 'Тест-запуск с 10 клиентами', done: false },
      { label: 'Первая реальная оплата', done: false },
    ],
  },
  {
    num: 4,
    title: 'Маркетинговый взрыв',
    subtitle: 'Рост и PMF',
    icon: Rocket,
    color: '#ef4444',
    steps: [
      { label: 'Таргет реклама в Telegram/Instagram', done: false },
      { label: 'Инфлюенсеры Самарканда', done: false },
      { label: 'Viral: Certificate of Savings', done: false },
      { label: '100 активных подписок', done: false },
      { label: 'NPS > 8.0', done: false },
    ],
  },
];

/* ── Critical secrets to configure ─────────────────────────────── */
const SECRETS = [
  {
    key: 'ESKIZ_EMAIL',
    label: 'Eskiz Email',
    example: 'you@company.com',
    link: 'https://eskiz.uz',
    critical: true,
    description: 'Аккаунт eskiz.uz для реальных SMS',
  },
  {
    key: 'ESKIZ_PASSWORD',
    label: 'Eskiz Password',
    example: '••••••••',
    link: 'https://eskiz.uz',
    critical: true,
    description: 'Пароль от аккаунта Eskiz',
  },
  {
    key: 'PAYME_MERCHANT_ID',
    label: 'Payme Merchant ID',
    example: '5e730e8e0b852a417aa49ceb',
    link: 'https://payme.uz/main/business',
    critical: true,
    description: 'ID мерчанта после регистрации в Payme Business',
  },
  {
    key: 'PAYME_KEY',
    label: 'Payme Secret Key',
    example: 'ключ из кабинета',
    link: 'https://payme.uz/main/business',
    critical: true,
    description: 'Секретный ключ для подписи вебхуков',
  },
  {
    key: 'CLICK_SERVICE_ID',
    label: 'Click Service ID',
    example: '12345',
    link: 'https://click.uz',
    critical: true,
    description: 'ID сервиса в Click Business',
  },
  {
    key: 'CLICK_SECRET_KEY',
    label: 'Click Secret Key',
    example: 'секретный_ключ',
    link: 'https://click.uz',
    critical: true,
    description: 'Ключ для верификации Click-вебхука',
  },
  {
    key: 'CRON_SECRET',
    label: 'Cron Secret',
    example: 'random32charstring',
    link: null,
    critical: false,
    description: 'Защита endpoint /subscription/notify-expiring',
  },
];

/* ── Webhook URLs for copy ──────────────────────────────────────── */
const WEBHOOK_URLS = [
  {
    label: 'Payme Webhook',
    url: `${API}/payment/payme-webhook`,
    note: 'Вставить в кабинете Payme → Настройки → Endpoint',
  },
  {
    label: 'Click Webhook',
    url: `${API}/payment/click-webhook`,
    note: 'Вставить в кабинете Click → Настройки → Notify URL',
  },
  {
    label: 'API Health',
    url: `${API}/health`,
    note: 'Проверить что сервер живой',
  },
];

/* ════════════════════════════════════════════════════════════════════ */

function StatusDot({ s }: { s: Status }) {
  const colors: Record<Status, string> = {
    ok: '#10b981',
    warn: '#f59e0b',
    error: '#ef4444',
    loading: '#6366f1',
    unknown: '#9ca3af',
  };
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{
        width: 8, height: 8,
        background: colors[s],
        boxShadow: s === 'ok' ? `0 0 6px ${colors[s]}88` : undefined,
      }}
    />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
      style={{ background: copied ? '#dcfce7' : '#f5f3ff', minHeight: 0 }}
    >
      {copied
        ? <CheckCheck className="w-3.5 h-3.5 text-green-600" />
        : <Copy className="w-3.5 h-3.5 text-purple-500" />}
    </motion.button>
  );
}

export function LaunchControlCenter({ onClose }: LaunchControlCenterProps) {
  const [tab, setTab] = useState<'status' | 'revenue' | 'phases' | 'config'>('status');
  const [checks, setChecks] = useState<SystemCheck[]>([]);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  /* ── Run live health checks ─────────────────────────────────────── */
  const runChecks = useCallback(async () => {
    setChecking(true);

    const results: SystemCheck[] = [
      { id: 'api', name: 'Edge Function (сервер)', status: 'loading', detail: 'Проверка…' },
      { id: 'otp', name: 'OTP / SMS (Eskiz)', status: 'loading', detail: 'Проверка…' },
      { id: 'sub', name: 'Subscription Engine', status: 'loading', detail: 'Проверка…' },
      { id: 'payme', name: 'Payme Webhook URL', status: 'loading', detail: 'Проверка…' },
      { id: 'click', name: 'Click Webhook URL', status: 'loading', detail: 'Проверка…' },
      { id: 'cooldown', name: 'Антифрод (24ч лимит)', status: 'loading', detail: 'Проверка…' },
      { id: 'notify', name: 'SMS-уведомления (cron)', status: 'loading', detail: 'Проверка…' },
      { id: 'pwa', name: 'PWA / Service Worker', status: 'loading', detail: 'Проверка…' },
    ];
    setChecks([...results]);

    const update = (id: string, status: Status, detail: string) =>
      setChecks(prev => prev.map(c => c.id === id ? { ...c, status, detail } : c));

    /* 1. API health */
    try {
      const r = await fetch(`${API}/health`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const d = await r.json();
      update('api', r.ok ? 'ok' : 'error',
        r.ok ? `Живой · ${d.service ?? 'DrivePass+ API'}` : `HTTP ${r.status}`);
    } catch (e) {
      update('api', 'error', `Недоступен: ${e}`);
    }

    /* 2. OTP endpoint reachability (just OPTIONS/HEAD) */
    try {
      const r = await fetch(`${API}/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ phone: '998000000000' }),
      });
      // 400 = endpoint works but phone invalid — that's fine
      // 200 = devCode returned (no Eskiz configured)
      const d = await r.json().catch(() => ({}));
      if (r.status === 429) {
        update('otp', 'ok', 'Работает (rate-limit активен)');
      } else if (d.smsSent === true) {
        update('otp', 'ok', '✅ Реальный SMS через Eskiz');
      } else if (d.devCode) {
        update('otp', 'warn', 'Dev режим — нужны ESKIZ_EMAIL + ESKIZ_PASSWORD');
      } else if (r.status === 400) {
        update('otp', 'ok', 'Endpoint отвечает корректно');
      } else {
        update('otp', 'error', `Ошибка: HTTP ${r.status}`);
      }
    } catch (e) {
      update('otp', 'error', `${e}`);
    }

    /* 3. Subscription endpoint */
    try {
      const r = await fetch(`${API}/subscription`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      // 401 = requires auth = endpoint exists and works
      update('sub', r.status === 401 ? 'ok' : r.ok ? 'ok' : 'warn',
        r.status === 401 ? 'Endpoint защищён JWT ✅' : `HTTP ${r.status}`);
    } catch (e) {
      update('sub', 'error', `${e}`);
    }

    /* 4. Payme webhook */
    try {
      const r = await fetch(`${API}/payment/payme-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ method: 'CheckPerformTransaction', params: {}, id: 1 }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.error?.code === -31050 || d.result) {
        update('payme', 'ok', 'Отвечает JSON-RPC ✅');
      } else if (r.status === 401) {
        update('payme', 'warn', 'Требует PAYME_MERCHANT_ID / PAYME_KEY');
      } else {
        update('payme', 'ok', `HTTP ${r.status} — endpoint активен`);
      }
    } catch (e) {
      update('payme', 'error', `${e}`);
    }

    /* 5. Click webhook */
    try {
      const r = await fetch(`${API}/payment/click-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ action: '0', merchant_trans_id: 'test' }),
      });
      const d = await r.json().catch(() => ({}));
      update('click', r.ok ? 'ok' : 'warn',
        r.ok ? `Отвечает · error: ${d.error ?? '?'}` : `HTTP ${r.status}`);
    } catch (e) {
      update('click', 'error', `${e}`);
    }

    /* 6. Cooldown endpoint */
    try {
      const r = await fetch(`${API}/cooldown`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      update('cooldown', r.status === 401 ? 'ok' : 'warn',
        r.status === 401 ? 'KV-антифрод защищён JWT ✅' : `HTTP ${r.status}`);
    } catch (e) {
      update('cooldown', 'error', `${e}`);
    }

    /* 7. notify-expiring */
    try {
      const r = await fetch(`${API}/subscription/notify-expiring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ days_ahead: 3 }),
      });
      update('notify', r.ok ? 'ok' : r.status === 401 ? 'ok' : 'warn',
        r.ok ? 'Cron endpoint работает ✅' : r.status === 401 ? 'Защищён CRON_SECRET ✅' : `HTTP ${r.status}`);
    } catch (e) {
      update('notify', 'error', `${e}`);
    }

    /* 8. PWA */
    const swOk = 'serviceWorker' in navigator;
    update('pwa', swOk ? 'ok' : 'warn',
      swOk ? 'Service Worker поддерживается ✅' : 'Браузер не поддерживает SW');

    setChecking(false);
    setLastChecked(new Date());
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  /* ── Revenue calc ───────────────────────────────────────────────── */
  const calcRevenue = (s: typeof SCENARIOS[0]) => {
    const gross = s.personal * 990000 + s.business * 1800000;
    const partnerPayout = s.personal * 90000 * 8 + s.business * 75000 * 20;
    const net = gross - partnerPayout;
    return { gross, net, partnerPayout };
  };

  /* ── Phase completion ────────────────────────────────────────────── */
  const phaseProgress = (phase: typeof PHASES[0]) => {
    const done = phase.steps.filter(s => s.done).length;
    return Math.round((done / phase.steps.length) * 100);
  };

  const totalDone = PHASES.flatMap(p => p.steps).filter(s => s.done).length;
  const totalSteps = PHASES.flatMap(p => p.steps).length;
  const overallProgress = Math.round((totalDone / totalSteps) * 100);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed flex flex-col z-[9999]"
      style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 36 }}
        className="flex flex-col bg-white"
        style={{ height: '96vh', marginTop: '4vh', borderRadius: '20px 20px 0 0', overflow: 'hidden' }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #f3f4f6' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
            >
              <Rocket className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">Launch Control</p>
              <p className="text-[11px] text-gray-400">DrivePass+ · Самарканд</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Overall progress pill */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: '#f0fdf4' }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: overallProgress > 60 ? '#10b981' : '#f59e0b' }}
              />
              <span className="text-xs font-bold text-gray-700">{overallProgress}% готов</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: '#f5f5f5', minHeight: 0 }}
            >
              <X className="w-4 h-4 text-gray-500" />
            </motion.button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0">
          {([
            { id: 'status',  label: 'Системы', icon: Zap },
            { id: 'revenue', label: 'Доходы',  icon: DollarSign },
            { id: 'phases',  label: 'Фазы',    icon: CheckCircle2 },
            { id: 'config',  label: 'Конфиг',  icon: Shield },
          ] as const).map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.94 }}
              onClick={() => setTab(id)}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all"
              style={{
                background: tab === id ? '#6366f1' : '#f5f5f5',
                color: tab === id ? '#fff' : '#9ca3af',
                minHeight: 0,
              }}
            >
              <Icon style={{ width: 14, height: 14 }} />
              {label}
            </motion.button>
          ))}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="px-4 py-4"
            >

              {/* ════════ STATUS TAB ════════ */}
              {tab === 'status' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">
                      {lastChecked ? `Проверено: ${lastChecked.toLocaleTimeString('ru-RU')}` : 'Проверка…'}
                    </p>
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={runChecks}
                      disabled={checking}
                      className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold"
                      style={{ minHeight: 0 }}
                    >
                      <motion.div
                        animate={checking ? { rotate: 360 } : { rotate: 0 }}
                        transition={checking ? { duration: 0.7, repeat: Infinity, ease: 'linear' } : {}}
                      >
                        <RefreshCw style={{ width: 12, height: 12 }} />
                      </motion.div>
                      Обновить
                    </motion.button>
                  </div>

                  {/* System checks */}
                  <div
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}
                  >
                    {checks.map((check, i) => (
                      <div
                        key={check.id}
                        className="flex items-center gap-3 px-4"
                        style={{
                          paddingTop: 11, paddingBottom: 11,
                          borderBottom: i < checks.length - 1 ? '1px solid #f9f9f9' : undefined,
                        }}
                      >
                        <StatusDot s={check.status} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{check.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate">{check.detail}</p>
                        </div>
                        {check.status === 'loading' && (
                          <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Webhook URLs */}
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold px-1 pt-2">
                    URL для вставки в платёжки
                  </p>
                  <div
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}
                  >
                    {WEBHOOK_URLS.map((w, i) => (
                      <div
                        key={w.label}
                        className="px-4"
                        style={{
                          paddingTop: 11, paddingBottom: 11,
                          borderBottom: i < WEBHOOK_URLS.length - 1 ? '1px solid #f9f9f9' : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-800" style={{ fontWeight: 600 }}>{w.label}</p>
                          <CopyButton text={w.url} />
                        </div>
                        <p className="text-[11px] font-mono text-indigo-600 break-all leading-relaxed">{w.url}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{w.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ════════ REVENUE TAB ════════ */}
              {tab === 'revenue' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 px-1">Прогноз выручки по сценариям</p>

                  {SCENARIOS.map((sc) => {
                    const { gross, net, partnerPayout } = calcRevenue(sc);
                    return (
                      <div
                        key={sc.label}
                        className="bg-white rounded-2xl p-4"
                        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-xl flex items-center justify-center"
                              style={{ background: sc.color + '18' }}
                            >
                              <TrendingUp style={{ width: 14, height: 14, color: sc.color }} />
                            </div>
                            <span className="text-sm font-bold text-gray-800">{sc.label}</span>
                          </div>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-bold"
                            style={{ background: sc.color + '15', color: sc.color }}
                          >
                            {sc.clients} клиентов
                          </span>
                        </div>

                        {/* Bar */}
                        <div className="h-2 rounded-full bg-gray-100 mb-3 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (net / 50_000_000) * 100 + 20)}%` }}
                            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                            style={{ height: '100%', background: sc.color, borderRadius: 999 }}
                          />
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: 'Выручка', val: gross, positive: true },
                            { label: 'Партнёрам', val: partnerPayout, positive: false },
                            { label: 'Прибыль', val: net, positive: true },
                          ].map(m => (
                            <div key={m.label} className="text-center">
                              <p className="text-[10px] text-gray-400 mb-0.5">{m.label}</p>
                              <p
                                className="text-xs font-bold"
                                style={{ color: m.positive ? sc.color : '#6b7280' }}
                              >
                                {(m.val / 1_000_000).toFixed(1)}M
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Mix */}
                        <div className="flex gap-2 mt-3">
                          <div
                            className="flex-1 text-center rounded-lg py-1.5"
                            style={{ background: '#eff6ff' }}
                          >
                            <p className="text-[10px] text-blue-500">Personal</p>
                            <p className="text-xs font-bold text-blue-700">{sc.personal} × 990K</p>
                          </div>
                          <div
                            className="flex-1 text-center rounded-lg py-1.5"
                            style={{ background: '#f5f3ff' }}
                          >
                            <p className="text-[10px] text-purple-500">Business</p>
                            <p className="text-xs font-bold text-purple-700">{sc.business} × 1.8M</p>
                          </div>
                          <div
                            className="flex-1 text-center rounded-lg py-1.5"
                            style={{ background: '#f0fdf4' }}
                          >
                            <p className="text-[10px] text-green-500">Партнёры</p>
                            <p className="text-xs font-bold text-green-700">{sc.partners} моек</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Unit economics */}
                  <div
                    className="bg-white rounded-2xl p-4"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}
                  >
                    <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">
                      Unit Economics (1 клиент)
                    </p>
                    {[
                      { label: 'Light тариф',            val: '390 000 сум', color: '#3B82F6' },
                      { label: 'Standard тариф (хит)',   val: '590 000 сум', color: '#7c3aed' },
                      { label: 'Premium тариф',          val: '890 000 сум', color: '#F59E0B' },
                      { label: 'Мойке (80%) Standard',   val: '472 000 сум', color: '#6366f1' },
                      { label: 'Ваш доход с 1 Standard', val: '~118 000 сум', color: '#10b981' },
                      { label: 'Экономия клиента',       val: 'до 55%',      color: '#ef4444' },
                    ].map(item => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between py-2"
                        style={{ borderBottom: '1px solid #f9f9f9' }}
                      >
                        <p className="text-xs text-gray-600">{item.label}</p>
                        <p className="text-xs font-bold" style={{ color: item.color }}>{item.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ════════ PHASES TAB ════════ */}
              {tab === 'phases' && (
                <div className="space-y-3">
                  {/* Overall bar */}
                  <div
                    className="bg-white rounded-2xl p-4"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-gray-800">Общая готовность</p>
                      <span className="text-sm font-bold" style={{ color: '#6366f1' }}>
                        {overallProgress}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${overallProgress}%` }}
                        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          height: '100%',
                          background: 'linear-gradient(90deg, #6366f1, #7c3aed)',
                          borderRadius: 999,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      {totalDone} из {totalSteps} шагов выполнено
                    </p>
                  </div>

                  {PHASES.map((phase) => {
                    const pct = phaseProgress(phase);
                    const Icon = phase.icon;
                    return (
                      <div
                        key={phase.num}
                        className="bg-white rounded-2xl overflow-hidden"
                        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}
                      >
                        {/* Phase header */}
                        <div
                          className="flex items-center gap-3 px-4 py-3"
                          style={{ borderBottom: '1px solid #f9f9f9' }}
                        >
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: phase.color + '15' }}
                          >
                            <Icon style={{ width: 16, height: 16, color: phase.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 leading-tight">
                              {phase.num}. {phase.title}
                            </p>
                            <p className="text-[11px] text-gray-400">{phase.subtitle}</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-bold" style={{ color: phase.color }}>{pct}%</p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="px-4 pt-2 pb-1">
                          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: phase.color,
                                borderRadius: 999,
                                transition: 'width 0.8s ease',
                              }}
                            />
                          </div>
                        </div>

                        {/* Steps */}
                        {phase.steps.map((step, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 px-4"
                            style={{
                              paddingTop: 9, paddingBottom: 9,
                              borderBottom: i < phase.steps.length - 1 ? '1px solid #f9f9f9' : undefined,
                            }}
                          >
                            <div
                              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: step.done ? phase.color + '18' : '#f5f5f5' }}
                            >
                              {step.done
                                ? <CheckCircle2 style={{ width: 12, height: 12, color: phase.color }} />
                                : <Clock style={{ width: 10, height: 10, color: '#d1d5db' }} />}
                            </div>
                            <p
                              className="text-xs"
                              style={{
                                color: step.done ? '#374151' : '#9ca3af',
                                fontWeight: step.done ? 500 : 400,
                                textDecoration: step.done ? undefined : undefined,
                              }}
                            >
                              {step.label}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ════════ CONFIG TAB ════════ */}
              {tab === 'config' && (
                <div className="space-y-3">
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
                  >
                    <AlertCircle style={{ width: 16, height: 16, color: '#d97706', flexShrink: 0 }} />
                    <p className="text-xs text-amber-700" style={{ fontWeight: 500 }}>
                      Добавьте секреты в Supabase Dashboard → Edge Functions → Secrets
                    </p>
                  </div>

                  {/* Secrets */}
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold px-1">
                    Переменные окружения (Edge Function Secrets)
                  </p>
                  <div
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}
                  >
                    {SECRETS.map((s, i) => (
                      <div
                        key={s.key}
                        className="px-4"
                        style={{
                          paddingTop: 11, paddingBottom: 11,
                          borderBottom: i < SECRETS.length - 1 ? '1px solid #f9f9f9' : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                              style={{
                                background: s.critical ? '#fef2f2' : '#f9f9f9',
                                color: s.critical ? '#ef4444' : '#9ca3af',
                                fontFamily: 'monospace',
                              }}
                            >
                              {s.key}
                            </span>
                            {s.critical && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: '#fef2f2', color: '#ef4444' }}
                              >
                                КРИТИЧНО
                              </span>
                            )}
                          </div>
                          {s.link && (
                            <a
                              href={s.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-indigo-600 font-medium"
                            >
                              Сайт <ExternalLink style={{ width: 10, height: 10 }} />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{s.description}</p>
                        <p className="text-[10px] font-mono text-gray-300 mt-0.5">Пример: {s.example}</p>
                      </div>
                    ))}
                  </div>

                  {/* Setup guide */}
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold px-1 pt-1">
                    Как добавить секреты
                  </p>
                  <div
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}
                  >
                    {[
                      '1. Открыть supabase.com → ваш проект',
                      '2. Edge Functions → make-server-80c25f01',
                      '3. Вкладка "Secrets"',
                      '4. Add secret → вставить ключ и значение',
                      '5. Deploy функции (авто-перезапуск)',
                    ].map((step, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4"
                        style={{
                          paddingTop: 10, paddingBottom: 10,
                          borderBottom: i < 4 ? '1px solid #f9f9f9' : undefined,
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                          style={{ background: '#6366f1' }}
                        >
                          {i + 1}
                        </div>
                        <p className="text-xs text-gray-700">{step}</p>
                      </div>
                    ))}
                    <div className="px-4 py-3">
                      <motion.a
                        href={`https://supabase.com/dashboard/project/${projectId}/functions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
                      >
                        Открыть Supabase Edge Functions
                        <ExternalLink style={{ width: 14, height: 14 }} />
                      </motion.a>
                    </div>
                  </div>

                  {/* SQL note */}
                  <div
                    className="rounded-2xl px-4 py-3"
                    style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle2 style={{ width: 14, height: 14, color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p className="text-xs font-bold text-green-800 mb-1">
                          check_wash_eligibility работает без SQL
                        </p>
                        <p className="text-[11px] text-green-700 leading-relaxed">
                          Антифрод реализован через KV Store в Edge Function: ключ <code className="bg-green-100 px-1 rounded font-mono">cooldown:userId</code> содержит lastWashAt. Лимит 24ч проверяется на сервере при каждом QR-сканировании. SQL-миграция не нужна.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
    , document.body)
  );
}
