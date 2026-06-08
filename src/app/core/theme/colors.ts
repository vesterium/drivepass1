/**
 * colors.ts — DrivePass+ Design Tokens
 *
 * Rule 2.3: No hardcoded values. All colors referenced from here.
 * Rule 1.3: Module with well-defined interface.
 *
 * Usage:
 *   import { colors } from '../core/theme/colors';
 *   style={{ color: colors.brand.primary }}
 */

export const colors = {
  // ── Brand palette ─────────────────────────────────────────────
  brand: {
    primary:    '#2563eb',  // Blue-600 — main CTA, nav active
    primaryLight: '#eff6ff', // Blue-50 — active pill bg
    primaryHover: '#1d4ed8', // Blue-700
    secondary:  '#6366f1',  // Indigo-500 — gradients, CEO dashboard
    accent:     '#7c3aed',  // Violet-600 — Business tier, gradients
    gradient: {
      from: '#2563eb',
      via:  '#6366f1',
      to:   '#7c3aed',
    },
  },

  // ── Semantic ──────────────────────────────────────────────────
  semantic: {
    success:  '#10b981', // Green — status OK, verified
    warning:  '#f59e0b', // Amber — warnings, pending
    error:    '#ef4444', // Red — errors, destructive
    info:     '#3b82f6', // Blue — informational
  },

  // ── iOS Partner palette ───────────────────────────────────────
  ios: {
    blue:   '#007AFF',
    green:  '#34C759',
    purple: '#5856D6',
    orange: '#FF9500',
    red:    '#FF3B30',
    gray:   '#8E8E93',
  },

  // ── Tier-specific ─────────────────────────────────────────────
  tier: {
    standard: {
      color:  '#2563eb',
      bg:     '#eff6ff',
      border: '#bfdbfe',
    },
    business: {
      color:  '#7c3aed',
      bg:     '#faf5ff',
      border: '#ddd6fe',
    },
  },

  // ── Neutral ───────────────────────────────────────────────────
  neutral: {
    white:    '#ffffff',
    bg:       '#f9fafb',  // gray-50 — page background
    card:     '#ffffff',
    border:   '#f3f4f6',  // gray-100
    divider:  '#f9f9f9',
    text: {
      primary:   '#111827', // gray-900
      secondary: '#6b7280', // gray-500
      muted:     '#9ca3af', // gray-400
      disabled:  '#d1d5db', // gray-300
    },
  },

  // ── Trust indicators ──────────────────────────────────────────
  trust: {
    verified:  '#10b981',
    payment:   '#3b82f6',
    guarantee: '#8b5cf6',
  },
} as const;

export type Colors = typeof colors;
