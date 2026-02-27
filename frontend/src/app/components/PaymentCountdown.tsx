import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from './ui/utils';

interface PaymentCountdownProps {
  expiresAt: string;
  onExpired?: () => void;
  className?: string;
}

export const PaymentCountdown: FC<PaymentCountdownProps> = ({
  expiresAt,
  onExpired,
  className,
}) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = (): number => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      return Math.max(0, Math.floor((expires - now) / 1000));
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0 && !isExpired) {
        setIsExpired(true);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired, isExpired]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isExpired) {
    return (
      <div className={cn('text-red-600 font-medium', className)}>
        {t('transaction.paymentExpired')}
      </div>
    );
  }

  const isUrgent = timeLeft < 60;

  return (
    <div
      className={cn(
        'font-mono text-lg font-medium',
        isUrgent ? 'text-red-600 animate-pulse' : 'text-gray-700',
        className,
      )}
    >
      {t('transaction.timeRemaining', { time: formatTime(timeLeft) })}
    </div>
  );
};
