import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { UserLevel } from '@/app/contexts/UserContext';

interface SellerBadgeProps {
  level: UserLevel;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  size?: 'sm' | 'md' | 'lg';
}

export function SellerBadge({ level, verificationStatus, size = 'md' }: SellerBadgeProps) {
  const { t } = useTranslation();

  // Level 0 - Not a seller
  if (level === 0) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Level 1 - New Seller
  if (level === 1) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-amber-100 text-amber-800 font-semibold rounded-full`}>
        <AlertCircle className={iconSizes[size]} />
        {t('badges.newSeller')}
      </span>
    );
  }

  // Level 2 - Verified Seller
  if (level === 2 && verificationStatus === 'verified') {
    return (
      <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-green-100 text-green-800 font-semibold rounded-full`}>
        <CheckCircle className={iconSizes[size]} />
        {t('badges.verifiedSeller')}
      </span>
    );
  }

  // Level 2 - Pending Verification
  if (level === 2 && verificationStatus === 'pending') {
    return (
      <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-blue-100 text-blue-800 font-semibold rounded-full`}>
        <AlertCircle className={iconSizes[size]} />
        {t('badges.verificationPending')}
      </span>
    );
  }

  return null;
}
