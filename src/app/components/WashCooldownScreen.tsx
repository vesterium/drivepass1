/**
 * WashCooldownScreen — «Ваша машина ещё чистая!»
 *
 * Показывается когда check_wash_eligibility вернул eligible: false.
 * Анимированный обратный отсчёт + мотивирующий текст.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Droplets, Car, Sparkles, Clock } from 'lucide-react';

interface WashCooldownScreenProps {
  secondsRemaining: number;       // из check_wash_eligibility
  carPlate: string;
  onCooldownEnd: () => void;      // вызывается когда таймер дошёл до 0
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function WashCooldownScreen({ secondsRemaining, carPlate, onCooldownEnd }: WashCooldownScreenProps) {
  const [secs, setSecs] = useState(secondsRemaining);

  useEffect(() => {
    setSecs(secondsRemaining);
  }, [secondsRemaining]);

  useEffect(() => {
    if (secs <= 0) {
      onCooldownEnd();
      return;
    }
    const timer = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secs]);

  const hours   = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  // Прогресс: 0 → 86400 секунд
  const progress = Math.max(0, Math.min(1, 1 - secs / 86400));

  // Цвет дуги — зеленеет по мере приближения к 0
  const ringColor = secs < 3600
    ? '#34d399'   // emerald — скоро можно мыться
    : secs < 7200
    ? '#60a5fa'   // blue — несколько часов
    : '#818cf8';  // indigo — много времени

  const circumference = 2 * Math.PI * 54; // r=54

  return (
    <div className="px-5 pb-6">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-3xl overflow-hidden shadow-lg"
      >
        {/* Шапка с градиентом */}
        <div className="relative bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 p-6 pb-10 text-center overflow-hidden">

          {/* Декоративные капли */}
          {[
            { size: 80, top: '-20px', left: '-20px', opacity: 0.1 },
            { size: 60, top: '10px',  right: '-10px', opacity: 0.08 },
            { size: 40, bottom: '20px', left: '30px', opacity: 0.12 },
          ].map((d, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -6, 0], rotate: [0, 8, 0] }}
              transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 1.2 }}
              style={{
                position: 'absolute',
                width: d.size,
                height: d.size,
                top: (d as any).top,
                bottom: (d as any).bottom,
                left: (d as any).left,
                right: (d as any).right,
                opacity: d.opacity,
                borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
                background: 'white',
              }}
            />
          ))}

          {/* Иконка капли */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3"
          >
            <Droplets className="w-7 h-7 text-white" />
          </motion.div>

          <h2 className="text-xl text-white mb-1" style={{ fontWeight: 700 }}>
            Ваша машина ещё чистая!
          </h2>
          <p className="text-blue-100 text-sm">
            24ч лимит защищает вас от лишних расходов
          </p>
        </div>

        {/* Круговой таймер — выезжает поверх шапки */}
        <div className="relative flex justify-center -mt-12 mb-4">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative bg-white rounded-full shadow-lg flex items-center justify-center"
            style={{ width: 132, height: 132 }}
          >
            {/* SVG ring */}
            <svg width="132" height="132" className="absolute inset-0 -rotate-90">
              {/* Track */}
              <circle
                cx="66" cy="66" r="54"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="8"
              />
              {/* Progress */}
              <motion.circle
                cx="66" cy="66" r="54"
                fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{
                  strokeDashoffset: circumference * (1 - progress),
                  stroke: ringColor,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </svg>

            {/* Числа */}
            <div className="text-center relative z-10">
              <motion.div
                key={`${hours}:${minutes}`}
                initial={{ opacity: 0.6, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-2xl text-gray-900 leading-none tabular-nums" style={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
                  {pad(hours)}:{pad(minutes)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 font-semibold tabular-nums">
                  {pad(seconds)}с
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Инфо */}
        <div className="px-5 pb-5">
          {/* Госномер */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2">
              <Car className="w-4 h-4 text-gray-400" />
              <span className="font-mono text-gray-800 tracking-widest" style={{ fontWeight: 700 }}>
                {carPlate}
              </span>
            </div>
          </div>

          {/* Плашки-подсказки */}
          <div className="space-y-2.5">
            {[
              {
                icon: Clock,
                color: 'text-blue-500',
                bg: 'bg-blue-50',
                text: `До следующей мойки: ${pad(hours)}ч ${pad(minutes)}м`,
              },
              {
                icon: Sparkles,
                color: 'text-purple-500',
                bg: 'bg-purple-50',
                text: 'Используйте время для детейлинга или шиномонтажа',
              },
              {
                icon: Droplets,
                color: 'text-cyan-500',
                bg: 'bg-cyan-50',
                text: '24ч лимит = гарантия бережного ухода за лакокраской',
              },
            ].map(({ icon: Icon, color, bg, text }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`flex items-start gap-3 ${bg} rounded-xl p-3`}
              >
                <div className={`flex-shrink-0 mt-0.5 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-sm text-gray-700 leading-snug">{text}</p>
              </motion.div>
            ))}
          </div>

          {/* Прогресс-бар времени */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>Последняя мойка</span>
              <span>Следующая доступна</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, #6366f1, ${ringColor})` }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-center text-xs text-gray-400 mt-1.5">
              {Math.round(progress * 100)}% — цикл завершён
            </p>
          </div>
        </div>
      </motion.div>

      {/* Нижняя подсказка */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-blue-200 text-xs mt-3"
      >
        Таймер обновляется автоматически
      </motion.p>
    </div>
  );
}

