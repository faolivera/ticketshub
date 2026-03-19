import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  WIZARD_TOTAL_STEPS,
  type WizardStepIndex,
} from './types';
import { V, VLIGHT, DARK, MUTED, HINT, BORDER, CARD, S } from '@/lib/design-tokens';

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
  isMobile: boolean;
}

export const WizardProgress: FC<WizardProgressProps> = ({ currentStep, isMobile }) => {
  const { t } = useTranslation();

  const stepLabel = `${t('sellListingWizard.progressStep', {
    current: currentStep + 1,
    total: WIZARD_TOTAL_STEPS,
  })} · ${t(STEP_KEYS[currentStep])}`;

  // ── Mobile: thin progress bar ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={stepLabel}
        style={{ padding: '10px 0 8px' }}
      >
        {/* Bar */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
          {Array.from({ length: WIZARD_TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= currentStep ? V : BORDER,
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
        {/* Label */}
        <p style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, ...S }}>
          {stepLabel}
        </p>
      </div>
    );
  }

  // ── Desktop: circle stepper ────────────────────────────────────────────────
  return (
    <nav
      aria-label={stepLabel}
      style={{ paddingBottom: 20, borderBottom: `1px solid ${BORDER}` }}
    >
      {/* Circles + connectors */}
      <ol style={{ display: 'flex', alignItems: 'center', listStyle: 'none', gap: 0, margin: 0, padding: 0 }}>
        {STEP_KEYS.map((key, index) => {
          const isCompleted = index < currentStep;
          const isCurrent   = index === currentStep;
          const isFuture    = index > currentStep;

          return (
            <li
              key={key}
              aria-current={isCurrent ? 'step' : undefined}
              style={{ display: 'flex', alignItems: 'center', flex: index < WIZARD_TOTAL_STEPS - 1 ? 1 : 'none' }}
            >
              {/* Circle */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                background: isCompleted ? V : isCurrent ? V : 'transparent',
                border: `2px solid ${isCompleted ? V : isCurrent ? V : BORDER}`,
                color: isCompleted || isCurrent ? CARD : HINT,
                transition: 'all 0.2s',
                ...S,
              }}>
                {isCompleted
                  ? <Check size={14} strokeWidth={2.5} color={CARD} />
                  : index + 1
                }
              </div>

              {/* Connector line */}
              {index < WIZARD_TOTAL_STEPS - 1 && (
                <div style={{
                  flex: 1, height: 2, marginLeft: 4, marginRight: 4,
                  background: isCompleted ? V : BORDER,
                  borderRadius: 1,
                  transition: 'background 0.2s',
                }} />
              )}
            </li>
          );
        })}
      </ol>

      {/* Step label */}
      <p style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: MUTED, ...S }}>
        {stepLabel}
      </p>
    </nav>
  );
};
