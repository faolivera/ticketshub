import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { otpService } from '@/api/services/otp.service';
import { OTPType } from '@/api/types/otp';
import { Button } from '@/app/components/ui/button';

const PHONE_PREFIX = '+549';

export interface StepPhoneProps {
  onComplete: () => void;
  /** When true, hides the "Back to profile" link (e.g. on /verify-user page). */
  hideBackToProfile?: boolean;
}

export function StepPhone({ onComplete, hideBackToProfile }: StepPhoneProps) {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phase, setPhase] = useState<'input' | 'verify'>('input');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.phone && !user.phoneVerified) {
      const digits = (user.phone || '').replace(/\D/g, '');
      setPhoneNumber(digits.startsWith('549') ? digits.slice(3) : digits);
    }
  }, [user?.phone, user?.phoneVerified]);

  useEffect(() => {
    if (phase === 'verify' && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => (prev <= 1 ? 0 : prev - 1));
        setCanResend((prev) => prev || timer <= 1);
      }, 1000);
      return () => clearInterval(interval);
    }
    if (phase === 'verify' && timer === 0) setCanResend(true);
  }, [phase, timer]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setError(t('becomeSeller.step1.pleaseEnterPhone'));
      return;
    }
    setLoading(true);
    setError(null);
    const fullPhoneNumber = PHONE_PREFIX + phoneNumber.trim();
    try {
      await otpService.sendOTP({
        type: OTPType.PhoneVerification,
        phoneNumber: fullPhoneNumber,
      });
      setPhase('verify');
      setTimer(60);
      setCanResend(false);
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      const msg =
        apiErr?.code === 'INVALID_PHONE_NUMBER'
          ? t('verifyUser.invalidPhoneNumber')
          : apiErr?.message ?? t('becomeSeller.step1.sendError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const next = [...code];
      next[index] = value;
      setCode(next);
      if (value && index < 5) {
        document.getElementById(`become-seller-otp-${index + 1}`)?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`become-seller-otp-${index - 1}`)?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError(t('becomeSeller.step1.pleaseEnterCompleteCode'));
      return;
    }
    setLoading(true);
    setError(null);
    const fullPhoneNumber = PHONE_PREFIX + phoneNumber.trim();
    try {
      await otpService.verifyOTP({
        type: OTPType.PhoneVerification,
        code: fullCode,
        phoneNumber: fullPhoneNumber,
      });
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
    setLoading(true);
    setError(null);
    const fullPhoneNumber = PHONE_PREFIX + phoneNumber.trim();
    try {
      await otpService.sendOTP({
        type: OTPType.PhoneVerification,
        phoneNumber: fullPhoneNumber,
      });
      setTimer(60);
      setCanResend(false);
      setCode(['', '', '', '', '', '']);
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      const msg =
        apiErr?.code === 'INVALID_PHONE_NUMBER'
          ? t('verifyUser.invalidPhoneNumber')
          : apiErr?.message ?? t('becomeSeller.step1.sendError');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <Phone className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('becomeSeller.step1.title')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('becomeSeller.step1.description')}
          </p>
        </div>
      </div>

      {!hideBackToProfile && (
        <Link
          to="/user-profile"
          className="mb-4 inline-block text-sm text-blue-600 hover:text-blue-700"
        >
          {t('becomeSeller.step1.backToProfile')}
        </Link>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {phase === 'input' ? (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('becomeSeller.step1.phoneLabel')}
            </label>
            <div className="flex rounded-lg border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <span className="inline-flex items-center rounded-l-lg border-0 border-r border-gray-300 bg-gray-50 px-4 py-3 text-gray-700">
                {PHONE_PREFIX}
              </span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                value={phoneNumber}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '');
                  setPhoneNumber(digitsOnly);
                }}
                placeholder={t('becomeSeller.step1.phonePlaceholder')}
                className="flex-1 min-w-0 rounded-r-lg border-0 bg-transparent px-4 py-3 focus:border-0 focus:outline-none focus:ring-0"
                disabled={loading}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('becomeSeller.step1.sending')}
              </>
            ) : (
              t('becomeSeller.step1.sendCode')
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('becomeSeller.step1.codeSent', { phone: PHONE_PREFIX + phoneNumber })}
          </p>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              {t('becomeSeller.step1.enterCode')}
            </label>
            <div className="flex justify-center gap-2">
              {code.map((digit, i) => (
                <input
                  key={i}
                  id={`become-seller-otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-12 w-11 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
              ))}
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('becomeSeller.step1.verifying')}
              </>
            ) : (
              t('becomeSeller.step1.verify')
            )}
          </Button>
          <div className="text-center text-sm">
            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('becomeSeller.step1.resendCode')}
              </button>
            ) : (
              <span className="text-gray-500">
                {t('becomeSeller.step1.resendIn', { seconds: timer })}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
