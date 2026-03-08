import { useMemo } from 'react';
import { WizardProgressBar, type WizardStepConfig } from '@/app/components/wizard/WizardProgressBar';

export type WizardStep = 1 | 2 | 3 | 4;

export interface BecomeSellerProgressBarProps {
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
}

const BECOME_SELLER_STEPS: WizardStepConfig[] = [
  { id: 'phone', labelKey: 'becomeSeller.progress.phone' },
  { id: 'terms', labelKey: 'becomeSeller.progress.terms' },
  { id: 'bank', labelKey: 'becomeSeller.progress.bank' },
  { id: 'identity', labelKey: 'becomeSeller.progress.identity' },
];

export function BecomeSellerProgressBar({
  currentStep,
  completedSteps,
}: BecomeSellerProgressBarProps) {
  const currentStepIndex = currentStep - 1;
  const completedStepIndices = useMemo(
    () => new Set([...completedSteps].map((s) => s - 1)),
    [completedSteps],
  );

  return (
    <WizardProgressBar
      steps={BECOME_SELLER_STEPS}
      currentStepIndex={currentStepIndex}
      completedStepIndices={completedStepIndices}
    />
  );
}
