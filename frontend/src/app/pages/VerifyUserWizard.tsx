import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { StepPhone } from '@/app/components/become-seller/StepPhone';
import { StepIdentity } from '@/app/components/become-seller/StepIdentity';
import { BackButton } from '@/app/components/BackButton';

export type VerifyUserStepType = 'phone' | 'identity';

export interface VerifyUserLocationState {
  /** Whether the user needs to verify phone */
  verifyPhone?: boolean;
  /** Whether the user needs to verify identity (DNI) */
  verifyIdentity?: boolean;
  /** Where to go after completing the wizard (default: /user-profile) */
  returnTo?: string;
}

function buildSteps(state: VerifyUserLocationState | null): VerifyUserStepType[] {
  if (!state) return [];
  const steps: VerifyUserStepType[] = [];
  if (state.verifyPhone) steps.push('phone');
  if (state.verifyIdentity) steps.push('identity');
  return steps;
}

function getStepLabelKey(step: VerifyUserStepType): string {
  return step === 'phone' ? 'verifyUser.progress.phone' : 'verifyUser.progress.identity';
}

export function VerifyUserWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useUser();

  const state = location.state as VerifyUserLocationState | null;
  const steps = useMemo(() => buildSteps(state), [state?.verifyPhone, state?.verifyIdentity]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex] ?? null;
  const totalSteps = steps.length;
  const returnTo = state?.returnTo ?? '/user-profile';

  // If no steps requested, redirect to profile
  useEffect(() => {
    if (steps.length === 0) {
      navigate(returnTo, { replace: true });
    }
  }, [steps.length, navigate, returnTo]);

  const handleStepComplete = async () => {
    await refreshUser();
    if (currentStepIndex + 1 >= totalSteps) {
      navigate(returnTo, { replace: true });
      return;
    }
    setCurrentStepIndex((i) => i + 1);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (steps.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-lg px-4">
        <div className="mb-4">
          <BackButton className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700" />
        </div>
        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          {t('verifyUser.title')}
        </h1>

        {totalSteps > 1 && (
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-600">
              {t('verifyUser.stepIndicator', {
                current: currentStepIndex + 1,
                total: totalSteps,
              })}
            </p>
            <div className="mt-2 flex gap-2">
              {steps.map((step, index) => (
                <span
                  key={step}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    index < currentStepIndex
                      ? 'bg-green-100 text-green-800'
                      : index === currentStepIndex
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {t(getStepLabelKey(step))}
                </span>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'phone' && (
          <StepPhone onComplete={handleStepComplete} hideBackToProfile />
        )}
        {currentStep === 'identity' && (
          <StepIdentity onComplete={handleStepComplete} />
        )}
      </div>
    </div>
  );
}
