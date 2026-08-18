/**
 * WelcomeScreen — DrivePass+
 * Role selection with custom micro-animations per card.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Car, Building2, Droplets, Star, Zap } from 'lucide-react';
import { DrivePassLogo } from './DrivePassLogo';

type Role = 'client' | 'partner';

interface WelcomeScreenProps {
  onSelectRole: (role: Role) => void;
}

// ─── Мини-карточки тарифов DrivePass+ ────────────────────────────────────────
const PLAN_CARDS = [
  { label: 'Light',    price: '390к', washes: 4,  accentColor: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  { label: 'Standard', price: '590к', washes: 6,  accentColor: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', hot: true },
  { label: 'Premium',  price: '890к', washes: 10, accentColor: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
] as const;

function PlanStrip() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.38, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex gap-2 w-full max-w-sm"
    >
      {PLAN_CARDS.map((p, i) => (
        <motion.div
          key={p.label}
          initial={{ opacity: 0, y: 10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.44 + i * 0.07, duration: 0.4, ease: [0.34, 1.2, 0.64, 1] }}
          className="flex-1 rounded-2xl px-2.5 py-3 text-center relative overflow-visible"
          style={{
            background: p.bg,
            border: `1.5px solid ${p.border}`,
            boxShadow: `0 2px 10px ${p.accentColor}0F`,
          }}
        >
          {'hot' in p && p.hot && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.62, type: 'spring', stiffness: 500, damping: 22 }}
              className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-black text-white px-2 py-[2px] rounded-full whitespace-nowrap"
              style={{ background: p.accentColor, boxShadow: `0 2px 8px ${p.accentColor}50` }}
            >
              ★ ХИТ
            </motion.div>
          )}
          <p className="text-[11px] font-black tracking-wide mb-0.5" style={{ color: p.accentColor }}>
            {p.label}
          </p>
          <p className="text-[17px] font-black text-gray-900 leading-none">
            {p.price}
          </p>
          <p className="text-[10px] font-medium text-gray-400 mt-0.5 leading-none">
            {p.washes} моек/мес
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ── Анимация иконки для карточки клиента ────────────────────────────────── */
const BUBBLES = [
  { x: 5,  y: 28, s: 5, delay: 0,    dur: 0.82 },
  { x: 15, y: 32, s: 3, delay: 0.18, dur: 0.70 },
  { x: 27, y: 29, s: 6, delay: 0.06, dur: 0.94 },
  { x: 38, y: 33, s: 3, delay: 0.28, dur: 0.76 },
  { x: 21, y: 35, s: 4, delay: 0.42, dur: 0.65 },
  { x: 8,  y: 18, s: 2, delay: 0.24, dur: 0.60 },
  { x: 43, y: 22, s: 4, delay: 0.12, dur: 0.88 },
  { x: 32, y: 20, s: 2, delay: 0.36, dur: 0.72 },
];

const SPRAY = [
  { x: -9,  y: 7,  dir: -1, delay: 0,    dur: 0.50 },
  { x: 50,  y: 11, dir:  1, delay: 0.14, dur: 0.46 },
  { x: -7,  y: 22, dir: -1, delay: 0.28, dur: 0.52 },
  { x: 49,  y: 28, dir:  1, delay: 0.08, dur: 0.48 },
  { x: -6,  y: 37, dir: -1, delay: 0.20, dur: 0.50 },
  { x: 51,  y: 38, dir:  1, delay: 0.34, dur: 0.44 },
];

function CarWashEffect({ active }: { active: boolean }) {
  return (
    <>
      {BUBBLES.map((b, i) => (
        <motion.div
          key={`fb-${i}`}
          className="absolute pointer-events-none rounded-full z-20"
          style={{
            left: b.x, top: b.y,
            width: b.s, height: b.s,
            background: i % 3 === 0
              ? 'rgba(255,255,255,0.85)'
              : i % 3 === 1
              ? 'rgba(147,197,253,0.75)'
              : 'rgba(191,219,254,0.7)',
            border: '0.5px solid rgba(37,99,235,0.18)',
            boxShadow: '0 0 3px rgba(255,255,255,0.6)',
          }}
          initial={{ y: 0, opacity: 0, scale: 0 }}
          animate={active
            ? { y: [0, -b.s * 2.8, -b.s * 5.5], x: [0, i % 2 === 0 ? 2 : -2, 0], opacity: [0, 0.95, 0.7, 0], scale: [0, 1, 0.8, 0] }
            : { y: 0, opacity: 0, scale: 0 }
          }
          transition={active
            ? { duration: b.dur, delay: b.delay, repeat: Infinity, repeatDelay: 0.28, ease: 'easeOut' }
            : { duration: 0.12 }
          }
        />
      ))}
      {active && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-15 rounded-xl"
          style={{ background: 'linear-gradient(120deg, transparent 25%, rgba(255,255,255,0.38) 50%, transparent 75%)' }}
          animate={{ x: [-52, 52], opacity: [0, 1, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.9, ease: 'easeInOut' }}
        />
      )}
    </>
  );
}

function CarWashSpray({ active }: { active: boolean }) {
  return (
    <>
      {SPRAY.map((s, i) => (
        <motion.div
          key={`sp-${i}`}
          className="absolute pointer-events-none z-20"
          style={{
            left: s.x, top: s.y,
            width: 3, height: 5,
            background: 'rgba(37,99,235,0.42)',
            borderRadius: '50% 50% 50% 50% / 25% 25% 75% 75%',
          }}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={active
            ? { opacity: [0, 0.85, 0], x: [0, s.dir * 7, s.dir * 12], y: [0, 2, 6] }
            : { opacity: 0 }
          }
          transition={active
            ? { duration: s.dur, delay: s.delay, repeat: Infinity, repeatDelay: 0.38, ease: 'easeOut' }
            : { duration: 0.1 }
          }
        />
      ))}
    </>
  );
}

function ContractBadge({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3, rotate: -25, y: 6 }}
          animate={{ opacity: 1, scale: 1, rotate: -10, y: 0 }}
          exit={{ opacity: 0, scale: 0.3, rotate: -25, y: 6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          className="absolute -top-4 -right-3 pointer-events-none z-20"
        >
          <div className="relative w-7 h-[34px] bg-white rounded-[3px] border border-violet-300 shadow-lg flex flex-col justify-start gap-[3px] px-1 pt-[5px] pb-1">
            <div className="absolute top-0 right-0 w-[7px] h-[7px]"
              style={{ background: 'linear-gradient(225deg, #ede9fe 50%, transparent 50%)', borderLeft: '1px solid #c4b5fd', borderBottom: '1px solid #c4b5fd' }} />
            <div className="h-[2px] bg-violet-300 rounded-full" />
            <div className="h-[2px] bg-violet-200 rounded-full w-3/4" />
            <div className="h-[2px] bg-violet-200 rounded-full" />
            <div className="h-[2px] bg-violet-100 rounded-full w-1/2" />
          </div>
          <motion.div
            className="absolute -bottom-2 -right-2.5 text-[11px] select-none"
            style={{ lineHeight: 1 }}
            animate={{ rotate: [0, -10, 5, -7, 0], x: [0, 2, -1, 2, 0], y: [0, -1, 0, -1, 0] }}
            transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.4, ease: 'easeInOut' }}
          >✏️</motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Main component ─────────────────────────────────────────────────────────── */
export function WelcomeScreen({ onSelectRole }: WelcomeScreenProps) {
  const [pressed, setPressed] = useState<Role | null>(null);
  const [hovered, setHovered] = useState<Role | null>(null);

  const pick = (role: Role) => {
    setPressed(role);
    setTimeout(() => onSelectRole(role), 320);
  };

  const roles: Array<{
    role: Role;
    icon: React.ElementType;
    title: string;
    sub: string;
    accent: string;
    accentLight: string;
    accentMid: string;
  }> = [
    {
      role: 'client',
      icon: Car,
      title: 'Владелец Авто',
      sub: 'Подписка · Мойка без очереди',
      accent: '#2563EB',
      accentLight: '#EFF6FF',
      accentMid: '#DBEAFE',
    },
    {
      role: 'partner',
      icon: Building2,
      title: 'Бизнес-Партнер',
      sub: 'Принимать клиентов · Сканер QR',
      accent: '#7C3AED',
      accentLight: '#F5F3FF',
      accentMid: '#EDE9FE',
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center overflow-hidden px-6 gap-6">

      {/* ── Logo — static, no stage badges ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="relative inline-flex mb-5"
        >
          <DrivePassLogo size={72} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-gray-900"
          style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}
        >
          DrivePass<span className="text-blue-600">+</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          className="text-gray-400 text-sm mt-1.5 tracking-wide"
        >
          Умная подписка на автомойку · Узбекистан
        </motion.p>
      </motion.div>

      {/* ── Уникальный элемент: тарифная полоска ─────────────────────── */}
      <PlanStrip />

      {/* ── Role cards ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm flex flex-col gap-3"
      >
        {/* Section label */}
        <div className="flex items-center gap-3 mb-1 px-1">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-gray-300 text-[10px] font-medium tracking-[0.18em] uppercase whitespace-nowrap">
            Выберите тип входа
          </span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {roles.map(({ role, icon: Icon, title, sub, accent, accentLight, accentMid }, i) => {
          const isPressed = pressed === role;
          const isHov = hovered === role;
          const active = isHov || isPressed;

          return (
            <motion.button
              key={role}
              onClick={() => pick(role)}
              onHoverStart={() => setHovered(role)}
              onHoverEnd={() => setHovered(null)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{
                y: -5,
                scale: 1.018,
                boxShadow: `0 14px 38px ${accent}28, 0 4px 12px rgba(0,0,0,0.07)`,
                borderColor: accent + '70',
                transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
              }}
              whileTap={{ scale: 0.97, y: 0, transition: { duration: 0.12 } }}
              className="relative w-full flex items-center gap-4 rounded-2xl text-left border"
              style={{
                padding: '18px 20px',
                background: isPressed ? accentLight : '#FFFFFF',
                borderColor: isPressed ? accent + '88' : '#E5E7EB',
                boxShadow: isPressed
                  ? `0 0 0 3px ${accent}18, 0 8px 32px ${accent}20`
                  : '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
                transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                overflow: 'visible',
              }}
            >
              {/* Icon bubble */}
              <div className="relative flex-shrink-0" style={{ overflow: 'visible' }}>
                {[0, 1].map(ring => (
                  <motion.div
                    key={ring}
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    animate={active
                      ? { scale: [1, 1.7 + ring * 0.4], opacity: [0.6, 0] }
                      : { scale: 1, opacity: 0 }
                    }
                    transition={{ duration: 1.05, delay: ring * 0.3, repeat: active ? Infinity : 0, ease: 'easeOut' }}
                    style={{ border: `1.5px solid ${accent}` }}
                  />
                ))}
                <motion.div
                  animate={
                    isPressed
                      ? { rotate: [-6, 6, 0], scale: [1, 1.15, 1] }
                      : isHov
                      ? { scale: 1.1, rotate: role === 'client' ? -3 : 3 }
                      : { scale: 1, rotate: 0 }
                  }
                  transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center relative"
                  style={{ background: active ? accentMid : accentLight, overflow: 'hidden' }}
                >
                  <Icon className="w-6 h-6 relative z-10" style={{ color: accent }} />
                  {role === 'client' && <CarWashEffect active={active} />}
                  {role === 'client' && <CarWashSpray active={active} />}
                </motion.div>
                {role === 'partner' && <ContractBadge active={active} />}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 leading-tight" style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {title}
                </p>
                <p className="text-gray-400 text-sm mt-0.5">{sub}</p>
              </div>

              {/* Dash indicator */}
              <div className="flex-shrink-0 flex flex-col items-end gap-[5px] pr-0.5">
                {[14, 8, 5].map((baseW, idx) => (
                  <motion.div
                    key={idx}
                    className="rounded-full"
                    style={{ height: 3, background: accent }}
                    animate={{
                      width: active ? (idx === 0 ? 18 : idx === 1 ? 12 : 7) : (idx === 0 ? 10 : idx === 1 ? 6 : 4),
                      opacity: active ? (idx === 0 ? 1 : idx === 1 ? 0.6 : 0.3) : 0.18,
                    }}
                    transition={{ duration: 0.28, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  />
                ))}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="flex items-center gap-3 text-gray-300 text-[11px]"
      >
        <Droplets className="w-3.5 h-3.5" />
        <span>25+ автомоек</span>
        <span>·</span>
        <Star className="w-3 h-3" />
        <span>5 городов</span>
        <span>·</span>
        <Zap className="w-3.5 h-3.5" />
        <span>QR за 3 сек</span>
      </motion.div>

      {/* Flash overlay */}
      <AnimatePresence>
        {pressed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: pressed === 'client'
                ? 'radial-gradient(circle at 50% 60%, rgba(37,99,235,0.06) 0%, transparent 65%)'
                : 'radial-gradient(circle at 50% 60%, rgba(124,58,237,0.06) 0%, transparent 65%)',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
