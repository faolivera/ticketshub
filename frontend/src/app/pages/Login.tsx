import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Ticket } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { PageMeta } from '@/app/components/PageMeta';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError } = useUser();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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

  const displayError = localError || error;

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
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {displayError}
            </div>
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
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('login.signingIn') : t('login.signIn')}
            </button>

            <p className="text-center text-sm text-gray-600 hidden sm:block">
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
