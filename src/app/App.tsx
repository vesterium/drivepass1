import { useState, useEffect, useCallback, useRef } from 'react';
import { registerBackButton, hapticTap, onAppResume } from './core/native/capacitor';
import { initTelegramMiniApp } from './core/native/telegram';
import { nativeStorage } from './core/native/storage';
import { Home, MapPin, QrCode, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { PartnerProvider } from './contexts/PartnerContext';
import { Dashboard } from './components/Dashboard';
import { Locations } from './components/Locations';
import { Scanner } from './components/Scanner';
import { Profile } from './components/Profile';
import { WashHistory } from './components/WashHistory';
import { PartnerDashboard } from './components/PartnerDashboard';
import { Onboarding } from './components/Onboarding';
import { Auth } from './components/Auth';
import { WelcomeScreen } from './components/WelcomeScreen';
import { InstallPrompt } from './components/InstallPrompt';
import { useLanguage } from './contexts/LanguageContext';
import { DrivePassLogo } from './components/DrivePassLogo';
import { NetworkBanner } from './components/NetworkBanner';
import { ErrorBoundary } from './core/errors/ErrorBoundary';
import { SUB_VIEWS } from './core/types';
import type { ClientView, Role } from './core/types';

// Nav items config
const NAV_ITEMS = [
  { id: 'dashboard', icon: Home,   labelKey: 'nav.home' },
  { id: 'locations', icon: MapPin, labelKey: 'nav.locations' },
  { id: 'scanner',   icon: QrCode, labelKey: 'QR', isCenter: true },
  { id: 'profile',   icon: User,   labelKey: 'nav.profile' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Animated page wrapper  (replaces old ref-based PageWrapper)
// ─────────────────────────────────────────────────────────────────────────────

function PageWrapper({ children, viewKey }: { children: React.ReactNode; viewKey: string }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y: 24, scale: 0.978, filter: 'blur(5px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, scale: 0.994, filter: 'blur(2px)' }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner app
// ─────────────────────────────────────────────────────────────────────────────

function AppContent() {
  const { user, partnerAdmin, accessToken, signOut, refreshSession } = useAuth();
  const { t } = useLanguage();

  const [currentView, setCurrentView] = useState<ClientView>('dashboard');
  const [isPartnerMode, setIsPartnerMode] = useState(false);
  const viewHistoryRef = useRef<ClientView[]>([]);

  const navigateTo = useCallback((view: ClientView) => {
    hapticTap();
    viewHistoryRef.current.push(currentView);
    setCurrentView(view);
  }, [currentView]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  // ── Выбранная роль на WelcomeScreen ─────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Tell Telegram the Mini App is ready and let it expand to full height -- a no-op
  // when the PWA is opened outside Telegram.
  useEffect(() => {
    initTelegramMiniApp();
  }, []);

  // Hydrate persisted app state from native storage on mount
  useEffect(() => {
    Promise.all([
      nativeStorage.getItem('hasSeenOnboarding'),
      nativeStorage.getItem('drivepass_role'),
    ]).then(([onboarding, role]) => {
      setShowOnboarding(!onboarding);
      setSelectedRole((role as Role | null) ?? null);
      setStorageReady(true);
    });
  }, []);

  // После входа — редирект на нужный экран по типу сессии
  useEffect(() => {
    if (!user && !partnerAdmin) return;
    if (partnerAdmin) {
      setIsPartnerMode(true);
    } else {
      setCurrentView('dashboard');
    }
  }, [user?.id, partnerAdmin?.id]);

  // Android back button
  useEffect(() => {
    const unregister = registerBackButton(() => {
      if (isPartnerMode) { setIsPartnerMode(false); return true; }
      const prev = viewHistoryRef.current.pop();
      if (prev) { setCurrentView(prev); return true; }
      if (currentView !== 'dashboard') { setCurrentView('dashboard'); return true; }
      return false;
    });
    return unregister;
  }, [currentView, isPartnerMode]);

  // Show "press back again to exit" toast
  useEffect(() => {
    const handler = () => toast('Нажмите ещё раз для выхода', { duration: 2000 });
    window.addEventListener('drivepass:back-press-warning', handler);
    return () => window.removeEventListener('drivepass:back-press-warning', handler);
  }, []);

  // Re-check session when app comes back to foreground (native) -- catches a token that
  // expired or was revoked while the app sat backgrounded.
  useEffect(() => {
    const unreg = onAppResume(() => { refreshSession(); });
    return unreg;
  }, [refreshSession]);

  const handleRoleSelect = (role: Role) => {
    nativeStorage.setItem('drivepass_role', role).catch(() => {});
    setSelectedRole(role);
  };

  const handleOnboardingComplete = () => {
    nativeStorage.setItem('hasSeenOnboarding', 'true').catch(() => {});
    setShowOnboarding(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentView('dashboard');
    setIsPartnerMode(false);
    nativeStorage.removeItem('drivepass_role').catch(() => {});
    setSelectedRole(null);
    toast.success('Вы вышли из системы');
  };


  // ── Render guards ──────────────────────────────────────────────────────────

  if (!storageReady || user === undefined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <DrivePassLogo size={56} animated={false} showText />
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) return <Onboarding onComplete={handleOnboardingComplete} />;

  const isSignedIn = !!user || !!partnerAdmin;

  // ── WelcomeScreen: нет сессии и роль ещё не выбрана ─────────────────────
  if (!isSignedIn && !selectedRole) {
    return <WelcomeScreen onSelectRole={handleRoleSelect} />;
  }

  // ── Auth: роль выбрана, но ещё не вошли ───────────────────────────────
  // Same bot-confirmed login for both roles -- Auth picks the client or partner start
  // path itself based on `role`. Partner accounts are owner-provisioned only (added via
  // /admin_add in the bot); there's no self-registration screen anymore.
  if (!isSignedIn) {
    return (
      <Auth
        role={selectedRole}
        onBack={() => {
          nativeStorage.removeItem('drivepass_role').catch(() => {});
          setSelectedRole(null);
        }}
      />
    );
  }

  // ── Render views ──────────────────────────────────────────────────────────

  const renderView = () => {
    if (isPartnerMode) {
      return (
        <PartnerProvider>
          <PartnerDashboard onExitPartnerMode={() => setIsPartnerMode(false)} accessToken={accessToken} />
        </PartnerProvider>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            user={user}
            accessToken={accessToken}
            onGoToLocations={() => setCurrentView('locations')}
            onGoToHistory={() => setCurrentView('history')}
          />
        );
      case 'locations':
        return <Locations accessToken={accessToken} />;
      case 'scanner':
        return <Scanner accessToken={accessToken} />;
      case 'profile':
        return (
          <Profile
            user={user}
            onViewHistory={() => setCurrentView('history')}
            onSignOut={handleSignOut}
          />
        );
      case 'history':
        return <WashHistory onBack={() => setCurrentView('profile')} accessToken={accessToken} />;
      default:
        return <Dashboard user={user} accessToken={accessToken} />;
    }
  };

  const isInSubView = SUB_VIEWS.includes(currentView);
  const showNav = !isPartnerMode && !isInSubView;

  return (
    <>
      {/* ── Main content area ── */}
      <div
        className={`min-h-screen bg-gray-50 ${showNav ? 'pb-safe-nav' : ''}`}
        style={{
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch' as any,
          overscrollBehavior: 'none',
          touchAction: 'pan-y',
          height: '100svh',
          minHeight: '-webkit-fill-available',
        }}
      >
        <main className="w-full max-w-lg mx-auto">
          <PageWrapper viewKey={isPartnerMode ? 'partner' : currentView}>
            {renderView()}
          </PageWrapper>
        </main>
      </div>

      {/* ── Bottom Navigation Bar ── */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 nav-glass z-50 native-bottom-nav">
          <div className="max-w-md mx-auto px-2">
            <div className="flex items-end justify-around h-[68px] pb-1">

              {NAV_ITEMS.map(({ id, icon: Icon, labelKey, isCenter }) => {
                const isActive = currentView === id;

                if (isCenter) {
                  return (
                    <motion.button
                      key={id}
                      onClick={() => navigateTo(id as ClientView)}
                      whileHover={{ scale: 1.1, y: -3 }}
                      whileTap={{ scale: 0.93 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                      className="relative flex flex-col items-center -mt-5"
                      style={{ minHeight: 0, minWidth: 0 }}
                    >
                      <div className={`
                        relative w-[58px] h-[58px] rounded-full flex items-center justify-center
                        shadow-lg transition-all duration-200
                        ${isActive
                          ? 'bg-blue-600 shadow-blue-500/50'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'
                        }
                      `}>
                        {isActive && (
                          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-30" />
                        )}
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[10px] mt-1 font-semibold text-blue-600">QR</span>
                    </motion.button>
                  );
                }

                return (
                  <motion.button
                    key={id}
                    onClick={() => navigateTo(id as ClientView)}
                    whileHover={{ scale: 1.08, y: -2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                    className="relative flex flex-col items-center justify-center gap-1 pt-2 pb-1 px-3 rounded-xl"
                    style={{ minHeight: 0, minWidth: 0 }}
                  >
                    {/* Hover background glow */}
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.18 }}
                      style={{ background: isActive ? 'transparent' : 'rgba(37,99,235,0.06)' }}
                    />

                    {/* Active background pill */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="nav-pill"
                          className="absolute inset-0 bg-blue-50 rounded-xl"
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.85 }}
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                    </AnimatePresence>

                    <motion.div
                      animate={{ scale: isActive ? 1.12 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    >
                      <Icon
                        className={`relative z-10 w-[22px] h-[22px] transition-colors duration-200 ${
                          isActive ? 'text-blue-600' : 'text-gray-400'
                        }`}
                      />
                    </motion.div>

                    <motion.span
                      animate={{ color: isActive ? '#2563EB' : '#9CA3AF' }}
                      transition={{ duration: 0.2 }}
                      className="relative z-10 text-[10px] font-semibold leading-none"
                    >
                      {t(labelKey as any)}
                    </motion.span>
                  </motion.button>
                );
              })}

            </div>
          </div>
        </nav>
      )}

      <Toaster position="top-center" richColors />
      <NetworkBanner />
      <InstallPrompt />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <AppContent />
          </SubscriptionProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
