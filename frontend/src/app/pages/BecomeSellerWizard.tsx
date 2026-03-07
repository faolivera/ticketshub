import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { BecomeSellerProgressBar, type WizardStep } from '@/app/components/become-seller/BecomeSellerProgressBar';
import { StepPhone } from '@/app/components/become-seller/StepPhone';
import { StepTerms } from '@/app/components/become-seller/StepTerms';
import { StepIdentity } from '@/app/components/become-seller/StepIdentity';
import { StepBank } from '@/app/components/become-seller/StepBank';
import { Button } from '@/app/components/ui/button';

type WizardStatus = 'steps' | 'completed';

function useWizardState() {
  const { user, refreshUser } = useUser();

  return useMemo(() => {
    if (!user) {
      return { status: 'steps' as const, currentStep: 1 as WizardStep, completedSteps: new Set<WizardStep>(), user, refreshUser };
    }

    const phoneVerified = user.phoneVerified === true;
    const isSeller = user.acceptedSellerTermsAt != null;
    const idStatus = user.identityVerificationStatus;
    const bankStatus = user.bankAccountStatus;
    const identitySubmitted =
      idStatus === 'pending' || idStatus === 'approved' || idStatus === 'rejected';
    const bankSubmitted =
      bankStatus === 'pending' || bankStatus === 'approved';

    // Step order: 1=phone, 2=terms, 3=bank, 4=identity. Wizard is complete when all four are filled (no admin approval required).
    const completedSteps = new Set<WizardStep>();
    if (phoneVerified) completedSteps.add(1);
    if (isSeller) completedSteps.add(2);
    if (bankSubmitted) completedSteps.add(3);
    if (identitySubmitted) completedSteps.add(4);

    const allStepsFilled = isSeller && bankSubmitted && identitySubmitted;
    if (allStepsFilled) {
      return {
        status: 'completed' as const,
        currentStep: 4 as WizardStep,
        completedSteps,
        user,
        refreshUser,
      };
    }

    if (!phoneVerified) {
      return { status: 'steps' as const, currentStep: 1 as WizardStep, completedSteps, user, refreshUser };
    }
    if (!isSeller) {
      return { status: 'steps' as const, currentStep: 2 as WizardStep, completedSteps, user, refreshUser };
    }
    if (!bankSubmitted) {
      return { status: 'steps' as const, currentStep: 3 as WizardStep, completedSteps, user, refreshUser };
    }
    if (!identitySubmitted || idStatus === 'rejected') {
      return { status: 'steps' as const, currentStep: 4 as WizardStep, completedSteps, user, refreshUser };
    }

    return {
      status: 'completed' as const,
      currentStep: 4 as WizardStep,
      completedSteps,
      user,
      refreshUser,
    };
  }, [user, refreshUser]);
}

export function BecomeSellerWizard() {
  const { t } = useTranslation();
  const { status, currentStep, completedSteps, user, refreshUser } = useWizardState();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="mb-2 text-xl font-semibold text-gray-900">
              {t('becomeSeller.completed.title')}
            </h1>
            <p className="mb-6 text-gray-600">
              {t('becomeSeller.completed.message')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link to="/sell-ticket">{t('becomeSeller.completed.goToSell')}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/user-profile">{t('becomeSeller.completed.goToProfile')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-lg px-4">
        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          {t('becomeSeller.title')}
        </h1>
        <div className="mb-8">
          <BecomeSellerProgressBar
            currentStep={currentStep}
            completedSteps={completedSteps}
          />
        </div>

        {currentStep === 1 && (
          <StepPhone
            onComplete={async () => {
              await refreshUser();
            }}
          />
        )}
        {currentStep === 2 && (
          <StepTerms
            onComplete={async () => {
              await refreshUser();
            }}
          />
        )}
        {currentStep === 3 && (
          <StepBank
            onComplete={async () => {
              await refreshUser();
            }}
          />
        )}
        {currentStep === 4 && (
          <StepIdentity
            onComplete={async () => {
              await refreshUser();
            }}
          />
        )}
      </div>
    </div>
  );
}
