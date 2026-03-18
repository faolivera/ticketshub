import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, User, Lock, Phone, ArrowLeft, CheckCircle } from 'lucide-react';
import { authService } from '@/api/services/auth.service';
import { otpService } from '@/api/services/otp.service';
import { termsService } from '@/api/services/terms.service';
import { useUser } from '@/app/contexts/UserContext';
import { OTPType } from '@/api/types';
import { TermsUserType, AcceptanceMethod } from '@/api/types/terms';
import { ClientTnC } from '@/app/components/ClientTnC';
import { PageMeta } from '@/app/components/PageMeta';

// ─── TicketsHub design tokens ─────────────────────────────────────────────────
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

// ─── Back button ─────────────────────────────────────────────────────────────
function BackBtn({ onAction, label }: { onAction: () => void; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onAction}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13.5, fontWeight: 600,
        color: hovered ? DARK : MUTED,
        padding: '4px 0', marginBottom: 20, transition: 'color 0.14s',
        ...S,
      }}
    >
      <ArrowLeft size={15} /> {label}
    </button>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────
interface InputFieldProps {
  label: string;
  icon: React.ReactNode;
  name?: string;
  type: string;
  value: string;
  placeholder: string;
  autoComplete?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  pattern?: string;
  hint?: string;
  optional?: boolean;
}

function InputField({
  label, icon, name, type, value, placeholder, autoComplete,
  onChange, disabled, required, minLength, inputMode, pattern, hint, optional,
}: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: '12px', fontWeight: 700, color: MUTED,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 8, ...S,
      }}>
        {icon} {label}
        {optional && (
          <span style={{ fontSize: 11, fontWeight: 500, color: HINT, textTransform: 'none', letterSpacing: 0 }}>
            (opcional)
          </span>
        )}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        required={required}
        minLength={minLength}
        inputMode={inputMode}
        pattern={pattern}
        style={{
          width: '100%', padding: '12px 14px',
          border: `1.5px solid ${focused ? V : BORD2}`,
          borderRadius: 11, fontSize: 14, color: DARK,
          background: disabled ? BG : CARD,
          outline: 'none', transition: 'border-color 0.14s, box-shadow 0.14s',
          boxShadow: focused ? `0 0 0 3px rgba(109,40,217,0.1)` : 'none',
          ...S,
        }}
      />
      {hint && (
        <p style={{ fontSize: 12.5, color: HINT, marginTop: 6, lineHeight: 1.4, ...S }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ─── Error box ───────────────────────────────────────────────────────────────
function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 11, marginBottom: 20,
      background: '#fef2f2', border: '1px solid #fca5a5',
      fontSize: 13.5, color: '#dc2626', lineHeight: 1.5, ...S,
    }}>
      {message}
    </div>
  );
}

// ─── Submit button ────────────────────────────────────────────────────────────
function SubmitBtn({ label, disabled }: { label: string; disabled: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="submit"
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', padding: '13px',
        borderRadius: 11, border: 'none',
        background: disabled ? BORD2 : hovered ? '#5b21b6' : V,
        color: 'white', fontSize: 14.5, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : '0 4px 18px rgba(109,40,217,0.28)',
        transition: 'all 0.15s', ...S,
      }}
    >
      {label}
    </button>
  );
}

/** Must be module-scoped: defining inside Register remounts the whole tree on every keystroke (focus loss). */
function RegisterPageWrap({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div style={{
      minHeight: '100vh', background: BG,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px', ...S,
    }}>
      <PageMeta title={title} description={description} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>
      <div style={{ width: '100%', maxWidth: 420 }}>{children}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function Register() {
  const { t } = useTranslation();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { refreshUser } = useUser();

  const locationState = location.state as
    | { verifyEmail?: boolean; email?: string; fromLogin?: boolean; from?: string | { pathname?: string } }
    | undefined;
  const fromVal = locationState?.from;
  const redirectTarget =
    typeof fromVal === 'string' ? fromVal
    : (fromVal && typeof fromVal === 'object' ? fromVal.pathname : undefined) ?? '/';

  const [step, setStep] = useState<'register' | 'verify'>(
    locationState?.verifyEmail && locationState?.email ? 'verify' : 'register'
  );
  const [formData, setFormData] = useState({
    email:     locationState?.email ?? '',
    password:  '',
    firstName: '',
    lastName:  '',
    phone:     '',
  });
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [timer,     setTimer]     = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyError,   setVerifyError]   = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const fromLogin = Boolean(locationState?.fromLogin);

  const [termsVersionId, setTermsVersionId] = useState<string | null>(null);
  const [termsAccepted,  setTermsAccepted]  = useState(false);
  const [termsLoading,   setTermsLoading]   = useState(true);

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const terms = await termsService.getCurrentTerms(TermsUserType.Buyer);
        setTermsVersionId(terms.id);
      } catch (err) {
        console.error('Failed to fetch terms:', err);
      } finally {
        setTermsLoading(false);
      }
    };
    fetchTerms();
  }, []);

  useEffect(() => {
    if (step === 'verify' && timer > 0) {
      const id = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) { setCanResend(true); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(id);
    }
  }, [step, timer]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegisterError(null);
    try {
      const response = await authService.register({
        email:     formData.email,
        password:  formData.password,
        firstName: formData.firstName,
        lastName:  formData.lastName,
        phone:     formData.phone || undefined,
        termsAcceptance: {
          termsVersionId: termsVersionId!,
          method: AcceptanceMethod.Checkbox,
        },
      });
      if (response.requiresEmailVerification) {
        setStep('verify');
        setTimer(60);
        setCanResend(false);
      } else {
        await refreshUser();
        navigate(redirectTarget);
      }
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : t('register.registerError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const newCode = [...verificationCode];
    text.split('').forEach((d, i) => { if (i < 6) newCode[i] = d; });
    setVerificationCode(newCode);
    document.getElementById(`otp-${Math.min(text.length, 5)}`)?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verificationCode.join('');
    if (code.length !== 6) { setVerifyError(t('register.pleaseEnterCompleteCode')); return; }
    setIsSubmitting(true);
    setVerifyError(null);
    try {
      await otpService.verifyOTP({ type: OTPType.EmailVerification, code });
      await refreshUser();
      navigate(redirectTarget);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : t('register.verifyError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setVerifyError(null);
    try {
      await otpService.sendOTP({ type: OTPType.EmailVerification });
      setTimer(60);
      setCanResend(false);
      setVerificationCode(['', '', '', '', '', '']);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : t('register.resendError'));
    }
  };

  const otpFilled = verificationCode.every(d => d !== '');

  const pageMetaTitle = t('seo.register.title');
  const pageMetaDescription = t('seo.register.description');

  // ── VERIFY STEP ─────────────────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <RegisterPageWrap title={pageMetaTitle} description={pageMetaDescription}>


        <div style={{
          background: CARD, borderRadius: 20,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          padding: '28px 24px',
        }}>
          <BackBtn
            onAction={() =>
              fromLogin
                ? navigate('/login', { state: { from: redirectTarget } })
                : setStep('register')
            }
            label={t('register.back')}
          />

          {/* Icon + title */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: VLIGHT, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px',
            }}>
              <Mail size={24} style={{ color: V }} />
            </div>
            <h1 style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 24, fontWeight: 400, color: DARK,
              letterSpacing: '-0.3px', marginBottom: 8,
            }}>
              {t('register.verifyEmail')}
            </h1>
            <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55 }}>
              {t('register.verifyEmailDescription', { email: formData.email })}
            </p>
          </div>

          {verifyError && <ErrorBox message={verifyError} />}

          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* OTP inputs */}
            <div>
              <p style={{
                textAlign: 'center', fontSize: 12, fontWeight: 700,
                color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: 16, ...S,
              }}>
                {t('register.enterCode')}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {verificationCode.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    maxLength={1}
                    style={{
                      width: 48, height: 56, textAlign: 'center',
                      fontSize: 22, fontWeight: 800, color: DARK,
                      border: `2px solid ${digit ? V : BORD2}`,
                      borderRadius: 12, background: digit ? VLIGHT : CARD,
                      outline: 'none', transition: 'all 0.14s',
                      boxShadow: digit ? `0 0 0 3px rgba(109,40,217,0.1)` : 'none',
                      ...S,
                    }}
                    onFocus={e => { (e.target as HTMLInputElement).style.borderColor = V; }}
                    onBlur={e => { (e.target as HTMLInputElement).style.borderColor = digit ? V : BORD2; }}
                  />
                ))}
              </div>
            </div>

            <SubmitBtn
              label={isSubmitting ? t('common.loading') : t('register.verify')}
              disabled={isSubmitting || !otpFilled}
            />

            {/* Resend */}
            <div style={{ textAlign: 'center' }}>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13.5, fontWeight: 700, color: V, ...S,
                    textDecoration: 'underline',
                  }}
                >
                  {t('register.resendCode')}
                </button>
              ) : (
                <p style={{ fontSize: 13, color: HINT, ...S }}>
                  {t('register.resendIn', { seconds: timer })}
                </p>
              )}
            </div>
          </form>
        </div>
      </RegisterPageWrap>
    );
  }

  // ── REGISTER STEP ──────────────────────────────────────────────────────────
  return (
    <RegisterPageWrap title={pageMetaTitle} description={pageMetaDescription}>
      {/* Brand header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 'clamp(24px, 3vw, 30px)',
          fontWeight: 400, color: DARK,
          letterSpacing: '-0.4px', marginBottom: 6,
        }}>
          {t('register.signUp')}
        </h1>
        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
          {t('register.signUpDescription')}
        </p>
      </div>

      <div style={{
        background: CARD, borderRadius: 20,
        border: `1px solid ${BORDER}`,
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
        padding: '28px 24px',
      }}>
        {registerError && <ErrorBox message={registerError} />}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Name row: two fields side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <InputField
              label={t('register.firstName')}
              icon={<User size={13} />}
              type="text"
              value={formData.firstName}
              placeholder={t('register.firstNamePlaceholder')}
              onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              disabled={isSubmitting}
              required
            />
            <InputField
              label={t('register.lastName')}
              icon={<User size={13} />}
              type="text"
              value={formData.lastName}
              placeholder={t('register.lastNamePlaceholder')}
              onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              disabled={isSubmitting}
              required
            />
          </div>

          <InputField
            label={t('register.email')}
            icon={<Mail size={13} />}
            type="email"
            value={formData.email}
            placeholder={t('register.emailPlaceholder')}
            autoComplete="email"
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            disabled={isSubmitting}
            required
          />

          <InputField
            label={t('register.password')}
            icon={<Lock size={13} />}
            type="password"
            value={formData.password}
            placeholder={t('register.passwordPlaceholder')}
            autoComplete="new-password"
            onChange={e => setFormData({ ...formData, password: e.target.value })}
            disabled={isSubmitting}
            required
            minLength={8}
          />

          <InputField
            label={t('register.phoneOptional')}
            icon={<Phone size={13} />}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.phone}
            placeholder={t('register.phonePlaceholder')}
            onChange={e => {
              const digits = e.target.value.replace(/\D/g, '');
              setFormData({ ...formData, phone: digits });
            }}
            disabled={isSubmitting}
            optional
            hint={t('register.phoneOptionalHint')}
          />

          {/* Terms */}
          <div style={{
            padding: '14px 16px', borderRadius: 12,
            background: BG, border: `1px solid ${BORDER}`,
          }}>
            <ClientTnC
              termsVersionId={termsVersionId}
              termsLoading={termsLoading}
              checked={termsAccepted}
              onCheckedChange={setTermsAccepted}
              checkboxId="terms"
            />
          </div>

          <SubmitBtn
            label={isSubmitting ? t('common.loading') : t('register.createAccount')}
            disabled={isSubmitting || !termsVersionId || !termsAccepted}
          />

          <p style={{ textAlign: 'center', fontSize: 13.5, color: MUTED, ...S }}>
            {t('register.alreadyHaveAccount')}{' '}
            <Link
              to="/login"
              state={{ from: redirectTarget }}
              style={{ color: V, fontWeight: 700, textDecoration: 'none', ...S }}
            >
              {t('register.signIn')}
            </Link>
          </p>
        </form>
      </div>

      {/* Trust strip */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        flexWrap: 'wrap', gap: 18, marginTop: 20,
      }}>
        {[
          { icon: '🔒', text: 'Conexión segura' },
          { icon: '🛡️', text: 'Tus datos protegidos' },
        ].map(({ icon, text }) => (
          <div key={text} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 12.5, color: MUTED, fontWeight: 500,
          }}>
            <span style={{ fontSize: 13 }}>{icon}</span> {text}
          </div>
        ))}
      </div>
    </RegisterPageWrap>
  );
}
