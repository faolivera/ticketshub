import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

export type WizardStep = 1 | 2 | 3 | 4;

export interface BecomeSellerProgressBarProps {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
}

const STEPS: WizardStep[] = [1, 2, 3, 4];

export function BecomeSellerProgressBar({
  currentStep,
  completedSteps,
}: BecomeSellerProgressBarProps) {
  const { t } = useTranslation();
  const labels: Record<WizardStep, string> = {
    1: t('becomeSeller.progress.phone'),
    2: t('becomeSeller.progress.terms'),
    3: t('becomeSeller.progress.bank'),
    4: t('becomeSeller.progress.identity'),
  };

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.has(step);
          const isCurrent = step === currentStep;
          const isPast = step < currentStep;
          const isClickable = isPast || isCurrent;

          return (
            <li
              key={step}
              className="flex flex-1 flex-col items-center"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                    aria-hidden
                  />
                )}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                    isCompleted
                      ? 'border-green-600 bg-green-600 text-white'
                      : isCurrent
                        ? 'border-blue-600 bg-blue-50 text-blue-600'
                        : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    step
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      isPast || isCompleted ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                    aria-hidden
                  />
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium sm:text-sm ${
                  isCurrent
                    ? 'text-blue-600'
                    : isCompleted
                      ? 'text-green-700'
                      : 'text-gray-500'
                }`}
              >
                {labels[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
