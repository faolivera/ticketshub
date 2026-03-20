import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/format-date';
import { formatCurrencyFromUnitsDisplay } from '@/lib/format-currency';
import type { PublicListEventItem, EventDate, EventSection } from '@/api/types';
import type { CheckSellerPromotionCodeResponse } from '@/api/types/promotions';
import type { WizardFormState } from '../types';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { VerificationHelper, SellerTier } from '@/lib/verification';
import type { User } from '@/app/contexts/UserContext';
import {
  V,
  VLIGHT,
  DARK,
  MUTED,
  HINT,
  BORDER,
  BORD2,
  BG,
  CARD,
  GREEN,
  GLIGHT,
  GBORD,
  S,
} from '@/lib/design-tokens';
import { stepHeadingStyle } from '../wizardTokens';

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
  promoCodeInput: string;
  onPromoCodeChange: (value: string) => void;
  onClaimPromo: () => void;
  checkedPromotion: CheckSellerPromotionCodeResponse | null;
  promotionCheckError: string | null;
  isCheckingPromo: boolean;
  user: User | null;
}

export const StepReviewAndPublish: FC<StepReviewAndPublishProps> = ({
  event, selectedDate, selectedSection, form, currency,
  sellerPlatformFeePercent, effectiveFeePercent, promotionName,
  onEditStep, promoCodeInput, onPromoCodeChange, onClaimPromo,
  checkedPromotion, promotionCheckError, isCheckingPromo, user,
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

  const feePercent        = isPromotionApplicable ? 0 : (effectiveFeePercent ?? sellerPlatformFeePercent);
  const platformCommission = (totalCharged * feePercent) / 100;
  const sellerReceives     = totalCharged - platformCommission;

  const validNumberedSeats = form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim());
  const hasPromotionDiscount = feePercent === 0 && (isPromotionApplicable || !!promotionName);
  const promotionLabel = isPromotionApplicable
    ? `(${t('sellListingWizard.promotionCode')}) · ${checkedPromotion?.name}`
    : promotionName;
  const sectionName = selectedSection?.name ?? '';
  const showVerifiedSellerDisclaimer =
    checkedPromotion?.target === 'verified_seller' && !isPromotionApplicable;

  return (
    <div role="group" aria-label={t('sellListingWizard.reviewTitle')}>
      <h2 style={stepHeadingStyle}>{t('sellListingWizard.reviewTitle')}</h2>
      <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 20, ...S }}>
        {t('sellListingWizard.reviewDescription')}
      </p>

      {/* Review sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <ReviewSection
          title={t('sellListingWizard.event')}
          onEdit={() => onEditStep(0)}
          content={
            <>
              <p style={{ fontWeight: 700, color: DARK, fontSize: 14, ...S }}>{event.name}</p>
              {selectedDate && (
                <p style={{ fontSize: 13, color: MUTED, marginTop: 2, ...S }}>{formatDateTime(selectedDate.date)}</p>
              )}
            </>
          }
        />

        <ReviewSection
          title={t('sellListingWizard.zoneSeats')}
          onEdit={() => onEditStep(2)}
          content={
            <>
              <p style={{ fontWeight: 700, color: DARK, fontSize: 14, ...S }}>{sectionName}</p>
              <p style={{ fontSize: 13, color: MUTED, marginTop: 2, ...S }}>
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
              <p style={{ fontWeight: 700, color: DARK, fontSize: 14, ...S }}>
                {formatCurrencyFromUnitsDisplay(form.pricePerTicket, currency)} {t('sellTicket.pricePerTicket').toLowerCase()}
              </p>
              {form.bestOfferEnabled && (
                <p style={{ fontSize: 13, color: MUTED, marginTop: 2, ...S }}>{t('sellListingWizard.openToOffers')}</p>
              )}
            </>
          }
        />

        <ReviewSection
          title={t('sellListingWizard.delivery')}
          onEdit={() => onEditStep(4)}
          content={
            <>
              <p style={{ fontWeight: 700, color: DARK, fontSize: 14, ...S }}>
                {form.deliveryMethod === 'digital'
                  ? t('sellListingWizard.digital')
                  : t('sellListingWizard.physical')}
              </p>
              {form.deliveryMethod === 'physical' && form.physicalDeliveryMethod === 'pickup' && (
                <p style={{ fontSize: 13, color: MUTED, marginTop: 2, ...S }}>{form.pickupAddress}</p>
              )}
            </>
          }
        />
      </div>

      {/* Promo code (only shown if no active promo already) */}
      {!promotionName && (
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          <label style={{ fontSize: 13.5, fontWeight: 600, color: DARK, display: 'block', marginBottom: 10, ...S }}>
            {t('sellListingWizard.promotionCode')}
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
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
            <p style={{ fontSize: 12.5, color: '#dc2626', marginTop: 6, ...S }} role="alert">
              {promotionCheckError}
            </p>
          )}
          {showVerifiedSellerDisclaimer && (
            <div style={{ marginTop: 10, padding: '10px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
              <p style={{ fontSize: 13, color: '#92400e', ...S }}>
                {t('sellListingWizard.promotionVerifiedSellerDisclaimer')}{' '}
                <Link to="/become-seller" style={{ fontWeight: 700, color: '#92400e' }}>
                  {t('sellListingWizard.becomeVerifiedSeller')}
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary card */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ background: BG, padding: '10px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: DARK, ...S }}>{t('sellListingWizard.summaryTitle')}</p>
        </div>
        <div style={{ padding: '14px 16px' }}>
          {/* Gross amount */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: DARK, fontSize: 13.5, ...S }}>{sectionName}</span>
              <span style={{ color: MUTED, fontSize: 13, ...S }}>
                {' · '}{formatCurrencyFromUnitsDisplay(form.pricePerTicket, currency)} × {ticketCount}{' '}
                {ticketCount === 1 ? t('sellTicket.ticket') : t('sellTicket.tickets')}
              </span>
              {form.seatingType === 'numbered' && validNumberedSeats.length > 0 && (
                <p style={{ fontSize: 12.5, color: MUTED, marginTop: 2, ...S }}>
                  {t('sellTicket.rowsAndSeats')}: {validNumberedSeats.map((s) => `${s.row}-${s.seatNumber}`).join(', ')}
                </p>
              )}
            </div>
            <span style={{ fontWeight: 600, color: DARK, fontSize: 13.5, flexShrink: 0, ...S }}>
              {formatCurrencyFromUnitsDisplay(totalCharged, currency)}
            </span>
          </div>

          {/* Fee line(s) */}
          {hasPromotionDiscount ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${BORDER}`, marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: HINT, textDecoration: 'line-through', ...S }}>
                  {t('sellListingWizard.platformFee')} ({sellerPlatformFeePercent}%)
                </span>
                <span style={{ fontSize: 13, color: HINT, textDecoration: 'line-through', ...S }}>
                  −{formatCurrencyFromUnitsDisplay((totalCharged * sellerPlatformFeePercent) / 100, currency)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: MUTED, ...S }}>
                  {t('sellListingWizard.platformFee')} (0%){promotionLabel ? ` · ${promotionLabel}` : ''}
                </span>
                <span style={{ fontSize: 13, color: MUTED, ...S }}>−{formatCurrencyFromUnitsDisplay(0, currency)}</span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${BORDER}`, marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: MUTED, ...S }}>
                {t('sellListingWizard.platformFee')} ({feePercent}%)
                {promotionName ? ` · ${promotionName}` : ''}
              </span>
              <span style={{ fontSize: 13, color: MUTED, ...S }}>−{formatCurrencyFromUnitsDisplay(platformCommission, currency)}</span>
            </div>
          )}

          {/* Net total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: DARK, ...S }}>{t('sellTicket.sellerReceives')}</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: V, ...S }}>{formatCurrencyFromUnitsDisplay(sellerReceives, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── ReviewSection helper ─────────────────────────────────────────────────────
function ReviewSection({ title, onEdit, content }: {
  title: string; onEdit: () => void; content: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 16px',
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>{content}</div>
      <button
        type="button"
        onClick={onEdit}
        style={{
          flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 700, color: V, minHeight: 44,
          display: 'flex', alignItems: 'center',
          ...S,
        }}
        aria-label={`${t('sellListingWizard.editSection')} ${title}`}
      >
        {t('sellListingWizard.editSection')}
      </button>
    </div>
  );
}
