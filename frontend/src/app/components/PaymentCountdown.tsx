import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from './ui/utils';

const AMBER_TEXT = '#92400e';
const RED_TEXT = '#dc2626';
const ONE_HOUR_S = 3600;

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
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isExpired) {
    return (
      <div className={cn('font-medium', className)} style={{ color: RED_TEXT }}>
        {t('transaction.paymentExpired')}
      </div>
    );
  }

  const isUrgent = timeLeft < ONE_HOUR_S;
  const timerColor = isUrgent ? RED_TEXT : AMBER_TEXT;

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <span className="text-sm font-medium text-gray-500">
        {t('transaction.paymentTimeLabel')}
      </span>
      <span
        className={cn('font-mono text-sm font-semibold tabular-nums', isUrgent && 'animate-pulse')}
        style={{ color: timerColor }}
      >
        {t('transaction.timeRemaining', { time: formatTime(timeLeft) })}
      </span>
    </div>
  );
};
