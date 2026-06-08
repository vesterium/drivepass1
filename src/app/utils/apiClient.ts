/**
 * apiClient — centralised fetch helper for DrivePass+ Edge Function calls.
 *
 * Why two headers?
 * ─────────────────
 * The Supabase Edge Function **gateway** validates the `Authorization` header
 * and rejects user JWTs in many project configurations, returning:
 *   {"code": 401, "message": "Invalid JWT"}
 *
 * The only value guaranteed to pass the gateway is the project `publicAnonKey`.
 * Our own server-side `verifyUser()` reads the real user JWT from the
 * `X-User-Token` header instead, so auth is still enforced — just not by
 * the gateway layer.
 *
 * Usage
 * ─────
 *   import { apiHeaders, apiUrl } from './apiClient';
 *
 *   const res = await fetch(apiUrl('/subscription'), {
 *     headers: apiHeaders(accessToken),
 *   });
 */

import { publicAnonKey, projectId } from './supabase/info';

const API_BASE =
  `https://${projectId}.supabase.co/functions/v1/make-server-80c25f01`;

/**
 * Returns the headers object to use for all API requests.
 *
 * @param accessToken  User's Supabase JWT (from AuthContext). May be null for
 *                     routes that don't require auth (gateway still needs anon
 *                     key in that case).
 */
export function apiHeaders(
  accessToken: string | null,
  extra: Record<string, string> = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    // Gateway auth: publicAnonKey always passes Supabase's own JWT check
    'Authorization': `Bearer ${publicAnonKey}`,
    ...extra,
  };
  // Server auth: our verifyUser() reads this header to identify the real user
  if (accessToken) {
    headers['X-User-Token'] = accessToken;
  }
  return headers;
}

/** Returns the full URL for a server route, e.g. apiUrl('/subscription'). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${p}`;
}
