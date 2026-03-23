import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  Calendar,
  Ticket,
  MessageSquare,
  Shield,
} from 'lucide-react';
import { sellersService } from '../../api/services/sellers.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { BackButton } from '../components/BackButton';
import { Separator } from '../components/ui/separator';
import type { SellerProfile as SellerProfileData } from '../../api/types';
import { formatMonthYear, formatReviewDate, formatEventDate } from '@/lib/format-date';
import { PageMeta } from '@/app/components/PageMeta';
import {
  V,
  VLIGHT,
  VL_BORDER,
  DARK,
  MUTED,
  CARD,
  BORDER,
  GREEN,
  GLIGHT,
  GBORD,
  AMBER,
  ABG,
  ABORD,
  DESTRUCTIVE,
  BADGE_DEMAND_BG,
  BADGE_DEMAND_BORDER,
  SHADOW_CARD_SM,
  BG,
  E,
  S,
  R_CARD,
  R_PILL,
} from '@/lib/design-tokens';

export function SellerProfile() {
  const { t } = useTranslation();
  const { sellerId } = useParams<{ sellerId: string }>();
  const [seller, setSeller] = useState<SellerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSellerProfile() {
      if (!sellerId) {
        setError('sellerProfile.sellerNotFound');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await sellersService.getSellerProfile(sellerId);
        setSeller(data);
      } catch (err) {
        console.error('Failed to fetch seller profile:', err);
        setError('sellerProfile.loadError');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSellerProfile();
  }, [sellerId]);

  if (isLoading) {
    return (
      <>
        <PageMeta title={t('seo.defaultTitle')} description={t('seo.defaultDescription')} />
        <LoadingSpinner size="lg" text={t('sellerProfile.loading')} fullScreen />
      </>
    );
  }

  if (error || !seller) {
    return (
      <>
        <PageMeta title={t('seo.defaultTitle')} description={t('seo.defaultDescription')} />
        <ErrorMessage
          title={error ? t(error) : t('sellerProfile.sellerNotFound')}
          message={t('sellerProfile.tryAgainLater')}
          fullScreen
        />
      </>
    );
  }

  const totalReviews =
    seller.reviewStats.positive + seller.reviewStats.neutral + seller.reviewStats.negative;
  const positivePercentage =
    totalReviews > 0 ? Math.round((seller.reviewStats.positive / totalReviews) * 100) : null;
  const memberSinceDate = new Date(seller.memberSince);
  const memberSinceLabel = Number.isNaN(memberSinceDate.getTime())
    ? seller.memberSince
    : formatMonthYear(seller.memberSince);

  const positiveBarWidth =
    totalReviews > 0 ? `${(seller.reviewStats.positive / totalReviews) * 100}%` : '0%';
  const neutralBarWidth =
    totalReviews > 0 ? `${(seller.reviewStats.neutral / totalReviews) * 100}%` : '0%';
  const negativeBarWidth =
    totalReviews > 0 ? `${(seller.reviewStats.negative / totalReviews) * 100}%` : '0%';

  const reviewPillStyles: Record<'positive' | 'neutral' | 'negative', React.CSSProperties> = {
    positive: { background: GLIGHT, color: GREEN, border: `1px solid ${GBORD}` },
    neutral: { background: ABG, color: AMBER, border: `1px solid ${ABORD}` },
    negative: {
      background: BADGE_DEMAND_BG,
      color: DESTRUCTIVE,
      border: `1px solid ${BADGE_DEMAND_BORDER}`,
    },
  };

  const reviewPillIcon = {
    positive: <ThumbsUp style={{ width: 12, height: 12 }} />,
    neutral: <Minus style={{ width: 12, height: 12 }} />,
    negative: <ThumbsDown style={{ width: 12, height: 12 }} />,
  };

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      <PageMeta
        title={t('seo.sellerProfile.title', { sellerName: seller.publicName })}
        description={t('seo.sellerProfile.description', { sellerName: seller.publicName })}
      />

      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: 'clamp(22px, 4vw, 40px) 16px 40px',
        }}
      >
        <BackButton />

        {/* ── Hero card ── */}
        <div
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: R_CARD,
            padding: '28px',
            marginBottom: 12,
            boxShadow: SHADOW_CARD_SM,
          }}
        >
          {/* Identity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <UserAvatar
              name={seller.publicName}
              src={seller.pic?.src}
              className="!size-16 sm:!size-28 lg:!size-32 rounded-full shrink-0"
              style={{
                border: `1px solid ${VL_BORDER}`,
                background: VLIGHT,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  ...E,
                  fontSize: 26,
                  fontWeight: 400,
                  color: DARK,
                  margin: '0 0 4px',
                  lineHeight: 1.2,
                }}
              >
                {seller.publicName}
              </h1>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  color: MUTED,
                  marginBottom: 10,
                }}
              >
                <Calendar style={{ width: 12, height: 12, flexShrink: 0 }} />
                {t('sellerProfile.memberSince')} {memberSinceLabel}
              </div>
              {/* Verified badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  padding: '4px 10px',
                  borderRadius: R_PILL,
                  background: VLIGHT,
                  color: '#5b21b6',
                  border: `1px solid ${VL_BORDER}`,
                }}
              >
                <Shield style={{ width: 11, height: 11 }} />
                {t('sellerProfile.verifiedSeller')}
              </span>
            </div>
          </div>

          <Separator style={{ marginBottom: 20 }} />

          {/* Metrics row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {/* Satisfaction */}
            <div style={{ paddingRight: 20 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: MUTED,
                  margin: '0 0 6px',
                }}
              >
                {t('sellerProfile.satisfaction')}
              </p>
              <p
                style={{
                  ...E,
                  fontWeight: 400,
                  fontSize: 30,
                  color: positivePercentage !== null ? DARK : MUTED,
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                {positivePercentage !== null ? `${positivePercentage}%` : '—'}
              </p>
              <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>
                {positivePercentage !== null
                  ? t('sellerProfile.positive')
                  : t('sellerProfile.noDataYet')}
              </p>
            </div>

            {/* Total sales */}
            <div
              style={{
                paddingLeft: 20,
                paddingRight: 20,
                borderLeft: `1px solid ${BORDER}`,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: MUTED,
                  margin: '0 0 6px',
                }}
              >
                {t('sellerProfile.totalSales')}
              </p>
              <p
                style={{
                  ...E,
                  fontWeight: 400,
                  fontSize: 30,
                  color: DARK,
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                {seller.totalSales}
              </p>
              <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>
                {t('sellerProfile.tickets')}
              </p>
            </div>

            {/* Total reviews */}
            <div style={{ paddingLeft: 20, borderLeft: `1px solid ${BORDER}` }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: MUTED,
                  margin: '0 0 6px',
                }}
              >
                {t('sellerProfile.reviewsTitle')}
              </p>
              <p
                style={{
                  ...E,
                  fontWeight: 400,
                  fontSize: 30,
                  color: DARK,
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                {totalReviews}
              </p>
              <p style={{ fontSize: 11, color: MUTED, margin: '3px 0 0' }}>
                {t('sellerProfile.fromBuyers')}
              </p>
            </div>
          </div>
        </div>

        {/* ── Review breakdown (only when there are reviews) ── */}
        {totalReviews > 0 && (
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: R_CARD,
              padding: '16px 18px',
              marginBottom: 24,
              boxShadow: SHADOW_CARD_SM,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: MUTED,
                margin: '0 0 12px',
              }}
            >
              {t('sellerProfile.reviewBreakdown')}
            </p>

            {(
              [
                {
                  key: 'positive',
                  label: t('sellerProfile.positive'),
                  count: seller.reviewStats.positive,
                  barColor: GREEN,
                  barWidth: positiveBarWidth,
                  iconColor: GREEN,
                  icon: <ThumbsUp style={{ width: 13, height: 13, flexShrink: 0 }} />,
                },
                {
                  key: 'neutral',
                  label: t('sellerProfile.neutral'),
                  count: seller.reviewStats.neutral,
                  barColor: '#d97706',
                  barWidth: neutralBarWidth,
                  iconColor: '#d97706',
                  icon: <Minus style={{ width: 13, height: 13, flexShrink: 0 }} />,
                },
                {
                  key: 'negative',
                  label: t('sellerProfile.negative'),
                  count: seller.reviewStats.negative,
                  barColor: DESTRUCTIVE,
                  barWidth: negativeBarWidth,
                  iconColor: DESTRUCTIVE,
                  icon: <ThumbsDown style={{ width: 13, height: 13, flexShrink: 0 }} />,
                },
              ] as const
            ).map((row, i) => (
              <div
                key={row.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: i < 2 ? 8 : 0,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 500,
                    minWidth: 80,
                    color: row.iconColor,
                  }}
                >
                  {row.icon}
                  {row.label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    background: '#e5e7eb',
                    borderRadius: 3,
                  }}
                >
                  <div
                    style={{
                      width: row.barWidth,
                      height: 5,
                      background: row.barColor,
                      borderRadius: 3,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: row.count > 0 ? row.iconColor : MUTED,
                    minWidth: 20,
                    textAlign: 'right',
                  }}
                >
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Customer reviews ── */}
        <h2
          style={{
            ...E,
            fontWeight: 400,
            fontSize: 20,
            color: DARK,
            margin: '0 0 14px',
          }}
        >
          {t('sellerProfile.customerReviews')}
        </h2>

        {seller.reviews.length === 0 ? (
          <div
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: R_CARD,
              boxShadow: SHADOW_CARD_SM,
            }}
          >
            <EmptyState
              icon={MessageSquare}
              title={t('sellerProfile.noReviewsYet')}
              description={t('sellerProfile.noReviewsDescription')}
            />
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {seller.reviews.map((review) => (
              <li key={review.id} style={{ marginBottom: 10 }}>
                <article
                  style={{
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: R_CARD,
                    padding: '18px',
                    boxShadow: SHADOW_CARD_SM,
                  }}
                  aria-label={`${t(`sellerProfile.${review.type}`)} review by ${review.buyerName}`}
                >
                  {/* Review header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: DARK,
                          margin: '0 0 2px',
                        }}
                      >
                        {review.buyerName}
                      </p>
                      <span style={{ fontSize: 11, color: MUTED }}>{formatReviewDate(review.reviewDate)}</span>
                    </div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.02em',
                        padding: '5px 10px',
                        borderRadius: R_PILL,
                        flexShrink: 0,
                        ...reviewPillStyles[review.type],
                      }}
                    >
                      {reviewPillIcon[review.type]}
                      {t(`sellerProfile.${review.type}`)}
                    </span>
                  </div>

                  {/* Comment */}
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: DARK,
                      margin: '0 0 14px',
                    }}
                  >
                    {review.comment}
                  </p>

                  {/* Event metadata chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 500,
                        color: MUTED,
                        background: '#f3f3f0',
                        borderRadius: 6,
                        padding: '4px 8px',
                      }}
                    >
                      <Ticket style={{ width: 11, height: 11, flexShrink: 0 }} />
                      {review.eventName}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 500,
                        color: MUTED,
                        background: '#f3f3f0',
                        borderRadius: 6,
                        padding: '4px 8px',
                      }}
                    >
                      <strong style={{ color: DARK, fontWeight: 600 }}>
                        {t('sellerProfile.ticket')}:
                      </strong>{' '}
                      {review.ticketType}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 500,
                        color: MUTED,
                        background: '#f3f3f0',
                        borderRadius: 6,
                        padding: '4px 8px',
                      }}
                    >
                      <Calendar style={{ width: 11, height: 11, flexShrink: 0 }} />
                      {review.eventDate
                        ? formatEventDate(review.eventDate)
                        : t('sellerProfile.unknownEvent')}
                    </span>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
