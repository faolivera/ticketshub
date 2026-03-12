import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Ticket } from 'lucide-react';
import { GoogleLogin, useGoogleOAuth } from '@react-oauth/google';
import { useUser } from '@/app/contexts/UserContext';
import { PageMeta } from '@/app/components/PageMeta';
import { getGoogleClientId } from '@/config/env';

const googleClientId = getGoogleClientId();

/** Renders Google button or a skeleton while the GSI script loads. Must be used inside GoogleOAuthProvider. */
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
        className="skeleton-blink w-full h-[3.25rem] rounded-lg bg-gray-200"
        aria-hidden
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

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, error, clearError } = useUser();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const googleButtonContainerRef = useRef<HTMLDivElement>(null);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(320);

  // Measure container width so Google button matches full width (same as Sign In button)
  useEffect(() => {
    if (!googleClientId) return;
    const el = googleButtonContainerRef.current;
    if (!el) return;
    const updateWidth = () => setGoogleButtonWidth(el.offsetWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [googleClientId]);

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
    if (!idToken) {
      setLocalError(t('login.googleError'));
      return;
    }
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
    <div className="min-h-screen bg-gray-50 flex items-start sm:items-center justify-center pt-5 pb-8 px-3 sm:pt-3 sm:pb-10 sm:px-4">
      <PageMeta title={t('seo.login.title')} description={t('seo.login.description')} />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="text-center mb-4">
            <div className="flex justify-center mb-2">
              <Ticket className="w-9 h-9 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{t('login.title')}</h1>
            <p className="text-gray-600 text-sm">{t('login.subtitle')}</p>
          </div>

          {displayError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {displayError}
            </div>
          )}

          {googleClientId && (
            <>    
              <div className="relative my-4">
                <div className="relative flex justify-center text-sm">
                  <div className="w-full border-t border-gray-200" />
                </div>
              </div>
              <div
                ref={googleButtonContainerRef}
                className="w-full flex items-center justify-center min-h-[3.25rem] rounded-lg overflow-hidden"
              >
                <GoogleLoginButtonBlock
                  onSuccess={handleGoogleSuccess}
                  onError={() => setLocalError(t('login.googleError'))}
                  width={googleButtonWidth}
                />
              </div>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    {t('login.or')}
                  </span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('login.email')}
                </div>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('login.emailPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t('login.password')}
                </div>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={t('login.passwordPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('login.signingIn') : isGoogleLoading ? t('login.signingInWithGoogle') : t('login.signIn')}
            </button>

            <p className="text-center text-sm text-gray-600">
              {t('login.noAccount')}{' '}
              <Link
                to="/register"
                state={{ from: redirectTarget }}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                {t('login.createAccount')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
