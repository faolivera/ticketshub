import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, MessageSquare, ArrowLeft } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';

export function PhoneVerification() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useUser();

  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [method, setMethod] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

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

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      alert(t('phoneVerification.pleaseEnterPhone'));
      return;
    }
    // Simulate sending code
    setStep('verify');
    setTimer(60);
    setCanResend(false);
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

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    
    const code = verificationCode.join('');
    if (code.length !== 6) {
      alert(t('phoneVerification.pleaseEnterCompleteCode'));
      return;
    }

    // Simulate verification
    updateUser({ phone: phoneNumber, isPhoneVerified: true });
    navigate('/user-profile');
  };

  const handleResend = () => {
    if (canResend) {
      setTimer(60);
      setCanResend(false);
      setVerificationCode(['', '', '', '', '', '']);
      // Simulate resending code
    }
  };

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8">
            <button
              onClick={() => setStep('input')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('phoneVerification.back')}
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {method === 'whatsapp' ? (
                  <MessageSquare className="w-8 h-8 text-green-600" />
                ) : (
                  <Phone className="w-8 h-8 text-green-600" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {t('phoneVerification.verifyPhone')}
              </h1>
              <p className="text-gray-600">
                {t('phoneVerification.verifyPhoneDescription', { phone: phoneNumber })}
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                  {t('phoneVerification.enterCode')}
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
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      maxLength={1}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('phoneVerification.verify')}
              </button>

              <div className="text-center">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-green-600 hover:text-green-700 font-semibold"
                  >
                    {t('phoneVerification.resendCode')}
                  </button>
                ) : (
                  <p className="text-sm text-gray-600">
                    {t('phoneVerification.resendIn', { seconds: timer })}
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
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('phoneVerification.back')}
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {t('phoneVerification.title')}
            </h1>
            <p className="text-gray-600">
              {t('phoneVerification.description')}
            </p>
          </div>

          <form onSubmit={handleSendCode} className="space-y-6">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('phoneVerification.phoneNumber')}
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Method Selection */}
            <div className="space-y-3">
              <button
                type="submit"
                onClick={() => setMethod('whatsapp')}
                className="w-full px-6 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-5 h-5" />
                {t('phoneVerification.sendViaWhatsApp')}
              </button>

              <button
                type="submit"
                onClick={() => setMethod('sms')}
                className="w-full px-6 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                {t('phoneVerification.sendViaSMS')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
