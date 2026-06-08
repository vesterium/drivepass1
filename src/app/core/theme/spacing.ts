/**
 * spacing.ts — DrivePass+ Layout Tokens
 *
 * Rule 2.3: No hardcoded sizes. Centralized spacing/sizing system.
 */

export const spacing = {
  /** Bottom nav height */
  navHeight: 68,
  /** Bottom nav total with padding */
  navPadding: 72,
  /** Max content width (mobile-first) */
  maxWidth: 'max-w-md',
  /** Card border radius */
  cardRadius: 16,   // rounded-2xl
  /** Button min touch target (Apple HIG) */
  touchTarget: 44,
  /** Icon sizes */
  icon: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
  },
  /** Avatar sizes */
  avatar: {
    sm: 32,
    md: 40,
    lg: 56,
  },
} as const;

export const shadows = {
  /** Minimal card shadow — Apple-style */
  card: '0 1px 4px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.04)',
  /** Elevated card */
  elevated: '0 1px 8px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.05)',
  /** Soft medium shadow */
  medium: '0 1px 3px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.04)',
  /** Nav bar shadow (handled via CSS class nav-glass) */
  nav: 'none',
} as const;

export const animation = {
  /** Page transition duration */
  pageDuration: 0.36,
  /** Page transition easing (Apple-style) */
  pageEase: [0.22, 1, 0.36, 1] as [number, number, number, number],
  /** Spring config for buttons */
  buttonSpring: { type: 'spring' as const, stiffness: 420, damping: 26 },
  /** Spring config for nav pills */
  navSpring: { type: 'spring' as const, stiffness: 380, damping: 30 },
} as const;
