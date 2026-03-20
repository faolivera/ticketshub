import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { usersService } from '@/api/services/users.service';
import type { MyBankAccount } from '@/api/types/users';
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
  ABG,
  ABORD,
  VL_BORDER,
  WARN_SOLID,
  ERROR_BG,
  BADGE_DEMAND_BORDER,
  DESTRUCTIVE,
  V_HOVER,
  S,
} from '@/lib/design-tokens';

const CBU_CVU_LENGTH = 22;

export type StepBankVariant = 'becomeSeller' | 'verifyUser';

export interface StepBankProps {
  onComplete: () => void;
  /** becomeSeller: after save or if data exists, CTA to sell. verifyUser: continue wizard / profile flow. */
  variant?: StepBankVariant;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, ...S }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 12, color: HINT, marginTop: 5, lineHeight: 1.4, ...S }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, inputMode, mono }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  mono?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      inputMode={inputMode}
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      maxLength={inputMode === 'numeric' ? CBU_CVU_LENGTH : undefined}
      style={{
        width: '100%', padding: '12px 14px',
        border: `1.5px solid ${focused ? V : BORD2}`,
        borderRadius: 11, fontSize: 14, color: DARK,
        background: CARD, outline: 'none',
        fontFamily: mono ? 'monospace' : S.fontFamily,
        boxShadow: focused ? '0 0 0 3px rgba(109,40,217,0.1)' : 'none',
        transition: 'border-color 0.14s, box-shadow 0.14s',
        letterSpacing: mono ? '0.04em' : 'normal',
      }}
    />
  );
}

function PrimaryBtn({ label, loading, disabled, type = 'submit', onClick }: {
  label: string; loading?: boolean; disabled?: boolean; type?: 'submit' | 'button';
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;
  return (
    <button type={type} disabled={isDisabled} onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', padding: '13px', borderRadius: 11, border: 'none',
        background: isDisabled ? BORD2 : hovered ? V_HOVER : V,
        color: 'white', fontSize: 14.5, fontWeight: 700,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: isDisabled ? 'none' : '0 4px 18px rgba(109,40,217,0.28)',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...S,
      }}>
      {loading && <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />}
      {label}
    </button>
  );
}

export function StepBank({ onComplete, variant = 'becomeSeller' }: StepBankProps) {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();

  const [bankAccount, setBankAccount] = useState<MyBankAccount | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [holderName,  setHolderName]  = useState('');
  const [cbuOrCvu,    setCbuOrCvu]    = useState('');
  const [alias,       setAlias]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    usersService.getBankAccount()
      .then(data => {
        if (!cancelled && data) {
          setBankAccount(data);
          setHolderName(data.holderName ?? '');
          setCbuOrCvu(data.cbuOrCvu ?? '');
          setAlias(data.alias ?? '');
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedHolder = holderName.trim();
    const trimmedCbu    = cbuOrCvu.replace(/\D/g, '').slice(0, CBU_CVU_LENGTH);
    if (!trimmedHolder) { setError(t('bankAccount.holderNameRequired')); return; }
    if (trimmedCbu.length !== CBU_CVU_LENGTH || !/^\d+$/.test(trimmedCbu)) { setError(t('bankAccount.cbuOrCvuInvalid')); return; }
    try {
      setSaving(true);
      await usersService.updateBankAccount({ holderName: trimmedHolder, cbuOrCvu: trimmedCbu, alias: alias.trim() || undefined });
      await refreshUser();
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bankAccount.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={28} style={{ color: V, animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Verify-user wizard: already has bank on file → acknowledge and continue ─
  if (variant === 'verifyUser' && bankAccount != null && !submitted) {
    const verified = user?.bankDetailsVerified === true;
    return (
      <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div
          style={{
            background: verified ? GLIGHT : ABG,
            borderBottom: `1px solid ${verified ? GBORD : ABORD}`,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              background: verified ? GLIGHT : ABG,
              border: `1.5px solid ${verified ? GBORD : ABORD}`,
            }}
          >
            {verified ? (
              <CheckCircle size={22} style={{ color: GREEN }} />
            ) : (
              <Clock size={22} style={{ color: WARN_SOLID }} />
            )}
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 3, ...S }}>
              {verified ? t('bankAccount.verified') : t('bankAccount.pendingApproval')}
            </p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, ...S }}>
              {verified ? t('verifyUser.bankStep.verifiedHint') : t('verifyUser.bankStep.pendingHint')}
            </p>
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <PrimaryBtn label={t('verifyUser.bankStep.continue')} type="button" onClick={() => onComplete()} />
        </div>
      </div>
    );
  }

  // ── Already submitted / existing (become-seller flow) ─────────────────────
  if (submitted || bankAccount != null) {
    return (
      <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ background: GLIGHT, borderBottom: `1px solid ${GBORD}`, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: GLIGHT, border: `1.5px solid ${GBORD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={22} style={{ color: GREEN }} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 3, ...S }}>{t('becomeSeller.step4.successTitle')}</p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, ...S }}>{t('becomeSeller.step4.successMessage')}</p>
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <Link to="/sell-ticket" style={{ textDecoration: 'none' }}>
            <PrimaryBtn label={t('becomeSeller.step4.goToSell')} type="button" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: VLIGHT, borderBottom: `1px solid ${VL_BORDER}`, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: V, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CreditCard size={20} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 3, ...S }}>{t('becomeSeller.step4.title')}</p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, ...S }}>{t('becomeSeller.step4.subtitle')}</p>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          {error && (
            <div style={{ padding: '11px 14px', borderRadius: 11, marginBottom: 16, background: ERROR_BG, border: `1px solid ${BADGE_DEMAND_BORDER}`, fontSize: 13.5, color: DESTRUCTIVE, lineHeight: 1.5, ...S }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label={`${t('bankAccount.holderName')} *`}>
              <TextInput
                value={holderName}
                onChange={setHolderName}
                placeholder={t('bankAccount.holderNamePlaceholder')}
              />
            </Field>

            <Field label={`${t('bankAccount.cbuOrCvu')} *`} hint={t('bankAccount.cbuOrCvuHint')}>
              <TextInput
                value={cbuOrCvu}
                onChange={v => setCbuOrCvu(v.replace(/\D/g, '').slice(0, CBU_CVU_LENGTH))}
                placeholder={t('bankAccount.cbuOrCvuPlaceholder')}
                inputMode="numeric"
                mono
              />
            </Field>

            <Field label={t('bankAccount.alias')}>
              <TextInput
                value={alias}
                onChange={setAlias}
                placeholder={t('bankAccount.aliasPlaceholder')}
              />
            </Field>

            <PrimaryBtn label={t('bankAccount.save')} loading={saving} />
          </form>
        </div>
      </div>
    </>
  );
}
