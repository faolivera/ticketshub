import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface SellerRiskRestrictionDisclaimerProps {
  className?: string;
  variant?: 'limits' | 'proximity';
}

/**
 * Reusable disclaimer shown when the seller cannot create/update a listing due to risk limits (unverified seller).
 * variant='limits' (default): exceeds monetary/count caps.
 * variant='proximity': event date is too close for unverified sellers.
 */
export const SellerRiskRestrictionDisclaimer: FC<SellerRiskRestrictionDisclaimerProps> = ({
  className,
  variant = 'limits',
}) => {
  const { t } = useTranslation();

  const titleKey = variant === 'proximity'
    ? 'sellTicket.proximityRestrictionTitle'
    : 'sellTicket.sellerRiskRestrictionTitle';
  const introKey = variant === 'proximity'
    ? 'sellTicket.proximityRestrictionIntro'
    : 'sellTicket.sellerRiskRestrictionIntro';
  const ctaKey = variant === 'proximity'
    ? 'sellTicket.proximityRestrictionVerifyCta'
    : 'sellTicket.sellerRiskRestrictionVerifyCta';

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
            {t(titleKey)}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            {t(introKey)}
          </p>
          <Link
            to="/become-seller"
            className="inline-block px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
          >
            {t(ctaKey)}
          </Link>
        </div>
      </div>
    </div>
  );
};
