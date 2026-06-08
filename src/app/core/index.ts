/**
 * Core barrel export — DrivePass+
 *
 * Rule 1.3: Module with well-defined public interface.
 *
 * Usage:
 *   import { colors, api, AppError, ErrorCode } from './core';
 *   import type { Subscription, ClientView } from './core';
 */

// Theme
export { colors, spacing, shadows, animation } from './theme';

// Types
export type {
  Role, Language, UserProfile, ClientView, BookingContext,
  SubscriptionTier, SubscriptionStatus, PaymentProvider, PaymentMode,
  Subscription, CarWashLocation, WashEligibility, WashRecord,
  PaymentIntent, LoyaltyInfo, ApiResponse,
} from './types';
export { SUB_VIEWS } from './types';

// Services
export { api, washService, subscriptionService, authService } from './services';
export { formatUzPhone, phoneToEmail, isValidUzPhone } from './services';
export type { Result } from './services';

// Errors
export { AppError, ErrorCode, ErrorBoundary } from './errors';

// Hooks
export { useNetworkStatus, useLocalStorage, useDebounce } from './hooks';

// Utils
export {
  validatePhone, validateCarPlate, formatCarPlate,
  formatPhoneDisplay, validateOtp, formatPriceUzs,
} from './utils';
