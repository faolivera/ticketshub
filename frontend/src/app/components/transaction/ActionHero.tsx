import type { ReactNode } from 'react';
import {
  BLUE,
  BLIGHT,
  DARK,
  MUTED,
  ABORD,
  ABG,
  AMBER,
  GBORD,
  GLIGHT,
  GREEN,
  V,
  VLIGHT,
  BORDER,
  SURFACE,
  BADGE_DEMAND_BORDER,
  BADGE_DEMAND_BG,
  DESTRUCTIVE,
  CARD,
  S,
} from '@/lib/design-tokens';
import type { ActionHeroProps, ActionHeroVariant } from './types';

const variantStyles: Record<
  ActionHeroVariant,
  { border: string; bg: string; iconColor: string; titleColor: string; subColor: string }
> = {
  blue: {
    border: BLUE,
    bg: BLIGHT,
    iconColor: BLUE,
    titleColor: DARK,
    subColor: MUTED,
  },
  amber: {
    border: ABORD,
    bg: ABG,
    iconColor: AMBER,
    titleColor: AMBER,
    subColor: MUTED,
  },
  green: {
    border: GBORD,
    bg: GLIGHT,
    iconColor: GREEN,
    titleColor: GREEN,
    subColor: MUTED,
  },
  violet: {
    border: V,
    bg: VLIGHT,
    iconColor: V,
    titleColor: DARK,
    subColor: MUTED,
  },
  muted: {
    border: BORDER,
    bg: SURFACE,
    iconColor: MUTED,
    titleColor: DARK,
    subColor: MUTED,
  },
  red: {
    border: BADGE_DEMAND_BORDER,
    bg: BADGE_DEMAND_BG,
    iconColor: DESTRUCTIVE,
    titleColor: DESTRUCTIVE,
    subColor: MUTED,
  },
};

export function ActionHero({
  variant,
  icon,
  title,
  subtitle,
  badge,
  children,
}: ActionHeroProps) {
  const s = variantStyles[variant];
  return (
    <div
      className="rounded-card border p-5 sm:p-6"
      style={{
        ...S,
        background: s.bg,
        borderColor: s.border,
        borderWidth: 1.5,
      }}
    >
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: CARD, color: s.iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          {badge && (
            <span
              className="mb-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ background: CARD, color: s.iconColor }}
            >
              {badge}
            </span>
          )}
          <h3
            className="text-base leading-tight"
            style={{ ...S, fontWeight: 700, color: s.titleColor }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: s.subColor }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
