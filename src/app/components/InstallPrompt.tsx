import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Smartphone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { isNative } from '../core/native/capacitor';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // В нативном Capacitor приложении этот промпт не нужен
    if (isNative) return;

    // Проверить, уже установлено ли приложение
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Проверить localStorage - показывали ли уже промпт
    const hasSeenPrompt = localStorage.getItem('drivepass-install-prompt-seen');
    const dismissedAt = localStorage.getItem('drivepass-install-prompt-dismissed');

    // Если закрыли меньше 7 дней назад - не показываем
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);

      // Показать промпт через 3 секунды после загрузки (не сразу)
      setTimeout(() => {
        if (!hasSeenPrompt) {
          setShowPrompt(true);
          localStorage.setItem('drivepass-install-prompt-seen', 'true');
        }
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Слушаем успешную установку
    window.addEventListener('appinstalled', () => {
      console.log('✅ DrivePass+ установлен!');
      setIsInstalled(true);
      setShowPrompt(false);
      localStorage.setItem('drivepass-is-installed', 'true');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Показать системный промпт
    deferredPrompt.prompt();

    // Ждем выбора пользователя
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ Пользователь принял установку');
    } else {
      console.log('❌ Пользователь отклонил установку');
    }

    // Убираем промпт
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('drivepass-install-prompt-dismissed', Date.now().toString());
  };

  if (isNative) return null;

  return createPortal(
    <AnimatePresence>
      {(showPrompt && !!deferredPrompt && !isInstalled) && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          className="fixed top-4 left-4 right-4 z-[9999] max-w-md mx-auto"
          style={{ top: 16, left: 16, right: 16 }}
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl shadow-2xl p-4 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }} />
            </div>

            {/* Content */}
            <div className="relative flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg mb-1">
                  Установите DrivePass+
                </h3>
                <p className="text-sm text-blue-100 mb-3">
                  Откройте приложение за 1 секунду прямо с главного экрана телефона
                </p>

                {/* Benefits */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium">
                    ⚡ Мгновенный запуск
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium">
                    📱 Как родное приложение
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-xs font-medium">
                    💾 Работает офлайн
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-white text-blue-600 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-50 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Установить
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="bg-white/20 backdrop-blur px-3 py-2.5 rounded-xl hover:bg-white/30 active:scale-95 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
