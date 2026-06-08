/**
 * SmartLoadBalancer.tsx — DrivePass+
 * Minimal & beautiful real-time wash load tracker.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation, Zap, RefreshCw, Star, MapPin, Clock, ArrowLeft, ChevronRight } from 'lucide-react';
import { ALL_CAR_WASHES } from '../constants/carWashes';

interface CarWashLoad {
  id: string;
  name: string;
  address: string;
  distance: number;
  occupancy: number;
  waitMinutes: number;
  rating: number;
  boxesTotal: number;
  boxesFree: number;
  isRecommended: boolean;
  lastUpdated: Date;
  trend: 'rising' | 'falling' | 'stable';
}

interface SmartLoadBalancerProps {
  onNavigate?: (washId: string, washName: string) => void;
  onBack?: () => void;
  compact?: boolean;
}

const DEMO_WASHES: CarWashLoad[] = ALL_CAR_WASHES.slice(0, 8).map((w, i) => ({
  id: w.id,
  name: w.name,
  address: `${w.address}, ${w.city}`,
  distance: w.distanceKm || +(Math.random() * 3 + 0.3).toFixed(1),
  occupancy: Math.round(Math.random() * 80 + 10),
  waitMinutes: 0,
  rating: w.rating,
  boxesTotal: w.boxesTotal,
  boxesFree: Math.max(0, w.boxesTotal - Math.floor(Math.random() * w.boxesTotal)),
  isRecommended: i === 0,
  lastUpdated: new Date(),
  trend: (['stable', 'rising', 'falling'] as const)[Math.floor(Math.random() * 3)],
}));

function occ(pct: number) {
  if (pct <= 30) return { fg: '#22c55e', bg: '#f0fdf4', text: '#15803d', label: 'Свободно' };
  if (pct <= 65) return { fg: '#f59e0b', bg: '#fffbeb', text: '#b45309', label: 'Умеренно' };
  return             { fg: '#ef4444', bg: '#fef2f2', text: '#dc2626', label: 'Занято'   };
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

export function SmartLoadBalancer({ onNavigate, onBack, compact = false }: SmartLoadBalancerProps) {
  const [washes, setWashes]     = useState<CarWashLoad[]>(DEMO_WASHES);
  const [refreshing, setRefr]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastAt, setLastAt]     = useState(new Date());

  const simulate = useCallback(() => {
    setWashes(prev => {
      const updated = prev.map(w => {
        const delta   = (Math.random() - 0.48) * 18;
        const newOcc  = Math.max(0, Math.min(100, w.occupancy + delta));
        return {
          ...w,
          occupancy:   Math.round(newOcc),
          boxesFree:   Math.max(0, Math.round(w.boxesTotal * (1 - newOcc / 100))),
          waitMinutes: newOcc > 80 ? Math.round(newOcc / 3.5) : newOcc > 50 ? Math.round(newOcc / 6) : 0,
          trend:       (delta > 5 ? 'rising' : delta < -5 ? 'falling' : 'stable') as CarWashLoad['trend'],
          lastUpdated: new Date(),
          isRecommended: false,
        };
      });
      const best = [...updated].sort((a, b) => a.occupancy - b.occupancy)[0];
      return updated.map(w => ({ ...w, isRecommended: w.id === best.id }));
    });
    setLastAt(new Date());
  }, []);

  const refresh = async () => {
    setRefr(true);
    await new Promise(r => setTimeout(r, 700));
    simulate();
    setRefr(false);
  };

  useEffect(() => {
    const iv = setInterval(simulate, 45_000);
    return () => clearInterval(iv);
  }, [simulate]);

  const sorted      = [...washes].sort((a, b) => a.occupancy - b.occupancy);
  const recommended = washes.find(w => w.isRecommended) ?? washes[0];

  // ── COMPACT (for Dashboard) ──────────────────────────────────────────────
  if (compact) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)', backdropFilter: 'blur(16px)' }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.10)' }}>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'rgba(167,139,250,0.3)' }}>
              <Zap style={{ width: 10, height: 10, color: '#c4b5fd' }} />
            </div>
            <span className="text-white text-xs font-black tracking-tight">Smart Load</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.2)' }}>
              <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[9px] text-green-300 font-bold">LIVE</span>
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.85 }} onClick={refresh} style={{ minHeight: 0 }}>
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={refreshing ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}>
              <RefreshCw style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.45)' }} />
            </motion.div>
          </motion.button>
        </div>

        {/* Best pick */}
        <div className="px-3.5 py-2.5">
          <div className="flex items-center gap-1 mb-1.5">
            <Star style={{ width: 9, height: 9, color: '#fbbf24', fill: '#fbbf24' }} />
            <span className="text-[9px] text-yellow-300 font-black uppercase tracking-widest">Лучший выбор</span>
          </div>
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.3)' }}>
              <Navigation style={{ width: 12, height: 12, color: '#86efac' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-black truncate leading-tight">{recommended.name}</p>
              <p className="text-green-300 text-[10px] truncate">{recommended.address}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-white text-[11px] font-black">{recommended.distance} км</p>
              <p className="text-green-300 text-[9px]">{recommended.waitMinutes === 0 ? 'Без очереди' : `~${recommended.waitMinutes}м`}</p>
            </div>
          </div>
        </div>

        {/* Mini list */}
        <div className="px-3.5 pb-3 space-y-1">
          {sorted.slice(0, 3).map(w => {
            const c = occ(w.occupancy);
            return (
              <div key={w.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.fg }} />
                <p className="text-blue-100 text-[11px] truncate flex-1">{w.name}</p>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)', color: c.fg }}>
                  {w.occupancy}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── FULL VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#f7f8fa' }}>

      {/* ── Top header ── */}
      <div className="px-5 pt-5 pb-6" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 60%, #1d4ed8 100%)' }}>
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1.5 mb-5" style={{ minHeight: 0 }}>
            <ArrowLeft style={{ width: 14, height: 14, color: '#94a3b8' }} />
            <span className="text-xs text-slate-400 font-medium">Назад</span>
          </button>
        )}

        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Zap style={{ width: 13, height: 13, color: '#a78bfa' }} />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Smart Load</span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full ml-1" style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)' }}>
                <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[9px] text-green-400 font-bold">LIVE</span>
              </div>
            </div>
            <h1 className="text-white font-black" style={{ fontSize: 22, letterSpacing: '-0.5px' }}>
              Загруженность моек
            </h1>
            <p className="text-slate-500 text-[11px] mt-0.5">
              {lastAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={refresh}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl flex items-center justify-center mt-1"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', minHeight: 0 }}
          >
            <motion.div
              animate={refreshing ? { rotate: 360 } : {}}
              transition={refreshing ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.4 }}
            >
              <RefreshCw style={{ width: 14, height: 14, color: '#94a3b8' }} />
            </motion.div>
          </motion.button>
        </div>

        {/* Summary pills */}
        <div className="flex gap-2">
          {[
            { label: 'Свободных', count: washes.filter(w => w.occupancy <= 30).length, color: '#22c55e', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
            { label: 'Умеренно',  count: washes.filter(w => w.occupancy > 30 && w.occupancy <= 65).length, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
            { label: 'Занятых',   count: washes.filter(w => w.occupancy > 65).length, color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
          ].map(s => (
            <div
              key={s.label}
              className="flex-1 py-2 px-1 rounded-xl text-center"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <p className="font-black" style={{ color: s.color, fontSize: 18, lineHeight: 1 }}>{s.count}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Smart recommendation banner ── */}
      <div className="px-4 -mt-3 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            boxShadow: '0 6px 24px rgba(16,185,129,0.28)',
          }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <Star style={{ width: 18, height: 18, color: '#fff', fill: '#fff' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-wide mb-0.5">🤖 Smart выбор</p>
            <p className="text-white font-black text-sm leading-tight truncate">{recommended.name}</p>
            <p className="text-white/65 text-[11px] mt-0.5">
              {recommended.distance} км · {recommended.boxesFree} бокс. своб.
            </p>
          </div>
          {onNavigate && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => onNavigate(recommended.id, recommended.name)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.22)', minHeight: 0 }}
            >
              Ехать <ChevronRight style={{ width: 12, height: 12 }} />
            </motion.button>
          )}
        </motion.div>
      </div>

      {/* ── Wash cards ── */}
      <div className="px-4 space-y-2.5 pb-10">
        {sorted.map((wash, i) => {
          const c          = occ(wash.occupancy);
          const isExpanded = expanded === wash.id;
          const trendSymbol = wash.trend === 'rising' ? '↑' : wash.trend === 'falling' ? '↓' : '→';
          const trendColor  = wash.trend === 'rising' ? '#ef4444' : wash.trend === 'falling' ? '#22c55e' : '#94a3b8';

          return (
            <motion.div
              key={wash.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl overflow-hidden bg-white"
              style={{ border: '1px solid #eaeaec', boxShadow: wash.isRecommended ? `0 0 0 2px #10b981, 0 4px 16px rgba(16,185,129,0.12)` : '0 1px 4px rgba(0,0,0,0.05)' }}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : wash.id)}
                className="w-full text-left px-4 py-3.5"
                style={{ minHeight: 0 }}
              >
                <div className="flex items-center gap-3">
                  {/* Status dot */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: c.bg }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-3 h-3 rounded-full"
                      style={{ background: c.fg }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-black text-gray-900 truncate">{wash.name}</p>
                      {wash.isRecommended && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#f0fdf4', color: '#15803d' }}>
                          Best
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin style={{ width: 9, height: 9, color: '#94a3b8' }} />
                      <p className="text-[11px] text-gray-400 truncate">{wash.address}</p>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center justify-end gap-1 mb-0.5">
                      <span style={{ color: trendColor, fontSize: 10, fontWeight: 700 }}>{trendSymbol}</span>
                      <span
                        className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ background: c.bg, color: c.text }}
                      >
                        {wash.occupancy}%
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400">{wash.distance} км</p>
                  </div>
                </div>

                <div className="mt-2.5">
                  <Bar pct={wash.occupancy} color={c.fg} />
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
                    <div className="px-4 pb-4" style={{ borderTop: '1px solid #f3f4f6' }}>
                      <div className="grid grid-cols-3 gap-2 my-3">
                        {[
                          { label: 'Загрузка',    value: `${wash.occupancy}%`,                                          color: c.text },
                          { label: 'Ожидание',    value: wash.waitMinutes === 0 ? '0 мин' : `~${wash.waitMinutes}м`,    color: '#6366f1' },
                          { label: 'Боксы',       value: `${wash.boxesFree}/${wash.boxesTotal}`,                        color: '#10b981' },
                        ].map(m => (
                          <div key={m.label} className="rounded-xl p-2.5 text-center" style={{ background: '#f9fafb' }}>
                            <p className="text-xs font-black" style={{ color: m.color }}>{m.value}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">{m.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} style={{ width: 11, height: 11, fill: s <= Math.floor(wash.rating) ? '#f59e0b' : 'none', color: s <= Math.floor(wash.rating) ? '#f59e0b' : '#e5e7eb' }} />
                          ))}
                          <span className="text-[11px] text-gray-500 ml-1 font-semibold">{wash.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock style={{ width: 9, height: 9, color: '#94a3b8' }} />
                          <span className="text-[10px] text-gray-400">
                            {wash.lastUpdated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {onNavigate && (
                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onNavigate(wash.id, wash.name)}
                          className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                          style={{
                            background: wash.occupancy <= 30 ? '#16a34a' : wash.occupancy <= 65 ? '#d97706' : '#9ca3af',
                            minHeight: 0,
                          }}
                        >
                          <Navigation style={{ width: 13, height: 13 }} />
                          {wash.occupancy > 80 ? 'Записаться' : 'Поехать сюда'}
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
