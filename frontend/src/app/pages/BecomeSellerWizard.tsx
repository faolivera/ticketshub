import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { VerificationHelper } from '@/lib/verification';
import { StepPhone } from '@/app/components/become-seller/StepPhone';
import { StepTerms } from '@/app/components/become-seller/StepTerms';
import { StepIdentity } from '@/app/components/become-seller/StepIdentity';
import { StepBank } from '@/app/components/become-seller/StepBank';
import { Check, Phone, FileText, CreditCard, Shield, ArrowRight, Clock } from 'lucide-react';
import type { User } from '@/api/types/users';
import {
  V,
  VLIGHT,
  DARK,
  MUTED,
  HINT,
  BG,
  CARD,
  BORDER,
  BORD2,
  GREEN,
  GLIGHT,
  GBORD,
  AMBER_c1,
  ABG,
  ABORD,
  S,
  E,
  R_HERO,
  R_CARD,
  R_BUTTON,
} from '@/lib/design-tokens';

export type WizardStep = 1 | 2 | 3 | 4;
type StepVisual = 'todo' | 'active' | 'verified' | 'pending_review';

function stepVisualStates(user: User, currentStep: WizardStep): Record<WizardStep, StepVisual> {
  const phoneVerified = user.phoneVerified === true;
  const isSeller = user.acceptedSellerTermsAt != null;
  const idStatus = user.identityVerificationStatus;
  const bankStatus = user.bankAccountStatus;
  const bankSubmitted = bankStatus === 'pending' || bankStatus === 'approved';
  const identitySubmitted = idStatus === 'pending' || idStatus === 'approved' || idStatus === 'rejected';
  const bankOk = user.bankDetailsVerified === true || bankStatus === 'approved';
  const identityOk = user.identityVerified === true || idStatus === 'approved';
  const bankPending = bankSubmitted && !bankOk;
  const identityPending = identitySubmitted && idStatus === 'pending' && !identityOk;

  const s = (step: WizardStep): StepVisual => {
    if (step === 1) {
      if (phoneVerified) return 'verified';
      return currentStep === 1 ? 'active' : 'todo';
    }
    if (step === 2) {
      if (!phoneVerified) return 'todo';
      if (isSeller) return 'verified';
      return currentStep === 2 ? 'active' : 'todo';
    }
    if (step === 3) {
      if (!isSeller) return 'todo';
      if (bankOk) return 'verified';
      if (bankPending) return 'pending_review';
      return currentStep === 3 ? 'active' : 'todo';
    }
    if (!bankSubmitted) return 'todo';
    if (identityOk) return 'verified';
    if (identityPending) return 'pending_review';
    return currentStep === 4 ? 'active' : 'todo';
  };

  return { 1: s(1), 2: s(2), 3: s(3), 4: s(4) };
}

type WizardStatus = 'steps' | 'completed';

// ─── Wizard state hook (logic unchanged) ─────────────────────────────────────
function useWizardState() {
  const { user, refreshUser } = useUser();

  return useMemo(() => {
    if (!user) {
      return { status: 'steps' as const, currentStep: 1 as WizardStep, completedSteps: new Set<WizardStep>(), user, refreshUser };
    }

    const phoneVerified     = user.phoneVerified === true;
    const isSeller          = user.acceptedSellerTermsAt != null;
    const idStatus          = user.identityVerificationStatus;
    const bankStatus        = user.bankAccountStatus;
    const identitySubmitted = idStatus === 'pending' || idStatus === 'approved' || idStatus === 'rejected';
    const bankSubmitted     = bankStatus === 'pending' || bankStatus === 'approved';

    const completedSteps = new Set<WizardStep>();
    if (phoneVerified)     completedSteps.add(1);
    if (isSeller)          completedSteps.add(2);
    if (bankSubmitted)     completedSteps.add(3);
    if (identitySubmitted) completedSteps.add(4);

    const allStepsFilled = isSeller && bankSubmitted && identitySubmitted;
    if (allStepsFilled) return { status: 'completed' as const, currentStep: 4 as WizardStep, completedSteps, user, refreshUser };
    if (!phoneVerified)  return { status: 'steps' as const, currentStep: 1 as WizardStep, completedSteps, user, refreshUser };
    if (!isSeller)       return { status: 'steps' as const, currentStep: 2 as WizardStep, completedSteps, user, refreshUser };
    if (!bankSubmitted)  return { status: 'steps' as const, currentStep: 3 as WizardStep, completedSteps, user, refreshUser };
    if (!identitySubmitted || idStatus === 'rejected') return { status: 'steps' as const, currentStep: 4 as WizardStep, completedSteps, user, refreshUser };

    return { status: 'completed' as const, currentStep: 4 as WizardStep, completedSteps, user, refreshUser };
  }, [user, refreshUser]);
}

// ─── Step config ─────────────────────────────────────────────────────────────
const STEP_META: Record<WizardStep, {
  icon: ReactNode;
  labelKey: string;
}> = {
  1: { icon: <Phone    size={14} />, labelKey: 'becomeSeller.progress.phone'    },
  2: { icon: <FileText size={14} />, labelKey: 'becomeSeller.progress.terms'    },
  3: { icon: <CreditCard size={14}/>, labelKey: 'becomeSeller.progress.bank'    },
  4: { icon: <Shield   size={14} />, labelKey: 'becomeSeller.progress.identity' },
};

// ─── Horizontal step track ────────────────────────────────────────────────────
function StepTrack({ currentStep, visualByStep }: { currentStep: WizardStep; visualByStep: Record<WizardStep, StepVisual> }) {
  const { t } = useTranslation();
  const steps = [1, 2, 3, 4] as WizardStep[];

  const segmentColor = (_from: WizardStep, to: WizardStep): string => {
    const next = visualByStep[to];
    if (next === 'verified') return GREEN;
    if (next === 'pending_review') return AMBER_c1;
    return BORDER;
  };

  return (
    <div style={{ background: CARD, borderRadius: R_CARD, border: `1px solid ${BORDER}`, padding: '18px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {steps.map((step, i) => {
          const vis = visualByStep[step];
          const active = vis === 'active';
          const isTodo = vis === 'todo';

          let bg: string;
          let fg: string;
          let node: ReactNode;
          if (vis === 'verified') {
            bg = GREEN;
            fg = 'white';
            node = <Check size={14} />;
          } else if (vis === 'pending_review') {
            bg = AMBER_c1;
            fg = 'white';
            node = <Clock size={14} />;
          } else if (vis === 'active') {
            bg = V;
            fg = 'white';
            node = STEP_META[step].icon;
          } else {
            bg = BORDER;
            fg = MUTED;
            node = STEP_META[step].icon;
          }

          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: bg,
                  color: fg,
                  outline: active ? `3px solid ${VLIGHT}` : 'none',
                  outlineOffset: 2, transition: 'all 0.2s',
                }}>
                  {node}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
                  color: active ? DARK : vis === 'pending_review' ? AMBER_c1 : isTodo ? '#d1d5db' : MUTED, ...S,
                }}>
                  {t(STEP_META[step].labelKey)}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 22, background: segmentColor(step, steps[i + 1]), transition: 'background 0.2s' }} />
              )}
            </div>
          );
        })}
      </div>
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
export function BecomeSellerWizard() {
  const { t } = useTranslation();
  const { status, currentStep, completedSteps, user, refreshUser } = useWizardState();

  if (!user) return <Spinner />;

  // ── Completed ─────────────────────────────────────────────────────────────
  if (status === 'completed') {
    const payoutReady = VerificationHelper.canReceivePayout(user);
    const bankOk = user.bankDetailsVerified === true || user.bankAccountStatus === 'approved';
    const identityOk = user.identityVerified === true || user.identityVerificationStatus === 'approved';

    const row = (step: WizardStep) => {
      let icon: ReactNode;
      let wrapBg: string;
      let wrapBorder: string;
      if (step <= 2 || (step === 3 && bankOk) || (step === 4 && identityOk)) {
        wrapBg = GLIGHT;
        wrapBorder = GBORD;
        icon = <Check size={13} style={{ color: GREEN }} />;
      } else {
        wrapBg = ABG;
        wrapBorder = ABORD;
        icon = <Clock size={13} style={{ color: AMBER_c1 }} />;
      }
      const showPendingLabel = (step === 3 && !bankOk) || (step === 4 && !identityOk);
      return (
        <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: step < 4 ? `1px solid ${BORDER}` : 'none' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: wrapBg, border: `1.5px solid ${wrapBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK, ...S }}>{t(STEP_META[step].labelKey)}</span>
            {showPendingLabel && !payoutReady && (
              <p style={{ fontSize: 11.5, fontWeight: 600, color: AMBER_c1, marginTop: 2, ...S }}>{t('becomeSeller.completed.pendingReviewLabel')}</p>
            )}
          </div>
        </div>
      );
    };

    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '24px 16px 48px', ...S }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ background: CARD, borderRadius: R_HERO, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{
              background: payoutReady ? GLIGHT : ABG,
              borderBottom: `1px solid ${payoutReady ? GBORD : ABORD}`,
              padding: '24px 24px 20px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: payoutReady ? GLIGHT : ABG,
                border: `2px solid ${payoutReady ? GBORD : ABORD}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
              }}>
                {payoutReady ? <Check size={26} style={{ color: GREEN }} /> : <Clock size={26} style={{ color: AMBER_c1 }} />}
              </div>
              <h1 style={{ ...E, fontSize: 24, fontWeight: 400, color: DARK, letterSpacing: '-0.3px', marginBottom: 8 }}>
                {payoutReady ? t('becomeSeller.completed.verifiedTitle') : t('becomeSeller.completed.title')}
              </h1>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, ...S }}>
                {payoutReady ? t('becomeSeller.completed.verifiedMessage') : t('becomeSeller.completed.message')}
              </p>
            </div>

            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
              {([1, 2, 3, 4] as WizardStep[]).map(s => row(s))}
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/sell-ticket" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '13px', borderRadius: R_BUTTON, border: 'none',
                  background: V, color: 'white', fontSize: 14.5, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 4px 18px rgba(105,45,212,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...S,
                }}>
                  {t('becomeSeller.completed.goToSell')} <ArrowRight size={16} />
                </button>
              </Link>
              <Link to="/user-profile" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '12px', borderRadius: R_BUTTON,
                  border: `1.5px solid ${BORD2}`, background: CARD,
                  color: DARK, fontSize: 14, fontWeight: 600, cursor: 'pointer', ...S,
                }}>
                  {t('becomeSeller.completed.goToProfile')}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Steps ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '24px 16px 48px', ...S }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <h1 style={{
          ...E,
          fontSize: 'clamp(22px,3vw,28px)',
          fontWeight: 400, color: DARK,
          letterSpacing: '-0.4px', marginBottom: 20,
        }}>
          {t('becomeSeller.title')}
        </h1>

        <StepTrack currentStep={currentStep} visualByStep={stepVisualStates(user, currentStep)} />

        {currentStep === 1 && <StepPhone    onComplete={async () => { await refreshUser(); }} hideBackToProfile />}
        {currentStep === 2 && <StepTerms    onComplete={async () => { await refreshUser(); }} />}
        {currentStep === 3 && <StepBank     onComplete={async () => { await refreshUser(); }} />}
        {currentStep === 4 && <StepIdentity onComplete={async () => { await refreshUser(); }} />}

      </div>
    </div>
  );
}
