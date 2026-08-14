/**
 * apiClient — centralised fetch helper for the DrivePass+ backend.
 *
 * Auth is a single Bearer token issued by our own backend after Telegram login
 * (POST /auth/telegram) -- no Supabase gateway anon-key dance needed, this isn't a
 * Supabase Edge Function anymore.
 *
 * Usage
 * ─────
 *   import { apiHeaders, apiUrl } from './apiClient';
 *
 *   const res = await fetch(apiUrl('/subscription'), {
 *     headers: apiHeaders(accessToken),
 *   });
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;

/**
 * Returns the headers object to use for all API requests.
 *
 * @param accessToken  User's access token (from AuthContext). Pass null for routes that
 *                     don't require auth.
 */
export function apiHeaders(
  accessToken: string | null,
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  return headers;
}

/** Returns the full URL for a server route, e.g. apiUrl('/subscription'). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
