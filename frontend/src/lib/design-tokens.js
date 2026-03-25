/**
 * TicketsHub design system tokens.
 * Shared by home, event, checkout, and other public pages using this visual language.
 * Suffix _c1, _c2: alternate values for the same semantic role (consolidate later).
 */

// Primary violet (brand)
export const V = "#692dd4";
/** Admin CTA / alternate purple vs V */
export const V_c1 = "#7c3aed";
export const VLIGHT = "#f0ebff";
export const V_HOVER = "#5824b8";
export const VL_BORDER = "#ddd6fe";
export const V_SOFT = "#a78bfa";
export const V_MUTED_LIGHT = "#c4b5fd";

export const BLUE = "#1e3a5f";
export const BLIGHT = "#e4edf7";
export const BLUE_HOVER = "#162d4a";
export const BLUE_BORDER_LIGHT = "#bfd3ea";

export const DARK = "#262626";
export const MUTED = "#6b7280";
export const HINT = "#9ca3af";
export const BG = "#f2f2f2";
export const CARD = "#ffffff";
export const SURFACE = "#f8f8f8";
export const BORDER = "#e5e7eb";
export const BORD2 = "#d1d5db";

export const GREEN = "#15803d";
export const GLIGHT = "#f0fdf4";
export const GBORD = "#bbf7d0";
export const GREEN_LIGHT = "#86efac";

export const AMBER = "#92400e";
/** Trust “warranty” row accent (warmer than AMBER) */
export const AMBER_c1 = "#b45309";
export const ABG = "#fffbeb";
export const ABORD = "#fde68a";
export const AMBER_BG_LIGHT = "#fef3c7";
export const AMBER_TEXT_DARK = "#78350f";

export const TRUST_ESCROW = "#4f46e5";
export const TRUST_ESCROW_BG = "#eef2ff";
export const TRUST_VERIFIED = "#0f766e";
export const TRUST_VERIFIED_BG = "#f0fdfa";
/** Teal accent border for verified trust chips */
export const TRUST_VERIFIED_BORDER = "#99f6e4";

export const ERROR = "#b91c1c";
export const ERROR_DARK = "#991b1b";
export const DESTRUCTIVE = "#dc2626";
export const ERROR_BG = "#fef2f2";
export const BADGE_DEMAND_BG = "#fee2e2";
export const BADGE_DEMAND_BORDER = "#fca5a5";

export const WARN_SOLID = "#f59e0b";

// Neutral gray — expired-offer "no-response" state, secondary surfaces
// Accent orange (non-semantic, use for highlights/badges only — never replace PENDING/URGENT)
export const ACCENT_ORANGE       = "#ff8710";
export const ACCENT_ORANGE_LIGHT = "#fff3e6";
export const ACCENT_ORANGE_HOVER = "#e6780e";

export const GRAY_BG = "#f5f4ef";
export const GRAY_BORDER = "#d5d3ca";
export const GRAY_TEXT = "#5c5c58";

export const WHITE = "#ffffff";

// Overlays & sticky surfaces
export const BG_STICKY_HEADER = "rgba(242,242,242,0.97)";
export const SURFACE_STICKY = "rgba(248,248,248,0.97)";
export const OVERLAY_DARK_45 = "rgba(0,0,0,0.45)";
export const OVERLAY_DARK_55 = "rgba(0,0,0,0.55)";
export const OVERLAY_V_STRONG = "rgba(105,45,212,0.82)";
export const OVERLAY_V_70 = "rgba(105,45,212,0.7)";
export const GRADIENT_CARD_TOP = "linear-gradient(to top, rgba(38,38,38,0.55) 0%, transparent 52%)";
export const GRADIENT_HERO_OVERLAY =
  "linear-gradient(105deg, rgba(38,38,38,0.88) 0%, rgba(38,38,38,0.72) 40%, rgba(38,38,38,0.25) 75%, rgba(38,38,38,0.1) 100%)";

export const FOOTER_MUTED = "rgba(255,255,255,0.5)";
export const FOOTER_LINK = "rgba(255,255,255,0.7)";
export const FOOTER_BORDER_TOP = "rgba(255,255,255,0.1)";
export const FOOTER_CAPTION = "rgba(255,255,255,0.35)";

// Shadows
export const SHADOW_DROP = "0 8px 24px rgba(0,0,0,0.1)";
export const SHADOW_DROP_LG = "0 8px 28px rgba(0,0,0,0.12)";
export const SHADOW_CARD = "0 2px 12px rgba(0,0,0,0.06)";
export const SHADOW_CARD_SM = "0 1px 4px rgba(0,0,0,0.05)";
export const SHADOW_CARD_MD = "0 2px 10px rgba(0,0,0,0.05)";
export const SHADOW_HERO = "0 2px 20px rgba(0,0,0,0.14)";
export const SHADOW_CARD_HOVER =
  "0 10px 28px rgba(105,45,212,0.12), 0 2px 6px rgba(0,0,0,0.06)";
export const SHADOW_TICKET_HOVER = "0 8px 24px rgba(105,45,212,0.11)";
export const SHADOW_V_SOFT = "0 4px 18px rgba(105,45,212,0.28)";
export const SHADOW_V_STRONG = "0 4px 20px rgba(105,45,212,0.5)";
export const SHADOW_HERO_CTA = "0 4px 18px rgba(105,45,212,0.4)";
export const SHADOW_LANG_PILL = "0 1px 3px rgba(105,45,212,0.35)";
export const V_FOCUS_RING = "0 0 0 3px rgba(105,45,212,0.1)";

// Semantic state tokens (design system v2)
// These are the ONLY allowed green / amber / pink values in the app.
export const SUCCESS = "#16a34a";
export const SUCCESS_LIGHT = "#dcfce7";
export const SUCCESS_BORDER = "#bbf7d0";

export const PENDING = "#d97706";
export const PENDING_LIGHT = "#fef3c7";
export const PENDING_BORDER = "#fde68a";

export const URGENT = "#be185d";
export const URGENT_LIGHT = "#fce7f3";
export const URGENT_BORDER = "#fbcfe8";

export const INFO = "#2563eb";
export const INFO_LIGHT = "#eff6ff";
export const INFO_BORDER = "#bfdbfe";

export const S = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
export const E = { fontFamily: "'DM Serif Display', serif" };

// Border radius tokens
export const R_HERO   = 20;
export const R_CARD   = 14;
export const R_BUTTON = 12;
export const R_INPUT  = 12;
export const R_PILL   = 9999;
