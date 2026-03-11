import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Minus, Calendar, Ticket, MessageSquare, Shield, TrendingUp } from 'lucide-react';
import { sellersService } from '../../api/services/sellers.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import { BackButton } from '../components/BackButton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import type { SellerProfile as SellerProfileData } from '../../api/types';
import { formatMonthYear } from '@/lib/format-date';
import { PageMeta } from '@/app/components/PageMeta';

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
        <LoadingSpinner
          size="lg"
          text={t('sellerProfile.loading')}
          fullScreen
        />
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

  const getReviewIcon = (type: 'positive' | 'neutral' | 'negative') => {
    switch (type) {
      case 'positive':
        return <ThumbsUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'neutral':
        return <Minus className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'negative':
        return <ThumbsDown className="w-5 h-5 text-destructive" />;
    }
  };

  const getReviewBadgeColor = (type: 'positive' | 'neutral' | 'negative') => {
    switch (type) {
      case 'positive':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'neutral':
        return 'bg-muted text-muted-foreground border-border';
      case 'negative':
        return 'bg-destructive/10 text-destructive border-destructive/30';
    }
  };

  const totalReviews = seller.reviewStats.positive + seller.reviewStats.neutral + seller.reviewStats.negative;
  const positivePercentage = totalReviews > 0 ? Math.round((seller.reviewStats.positive / totalReviews) * 100) : 0;
  const memberSinceDate = new Date(seller.memberSince);
  const memberSinceLabel = Number.isNaN(memberSinceDate.getTime())
    ? seller.memberSince
    : formatMonthYear(seller.memberSince);

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={t('seo.sellerProfile.title', { sellerName: seller.publicName })}
        description={t('seo.sellerProfile.description', { sellerName: seller.publicName })}
      />
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 lg:py-16">
        <BackButton className="mb-8" />

        {/* Seller identity & trust block */}
        <Card className="mb-10 overflow-hidden border-border">
          <div className="p-6 sm:p-8 space-y-8">
            {/* Identity: compact row on mobile, larger/centered on desktop */}
            <div className="flex flex-row items-center gap-4 sm:gap-6 sm:items-start">
              <UserAvatar
                name={seller.publicName}
                src={seller.pic?.src}
                className="h-16 w-16 sm:h-28 sm:w-28 lg:h-32 lg:w-32 rounded-full ring-2 ring-border shrink-0"
              />
              <div className="text-left sm:text-left flex-1 min-w-0">
                <CardHeader className="p-0">
                  <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight break-words leading-tight">
                    {seller.publicName}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1.5 sm:mt-2 text-sm text-muted-foreground flex-wrap">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span>{t('sellerProfile.memberSince')} {memberSinceLabel}</span>
                  </CardDescription>
                </CardHeader>
              </div>
            </div>

            {/* Trust signals: full-width grid below identity to avoid overlap */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('sellerProfile.totalSales')}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{seller.totalSales}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t('sellerProfile.reviewsTitle')}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{positivePercentage}%</p>
                  <p className="text-xs text-muted-foreground">{t('sellerProfile.positive')}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <ThumbsUp className="w-4 h-4" />
                  <span className="font-semibold tabular-nums">{seller.reviewStats.positive}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Minus className="w-4 h-4" />
                  <span className="font-semibold tabular-nums">{seller.reviewStats.neutral}</span>
                </div>
                <div className="flex items-center gap-1.5 text-destructive">
                  <ThumbsDown className="w-4 h-4" />
                  <span className="font-semibold tabular-nums">{seller.reviewStats.negative}</span>
                </div>
                <p className="text-xs text-muted-foreground w-full">
                  {t('sellerProfile.totalReviewsLabel', { count: totalReviews })}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Customer reviews */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">
              {t('sellerProfile.customerReviews')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {seller.reviews.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title={t('sellerProfile.noReviewsYet')}
                description={t('sellerProfile.noReviewsDescription')}
              />
            ) : (
              <ul className="space-y-6">
                {seller.reviews.map((review) => (
                  <li key={review.id}>
                    <article
                      className="rounded-lg border border-border bg-card p-5 sm:p-6 transition-colors hover:bg-muted/30"
                      aria-label={`${t(`sellerProfile.${review.type}`)} review by ${review.buyerName}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                        <div>
                          <p className="font-semibold text-foreground">{review.buyerName}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{review.reviewDate}</p>
                        </div>
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium w-fit shrink-0 ${getReviewBadgeColor(review.type)}`}
                        >
                          {getReviewIcon(review.type)}
                          <span>{t(`sellerProfile.${review.type}`)}</span>
                        </div>
                      </div>

                      <p className="text-foreground text-[15px] leading-relaxed mb-4">{review.comment}</p>

                      <Separator className="my-4 bg-border" />

                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 shrink-0" />
                          {review.eventName}
                        </span>
                        <span>
                          <span className="font-medium text-foreground">{t('sellerProfile.ticket')}:</span>{' '}
                          {review.ticketType}
                        </span>
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 shrink-0" />
                          {review.eventDate}
                        </span>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
