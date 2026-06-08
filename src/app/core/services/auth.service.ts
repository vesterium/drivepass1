/**
 * AuthService — OTP authentication logic
 *
 * Rule 4.3: Secure authentication patterns.
 * Rule 2.1: Separation from UI.
 */

import { api, Result } from './api.service';

interface OtpSendResult {
  sent: boolean;
  devCode?: string;   // Only in dev mode (no Eskiz configured)
  smsSent?: boolean;   // true when real SMS sent via Eskiz
}

interface OtpVerifyResult {
  verified: boolean;
  accessToken: string;
  refreshToken: string;
}

/** Format UZ phone: ensure +998XXXXXXXXX */
export function formatUzPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('998') && digits.length === 12) return `+${digits}`;
  if (digits.length === 9) return `+998${digits}`;
  return `+${digits}`;
}

/** Build email from phone for Supabase Auth */
export function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@drivepass.uz`;
}

/** Validate UZ phone number */
export function isValidUzPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('998');
}

export const authService = {
  /** Send OTP to phone */
  async sendOtp(phone: string): Promise<Result<OtpSendResult>> {
    const formatted = formatUzPhone(phone);
    if (!isValidUzPhone(formatted)) {
      return {
        ok: false,
        error: new (await import('../errors/AppError')).AppError(
          (await import('../errors/AppError')).ErrorCode.AUTH_INVALID_OTP,
          'Invalid phone number',
        ),
      };
    }
    return api.post<OtpSendResult>('/otp/send', { phone: formatted.replace('+', '') }, null);
  },

  /** Verify OTP code */
  async verifyOtp(phone: string, code: string): Promise<Result<OtpVerifyResult>> {
    const formatted = formatUzPhone(phone);
    return api.post<OtpVerifyResult>(
      '/otp/verify',
      { phone: formatted.replace('+', ''), code },
      null,
    );
  },
};
