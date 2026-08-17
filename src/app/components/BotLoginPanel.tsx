/**
 * BotLoginPanel — bot-confirmed Telegram login.
 *
 * Replaces the Telegram Login Widget as the primary sign-in path: the widget's own
 * phone-code delivery proved unreliable in practice (Telegram's own infrastructure, not
 * something a website can control), while this product's bots already deliver messages
 * reliably. Flow:
 *
 *   1. POST /auth/telegram/start -> {state, deepLink}
 *   2. User opens deepLink (t.me/<bot>?start=login_<state>) or scans it as a QR
 *   3. The moment they open that link, the bot's /start handler marks the request
 *      confirmed -- no button tap, no code to type
 *   4. This panel polls GET /auth/telegram/poll?state=... every 2s until it sees
 *      {status: "confirmed", access_token, user}
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { apiHeaders, apiUrl } from '../utils/apiClient';
import type { AuthUser, PartnerAdminIdentity } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface StartLoginResponse {
  state: string;
  deepLink: string;
}

export interface LoginConfirmation {
  accessToken: string;
  user?: AuthUser;
  partnerAdmin?: PartnerAdminIdentity;
}

interface PollResponse {
  status: 'pending' | 'confirmed';
  access_token?: string;
  user?: AuthUser;
  partnerAdmin?: PartnerAdminIdentity;
}

const POLL_INTERVAL_MS = 2000;

const STRINGS = {
  ru: {
    preparing: 'Готовим ссылку…',
    openBot: 'Открыть Telegram и подтвердить',
    scanHint: 'Или отсканируй с телефона:',
    waiting: 'Ждём подтверждения в Telegram…',
    startFailed: 'Не удалось начать вход. Проверь соединение и попробуй ещё раз.',
    linkExpired: 'Ссылка для входа устарела. Нажми «Попробовать снова».',
    notRegistered: 'Этот Telegram-аккаунт не зарегистрирован как партнёр. Обратись к владельцу.',
    retry: 'Попробовать снова',
  },
  en: {
    preparing: 'Preparing link…',
    openBot: 'Open Telegram and confirm',
    scanHint: 'Or scan with your phone:',
    waiting: 'Waiting for confirmation in Telegram…',
    startFailed: "Couldn't start login. Check your connection and try again.",
    linkExpired: 'The login link has expired. Tap "Try again".',
    notRegistered: 'This Telegram account is not registered as a partner. Contact the owner.',
    retry: 'Try again',
  },
  uz: {
    preparing: 'Havola tayyorlanmoqda…',
    openBot: "Telegram'ni ochib tasdiqlash",
    scanHint: 'Yoki telefon bilan skanerlang:',
    waiting: "Telegram'da tasdiqlash kutilmoqda…",
    startFailed: "Kirishni boshlab bo'lmadi. Aloqani tekshirib, qaytadan urinib ko'ring.",
    linkExpired: '"Qaytadan urinish"ni bosing — havola eskirgan.',
    notRegistered: "Bu Telegram hisobi hamkor sifatida ro'yxatdan o'tmagan. Egasiga murojaat qiling.",
    retry: "Qaytadan urinish",
  },
} as const;

export function BotLoginPanel({
  startPath = '/auth/telegram/start',
  role,
  onConfirmed,
}: {
  /** Which login flow to start -- the default is the client bot; pass
   * "/partner/auth/telegram/start" for the admin-bot-confirmed partner flow. */
  startPath?: string;
  /** Drives the accent color -- violet for partner (matches Auth.tsx's own role badge),
   * blue for client. */
  role?: 'client' | 'partner' | null;
  onConfirmed: (confirmation: LoginConfirmation) => void;
}) {
  const { language } = useLanguage();
  const s = STRINGS[language] ?? STRINGS.ru;
  const isPartner = role === 'partner';
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setDeepLink(null);
    stopPolling();
    try {
      const res = await fetch(apiUrl(startPath), { method: 'POST', headers: apiHeaders(null) });
      if (!res.ok) throw new Error('start failed');
      const body = (await res.json()) as StartLoginResponse;
      stateRef.current = body.state;
      setDeepLink(body.deepLink);
    } catch {
      setError(s.startFailed);
    }
  }, [startPath, stopPolling, s.startFailed]);

  useEffect(() => {
    start();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPath]);

  useEffect(() => {
    if (!deepLink) return;

    pollTimerRef.current = setInterval(async () => {
      const state = stateRef.current;
      if (!state) return;
      try {
        // The poll endpoint lives under /auth/telegram/poll regardless of which start
        // path kicked things off -- it looks at the LoginRequest's own stored kind.
        const res = await fetch(apiUrl(`/auth/telegram/poll?state=${encodeURIComponent(state)}`));
        if (res.status === 404 || res.status === 410) {
          stopPolling();
          setError(s.linkExpired);
          return;
        }
        if (res.status === 403) {
          stopPolling();
          setError(s.notRegistered);
          return;
        }
        if (!res.ok) return; // transient error -- keep polling
        const body = (await res.json()) as PollResponse;
        if (body.status === 'confirmed' && body.access_token && (body.user || body.partnerAdmin)) {
          stopPolling();
          onConfirmed({ accessToken: body.access_token, user: body.user, partnerAdmin: body.partnerAdmin });
        }
      } catch {
        // Offline for a beat -- next tick will retry, no need to surface an error yet.
      }
    }, POLL_INTERVAL_MS);

    return stopPolling;
  }, [deepLink, onConfirmed, stopPolling, s.linkExpired, s.notRegistered]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <p className="text-sm text-red-600 text-center">{error}</p>
        <button
          type="button"
          onClick={start}
          className={`text-sm font-medium underline ${isPartner ? 'text-violet-600' : 'text-blue-600'}`}
        >
          {s.retry}
        </button>
      </div>
    );
  }

  if (!deepLink) {
    return (
      <div className="flex justify-center py-6">
        <span className="text-sm text-gray-400">{s.preparing}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <a
        href={deepLink}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full text-center text-white font-semibold rounded-xl py-3 px-6 transition-colors ${
          isPartner ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {s.openBot}
      </a>

      <div className="flex flex-col items-center gap-2 pt-1">
        <p className="text-xs text-gray-400">{s.scanHint}</p>
        <div className="bg-white p-2 rounded-lg border border-gray-100">
          <QRCodeSVG value={deepLink} size={140} />
        </div>
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <span className={`inline-block w-1.5 h-1.5 rounded-full animate-pulse ${isPartner ? 'bg-violet-500' : 'bg-blue-500'}`} />
        {s.waiting}
      </p>
    </div>
  );
}
