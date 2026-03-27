import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DARK, MUTED, V, S, R_BUTTON } from '@/lib/design-tokens';

interface EmptyStateProps {
  /**
   * Icon to display
   */
  icon: LucideIcon;
  /**
   * Title text
   */
  title: string;
  /**
   * Description text
   */
  description?: string;
  /**
   * Optional action button
   */
  action?: {
    label: string;
    to?: string;
    onClick?: () => void;
  };
  /**
   * Custom class name
   */
  className?: string;
}

/**
 * Reusable empty state component
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={className} style={{ textAlign: 'center', padding: '48px 24px' }}>
      <Icon style={{ width: 40, height: 40, color: MUTED, margin: '0 auto 16px', display: 'block', opacity: 0.5 }} />
      <h3 style={{ ...S, fontSize: 16, fontWeight: 700, color: DARK, margin: '0 0 6px' }}>{title}</h3>
      {description && (
        <p style={{ ...S, fontSize: 14, color: MUTED, margin: '0 auto', maxWidth: 340, lineHeight: 1.55 }}>{description}</p>
      )}
      {action && (
        <div style={{ marginTop: 20 }}>
          {action.to ? (
            <Link
              to={action.to}
              style={{ ...S, display: 'inline-block', padding: '9px 20px', borderRadius: R_BUTTON, background: V, color: 'white', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}
            >
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              style={{ ...S, padding: '9px 20px', borderRadius: R_BUTTON, background: V, color: 'white', fontSize: 13.5, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
