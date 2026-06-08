/**
 * LaunchChecklist — DrivePass+ Production Launch Panel
 *
 * Три задачи для перехода с 95% → 100%:
 *  1. SQL  — развернуть check_wash_eligibility v2 + новые функции
 *  2. Secrets — прописать Merchant ID в Supabase Edge Functions
 *  3. Webhooks — зарегистрировать URL в Payme / Click dashboard
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Database, Key, Webhook, CheckCircle2, Circle,
  Copy, ExternalLink, ChevronDown, ChevronUp,
  AlertTriangle, Zap, RefreshCw, Terminal,
  MessageSquare, Clock, ArrowRight,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';

interface LaunchChecklistProps {
  onClose: () => void;
}

type TaskId = 'sql' | 'secrets' | 'webhooks';

// ─── SQL текст для копирования ───────────────────────────────────────────────
const SQL_GRANT = `-- ШАГ 1: Запустить в Supabase → SQL Editor → New query
-- Включает антифрод + авто-продление подписок

GRANT EXECUTE ON FUNCTION public.check_wash_eligibility(TEXT)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.fn_nearest_car_washes(DECIMAL, DECIMAL, INTEGER)
  TO authenticated;`;

const SQL_V2 = `-- ШАГ 2: Улучшенная check_wash_eligibility v2
-- (добавляет проверку статуса подписки)
CREATE OR REPLACE FUNCTION public.check_wash_eligibility(vehicle_plate_input TEXT)
RETURNS JSONB AS $$
DECLARE
    last_wash_ts   TIMESTAMP WITH TIME ZONE;
    is_eligible    BOOLEAN;
    secs_remaining INTEGER;
    sub_id         UUID;
    sub_tier       TEXT;
    sub_expires    TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT id, tier, end_date INTO sub_id, sub_tier, sub_expires
    FROM   public.subscriptions
    WHERE  car_plate = vehicle_plate_input
      AND  status = 'active' AND end_date > NOW()
    ORDER  BY end_date DESC LIMIT 1;

    IF sub_id IS NULL THEN
        RETURN jsonb_build_object('eligible', FALSE,
            'error', 'no_active_subscription',
            'error_message', 'Нет активной подписки',
            'seconds_remaining', 0, 'last_wash_at', NULL);
    END IF;

    SELECT washed_at INTO last_wash_ts
    FROM   public.wash_history
    WHERE  car_plate = vehicle_plate_input
    ORDER  BY washed_at DESC LIMIT 1;

    IF last_wash_ts IS NULL OR (NOW() - last_wash_ts) > INTERVAL '24 hours' THEN
        is_eligible := TRUE;  secs_remaining := 0;
    ELSE
        is_eligible := FALSE;
        secs_remaining := 86400 - EXTRACT(EPOCH FROM (NOW() - last_wash_ts))::INTEGER;
    END IF;

    RETURN jsonb_build_object(
        'eligible', is_eligible, 'seconds_remaining', secs_remaining,
        'last_wash_at', last_wash_ts, 'tier', sub_tier,
        'sub_expires_at', sub_expires, 'subscription_id', sub_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.check_wash_eligibility(TEXT) TO authenticated;`;

const SQL_FN_EXPIRING = `-- ШАГ 3: Функция для SMS-уведомлений о продлении
CREATE OR REPLACE FUNCTION public.fn_expiring_subscriptions(days_ahead INTEGER DEFAULT 3)
RETURNS TABLE (user_id UUID, phone TEXT, full_name TEXT,
               car_plate TEXT, tier TEXT, end_date TIMESTAMPTZ, days_left INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT s.user_id, u.phone, u.name, s.car_plate, s.tier, s.end_date,
           EXTRACT(DAY FROM (s.end_date - NOW()))::INTEGER AS days_left
    FROM   public.subscriptions s JOIN public.users u ON u.id = s.user_id
    WHERE  s.status = 'active'
      AND  s.end_date BETWEEN NOW() AND NOW() + (days_ahead||' days')::INTERVAL
    ORDER  BY s.end_date ASC;
$$;
GRANT EXECUTE ON FUNCTION public.fn_expiring_subscriptions(INTEGER) TO service_role;`;

const SQL_FN_EXTEND = `-- ШАГ 4: Атомарное продление подписки (стакинг)
CREATE OR REPLACE FUNCTION public.fn_extend_subscription(
    p_user_id UUID, p_car_plate TEXT, p_tier TEXT,
    p_payment_id TEXT, p_provider TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    existing_end TIMESTAMPTZ;
    new_start    TIMESTAMPTZ;
    new_end      TIMESTAMPTZ;
    sub_id       UUID := gen_random_uuid();
BEGIN
    SELECT MAX(end_date) INTO existing_end FROM public.subscriptions
    WHERE  user_id = p_user_id AND status = 'active' AND end_date > NOW();
    IF existing_end IS NOT NULL THEN
        new_start := existing_end; new_end := existing_end + INTERVAL '30 days';
        UPDATE public.subscriptions SET status = 'expired'
        WHERE  user_id = p_user_id AND status = 'active';
    ELSE
        new_start := NOW(); new_end := NOW() + INTERVAL '30 days';
    END IF;
    INSERT INTO public.subscriptions
        (id, user_id, tier, car_plate, price_paid, start_date, end_date,
         status, payment_method, payment_transaction_id)
    VALUES (sub_id, p_user_id, p_tier, upper(p_car_plate),
            CASE p_tier WHEN 'business' THEN 450000 ELSE 220000 END,
            new_start, new_end, 'active', p_provider, p_payment_id)
    ON CONFLICT (payment_transaction_id) DO NOTHING;
    UPDATE public.users
    SET subscription_tier = p_tier, subscription_start_date = new_start,
        subscription_end_date = new_end WHERE id = p_user_id;
    RETURN jsonb_build_object('subscription_id', sub_id,
        'start_date', new_start, 'end_date', new_end,
        'tier', p_tier, 'stacked', (existing_end IS NOT NULL));
END; $$;
GRANT EXECUTE ON FUNCTION public.fn_extend_subscription(UUID,TEXT,TEXT,TEXT,TEXT) TO service_role;`;

const SQL_CRON = `-- ШАГ 5 (опционально): pg_cron для авто-экспирации + SMS
-- Включить в Dashboard → Database → Extensions → pg_cron + pg_net

CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Авто-экспирация: каждый день в 02:00 UTC
SELECT cron.schedule('drivepass-expire-subs', '0 2 * * *', $$
    UPDATE public.subscriptions SET status = 'expired'
    WHERE  status = 'active' AND end_date < NOW();
    UPDATE public.users u SET subscription_tier = 'none'
    WHERE  NOT EXISTS (SELECT 1 FROM public.subscriptions s
    WHERE  s.user_id = u.id AND s.status = 'active')
    AND    u.subscription_tier != 'none';
$$);

-- SMS-напоминания: каждый день в 09:00 UTC (14:00 Ташкент)
SELECT cron.schedule('drivepass-renewal-sms', '0 9 * * *', $$
    SELECT net.http_post(
        url     := 'https://${projectId}.supabase.co/functions/v1/make-server-80c25f01/subscription/notify-expiring',
        headers := jsonb_build_object('Content-Type','application/json',
                       'x-cron-secret', current_setting('app.settings.cron_secret',true)),
        body    := '{"days_ahead":3}'::jsonb);
$$);`;

// ─── Секреты ──────────────────────────────────────────────────────────────────
const SECRETS = [
  {
    group: 'Payme Business',
    link: 'https://business.payme.uz',
    color: 'blue',
    vars: [
      { name: 'PAYME_MERCHANT_ID', hint: 'Из настроек магазина Payme Business', example: 'paycom_merchant_id_here' },
      { name: 'PAYME_KEY',         hint: 'Секретный ключ (Key) из кабинета Payme', example: 'payme_secret_key_here' },
    ],
  },
  {
    group: 'Click Partners',
    link: 'https://merchant.click.uz',
    color: 'green',
    vars: [
      { name: 'CLICK_SERVICE_ID',  hint: 'ID сервиса в личном кабинете Click', example: '12345' },
      { name: 'CLICK_MERCHANT_ID', hint: 'ID мерчанта в Click Partners', example: '67890' },
      { name: 'CLICK_SECRET_KEY',  hint: 'Секретный ключ для верификации sign_string', example: 'click_secret_here' },
    ],
  },
  {
    group: 'Cron & SMS',
    link: 'https://eskiz.uz',
    color: 'purple',
    vars: [
      { name: 'CRON_SECRET',       hint: 'Любая случайная строка, защищает /notify-expiring', example: 'random_secret_32chars' },
      { name: 'ESKIZ_EMAIL',       hint: 'Email аккаунта Eskiz.uz (для SMS OTP)', example: 'your@email.com' },
      { name: 'ESKIZ_PASSWORD',    hint: 'Пароль аккаунта Eskiz.uz', example: 'eskiz_password' },
    ],
  },
];

// ─── Webhook URLs ─────────────────────────────────────────────────────────────
const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;

const WEBHOOKS = [
  {
    provider: 'Payme Business',
    icon: '💳',
    color: 'blue',
    where: 'Payme Business → Настройки → URL для уведомлений',
    link: 'https://business.payme.uz',
    url: `${BASE_URL}/payment/payme-webhook`,
    method: 'POST',
    auth: 'Basic base64(PAYME_MERCHANT_ID:PAYME_KEY)',
    notes: [
      'Поддерживает: CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction, CheckTransaction',
      'При PerformTransaction подписка автоматически создаётся/продлевается',
    ],
  },
  {
    provider: 'Click Partners',
    icon: '📱',
    color: 'green',
    where: 'Click Partners → Мои сервисы → Подготовительный URL + Выполненный URL',
    link: 'https://merchant.click.uz',
    url: `${BASE_URL}/payment/click-webhook`,
    method: 'POST (form-data)',
    auth: 'sign_string = MD5(trans_id+service_id+secret+merchant_trans_id+amount+action+time)',
    notes: [
      'Action 0 (prepare): проверяет платёж',
      'Action 1 (complete): активирует/продлевает подписку',
    ],
  },
];

// ─── Компонент ───────────────────────────────────────────────────────────────

export function LaunchChecklist({ onClose }: LaunchChecklistProps) {
  const [activeTab, setActiveTab] = useState<TaskId>('sql');
  const [expandedSql, setExpandedSql] = useState<string | null>('grant');
  const [copiedKey, setCopiedKey]   = useState<string | null>(null);
  const [done, setDone]             = useState<Set<string>>(new Set());

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      toast.success('Скопировано в буфер!');
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const toggleDone = (key: string) => {
    setDone(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const totalTasks = 8;
  const doneCount  = done.size;
  const progress   = Math.round((doneCount / totalTasks) * 100);

  const tabs: { id: TaskId; label: string; icon: typeof Database; count: number }[] = [
    { id: 'sql',      label: 'SQL',      icon: Database, count: 5 },
    { id: 'secrets',  label: 'Секреты',  icon: Key,      count: 3 },
    { id: 'webhooks', label: 'Вебхуки',  icon: Webhook,  count: 2 },
  ];

  const sqlBlocks = [
    { id: 'grant',    title: 'GRANT EXECUTE (критично)',   code: SQL_GRANT,       badge: '🔴 Обязательно' },
    { id: 'v2',       title: 'check_wash_eligibility v2',  code: SQL_V2,          badge: '🔴 Обязательно' },
    { id: 'expiring', title: 'fn_expiring_subscriptions',  code: SQL_FN_EXPIRING, badge: '🟡 Рекомендуется' },
    { id: 'extend',   title: 'fn_extend_subscription',     code: SQL_FN_EXTEND,   badge: '🟡 Рекомендуется' },
    { id: 'cron',     title: 'pg_cron (авто-экспирация)',  code: SQL_CRON,        badge: '⚪ Опционально' },
  ];

  return (
    createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed flex items-end sm:items-center justify-center p-0 sm:p-4 z-[9999]"
      style={{ top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-white font-black text-base leading-tight">Запуск DrivePass+</h2>
                <p className="text-gray-400 text-xs">Последние 3 технических задачи</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: progress >= 80 ? '#22c55e' : progress >= 40 ? '#f59e0b' : '#3b82f6' }}
              />
            </div>
            <span className="text-white text-xs font-bold whitespace-nowrap">
              {doneCount}/{totalTasks} выполнено
            </span>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="border-b border-gray-100 px-5 pt-3 pb-0 flex gap-1 flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-t-xl text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-gray-900 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ══ TAB: SQL ══════════════════════════════════════════════════ */}
          {activeTab === 'sql' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Где запускать</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Supabase Dashboard →{' '}
                    <a href={`https://supabase.com/dashboard/project/${projectId}/sql/new`}
                       target="_blank" rel="noopener noreferrer"
                       className="underline font-semibold">
                      SQL Editor → New query
                    </a>
                    {' '}→ вставить → Run
                  </p>
                </div>
              </div>

              {sqlBlocks.map(block => (
                <div key={block.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedSql(prev => prev === block.id ? null : block.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={e => { e.stopPropagation(); toggleDone(block.id); }}
                        className="flex-shrink-0"
                      >
                        {done.has(block.id)
                          ? <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                          : <Circle className="w-4.5 h-4.5 text-gray-300" />
                        }
                      </button>
                      <span className={`text-sm font-semibold ${done.has(block.id) ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {block.title}
                      </span>
                      <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded-full text-gray-500">
                        {block.badge}
                      </span>
                    </div>
                    {expandedSql === block.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedSql === block.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="relative">
                          <pre className="text-[11px] leading-relaxed text-gray-700 bg-gray-900 text-green-300 p-4 overflow-x-auto">
                            <code>{block.code}</code>
                          </pre>
                          <button
                            onClick={() => copy(block.code, block.id)}
                            className="absolute top-2 right-2 flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            {copiedKey === block.id
                              ? <><CheckCircle2 className="w-3 h-3 text-green-400" /> Скопировано</>
                              : <><Copy className="w-3 h-3" /> Копировать</>
                            }
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </>
          )}

          {/* ══ TAB: SECRETS ════════════════════════════════════════════ */}
          {activeTab === 'secrets' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex gap-3">
                <Terminal className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Где добавлять</p>
                  <a
                    href={`https://supabase.com/dashboard/project/${projectId}/functions`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-700 underline font-semibold flex items-center gap-1 mt-0.5"
                  >
                    Supabase Dashboard → Edge Functions → Manage secrets
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {SECRETS.map(group => (
                <div key={group.group} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className={`flex items-center justify-between px-4 py-3 ${
                    group.color === 'blue' ? 'bg-blue-50' :
                    group.color === 'green' ? 'bg-green-50' : 'bg-purple-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleDone(group.group)}>
                        {done.has(group.group)
                          ? <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                          : <Circle className="w-4.5 h-4.5 text-gray-300" />
                        }
                      </button>
                      <span className={`text-sm font-bold ${
                        done.has(group.group) ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}>
                        {group.group}
                      </span>
                    </div>
                    <a
                      href={group.link} target="_blank" rel="noopener noreferrer"
                      className={`text-xs underline flex items-center gap-1 ${
                        group.color === 'blue' ? 'text-blue-600' :
                        group.color === 'green' ? 'text-green-600' : 'text-purple-600'
                      }`}
                    >
                      Открыть <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {group.vars.map(v => (
                      <div key={v.name} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <code className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                            {v.name}
                          </code>
                          <button
                            onClick={() => copy(v.name, v.name)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {copiedKey === v.name
                              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              : <Copy className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">{v.hint}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5 font-mono italic">
                          Пример: {v.example}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ══ TAB: WEBHOOKS ════════════════════════════════════════════ */}
          {activeTab === 'webhooks' && (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
                <p className="text-xs text-gray-600 font-medium">
                  После регистрации в Payme Business / Click Partners скопируй эти URL
                  в настройки платёжной системы.
                </p>
              </div>

              {WEBHOOKS.map(wh => (
                <div key={wh.provider} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className={`flex items-center justify-between px-4 py-3 ${
                    wh.color === 'blue' ? 'bg-blue-50' : 'bg-green-50'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => toggleDone(wh.provider)}>
                        {done.has(wh.provider)
                          ? <CheckCircle2 className="w-4.5 h-4.5 text-green-500" />
                          : <Circle className="w-4.5 h-4.5 text-gray-300" />
                        }
                      </button>
                      <span className="text-lg">{wh.icon}</span>
                      <span className={`text-sm font-bold ${
                        done.has(wh.provider) ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}>
                        {wh.provider}
                      </span>
                    </div>
                    <a
                      href={wh.link} target="_blank" rel="noopener noreferrer"
                      className={`text-xs underline flex items-center gap-1 ${
                        wh.color === 'blue' ? 'text-blue-600' : 'text-green-600'
                      }`}
                    >
                      Кабинет <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="px-4 py-4 space-y-3">
                    {/* Where to register */}
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold mb-1">
                        Где прописать
                      </p>
                      <p className="text-xs text-gray-700">{wh.where}</p>
                    </div>

                    {/* URL */}
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold mb-1">
                        Webhook URL
                      </p>
                      <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-3 py-2">
                        <code className="text-green-300 text-[11px] flex-1 break-all">{wh.url}</code>
                        <button
                          onClick={() => copy(wh.url, wh.provider + '_url')}
                          className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
                        >
                          {copiedKey === wh.provider + '_url'
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            : <Copy className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Method */}
                    <div className="flex gap-4">
                      <div>
                        <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Метод</p>
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{wh.method}</span>
                      </div>
                    </div>

                    {/* Auth */}
                    <div>
                      <p className="text-[11px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Авторизация</p>
                      <p className="text-xs text-gray-600 font-mono bg-gray-50 px-2.5 py-2 rounded-lg">{wh.auth}</p>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1">
                      {wh.notes.map((note, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Test endpoint */}
              <div className="border border-dashed border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                  <p className="text-sm font-semibold text-gray-700">Тест SMS-уведомлений</p>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Вызвать вручную, чтобы убедиться, что Eskiz и pg_cron настроены правильно.
                </p>
                <div className="bg-gray-900 rounded-lg p-3 text-[11px] font-mono text-green-300">
                  <p className="text-gray-400">curl -X POST \</p>
                  <p className="ml-2">{BASE_URL}/subscription/notify-expiring \</p>
                  <p className="ml-2 text-gray-400">-H "x-cron-secret: YOUR_CRON_SECRET" \</p>
                  <p className="ml-2 text-gray-400">-d '{`{"days_ahead": 7}`}'</p>
                </div>
                <button
                  onClick={() => copy(
                    `curl -X POST ${BASE_URL}/subscription/notify-expiring -H "x-cron-secret: YOUR_CRON_SECRET" -d '{"days_ahead": 7}'`,
                    'curl_test'
                  )}
                  className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {copiedKey === 'curl_test'
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    : <Copy className="w-3.5 h-3.5" />
                  }
                  Скопировать curl
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 px-5 py-4 flex items-center justify-between flex-shrink-0 bg-gray-50">
          <div className="flex items-center gap-2">
            {progress >= 100
              ? <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-sm font-bold text-green-700">Всё готово к запуску!</span></>
              : <>
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    Отметь задачи по мере выполнения
                  </span>
                </>
            }
          </div>
          <button
            onClick={onClose}
            className="bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors active:scale-95"
          >
            Закрыть
          </button>
        </div>
      </motion.div>
    </motion.div>
    , document.body)
  );
}
