import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useCanGoBack } from '@/app/hooks/useCanGoBack';

export interface BackButtonProps {
  /** Optional CSS class (e.g. for margin). Default: link-style with mb-6. */
  className?: string;
  /** i18n key for the label. Default: common.back */
  labelKey?: string;
}

/**
 * Renders a "Back" button that navigates via history (-1) only when the user
 * has in-app history (e.g. came from another page in the same tab).
 * If there is no history (direct URL, new tab), nothing is rendered.
 */
export function BackButton({ className, labelKey = 'common.back' }: BackButtonProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const canGoBack = useCanGoBack();

  if (!canGoBack) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={className ?? 'inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6'}
    >
      <ArrowLeft className="w-4 h-4" />
      {t(labelKey)}
    </button>
  );
}
