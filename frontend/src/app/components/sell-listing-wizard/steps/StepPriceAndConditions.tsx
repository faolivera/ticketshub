import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
import { CurrencyAmountInput } from '@/app/components/ui/CurrencyAmountInput';
import type { WizardFormState } from '../types';

interface StepPriceAndConditionsProps {
  form: WizardFormState;
  onFormChange: (patch: Partial<WizardFormState>) => void;
  currency: string;
  sellerPlatformFeePercent: number;
  /** Optional: promotion fee override */
  effectiveFeePercent?: number;
  promotionName?: string;
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

  const ticketCount =
    form.seatingType === 'numbered'
      ? form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim()).length
      : form.quantity;

  return (
    <div className="space-y-6" role="group" aria-label={t('sellListingWizard.priceAndConditions')}>
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {t('sellListingWizard.priceAndConditions')}
        </h2>
      </div>

      <div>
        <Label htmlFor="wizard-price" className="text-sm font-medium">
          {t('sellListingWizard.pricePerTicket')} <span className="text-destructive">*</span>
        </Label>
        <div className="mt-2">
          <CurrencyAmountInput
            id="wizard-price"
            value={Math.floor(form.pricePerTicket) || 0}
            onChange={(v) => onFormChange({ pricePerTicket: v })}
            currency={currency}
            min={0}
            aria-invalid={form.pricePerTicket <= 0}
            aria-describedby={form.pricePerTicket <= 0 ? 'price-error' : undefined}
          />
        </div>
        {form.pricePerTicket <= 0 && (
          <p id="price-error" className="text-sm text-destructive mt-1" role="alert">
            {t('sellListingWizard.enterValidPrice')}
          </p>
        )}
      </div>

      <div className="flex items-start gap-4 rounded-lg border p-4">
        <Switch
          id="wizard-best-offer"
          checked={form.bestOfferEnabled}
          onCheckedChange={(checked) => onFormChange({ bestOfferEnabled: checked })}
          aria-describedby="best-offer-desc"
        />
        <div className="flex-1">
          <Label htmlFor="wizard-best-offer" className="font-medium cursor-pointer">
            {t('sellListingWizard.openToOffers')}
          </Label>
          <p id="best-offer-desc" className="text-sm text-muted-foreground mt-1">
            {t('sellListingWizard.openToOffersHint')}
          </p>
          {form.bestOfferEnabled && (
            <div className="mt-3">
              <Label htmlFor="wizard-min-offer" className="text-sm">
                {t('sellListingWizard.minimumOffer')}
              </Label>
              <div className="mt-1 max-w-[200px]">
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
}
