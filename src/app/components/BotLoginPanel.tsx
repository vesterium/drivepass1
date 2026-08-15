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
import type { AuthUser } from '../contexts/AuthContext';

interface StartLoginResponse {
  state: string;
  deepLink: string;
}

interface PollResponse {
  status: 'pending' | 'confirmed';
  access_token?: string;
  user?: AuthUser;
}

const POLL_INTERVAL_MS = 2000;

export function BotLoginPanel({ onConfirmed }: { onConfirmed: (accessToken: string, user: AuthUser) => void }) {
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
      const res = await fetch(apiUrl('/auth/telegram/start'), { method: 'POST', headers: apiHeaders(null) });
      if (!res.ok) throw new Error('start failed');
      const body = (await res.json()) as StartLoginResponse;
      stateRef.current = body.state;
      setDeepLink(body.deepLink);
    } catch {
      setError('Не удалось начать вход. Проверь соединение и попробуй ещё раз.');
    }
  }, [stopPolling]);

  useEffect(() => {
    start();
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!deepLink) return;

    pollTimerRef.current = setInterval(async () => {
      const state = stateRef.current;
      if (!state) return;
      try {
        const res = await fetch(apiUrl(`/auth/telegram/poll?state=${encodeURIComponent(state)}`));
        if (res.status === 404 || res.status === 410) {
          stopPolling();
          setError('Ссылка для входа устарела. Нажми «Попробовать снова».');
          return;
        }
        if (!res.ok) return; // transient error -- keep polling
        const body = (await res.json()) as PollResponse;
        if (body.status === 'confirmed' && body.access_token && body.user) {
          stopPolling();
          onConfirmed(body.access_token, body.user);
        }
      } catch {
        // Offline for a beat -- next tick will retry, no need to surface an error yet.
      }
    }, POLL_INTERVAL_MS);

    return stopPolling;
  }, [deepLink, onConfirmed, stopPolling]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <p className="text-sm text-red-600 text-center">{error}</p>
        <button type="button" onClick={start} className="text-sm text-blue-600 font-medium underline">
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!deepLink) {
    return (
      <div className="flex justify-center py-6">
        <span className="text-sm text-gray-400">Готовим ссылку…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <a
        href={deepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 px-6 transition-colors"
      >
        Открыть Telegram и подтвердить
      </a>

      <div className="flex flex-col items-center gap-2 pt-1">
        <p className="text-xs text-gray-400">Или отсканируй с телефона:</p>
        <div className="bg-white p-2 rounded-lg border border-gray-100">
          <QRCodeSVG value={deepLink} size={140} />
        </div>
      </div>

      <p className="text-xs text-gray-400 flex items-center gap-1.5">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Ждём подтверждения в Telegram…
      </p>
    </div>
  );
}
