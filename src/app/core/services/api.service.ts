/**
 * ApiService — Typed, resilient API layer for DrivePass+
 *
 * Rule 2.2: Centralized networking with proper error handling.
 * Rule 4.5: HTTPS, auth headers, response validation.
 * Rule 2.5: Every call returns Result<T> — never throws uncaught.
 *
 * Usage:
 *   import { api } from '../core/services/api.service';
 *   const result = await api.get<Subscription>('/subscription', token);
 *   if (result.ok) console.log(result.data);
 *   else toast.error(result.error.getLocalizedMessage('ru'));
 */

import { apiHeaders, apiUrl } from '../../utils/apiClient';
import { AppError, ErrorCode } from '../errors/AppError';

// ── Result type (no uncaught throws) ────────────────────────────
export type Result<T> =
  | { ok: true;  data: T }
  | { ok: false; error: AppError };

// ── Timeout config ──────────────────────────────────────────────
const DEFAULT_TIMEOUT_MS = 5_000;

// ── Helper: fetch with timeout ──────────────────────────────────
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── API Service ─────────────────────────────────────────────────
export const api = {
  async get<T = unknown>(path: string, accessToken: string | null, timeoutMs?: number): Promise<Result<T>> {
    try {
      const res = await fetchWithTimeout(
        apiUrl(path),
        { method: 'GET', headers: apiHeaders(accessToken) },
        timeoutMs,
      );
      if (!res.ok) return { ok: false, error: await AppError.fromResponse(res) };
      const data = await res.json();
      return { ok: true, data: data as T };
    } catch (err) {
      return { ok: false, error: AppError.from(err) };
    }
  },

  async post<T = unknown>(
    path: string,
    body: Record<string, unknown>,
    accessToken: string | null,
    timeoutMs?: number,
  ): Promise<Result<T>> {
    try {
      const res = await fetchWithTimeout(
        apiUrl(path),
        {
          method: 'POST',
          headers: apiHeaders(accessToken),
          body: JSON.stringify(body),
        },
        timeoutMs,
      );
      if (!res.ok) return { ok: false, error: await AppError.fromResponse(res) };
      const data = await res.json();
      return { ok: true, data: data as T };
    } catch (err) {
      return { ok: false, error: AppError.from(err) };
    }
  },

  async put<T = unknown>(
    path: string,
    body: Record<string, unknown>,
    accessToken: string | null,
    timeoutMs?: number,
  ): Promise<Result<T>> {
    try {
      const res = await fetchWithTimeout(
        apiUrl(path),
        {
          method: 'PUT',
          headers: apiHeaders(accessToken),
          body: JSON.stringify(body),
        },
        timeoutMs,
      );
      if (!res.ok) return { ok: false, error: await AppError.fromResponse(res) };
      const data = await res.json();
      return { ok: true, data: data as T };
    } catch (err) {
      return { ok: false, error: AppError.from(err) };
    }
  },

  async delete<T = unknown>(path: string, accessToken: string | null, timeoutMs?: number): Promise<Result<T>> {
    try {
      const res = await fetchWithTimeout(
        apiUrl(path),
        { method: 'DELETE', headers: apiHeaders(accessToken) },
        timeoutMs,
      );
      if (!res.ok) return { ok: false, error: await AppError.fromResponse(res) };
      const data = await res.json();
      return { ok: true, data: data as T };
    } catch (err) {
      return { ok: false, error: AppError.from(err) };
    }
  },
};
