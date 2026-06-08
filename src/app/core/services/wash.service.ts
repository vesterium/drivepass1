/**
 * WashService — Business logic for wash operations
 *
 * Rule 2.1: Separation of business logic from UI (BLoC equivalent).
 * Rule 1.4: Single Responsibility — only wash-related operations.
 */

import { api, Result } from './api.service';
import type { WashEligibility, WashRecord } from '../types';

export const washService = {
  /** Check if user can wash now */
  async checkEligibility(accessToken: string): Promise<Result<WashEligibility>> {
    return api.get<WashEligibility>('/cooldown', accessToken);
  },

  /** Record a wash (after QR scan) */
  async recordWash(
    accessToken: string,
    locationId: string,
    qrPayload: string,
  ): Promise<Result<WashRecord>> {
    return api.post<WashRecord>('/wash/record', { locationId, qrPayload }, accessToken);
  },

  /** Get wash history */
  async getHistory(accessToken: string): Promise<Result<WashRecord[]>> {
    return api.get<WashRecord[]>('/wash/history', accessToken);
  },
};
