/**
 * AppError — Typed error classes for DrivePass+
 *
 * Rule 2.5: Custom error classes for specific scenarios.
 * Rule 2.3: Proper error handling with user-friendly messages.
 */

export enum ErrorCode {
  // Network
  NETWORK_OFFLINE = 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  API_ERROR       = 'API_ERROR',

  // Auth
  AUTH_EXPIRED     = 'AUTH_EXPIRED',
  AUTH_INVALID_OTP = 'AUTH_INVALID_OTP',
  AUTH_RATE_LIMIT  = 'AUTH_RATE_LIMIT',

  // Subscription
  SUB_NOT_FOUND    = 'SUB_NOT_FOUND',
  SUB_EXPIRED      = 'SUB_EXPIRED',
  SUB_LIMIT_REACHED = 'SUB_LIMIT_REACHED',

  // Wash
  WASH_COOLDOWN    = 'WASH_COOLDOWN',
  WASH_GEOFENCE    = 'WASH_GEOFENCE',
  WASH_LIMIT       = 'WASH_LIMIT',

  // Payment
  PAYMENT_FAILED   = 'PAYMENT_FAILED',
  PAYMENT_CANCELLED = 'PAYMENT_CANCELLED',

  // Generic
  UNKNOWN          = 'UNKNOWN',
}

const ERROR_MESSAGES: Record<ErrorCode, { ru: string; en: string; uz: string }> = {
  [ErrorCode.NETWORK_OFFLINE]:    { ru: 'Нет подключения к интернету', en: 'No internet connection', uz: 'Internet aloqasi yo\'q' },
  [ErrorCode.NETWORK_TIMEOUT]:    { ru: 'Сервер не отвечает. Попробуйте позже', en: 'Server timeout. Try again later', uz: 'Server javob bermayapti' },
  [ErrorCode.API_ERROR]:          { ru: 'Ошибка сервера', en: 'Server error', uz: 'Server xatosi' },
  [ErrorCode.AUTH_EXPIRED]:       { ru: 'Сессия истекла. Войдите заново', en: 'Session expired. Please sign in again', uz: 'Sessiya tugadi. Qayta kiring' },
  [ErrorCode.AUTH_INVALID_OTP]:   { ru: 'Неверный код. Попробуйте снова', en: 'Invalid code. Try again', uz: 'Noto\'g\'ri kod' },
  [ErrorCode.AUTH_RATE_LIMIT]:    { ru: 'Слишком много попыток. Подождите', en: 'Too many attempts. Please wait', uz: 'Juda ko\'p urinish. Kuting' },
  [ErrorCode.SUB_NOT_FOUND]:      { ru: 'Подписка не найдена', en: 'Subscription not found', uz: 'Obuna topilmadi' },
  [ErrorCode.SUB_EXPIRED]:        { ru: 'Подписка истекла', en: 'Subscription expired', uz: 'Obuna tugagan' },
  [ErrorCode.SUB_LIMIT_REACHED]:  { ru: 'Лимит моек исчерпан', en: 'Wash limit reached', uz: 'Yuvish limiti tugadi' },
  [ErrorCode.WASH_COOLDOWN]:      { ru: 'Слишком рано для следующей мойки', en: 'Too soon for next wash', uz: 'Keyingi yuvish uchun erta' },
  [ErrorCode.WASH_GEOFENCE]:      { ru: 'Вы слишком далеко от мойки', en: 'You are too far from the car wash', uz: 'Siz avtomoykadan uzoqdasiz' },
  [ErrorCode.WASH_LIMIT]:         { ru: 'Месячный лимит моек исчерпан', en: 'Monthly wash limit reached', uz: 'Oylik yuvish limiti tugadi' },
  [ErrorCode.PAYMENT_FAILED]:     { ru: 'Оплата не прошла', en: 'Payment failed', uz: 'To\'lov amalga oshmadi' },
  [ErrorCode.PAYMENT_CANCELLED]:  { ru: 'Оплата отменена', en: 'Payment cancelled', uz: 'To\'lov bekor qilindi' },
  [ErrorCode.UNKNOWN]:            { ru: 'Произошла ошибка', en: 'An error occurred', uz: 'Xatolik yuz berdi' },
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode?: number;
  readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message?: string,
    opts?: { statusCode?: number; context?: Record<string, unknown>; cause?: unknown },
  ) {
    super(message ?? ERROR_MESSAGES[code]?.en ?? code);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = opts?.statusCode;
    this.context = opts?.context;
    if (opts?.cause) this.cause = opts.cause;
  }

  /** Get localized user-facing message */
  getLocalizedMessage(lang: 'ru' | 'en' | 'uz' = 'ru'): string {
    return ERROR_MESSAGES[this.code]?.[lang] ?? this.message;
  }

  /** Create from a fetch Response */
  static async fromResponse(res: Response): Promise<AppError> {
    let body: any;
    try { body = await res.json(); } catch { body = {}; }

    if (res.status === 401) {
      return new AppError(ErrorCode.AUTH_EXPIRED, body.error, { statusCode: 401 });
    }
    if (res.status === 429) {
      return new AppError(ErrorCode.AUTH_RATE_LIMIT, body.error, { statusCode: 429 });
    }

    return new AppError(ErrorCode.API_ERROR, body.error ?? `HTTP ${res.status}`, {
      statusCode: res.status,
      context: { url: res.url, body },
    });
  }

  /** Create from unknown catch block value */
  static from(err: unknown): AppError {
    if (err instanceof AppError) return err;
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return new AppError(ErrorCode.NETWORK_OFFLINE, err.message, { cause: err });
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      return new AppError(ErrorCode.NETWORK_TIMEOUT, 'Request timed out', { cause: err });
    }
    if (err instanceof Error) {
      return new AppError(ErrorCode.UNKNOWN, err.message, { cause: err });
    }
    return new AppError(ErrorCode.UNKNOWN, String(err));
  }
}
