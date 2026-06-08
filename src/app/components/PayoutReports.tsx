/**
 * PayoutReports.tsx — DrivePass+
 * Автоматические акты выполненных работ + одно-кнопочная выплата партнёрам.
 * Мировой стандарт: как Stripe Connect для Uber/Airbnb партнёров.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Download, CheckCircle2, Clock, TrendingUp,
  Car, Wallet, ChevronDown, ChevronUp, Zap, AlertCircle,
  ArrowRight, Calendar, DollarSign, BarChart2,
} from 'lucide-react';
import { toast } from 'sonner';

interface WashRecord {
  id: string;
  carPlate: string;
  tier: 'personal' | 'business';
  timestamp: Date;
  amount: number;
  status: 'paid' | 'pending';
}

interface PayoutPeriod {
  id: string;
  label: string;
  from: Date;
  to: Date;
  washCount: number;
  totalAmount: number;
  personalCount: number;
  businessCount: number;
  status: 'paid' | 'pending' | 'processing';
  paidAt?: Date;
}

interface PayoutReportsProps {
  partnerId: string;
  partnerName: string;
  accessToken?: string | null;
}

// ── Генерация демо-данных ─────────────────────────────────────────────────────
function generateDemoData(): { periods: PayoutPeriod[]; recentWashes: WashRecord[] } {
  const now = new Date();

  const plates = ['01A777BB', '30B455UZ', '75C123AA', '10K898UZ', '01H345BB', '40B007UZ'];

  const recentWashes: WashRecord[] = Array.from({ length: 24 }, (_, i) => {
    const tier = Math.random() > 0.65 ? 'business' : 'personal';
    return {
      id: `wash-${i}`,
      carPlate: plates[i % plates.length],
      tier,
      timestamp: new Date(now.getTime() - i * 3.7 * 3600_000),
      amount: tier === 'business' ? 35_000 : 25_000,
      status: i > 4 ? 'paid' : 'pending',
    };
  });

  const periods: PayoutPeriod[] = [
    {
      id: 'period-current',
      label: 'Текущий период (1–22 Март)',
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: now,
      washCount: 17,
      personalCount: 11,
      businessCount: 6,
      totalAmount: 11 * 25_000 + 6 * 35_000,
      status: 'pending',
    },
    {
      id: 'period-feb',
      label: 'Февраль 2026',
      from: new Date(2026, 1, 1),
      to: new Date(2026, 1, 28),
      washCount: 43,
      personalCount: 28,
      businessCount: 15,
      totalAmount: 28 * 25_000 + 15 * 35_000,
      status: 'paid',
      paidAt: new Date(2026, 2, 1),
    },
    {
      id: 'period-jan',
      label: 'Январь 2026',
      from: new Date(2026, 0, 1),
      to: new Date(2026, 0, 31),
      washCount: 31,
      personalCount: 22,
      businessCount: 9,
      totalAmount: 22 * 25_000 + 9 * 35_000,
      status: 'paid',
      paidAt: new Date(2026, 1, 1),
    },
  ];

  return { periods, recentWashes };
}

// ── Format helpers ────────────────────────────────────────────────────────────
const fmtSum = (n: number) => `${(n || 0).toLocaleString('ru-RU')} сум`;
const fmtDate = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

// ─────────────────────────────────────────────────────────────────────────────

export function PayoutReports({ partnerId, partnerName }: PayoutReportsProps) {
  const { periods: initPeriods, recentWashes } = generateDemoData();
  const [periods, setPeriods] = useState<PayoutPeriod[]>(initPeriods);
  const [expanded, setExpanded] = useState<string | null>('period-current');
  const [processing, setProcessing] = useState<string | null>(null);

  const pending = periods.filter(p => p.status === 'pending');
  const totalPending = pending.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid = periods.filter(p => p.status === 'paid').reduce((s, p) => s + p.totalAmount, 0);

  const handleRequestPayout = async (periodId: string) => {
    setProcessing(periodId);
    // Simulated payout request (replace with real Supabase call)
    await new Promise(r => setTimeout(r, 2200));
    setPeriods(prev => prev.map(p =>
      p.id === periodId
        ? { ...p, status: 'processing' }
        : p
    ));
    setProcessing(null);
    toast.success('Запрос на выплату отправлен! Обработка 1-2 рабочих дня.');
  };

  const handleDownloadAct = (period: PayoutPeriod) => {
    // В production — генерация PDF через edge function
    const content = [
      `АКТ ВЫПОЛНЕННЫХ РАБОТ`,
      `DrivePass+ × ${partnerName}`,
      ``,
      `Период: ${fmtDate(period.from)} — ${fmtDate(period.to)}`,
      `Partner ID: ${partnerId}`,
      ``,
      `Услуги:`,
      `  Personal (${period.personalCount} × 25 000 сум): ${(period.personalCount * 25000).toLocaleString('ru-RU')} сум`,
      `  Business (${period.businessCount} × 35 000 сум): ${(period.businessCount * 35000).toLocaleString('ru-RU')} сум`,
      ``,
      `ИТОГО: ${fmtSum(period.totalAmount)}`,
      ``,
      `Сформирован автоматически DrivePass+ Platform`,
      `Дата: ${new Date().toLocaleDateString('ru-RU')}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drivepass-act-${period.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Акт скачан!');
  };

  return (
    <div className="space-y-4">

      {/* ── Summary cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5">
        <div
          className="rounded-2xl p-4"
          style={{ background: '#fff', border: '1px solid #eaeaec', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.12em]">К выплате</p>
          </div>
          <p className="text-2xl font-black text-gray-900 leading-none">
            {(totalPending / 1_000).toFixed(0)}K
          </p>
          <p className="text-[10px] text-gray-400 mt-1">сум · {pending.length} период(а)</p>
        </div>
        <div
          className="rounded-2xl p-4"
          style={{ background: '#fff', border: '1px solid #eaeaec', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.12em]">Получено</p>
          </div>
          <p className="text-2xl font-black text-gray-900 leading-none">
            {(totalPaid / 1_000_000).toFixed(2)}M
          </p>
          <p className="text-[10px] text-gray-400 mt-1">сум · всего</p>
        </div>
      </div>

      {/* ── Pending payout CTA ─────────────────────────────────────────── */}
      {totalPending > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6366f1)', boxShadow: '0 4px 20px rgba(124,58,237,0.25)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-black text-sm leading-tight">Доступна выплата</p>
                <p className="text-white/70 text-[11px]">{fmtSum(totalPending)}</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleRequestPayout('period-current')}
              disabled={!!processing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-purple-700"
              style={{ background: '#fff', minHeight: 0 }}
            >
              {processing === 'period-current' ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"
                  />
                  Обработка…
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Вывести
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* ── Periods list ───────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-[0.12em] mb-3 px-1">
          История периодов
        </p>
        <div className="space-y-2">
          {periods.map(period => {
            const isExpanded = expanded === period.id;

            return (
              <div
                key={period.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: '#fff', border: '1px solid #eaeaec', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <button
                  onClick={() => setExpanded(isExpanded ? null : period.id)}
                  className="w-full text-left px-4 py-3.5 flex items-center gap-3"
                  style={{ minHeight: 0 }}
                >
                  {/* Status icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: period.status === 'paid' ? '#f0fdf4' : period.status === 'processing' ? '#fff7ed' : '#f5f3ff',
                    }}
                  >
                    {period.status === 'paid'
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : period.status === 'processing'
                      ? <Clock className="w-4 h-4 text-amber-600" />
                      : <Wallet className="w-4 h-4 text-purple-600" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{period.label}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Car className="w-2.5 h-2.5 text-gray-300" />
                      <p className="text-[11px] text-gray-400">{period.washCount} моек</p>
                      {period.status === 'paid' && period.paidAt && (
                        <>
                          <span className="text-gray-200">·</span>
                          <p className="text-[11px] text-green-600">Выплачено {fmtDate(period.paidAt)}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount + chevron */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-black text-gray-900">
                        {(period.totalAmount / 1_000).toFixed(0)}K
                      </p>
                      <p className="text-[10px] text-gray-400">сум</p>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                      : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid #f3f4f6' }}>

                        {/* Breakdown */}
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #f9f9f9' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="text-xs text-gray-600">Personal × {period.personalCount}</span>
                            </div>
                            <span className="text-xs font-black text-gray-900">
                              {(period.personalCount * 25_000).toLocaleString('ru-RU')} сум
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid #f9f9f9' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                              <span className="text-xs text-gray-600">Business × {period.businessCount}</span>
                            </div>
                            <span className="text-xs font-black text-gray-900">
                              {(period.businessCount * 35_000).toLocaleString('ru-RU')} сум
                            </span>
                          </div>
                          <div className="flex items-center justify-between py-2.5">
                            <span className="text-sm font-black text-gray-900">ИТОГО</span>
                            <span className="text-sm font-black text-gray-900">{fmtSum(period.totalAmount)}</span>
                          </div>
                        </div>

                        {/* Period range */}
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          <span>{fmtDate(period.from)} — {fmtDate(period.to)}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleDownloadAct(period)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                            style={{ background: '#f5f3ff', color: '#7c3aed', minHeight: 0 }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            Скачать Акт
                          </motion.button>

                          {period.status === 'pending' && (
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleRequestPayout(period.id)}
                              disabled={!!processing}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white"
                              style={{
                                background: processing === period.id ? '#9ca3af' : '#7c3aed',
                                minHeight: 0
                              }}
                            >
                              {processing === period.id ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                                  className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
                                />
                              ) : (
                                <Zap className="w-3.5 h-3.5" />
                              )}
                              Запросить выплату
                            </motion.button>
                          )}

                          {period.status === 'processing' && (
                            <div
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                              style={{ background: '#fff7ed', color: '#d97706' }}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              В обработке
                            </div>
                          )}

                          {period.status === 'paid' && (
                            <div
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                              style={{ background: '#f0fdf4', color: '#16a34a' }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Выплачено
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Micro washes list ──────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-[0.12em] mb-3 px-1">
          Последние транзакции
        </p>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#fff', border: '1px solid #eaeaec', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          {recentWashes.slice(0, 8).map((w, idx) => (
            <div
              key={w.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: idx < 7 ? '1px solid #f9f9f9' : 'none' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: w.tier === 'business' ? '#f5f3ff' : '#eff6ff' }}
              >
                <Car
                  className="w-3.5 h-3.5"
                  style={{ color: w.tier === 'business' ? '#7c3aed' : '#2563eb' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono font-black text-gray-900 text-xs tracking-widest">{w.carPlate}</p>
                <p className="text-[10px] text-gray-400">
                  {w.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}{' · '}
                  {w.timestamp.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-black text-gray-900">+{w.amount.toLocaleString('ru-RU')}</p>
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={w.status === 'paid'
                    ? { background: '#f0fdf4', color: '#16a34a' }
                    : { background: '#fff7ed', color: '#d97706' }}
                >
                  {w.status === 'paid' ? 'Оплачено' : 'Ожид.'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Payment info box ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: '#fafafa', border: '1px solid #eaeaec' }}
      >
        <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-gray-700 mb-0.5">Условия выплат</p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Выплаты производятся <span className="font-semibold text-gray-700">1-го числа каждого месяца</span> безналичным
            переводом. Минимальная сумма выплаты: 50 000 сум.
            Ваши данные защищены и хранятся в Supabase с RLS-политиками.
          </p>
        </div>
      </div>
    </div>
  );
}

