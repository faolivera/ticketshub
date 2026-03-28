import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Loader2, ChevronDown, Search } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { otpService } from '@/api/services/otp.service';
import { OTPType } from '@/api/types/otp';
import { V, VLIGHT, DARK, MUTED, HINT, BG, CARD, BORDER, BORD2, VL_BORDER, ERROR_BG, BADGE_DEMAND_BORDER, DESTRUCTIVE, V_HOVER, S, R_HERO, R_BUTTON, R_INPUT } from '@/lib/design-tokens';
import { type CountryCallingCode, COUNTRY_CODES, ARGENTINA, countryFromPhone } from '@/lib/country-calling-codes';

/** Basic E.164 sanity check: + followed by 7–15 digits, non-zero first digit. */
function isPlausiblePhone(countryCode: string, localNumber: string): boolean {
  const full = '+' + countryCode.trim() + localNumber.trim();
  return /^\+[1-9]\d{6,14}$/.test(full.replace(/[\s\-]/g, ''));
}

export interface StepPhoneProps {
  onComplete: () => void;
  hideBackToProfile?: boolean;
}

// ─── Country dropdown ─────────────────────────────────────────────────────────
function CountryDropdown({ selected, onSelect, disabled, borderColor, roundLeft = false }: {
  selected: CountryCallingCode;
  onSelect: (c: CountryCallingCode) => void;
  disabled?: boolean;
  borderColor: string;
  roundLeft?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen]       = useState(false);
  const [search, setSearch]   = useState('');
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef          = useRef<HTMLDivElement>(null);
  const searchRef             = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = COUNTRY_CODES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.startsWith(search.replace(/\D/g, ''))
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '12px 10px 12px 12px',
          border: 'none', borderRight: `1.5px solid ${borderColor}`,
          background: BG, cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 14, fontWeight: 600, color: DARK,
          transition: 'border-color 0.14s', whiteSpace: 'nowrap',
          borderRadius: roundLeft ? `${R_INPUT} 0 0 ${R_INPUT}` : 0,
          ...S,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{selected.flag}</span>
        <span>+{selected.code}</span>
        <ChevronDown size={13} color={MUTED} style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 300,
          width: 280, background: CARD,
          border: `1.5px solid ${BORDER}`, borderRadius: R_INPUT,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '10px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={14} color={MUTED} style={{ flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('phoneInput.searchPlaceholder')}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 13, color: DARK, ...S,
              }}
            />
          </div>
          {/* List */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 13, color: MUTED, ...S }}>{t('phoneInput.noResults')}</div>
            ) : filtered.map(c => {
              const key = c.code + c.name;
              const isSelected = c.code === selected.code && c.name === selected.name;
              const isHov = hovered === key;
              return (
                <div
                  key={key}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                  onMouseDown={() => { onSelect(c); setOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', cursor: 'pointer',
                    background: isSelected ? VLIGHT : isHov ? BG : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>
                  <span style={{ flex: 1, fontSize: 13, color: DARK, ...S }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: MUTED, fontWeight: 600, flexShrink: 0, ...S }}>+{c.code}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
        boxShadow: focused ? `0 0 0 3px rgba(105,45,212,0.1)` : 'none',
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
        boxShadow: isDisabled ? 'none' : '0 4px 18px rgba(105,45,212,0.28)',
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

  const [country,     setCountry]     = useState<CountryCallingCode>(ARGENTINA);
  const [localNumber, setLocalNumber] = useState('');
  const [phase,       setPhase]       = useState<'input' | 'verify'>('input');
  const [code,        setCode]        = useState(['', '', '', '', '', '']);
  const [timer,       setTimer]       = useState(60);
  const [canResend,   setCanResend]   = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [numFocused,  setNumFocused]  = useState(false);

  useEffect(() => {
    if (user?.phone && !user.phoneVerified) {
      const { country: c, localNumber: l } = countryFromPhone(user.phone);
      setCountry(c);
      setLocalNumber(l);
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

  const fullPhone = (): string => '+' + country.code + localNumber.trim();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localNumber.trim()) { setError(t('becomeSeller.step1.pleaseEnterPhone')); return; }
    if (!isPlausiblePhone(country.code, localNumber)) { setError(t('becomeSeller.step1.invalidPhoneFormat')); return; }
    setLoading(true); setError(null);
    try {
      await otpService.sendOTP({ type: OTPType.PhoneVerification, phoneNumber: fullPhone() });
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
      await otpService.verifyOTP({ type: OTPType.PhoneVerification, code: fullCode, phoneNumber: fullPhone() });
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
      await otpService.sendOTP({ type: OTPType.PhoneVerification, phoneNumber: fullPhone() });
      setTimer(60); setCanResend(false); setCode(['', '', '', '', '', '']);
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      setError(apiErr?.code === 'INVALID_PHONE_NUMBER' ? t('verifyUser.invalidPhoneNumber') : apiErr?.message ?? t('becomeSeller.step1.sendError'));
    } finally {
      setLoading(false);
    }
  };

  const inputBorderColor = numFocused ? V : BORD2;

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
                {/* Country dropdown + number input */}
                <div style={{
                  display: 'flex', borderRadius: R_INPUT,
                  border: `1.5px solid ${inputBorderColor}`,
                  boxShadow: numFocused ? '0 0 0 3px rgba(105,45,212,0.1)' : 'none',
                  transition: 'border-color 0.14s, box-shadow 0.14s', background: CARD,
                  position: 'relative',
                }}>
                  <CountryDropdown
                    selected={country}
                    onSelect={setCountry}
                    disabled={loading}
                    borderColor={inputBorderColor}
                    roundLeft
                  />
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={localNumber}
                    onChange={e => setLocalNumber(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setNumFocused(true)}
                    onBlur={() => setNumFocused(false)}
                    placeholder={t('becomeSeller.step1.phonePlaceholder')}
                    disabled={loading}
                    style={{ flex: 1, minWidth: 0, padding: '12px 14px', border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: DARK, borderRadius: `0 ${R_INPUT} ${R_INPUT} 0`, ...S }}
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
                  {t('becomeSeller.step1.codeSent', { phone: fullPhone() })}
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
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }} onPaste={handleOtpPaste}>
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
