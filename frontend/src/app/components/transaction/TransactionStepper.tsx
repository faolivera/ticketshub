import { Fragment } from 'react';
import { AlertCircle, Check, Clock } from 'lucide-react';
import { V, VLIGHT, GREEN, BORDER, BORD2, MUTED, DARK, WARN_SOLID, AMBER_BG_LIGHT, S } from '@/lib/design-tokens';
import type { TransactionStepperProps } from './types';
import { transactionCurrentStep, transactionStepNeedsAction } from './types';

export function TransactionStepper({
  effectiveStatus,
  disputed,
  role,
  labels,
}: TransactionStepperProps) {
  if (disputed) return null;

  const current = transactionCurrentStep(effectiveStatus, role);
  const needsAction = transactionStepNeedsAction(effectiveStatus, role);

  return (
    <div className="mb-6 w-full" style={S}>
      <div className="flex w-full items-start">
        {labels.map((label, i) => (
          <Fragment key={label}>
            {i > 0 && (
              <div
                className="mt-4 h-0.5 min-w-[8px] flex-1 self-start"
                style={{ background: current >= i ? GREEN : BORDER }}
                aria-hidden
              />
            )}
            <div className={`flex shrink-0 flex-col items-center ${labels.length >= 5 ? 'w-[54px] sm:w-[80px]' : 'w-[68px] sm:w-[80px]'}`}>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: i < current ? GREEN : i === current ? (needsAction ? WARN_SOLID : V) : BORD2,
                  color: i <= current ? '#fff' : MUTED,
                  boxShadow: i === current
                    ? `0 0 0 4px ${needsAction ? AMBER_BG_LIGHT : VLIGHT}`
                    : undefined,
                }}
              >
                {i < current ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : i === current && needsAction ? (
                  <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                  <Clock className="h-3.5 w-3.5" />
                )}
              </div>
              <span
                className="mt-2 text-center text-[10px] font-semibold leading-tight sm:text-xs"
                style={{ color: i > current ? MUTED : DARK }}
              >
                {label}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
