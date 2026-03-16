import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/app/components/ui/input';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
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
        <div className="mt-2 flex rounded-lg border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
          <span className="flex items-center pl-4 pr-2 text-muted-foreground font-medium border-r bg-muted/50 min-w-[3rem]">
            {currency === 'ARS' ? '$' : currency}
          </span>
          <Input
            id="wizard-price"
            type="number"
            min={0}
            step="0.01"
            value={form.pricePerTicket || ''}
            onChange={(e) =>
              onFormChange({ pricePerTicket: parseFloat(e.target.value) || 0 })
            }
            className="border-0 rounded-none focus-visible:ring-0 min-h-[44px] text-base"
            placeholder="0.00"
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
              <Input
                id="wizard-min-offer"
                type="number"
                min={0}
                max={form.pricePerTicket || undefined}
                step="0.01"
                value={form.bestOfferMinPrice}
                onChange={(e) => onFormChange({ bestOfferMinPrice: e.target.value })}
                className="mt-1 max-w-[160px] min-h-[44px]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
