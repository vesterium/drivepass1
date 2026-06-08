/**
 * DrivePassLogo — логотип DrivePass+ с яркой анимацией мойки
 * Этапы: Кэрхер → Пена → Протирка → Сушка → Блеск
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import logoImg from 'figma:asset/d2a1e1755e3da144f861793ea86b3d5e07fd81b8.png';

interface DrivePassLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  textColor?: string;
  animated?: boolean;
  variant?: 'default' | 'white' | 'mono';
}

const STAGES = [
  { id: 'karcher', label: '💦 Кэрхер' },
  { id: 'foam',    label: '🧼 Пена' },
  { id: 'wipe',    label: '🧽 Протирка' },
  { id: 'rinse',   label: '🚿 Сушка' },
  { id: 'shine',   label: '✨ Блеск!' },
] as const;

const STAGE_DURATION = 3000;

/* Анимация самого лого для каждого этапа */
const LOGO_ANIMATIONS: Record<string, {
  animate: Record<string, any>;
  transition: Record<string, any>;
}> = {
  karcher: {
    animate: { x: [-2, 2, -2, 1, -1, 0], y: [0, -1, 1, -1, 0] },
    transition: { duration: 0.4, repeat: Infinity, ease: 'easeInOut' },
  },
  foam: {
    animate: { rotate: [-2, 2, -2], scale: [1, 1.02, 1] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
  wipe: {
    animate: { rotate: [-3, 3, -3], x: [-3, 3, -3] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
  rinse: {
    animate: { x: [-1, 1, -1], rotate: [-1, 1, -1] },
    transition: { duration: 0.3, repeat: Infinity, ease: 'linear' },
  },
  shine: {
    animate: { scale: [1, 1.06, 1], filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'] },
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
};

/* ── КЭРХЕР: мощные белые струи воды сверху вниз ── */
function KarcherEffect({ size }: { size: number }) {
  return (
    <>
      {[18, 35, 52, 68].map((x, i) => (
        <motion.div
          key={`jet-${i}`}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: 0,
            width: size * 0.05,
            height: size * 0.45,
            borderRadius: size * 0.03,
            background: 'white',
          }}
          animate={{
            y: [-(size * 0.3), size * 0.6],
            opacity: [0, 0.85, 0.85, 0],
          }}
          transition={{
            duration: 0.8,
            delay: i * 0.15,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}
      {[25, 40, 55, 70].map((x, i) => (
        <motion.div
          key={`splash-${i}`}
          style={{
            position: 'absolute',
            left: `${x}%`,
            bottom: '20%',
            width: size * 0.06,
            height: size * 0.06,
            borderRadius: '50%',
            background: 'white',
          }}
          animate={{
            scale: [0, 1.5, 0],
            opacity: [0, 0.7, 0],
            y: [0, -(size * 0.08)],
          }}
          transition={{
            duration: 0.6,
            delay: i * 0.15 + 0.4,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
}

/* ── ПЕНА: крупные пузыри ── */
function FoamEffect({ size }: { size: number }) {
  const bubbles = [
    { x: 20, y: 55, s: 0.12, d: 0 },
    { x: 45, y: 60, s: 0.10, d: 0.3 },
    { x: 65, y: 50, s: 0.11, d: 0.6 },
    { x: 35, y: 70, s: 0.09, d: 0.9 },
    { x: 55, y: 45, s: 0.10, d: 0.2 },
    { x: 75, y: 65, s: 0.08, d: 1.1 },
    { x: 30, y: 40, s: 0.07, d: 0.5 },
  ];
  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '10%',
          right: '10%',
          height: size * 0.25,
          borderRadius: size * 0.15,
          background: 'rgba(255,255,255,0.35)',
        }}
        animate={{ opacity: [0.25, 0.45, 0.25], scaleX: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {bubbles.map((b, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: size * b.s,
            height: size * b.s,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, white, rgba(255,255,255,0.4))',
            border: '2px solid rgba(255,255,255,0.5)',
          }}
          animate={{
            y: [0, -(size * 0.15)],
            opacity: [0, 0.9, 0],
            scale: [0.4, 1.2, 0.6],
          }}
          transition={{ duration: 2, delay: b.d, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

/* ── ПРОТИРКА: заметная тряпка ── */
function WipeEffect({ size }: { size: number }) {
  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          top: '25%',
          width: size * 0.22,
          height: size * 0.45,
          borderRadius: size * 0.05,
          background: 'rgba(251,191,36,0.6)',
          border: '2px solid rgba(251,191,36,0.8)',
        }}
        animate={{ left: ['8%', '68%', '8%'], rotate: [0, 8, -8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            top: `${30 + i * 14}%`,
            height: 3,
            borderRadius: 2,
            background: 'white',
          }}
          animate={{
            left: ['15%', '75%'],
            width: [0, size * 0.4, 0],
            opacity: [0, 0.7, 0],
          }}
          transition={{ duration: 2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
}

/* ── СУШКА: потоки воздуха ── */
function RinseEffect({ size }: { size: number }) {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            top: `${25 + i * 14}%`,
            height: 4,
            borderRadius: 2,
            background: 'white',
          }}
          animate={{
            left: ['85%', '5%'],
            width: [size * 0.05, size * 0.35, size * 0.05],
            opacity: [0, 0.65, 0],
          }}
          transition={{ duration: 1.5, delay: i * 0.25, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {[30, 50, 65].map((y, i) => (
        <motion.div
          key={`drop-${i}`}
          style={{
            position: 'absolute',
            top: `${y}%`,
            width: size * 0.04,
            height: size * 0.04,
            borderRadius: '50%',
            background: 'white',
          }}
          animate={{
            left: ['70%', '10%'],
            opacity: [0.8, 0],
            scale: [1, 0.3],
          }}
          transition={{ duration: 1, delay: i * 0.3 + 0.5, repeat: Infinity, ease: 'easeIn' }}
        />
      ))}
    </>
  );
}

/* ── БЛЕСК: яркие звёзды и свет ── */
function ShineEffect({ size }: { size: number }) {
  const stars = [
    { x: 25, y: 25, s: 0.16, d: 0 },
    { x: 60, y: 30, s: 0.13, d: 0.25 },
    { x: 40, y: 55, s: 0.14, d: 0.5 },
    { x: 70, y: 55, s: 0.11, d: 0.75 },
    { x: 50, y: 35, s: 0.12, d: 0.4 },
  ];
  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          width: size * 0.2,
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
        }}
        animate={{ left: ['-20%', '120%'] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
      />
      {stars.map((s, i) => (
        <motion.div
          key={i}
          style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: size * s.s, height: size * s.s }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1.3, 0.3], rotate: [0, 180, 360] }}
          transition={{ duration: 1.4, delay: s.d, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%">
            <path d="M12 2L13.5 9L20 12L13.5 15L12 22L10.5 15L4 12L10.5 9Z" fill="#FDE047" />
          </svg>
        </motion.div>
      ))}
    </>
  );
}

export function DrivePassLogo({
  size = 80,
  showText = false,
  className = '',
  textColor = '#111827',
  animated = true,
  variant = 'default',
}: DrivePassLogoProps) {
  const resolvedTextColor =
    variant === 'white' ? '#ffffff' : variant === 'mono' ? '#111827' : textColor;
  const displaySize = Math.round(size * 1.7);

  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    if (!animated) return;
    const t = setInterval(() => setStageIdx(p => (p + 1) % STAGES.length), STAGE_DURATION);
    return () => clearInterval(t);
  }, [animated]);

  const stage = STAGES[stageIdx];

  const effectMap: Record<string, React.ReactNode> = {
    karcher: <KarcherEffect size={displaySize} />,
    foam: <FoamEffect size={displaySize} />,
    wipe: <WipeEffect size={displaySize} />,
    rinse: <RinseEffect size={displaySize} />,
    shine: <ShineEffect size={displaySize} />,
  };

  const logoElement = (
    <div style={{ position: 'relative', width: displaySize, height: displaySize, flexShrink: 0 }}>
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '50%',
        width: displaySize,
        height: displaySize,
      }}>
        {animated ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={`logo-${stage.id}`}
              src={logoImg}
              alt="DrivePass+"
              width={displaySize}
              height={displaySize}
              style={{ display: 'block', width: displaySize, height: displaySize, objectFit: 'contain' }}
              draggable={false}
              initial={{ opacity: 0.9 }}
              animate={{
                opacity: 1,
                ...LOGO_ANIMATIONS[stage.id].animate,
              }}
              transition={LOGO_ANIMATIONS[stage.id].transition}
            />
          </AnimatePresence>
        ) : (
          <img
            src={logoImg}
            alt="DrivePass+"
            width={displaySize}
            height={displaySize}
            style={{ display: 'block', width: displaySize, height: displaySize, objectFit: 'contain' }}
            draggable={false}
          />
        )}
        {animated && (
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.id}
              style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {effectMap[stage.id]}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {animated && (
        <AnimatePresence mode="wait">
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'absolute',
              bottom: -(displaySize * 0.12),
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#2563EB',
              color: 'white',
              padding: `${Math.max(5, displaySize * 0.04)}px ${Math.max(12, displaySize * 0.09)}px`,
              borderRadius: displaySize * 0.06,
              fontSize: Math.max(11, displaySize * 0.085),
              fontWeight: 700,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 10px rgba(37,99,235,0.4)',
            }}
          >
            {stage.label}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );

  if (!animated) {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        {logoElement}
        {showText && (
          <span style={{
            color: resolvedTextColor, fontWeight: 800, fontSize: displaySize * 0.22,
            letterSpacing: '-0.02em', lineHeight: 1, whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
            DrivePass<span style={{ color: '#2563EB' }}>+</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center ${className}`} style={{ gap: displaySize * 0.18 }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {logoElement}
        </motion.div>
      </motion.div>

      {showText && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          style={{
            color: resolvedTextColor, fontWeight: 800, fontSize: displaySize * 0.18,
            letterSpacing: '-0.02em', lineHeight: 1, whiteSpace: 'nowrap',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          DrivePass<span style={{ color: '#2563EB' }}>+</span>
        </motion.p>
      )}
    </div>
  );
}

