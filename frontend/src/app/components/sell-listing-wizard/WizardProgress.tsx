import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import {
  WIZARD_TOTAL_STEPS,
  type WizardStepIndex,
} from './types';

const STEP_KEYS = [
  'sellListingWizard.stepEvent',
  'sellListingWizard.stepDate',
  'sellListingWizard.stepZoneSeats',
  'sellListingWizard.stepPrice',
  'sellListingWizard.stepDelivery',
  'sellListingWizard.stepReview',
] as const;

interface WizardProgressProps {
  currentStep: WizardStepIndex;
  /** Desktop: show full stepper. Mobile: show bar + step label only */
  isMobile: boolean;
}

export const WizardProgress: FC<WizardProgressProps> = ({ currentStep, isMobile }) => {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <div
        className="w-full px-4 py-3 bg-muted/50 border-b"
        role="status"
        aria-live="polite"
        aria-label={t('sellListingWizard.progressStep', {
          current: currentStep + 1,
          total: WIZARD_TOTAL_STEPS,
        })}
      >
        <div className="flex gap-0.5 mb-2">
          {WIZARD_TOTAL_STEPS > 0 &&
            Array.from({ length: WIZARD_TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i < currentStep && 'bg-primary',
                  i === currentStep && 'bg-primary',
                  i > currentStep && 'bg-muted'
                )}
              />
            ))}
        </div>
        <p className="text-sm font-medium text-foreground">
          {t('sellListingWizard.progressStep', {
            current: currentStep + 1,
            total: WIZARD_TOTAL_STEPS,
          })}
          {' · '}
          {t(STEP_KEYS[currentStep])}
        </p>
      </div>
    );
  }

  return (
    <nav
      aria-label={t('sellListingWizard.progressStep', {
        current: currentStep + 1,
        total: WIZARD_TOTAL_STEPS,
      })}
      className="border-b pb-6"
    >
      <ol className="flex flex-wrap items-center justify-between gap-2">
        {STEP_KEYS.map((key, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          return (
            <li
              key={key}
              className={cn(
                'flex items-center gap-2 min-w-0',
                index < WIZARD_TOTAL_STEPS - 1 && 'flex-1'
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'truncate text-sm font-medium',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {t(key)}
              </span>
              {index < WIZARD_TOTAL_STEPS - 1 && (
                <span
                  className="mx-1 h-px flex-1 min-w-[8px] bg-border"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
