import { FC, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Award, Trophy } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { reviewsService } from '../../api/services/reviews.service';
import type { UserReviewMetrics, UserBadge } from '../../api/types';

interface UserReviewsCardProps {
  userId: string;
  publicName: string;
  avatarUrl?: string;
  role: 'buyer' | 'seller';
  showProfileLink?: boolean;
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export const UserReviewsCard: FC<UserReviewsCardProps> = ({
  userId,
  publicName,
  avatarUrl,
  role,
  showProfileLink = false,
}) => {
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
      <div className="flex items-start gap-4">
        <Skeleton className="w-14 h-14 rounded-full" />
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
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={avatarUrl} alt={publicName} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold">
            {getInitials(publicName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{publicName}</h3>
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
    <div className="flex items-start gap-4">
      <Avatar className="h-14 w-14 flex-shrink-0">
        <AvatarImage src={avatarUrl} alt={publicName} />
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold">
          {getInitials(publicName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{publicName}</h3>

        {metrics.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {metrics.badges.map((badge) => (
              <span
                key={badge}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${getBadgeColor(badge)}`}
              >
                {getBadgeIcon(badge)}
                {getBadgeLabel(badge, t)}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
          <span>{transactionText}</span>
          <span className="text-gray-300">•</span>
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
          className="block w-full text-center bg-gray-100 text-gray-900 py-2 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
        >
          {t('userReviews.viewProfile')}
        </Link>
      </div>
    );
  }

  return content;
};

export default UserReviewsCard;
