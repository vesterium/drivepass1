/**
 * AuthContext — единственный источник истины для сессии Supabase.
 *
 * Гарантии:
 *  1. onAuthStateChange ВСЕГДА синхронизирует состояние с реальной сессией.
 *  2. После signInWithPassword — принудительный getSession() как страховка.
 *  3. session / user доступны любому компоненту без prop-drilling.
 *  4. Переход Auth → App происходит исключительно через изменение `user`:
 *       undefined → ещё инициализируется  (спиннер)
 *       null      → не авторизован        (показываем Auth)
 *       User obj  → авторизован           (показываем App)
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** undefined = loading | null = not signed in | User = signed in */
  user: User | null | undefined;
  session: Session | null;
  accessToken: string | null;
  /** Принудительно обновляет сессию из Supabase (резервный триггер) */
  refreshSession: () => Promise<void>;
  /** Выход из системы */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  session: null,
  accessToken: null,
  refreshSession: async () => {},
  signOut: async () => {},
});

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null | undefined>(undefined);
  const [session, setSession]         = useState<Session | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  /** Применяет сессию (или null) к локальному стейту */
  const applySession = useCallback((s: Session | null) => {
    console.log('[Auth] applySession →', s ? `user=${s.user.id}` : 'null');
    setSession(s);
    setUser(s?.user ?? null);
    setAccessToken(s?.access_token ?? null);
  }, []);

  /** Явно запрашивает текущую сессию у Supabase — страховочный механизм */
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        // Сетевая ошибка при обновлении токена — не критично, оставляем текущее состояние
        if (!error.message.includes('Failed to fetch') && !error.message.includes('NetworkError')) {
          console.warn('[Auth] refreshSession error:', error.message);
        }
        return;
      }
      applySession(data.session);
    } catch {
      // Офлайн или Edge Runtime недоступен — тихо игнорируем
    }
  }, [applySession]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Офлайн — принудительно очищаем локальный стейт
      applySession(null);
    }
    // onAuthStateChange → SIGNED_OUT → applySession(null) автоматически
  }, [applySession]);

  useEffect(() => {
    let { data: { subscription } } = { data: { subscription: { unsubscribe: () => {} } } };
    try {
      const result = supabase.auth.onAuthStateChange(
        (_event, incomingSession) => {
          applySession(incomingSession);
        }
      );
      subscription = result.data.subscription;
    } catch {
      // Supabase недоступен — устанавливаем null и снимаем спиннер
      applySession(null);
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [applySession]);

  return (
    <AuthContext.Provider value={{ user, session, accessToken, refreshSession, signOut }}>
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
