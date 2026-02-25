import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Ticket } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';

const QUICK_LOGIN_USERS = [
  { label: 'Admin Facu', email: 'facu@admin.com', password: '12345678' },
  { label: 'Venito Seller', email: 'seller@ticketshub.local', password: 'seller123' },
  { label: 'Buyer 1', email: 'buyer@ticketshub.local', password: 'buyer123' },
  { label: 'Buyer 2', email: 'f@f.com', password: '12345678' },
];

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error, clearError } = useUser();

  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleQuickLogin = (email: string, password: string) => {
    clearError();
    setFormData({ email, password });
  };
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Ticket className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('login.title')}</h1>
            <p className="text-gray-600">{t('login.subtitle')}</p>
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

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">Quick login (dev only)</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_LOGIN_USERS.map((user) => (
                <button
                  key={user.email}
                  type="button"
                  onClick={() => handleQuickLogin(user.email, user.password)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  {user.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
