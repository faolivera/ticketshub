import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { termsService } from '@/api/services/terms.service';
import { TermsUserType, AcceptanceMethod } from '@/api/types/terms';
import { useUser } from '@/app/contexts/UserContext';
import { TermsModal } from '@/app/components/TermsModal';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Label } from '@/app/components/ui/label';
import { Loader2 } from 'lucide-react';

export interface StepTermsProps {
  onComplete: () => void;
}

export function StepTerms({ onComplete }: StepTermsProps) {
  const { t } = useTranslation();
  const { upgradeToLevel1 } = useUser();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsVersionId, setTermsVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    termsService
      .getCurrentTerms(TermsUserType.Seller)
      .then((terms) => {
        if (!cancelled) setTermsVersionId(terms.id);
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to fetch seller terms:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted || !termsVersionId) {
      setError(t('becomeSeller.step2.pleaseAcceptTerms'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await termsService.acceptTerms(termsVersionId, AcceptanceMethod.Checkbox);
      await upgradeToLevel1();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start selling');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('becomeSeller.step2.successTitle')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('becomeSeller.step2.successMessage')}
            </p>
          </div>
        </div>
        <Button onClick={onComplete} className="w-full">
          {t('becomeSeller.step2.continue')}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <FileText className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('becomeSeller.step2.title')}
          </h2>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            {t('becomeSeller.step2.whatYouCanDo')}
          </p>
          <ul className="flex flex-col gap-1 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
              {t('becomeSeller.step2.canList')}
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
              {t('becomeSeller.step2.canSell')}
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {t('becomeSeller.step2.untilVerified')}
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-amber-800">
                <li>{t('becomeSeller.step2.limitListings')}</li>
                <li>{t('becomeSeller.step2.limitWithdraw')}</li>
              </ul>
              <p className="mt-3 text-sm font-semibold text-amber-900">
                {t('becomeSeller.step2.verifyAccountRequires')}
              </p>
              <ul className="list-inside list-disc text-sm text-amber-800">
                <li>{t('becomeSeller.step2.verifyAccountDni')}</li>
                <li>{t('becomeSeller.step2.verifyAccountBank')}</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          {t('becomeSeller.step2.verifyLater')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id="wizard-seller-terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="wizard-seller-terms"
              className="cursor-pointer text-sm font-normal leading-relaxed"
            >
              {t('becomeSeller.step2.agreeToTerms')}{' '}
              <button
                type="button"
                onClick={() => termsVersionId && setShowTermsModal(true)}
                disabled={!termsVersionId}
                className="font-semibold text-blue-600 underline hover:text-blue-700 disabled:opacity-50"
              >
                {t('becomeSeller.step2.sellerTermsLink')}
              </button>
            </Label>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            type="submit"
            disabled={!termsAccepted || !termsVersionId || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ...
              </>
            ) : (
              t('becomeSeller.step2.startSelling')
            )}
          </Button>
        </form>
      </div>

      {showTermsModal && termsVersionId && (
        <TermsModal
          termsVersionId={termsVersionId}
          title={t('becomeSeller.step2.sellerTermsLink')}
          onClose={() => setShowTermsModal(false)}
        />
      )}
    </div>
  );
}
