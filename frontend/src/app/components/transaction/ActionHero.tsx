import type { ReactNode } from 'react';
import { TX, txFontDisplay, txFontSans } from './tokens';
import type { ActionHeroProps, ActionHeroVariant } from './types';

const variantStyles: Record<
  ActionHeroVariant,
  { border: string; bg: string; iconColor: string; titleColor: string; subColor: string }
> = {
  blue: {
    border: TX.BLUE,
    bg: TX.BLIGHT,
    iconColor: TX.BLUE,
    titleColor: TX.DARK,
    subColor: TX.MUTED,
  },
  amber: {
    border: TX.ABORD,
    bg: TX.ABG,
    iconColor: TX.AMBER,
    titleColor: TX.AMBER,
    subColor: TX.MUTED,
  },
  green: {
    border: TX.GBORD,
    bg: TX.GLIGHT,
    iconColor: TX.GREEN,
    titleColor: TX.GREEN,
    subColor: TX.MUTED,
  },
  violet: {
    border: TX.V,
    bg: TX.VLIGHT,
    iconColor: TX.V,
    titleColor: TX.DARK,
    subColor: TX.MUTED,
  },
  muted: {
    border: TX.BORDER,
    bg: TX.SURFACE,
    iconColor: TX.MUTED,
    titleColor: TX.DARK,
    subColor: TX.MUTED,
  },
  red: {
    border: TX.RBORD,
    bg: TX.RLIGHT,
    iconColor: TX.RED,
    titleColor: TX.RED,
    subColor: TX.MUTED,
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
      className="rounded-[14px] border p-5 sm:p-6"
      style={{
        ...txFontSans,
        background: s.bg,
        borderColor: s.border,
        borderWidth: 1.5,
      }}
    >
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: TX.CARD, color: s.iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          {badge && (
            <span
              className="mb-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
              style={{ background: TX.CARD, color: s.iconColor }}
            >
              {badge}
            </span>
          )}
          <h3
            className="text-lg font-normal leading-tight sm:text-xl"
            style={{ ...txFontDisplay, color: s.titleColor }}
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
