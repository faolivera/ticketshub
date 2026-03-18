import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { StepPhone } from '@/app/components/become-seller/StepPhone';
import { StepTerms } from '@/app/components/become-seller/StepTerms';
import { StepIdentity } from '@/app/components/become-seller/StepIdentity';
import { StepBank } from '@/app/components/become-seller/StepBank';
import { Check, Phone, FileText, CreditCard, Shield, ArrowRight } from 'lucide-react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const V      = '#6d28d9';
const VLIGHT = '#f0ebff';
const DARK   = '#0f0f1a';
const MUTED  = '#6b7280';
const HINT   = '#9ca3af';
const BG     = '#f3f3f0';
const CARD   = '#ffffff';
const BORDER = '#e5e7eb';
const BORD2  = '#d1d5db';
const GREEN  = '#15803d';
const GLIGHT = '#f0fdf4';
const GBORD  = '#bbf7d0';
const S      = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// ─── Types (unchanged) ────────────────────────────────────────────────────────
export type WizardStep = 1 | 2 | 3 | 4;
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
  icon: React.ReactNode;
  labelKey: string;
}> = {
  1: { icon: <Phone    size={14} />, labelKey: 'becomeSeller.progress.phone'    },
  2: { icon: <FileText size={14} />, labelKey: 'becomeSeller.progress.terms'    },
  3: { icon: <CreditCard size={14}/>, labelKey: 'becomeSeller.progress.bank'    },
  4: { icon: <Shield   size={14} />, labelKey: 'becomeSeller.progress.identity' },
};

// ─── Horizontal step track ────────────────────────────────────────────────────
function StepTrack({ currentStep, completedSteps }: { currentStep: WizardStep; completedSteps: Set<WizardStep> }) {
  const { t } = useTranslation();
  const steps = [1, 2, 3, 4] as WizardStep[];

  return (
    <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, padding: '18px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {steps.map((step, i) => {
          const done    = completedSteps.has(step);
          const active  = step === currentStep;
          const pending = !done && !active;

          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? GREEN : active ? V : BORDER,
                  color: (done || active) ? 'white' : MUTED,
                  outline: active ? `3px solid ${VLIGHT}` : 'none',
                  outlineOffset: 2, transition: 'all 0.2s',
                }}>
                  {done ? <Check size={14} /> : STEP_META[step].icon}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap',
                  color: active ? DARK : pending ? '#d1d5db' : MUTED, ...S,
                }}>
                  {t(STEP_META[step].labelKey)}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 22, background: completedSteps.has(steps[i + 1]) || done ? GREEN : BORDER, transition: 'background 0.2s' }} />
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
    return (
      <div style={{ minHeight: '100vh', background: BG, padding: '24px 16px 48px', ...S }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Completed header */}
            <div style={{ background: GLIGHT, borderBottom: `1px solid ${GBORD}`, padding: '24px 24px 20px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: GLIGHT, border: `2px solid ${GBORD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Check size={26} style={{ color: GREEN }} />
              </div>
              <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 400, color: DARK, letterSpacing: '-0.3px', marginBottom: 8 }}>
                {t('becomeSeller.completed.title')}
              </h1>
              <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, ...S }}>
                {t('becomeSeller.completed.message')}
              </p>
            </div>

            {/* All steps confirmed */}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BORDER}` }}>
              {([1, 2, 3, 4] as WizardStep[]).map(step => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: step < 4 ? `1px solid ${BORDER}` : 'none' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: GLIGHT, border: `1.5px solid ${GBORD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={13} style={{ color: GREEN }} />
                  </div>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK, ...S }}>{t(STEP_META[step].labelKey)}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link to="/sell-ticket" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '13px', borderRadius: 11, border: 'none',
                  background: V, color: 'white', fontSize: 14.5, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 4px 18px rgba(109,40,217,0.28)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...S,
                }}>
                  {t('becomeSeller.completed.goToSell')} <ArrowRight size={16} />
                </button>
              </Link>
              <Link to="/user-profile" style={{ textDecoration: 'none' }}>
                <button style={{
                  width: '100%', padding: '12px', borderRadius: 11,
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
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 'clamp(22px,3vw,28px)',
          fontWeight: 400, color: DARK,
          letterSpacing: '-0.4px', marginBottom: 20,
        }}>
          {t('becomeSeller.title')}
        </h1>

        <StepTrack currentStep={currentStep} completedSteps={completedSteps} />

        {currentStep === 1 && <StepPhone    onComplete={async () => { await refreshUser(); }} hideBackToProfile />}
        {currentStep === 2 && <StepTerms    onComplete={async () => { await refreshUser(); }} />}
        {currentStep === 3 && <StepBank     onComplete={async () => { await refreshUser(); }} />}
        {currentStep === 4 && <StepIdentity onComplete={async () => { await refreshUser(); }} />}

      </div>
    </div>
  );
}
