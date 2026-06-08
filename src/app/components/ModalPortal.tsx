/**
 * ModalPortal — DrivePass+
 * Универсальная обёртка для всех модальных окон:
 * — createPortal → document.body (избегает CSS transform от родителей)
 * — AnimatePresence → плавный вход и ВЫХОД
 * — Spring-анимация контента
 * — Два варианта: center (диалог) и bottom (bottom-sheet)
 */

import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

interface ModalPortalProps {
  /** Отображать ли модалку */
  open: boolean;
  /** Закрыть по тапу на бэкдроп */
  onClose: () => void;
  /** Контент внутри */
  children: React.ReactNode;
  /**
   * center — диалог по центру (scale + fade)
   * bottom — выезжает снизу (bottom-sheet)
   */
  variant?: 'center' | 'bottom';
  /** Прозрачность оверлея, по умолчанию 0.55 */
  overlayOpacity?: number;
}

export function ModalPortal({
  open,
  onClose,
  children,
  variant = 'center',
  overlayOpacity = 0.55,
}: ModalPortalProps) {
  const isBottom = variant === 'bottom';

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const contentVariants = isBottom
    ? {
        hidden:  { y: 72, opacity: 0 },
        visible: { y: 0,  opacity: 1 },
        exit:    { y: 72, opacity: 0 },
      }
    : {
        hidden:  { scale: 0.93, y: 24, opacity: 0 },
        visible: { scale: 1,    y: 0,  opacity: 1 },
        exit:    { scale: 0.95, y: 16, opacity: 0 },
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className={`fixed z-[9999] flex ${
            isBottom ? 'items-end justify-center' : 'items-center justify-center p-5'
          }`}
          style={{
            top: 0, left: 0, right: 0, bottom: 0,
            background: `rgba(0,0,0,${overlayOpacity})`,
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
          }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="modal-content"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.85 }}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

