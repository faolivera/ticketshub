import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock } from 'lucide-react';
import { GoogleLogin, useGoogleOAuth } from '@react-oauth/google';
import { useUser } from '@/app/contexts/UserContext';
import { PageMeta } from '@/app/components/PageMeta';
import { getGoogleClientId } from '@/config/env';
import { V, VLIGHT, DARK, MUTED, BG, CARD, BORDER, BORD2, S, E, R_HERO, R_BUTTON, R_INPUT } from '@/lib/design-tokens';

const googleClientId = getGoogleClientId();

// ─── Google button block ──────────────────────────────────────────────────────
function GoogleLoginButtonBlock({
  onSuccess,
  onError,
  width,
}: {
  onSuccess: (credentialResponse: { credential?: string }) => void;
  onError: () => void;
  width: number;
}) {
  const { scriptLoadedSuccessfully } = useGoogleOAuth();

  if (!scriptLoadedSuccessfully) {
    return (
      <div
        aria-hidden
        style={{
          width: '100%', height: 52, borderRadius: R_INPUT,
          background: BG, border: `1px solid ${BORDER}`,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    );
  }

  return (
    <GoogleLogin
      onSuccess={onSuccess}
      onError={onError}
      theme="outline"
      size="large"
      shape="rectangular"
      width={width}
      text="signin_with"
    />
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: MUTED, ...S }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
    </div>
  );
}

// ─── Input field ─────────────────────────────────────────────────────────────
interface InputFieldProps {
  label: string;
  icon: React.ReactNode;
  name: string;
  type: string;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

function InputField({ label, icon, name, type, value, placeholder, autoComplete, onChange, disabled }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12.5, fontWeight: 700, color: MUTED,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: 8, ...S,
      }}>
        {icon} {label}
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
        required
        style={{
          width: '100%', padding: '12px 14px',
          border: `1.5px solid ${focused ? V : BORD2}`,
          borderRadius: R_INPUT, fontSize: 14, color: DARK,
          background: disabled ? BG : CARD,
          outline: 'none', transition: 'border-color 0.14s',
          boxShadow: focused ? `0 0 0 3px rgba(105,45,212,0.1)` : 'none',
          ...S,
        }}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, error, clearError } = useUser();

  const [formData, setFormData]         = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [localError, setLocalError]     = useState<string | null>(null);
  const googleButtonContainerRef        = useRef<HTMLDivElement>(null);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(320);

  useEffect(() => {
    if (!googleClientId) return;
    const el = googleButtonContainerRef.current;
    if (!el) return;
    const update = () => setGoogleButtonWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const redirectTarget =
    typeof location.state?.from === 'string'
      ? location.state.from
      : location.state?.from?.pathname || '/';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError();
    setLocalError(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setLocalError(null);
    try {
      const response = await login({ email: formData.email, password: formData.password });
      if (response.requiresEmailVerification) {
        navigate('/register', {
          state: { verifyEmail: true, email: response.user.email, fromLogin: true, from: redirectTarget },
        });
      } else {
        navigate(redirectTarget);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('login.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    const idToken = credentialResponse.credential;
    if (!idToken) { setLocalError(t('login.googleError')); return; }
    setIsGoogleLoading(true);
    setLocalError(null);
    clearError();
    try {
      await loginWithGoogle(idToken);
      navigate(redirectTarget);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('login.googleError'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const displayError = localError || error;
  const isBusy = isSubmitting || isGoogleLoading;

  return (
    <div
      className="login-page-shell"
      style={{
        minHeight: '100vh', background: BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', ...S,
      }}
    >
      <PageMeta title={t('seo.login.title')} description={t('seo.login.description')} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        /* Below AppHeader: avoid vertical center in full viewport — huge empty top on mobile */
        @media (max-width: 768px) {
          .login-page-shell {
            align-items: flex-start !important;
            justify-content: center;
            min-height: 0 !important;
            padding-top: max(12px, env(safe-area-inset-top, 0px));
            padding-bottom: max(24px, env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>

          <h1 style={{
            ...E,
            fontSize: 'clamp(24px, 3vw, 30px)',
            fontWeight: 400, color: DARK,
            letterSpacing: '-0.4px', marginBottom: 6,
          }}>
            {t('login.title')}
          </h1>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
            {t('login.subtitle')}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: CARD, borderRadius: R_HERO,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          padding: '28px 24px',
        }}>

          {/* Error message */}
          {displayError && (
            <div style={{
              padding: '12px 14px', borderRadius: R_INPUT, marginBottom: 20,
              background: '#fef2f2', border: '1px solid #fca5a5',
              fontSize: 13.5, color: '#dc2626', lineHeight: 1.5,
            }}>
              {displayError}
            </div>
          )}

          {/* Google login */}
          {googleClientId && (
            <>
              <div
                ref={googleButtonContainerRef}
                style={{
                  width: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  minHeight: 52, borderRadius: R_INPUT, overflow: 'hidden',
                }}
              >
                <GoogleLoginButtonBlock
                  onSuccess={handleGoogleSuccess}
                  onError={() => setLocalError(t('login.googleError'))}
                  width={googleButtonWidth}
                />
              </div>
              <Divider label={t('login.or')} />
            </>
          )}

          {/* Email + password form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <InputField
              label={t('login.email')}
              icon={<Mail size={13} />}
              name="email"
              type="email"
              value={formData.email}
              placeholder={t('login.emailPlaceholder')}
              autoComplete="email"
              onChange={handleChange}
              disabled={isBusy}
            />

            <div>
              <InputField
                label={t('login.password')}
                icon={<Lock size={13} />}
                name="password"
                type="password"
                value={formData.password}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                onChange={handleChange}
                disabled={isBusy}
              />
              {/* Forgot password — right aligned, under field */}
              <div style={{ textAlign: 'right', marginTop: 7 }}>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: 13, fontWeight: 600,
                    color: V, textDecoration: 'none', ...S,
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isBusy}
              style={{
                width: '100%', padding: '13px',
                borderRadius: R_BUTTON, border: 'none',
                background: isBusy ? BORD2 : V,
                color: 'white', fontSize: 14.5, fontWeight: 700,
                cursor: isBusy ? 'not-allowed' : 'pointer',
                boxShadow: isBusy ? 'none' : '0 4px 18px rgba(105,45,212,0.28)',
                transition: 'all 0.15s', ...S,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (!isBusy) (e.currentTarget as HTMLButtonElement).style.background = '#5824b8'; }}
              onMouseLeave={e => { if (!isBusy) (e.currentTarget as HTMLButtonElement).style.background = V; }}
            >
              {isSubmitting
                ? t('login.signingIn')
                : isGoogleLoading
                  ? t('login.signingInWithGoogle')
                  : t('login.signIn')}
            </button>
          </form>

          {/* Register link */}
          <p style={{ textAlign: 'center', fontSize: 13.5, color: MUTED, marginTop: 20, ...S }}>
            {t('login.noAccount')}{' '}
            <Link
              to="/register"
              state={{ from: redirectTarget }}
              style={{ color: V, fontWeight: 700, textDecoration: 'none', ...S }}
            >
              {t('login.createAccount')}
            </Link>
          </p>
        </div>

        {/* Trust strip */}
        <div style={{
          display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
          gap: 18, marginTop: 20,
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

      </div>
    </div>
  );
}
