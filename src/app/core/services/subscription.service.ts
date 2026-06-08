/**
 * SubscriptionService — Business logic for subscriptions
 *
 * Rule 2.1: Separated business logic layer.
 * Rule 1.4: Single Responsibility.
 */

import { api, Result } from './api.service';
import type { Subscription, SubscriptionTier, PaymentProvider, PaymentIntent } from '../types';

export const subscriptionService = {
  /** Get current subscription */
  async getCurrent(accessToken: string): Promise<Result<Subscription | null>> {
    return api.get<Subscription | null>('/subscription', accessToken);
  },

  /** Initiate payment for subscription */
  async initiatePayment(
    accessToken: string,
    tier: SubscriptionTier,
    carPlate: string,
    provider: PaymentProvider,
  ): Promise<Result<PaymentIntent>> {
    return api.post<PaymentIntent>(
      '/payment/initiate',
      { tier, carPlate, provider },
      accessToken,
    );
  },

  /** Confirm sandbox payment */
  async confirmPayment(accessToken: string, paymentId: string): Promise<Result<Subscription>> {
    return api.post<Subscription>('/payment/confirm', { paymentId }, accessToken);
  },

  /** Change subscription tier */
  async changeTier(accessToken: string, newTier: SubscriptionTier): Promise<Result<Subscription>> {
    return api.post<Subscription>('/subscription/change-tier', { tier: newTier }, accessToken);
  },

  /** Update car plate */
  async updatePlate(accessToken: string, carPlate: string): Promise<Result<Subscription>> {
    return api.post<Subscription>('/subscription/update-plate', { carPlate }, accessToken);
  },

  /** Pause subscription */
  async pause(accessToken: string, days: number): Promise<Result<Subscription>> {
    return api.post<Subscription>('/subscription/pause', { days }, accessToken);
  },

  /** Cancel subscription */
  async cancel(accessToken: string): Promise<Result<{ cancelled: boolean }>> {
    return api.post<{ cancelled: boolean }>('/subscription/cancel', {}, accessToken);
  },
};
