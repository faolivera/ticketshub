import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { VerificationHelper } from '@/lib/verification';
import type { User } from '@/api/types/users';

interface SellerBadgeProps {
  /** User to derive seller tier and verification status from (V-flags) */
  user: User | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

export function SellerBadge({ user, size = 'md' }: SellerBadgeProps) {
  const { t } = useTranslation();

  const tier = VerificationHelper.sellerTier(user);
  const verificationStatus =
    user?.identityVerification?.status === 'approved'
      ? 'verified'
      : user?.identityVerification?.status === 'pending'
        ? 'pending'
        : undefined;

  if (tier === 0) {
    return null;
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  // Tier 1 - New Seller (no V3 or V4)
  if (tier === 1) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-amber-100 text-amber-800 font-semibold rounded-full`}
      >
        <AlertCircle className={iconSizes[size]} />
        {t('badges.newSeller')}
      </span>
    );
  }

  // Tier 2 - Verified Seller (V3 + V4)
  if (tier === 2 && verificationStatus === 'verified') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-green-100 text-green-800 font-semibold rounded-full`}
      >
        <CheckCircle className={iconSizes[size]} />
        {t('badges.verifiedSeller')}
      </span>
    );
  }

  if (tier === 2 && verificationStatus === 'pending') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} bg-blue-100 text-blue-800 font-semibold rounded-full`}
      >
        <AlertCircle className={iconSizes[size]} />
        {t('badges.verificationPending')}
      </span>
    );
  }

  return null;
}
