/**
 * PayoutReports.tsx — DrivePass+
 *
 * Read-only payout history for the signed-in partner, fetched from GET /partner/payouts.
 * There is no self-service "request a payout" button here anymore -- in this product the
 * owner reviews and initiates each partner's payout by hand (via the bot's own /payouts
 * flow), same manual-transfer model the client-side card payments use. A button that faked
 * a "request sent" toast without a real endpoint behind it would just be lying to the user.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download, CheckCircle2, Clock, Car, Wallet, ChevronDown, ChevronUp, AlertCircle, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiHeaders, apiUrl } from '../utils/apiClient';
import { usePartner } from '../contexts/PartnerContext';

interface PayoutOut {
  id: string;
  periodStart: string;
  periodEnd: string;
  visitsCount: number;
  amount: number;
  status: 'draft' | 'paid';
  paidAt: string | null;
}

interface PayoutReportsProps {
  accessToken?: string | null;
}

const fmtSum = (n: number) => `${(n || 0).toLocaleString('ru-RU')} сум`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

export function PayoutReports({ accessToken }: PayoutReportsProps) {
  const { profile } = usePartner();
  const [payouts, setPayouts] = useState<PayoutOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/partner/payouts'), { headers: apiHeaders(accessToken) });
      if (res.ok) setPayouts(await res.json());
    } catch {
      // keep whatever we last had
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const pending = payouts.filter(p => p.status === 'draft');
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  const handleDownloadAct = (payout: PayoutOut) => {
    const content = [
      `АКТ ВЫПОЛНЕННЫХ РАБОТ`,
      `DrivePass+ × ${profile?.partnerName ?? ''}`,
      ``,
      `Период: ${fmtDate(payout.periodStart)} — ${fmtDate(payout.periodEnd)}`,
      `Партнёр ID: ${profile?.partnerId ?? ''}`,
      ``,
      `Визитов: ${payout.visitsCount}`,
      `ИТОГО К ВЫПЛАТЕ: ${fmtSum(payout.amount)}`,
      ``,
      payout.status === 'paid' && payout.paidAt ? `Выплачено: ${fmtDate(payout.paidAt)}` : `Статус: ожидает выплаты`,
      ``,
      `Сформирован автоматически DrivePass+ Platform`,
      `Дата: ${new Date().toLocaleDateString('ru-RU')}`,
    ].filter(Boolean).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drivepass-act-${payout.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Акт скачан!');
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-16 w-full rounded-2xl bg-gray-100/80 animate-pulse" />)}
      </div>
    );
  }

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
            {fmtSum(totalPending)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{pending.length} период(а)</p>
        </div>
        <div
          className="rounded-2xl p-4"
          style={{ background: '#fff', border: '1px solid #eaeaec', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-[0.12em]">Получено всего</p>
          </div>
          <p className="text-2xl font-black text-gray-900 leading-none">
            {fmtSum(totalPaid)}
          </p>
        </div>
      </div>

      {/* ── Periods list ───────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-[0.12em] mb-3 px-1">
          История выплат
        </p>

        {payouts.length === 0 ? (
          <div
            className="rounded-2xl p-8 flex flex-col items-center text-center"
            style={{ background: '#fff', border: '1px solid #eaeaec' }}
          >
            <Wallet className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm font-bold text-gray-700">Пока нечего показывать</p>
            <p className="text-xs text-gray-400 mt-1">Акты появятся здесь, как только владелец сформирует первую выплату</p>
          </div>
        ) : (
          <div className="space-y-2">
            {payouts.map(payout => {
              const isExpanded = expanded === payout.id;
              return (
                <div
                  key={payout.id}
                  className="rounded-2xl overflow-hidden"
                  style={{ background: '#fff', border: '1px solid #eaeaec', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                >
                  <button
                    onClick={() => setExpanded(isExpanded ? null : payout.id)}
                    className="w-full text-left px-4 py-3.5 flex items-center gap-3"
                    style={{ minHeight: 0 }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: payout.status === 'paid' ? '#f0fdf4' : '#f5f3ff' }}
                    >
                      {payout.status === 'paid'
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <Wallet className="w-4 h-4 text-purple-600" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">
                        {fmtDate(payout.periodStart)} — {fmtDate(payout.periodEnd)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Car className="w-2.5 h-2.5 text-gray-300" />
                        <p className="text-[11px] text-gray-400">{payout.visitsCount} моек</p>
                        {payout.status === 'paid' && payout.paidAt && (
                          <>
                            <span className="text-gray-200">·</span>
                            <p className="text-[11px] text-green-600">Выплачено {fmtDate(payout.paidAt)}</p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900">{fmtSum(payout.amount)}</p>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                  </button>

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
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-3">
                            <Calendar className="w-3 h-3" />
                            <span>{fmtDate(payout.periodStart)} — {fmtDate(payout.periodEnd)}</span>
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-sm font-black text-gray-900">ИТОГО</span>
                            <span className="text-sm font-black text-gray-900">{fmtSum(payout.amount)}</span>
                          </div>

                          <div className="flex gap-2 pt-1">
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleDownloadAct(payout)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                              style={{ background: '#f5f3ff', color: '#7c3aed', minHeight: 0 }}
                            >
                              <Download className="w-3.5 h-3.5" />
                              Скачать Акт
                            </motion.button>

                            <div
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold"
                              style={payout.status === 'paid'
                                ? { background: '#f0fdf4', color: '#16a34a' }
                                : { background: '#fff7ed', color: '#d97706' }}
                            >
                              {payout.status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                              {payout.status === 'paid' ? 'Выплачено' : 'Ожидает выплаты'}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Payment info box ────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: '#fafafa', border: '1px solid #eaeaec' }}
      >
        <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-gray-700 mb-0.5">Как это работает</p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Владелец DrivePass+ проверяет визиты и переводит выплату вручную на карту, указанную
            при регистрации мойки. Реквизиты может изменить только владелец.
          </p>
        </div>
      </div>
    </div>
  );
}
