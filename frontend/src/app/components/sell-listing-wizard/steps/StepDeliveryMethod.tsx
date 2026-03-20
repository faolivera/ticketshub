import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Package } from 'lucide-react';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import type { WizardFormState } from '../types';
import { cn } from '@/app/components/ui/utils';
import { V, VLIGHT, DARK, MUTED, HINT, BORDER, CARD, BG, S } from '@/lib/design-tokens';
import { stepHeadingStyle, stepDescStyle } from '../wizardTokens';

interface StepDeliveryMethodProps {
  form: WizardFormState;
  onFormChange: (patch: Partial<WizardFormState>) => void;
}

export const StepDeliveryMethod: FC<StepDeliveryMethodProps> = ({ form, onFormChange }) => {
  const { t } = useTranslation();

  return (
    <div role="group" aria-label={t('sellListingWizard.deliveryStep')}>
      <h2 style={stepHeadingStyle}>{t('sellListingWizard.deliveryStep')}</h2>
      <p style={stepDescStyle}>{t('sellListingWizard.deliveryStepDescription')}</p>

      <RadioGroup
        value={form.deliveryMethod}
        onValueChange={(value: 'digital' | 'physical') =>
          onFormChange({
            deliveryMethod: value,
            physicalDeliveryMethod: value === 'physical' ? form.physicalDeliveryMethod : '',
            pickupCity: value === 'physical' ? form.pickupCity : '',
            pickupStreet: value === 'physical' ? form.pickupStreet : '',
          })
        }
        className="grid gap-3 md:grid-cols-2"
        aria-label={t('sellListingWizard.deliveryStep')}
      >
        <Label
          htmlFor="delivery-digital"
          className={cn(
            'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors',
            form.deliveryMethod === 'digital'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          )}
        >
          <RadioGroupItem value="digital" id="delivery-digital" />
          <Smartphone className="h-8 w-8 shrink-0" style={{ color: V }} />
          <div>
            <p style={{ fontWeight: 700, color: DARK, fontSize: 14, marginBottom: 2, ...S }}>{t('sellListingWizard.digital')}</p>
            <p style={{ fontSize: 13, color: MUTED, ...S }}>{t('sellTicket.digitalDesc')}</p>
          </div>
        </Label>

        <Label
          htmlFor="delivery-physical"
          className={cn(
            'flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors',
            form.deliveryMethod === 'physical'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          )}
        >
          <RadioGroupItem value="physical" id="delivery-physical" />
          <Package className="h-8 w-8 shrink-0" style={{ color: V }} />
          <div>
            <p style={{ fontWeight: 700, color: DARK, fontSize: 14, marginBottom: 2, ...S }}>{t('sellListingWizard.physical')}</p>
            <p style={{ fontSize: 13, color: MUTED, ...S }}>{t('sellTicket.physicalDesc')}</p>
          </div>
        </Label>
      </RadioGroup>

      {form.deliveryMethod === 'physical' && (
        <div style={{ marginTop: 20 }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK, marginBottom: 12, ...S }}>
            {t('sellTicket.howToDeliver')}
          </p>
          <RadioGroup
            value={form.physicalDeliveryMethod}
            onValueChange={(value: 'pickup' | 'arrange') =>
              onFormChange({
                physicalDeliveryMethod: value,
                pickupCity: value === 'arrange' ? '' : form.pickupCity,
                pickupStreet: value === 'arrange' ? '' : form.pickupStreet,
              })
            }
            className="grid gap-3 md:grid-cols-2"
          >
            <Label
              htmlFor="physical-pickup"
              className={cn(
                'flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                form.physicalDeliveryMethod === 'pickup'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="pickup" id="physical-pickup" />
                <span style={{ fontWeight: 700, color: DARK, fontSize: 14, ...S }}>{t('sellTicket.pickup')}</span>
              </div>
              <span style={{ fontSize: 13, color: MUTED, ...S }}>{t('sellTicket.pickupAddressDesc')}</span>
            </Label>
            <Label
              htmlFor="physical-arrange"
              className={cn(
                'flex flex-col gap-1 p-4 rounded-xl border-2 cursor-pointer transition-colors',
                form.physicalDeliveryMethod === 'arrange'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="arrange" id="physical-arrange" />
                <span style={{ fontWeight: 700, color: DARK, fontSize: 14, ...S }}>{t('sellTicket.arrangeWithBuyerShort')}</span>
              </div>
              <span style={{ fontSize: 13, color: MUTED, ...S }}>{t('sellTicket.arrangeWithBuyerDesc')}</span>
            </Label>
          </RadioGroup>

          {form.physicalDeliveryMethod === 'pickup' && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Label htmlFor="wizard-pickup-city" style={{ fontSize: 13.5, fontWeight: 600, color: DARK, display: 'block', marginBottom: 6, ...S }}>
                  {t('sellListingWizard.pickupCity')} <span style={{ color: '#dc2626' }}>*</span>
                </Label>
                <Input
                  id="wizard-pickup-city"
                  value={form.pickupCity}
                  onChange={(e) => onFormChange({ pickupCity: e.target.value })}
                  className="min-h-[44px]"
                  aria-describedby={(!form.pickupCity.trim() || !form.pickupStreet.trim()) ? 'pickup-error' : undefined}
                />
              </div>
              <div>
                <Label htmlFor="wizard-pickup-street" style={{ fontSize: 13.5, fontWeight: 600, color: DARK, display: 'block', marginBottom: 6, ...S }}>
                  {t('sellListingWizard.pickupStreet')} <span style={{ color: '#dc2626' }}>*</span>
                </Label>
                <Input
                  id="wizard-pickup-street"
                  value={form.pickupStreet}
                  onChange={(e) => onFormChange({ pickupStreet: e.target.value })}
                  className="min-h-[44px]"
                  aria-describedby={(!form.pickupCity.trim() || !form.pickupStreet.trim()) ? 'pickup-error' : undefined}
                />
              </div>
              {(!form.pickupCity.trim() || !form.pickupStreet.trim()) && (
                <p id="pickup-error" style={{ fontSize: 12.5, color: MUTED, marginTop: 4, ...S }}>
                  {t('sellListingWizard.enterPickupAddress')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
