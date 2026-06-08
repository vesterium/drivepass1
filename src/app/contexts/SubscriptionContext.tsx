/**
 * SubscriptionContext — единственный источник истины для статуса подписки.
 *
 * Гарантии:
 *  1. Все компоненты (Dashboard, Profile, Scanner) читают из одного места.
 *  2. После оформления подписки достаточно вызвать refresh() — всё приложение
 *     мгновенно переключается в «активное» состояние.
 *  3. Кэш в localStorage позволяет сразу показать последнее известное состояние
 *     пока идёт сетевой запрос (устраняет мигание «нет подписки»).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { nativeStorage } from '../core/native/storage';
import { projectId } from '../utils/supabase/info';
import { useAuth } from './AuthContext';
import { apiHeaders, apiUrl } from '../utils/apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  tier: 'personal' | 'business';
  status: 'active' | 'expired' | 'cancelled';
  carPlate: string;
  expiresAt: string;
  activatedAt: string;
}

interface SubscriptionContextValue {
  /** null = нет подписки | Subscription = есть запись */
  subscription: Subscription | null;
  /** true только если status==='active' И expiresAt в будущем */
  hasActiveSubscription: boolean;
  /** Идёт первая загрузка */
  loading: boolean;
  /** Принудительно перечитать с сервера (вызывать после оплаты) */
  refresh: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  hasActiveSubscription: false,
  loading: false,
  refresh: async () => {},
});

const CACHE_KEY = 'dp_subscription_cache';

function saveCache(sub: Subscription | null) {
  if (sub) nativeStorage.setItem(CACHE_KEY, JSON.stringify(sub)).catch(() => {});
  else nativeStorage.removeItem(CACHE_KEY).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { accessToken, user } = useAuth();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate subscription cache from native storage on mount
  useEffect(() => {
    nativeStorage.getItem(CACHE_KEY).then(raw => {
      if (raw) {
        try { setSubscription(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const API = `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setSubscription(null);
      saveCache(null);
      setLoading(false);
      return;
    }

    // AbortController — таймаут 10 сек, чтобы не висеть вечно
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(apiUrl('/subscription'), {
        headers: apiHeaders(accessToken),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const sub: Subscription | null = data.subscription ?? null;
        setSubscription(sub);
        saveCache(sub);
      } else if (res.status >= 500) {
        // Серверная ошибка — оставляем кэш, не стираем
        console.warn('Subscription: server error', res.status);
      } else if (res.status === 401 || res.status === 403) {
        // Токен невалиден — чистим
        setSubscription(null);
        saveCache(null);
      } else {
        // 404 и прочее — нет подписки
        setSubscription(null);
        saveCache(null);
      }
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === 'AbortError') {
        console.warn('Subscription fetch timed out — using cache');
      } else {
        // Сеть недоступна / CORS / Edge Function не задеплоена — оставляем кэш
        console.warn('Subscription fetch unavailable — using cached data');
      }
      // Не очищаем кэш: при следующем refresh получим свежие данные
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  // Обновляем при смене пользователя / токена
  useEffect(() => {
    if (user === undefined) return; // ещё инициализируется
    if (user === null) {
      // Разлогинились — чистим
      setSubscription(null);
      saveCache(null);
      setLoading(false);
      return;
    }
    // Only fetch when we actually have a token
    if (!accessToken) return;
    setLoading(true);
    refresh();
  }, [user, accessToken, refresh]);

  const isExpired = subscription
    ? new Date(subscription.expiresAt) < new Date()
    : false;

  const hasActiveSubscription = Boolean(
    subscription && subscription.status === 'active' && !isExpired
  );

  return (
    <SubscriptionContext.Provider
      value={{ subscription, hasActiveSubscription, loading, refresh }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSubscription() {
  return useContext(SubscriptionContext);
}
