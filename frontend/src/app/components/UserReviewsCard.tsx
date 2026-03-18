import { FC, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Award, Trophy } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { Skeleton } from './ui/skeleton';
import { reviewsService } from '../../api/services/reviews.service';
import type { UserReviewMetrics, UserBadge } from '../../api/types';
import { TX, txFontSans } from '@/app/components/transaction/tokens';

/** Badge chip styles per ticketshub-design-system (Trust + brand). */
function getBadgeStyle(badge: UserBadge): CSSProperties {
  if (badge === 'trusted') {
    return {
      background: TX.BLIGHT,
      color: TX.BLUE,
      border: `1px solid ${TX.BORDER}`,
    };
  }
  if (badge === 'verified') {
    return {
      background: '#f0fdfa',
      color: '#0f766e',
      border: '1px solid #99f6e4',
    };
  }
  if (badge === 'best_seller') {
    return {
      background: TX.VLIGHT,
      color: TX.V,
      border: `1.5px solid ${TX.V}`,
    };
  }
  return {
    background: TX.SURFACE,
    color: TX.MUTED,
    border: `1px solid ${TX.BORDER}`,
  };
}

interface UserReviewsCardProps {
  userId: string;
  publicName: string;
  avatarUrl?: string;
  role: 'buyer' | 'seller';
  showProfileLink?: boolean;
}

function getBadgeIcon(badge: UserBadge) {
  if (badge === 'trusted') return <ShieldCheck className="h-3 w-3 shrink-0" style={{ color: 'inherit' }} />;
  if (badge === 'verified') return <Award className="h-3 w-3 shrink-0" style={{ color: 'inherit' }} />;
  if (badge === 'best_seller') return <Trophy className="h-3 w-3 shrink-0" style={{ color: 'inherit' }} />;
  return null;
}

function getBadgeLabel(badge: UserBadge, t: (key: string) => string) {
  if (badge === 'trusted') return t('eventTickets.badgeTrusted');
  if (badge === 'verified') return t('eventTickets.badgeVerified');
  if (badge === 'best_seller') return t('eventTickets.badgeBestSeller');
  return badge;
}

const rowStyle: CSSProperties = {
  ...txFontSans,
  display: 'flex',
  alignItems: 'flex-start',
  gap: 18,
};

const nameStyle: CSSProperties = {
  ...txFontSans,
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.25,
  color: TX.DARK,
  margin: 0,
};

const metaStyle: CSSProperties = {
  ...txFontSans,
  fontSize: 12.5,
  fontWeight: 400,
  lineHeight: 1.5,
  color: TX.MUTED,
};

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
        setError('load');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [userId, role]);

  if (isLoading) {
    return (
      <div style={rowStyle}>
        <Skeleton
          className="h-14 w-14 shrink-0 rounded-full"
          style={{ backgroundColor: TX.BORDER }}
        />
        <div className="min-w-0 flex-1 space-y-2" style={txFontSans}>
          <Skeleton className="h-[18px] w-32 rounded-md" style={{ backgroundColor: TX.BORDER }} />
          <Skeleton className="h-3.5 w-24 rounded-md" style={{ backgroundColor: TX.BORDER }} />
          <Skeleton className="h-3.5 w-40 rounded-md" style={{ backgroundColor: TX.BORDER }} />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div style={rowStyle}>
        <UserAvatar name={publicName} src={avatarUrl} className="h-14 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate" style={nameStyle}>
            {publicName}
          </h3>
          {error && (
            <p className="mt-1" style={{ ...metaStyle, color: TX.MUTED }}>
              {t('userReviews.loadError')}
            </p>
          )}
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
    <div style={rowStyle}>
      <UserAvatar name={publicName} src={avatarUrl} className="h-14 w-14 shrink-0" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate" style={nameStyle}>
          {publicName}
        </h3>

        {role === 'seller' && metrics.badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {metrics.badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1"
                style={{
                  ...txFontSans,
                  fontSize: 11.5,
                  fontWeight: 600,
                  ...getBadgeStyle(badge),
                }}
              >
                {getBadgeIcon(badge)}
                {getBadgeLabel(badge, t)}
              </span>
            ))}
          </div>
        )}

        <div
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1"
          style={metaStyle}
        >
          <span>{transactionText}</span>
          <span style={{ color: TX.BORD2 }} aria-hidden>
            •
          </span>
          <span>{reviewText}</span>
        </div>
      </div>
    </div>
  );

  if (showProfileLink && role === 'seller') {
    return (
      <div className="flex flex-col gap-3" style={txFontSans}>
        {content}
        <Link
          to={`/seller/${userId}`}
          className="block w-full rounded-[10px] border-[1.5px] py-2.5 px-4 text-center text-[13.5px] font-semibold no-underline transition-colors duration-[0.16s] ease-out hover:bg-[#f0ebff]"
          style={{
            ...txFontSans,
            borderColor: TX.BORD2,
            color: TX.V,
            background: TX.CARD,
          }}
        >
          {t('userReviews.viewProfile')}
        </Link>
      </div>
    );
  }

  return content;
};

export default UserReviewsCard;
