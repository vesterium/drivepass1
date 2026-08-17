/**
 * AuthContext — единственный источник истины для сессии.
 *
 * Two kinds of session share this context: a client (`User`, via the client bot's
 * bot-confirmed login) and a partner admin (`PartnerAdmin`, via the admin bot's). Both
 * issue the same kind of JWT and both are driven end to end by BotLoginPanel -- this
 * context just remembers which kind is currently signed in and persists it.
 *
 * Гарантии:
 *  1. Токен и его тип персистятся через nativeStorage (Capacitor Preferences / localStorage).
 *  2. refreshSession() всегда перепроверяет токен через GET /me (или /partner/me) на старте.
 *  3. user / partnerAdmin / accessToken доступны любому компоненту без prop-drilling.
 *  4. Переход Auth → App происходит через `user`/`partnerAdmin`:
 *       user === undefined              → ещё инициализируется  (спиннер)
 *       user === null && !partnerAdmin  → не авторизован        (показываем Auth)
 *       user !== null || partnerAdmin   → авторизован           (показываем App)
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

export interface PartnerAdminIdentity {
  id: number;
  partnerId: number;
  name: string;
}

type TokenKind = 'user' | 'partner_admin';

interface AuthContextValue {
  /** undefined = loading | null = not signed in as a client | AuthUser = signed in */
  user: AuthUser | null | undefined;
  /** Set when the current session is a partner admin instead of a client. */
  partnerAdmin: PartnerAdminIdentity | null;
  accessToken: string | null;
  /** Verifies the Telegram widget payload with our backend and starts the session. */
  loginWithTelegram: (payload: TelegramAuthPayload) => Promise<boolean>;
  /** Persists a session BotLoginPanel already established (its poll result already comes
   * back with a token + identity -- no separate verification call needed). */
  completeLogin: (accessToken: string, user?: AuthUser, partnerAdmin?: PartnerAdminIdentity) => Promise<void>;
  /** Re-validates the stored token against the backend (resilient to being offline). */
  refreshSession: () => Promise<void>;
  /** Выход из системы */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  partnerAdmin: null,
  accessToken: null,
  loginWithTelegram: async () => false,
  completeLogin: async () => {},
  refreshSession: async () => {},
  signOut: async () => {},
});

const TOKEN_KEY = 'dp_access_token';
const TOKEN_KIND_KEY = 'dp_token_kind';

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [partnerAdmin, setPartnerAdmin] = useState<PartnerAdminIdentity | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const clearSession = useCallback(async () => {
    await nativeStorage.removeItem(TOKEN_KEY);
    await nativeStorage.removeItem(TOKEN_KIND_KEY);
    setUser(null);
    setPartnerAdmin(null);
    setAccessToken(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const token = await nativeStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setPartnerAdmin(null);
      setAccessToken(null);
      return;
    }
    const kind = ((await nativeStorage.getItem(TOKEN_KIND_KEY)) as TokenKind | null) ?? 'user';

    try {
      if (kind === 'partner_admin') {
        const res = await fetch(apiUrl('/partner/me'), { headers: apiHeaders(token) });
        if (!res.ok) {
          await clearSession();
          return;
        }
        const me = await res.json();
        setAccessToken(token);
        setPartnerAdmin({ id: Number(me.adminId), partnerId: Number(me.partnerId), name: me.adminName });
        setUser(null);
        return;
      }

      const res = await fetch(apiUrl('/me'), { headers: apiHeaders(token) });
      if (!res.ok) {
        // Token expired or revoked server-side -- clear it, don't loop forever on it.
        await clearSession();
        return;
      }
      const me = (await res.json()) as AuthUser;
      setAccessToken(token);
      setUser(me);
      setPartnerAdmin(null);
    } catch {
      // Offline / backend unreachable -- keep the token and stay signed in with what we
      // have rather than force a logout; the next successful refresh will reconcile.
      setAccessToken(token);
      if (kind === 'user') setUser((prev) => prev ?? null);
    }
  }, [clearSession]);

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
      await nativeStorage.setItem(TOKEN_KIND_KEY, 'user');
      setAccessToken(body.access_token);
      setUser(body.user);
      setPartnerAdmin(null);
      return true;
    } catch {
      return false;
    }
  }, []);

  const completeLogin = useCallback(
    async (token: string, me?: AuthUser, admin?: PartnerAdminIdentity) => {
      const kind: TokenKind = admin ? 'partner_admin' : 'user';
      await nativeStorage.setItem(TOKEN_KEY, token);
      await nativeStorage.setItem(TOKEN_KIND_KEY, kind);
      setAccessToken(token);
      setUser(admin ? null : me ?? null);
      setPartnerAdmin(admin ?? null);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{ user, partnerAdmin, accessToken, loginWithTelegram, completeLogin, refreshSession, signOut }}
    >
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
