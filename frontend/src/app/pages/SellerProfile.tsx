import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Minus, ArrowLeft, Calendar, Ticket, MessageSquare } from 'lucide-react';
import { sellersService } from '../../api/services/sellers.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { UserAvatar } from '../components/UserAvatar';
import type { SellerProfile as SellerProfileData } from '../../api/types';
import { formatMonthYear } from '@/lib/format-date';

export function SellerProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sellerId } = useParams<{ sellerId: string }>();
  const [seller, setSeller] = useState<SellerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(typeof window !== 'undefined' && window.history.length > 1);
  }, []);

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
      <LoadingSpinner
        size="lg"
        text={t('sellerProfile.loading')}
        fullScreen
      />
    );
  }

  if (error || !seller) {
    return (
      <ErrorMessage
        title={error ? t(error) : t('sellerProfile.sellerNotFound')}
        message={t('sellerProfile.tryAgainLater')}
        fullScreen
      />
    );
  }

  const getReviewIcon = (type: 'positive' | 'neutral' | 'negative') => {
    switch (type) {
      case 'positive':
        return <ThumbsUp className="w-5 h-5 text-green-600" />;
      case 'neutral':
        return <Minus className="w-5 h-5 text-gray-500" />;
      case 'negative':
        return <ThumbsDown className="w-5 h-5 text-red-500" />;
    }
  };

  const getReviewBadgeColor = (type: 'positive' | 'neutral' | 'negative') => {
    switch (type) {
      case 'positive':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'neutral':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'negative':
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const totalReviews = seller.reviewStats.positive + seller.reviewStats.neutral + seller.reviewStats.negative;
  const positivePercentage = totalReviews > 0 ? Math.round((seller.reviewStats.positive / totalReviews) * 100) : 0;
  const memberSinceDate = new Date(seller.memberSince);
  const memberSinceLabel = Number.isNaN(memberSinceDate.getTime())
    ? seller.memberSince
    : formatMonthYear(seller.memberSince);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {canGoBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </button>
        )}

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start gap-6">
            <UserAvatar name={seller.publicName} src={seller.pic?.src} className="h-24 w-24" />

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{seller.publicName}</h1>
              <p className="text-gray-600 mb-4">{t('sellerProfile.memberSince')} {memberSinceLabel}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">{t('sellerProfile.totalSales')}</p>
                  <p className="text-2xl font-bold text-gray-900">{seller.totalSales}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                  <p className="text-sm text-gray-600 mb-2">{t('sellerProfile.reviewsTitle')}</p>
                  <div className="flex items-center gap-4 mb-3">
                    <p className="text-2xl font-bold text-gray-900">{positivePercentage}%</p>
                    <span className="text-sm text-gray-600">{t('sellerProfile.positive')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-green-600">
                      <ThumbsUp className="w-4 h-4" />
                      <span className="font-semibold">{seller.reviewStats.positive}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Minus className="w-4 h-4" />
                      <span className="font-semibold">{seller.reviewStats.neutral}</span>
                    </div>
                    <div className="flex items-center gap-1 text-red-500">
                      <ThumbsDown className="w-4 h-4" />
                      <span className="font-semibold">{seller.reviewStats.negative}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{t('sellerProfile.totalReviewsLabel', { count: totalReviews })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('sellerProfile.customerReviews')}</h2>

          {seller.reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={t('sellerProfile.noReviewsYet')}
              description={t('sellerProfile.noReviewsDescription')}
            />
          ) : (
            <div className="space-y-6">
              {seller.reviews.map((review) => (
                <div 
                  key={review.id}
                  className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{review.buyerName}</p>
                      <p className="text-sm text-gray-500">{review.reviewDate}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border-2 ${getReviewBadgeColor(review.type)}`}>
                      {getReviewIcon(review.type)}
                      <span className="text-sm font-semibold">{t(`sellerProfile.${review.type}`)}</span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3">{review.comment}</p>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Ticket className="w-4 h-4" />
                      <span>{review.eventName}</span>
                    </div>
                    <div className="text-gray-600">
                      <span className="font-medium">{t('sellerProfile.ticket')}:</span> {review.ticketType}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{review.eventDate}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
