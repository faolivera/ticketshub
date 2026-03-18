/**
 * wizardTokens.ts
 * TicketsHub design tokens for the sell-listing wizard.
 * Keeps wizard components visually consistent with the rest of the app.
 */

export const V      = '#6d28d9';
export const VLIGHT = '#f0ebff';
export const VBORD  = '#ddd6fe';
export const DARK   = '#0f0f1a';
export const MUTED  = '#6b7280';
export const HINT   = '#9ca3af';
export const BG     = '#f3f3f0';
export const CARD   = '#ffffff';
export const BORDER = '#e5e7eb';
export const BORD2  = '#d1d5db';
export const GREEN  = '#15803d';
export const GLIGHT = '#f0fdf4';
export const GBORD  = '#bbf7d0';
export const AMBER  = '#92400e';
export const ABG    = '#fffbeb';
export const ABORD  = '#fde68a';

/** Base font family — used in every inline style spread */
export const S = { fontFamily: "'Plus Jakarta Sans', sans-serif" } as const;

/** DM Serif heading style — drop into any heading element */
export const DS = {
  fontFamily: "'DM Serif Display', serif",
  fontWeight: 400,
  letterSpacing: '-0.3px',
} as const;

/** Section heading used inside steps (h2) */
export const stepHeadingStyle: React.CSSProperties = {
  ...DS,
  fontSize: 'clamp(20px, 2.5vw, 24px)',
  color: DARK,
  marginBottom: 4,
};

/** Muted description below step heading */
export const stepDescStyle: React.CSSProperties = {
  ...S,
  fontSize: 14,
  color: MUTED,
  lineHeight: 1.55,
  marginTop: 2,
  marginBottom: 20,
};

/** Card/panel wrapper used in the context sidebar */
export const sideCardStyle: React.CSSProperties = {
  background: CARD,
  borderRadius: 16,
  border: `1px solid ${BORDER}`,
  overflow: 'hidden',
};
