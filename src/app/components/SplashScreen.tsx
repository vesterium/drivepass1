/**
 * SplashScreen — DrivePass+
 *
 * The screen shown while native storage hydrates and the session resolves (App.tsx's
 * `!storageReady || user === undefined` guard) -- previously a static logo + CSS
 * `animate-bounce` dots. Rebuilt as a proper entrance sequence: a breathing glow pops in
 * behind the mark, the mark itself springs in with a little overshoot then settles into a
 * slow idle float, the wordmark reveals right after, and the loading dots got a wave motion
 * instead of a flat bounce. This screen is only up for a moment, so the motion is quick and
 * confident rather than long -- the point is a crisp first impression, not a light show.
 */

import { motion } from 'motion/react';
import { DrivePassLogo } from './DrivePassLogo';

export function SplashScreen() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center overflow-hidden relative">
      {/* Ambient glow wash -- large, soft, barely-there; gives the white background depth
          without competing with the mark. */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 420,
          height: 420,
          background: 'radial-gradient(circle, rgba(37,99,235,0.16) 0%, rgba(37,99,235,0) 70%)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 1, 0.7, 1], scale: [0.8, 1.08, 1, 1.05] }}
        transition={{ duration: 2.8, ease: [0.22, 1, 0.36, 1], repeat: Infinity, repeatType: 'mirror' }}
      />

      <div className="flex flex-col items-center gap-5 relative">
        {/* Tight pulsing glow right behind the mark, on its own faster rhythm than the
            ambient wash for a bit of parallax. */}
        <div className="relative flex items-center justify-center">
          <motion.div
            className="absolute rounded-full"
            style={{ width: 140, height: 140, background: 'radial-gradient(circle, rgba(37,99,235,0.35) 0%, rgba(37,99,235,0) 72%)' }}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0.4, 0.85, 0.4], scale: [0.9, 1.15, 0.9] }}
            transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity, delay: 0.4 }}
          />

          {/* Mark: springs in with a slight overshoot + settle, then idles with a very
              small float so the screen never reads as frozen even mid-load. */}
          <motion.div
            initial={{ scale: 0.35, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, mass: 0.9 }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity, delay: 0.55 }}
            >
              <DrivePassLogo size={56} />
            </motion.div>
          </motion.div>
        </div>

        {/* Wordmark -- reveals just after the mark settles. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            style={{
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: '-0.02em',
              color: '#111827',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            DrivePass
            <motion.span
              style={{ color: '#2563EB', display: 'inline-block' }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.62, type: 'spring', stiffness: 400, damping: 12 }}
            >
              +
            </motion.span>
          </span>
        </motion.div>

        {/* Loading indicator -- a wave instead of a flat bounce: scale + lift + opacity
            move together per dot, staggered, so it reads as one continuous motion. */}
        <div className="flex items-center justify-center gap-2 mt-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="rounded-full"
              style={{ width: 7, height: 7, background: '#2563EB' }}
              initial={{ opacity: 0.4 }}
              animate={{ y: [0, -7, 0], scale: [1, 1.3, 1], opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 1.05, ease: 'easeInOut', repeat: Infinity, delay: 0.75 + i * 0.14 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
