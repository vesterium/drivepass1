/**
 * Auth.tsx — DrivePass+
 *
 * Флоу входа: bot-confirmed login. Open a deep link into the client bot (or scan it as a
 * QR) -> the bot's /start handler confirms it the instant it's opened -> this screen polls
 * the backend and picks up the session. No SMS/phone codes anywhere in the loop -- the
 * Telegram Login Widget's own code delivery proved unreliable in practice, so this reuses
 * the bot's own message delivery instead (see BotLoginPanel.tsx).
 *
 * No phone/password/SMS-OTP here anymore -- identity is Telegram end to end, matching the
 * two bots this PWA sits alongside.
 */

import { motion } from 'motion/react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from './ui/card';
import { ArrowLeft } from 'lucide-react';
import { DrivePassLogo } from './DrivePassLogo';
import { BotLoginPanel, type LoginConfirmation } from './BotLoginPanel';

// ─── Компактный языковой переключатель ───────────────────────────────────────
function LangSwitcher() {
  const { language, setLanguage } = useLanguage();
  const LANGS = [
    { code: 'ru' as const, label: 'RU' },
    { code: 'en' as const, label: 'EN' },
    { code: 'uz' as const, label: 'UZ' },
  ];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#F0F0F5',
        borderRadius: 999,
        padding: 3,
        gap: 2,
      }}
    >
      {LANGS.map(({ code, label }) => {
        const isActive = language === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            style={{
              background: isActive ? '#ffffff' : 'transparent',
              color: isActive ? '#2563eb' : '#9CA3AF',
              fontWeight: isActive ? 700 : 500,
              fontSize: 10,
              lineHeight: 1,
              padding: '4px 10px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              transition: 'background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.13)' : 'none',
              letterSpacing: '0.05em',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Inline i18n labels ─────────────────────────────────────────────────
const L = {
  ru: {
    back: 'Изменить роль', roleClient: 'Вход как Водитель', rolePartner: 'Вход как Партнёр',
    slogan: 'Smart Car Care. Экономь каждый день.', prompt: 'Войдите через Telegram, чтобы продолжить',
    error: 'Не удалось войти. Попробуйте ещё раз.',
  },
  en: {
    back: 'Change role', roleClient: 'Sign in as Driver', rolePartner: 'Sign in as Partner',
    slogan: 'Smart Car Care. Save every day.', prompt: 'Log in with Telegram to continue',
    error: "Couldn't log in. Please try again.",
  },
  uz: {
    back: "Rolni o'zgartirish", roleClient: 'Haydovchi sifatida kirish', rolePartner: 'Hamkor sifatida kirish',
    slogan: "Aqlli avto parvarish. Har kuni tejang.", prompt: "Davom etish uchun Telegram orqali kiring",
    error: "Kirib bo'lmadi. Qaytadan urinib ko'ring.",
  },
} as const;

export function Auth({ role, onBack }: { role?: 'client' | 'partner' | null; onBack?: () => void }) {
  const { completeLogin } = useAuth();
  const { language } = useLanguage();
  const strings = L[language] ?? L.ru;

  function handleConfirmed({ accessToken, user, partnerAdmin }: LoginConfirmation) {
    completeLogin(accessToken, user, partnerAdmin);
    // AuthContext's `user`/`partnerAdmin` flips and App.tsx's own gating takes it from
    // here -- nothing else to do in this component.
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        {onBack && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-4 transition-colors"
            style={{ minHeight: 0 }}
          >
            <ArrowLeft className="w-4 h-4" />
            {strings.back}
          </motion.button>
        )}

        <Card className="w-full max-w-md border border-gray-100">
          <CardHeader className="space-y-1 text-center pb-4 relative">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="absolute top-4 right-4"
            >
              <LangSwitcher />
            </motion.div>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.36, ease: 'backOut' }}
              className="flex items-center justify-center mb-2"
            >
              <DrivePassLogo size={44} />
            </motion.div>
            <CardTitle className="text-2xl font-bold">DrivePass+</CardTitle>
            {role && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex justify-center mt-1"
              >
                <span
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold ${
                    role === 'partner' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {role === 'partner' ? strings.rolePartner : strings.roleClient}
                </span>
              </motion.div>
            )}
            <p className="text-sm text-gray-500 mt-1">{strings.slogan}</p>
          </CardHeader>

          <CardContent className="space-y-5 pb-8">
            <p className="text-center text-sm text-gray-600">{strings.prompt}</p>

            <BotLoginPanel
              startPath={role === 'partner' ? '/partner/auth/telegram/start' : '/auth/telegram/start'}
              role={role}
              onConfirmed={handleConfirmed}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
