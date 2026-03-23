import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Loader2 } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { otpService } from '@/api/services/otp.service';
import { OTPType } from '@/api/types/otp';
import { V, VLIGHT, DARK, MUTED, HINT, BG, CARD, BORDER, BORD2, VL_BORDER, ERROR_BG, BADGE_DEMAND_BORDER, DESTRUCTIVE, V_HOVER, S, R_HERO, R_BUTTON, R_INPUT } from '@/lib/design-tokens';

const PHONE_PREFIX = '+549';

export interface StepPhoneProps {
  onComplete: () => void;
  hideBackToProfile?: boolean;
}

// ─── OTP digit input ─────────────────────────────────────────────────────────
function OtpInput({ id, value, onChange, onKeyDown, disabled }: {
  id: string; value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={e => { if (/^\d*$/.test(e.target.value)) onChange(e.target.value); }}
      onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={disabled}
      style={{
        width: 46, height: 54, textAlign: 'center',
        fontSize: 22, fontWeight: 800, color: DARK,
        border: `2px solid ${value ? V : focused ? V : BORD2}`,
        borderRadius: R_INPUT,
        background: value ? VLIGHT : CARD,
        outline: 'none',
        boxShadow: focused ? `0 0 0 3px rgba(109,40,217,0.1)` : 'none',
        transition: 'all 0.14s', ...S,
      }}
    />
  );
}

// ─── Primary button ───────────────────────────────────────────────────────────
function PrimaryBtn({ label, loading, loadingLabel, disabled }: {
  label: string; loading?: boolean; loadingLabel?: string; disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', padding: '13px', borderRadius: R_BUTTON, border: 'none',
        background: isDisabled ? BORD2 : hovered ? V_HOVER : V,
        color: 'white', fontSize: 14.5, fontWeight: 700,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: isDisabled ? 'none' : '0 4px 18px rgba(109,40,217,0.28)',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...S,
      }}
    >
      {loading && <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />}
      {loading ? (loadingLabel ?? label) : label}
    </button>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function StepPhone({ onComplete, hideBackToProfile }: StepPhoneProps) {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phase,       setPhase]       = useState<'input' | 'verify'>('input');
  const [code,        setCode]        = useState(['', '', '', '', '', '']);
  const [timer,       setTimer]       = useState(60);
  const [canResend,   setCanResend]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [phoneFocused,setPhoneFocused]= useState(false);

  useEffect(() => {
    if (user?.phone && !user.phoneVerified) {
      const digits = (user.phone || '').replace(/\D/g, '');
      setPhoneNumber(digits.startsWith('549') ? digits.slice(3) : digits);
    }
  }, [user?.phone, user?.phoneVerified]);

  useEffect(() => {
    if (phase === 'verify' && timer > 0) {
      const id = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) { setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
    if (phase === 'verify' && timer === 0) setCanResend(true);
  }, [phase, timer]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) { setError(t('becomeSeller.step1.pleaseEnterPhone')); return; }
    setLoading(true); setError(null);
    try {
      await otpService.sendOTP({ type: OTPType.PhoneVerification, phoneNumber: PHONE_PREFIX + phoneNumber.trim() });
      setPhase('verify'); setTimer(60); setCanResend(false);
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      setError(apiErr?.code === 'INVALID_PHONE_NUMBER' ? t('verifyUser.invalidPhoneNumber') : apiErr?.message ?? t('becomeSeller.step1.sendError'));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const next = [...code]; next[index] = value; setCode(next);
    if (value && index < 5) document.getElementById(`th-otp-${index + 1}`)?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) document.getElementById(`th-otp-${index - 1}`)?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = [...code];
    text.split('').forEach((d, i) => { if (i < 6) next[i] = d; });
    setCode(next);
    document.getElementById(`th-otp-${Math.min(text.length, 5)}`)?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) { setError(t('becomeSeller.step1.pleaseEnterCompleteCode')); return; }
    setLoading(true); setError(null);
    try {
      await otpService.verifyOTP({ type: OTPType.PhoneVerification, code: fullCode, phoneNumber: PHONE_PREFIX + phoneNumber.trim() });
      await refreshUser();
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('becomeSeller.step1.verifyError'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true); setError(null);
    try {
      await otpService.sendOTP({ type: OTPType.PhoneVerification, phoneNumber: PHONE_PREFIX + phoneNumber.trim() });
      setTimer(60); setCanResend(false); setCode(['', '', '', '', '', '']);
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      setError(apiErr?.code === 'INVALID_PHONE_NUMBER' ? t('verifyUser.invalidPhoneNumber') : apiErr?.message ?? t('becomeSeller.step1.sendError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ background: CARD, borderRadius: R_HERO, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: VLIGHT, borderBottom: `1px solid ${VL_BORDER}`, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: R_BUTTON, background: V, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Phone size={20} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 3, ...S }}>{t('becomeSeller.step1.title')}</p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, ...S }}>{t('becomeSeller.step1.description')}</p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>

          {error && (
            <div style={{ padding: '11px 14px', borderRadius: R_INPUT, marginBottom: 16, background: ERROR_BG, border: `1px solid ${BADGE_DEMAND_BORDER}`, fontSize: 13.5, color: DESTRUCTIVE, lineHeight: 1.5, ...S }}>
              {error}
            </div>
          )}

          {phase === 'input' ? (
            <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, ...S }}>
                  <Phone size={13} /> {t('becomeSeller.step1.phoneLabel')}
                </label>
                {/* Prefix + number row */}
                <div style={{
                  display: 'flex', borderRadius: R_INPUT, overflow: 'hidden',
                  border: `1.5px solid ${phoneFocused ? V : BORD2}`,
                  boxShadow: phoneFocused ? '0 0 0 3px rgba(109,40,217,0.1)' : 'none',
                  transition: 'border-color 0.14s, box-shadow 0.14s', background: CARD,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 14px', background: BG, borderRight: `1.5px solid ${phoneFocused ? V : BORD2}`, fontSize: 14, fontWeight: 600, color: DARK, flexShrink: 0, transition: 'border-color 0.14s', ...S }}>
                    {PHONE_PREFIX}
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    placeholder={t('becomeSeller.step1.phonePlaceholder')}
                    disabled={loading}
                    style={{ flex: 1, minWidth: 0, padding: '12px 14px', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: DARK, ...S }}
                  />
                </div>
              </div>
              <PrimaryBtn label={t('becomeSeller.step1.sendCode')} loading={loading} loadingLabel={t('becomeSeller.step1.sending')} />
            </form>

          ) : (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Code sent info */}
              <div style={{ padding: '12px 14px', borderRadius: R_INPUT, background: BG, border: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, ...S }}>
                  {t('becomeSeller.step1.codeSent', { phone: PHONE_PREFIX + phoneNumber })}
                </p>
                <button
                  type="button"
                  onClick={() => { setPhase('input'); setError(null); setCode(['', '', '', '', '', '']); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: V, padding: '4px 0 0', textDecoration: 'underline', ...S }}
                >
                  Cambiar número
                </button>
              </div>

              {/* OTP inputs */}
              <div>
                <label style={{ display: 'block', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14, ...S }}>
                  {t('becomeSeller.step1.enterCode')}
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {code.map((digit, i) => (
                    <OtpInput
                      key={i}
                      id={`th-otp-${i}`}
                      value={digit}
                      onChange={v => handleOtpChange(i, v)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      disabled={loading}
                    />
                  ))}
                </div>
              </div>

              <PrimaryBtn
                label={t('becomeSeller.step1.verify')}
                loading={loading}
                loadingLabel={t('becomeSeller.step1.verifying')}
                disabled={code.some(d => d === '')}
              />

              {/* Resend */}
              <div style={{ textAlign: 'center' }}>
                {canResend ? (
                  <button type="button" onClick={handleResend} disabled={loading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: V, textDecoration: 'underline', ...S }}>
                    {t('becomeSeller.step1.resendCode')}
                  </button>
                ) : (
                  <p style={{ fontSize: 13, color: HINT, ...S }}>
                    {t('becomeSeller.step1.resendIn', { seconds: timer })}
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
