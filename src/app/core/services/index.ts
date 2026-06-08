/**
 * Services barrel export — DrivePass+
 *
 * Usage:
 *   import { api, washService, subscriptionService, authService } from '../core/services';
 */

export { api } from './api.service';
export type { Result } from './api.service';
export { washService } from './wash.service';
export { subscriptionService } from './subscription.service';
export { authService, formatUzPhone, phoneToEmail, isValidUzPhone } from './auth.service';
