import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';

export function SellerStatusBanner() {
  const { t } = useTranslation();
  const { user } = useUser();

  if (!user || user.level === 0) return null;

  // Level 1 - Limited Seller
  if (user.level === 1) {
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

  // Level 2 - Verification Pending
  if (user.level === 2 && user.verificationStatus === 'pending') {
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

  // Level 2 - Verified
  if (user.level === 2 && user.verificationStatus === 'verified') {
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
