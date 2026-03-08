import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Smartphone, Package } from 'lucide-react';
import { Label } from '@/app/components/ui/label';
import { Input } from '@/app/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import type { WizardFormState } from '../types';
import { cn } from '@/app/components/ui/utils';

interface StepDeliveryMethodProps {
  form: WizardFormState;
  onFormChange: (patch: Partial<WizardFormState>) => void;
}

export const StepDeliveryMethod: FC<StepDeliveryMethodProps> = ({ form, onFormChange }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6" role="group" aria-label={t('sellListingWizard.deliveryStep')}>
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {t('sellListingWizard.deliveryStep')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('sellListingWizard.deliveryStepDescription')}
        </p>
      </div>

      <RadioGroup
        value={form.deliveryMethod}
        onValueChange={(value: 'digital' | 'physical') =>
          onFormChange({
            deliveryMethod: value,
            physicalDeliveryMethod: value === 'physical' ? form.physicalDeliveryMethod : '',
            pickupAddress: value === 'physical' ? form.pickupAddress : '',
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
          <Smartphone className="h-8 w-8 text-primary shrink-0" />
          <div>
            <p className="font-medium text-foreground">{t('sellListingWizard.digital')}</p>
            <p className="text-sm text-muted-foreground">{t('sellTicket.digitalDesc')}</p>
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
          <Package className="h-8 w-8 text-primary shrink-0" />
          <div>
            <p className="font-medium text-foreground">{t('sellListingWizard.physical')}</p>
            <p className="text-sm text-muted-foreground">{t('sellTicket.physicalDesc')}</p>
          </div>
        </Label>
      </RadioGroup>

      {form.deliveryMethod === 'physical' && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">{t('sellTicket.howToDeliver')}</p>
          <RadioGroup
            value={form.physicalDeliveryMethod}
            onValueChange={(value: 'pickup' | 'arrange') =>
              onFormChange({
                physicalDeliveryMethod: value,
                pickupAddress: value === 'arrange' ? '' : form.pickupAddress,
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
                <span className="font-medium">{t('sellTicket.pickup')}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t('sellTicket.pickupAddressDesc')}</span>
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
                <span className="font-medium">{t('sellTicket.arrangeWithBuyerShort')}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t('sellTicket.arrangeWithBuyerDesc')}</span>
            </Label>
          </RadioGroup>

          {form.physicalDeliveryMethod === 'pickup' && (
            <div className="space-y-2">
              <Label htmlFor="wizard-pickup-address" className="text-sm font-medium">
                {t('sellListingWizard.pickupAddress')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="wizard-pickup-address"
                value={form.pickupAddress}
                onChange={(e) => onFormChange({ pickupAddress: e.target.value })}
                placeholder={t('sellListingWizard.pickupAddressPlaceholder')}
                className="min-h-[44px]"
                aria-describedby={!form.pickupAddress.trim() ? 'pickup-error' : undefined}
              />
              {!form.pickupAddress.trim() && (
                <p id="pickup-error" className="text-sm text-muted-foreground">
                  {t('sellListingWizard.enterPickupAddress')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
