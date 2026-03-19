/**
 * Sell-listing wizard layout styles only.
 * Color and font primitives: import from @/lib/design-tokens.
 */

import type { CSSProperties } from 'react';
import { DARK, MUTED, BORDER, CARD, S, E } from '@/lib/design-tokens';

/** DM Serif heading style — drop into any heading element */
export const DS = {
  ...E,
  fontWeight: 400,
  letterSpacing: '-0.3px',
} as const;

/** Section heading used inside steps (h2) */
export const stepHeadingStyle: CSSProperties = {
  ...DS,
  fontSize: 'clamp(20px, 2.5vw, 24px)',
  color: DARK,
  marginBottom: 4,
};

/** Muted description below step heading */
export const stepDescStyle: CSSProperties = {
  ...S,
  fontSize: 14,
  color: MUTED,
  lineHeight: 1.55,
  marginTop: 2,
  marginBottom: 20,
};

/** Card/panel wrapper used in the context sidebar */
export const sideCardStyle: CSSProperties = {
  background: CARD,
  borderRadius: 16,
  border: `1px solid ${BORDER}`,
  overflow: 'hidden',
};
