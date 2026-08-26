/**
 * Shared TypeScript types — DrivePass+
 *
 * Rule 1.3: Well-defined interfaces for cross-module communication.
 * Rule 2.3: Single source of truth for data shapes.
 */

// ── Roles & Auth ────────────────────────────────────────────────
export type Role = 'client' | 'partner';
export type Language = 'en' | 'ru' | 'uz';

export interface UserProfile {
  id: string;
  phone: string;
  name?: string;
  carPlate?: string;
  role: Role;
}

// ── Views & Navigation ─────────────────────────────────────────
export type ClientView =
  | 'dashboard'
  | 'locations'
  | 'scanner'
  | 'profile'
  | 'history'
  | 'loyalty'
  | 'frugality'
  | 'certificate'
  | 'marketplace'
  | 'booking'
  | 'loadbalancer';

export const SUB_VIEWS: ClientView[] = [
  'history', 'loyalty', 'frugality', 'certificate', 'booking', 'loadbalancer',
];

export interface BookingContext {
  locationId?: string;
  locationName?: string;
}

// ── Subscription ────────────────────────────────────────────────
export type SubscriptionTier = 'personal' | 'business';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'paused';
export type PaymentProvider = 'payme' | 'click';
export type PaymentMode = 'sandbox' | 'real';

export interface Subscription {
  id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  carPlate: string;
  expiresAt: string;
  activatedAt: string;
  washesUsed?: number;
  washesLimit?: number;
}

// ── Car Wash ────────────────────────────────────────────────────
export interface CarWashLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone: string;
  rating: number;
  reviews: number;
  hours: string;
  openNow: boolean;
  hasGreenCorridor: boolean;
  drivepassPartner: boolean;
  lat: number;
  lng: number;
  distanceKm: number;
  services: string[];
  boxesTotal: number;
  selfService: boolean;
}

// ── Wash / Anti-fraud ───────────────────────────────────────────
export interface WashEligibility {
  canWash: boolean;
  reason?: string;
  washesUsed: number;
  washesLimit: number;
  nextAvailableAt?: string;
  cooldownHours?: number;
}

export interface WashRecord {
  id: string;
  userId: string;
  locationId: string;
  locationName: string;
  washedAt: string;
  tier: SubscriptionTier;
  verified: boolean;
}

// ── Payment ─────────────────────────────────────────────────────
export interface PaymentIntent {
  paymentId: string;
  amount: number;
  currency: 'UZS';
  provider: PaymentProvider;
  status: 'pending' | 'confirmed' | 'failed';
  redirectUrl?: string;
}

// ── Loyalty ─────────────────────────────────────────────────────
export interface LoyaltyInfo {
  points: number;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  nextLevelAt: number;
  washesTotal: number;
}

// ── API Response wrapper ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: number;
}
