import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ErrorMessageProps {
  /**
   * Error message to display
   */
  message: string;
  /**
   * Optional retry callback
   */
  onRetry?: () => void;
  /**
   * Optional title
   */
  title?: string;
  /**
   * Whether to take up full screen height
   */
  fullScreen?: boolean;
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Reusable error message component
 */
export function ErrorMessage({ 
  message, 
  onRetry, 
  title,
  fullScreen = false,
  className = '' 
}: ErrorMessageProps) {
  const { t } = useTranslation();

  const content = (
    <div className={`text-center ${className}`}>
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      {title && (
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      )}
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t('common.retry')}
        </button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Inline error alert for forms
 */
export function ErrorAlert({ message, className = '' }: { message: string; className?: string }) {
  return (
    <div className={`p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 ${className}`}>
      <AlertCircle className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export default ErrorMessage;
