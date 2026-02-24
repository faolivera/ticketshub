import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, Minus, ArrowLeft, Calendar, Ticket, MessageSquare } from 'lucide-react';
import { sellersService } from '../../api/services/sellers.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import type { SellerProfile as SellerProfileData } from '../../api/types';

export function SellerProfile() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const [seller, setSeller] = useState<SellerProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSellerProfile() {
      if (!sellerId) {
        setError('Seller not found');
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
        setError('Unable to load seller profile');
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
        text="Loading seller profile"
        fullScreen
      />
    );
  }

  if (error || !seller) {
    return (
      <ErrorMessage
        title={error || 'Seller not found'}
        message="Please try again later."
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

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?';
  };

  const totalReviews = seller.reviewStats.positive + seller.reviewStats.neutral + seller.reviewStats.negative;
  const positivePercentage = totalReviews > 0 ? Math.round((seller.reviewStats.positive / totalReviews) * 100) : 0;
  const memberSinceDate = new Date(seller.memberSince);
  const memberSinceLabel = Number.isNaN(memberSinceDate.getTime())
    ? seller.memberSince
    : memberSinceDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden">
              {seller.pic?.src ? (
                <ImageWithFallback
                  src={seller.pic.src}
                  alt={`${seller.publicName} profile`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getInitials(seller.publicName)}</span>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{seller.publicName}</h1>
              <p className="text-gray-600 mb-4">Member since {memberSinceLabel}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Total Sales</p>
                  <p className="text-2xl font-bold text-gray-900">{seller.totalSales}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 col-span-2">
                  <p className="text-sm text-gray-600 mb-2">Reviews</p>
                  <div className="flex items-center gap-4 mb-3">
                    <p className="text-2xl font-bold text-gray-900">{positivePercentage}%</p>
                    <span className="text-sm text-gray-600">positive</span>
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
                  <p className="text-xs text-gray-500 mt-2">{totalReviews} total reviews</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>

          {seller.reviews.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No reviews yet"
              description="This seller has not received any reviews yet."
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
                      <span className="text-sm font-semibold capitalize">{review.type}</span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3">{review.comment}</p>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Ticket className="w-4 h-4" />
                      <span>{review.eventName}</span>
                    </div>
                    <div className="text-gray-600">
                      <span className="font-medium">Ticket:</span> {review.ticketType}
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
