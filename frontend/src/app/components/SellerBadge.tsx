import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { SellerTier, VerificationHelper } from '@/lib/verification';
import type { User } from '@/api/types/users';
import { SUCCESS, SUCCESS_LIGHT, SUCCESS_BORDER, PENDING, PENDING_LIGHT, PENDING_BORDER, BLIGHT, BLUE, BLUE_BORDER_LIGHT, S } from '@/lib/design-tokens';

interface SellerBadgeProps {
  /** User to derive seller tier and verification status from (V-flags) */
  user: User | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

export function SellerBadge({ user, size = 'md' }: SellerBadgeProps) {
  const { t } = useTranslation();

  const tier = VerificationHelper.sellerTier(user);
  const verificationStatus =
    user?.identityVerified === true
      ? 'verified'
      : user?.identityVerified === false
        ? 'pending'
        : undefined;

  if (tier === undefined) {
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

  // UNVERIFIED_SELLER - can sell but missing V3 and/or V4
  if (tier === SellerTier.UNVERIFIED_SELLER) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} font-semibold rounded-full`}
        style={{ ...S, background: PENDING_LIGHT, color: PENDING, border: `1px solid ${PENDING_BORDER}` }}
      >
        <AlertCircle className={iconSizes[size]} />
        {t('badges.newSeller')}
      </span>
    );
  }

  // VERIFIED_SELLER (V3 + V4)
  if (tier === SellerTier.VERIFIED_SELLER && verificationStatus === 'verified') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} font-semibold rounded-full`}
        style={{ ...S, background: SUCCESS_LIGHT, color: SUCCESS, border: `1px solid ${SUCCESS_BORDER}` }}
      >
        <CheckCircle className={iconSizes[size]} />
        {t('badges.verifiedSeller')}
      </span>
    );
  }

  if (tier === SellerTier.VERIFIED_SELLER && verificationStatus === 'pending') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} font-semibold rounded-full`}
        style={{ ...S, background: BLIGHT, color: BLUE, border: `1px solid ${BLUE_BORDER_LIGHT}` }}
      >
        <AlertCircle className={iconSizes[size]} />
        {t('badges.verificationPending')}
      </span>
    );
  }

  return null;
}
