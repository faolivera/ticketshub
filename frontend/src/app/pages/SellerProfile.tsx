import { useParams, Link } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Minus, ArrowLeft, Calendar, Ticket } from 'lucide-react';

const mockSellerData = {
  seller1: {
    id: 'seller1',
    name: 'John Smith',
    picture: '',
    memberSince: 'January 2024',
    totalSales: 127,
    reviewStats: { positive: 120, neutral: 5, negative: 2 },
    reviews: [
      {
        id: 'r1',
        buyerName: 'Alice Brown',
        type: 'positive' as const,
        comment: 'Great seller! Tickets were delivered immediately and were valid. Would buy again!',
        eventName: 'Summer Music Festival',
        ticketType: 'VIP',
        eventDate: 'July 15, 2026',
        reviewDate: 'January 15, 2026'
      },
      {
        id: 'r2',
        buyerName: 'Bob Wilson',
        type: 'neutral' as const,
        comment: 'Good experience overall. Tickets arrived on time.',
        eventName: 'Rock Night',
        ticketType: 'General Admission',
        eventDate: 'August 20, 2026',
        reviewDate: 'January 10, 2026'
      },
      {
        id: 'r3',
        buyerName: 'Carol Martinez',
        type: 'positive' as const,
        comment: 'Excellent! Quick response and smooth transaction.',
        eventName: 'Summer Music Festival',
        ticketType: 'Field',
        eventDate: 'July 15, 2026',
        reviewDate: 'January 5, 2026'
      },
      {
        id: 'r5',
        buyerName: 'James Taylor',
        type: 'negative' as const,
        comment: 'Tickets took longer than expected to transfer, but eventually worked.',
        eventName: 'Jazz Evening',
        ticketType: 'Standard',
        eventDate: 'September 5, 2026',
        reviewDate: 'January 3, 2026'
      }
    ]
  },
  seller2: {
    id: 'seller2',
    name: 'Sarah Johnson',
    picture: '',
    memberSince: 'March 2024',
    totalSales: 89,
    reviewStats: { positive: 75, neutral: 10, negative: 4 },
    reviews: [
      {
        id: 'r4',
        buyerName: 'David Lee',
        type: 'positive' as const,
        comment: 'Perfect transaction! Highly recommended seller.',
        eventName: 'Electronic Dance Night',
        ticketType: 'VIP',
        eventDate: 'November 1, 2026',
        reviewDate: 'January 18, 2026'
      }
    ]
  }
};

export function SellerProfile() {
  const { sellerId } = useParams<{ sellerId: string }>();
  const seller = mockSellerData[sellerId as keyof typeof mockSellerData];

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Seller not found</h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            Return to home
          </Link>
        </div>
      </div>
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
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {seller.name.split(' ').map(n => n[0]).join('')}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{seller.name}</h1>
              <p className="text-gray-600 mb-4">Member since {seller.memberSince}</p>

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
        </div>
      </div>
    </div>
  );
}
