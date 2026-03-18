import { FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Award, Trophy } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Skeleton } from './ui/skeleton';
import { reviewsService } from '../../api/services/reviews.service';
import type { UserReviewMetrics, UserBadge } from '../../api/types';
import { TX, txFontSans } from '@/app/components/transaction/tokens';

interface UserReviewsCardProps {
  userId: string;
  publicName: string;
  avatarUrl?: string;
  role: 'buyer' | 'seller';
  showProfileLink?: boolean;
  /** Transaction sidebar: design tokens, single name row with metrics + profile */
  tone?: 'default' | 'transaction';
}

function getBadgeIcon(badge: UserBadge) {
  if (badge === 'trusted') return <ShieldCheck className="w-3 h-3" />;
  if (badge === 'verified') return <Award className="w-3 h-3" />;
  if (badge === 'best_seller') return <Trophy className="w-3 h-3" />;
  return null;
}

function getBadgeColor(badge: UserBadge) {
  if (badge === 'trusted') return 'bg-blue-100 text-blue-700';
  if (badge === 'verified') return 'bg-green-100 text-green-700';
  if (badge === 'best_seller') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-700';
}

function getBadgeLabel(badge: UserBadge, t: (key: string) => string) {
  if (badge === 'trusted') return t('eventTickets.badgeTrusted');
  if (badge === 'verified') return t('eventTickets.badgeVerified');
  if (badge === 'best_seller') return t('eventTickets.badgeBestSeller');
  return badge;
}

export const UserReviewsCard: FC<UserReviewsCardProps> = ({
  userId,
  publicName,
  avatarUrl,
  role,
  showProfileLink = false,
  tone = 'default',
}) => {
  const tx = tone === 'transaction';
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState<UserReviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true);
      setError(null);

      try {
        const data =
          role === 'seller'
            ? await reviewsService.getSellerMetrics(userId)
            : await reviewsService.getBuyerMetrics(userId);
        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch user metrics:', err);
        setError('Failed to load metrics');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [userId, role]);

  if (isLoading) {
    return (
      <div className="flex items-start gap-4" style={tx ? txFontSans : undefined}>
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex items-start gap-4" style={tx ? txFontSans : undefined}>
        <UserAvatar name={publicName} src={avatarUrl} className="h-14 w-14" />
        <div className="flex-1 min-w-0">
          <h3
            className="truncate font-semibold"
            style={tx ? { color: TX.DARK } : undefined}
          >
            {publicName}
          </h3>
        </div>
      </div>
    );
  }

  const transactionText =
    role === 'seller'
      ? t('userReviews.ticketsSold', { count: metrics.totalTransactions })
      : t('userReviews.ticketsBought', { count: metrics.totalTransactions });

  const reviewText =
    metrics.totalReviews > 0 && metrics.positivePercent != null
      ? t('userReviews.positiveReviews', {
          percent: metrics.positivePercent,
          count: metrics.totalReviews,
        })
      : t('userReviews.noReviewsYet');

  const content = (
    <div className="flex items-start gap-4" style={tx ? txFontSans : undefined}>
      <UserAvatar name={publicName} src={avatarUrl} className="h-14 w-14" />
      <div className="min-w-0 flex-1">
        <h3
          className={`truncate font-semibold ${tx ? '' : 'text-gray-900'}`}
          style={tx ? { color: TX.DARK } : undefined}
        >
          {publicName}
        </h3>

        {role === 'seller' && metrics.badges.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {metrics.badges.map((badge) => (
              <span
                key={badge}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${getBadgeColor(badge)}`}
              >
                {getBadgeIcon(badge)}
                {getBadgeLabel(badge, t)}
              </span>
            ))}
          </div>
        )}

        <div
          className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm ${tx ? '' : 'text-gray-600'}`}
          style={tx ? { color: TX.MUTED } : undefined}
        >
          <span>{transactionText}</span>
          <span className={tx ? '' : 'text-gray-300'} style={tx ? { color: TX.BORD2 } : undefined}>
            •
          </span>
          <span>{reviewText}</span>
        </div>
      </div>
    </div>
  );

  if (showProfileLink && role === 'seller') {
    return (
      <div className="space-y-3">
        {content}
        <Link
          to={`/seller/${userId}`}
          className={`block w-full rounded-[10px] py-2.5 px-4 text-center text-sm font-bold transition-colors no-underline ${
            tx
              ? 'border-[1.5px] hover:bg-violet-50'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
          style={
            tx
              ? {
                  ...txFontSans,
                  borderColor: TX.BORD2,
                  color: TX.V,
                }
              : undefined
          }
        >
          {t('userReviews.viewProfile')}
        </Link>
      </div>
    );
  }

  return content;
};

export default UserReviewsCard;
