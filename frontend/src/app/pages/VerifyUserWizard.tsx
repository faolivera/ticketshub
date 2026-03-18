import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { VerificationHelper } from '@/lib/verification';
import { type WizardStepConfig } from '@/app/components/wizard/WizardProgressBar';
import { StepPhone } from '@/app/components/become-seller/StepPhone';
import { StepIdentity } from '@/app/components/become-seller/StepIdentity';
import { StepBank } from '@/app/components/become-seller/StepBank';
import { ArrowLeft, Check } from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const V      = '#6d28d9';
const VLIGHT = '#f0ebff';
const DARK   = '#0f0f1a';
const MUTED  = '#6b7280';
const BG     = '#f3f3f0';
const BORDER = '#e5e7eb';
const GREEN  = '#15803d';
const S      = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// ─── Types ────────────────────────────────────────────────────────────────────
export type VerifyUserStepType = 'phone' | 'identity' | 'bankAccount';
export interface VerifyUserLocationState {
  verifyPhone?:       boolean;
  verifyIdentity?:    boolean;
  verifyBankAccount?: boolean;
  returnTo?:          string;
}

function buildSteps(state: VerifyUserLocationState | null): VerifyUserStepType[] {
  if (!state) return [];
  const steps: VerifyUserStepType[] = [];
  if (state.verifyPhone)        steps.push('phone');
  if (state.verifyIdentity)     steps.push('identity');
  if (state.verifyBankAccount)  steps.push('bankAccount');
  return steps;
}
const STEP_CONFIG: Record<VerifyUserStepType, WizardStepConfig> = {
  phone:        { id: 'phone',        labelKey: 'verifyUser.progress.phone'        },
  identity:     { id: 'identity',     labelKey: 'verifyUser.progress.identity'     },
  bankAccount:  { id: 'bankAccount',  labelKey: 'verifyUser.progress.bankAccount'  },
};
function buildProgressSteps(stepTypes: VerifyUserStepType[]): WizardStepConfig[] {
  return stepTypes.map(s => STEP_CONFIG[s]);
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({ steps, currentStepIndex, completedStepIndices }: {
  steps: WizardStepConfig[];
  currentStepIndex: number;
  completedStepIndices: Set<number>;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
      {steps.map((step, i) => {
        const done   = completedStepIndices.has(i);
        const active = i === currentStepIndex;
        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, ...S,
                background: done ? GREEN : active ? V : BORDER,
                color: (done || active) ? 'white' : MUTED,
                outline: active ? `3px solid ${VLIGHT}` : 'none',
                outlineOffset: 2, transition: 'all 0.2s',
              }}>
                {done ? <Check size={13} /> : <span>{i + 1}</span>}
              </div>
              <span style={{
                fontSize: 11.5, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', ...S,
                color: active ? DARK : i > currentStepIndex ? '#d1d5db' : MUTED,
              }}>
                {t(step.labelKey)}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 22, background: done ? GREEN : BORDER, transition: 'background 0.2s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2.5px solid ${VLIGHT}`, borderTopColor: V, animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function VerifyUserWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useUser();

  const state         = location.state as VerifyUserLocationState | null;
  const steps         = useMemo(() => {
    const raw = buildSteps(state);
    if (user && !VerificationHelper.isSeller(user)) {
      return raw.filter(s => s !== 'bankAccount');
    }
    return raw;
  }, [state?.verifyPhone, state?.verifyIdentity, state?.verifyBankAccount, user]);
  const progressSteps = useMemo(() => buildProgressSteps(steps), [steps]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = steps[currentStepIndex] ?? null;
  const totalSteps  = steps.length;
  const returnTo    = state?.returnTo ?? '/user-profile';

  const completedStepIndices = useMemo(
    () => new Set(Array.from({ length: currentStepIndex }, (_, i) => i)),
    [currentStepIndex],
  );

  useEffect(() => {
    if (steps.length === 0) navigate(returnTo, { replace: true });
  }, [steps.length, navigate, returnTo]);

  const handleStepComplete = async () => {
    await refreshUser();
    if (currentStepIndex + 1 >= totalSteps) { navigate(returnTo, { replace: true }); return; }
    setCurrentStepIndex(i => i + 1);
  };

  if (!user)          return <Spinner />;
  if (steps.length === 0) return null;

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '24px 16px 48px', ...S }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <button type="button" onClick={() => navigate(returnTo)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: MUTED, padding: '4px 0', marginBottom: 20, transition: 'color 0.14s', ...S }}
          onMouseEnter={e => (e.currentTarget.style.color = DARK)}
          onMouseLeave={e => (e.currentTarget.style.color = MUTED)}
        >
          <ArrowLeft size={15} /> {t('register.back')}
        </button>

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(22px,3vw,28px)', fontWeight: 400, color: DARK, letterSpacing: '-0.4px', marginBottom: 20 }}>
          {t('verifyUser.title')}
        </h1>

        {totalSteps > 1 && (
          <Stepper steps={progressSteps} currentStepIndex={currentStepIndex} completedStepIndices={completedStepIndices} />
        )}

        {currentStep === 'phone'        && <StepPhone    onComplete={handleStepComplete} hideBackToProfile />}
        {currentStep === 'identity'     && <StepIdentity onComplete={handleStepComplete} />}
        {currentStep === 'bankAccount'  && <StepBank     variant="verifyUser" onComplete={handleStepComplete} />}
      </div>
    </div>
  );
}
