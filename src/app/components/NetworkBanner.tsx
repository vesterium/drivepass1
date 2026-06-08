import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '../core/hooks/useNetworkStatus';

/**
 * Shows a non-intrusive banner when the device goes offline / comes back online.
 * Works on both native (Capacitor Network plugin) and web (navigator.onLine).
 */
export function NetworkBanner() {
  const isOnline = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-banner"
          initial={{ opacity: 0, y: -48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -48 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-2 px-4 py-2.5"
          style={{
            background: 'rgba(30, 30, 35, 0.97)',
            backdropFilter: 'blur(16px)',
            paddingTop: `max(10px, calc(env(safe-area-inset-top) + 6px))`,
          }}
        >
          <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-white text-sm font-semibold">Нет подключения к сети</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
