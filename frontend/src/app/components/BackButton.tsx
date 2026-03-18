import type { CSSProperties } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useCanGoBack } from '@/app/hooks/useCanGoBack';
import { MUTED, S } from '@/lib/design-tokens';

export interface BackButtonProps {
  /** i18n key for the label. Default: common.back */
  labelKey?: string;
  /** Renders a Link to this URL (always visible). */
  to?: string;
  /**
   * Renders a button that runs this handler (always visible).
   * Use for wizard steps or when history back must always show.
   * Takes precedence over `to` and browser history.
   */
  onAction?: () => void;
  /**
   * Omit default bottom margin (16px) — e.g. sticky header bars.
   */
  embedded?: boolean;
}

function linkStyle(embedded: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    color: MUTED,
    fontSize: 13.5,
    fontWeight: 500,
    marginBottom: embedded ? 0 : 16,
    textDecoration: 'none',
    ...S,
  };
}

function buttonStyle(embedded: boolean): CSSProperties {
  return {
    ...linkStyle(embedded),
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    width: 'fit-content',
    textAlign: 'left',
  };
}

/**
 * Unified "back" control matching the Event page design (Plus Jakarta, muted label, 15px arrow).
 * Use `to` for navigation targets, `onAction` for in-flow steps, or omit both for history.back when allowed.
 */
export function BackButton({
  labelKey = 'common.back',
  to,
  onAction,
  embedded = false,
}: BackButtonProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const canGoBack = useCanGoBack();

  const label = t(labelKey);

  if (onAction != null) {
    return (
      <button type="button" onClick={onAction} style={buttonStyle(embedded)}>
        <ArrowLeft size={15} aria-hidden />
        {label}
      </button>
    );
  }

  if (to != null) {
    return (
      <Link to={to} style={linkStyle(embedded)}>
        <ArrowLeft size={15} aria-hidden />
        {label}
      </Link>
    );
  }

  if (!canGoBack) {
    return null;
  }

  return (
    <button type="button" onClick={() => navigate(-1)} style={buttonStyle(embedded)}>
      <ArrowLeft size={15} aria-hidden />
      {label}
    </button>
  );
}
