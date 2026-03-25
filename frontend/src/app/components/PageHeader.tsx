/**
 * PageHeader
 *
 * Unified page-level header for all TicketsHub pages.
 * Always sits OUTSIDE any card — it's a page element, not content.
 *
 * Props:
 *   title      — required, always DM Serif Display
 *   subtitle   — optional, muted line below the title
 *   action     — optional CTA button: { label, to?, onClick?, icon? }
 *   backTo     — optional back link: { href, label }
 *
 * Layout:
 *   [back link]               ← only if backTo
 *   [title]   [action button] ← action inline on desktop
 *   [subtitle]                ← below, if present
 *
 * Mobile: action wraps to its own row below title+subtitle if text is long,
 *         but stays inline when label fits (≤20 chars).
 */

import { Link } from 'react-router-dom';
import { BackButton } from '@/app/components/BackButton';
import { V, VLIGHT, DARK, MUTED, S, E, R_BUTTON } from '@/lib/design-tokens';

const DS = { ...E, fontWeight: 400 } as const;

interface PageHeaderAction {
  label: string;
  icon?: React.ReactNode;
  to?: string;          // renders as <Link>
  onClick?: () => void; // renders as <button>
}

interface PageHeaderBack {
  /** i18n key for the label — passed to BackButton's labelKey */
  labelKey?: string;
  /** Link destination — passed to BackButton's to */
  to?: string;
  /** Custom handler — passed to BackButton's onAction */
  onAction?: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: PageHeaderAction;
  backTo?: PageHeaderBack;
  /** Extra bottom margin override. Default: 20px */
  mb?: number;
}

export function PageHeader({ title, subtitle, action, backTo, mb = 20 }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: mb }}>

      {/* Back link */}
      {backTo && (
        <BackButton
          labelKey={backTo.labelKey}
          to={backTo.to}
          onAction={backTo.onAction}
        />
      )}

      {/* Title row */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            ...DS,
            fontSize: 'clamp(22px, 3vw, 28px)',
            color: DARK,
            letterSpacing: '-0.4px',
            lineHeight: 1.15,
            marginBottom: subtitle ? 5 : 0,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              fontSize: 14,
              color: MUTED,
              lineHeight: 1.5,
              ...S,
            }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Action */}
        {action && (
          action.to ? (
            <Link to={action.to} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <ActionButton action={action} />
            </Link>
          ) : (
            <div style={{ flexShrink: 0 }}>
              <ActionButton action={action} onClick={action.onClick} />
            </div>
          )
        )}
      </div>

    </div>
  );
}

function ActionButton({ action, onClick }: { action: PageHeaderAction; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '9px 18px',
        borderRadius: R_BUTTON,
        background: V,
        color: 'white',
        border: 'none',
        fontSize: 13.5,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: '0 2px 10px rgba(105,45,212,0.2)',
        transition: 'background 0.14s',
        minHeight: 40,
        ...S,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#5824b8')}
      onMouseLeave={e => (e.currentTarget.style.background = V)}
    >
      {action.icon}
      {action.label}
    </button>
  );
}
