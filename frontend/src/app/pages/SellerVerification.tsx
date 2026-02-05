import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Shield, User, CreditCard, CheckCircle, Camera } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';

type VerificationStep = 1 | 2 | 3;

export function SellerVerification() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser, upgradeToLevel2 } = useUser();

  const [currentStep, setCurrentStep] = useState<VerificationStep>(1);
  const [identityData, setIdentityData] = useState({
    legalFirstName: user?.firstName || '',
    legalLastName: user?.lastName || '',
    dateOfBirth: '',
    governmentIdNumber: ''
  });

  const [payoutData, setPayoutData] = useState({
    bankAccountNumber: '',
    accountHolderName: ''
  });

  const [selfieVerification, setSelfieVerification] = useState(false);

  // Redirect if not Level 1
  if (!user || user.level === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('verification.notEligibleTitle')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('verification.notEligibleMessage')}
            </p>
            <Link
              to="/sell-ticket"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
            >
              {t('verification.startSelling')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!identityData.legalFirstName || !identityData.legalLastName || 
        !identityData.dateOfBirth || !identityData.governmentIdNumber) {
      alert(t('verification.pleaseCompleteAllFields'));
      return;
    }

    setCurrentStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payoutData.bankAccountNumber || !payoutData.accountHolderName) {
      alert(t('verification.pleaseCompleteAllFields'));
      return;
    }

    // Check if names match
    const fullLegalName = `${identityData.legalFirstName} ${identityData.legalLastName}`.toLowerCase();
    if (payoutData.accountHolderName.toLowerCase() !== fullLegalName) {
      const confirmProceed = window.confirm(t('verification.namesMismatchWarning'));
      if (!confirmProceed) return;
    }

    setCurrentStep(3);
  };

  const handleFinalSubmit = () => {
    // Update user with verification data
    updateUser({
      legalFirstName: identityData.legalFirstName,
      legalLastName: identityData.legalLastName,
      dateOfBirth: identityData.dateOfBirth,
      governmentIdNumber: identityData.governmentIdNumber,
      bankAccountNumber: payoutData.bankAccountNumber,
      accountHolderName: payoutData.accountHolderName,
      verificationStatus: 'pending'
    });

    // Simulate instant approval (in production, this would be pending)
    setTimeout(() => {
      upgradeToLevel2();
      alert(t('verification.verificationSuccess'));
      navigate('/sell-ticket');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <Link
          to="/sell-ticket"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('verification.backToSellTicket')}
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('verification.title')}</h1>
              <p className="text-gray-600">{t('verification.subtitle')}</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className={`text-sm font-semibold ${
                currentStep >= 1 ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {t('verification.step1')}
              </span>
            </div>

            <div className="flex-1 h-1 bg-gray-200 mx-4">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: currentStep >= 2 ? '100%' : '0%' }}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {currentStep > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className={`text-sm font-semibold ${
                currentStep >= 2 ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {t('verification.step2')}
              </span>
            </div>

            <div className="flex-1 h-1 bg-gray-200 mx-4">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: currentStep >= 3 ? '100%' : '0%' }}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
              <span className={`text-sm font-semibold ${
                currentStep >= 3 ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {t('verification.step3')}
              </span>
            </div>
          </div>

          {/* Step 1: Identity */}
          {currentStep === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">{t('verification.identityTitle')}</h2>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  {t('verification.identityInfo')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('verification.legalFirstName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={identityData.legalFirstName}
                    onChange={(e) => setIdentityData({ ...identityData, legalFirstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('verification.legalLastName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={identityData.legalLastName}
                    onChange={(e) => setIdentityData({ ...identityData, legalLastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('verification.dateOfBirth')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={identityData.dateOfBirth}
                  onChange={(e) => setIdentityData({ ...identityData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('verification.governmentId')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={identityData.governmentIdNumber}
                  onChange={(e) => setIdentityData({ ...identityData, governmentIdNumber: e.target.value })}
                  placeholder={t('verification.governmentIdPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">{t('verification.governmentIdHint')}</p>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('verification.continue')}
              </button>
            </form>
          )}

          {/* Step 2: Payout Details */}
          {currentStep === 2 && (
            <form onSubmit={handleStep2Submit} className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">{t('verification.payoutTitle')}</h2>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  {t('verification.payoutInfo')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('verification.bankAccount')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={payoutData.bankAccountNumber}
                  onChange={(e) => setPayoutData({ ...payoutData, bankAccountNumber: e.target.value })}
                  placeholder={t('verification.bankAccountPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">{t('verification.bankAccountHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('verification.accountHolder')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={payoutData.accountHolderName}
                  onChange={(e) => setPayoutData({ ...payoutData, accountHolderName: e.target.value })}
                  placeholder={`${identityData.legalFirstName} ${identityData.legalLastName}`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-sm text-amber-600 mt-1">{t('verification.accountHolderHint')}</p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('verification.back')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('verification.continue')}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">{t('verification.reviewTitle')}</h2>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600">{t('verification.legalName')}</p>
                  <p className="font-semibold text-gray-900">
                    {identityData.legalFirstName} {identityData.legalLastName}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">{t('verification.dateOfBirth')}</p>
                  <p className="font-semibold text-gray-900">{identityData.dateOfBirth}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">{t('verification.governmentId')}</p>
                  <p className="font-semibold text-gray-900">
                    ••••••{identityData.governmentIdNumber.slice(-4)}
                  </p>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-600">{t('verification.bankAccount')}</p>
                  <p className="font-semibold text-gray-900">
                    ••••••{payoutData.bankAccountNumber.slice(-4)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">{t('verification.accountHolder')}</p>
                  <p className="font-semibold text-gray-900">{payoutData.accountHolderName}</p>
                </div>
              </div>

              {/* Optional Selfie Verification */}
              <div className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Camera className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">
                      {t('verification.selfieTitle')} ({t('verification.optional')})
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      {t('verification.selfieDesc')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelfieVerification(true)}
                      className="px-4 py-2 border border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-sm"
                    >
                      {selfieVerification ? t('verification.selfieAdded') : t('verification.addSelfie')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 text-center">
                  {t('verification.securityMessage')}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('verification.back')}
                </button>
                <button
                  onClick={handleFinalSubmit}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  {t('verification.submitVerification')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
