import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, User, CheckCircle, Upload, X, Clock, AlertCircle } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { VerificationHelper } from '@/lib/verification';
import { BackButton } from '@/app/components/BackButton';
import { identityVerificationService } from '@/api/services';
import type { IdentityVerificationPublic } from '@/api/types/identity-verification';
import { formatDateShort } from '@/lib/format-date';

export function SellerVerification() {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingVerification, setExistingVerification] = useState<IdentityVerificationPublic | null>(null);

  const [identityData, setIdentityData] = useState({
    legalFirstName: user?.firstName || '',
    legalLastName: user?.lastName || '',
    dateOfBirth: '',
    governmentIdNumber: '',
  });

  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [documentSelfie, setDocumentSelfie] = useState<File | null>(null);
  const [documentFrontPreview, setDocumentFrontPreview] = useState<string | null>(null);
  const [documentBackPreview, setDocumentBackPreview] = useState<string | null>(null);
  const [documentSelfiePreview, setDocumentSelfiePreview] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadExistingVerification();
  }, []);

  const loadExistingVerification = async () => {
    try {
      setLoading(true);
      const response = await identityVerificationService.getMyVerification();
      setExistingVerification(response.verification);
    } catch (err) {
      console.error('Failed to load verification status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (
    file: File | null,
    type: 'front' | 'back' | 'selfie',
  ) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setError(t('verification.invalidFileType'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('verification.fileTooLarge'));
      return;
    }

    setError(null);
    const previewUrl = URL.createObjectURL(file);

    if (type === 'front') {
      if (documentFrontPreview) URL.revokeObjectURL(documentFrontPreview);
      setDocumentFront(file);
      setDocumentFrontPreview(previewUrl);
    } else if (type === 'back') {
      if (documentBackPreview) URL.revokeObjectURL(documentBackPreview);
      setDocumentBack(file);
      setDocumentBackPreview(previewUrl);
    } else {
      if (documentSelfiePreview) URL.revokeObjectURL(documentSelfiePreview);
      setDocumentSelfie(file);
      setDocumentSelfiePreview(previewUrl);
    }
  };

  const removeFile = (type: 'front' | 'back' | 'selfie') => {
    if (type === 'front') {
      if (documentFrontPreview) URL.revokeObjectURL(documentFrontPreview);
      setDocumentFront(null);
      setDocumentFrontPreview(null);
      if (frontInputRef.current) frontInputRef.current.value = '';
    } else if (type === 'back') {
      if (documentBackPreview) URL.revokeObjectURL(documentBackPreview);
      setDocumentBack(null);
      setDocumentBackPreview(null);
      if (backInputRef.current) backInputRef.current.value = '';
    } else {
      if (documentSelfiePreview) URL.revokeObjectURL(documentSelfiePreview);
      setDocumentSelfie(null);
      setDocumentSelfiePreview(null);
      if (selfieInputRef.current) selfieInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !identityData.legalFirstName ||
      !identityData.legalLastName ||
      !identityData.dateOfBirth ||
      !identityData.governmentIdNumber
    ) {
      setError(t('verification.pleaseCompleteAllFields'));
      return;
    }

    if (!documentFront || !documentBack) {
      setError(t('verification.pleaseUploadBothDocuments'));
      return;
    }

    if (!documentSelfie) {
      setError(t('verification.pleaseUploadSelfie'));
      return;
    }

    try {
      setSubmitting(true);
      const response = await identityVerificationService.submitVerification({
        legalFirstName: identityData.legalFirstName,
        legalLastName: identityData.legalLastName,
        dateOfBirth: identityData.dateOfBirth,
        governmentIdNumber: identityData.governmentIdNumber,
        documentFront,
        documentBack,
        selfie: documentSelfie,
      });

      setExistingVerification(response.verification);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verification.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !VerificationHelper.isSeller(user)) {
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

  if (existingVerification) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <BackButton className="mb-6" />

          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('verification.title')}
                </h1>
              </div>
            </div>

            {existingVerification.status === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  {t('verification.pendingTitle')}
                </h3>
                <p className="text-yellow-700">
                  {t('verification.pendingMessage')}
                </p>
              </div>
            )}

            {existingVerification.status === 'approved' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  {t('verification.approvedTitle')}
                </h3>
                <p className="text-green-700">
                  {t('verification.approvedMessage')}
                </p>
              </div>
            )}

            {existingVerification.status === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  {t('verification.rejectedTitle')}
                </h3>
                <p className="text-red-700 mb-2">
                  {t('verification.rejectedMessage')}
                </p>
                {existingVerification.adminNotes && (
                  <p className="text-red-600 text-sm mt-2">
                    <strong>{t('verification.reason')}:</strong>{' '}
                    {existingVerification.adminNotes}
                  </p>
                )}
                <button
                  onClick={() => setExistingVerification(null)}
                  className="mt-4 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  {t('verification.tryAgain')}
                </button>
              </div>
            )}

            <div className="mt-6 bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-600">
                <strong>{t('verification.legalName')}:</strong>{' '}
                {existingVerification.legalFirstName} {existingVerification.legalLastName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t('verification.dateOfBirth')}:</strong>{' '}
                {existingVerification.dateOfBirth}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t('verification.governmentId')}:</strong>{' '}
                {existingVerification.governmentIdNumber}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{t('verification.submittedAt')}:</strong>{' '}
                {formatDateShort(existingVerification.submittedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <BackButton className="mb-6" />

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('verification.title')}
              </h1>
              <p className="text-gray-600">{t('verification.subtitle')}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">
                {t('verification.identityTitle')}
              </h2>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                {t('verification.identityInfo')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('verification.legalFirstName')}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={identityData.legalFirstName}
                  onChange={(e) =>
                    setIdentityData({ ...identityData, legalFirstName: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('verification.legalLastName')}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={identityData.legalLastName}
                  onChange={(e) =>
                    setIdentityData({ ...identityData, legalLastName: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('verification.dateOfBirth')}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={identityData.dateOfBirth}
                onChange={(e) =>
                  setIdentityData({ ...identityData, dateOfBirth: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('verification.governmentId')}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={identityData.governmentIdNumber}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  setIdentityData({ ...identityData, governmentIdNumber: digitsOnly });
                }}
                placeholder={t('verification.governmentIdPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('verification.governmentIdHint')}
              </p>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('verification.documentPhotos')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('verification.documentPhotosHint')}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('verification.documentFront')}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  {documentFrontPreview ? (
                    <div className="relative">
                      <img
                        src={documentFrontPreview}
                        alt="Front of ID"
                        className="w-full h-40 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile('front')}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        {t('verification.uploadFront')}
                      </span>
                      <input
                        ref={frontInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        className="hidden"
                        onChange={(e) =>
                          handleFileSelect(e.target.files?.[0] || null, 'front')
                        }
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('verification.documentBack')}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  {documentBackPreview ? (
                    <div className="relative">
                      <img
                        src={documentBackPreview}
                        alt="Back of ID"
                        className="w-full h-40 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile('back')}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">
                        {t('verification.uploadBack')}
                      </span>
                      <input
                        ref={backInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        className="hidden"
                        onChange={(e) =>
                          handleFileSelect(e.target.files?.[0] || null, 'back')
                        }
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('verification.selfieTitle')}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  {t('verification.selfieHint')}
                </p>
                {documentSelfiePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={documentSelfiePreview}
                      alt="Selfie"
                      className="w-40 h-40 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile('selfie')}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">
                      {t('verification.uploadSelfie')}
                    </span>
                    <input
                      ref={selfieInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={(e) =>
                        handleFileSelect(e.target.files?.[0] || null, 'selfie')
                      }
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 text-center">
                {t('verification.securityMessage')}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('verification.submitting')}
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  {t('verification.submitVerification')}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
