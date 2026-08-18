import { useState, useRef } from 'react';
import { ChevronRight, Car, QrCode, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { BRAND } from '../constants/branding';
import { DrivePassLogo } from './DrivePassLogo';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const { t } = useLanguage();

  // ── Touch swipe ─────────────────────────────────────────────────
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
    touchStartY.current = e.changedTouches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    // Ignore mostly-vertical swipes
    if (dy > Math.abs(dx) * 0.8) return;
    if (Math.abs(dx) < 44) return;
    if (dx > 0 && currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(p => p + 1);
    } else if (dx < 0 && currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(p => p - 1);
    }
  };

  const slides = [
    {
      icon: Car,
      title: t('onboarding.slide1.title'),
      description: t('onboarding.slide1.description'),
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-600',
      dotColor: 'bg-blue-600',
    },
    {
      icon: QrCode,
      title: t('onboarding.slide2.title'),
      description: t('onboarding.slide2.description'),
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-600',
      dotColor: 'bg-blue-600',
    },
    {
      icon: Zap,
      title: t('onboarding.slide3.title'),
      description: t('onboarding.slide3.description'),
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-600',
      dotColor: 'bg-blue-600',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => onComplete();

  const handleDotClick = (idx: number) => {
    setDirection(idx > currentSlide ? 1 : -1);
    setCurrentSlide(idx);
  };

  const slide = slides[currentSlide];
  const IconComponent = slide.icon;

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
      scale: 0.96,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
      scale: 0.96,
    }),
  };

  return (
    <div
      className="min-h-screen bg-white flex flex-col overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex justify-between items-center p-6"
      >
        <div className="flex items-center gap-2">
          <DrivePassLogo size={28} />
          <span className="text-xl text-gray-900">{BRAND.name}</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSkip}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          {t('onboarding.skip')}
        </motion.button>
      </motion.div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 relative">

        {/* Icon */}
        <div className="mb-12 relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`icon-${currentSlide}`}
              custom={direction}
              variants={{
                enter: { scale: 0.6, opacity: 0, rotate: -8 },
                center: { scale: 1, opacity: 1, rotate: 0 },
                exit: { scale: 0.7, opacity: 0, rotate: 8 },
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${slide.gradient} flex items-center justify-center shadow-xl`}
            >
              <IconComponent className="w-16 h-16 text-white" />
            </motion.div>
          </AnimatePresence>

          {/* Glow ring */}
          <AnimatePresence>
            <motion.div
              key={`glow-${currentSlide}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.18, opacity: 0.15 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`absolute inset-0 rounded-full ${slide.bg} -z-10`}
            />
          </AnimatePresence>
        </div>

        {/* Text */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`text-${currentSlide}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-center w-full"
          >
            <h2 className="text-3xl text-center text-gray-900 mb-4 px-4">
              {slide.title}
            </h2>
            <p className="text-center text-gray-600 text-lg px-6">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex gap-2 mt-12"
        >
          {slides.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => handleDotClick(index)}
              animate={{
                width: index === currentSlide ? 32 : 8,
                backgroundColor: index === currentSlide ? '#2563EB' : '#D1D5DB',
              }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="h-2 rounded-full"
              style={{ minWidth: 8, minHeight: 0 }}
            />
          ))}
        </motion.div>
      </div>

      {/* Bottom Button */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="p-6"
      >
        <motion.button
          onClick={handleNext}
          whileTap={{ scale: 0.97 }}
          whileHover={{ scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg"
          style={{ transition: 'background-color 0.2s' }}
        >
          <span className="text-lg">
            {currentSlide === slides.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
          </span>
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut', repeatDelay: 0.4 }}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        </motion.button>
      </motion.div>
    </div>
  );
}
