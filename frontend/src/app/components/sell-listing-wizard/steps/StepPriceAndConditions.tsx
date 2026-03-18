import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { CurrencyAmountInput } from '@/app/components/ui/CurrencyAmountInput';
import { formatCurrencyFromUnits } from '@/lib/format-currency';
import type { WizardFormState } from '../types';
import {
  V, VLIGHT, VBORD, DARK, MUTED, HINT, BORDER, CARD, BG,
  GREEN, GLIGHT, GBORD, S, stepHeadingStyle, stepDescStyle,
} from '../wizardTokens';

interface StepPriceAndConditionsProps {
  form: WizardFormState;
  onFormChange: (patch: Partial<WizardFormState>) => void;
  currency: string;
  sellerPlatformFeePercent: number;
  effectiveFeePercent?: number;
  promotionName?: string;
}

/** Strip trailing ,00 or .00 from formatted currency */
function fmtUnits(amount: number, currency: string) {
  return formatCurrencyFromUnits(amount, currency).replace(/[,.]00$/, '');
}

export const StepPriceAndConditions: FC<StepPriceAndConditionsProps> = ({
  form,
  onFormChange,
  currency,
  sellerPlatformFeePercent,
  effectiveFeePercent,
  promotionName,
}) => {
  const { t } = useTranslation();

  const feePercent = effectiveFeePercent ?? sellerPlatformFeePercent;
  const hasPromo   = feePercent < sellerPlatformFeePercent;

  const ticketCount =
    form.seatingType === 'numbered'
      ? form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim()).length
      : form.quantity;

  // Fee preview — values in "display units" (the raw price, not × 100 yet)
  const totalGross   = form.pricePerTicket * Math.max(1, ticketCount);
  const feeAmount    = Math.round((totalGross * feePercent) / 100);
  const netAmount    = totalGross - feeAmount;
  const showPreview  = form.pricePerTicket > 0;

  return (
    <div role="group" aria-label={t('sellListingWizard.priceAndConditions')}>
      <h2 style={stepHeadingStyle}>{t('sellListingWizard.priceAndConditions')}</h2>

      {/* Price input */}
      <div style={{ marginBottom: 20 }}>
        <Label htmlFor="wizard-price" style={{ fontSize: 13.5, fontWeight: 600, color: DARK, display: 'block', marginBottom: 6, ...S }}>
          {t('sellListingWizard.pricePerTicket')} <span style={{ color: '#dc2626' }}>*</span>
        </Label>
        <CurrencyAmountInput
          id="wizard-price"
          value={Math.floor(form.pricePerTicket) || 0}
          onChange={(v) => onFormChange({ pricePerTicket: v })}
          currency={currency}
          min={0}
          aria-invalid={form.pricePerTicket <= 0}
          aria-describedby={form.pricePerTicket <= 0 ? 'price-error' : undefined}
        />
        {form.pricePerTicket <= 0 && (
          <p id="price-error" style={{ fontSize: 12.5, color: '#dc2626', marginTop: 4, ...S }} role="alert">
            {t('sellListingWizard.enterValidPrice')}
          </p>
        )}
      </div>

      {/* ── Fee preview strip ─────────────────────────────────────────────── */}
      {showPreview && (
        <div style={{
          background: hasPromo ? GLIGHT : BG,
          border: `1px solid ${hasPromo ? GBORD : BORDER}`,
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
        }}>
          {/* Label */}
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: hasPromo ? GREEN : HINT, marginBottom: 8, ...S }}>
            {t('sellListingWizard.summaryPreview', { defaultValue: 'Resumen estimado' })}
          </p>

          {/* Total charged */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}>
            <span style={{ color: MUTED, ...S }}>
              {ticketCount > 1
                ? `${fmtUnits(form.pricePerTicket, currency)} × ${ticketCount} entradas`
                : t('sellListingWizard.pricePerTicket')}
            </span>
            <span style={{ fontWeight: 600, color: DARK, ...S }}>{fmtUnits(totalGross, currency)}</span>
          </div>

          {/* Platform fee — crossed out if promo applied */}
          {hasPromo ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 2 }}>
                <span style={{ color: HINT, textDecoration: 'line-through', ...S }}>
                  {t('sellListingWizard.platformFee')} ({sellerPlatformFeePercent}%)
                </span>
                <span style={{ color: HINT, textDecoration: 'line-through', ...S }}>
                  −{fmtUnits(Math.round((totalGross * sellerPlatformFeePercent) / 100), currency)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 8 }}>
                <span style={{ color: GREEN, ...S }}>
                  {t('sellListingWizard.platformFee')} (0%){promotionName ? ` · ${promotionName}` : ''}
                </span>
                <span style={{ color: GREEN, ...S }}>−{fmtUnits(0, currency)}</span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 8 }}>
              <span style={{ color: MUTED, ...S }}>
                {t('sellListingWizard.platformFee')} ({feePercent}%)
              </span>
              <span style={{ color: MUTED, ...S }}>−{fmtUnits(feeAmount, currency)}</span>
            </div>
          )}

          {/* Net divider + total */}
          <div style={{ borderTop: `1px solid ${hasPromo ? GBORD : BORDER}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: DARK, ...S }}>
              {t('sellTicket.sellerReceives')}
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: hasPromo ? GREEN : V, ...S }}>
              {fmtUnits(netAmount, currency)}
            </span>
          </div>
        </div>
      )}

      {/* Best offer toggle */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
        padding: '14px 16px',
      }}>
        <Switch
          id="wizard-best-offer"
          checked={form.bestOfferEnabled}
          onCheckedChange={(checked) => onFormChange({ bestOfferEnabled: checked })}
          aria-describedby="best-offer-desc"
        />
        <div style={{ flex: 1 }}>
          <Label htmlFor="wizard-best-offer" style={{ fontSize: 14, fontWeight: 600, color: DARK, cursor: 'pointer', display: 'block', marginBottom: 3, ...S }}>
            {t('sellListingWizard.openToOffers')}
          </Label>
          <p id="best-offer-desc" style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, ...S }}>
            {t('sellListingWizard.openToOffersHint')}
          </p>
          {form.bestOfferEnabled && (
            <div style={{ marginTop: 12 }}>
              <Label htmlFor="wizard-min-offer" style={{ fontSize: 13, color: MUTED, display: 'block', marginBottom: 6, ...S }}>
                {t('sellListingWizard.minimumOffer')}
              </Label>
              <div style={{ maxWidth: 200 }}>
                <CurrencyAmountInput
                  id="wizard-min-offer"
                  value={Math.floor(parseFloat(form.bestOfferMinPrice) || 0)}
                  onChange={(v) => onFormChange({ bestOfferMinPrice: v === 0 ? '' : String(v) })}
                  currency={currency}
                  min={0}
                  max={form.pricePerTicket > 0 ? Math.floor(form.pricePerTicket) : undefined}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
