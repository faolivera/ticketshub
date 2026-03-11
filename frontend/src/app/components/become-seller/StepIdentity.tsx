import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Upload, X, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { identityVerificationService } from '@/api/services';
import type { IdentityVerificationPublic } from '@/api/types/identity-verification';
import { Button } from '@/app/components/ui/button';
import { Loader2 } from 'lucide-react';

export interface StepIdentityProps {
  onComplete: () => void;
}

export function StepIdentity({ onComplete }: StepIdentityProps) {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingVerification, setExistingVerification] =
    useState<IdentityVerificationPublic | null>(null);

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
    if (user?.firstName) setIdentityData((prev) => ({ ...prev, legalFirstName: user.firstName }));
    if (user?.lastName) setIdentityData((prev) => ({ ...prev, legalLastName: user.lastName }));
  }, [user?.firstName, user?.lastName]);

  useEffect(() => {
    let cancelled = false;
    identityVerificationService
      .getMyVerification()
      .then((res) => {
        if (!cancelled) setExistingVerification(res.verification);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load verification:', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileSelect = (file: File | null, type: 'front' | 'back' | 'selfie') => {
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
      frontInputRef.current && (frontInputRef.current.value = '');
    } else if (type === 'back') {
      if (documentBackPreview) URL.revokeObjectURL(documentBackPreview);
      setDocumentBack(null);
      setDocumentBackPreview(null);
      backInputRef.current && (backInputRef.current.value = '');
    } else {
      if (documentSelfiePreview) URL.revokeObjectURL(documentSelfiePreview);
      setDocumentSelfie(null);
      setDocumentSelfiePreview(null);
      selfieInputRef.current && (selfieInputRef.current.value = '');
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
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verification.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (existingVerification?.status === 'pending') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('becomeSeller.step3.identityUnderReview')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('becomeSeller.step3.identityUnderReviewMessage')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (existingVerification?.status === 'approved') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('verification.approvedTitle')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('verification.approvedMessage')}
            </p>
          </div>
        </div>
        <Button onClick={onComplete} className="w-full">
          {t('becomeSeller.step3.next')}
        </Button>
      </div>
    );
  }

  const showForm =
    !existingVerification || existingVerification.status === 'rejected';

  if (existingVerification?.status === 'rejected') {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('verification.rejectedTitle')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('verification.rejectedMessage')}
            </p>
          </div>
        </div>
        {renderForm()}
      </div>
    );
  }

  function renderForm() {
    return (
      <>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('becomeSeller.step3.title')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('becomeSeller.step3.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('verification.legalFirstName')} *
              </label>
              <input
                type="text"
                value={identityData.legalFirstName}
                onChange={(e) =>
                  setIdentityData({ ...identityData, legalFirstName: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('verification.legalLastName')} *
              </label>
              <input
                type="text"
                value={identityData.legalLastName}
                onChange={(e) =>
                  setIdentityData({ ...identityData, legalLastName: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('verification.dateOfBirth')} *
            </label>
            <input
              type="date"
              value={identityData.dateOfBirth}
              onChange={(e) =>
                setIdentityData({ ...identityData, dateOfBirth: e.target.value })
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('verification.governmentId')} *
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
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('verification.governmentIdHint')}
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              {t('verification.documentPhotos')}
            </h3>
            <p className="mb-3 text-xs text-gray-600">
              {t('verification.documentPhotosHint')}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('verification.documentFront')} *
                </label>
                {documentFrontPreview ? (
                  <div className="relative">
                    <img
                      src={documentFrontPreview}
                      alt="Front"
                      className="h-36 w-full rounded-lg border border-gray-300 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile('front')}
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-50">
                    <Upload className="mb-1 h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {t('verification.uploadFront')}
                    </span>
                    <input
                      ref={frontInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={(e) =>
                        handleFileSelect(e.target.files?.[0] ?? null, 'front')
                      }
                    />
                  </label>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {t('verification.documentBack')} *
                </label>
                {documentBackPreview ? (
                  <div className="relative">
                    <img
                      src={documentBackPreview}
                      alt="Back"
                      className="h-36 w-full rounded-lg border border-gray-300 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFile('back')}
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-50">
                    <Upload className="mb-1 h-6 w-6 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {t('verification.uploadBack')}
                    </span>
                    <input
                      ref={backInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={(e) =>
                        handleFileSelect(e.target.files?.[0] ?? null, 'back')
                      }
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {t('verification.selfieTitle')} *
              </label>
              <p className="mb-2 text-xs text-gray-600">
                {t('verification.selfieHint')}
              </p>
              {documentSelfiePreview ? (
                <div className="relative inline-block">
                  <img
                    src={documentSelfiePreview}
                    alt="Selfie"
                    className="h-36 w-36 rounded-lg border border-gray-300 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile('selfie')}
                    className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-36 w-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-50">
                  <Upload className="mb-1 h-6 w-6 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {t('verification.uploadSelfie')}
                  </span>
                  <input
                    ref={selfieInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={(e) =>
                      handleFileSelect(e.target.files?.[0] ?? null, 'selfie')
                    }
                  />
                </label>
              )}
            </div>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('verification.submitting')}
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                {t('verification.submitVerification')}
              </>
            )}
          </Button>
        </form>
      </>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <Shield className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('becomeSeller.step3.title')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('becomeSeller.step3.subtitle')}
          </p>
        </div>
      </div>
      {showForm && renderForm()}
    </div>
  );
}
