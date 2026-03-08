import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

export interface WizardStepConfig {
  id: string;
  labelKey: string;
}

export interface WizardProgressBarProps {
  steps: WizardStepConfig[];
  currentStepIndex: number;
  completedStepIndices: Set<number>;
}

/**
 * Reusable step progress bar for wizards (e.g. become-seller, verify-user).
 * Renders horizontal steps with circles (number or check), connecting lines, and labels.
 */
export function WizardProgressBar({
  steps,
  currentStepIndex,
  completedStepIndices,
}: WizardProgressBarProps) {
  const { t } = useTranslation();

  if (steps.length === 0) return null;

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between gap-1">
        {steps.map((step, index) => {
          const isCompleted = completedStepIndices.has(index);
          const isCurrent = index === currentStepIndex;
          const isPast = index < currentStepIndex;
          const displayNumber = index + 1;

          return (
            <li
              key={step.id}
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
                    displayNumber
                  )}
                </div>
                {index < steps.length - 1 && (
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
                {t(step.labelKey)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
