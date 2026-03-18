/**
 * Transaction page design tokens (aligned with ticketshub-design-system.md).
 * Use for inline styles or Tailwind arbitrary values: bg-[var(--tx-bg)] when wired in CSS.
 */
export const TX = {
  V: '#6d28d9',
  VLIGHT: '#f0ebff',
  BLUE: '#1e3a5f',
  BLIGHT: '#e4edf7',
  DARK: '#0f0f1a',
  MUTED: '#6b7280',
  HINT: '#9ca3af',
  BG: '#f3f3f0',
  CARD: '#ffffff',
  SURFACE: '#f9f9f7',
  BORDER: '#e5e7eb',
  BORD2: '#d1d5db',
  GREEN: '#15803d',
  GLIGHT: '#f0fdf4',
  GBORD: '#bbf7d0',
  AMBER: '#92400e',
  ABG: '#fffbeb',
  ABORD: '#fde68a',
  RED: '#dc2626',
  RLIGHT: '#fef2f2',
  RBORD: '#fca5a5',
} as const;

export const txFontSans = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;
export const txFontDisplay = { fontFamily: "'DM Serif Display', serif" } as const;
