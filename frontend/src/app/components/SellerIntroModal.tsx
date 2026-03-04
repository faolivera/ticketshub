import { useTranslation } from 'react-i18next';
import { Ticket, CheckCircle, AlertCircle } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { termsService } from '@/api/services/terms.service';
import { TermsUserType, AcceptanceMethod } from '@/api/types/terms';
import { TermsModal } from './TermsModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

interface SellerIntroModalProps {
  onClose: () => void;
}

export function SellerIntroModal({ onClose }: SellerIntroModalProps) {
  const { t } = useTranslation();
  const { upgradeToLevel1 } = useUser();
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsVersionId, setTermsVersionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const terms = await termsService.getCurrentTerms(TermsUserType.Seller);
        setTermsVersionId(terms.id);
      } catch (err) {
        console.error('Failed to fetch seller terms:', err);
      }
    };
    fetchTerms();
  }, []);

  const handleStartSelling = async () => {
    if (!termsAccepted || !termsVersionId) {
      setError(t('sellerIntro.pleaseAcceptTerms'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await termsService.acceptTerms(termsVersionId, AcceptanceMethod.Checkbox);
      await upgradeToLevel1();
      onClose();
      navigate('/sell-ticket');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start selling');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-600" />
              <DialogTitle>{t('sellerIntro.title')}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            {/* What you can do */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {t('sellerIntro.whatYouCanDo')}
              </p>
              <ul className="flex flex-col gap-2">
                {['canList', 'canSell', 'canReceivePayment'].map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <span>{t(`sellerIntro.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Restrictions until verified */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-2">
                    {t('sellerIntro.untilVerified')}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {['limitListings', 'limitWithdraw'].map((key) => (
                      <li key={key} className="text-sm text-amber-800">
                        · {t(`sellerIntro.${key}`)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Verify later note */}
            <p className="text-xs text-muted-foreground">
              {t('sellerIntro.verifyLater')}
            </p>

            <hr className="border-gray-200" />

            {/* Terms checkbox */}
            <div className="flex items-start gap-3">
              <Checkbox
                id="seller-terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                className="mt-0.5"
              />
              <Label htmlFor="seller-terms" className="text-sm font-normal cursor-pointer leading-relaxed">
                {t('sellerIntro.agreeToTerms')}{' '}
                <button
                  type="button"
                  onClick={() => termsVersionId && setShowTermsModal(true)}
                  disabled={!termsVersionId}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold underline disabled:opacity-50"
                >
                  {t('sellerIntro.sellerTermsLink')}
                </button>
              </Label>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              {t('sellerIntro.cancel')}
            </Button>
            <Button
              onClick={handleStartSelling}
              disabled={!termsAccepted || !termsVersionId || isLoading}
            >
              {isLoading ? '...' : t('sellerIntro.startSelling')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showTermsModal && termsVersionId && (
        <TermsModal
          termsVersionId={termsVersionId}
          title={t('sellerIntro.sellerTermsLink')}
          onClose={() => setShowTermsModal(false)}
        />
      )}
    </>
  );
}
