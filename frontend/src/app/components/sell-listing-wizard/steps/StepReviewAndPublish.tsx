import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/format-date';
import { formatCurrencyFromUnits } from '@/lib/format-currency';
import type { PublicListEventItem, EventDate, EventSection } from '@/api/types';
import type { CheckSellerPromotionCodeResponse } from '@/api/types/promotions';
import type { WizardFormState } from '../types';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { VerificationHelper, SellerTier } from '@/lib/verification';
import type { User } from '@/app/contexts/UserContext';

interface StepReviewAndPublishProps {
  event: PublicListEventItem;
  selectedDate: EventDate | null;
  selectedSection: EventSection | null;
  form: WizardFormState;
  currency: string;
  sellerPlatformFeePercent: number;
  effectiveFeePercent?: number;
  promotionName?: string;
  onEditStep: (stepIndex: number) => void;
  /** Promotion code claimed in this step (seller check) */
  promoCodeInput: string;
  onPromoCodeChange: (value: string) => void;
  onClaimPromo: () => void;
  checkedPromotion: CheckSellerPromotionCodeResponse | null;
  promotionCheckError: string | null;
  isCheckingPromo: boolean;
  user: User | null;
}

export const StepReviewAndPublish: FC<StepReviewAndPublishProps> = ({
  event,
  selectedDate,
  selectedSection,
  form,
  currency,
  sellerPlatformFeePercent,
  effectiveFeePercent,
  promotionName,
  onEditStep,
  promoCodeInput,
  onPromoCodeChange,
  onClaimPromo,
  checkedPromotion,
  promotionCheckError,
  isCheckingPromo,
  user,
}) => {
  const { t } = useTranslation();

  const ticketCount =
    form.seatingType === 'numbered'
      ? form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim()).length
      : form.quantity;
  const totalCharged = form.pricePerTicket * (ticketCount || 0);

  const isPromotionApplicable =
    checkedPromotion &&
    (checkedPromotion.target === 'seller' ||
      (checkedPromotion.target === 'verified_seller' &&
        VerificationHelper.sellerTier(user) === SellerTier.VERIFIED_SELLER));

  const feePercent = isPromotionApplicable
    ? 0
    : (effectiveFeePercent ?? sellerPlatformFeePercent);
  const platformCommission = (totalCharged * feePercent) / 100;
  const sellerReceives = totalCharged - platformCommission;
  const validNumberedSeats = form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim());

  /** Show real commission crossed out + 0% line when user has a promotion (claimed here or already active). */
  const hasPromotionDiscount =
    feePercent === 0 && (isPromotionApplicable || !!promotionName);
  const promotionLabel = isPromotionApplicable
    ? `(${t('sellListingWizard.promotionCode')}) · ${checkedPromotion?.name}`
    : promotionName;

  const sectionName = selectedSection?.name ?? '';
  const showVerifiedSellerDisclaimer =
    checkedPromotion?.target === 'verified_seller' && !isPromotionApplicable;

  return (
    <div className="space-y-6" role="group" aria-label={t('sellListingWizard.reviewTitle')}>
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {t('sellListingWizard.reviewTitle')}
        </h2>
        <p className="text-muted-foreground mt-1">{t('sellListingWizard.reviewDescription')}</p>
      </div>

      <div className="space-y-4">
        <ReviewSection
          title={t('sellListingWizard.event')}
          onEdit={() => onEditStep(0)}
          content={
            <>
              <p className="font-medium text-foreground">{event.name}</p>
              {selectedDate && (
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(selectedDate.date)}
                </p>
              )}
            </>
          }
        />

        <ReviewSection
          title={t('sellListingWizard.zoneSeats')}
          onEdit={() => onEditStep(2)}
          content={
            <>
              <p className="font-medium text-foreground">{sectionName}</p>
              <p className="text-sm text-muted-foreground">
                {form.seatingType === 'numbered'
                  ? t('sellListingWizard.numbered') +
                    (validNumberedSeats.length > 0
                      ? ` · ${validNumberedSeats.map((s) => `${s.row}-${s.seatNumber}`).join(', ')}`
                      : '')
                  : `${form.quantity} ${form.quantity === 1 ? t('sellTicket.ticket') : t('sellTicket.tickets')}`}
              </p>
            </>
          }
        />

        <ReviewSection
          title={t('sellListingWizard.price')}
          onEdit={() => onEditStep(3)}
          content={
            <>
              <p className="font-medium text-foreground">
                {formatCurrencyFromUnits(form.pricePerTicket, currency)}{' '}
                {t('sellTicket.pricePerTicket').toLowerCase()}
              </p>
              {form.bestOfferEnabled && (
                <p className="text-sm text-muted-foreground">{t('sellListingWizard.openToOffers')}</p>
              )}
            </>
          }
        />

        <ReviewSection
          title={t('sellListingWizard.delivery')}
          onEdit={() => onEditStep(4)}
          content={
            <>
              <p className="font-medium text-foreground">
                {form.deliveryMethod === 'digital'
                  ? t('sellListingWizard.digital')
                  : t('sellListingWizard.physical')}
              </p>
              {form.deliveryMethod === 'physical' && form.physicalDeliveryMethod === 'pickup' && (
                <p className="text-sm text-muted-foreground">{form.pickupAddress}</p>
              )}
            </>
          }
        />

        {!promotionName && (
          <div className="rounded-lg border p-4 space-y-3">
            <label className="text-sm font-medium text-foreground block">
              {t('sellListingWizard.promotionCode')}
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                type="text"
                value={promoCodeInput}
                onChange={(e) => onPromoCodeChange(e.target.value)}
                placeholder={t('sellListingWizard.promotionCodePlaceholder')}
                className="max-w-[200px] min-h-[40px]"
                aria-label={t('sellListingWizard.promotionCode')}
              />
              <Button
                type="button"
                variant="secondary"
                size="default"
                disabled={!promoCodeInput.trim() || isCheckingPromo}
                onClick={onClaimPromo}
              >
                {isCheckingPromo ? t('sellListingWizard.claiming') : t('sellListingWizard.claimPromo')}
              </Button>
            </div>
            {promotionCheckError && (
              <p className="text-sm text-destructive" role="alert">
                {promotionCheckError}
              </p>
            )}
            {showVerifiedSellerDisclaimer && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('sellListingWizard.promotionVerifiedSellerDisclaimer')}{' '}
                  <Link
                    to="/become-seller"
                    className="font-medium underline hover:no-underline"
                  >
                    {t('sellListingWizard.becomeVerifiedSeller')}
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border overflow-hidden">
        <div className="bg-muted px-4 py-2.5">
          <h3 className="text-sm font-semibold text-foreground">
            {t('sellListingWizard.summaryTitle')}
          </h3>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex justify-between items-start gap-4 text-sm">
            <div className="text-muted-foreground min-w-0">
              <span className="font-medium text-foreground">{sectionName}</span>
              <span className="text-muted-foreground">
                {' · '}
                {formatCurrencyFromUnits(form.pricePerTicket, currency)} × {ticketCount}{' '}
                {ticketCount === 1 ? t('sellTicket.ticket') : t('sellTicket.tickets')}
              </span>
              {form.seatingType === 'numbered' && validNumberedSeats.length > 0 && (
                <p className="text-muted-foreground mt-0.5">
                  {t('sellTicket.rowsAndSeats')}:{' '}
                  {validNumberedSeats.map((s) => `${s.row}-${s.seatNumber}`).join(', ')}
                </p>
              )}
            </div>
            <span className="font-medium text-foreground tabular-nums shrink-0">
              {formatCurrencyFromUnits(totalCharged, currency)}
            </span>
          </div>
          {hasPromotionDiscount ? (
            <>
              <div className="flex justify-between items-center text-sm text-muted-foreground pt-2 border-t line-through">
                <span>
                  {t('sellListingWizard.platformFee')} ({sellerPlatformFeePercent}%)
                </span>
                <span className="tabular-nums">
                  −{formatCurrencyFromUnits((totalCharged * sellerPlatformFeePercent) / 100, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>
                  {t('sellListingWizard.platformFee')} (0%)
                  {promotionLabel && ` · ${promotionLabel}`}
                </span>
                <span className="tabular-nums">
                  −{formatCurrencyFromUnits(0, currency)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center text-sm text-muted-foreground pt-2 border-t">
              <span>
                {t('sellListingWizard.platformFee')} ({feePercent}%)
                {promotionName && ` · ${promotionName}`}
              </span>
              <span className="tabular-nums">
                −{formatCurrencyFromUnits(platformCommission, currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t font-semibold text-foreground">
            <span>{t('sellTicket.sellerReceives')}</span>
            <span className="tabular-nums">
              {formatCurrencyFromUnits(sellerReceives, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function ReviewSection({
  title,
  onEdit,
  content,
}: {
  title: string;
  onEdit: () => void;
  content: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0 flex-1">{content}</div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-sm font-medium text-primary hover:underline min-h-[44px] flex items-center"
        aria-label={`${t('sellListingWizard.editSection')} ${title}`}
      >
        {t('sellListingWizard.editSection')}
      </button>
    </div>
  );
}
