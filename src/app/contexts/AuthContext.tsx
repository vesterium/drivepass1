/**
 * AuthContext — единственный источник истины для сессии.
 *
 * Identity is Telegram, not Supabase: the widget hands us a signed payload, our backend
 * verifies it, and issues its own access token (see POST /auth/telegram). That token is
 * everything -- there's no separate Supabase session to keep in sync with.
 *
 * Гарантии:
 *  1. Токен персистится через nativeStorage (Capacitor Preferences / localStorage).
 *  2. refreshSession() всегда перепроверяет токен через GET /me на старте приложения.
 *  3. user / accessToken доступны любому компоненту без prop-drilling.
 *  4. Переход Auth → App происходит исключительно через изменение `user`:
 *       undefined → ещё инициализируется  (спиннер)
 *       null      → не авторизован        (показываем Auth)
 *       AuthUser  → авторизован           (показываем App)
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { nativeStorage } from '../core/native/storage';
import { apiHeaders, apiUrl } from '../utils/apiClient';
import type { TelegramAuthPayload } from '../components/TelegramLoginButton';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  tg_id: number;
  lang: string;
}

interface AuthContextValue {
  /** undefined = loading | null = not signed in | AuthUser = signed in */
  user: AuthUser | null | undefined;
  accessToken: string | null;
  /** Verifies the Telegram widget payload with our backend and starts the session. */
  loginWithTelegram: (payload: TelegramAuthPayload) => Promise<boolean>;
  /** Persists a session already established elsewhere (bot-confirmed login's poll result
   * already comes back with a token + user -- no separate verification call needed). */
  completeLogin: (accessToken: string, user: AuthUser) => Promise<void>;
  /** Re-validates the stored token against the backend (resilient to being offline). */
  refreshSession: () => Promise<void>;
  /** Выход из системы */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  accessToken: null,
  loginWithTelegram: async () => false,
  completeLogin: async () => {},
  refreshSession: async () => {},
  signOut: async () => {},
});

const TOKEN_KEY = 'dp_access_token';

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const token = await nativeStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setAccessToken(null);
      return;
    }
    try {
      const res = await fetch(apiUrl('/me'), { headers: apiHeaders(token) });
      if (!res.ok) {
        // Token expired or revoked server-side -- clear it, don't loop forever on it.
        await nativeStorage.removeItem(TOKEN_KEY);
        setUser(null);
        setAccessToken(null);
        return;
      }
      const me = (await res.json()) as AuthUser;
      setAccessToken(token);
      setUser(me);
    } catch {
      // Offline / backend unreachable -- keep the token and stay signed in with what we
      // have rather than force a logout; the next successful refresh will reconcile.
      setAccessToken(token);
    }
  }, []);

  const loginWithTelegram = useCallback(async (payload: TelegramAuthPayload): Promise<boolean> => {
    try {
      const res = await fetch(apiUrl('/auth/telegram'), {
        method: 'POST',
        headers: apiHeaders(null),
        body: JSON.stringify(payload),
      });
      if (!res.ok) return false;
      const body = (await res.json()) as { access_token: string; user: AuthUser };
      await nativeStorage.setItem(TOKEN_KEY, body.access_token);
      setAccessToken(body.access_token);
      setUser(body.user);
      return true;
    } catch {
      return false;
    }
  }, []);

  const completeLogin = useCallback(async (token: string, me: AuthUser) => {
    await nativeStorage.setItem(TOKEN_KEY, token);
    setAccessToken(token);
    setUser(me);
  }, []);

  const signOut = useCallback(async () => {
    await nativeStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setAccessToken(null);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider value={{ user, accessToken, loginWithTelegram, completeLogin, refreshSession, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
