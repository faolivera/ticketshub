import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Clock, Ticket, ArrowLeft, ThumbsUp, ThumbsDown, Minus, Award, ShieldCheck, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ShowTime {
  date: string;
  time: string;
  dateObj: Date;
}

interface SellerReviews {
  positive: number;
  neutral: number;
  negative: number;
}

interface TicketListing {
  id: string;
  type: string;
  price: number;
  available: number;
  seller: string;
  sellerName: string;
  sellerPicture?: string;
  sellerReviews: SellerReviews;
  sellerBadges: Array<'trusted' | 'verified' | 'best_seller'>;
  sellerTotalSales: number;
  showTime: ShowTime;
}

const mockEventDetails = {
  '1': {
    id: '1',
    name: 'Summer Music Festival',
    artist: 'Various Artists',
    location: 'Los Angeles, CA',
    venue: 'LA Stadium',
    description: 'Join us for the biggest music festival of the summer featuring top artists from around the world!',
    tickets: [
      { 
        id: 't1', 
        type: 'VIP', 
        price: 250, 
        available: 15, 
        seller: 'seller1', 
        sellerName: 'John Smith',
        sellerReviews: { positive: 120, neutral: 5, negative: 2 },
        sellerBadges: ['trusted', 'verified'] as const,
        sellerTotalSales: 127,
        showTime: { date: 'July 15, 2026', time: '4:00 PM', dateObj: new Date('2026-07-15T16:00:00') }
      },
      { 
        id: 't2', 
        type: 'General Admission', 
        price: 89, 
        available: 50, 
        seller: 'seller2', 
        sellerName: 'Sarah Johnson',
        sellerReviews: { positive: 75, neutral: 10, negative: 4 },
        sellerBadges: ['verified'] as const,
        sellerTotalSales: 89,
        showTime: { date: 'July 15, 2026', time: '4:00 PM', dateObj: new Date('2026-07-15T16:00:00') }
      },
      { 
        id: 't3', 
        type: 'VIP', 
        price: 230, 
        available: 8, 
        seller: 'seller3', 
        sellerName: 'Mike Davis',
        sellerReviews: { positive: 185, neutral: 12, negative: 6 },
        sellerBadges: ['best_seller'] as const,
        sellerTotalSales: 203,
        showTime: { date: 'July 15, 2026', time: '10:00 PM', dateObj: new Date('2026-07-15T22:00:00') }
      },
      { 
        id: 't4', 
        type: 'Field', 
        price: 150, 
        available: 20, 
        seller: 'seller1', 
        sellerName: 'John Smith',
        sellerReviews: { positive: 120, neutral: 5, negative: 2 },
        sellerBadges: ['trusted', 'verified'] as const,
        sellerTotalSales: 127,
        showTime: { date: 'July 15, 2026', time: '10:00 PM', dateObj: new Date('2026-07-15T22:00:00') }
      },
      { 
        id: 't5', 
        type: 'General Admission', 
        price: 95, 
        available: 30, 
        seller: 'seller4', 
        sellerName: 'Emma Wilson',
        sellerReviews: { positive: 335, neutral: 4, negative: 1 },
        sellerBadges: ['trusted', 'verified', 'best_seller'] as const,
        sellerTotalSales: 340,
        showTime: { date: 'July 17, 2026', time: '10:00 PM', dateObj: new Date('2026-07-17T22:00:00') }
      },
      { 
        id: 't6', 
        type: 'VIP', 
        price: 245, 
        available: 12, 
        seller: 'seller2', 
        sellerName: 'Sarah Johnson',
        sellerReviews: { positive: 75, neutral: 10, negative: 4 },
        sellerBadges: ['verified'] as const,
        sellerTotalSales: 89,
        showTime: { date: 'July 17, 2026', time: '10:00 PM', dateObj: new Date('2026-07-17T22:00:00') }
      }
    ]
  },
  '2': {
    id: '2',
    name: 'Bad Bunny',
    artist: 'Bad Bunny',
    location: 'New York, NY',
    venue: 'Madison Square Garden',
    description: 'Experience the electrifying performance of Bad Bunny live in concert!',
    tickets: [
      { 
        id: 't7', 
        type: 'VIP', 
        price: 300, 
        available: 10, 
        seller: 'seller1', 
        sellerName: 'John Smith',
        sellerReviews: { positive: 120, neutral: 5, negative: 2 },
        sellerBadges: ['trusted', 'verified'] as const,
        sellerTotalSales: 127,
        showTime: { date: 'July 15, 2026', time: '4:00 PM', dateObj: new Date('2026-07-15T16:00:00') }
      },
      { 
        id: 't8', 
        type: 'Normal', 
        price: 125, 
        available: 40, 
        seller: 'seller3', 
        sellerName: 'Mike Davis',
        sellerReviews: { positive: 185, neutral: 12, negative: 6 },
        sellerBadges: ['best_seller'] as const,
        sellerTotalSales: 203,
        showTime: { date: 'July 15, 2026', time: '4:00 PM', dateObj: new Date('2026-07-15T16:00:00') }
      },
      { 
        id: 't9', 
        type: 'VIP', 
        price: 295, 
        available: 15, 
        seller: 'seller2', 
        sellerName: 'Sarah Johnson',
        sellerReviews: { positive: 75, neutral: 10, negative: 4 },
        sellerBadges: ['verified'] as const,
        sellerTotalSales: 89,
        showTime: { date: 'July 15, 2026', time: '10:00 PM', dateObj: new Date('2026-07-15T22:00:00') }
      },
      { 
        id: 't10', 
        type: 'Normal', 
        price: 130, 
        available: 35, 
        seller: 'seller4', 
        sellerName: 'Emma Wilson',
        sellerReviews: { positive: 335, neutral: 4, negative: 1 },
        sellerBadges: ['trusted', 'verified', 'best_seller'] as const,
        sellerTotalSales: 340,
        showTime: { date: 'July 15, 2026', time: '10:00 PM', dateObj: new Date('2026-07-15T22:00:00') }
      },
      { 
        id: 't11', 
        type: 'VIP', 
        price: 310, 
        available: 8, 
        seller: 'seller1', 
        sellerName: 'John Smith',
        sellerReviews: { positive: 120, neutral: 5, negative: 2 },
        sellerBadges: ['trusted', 'verified'] as const,
        sellerTotalSales: 127,
        showTime: { date: 'July 17, 2026', time: '10:00 PM', dateObj: new Date('2026-07-17T22:00:00') }
      },
      { 
        id: 't12', 
        type: 'Normal', 
        price: 135, 
        available: 25, 
        seller: 'seller3', 
        sellerName: 'Mike Davis',
        sellerReviews: { positive: 185, neutral: 12, negative: 6 },
        sellerBadges: ['best_seller'] as const,
        sellerTotalSales: 203,
        showTime: { date: 'July 17, 2026', time: '10:00 PM', dateObj: new Date('2026-07-17T22:00:00') }
      }
    ]
  }
};

const getBadgeIcon = (badge: 'trusted' | 'verified' | 'best_seller') => {
  switch (badge) {
    case 'trusted':
      return <ShieldCheck className="w-4 h-4" />;
    case 'verified':
      return <Award className="w-4 h-4" />;
    case 'best_seller':
      return <Trophy className="w-4 h-4" />;
  }
};

const getBadgeColor = (badge: 'trusted' | 'verified' | 'best_seller') => {
  switch (badge) {
    case 'trusted':
      return 'bg-blue-100 text-blue-700';
    case 'verified':
      return 'bg-green-100 text-green-700';
    case 'best_seller':
      return 'bg-purple-100 text-purple-700';
  }
};

const getBadgeLabel = (badge: 'trusted' | 'verified' | 'best_seller', t: (key: string) => string) => {
  switch (badge) {
    case 'trusted':
      return t('eventTickets.badgeTrusted');
    case 'verified':
      return t('eventTickets.badgeVerified');
    case 'best_seller':
      return t('eventTickets.badgeBestSeller');
  }
};

export function EventTickets() {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const event = mockEventDetails[eventId as keyof typeof mockEventDetails];
  const [selectedShowTimes, setSelectedShowTimes] = useState<string[]>([]);
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>([]);

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('eventTickets.eventNotFound')}</h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            {t('eventTickets.returnToHome')}
          </Link>
        </div>
      </div>
    );
  }

  // Get unique show times
  const uniqueShowTimes = Array.from(
    new Set(event.tickets.map(t => `${t.showTime.date}|${t.showTime.time}`))
  ).map(key => {
    const [date, time] = key.split('|');
    const ticket = event.tickets.find(t => t.showTime.date === date && t.showTime.time === time);
    return { date, time, dateObj: ticket!.showTime.dateObj, key };
  }).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

  // Get unique ticket types
  const uniqueTicketTypes = Array.from(
    new Set(event.tickets.map(t => t.type))
  ).sort();

  // Toggle filter selection
  const toggleShowTime = (key: string) => {
    setSelectedShowTimes(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleTicketType = (type: string) => {
    setSelectedTicketTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearAllFilters = () => {
    setSelectedShowTimes([]);
    setSelectedTicketTypes([]);
  };

  // Sort tickets: first by date/time, then by ticket type
  const sortedTickets = [...event.tickets].sort((a, b) => {
    // First sort by date/time
    const dateCompare = a.showTime.dateObj.getTime() - b.showTime.dateObj.getTime();
    if (dateCompare !== 0) return dateCompare;
    
    // Then sort by ticket type (alphabetically)
    return a.type.localeCompare(b.type);
  });

  // Apply filters
  let displayTickets = sortedTickets;
  
  if (selectedShowTimes.length > 0) {
    displayTickets = displayTickets.filter(t => 
      selectedShowTimes.includes(`${t.showTime.date}|${t.showTime.time}`)
    );
  }
  
  if (selectedTicketTypes.length > 0) {
    displayTickets = displayTickets.filter(t => 
      selectedTicketTypes.includes(t.type)
    );
  }

  // Group tickets by show time for display
  const ticketsByShowTime = displayTickets.reduce((acc, ticket) => {
    const key = `${ticket.showTime.date}|${ticket.showTime.time}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(ticket);
    return acc;
  }, {} as Record<string, TicketListing[]>);

  const renderReviews = (reviews: SellerReviews) => {
    const totalReviews = reviews.positive + reviews.neutral + reviews.negative;
    const positivePercentage = totalReviews > 0 ? Math.round((reviews.positive / totalReviews) * 100) : 0;
    
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-green-600">
            <ThumbsUp className="w-3.5 h-3.5" />
            <span className="font-semibold">{reviews.positive}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Minus className="w-3.5 h-3.5" />
            <span className="font-semibold">{reviews.neutral}</span>
          </div>
          <div className="flex items-center gap-1 text-red-500">
            <ThumbsDown className="w-3.5 h-3.5" />
            <span className="font-semibold">{reviews.negative}</span>
          </div>
        </div>
        <div className="text-xs text-gray-600">
          {t('eventTickets.positiveReviews', { percent: positivePercentage, total: totalReviews })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('eventTickets.backToEvents')}
        </Link>

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="h-64 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Ticket className="w-32 h-32 text-white opacity-50" />
          </div>

          <div className="p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{event.name}</h1>
            <p className="text-xl text-gray-600 mb-6">{event.artist}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">{t('eventTickets.location')}</p>
                  <p className="font-semibold text-gray-900">{event.location}</p>
                  <p className="text-sm text-gray-600">{event.venue}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">{t('eventTickets.availableDates')}</p>
                  {uniqueShowTimes.map((showTime, index) => (
                    <p key={index} className="text-sm text-gray-900">
                      {showTime.date} at {showTime.time}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-gray-700">{event.description}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('eventTickets.availableTickets')}</h2>
          
          {/* Filters */}
          <div className="mb-6 space-y-4">
            {/* Date Filters */}
            {uniqueShowTimes.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-gray-700">{t('eventTickets.filterByDateTime')}</label>
                  {(selectedShowTimes.length > 0 || selectedTicketTypes.length > 0) && (
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {t('eventTickets.clearAllFilters')}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {uniqueShowTimes.map((showTime) => (
                    <button
                      key={showTime.key}
                      onClick={() => toggleShowTime(showTime.key)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        selectedShowTimes.includes(showTime.key)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {showTime.date} at {showTime.time}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Ticket Type Filters */}
            {uniqueTicketTypes.length > 1 && (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-3">{t('eventTickets.filterByTicketType')}</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueTicketTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleTicketType(type)}
                      className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                        selectedTicketTypes.includes(type)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Ticket className="w-4 h-4" />
                        <span className="text-sm font-medium">{type}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Filters Summary */}
            {(selectedShowTimes.length > 0 || selectedTicketTypes.length > 0) && (
              <div className="pt-2 text-sm text-gray-600">
                {t('eventTickets.showing', { displayed: displayTickets.length, total: sortedTickets.length })}
              </div>
            )}
          </div>

          <div className="space-y-8">
            {Object.entries(ticketsByShowTime).map(([showTimeKey, tickets]) => {
              const [date, time] = showTimeKey.split('|');
              return (
                <div key={showTimeKey}>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      {date} at {time}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tickets.map((ticket) => (
                      <div 
                        key={ticket.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors flex flex-col"
                      >
                        {/* Ticket Information */}
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">{t('eventTickets.ticketDetails')}</h4>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-gray-500">{t('eventTickets.type')}</p>
                              <p className="text-lg font-bold text-gray-900">{ticket.type}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t('eventTickets.dateTime')}</p>
                              <p className="text-sm text-gray-900">{ticket.showTime.date}</p>
                              <p className="text-sm text-gray-900">{ticket.showTime.time}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t('eventTickets.price')}</p>
                              <p className="text-3xl font-bold text-blue-600">${ticket.price}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t('eventTickets.available')}</p>
                              <p className="text-sm text-gray-900">{t('eventTickets.ticketsAvailable', { count: ticket.available })}</p>
                            </div>
                          </div>
                        </div>

                        {/* Seller Information */}
                        <div className="border-t border-gray-200 pt-4 mt-auto">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">{t('eventTickets.soldBy')}</h4>
                          <div className="flex items-start gap-3 mb-4">
                            {/* Seller Picture */}
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                              {ticket.sellerName.split(' ').map(n => n[0]).join('')}
                            </div>

                            <div className="flex-1 min-w-0">
                              <Link 
                                to={`/seller/${ticket.seller}`}
                                className="text-sm font-semibold text-blue-600 hover:text-blue-700 block mb-1 truncate"
                              >
                                {ticket.sellerName}
                              </Link>

                              {/* Reviews and Sales */}
                              <div className="mb-2 space-y-1">
                                {renderReviews(ticket.sellerReviews)}
                                <p className="text-xs text-gray-600">
                                  {t('eventTickets.ticketsSold', { count: ticket.sellerTotalSales })}
                                </p>
                              </div>

                              {/* Badges */}
                              {ticket.sellerBadges.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {ticket.sellerBadges.map((badge) => (
                                    <span 
                                      key={badge}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${getBadgeColor(badge)}`}
                                    >
                                      {getBadgeIcon(badge)}
                                      {getBadgeLabel(badge, t)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <Link
                            to={`/buy/${ticket.id}`}
                            className="block w-full px-4 py-3 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {t('eventTickets.buyTicket')}
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
