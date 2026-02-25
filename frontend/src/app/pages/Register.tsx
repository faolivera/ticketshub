import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, User, Globe, ArrowLeft, Lock } from 'lucide-react';
import { authService } from '@/api/services/auth.service';
import { otpService } from '@/api/services/otp.service';
import { useUser } from '@/app/contexts/UserContext';
import { OTPType } from '@/api/types';

export function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useUser();

  const locationState = location.state as
    | { verifyEmail?: boolean; email?: string; fromLogin?: boolean; from?: string | { pathname?: string } }
    | undefined;
  const fromVal = locationState?.from;
  const redirectTarget =
    typeof fromVal === 'string' ? fromVal : (fromVal && typeof fromVal === 'object' ? fromVal.pathname : undefined) ?? '/';

  const [step, setStep] = useState<'register' | 'verify'>(
    locationState?.verifyEmail && locationState?.email ? 'verify' : 'register'
  );
  const [formData, setFormData] = useState({
    email: locationState?.email ?? '',
    password: '',
    firstName: '',
    lastName: '',
    country: 'United States',
  });
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const fromLogin = Boolean(locationState?.fromLogin);

  // Auto-detect country (mock)
  useEffect(() => {
    setFormData(prev => ({ ...prev, country: prev.country || 'United States' }));
  }, []);

  // Timer for resend
  useEffect(() => {
    if (step === 'verify' && timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timer]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegisterError(null);
    try {
      const response = await authService.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        country: formData.country,
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
      
      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    const code = verificationCode.join('');
    if (code.length !== 6) {
      setVerifyError(t('register.pleaseEnterCompleteCode'));
      return;
    }

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

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <button
              onClick={() => (fromLogin ? navigate('/login', { state: { from: redirectTarget } }) : setStep('register'))}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('register.back')}
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {t('register.verifyEmail')}
              </h1>
              <p className="text-gray-600">
                {t('register.verifyEmailDescription', { email: formData.email })}
              </p>
            </div>

            {verifyError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {verifyError}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                  {t('register.enterCode')}
                </label>
                <div className="flex gap-2 justify-center">
                  {verificationCode.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      maxLength={1}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('common.loading') : t('register.verify')}
              </button>

              <div className="text-center">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    {t('register.resendCode')}
                  </button>
                ) : (
                  <p className="text-sm text-gray-600">
                    {t('register.resendIn', { seconds: timer })}
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('register.signUp')}
            </h1>
            <p className="text-gray-600">
              {t('register.signUpDescription')}
            </p>
          </div>

          {registerError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {registerError}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('register.email')} <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder={t('register.emailPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t('register.password')} <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={t('register.passwordPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('register.firstName')} <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder={t('register.firstNamePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('register.lastName')} <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder={t('register.lastNamePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {t('register.country')} <span className="text-red-500">*</span>
                </div>
              </label>
              <select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="United States">United States</option>
                <option value="Mexico">Mexico</option>
                <option value="Canada">Canada</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Spain">Spain</option>
                <option value="Argentina">Argentina</option>
                <option value="Colombia">Colombia</option>
                <option value="Chile">Chile</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {t('register.countryAutoDetected')}
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('common.loading') : t('register.createAccount')}
            </button>

            <p className="text-center text-sm text-gray-600">
              {t('register.alreadyHaveAccount')}{' '}
              <Link
                to="/login"
                state={{ from: redirectTarget }}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                {t('register.signIn')}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
