/**
 * PartnerDashboard.tsx — DrivePass+
 * Apple-inspired light & clean partner dashboard.
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeft, RefreshCw, QrCode, TrendingUp,
  Settings, BarChart3, Car, CheckCircle2, AlertTriangle,
  Clock, Wallet, ChevronRight, ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { usePartner } from '../contexts/PartnerContext';
import { PartnerScanner } from './PartnerScanner';
import { WashLocationQr } from './WashLocationQr';
import { PartnerSettings } from './PartnerSettings';
import { apiHeaders, apiUrl } from '../utils/apiClient';
import { PayoutReports } from './PayoutReports';

interface PartnerDashboardProps {
  onExitPartnerMode: () => void;
  accessToken?: string | null;
}

type Tab = 'overview' | 'scanner' | 'analytics' | 'payouts' | 'settings';

interface Stats {
  todayWashes: number;
  todayRevenue: number;
  monthlyWashes: number;
  monthlyRevenue: number;
  activeCustomers: number;
  totalWashes: number;
  balance: number;
  recentWashes: any[];
}

const TAB_ORDER: Tab[] = ['overview', 'scanner', 'analytics', 'payouts', 'settings'];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-xl bg-gray-100/80 animate-pulse ${className}`} />;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-2xl text-xs backdrop-blur-xl"
      style={{
        background: 'rgba(255,255,255,0.92)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)',
        color: '#1d1d1f',
      }}
    >
      <p className="text-gray-500 mb-0.5">{label}</p>
      <p className="text-gray-900">{payload[0].value} моек</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function PartnerDashboard({ onExitPartnerMode, accessToken }: PartnerDashboardProps) {
  const { t } = useLanguage();
  const { profile } = usePartner();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [tabDir, setTabDir] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headers = apiHeaders(accessToken);

  const PARTNER_ID = profile?.partnerId ?? '';
  const PARTNER_NAME = profile?.partnerName ?? 'Car Wash Partner';

  useEffect(() => { if (accessToken) fetchStats(false); }, [accessToken]);

  const fetchStats = async (isRefresh = true) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await fetch(apiUrl('/partner/stats'), { headers });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      console.error('Stats error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleTab = (id: Tab) => {
    const from = TAB_ORDER.indexOf(activeTab);
    const to = TAB_ORDER.indexOf(id);
    setTabDir(to > from ? 1 : -1);
    setActiveTab(id);
  };

  const fmtSum = (n: number) => `${(n || 0).toLocaleString('ru-RU')} сум`;
  const fmtNum = (n: number) => (n || 0).toLocaleString('ru-RU');

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (m < 1) return 'только что';
    if (m < 60) return `${m} мин. назад`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} ч. назад`;
    return `${Math.floor(h / 24)} д. назад`;
  };

  const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const chartData = DAYS_RU.map((d, i) => ({
    day: d,
    washes: stats?.recentWashes
      ? stats.recentWashes.filter((w: any) => {
          const wd = new Date(w.createdAt || 0).getDay();
          return ((wd + 6) % 7) === i;
        }).length
      : 0,
  }));

  const TABS = [
    { id: 'overview' as Tab, label: 'Обзор', icon: BarChart3 },
    { id: 'scanner' as Tab, label: 'Сканер', icon: QrCode },
    { id: 'analytics' as Tab, label: 'Аналитика', icon: TrendingUp },
    { id: 'payouts' as Tab, label: 'Выплаты', icon: Wallet },
    { id: 'settings' as Tab, label: 'Настройки', icon: Settings },
  ];

  // Apple-style card wrapper
  const Card = ({ children, className = '', noPad = false }: { children: React.ReactNode; className?: string; noPad?: boolean }) => (
    <div
      className={`bg-white rounded-2xl ${noPad ? '' : 'p-5'} ${className}`}
      style={{
        boxShadow: '0 0 0 0.5px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f7' }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header
        className="px-5 pt-5 pb-6"
        style={{ background: '#fff' }}
      >
        {/* Back */}
        <button
          onClick={onExitPartnerMode}
          className="flex items-center gap-1 mb-5 -ml-1"
          style={{ minHeight: 0 }}
        >
          <ArrowLeft className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-blue-500">
            Клиентский режим
          </span>
        </button>

        {/* Identity row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}
            >
              <span className="text-white text-lg">
                {PARTNER_NAME.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-gray-900 text-[17px]" style={{ letterSpacing: '-0.02em' }}>
                {PARTNER_NAME}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                ID: {PARTNER_ID.slice(0, 8).toUpperCase()}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: '#f5f5f7',
              minHeight: 0,
            }}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { duration: 0.7, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </motion.div>
          </motion.button>
        </div>

        {/* Stats row — 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Сегодня моек', value: String(stats?.todayWashes ?? 0), color: '#007AFF' },
            { label: 'Выручка', value: fmtSum(stats?.todayRevenue ?? 0), color: '#34C759' },
            { label: 'Клиентов', value: String(stats?.activeCustomers ?? 0), color: '#5856D6' },
            { label: 'Баланс', value: fmtSum(stats?.balance ?? 0), color: '#FF9500' },
          ].map(c => (
            <div
              key={c.label}
              className="rounded-2xl px-4 py-3.5"
              style={{ background: '#f5f5f7' }}
            >
              <p className="text-xs text-gray-400 mb-1.5">{c.label}</p>
              {loading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="text-[20px] text-gray-900 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                  {c.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </header>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20"
        style={{
          background: 'rgba(245,245,247,0.72)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex px-2" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => handleTab(tab.id)}
                whileTap={{ scale: 0.97 }}
                className="relative flex items-center gap-1.5 px-3.5 py-3 text-xs flex-shrink-0 transition-colors"
                style={{
                  color: active ? '#007AFF' : '#8e8e93',
                  minHeight: 0,
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {active && (
                  <motion.div
                    layoutId="partner-tab-line"
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{ background: '#007AFF' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────── */}
      <div className="px-4 py-5 pb-24 overflow-hidden">
        <AnimatePresence mode="wait" custom={tabDir} initial={false}>
          <motion.div
            key={activeTab}
            custom={tabDir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 24, scale: 0.995 }),
              center: { opacity: 1, x: 0, scale: 1 },
              exit: (d: number) => ({ opacity: 0, x: d * -18, scale: 0.995 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
          >

            {/* ── OVERVIEW ─────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-4">

                {/* Monthly summary */}
                <Card>
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Этот месяц
                    </p>
                    <span
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                      style={{ background: '#E8F9EE', color: '#34C759' }}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      Активно
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Моек</p>
                      {loading ? (
                        <Skeleton className="h-10 w-16" />
                      ) : (
                        <p className="text-[34px] text-gray-900 tracking-tight" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
                          {stats?.monthlyWashes ?? 0}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Выручка</p>
                      {loading ? (
                        <Skeleton className="h-10 w-28" />
                      ) : (
                        <div>
                          <p className="text-[28px] text-gray-900 tracking-tight" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
                            {fmtNum(stats?.monthlyRevenue ?? 0)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">сум</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Commission */}
                <Card>
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                      style={{ background: '#F2F2F7' }}
                    >
                      <Wallet className="w-5 h-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[15px] text-gray-900 mb-1" style={{ letterSpacing: '-0.01em' }}>Комиссионные</p>
                      <p className="text-[13px] text-gray-500 leading-relaxed">
                        Personal — <span className="text-gray-900">25 000 сум</span> за мойку
                        <br />
                        Business — <span className="text-gray-900">35 000 сум</span> за мойку
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Выплата 1-го числа каждого месяца
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Recent Washes */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <p className="text-[15px] text-gray-900" style={{ letterSpacing: '-0.01em' }}>
                      Последние мойки
                    </p>
                    <span className="text-xs text-gray-400">
                      {stats?.recentWashes?.length ?? 0} записей
                    </span>
                  </div>

                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
                    </div>
                  ) : !stats?.recentWashes?.length ? (
                    <Card className="flex flex-col items-center py-10">
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                        style={{ background: '#F2F2F7' }}
                      >
                        <QrCode className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-[15px] text-gray-900 mb-1">Моек пока нет</p>
                      <p className="text-[13px] text-gray-400 text-center max-w-[220px]">
                        Отсканируйте QR-код клиента во вкладке «Сканер»
                      </p>
                    </Card>
                  ) : (
                    <Card noPad>
                      {stats.recentWashes.map((wash: any, idx: number) => (
                        <div
                          key={wash.id || idx}
                          className="flex items-center gap-3.5 px-5 py-3.5"
                          style={{
                            borderBottom: idx < stats.recentWashes.length - 1
                              ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: '#F2F2F7' }}
                          >
                            <Car className="w-5 h-5 text-gray-500" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] text-gray-900 tracking-wide" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                                {wash.carPlate || 'N/A'}
                              </p>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full"
                                style={wash.tier === 'business'
                                  ? { background: '#F2F2F7', color: '#5856D6' }
                                  : { background: '#F2F2F7', color: '#007AFF' }
                                }
                              >
                                {wash.tier === 'business' ? 'Biz' : 'Per'}
                              </span>
                              {wash.fraudFlag && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {wash.createdAt ? timeAgo(wash.createdAt) : '—'}
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-[14px] text-gray-900">
                              +{(wash.tier === 'business' ? 35000 : 25000).toLocaleString()}
                            </p>
                            <p className="text-[11px] text-gray-400">сум</p>
                          </div>
                        </div>
                      ))}
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* ── SCANNER ──────────────────────────────────────────── */}
            {activeTab === 'scanner' && (
              <div className="space-y-4">
                {accessToken && <WashLocationQr accessToken={accessToken} />}

                <Card>
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                      style={{ background: '#E8F0FE' }}
                    >
                      <QrCode className="w-5 h-5" style={{ color: '#007AFF' }} />
                    </div>
                    <div>
                      <p className="text-[15px] text-gray-900 mb-1" style={{ letterSpacing: '-0.01em' }}>
                        Сканер клиентских QR (резервный способ)
                      </p>
                      <p className="text-[13px] text-gray-500 leading-relaxed">
                        Обычно клиент сканирует QR на мойке сам и мойка списывается автоматически. Этот сканер — запасной
                        вариант, если у клиента не получилось отсканировать самому.
                      </p>
                    </div>
                  </div>
                </Card>

                {accessToken ? (
                  <PartnerScanner accessToken={accessToken} />
                ) : (
                  <Card className="text-center py-8">
                    <p className="text-[15px] text-red-500 mb-1">Требуется авторизация</p>
                    <p className="text-[13px] text-gray-400">Войдите в аккаунт для использования сканера</p>
                  </Card>
                )}
              </div>
            )}

            {/* ── ANALYTICS ────────────────────────────────────────── */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">

                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Всего моек', value: String(stats?.totalWashes ?? 0) },
                    { label: 'Клиентов', value: String(stats?.activeCustomers ?? 0) },
                  ].map(m => (
                    <Card key={m.label}>
                      <p className="text-xs text-gray-400 mb-1.5">{m.label}</p>
                      {loading ? (
                        <Skeleton className="h-8 w-14" />
                      ) : (
                        <p className="text-[28px] text-gray-900 tracking-tight" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
                          {m.value}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>

                {/* Monthly revenue */}
                <Card>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Выручка за месяц</p>
                  {loading ? (
                    <Skeleton className="h-9 w-36" />
                  ) : (
                    <div className="flex items-end gap-1.5">
                      <p className="text-[34px] text-gray-900 tracking-tight" style={{ letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {fmtNum(stats?.monthlyRevenue ?? 0)}
                      </p>
                      <p className="text-sm text-gray-400 mb-0.5">сум</p>
                    </div>
                  )}
                </Card>

                {/* 7-day chart */}
                <Card>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-5">
                    Мойки по дням недели
                  </p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={chartData} barCategoryGap="30%">
                      <CartesianGrid key="grid" vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" />
                      <XAxis
                        key="xaxis"
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#8e8e93', fontSize: 11 }}
                      />
                      <YAxis key="yaxis" hide />
                      <Tooltip key="tooltip" content={<ChartTooltip />} cursor={{ fill: 'rgba(0,122,255,0.05)', radius: 8 }} />
                      <Bar key="bar" dataKey="washes" fill="#007AFF" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Tier breakdown */}
                <Card>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">
                    Тарифы клиентов
                  </p>
                  <div className="space-y-4">
                    {[
                      { label: 'Personal', price: '25 000', color: '#007AFF', pct: 65 },
                      { label: 'Business', price: '35 000', color: '#5856D6', pct: 35 },
                    ].map(tier => (
                      <div key={tier.label}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: tier.color }} />
                            <span className="text-[13px] text-gray-900">{tier.label}</span>
                          </div>
                          <span className="text-[13px] text-gray-500">{tier.price} сум / мойка</span>
                        </div>
                        <div className="h-[6px] rounded-full" style={{ background: '#F2F2F7' }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: tier.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${tier.pct}%` }}
                            transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1], delay: 0.2 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Partner info */}
                <Card noPad>
                  <div className="px-5 py-3.5" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                      Информация о партнёре
                    </p>
                  </div>
                  {[
                    { label: 'Название', value: PARTNER_NAME },
                    { label: 'Partner ID', value: PARTNER_ID.slice(0, 12) + '…', mono: true },
                    { label: 'Регион', value: 'Самарканд, Узбекистан' },
                    { label: 'Статус', value: 'active', badge: true },
                    { label: 'Баланс', value: fmtSum(stats?.balance ?? 0) },
                  ].map(({ label, value, mono, badge }, idx) => (
                    <div
                      key={label}
                      className="flex items-center justify-between px-5 py-3.5"
                      style={{
                        borderBottom: idx < 4 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      <span className="text-[13px] text-gray-500">{label}</span>
                      {badge ? (
                        <span
                          className="text-[11px] px-2.5 py-1 rounded-full"
                          style={{ background: '#E8F9EE', color: '#34C759' }}
                        >
                          Активен
                        </span>
                      ) : (
                        <span className={`text-[13px] text-gray-900 ${mono ? 'font-mono' : ''}`}>
                          {value}
                        </span>
                      )}
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* ── PAYOUTS ──────────────────────────────────────────── */}
            {activeTab === 'payouts' && <PayoutReports accessToken={accessToken} />}

            {/* ── SETTINGS ─────────────────────────────────────────── */}
            {activeTab === 'settings' && <PartnerSettings onExitPartnerMode={onExitPartnerMode} />}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

