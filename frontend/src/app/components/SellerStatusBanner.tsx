import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { SellerTier, VerificationHelper } from '@/lib/verification';

export function SellerStatusBanner() {
  const { t } = useTranslation();
  const { user } = useUser();

  const tier = VerificationHelper.sellerTier(user);
  const verificationStatus =
    user?.identityVerified === true
      ? 'verified'
      : user?.identityVerified === false
        ? 'pending'
        : undefined;

  if (!user || tier === undefined) return null;

  // UNVERIFIED_SELLER - can sell but missing V3 and/or V4
  if (tier === SellerTier.UNVERIFIED_SELLER) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 mb-1">
              {t('sellerStatus.level1Title')}
            </p>
            <p className="text-sm text-amber-800 mb-3">
              {t('sellerStatus.level1Message')}
            </p>
            <Link
              to="/seller-verification"
              className="inline-block px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors text-sm"
            >
              {t('sellerStatus.verifyIdentity')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // VERIFIED_SELLER - Verification Pending (V3 submitted, not yet approved)
  if (tier === SellerTier.VERIFIED_SELLER && verificationStatus === 'pending') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900 mb-1">
              {t('sellerStatus.pendingTitle')}
            </p>
            <p className="text-sm text-blue-800">
              {t('sellerStatus.pendingMessage')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // VERIFIED_SELLER - Verified (V3 + V4)
  if (tier === SellerTier.VERIFIED_SELLER && verificationStatus === 'verified') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-green-900 mb-1">
              {t('sellerStatus.verifiedTitle')}
            </p>
            <p className="text-sm text-green-800">
              {t('sellerStatus.verifiedMessage')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
