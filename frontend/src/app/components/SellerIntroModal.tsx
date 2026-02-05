import { useTranslation } from 'react-i18next';
import { X, Shield, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface SellerIntroModalProps {
  onClose: () => void;
}

export function SellerIntroModal({ onClose }: SellerIntroModalProps) {
  const { t } = useTranslation();
  const { upgradeToLevel1 } = useUser();
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleStartSelling = () => {
    if (!termsAccepted) {
      alert(t('sellerIntro.pleaseAcceptTerms'));
      return;
    }
    upgradeToLevel1();
    onClose();
    navigate('/sell-ticket');
  };

  if (showTerms) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('sellerIntro.sellerTerms')}
              </h2>
              <button
                onClick={() => setShowTerms(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="prose max-w-none mb-6">
              <p className="text-gray-700 mb-4">{t('sellerIntro.termsContent')}</p>
            </div>

            <button
              onClick={() => setShowTerms(false)}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('sellerIntro.close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('sellerIntro.sellerLevels')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-gray-600 mb-8">
            {t('sellerIntro.sellerLevelsDescription')}
          </p>

          {/* Level Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Level 1 - New Seller */}
            <div className="border-2 border-yellow-300 rounded-lg p-6 bg-yellow-50">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-yellow-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  {t('sellerIntro.level1Title')}
                </h3>
              </div>
              
              <p className="text-sm text-gray-700 mb-4 font-semibold">
                {t('sellerIntro.level1Label')}
              </p>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t('sellerIntro.capabilities')}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level1CanList')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level1CanAcceptSales')}</span>
                  </li>
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t('sellerIntro.payments')}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level1PaymentEscrow')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level1PaymentLocked')}</span>
                  </li>
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t('sellerIntro.limits')}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level1LimitListings')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level1LimitValue')}</span>
                  </li>
                </ul>
              </div>

              <div className="mt-4 bg-yellow-100 border border-yellow-300 rounded p-3">
                <p className="text-xs text-yellow-900 font-semibold">
                  {t('sellerIntro.level1Note')}
                </p>
              </div>
            </div>

            {/* Level 2 - Verified Seller */}
            <div className="border-2 border-green-300 rounded-lg p-6 bg-green-50 relative">
              <div className="absolute top-4 right-4">
                <Lock className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  {t('sellerIntro.level2Title')}
                </h3>
              </div>

              <p className="text-sm text-gray-700 mb-4 font-semibold">
                {t('sellerIntro.level2Label')}
              </p>
              
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t('sellerIntro.capabilities')}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level2CanList')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level2CanAcceptSales')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level2CanWithdraw')}</span>
                  </li>
                </ul>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t('sellerIntro.payments')}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level2PaymentReleased')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level2PaymentWithdraw')}</span>
                  </li>
                </ul>
              </div>

              <div className="border-t border-green-300 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t('sellerIntro.requirements')}
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level2ReqGovId')}</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{t('sellerIntro.level2ReqBank')}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Important Callout */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-gray-900 mb-2">
                  {t('sellerIntro.importantTitle')}
                </p>
                <p className="text-gray-700">
                  {t('sellerIntro.importantMessage')}
                </p>
              </div>
            </div>
          </div>

          {/* Seller Terms Checkbox */}
          <div className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {t('sellerIntro.agreeToTerms')}{' '}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-blue-600 hover:text-blue-700 font-semibold underline"
                >
                  {t('sellerIntro.sellerTermsLink')}
                </button>
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleStartSelling}
              disabled={!termsAccepted}
              className={`flex-1 px-6 py-4 font-bold rounded-lg transition-colors ${
                termsAccepted
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {t('sellerIntro.startSelling')}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('sellerIntro.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
