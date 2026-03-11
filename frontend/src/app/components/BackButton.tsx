import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useCanGoBack } from '@/app/hooks/useCanGoBack';

const defaultClassName = 'inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4';

export interface BackButtonProps {
  /** Optional CSS class (e.g. for margin). Default: link-style with mb-4. */
  className?: string;
  /** i18n key for the label. Default: common.back */
  labelKey?: string;
  /** When set, render a Link to this URL (always visible). When unset, use history back (only when canGoBack). */
  to?: string;
}

/**
 * Renders a "Back" control. When `to` is provided, it is a link to that URL (always visible).
 * When `to` is not provided, it is a button that navigates via history (-1) only when the user
 * has in-app history (e.g. came from another page in the same tab); otherwise nothing is rendered.
 */
export function BackButton({ className, labelKey = 'common.back', to }: BackButtonProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const canGoBack = useCanGoBack();
  const resolvedClassName = className ? `${defaultClassName} ${className}`.trim() : defaultClassName;

  if (to != null) {
    return (
      <Link to={to} className={resolvedClassName}>
        <ArrowLeft className="w-5 h-5" />
        {t(labelKey)}
      </Link>
    );
  }

  if (!canGoBack) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={resolvedClassName}
    >
      <ArrowLeft className="w-5 h-5" />
      {t(labelKey)}
    </button>
  );
}
