import { useParams, Link } from 'react-router-dom';
import { MapPin, Calendar, Clock, Ticket, ArrowLeft, ThumbsUp, ThumbsDown, Minus, Award, ShieldCheck, Trophy } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { eventsService } from '../../api/services/events.service';
import { ticketsService } from '../../api/services/tickets.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import type { EventWithDates, ListingWithSeller } from '../../api/types';
import { TicketUnitStatus } from '../../api/types';
import { useUser } from '../contexts/UserContext';

interface ShowTime {
  date: string;
  time: string;
  dateObj: Date;
  eventDateId: string;
}

interface SellerReviews {
  positive: number;
  neutral: number;
  negative: number;
}

interface TransformedTicket {
  id: string;
  type: string;
  price: number;
  available: number;
  sellTogether: boolean;
  commissionPercentRange: { min: number; max: number };
  seller: string;
  sellerName: string;
  sellerPicture?: string;
  sellerReviews: SellerReviews;
  sellerBadges: Array<'trusted' | 'verified' | 'best_seller'>;
  sellerTotalSales: number;
  showTime: ShowTime;
}

/**
 * Transform BFF listing (with seller info) to UI format
 */
function transformListing(listing: ListingWithSeller, eventDates: EventWithDates['dates']): TransformedTicket {
  const eventDate = eventDates.find(d => d.id === listing.eventDateId);
  const dateObj = eventDate ? new Date(eventDate.date) : new Date(listing.eventDate);

  const typeDisplay = listing.type === 'Physical' ? 'Physical'
    : listing.type === 'DigitalTransferable' ? 'Digital'
    : 'Digital (Non-transferable)';

  return {
    id: listing.id,
    type: listing.sectionName || typeDisplay,
    price: listing.pricePerTicket.amount / 100,
    available: listing.ticketUnits.filter((unit) => unit.status === TicketUnitStatus.Available).length,
    sellTogether: listing.sellTogether,
    commissionPercentRange: listing.commissionPercentRange,
    seller: listing.sellerId,
    sellerName: listing.sellerPublicName,
    sellerPicture: listing.sellerPic.src,
    sellerReviews: { positive: 0, neutral: 0, negative: 0 },
    sellerBadges: [],
    sellerTotalSales: 0,
    showTime: {
      date: dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      time: dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
      dateObj,
      eventDateId: listing.eventDateId,
    },
  };
}

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
  const { user } = useUser();
  
  const [event, setEvent] = useState<EventWithDates | null>(null);
  const [listings, setListings] = useState<ListingWithSeller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedShowTimes, setSelectedShowTimes] = useState<string[]>([]);
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>([]);

  // Fetch event and listings
  useEffect(() => {
    async function fetchData() {
      if (!eventId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const [eventData, listingsData] = await Promise.all([
          eventsService.getEvent(eventId),
          ticketsService.getEventListings(eventId),
        ]);
        
        setEvent(eventData);
        setListings(listingsData);
      } catch (err) {
        console.error('Failed to fetch event data:', err);
        setError(t('eventTickets.errorLoading'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [eventId, t]);

  // Transform listings to UI format (BFF already filters for active + available)
  // Also filter out the current user's own listings so sellers don't see their own tickets
  const tickets = useMemo(() => {
    if (!event) return [];
    const filteredListings = listings.filter(l => l.sellerId !== user?.id);
    return filteredListings.map(l => transformListing(l, event.dates));
  }, [listings, event, user?.id]);

  // Get unique show times
  const uniqueShowTimes = useMemo(() => {
    return Array.from(
      new Set(tickets.map(t => `${t.showTime.date}|${t.showTime.time}`))
    ).map(key => {
      const [date, time] = key.split('|');
      const ticket = tickets.find(t => t.showTime.date === date && t.showTime.time === time);
      return { date, time, dateObj: ticket!.showTime.dateObj, key };
    }).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [tickets]);

  // Get unique ticket types
  const uniqueTicketTypes = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.type))).sort();
  }, [tickets]);

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
  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const dateCompare = a.showTime.dateObj.getTime() - b.showTime.dateObj.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.type.localeCompare(b.type);
    });
  }, [tickets]);

  // Apply filters
  const displayTickets = useMemo(() => {
    let filtered = sortedTickets;
    
    if (selectedShowTimes.length > 0) {
      filtered = filtered.filter(t => 
        selectedShowTimes.includes(`${t.showTime.date}|${t.showTime.time}`)
      );
    }
    
    if (selectedTicketTypes.length > 0) {
      filtered = filtered.filter(t => 
        selectedTicketTypes.includes(t.type)
      );
    }
    
    return filtered;
  }, [sortedTickets, selectedShowTimes, selectedTicketTypes]);

  // Group tickets by show time for display
  const ticketsByShowTime = useMemo(() => {
    return displayTickets.reduce((acc, ticket) => {
      const key = `${ticket.showTime.date}|${ticket.showTime.time}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(ticket);
      return acc;
    }, {} as Record<string, TransformedTicket[]>);
  }, [displayTickets]);

  const renderReviews = (reviews: SellerReviews) => {
    const totalReviews = reviews.positive + reviews.neutral + reviews.negative;
    const positivePercentage = totalReviews > 0 ? Math.round((reviews.positive / totalReviews) * 100) : 0;
    
    if (totalReviews === 0) {
      return (
        <p className="text-xs text-gray-500">{t('eventTickets.noReviewsYet')}</p>
      );
    }
    
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

  // Loading state
  if (isLoading) {
    return (
      <LoadingSpinner 
        size="lg" 
        text={t('common.loading')} 
        fullScreen 
      />
    );
  }

  // Error state
  if (error || !event) {
    return (
      <ErrorMessage 
        title={error || t('eventTickets.eventNotFound')}
        message={t('eventTickets.errorLoading')}
        fullScreen
      />
    );
  }

  // Build location string
  const locationStr = [event.location.city, event.location.countryCode].filter(Boolean).join(', ');

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
            {event.images?.[0]?.src ? (
              <img 
                src={event.images[0].src}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Ticket className="w-32 h-32 text-white opacity-50" />
            )}
          </div>

          <div className="p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{event.name}</h1>
            <p className="text-xl text-gray-600 mb-6">{event.category}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">{t('eventTickets.location')}</p>
                  <p className="font-semibold text-gray-900">{locationStr}</p>
                  <p className="text-sm text-gray-600">{event.venue}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">{t('eventTickets.availableDates')}</p>
                  {event.dates
                    .filter(d => d.status === 'approved')
                    .slice(0, 3)
                    .map((eventDate) => {
                      const date = new Date(eventDate.date);
                      const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                      return (
                        <p key={eventDate.id} className="text-sm text-gray-900">
                          {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          {' '}at {time}
                        </p>
                      );
                    })}
                  {event.dates.filter(d => d.status === 'approved').length > 3 && (
                    <p className="text-sm text-blue-600">
                      +{event.dates.filter(d => d.status === 'approved').length - 3} more dates
                    </p>
                  )}
                </div>
              </div>
            </div>

            <p className="text-gray-700">{event.description}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('eventTickets.availableTickets')}</h2>
          
          {tickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title={t('eventTickets.noTicketsAvailable')}
              description={t('eventTickets.checkBackLater')}
              action={{
                label: t('boughtTickets.startSelling'),
                to: '/sell',
              }}
            />
          ) : (
            <>
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
                {Object.entries(ticketsByShowTime).map(([showTimeKey, showTimeTickets]) => {
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
                        {showTimeTickets.map((ticket) => (
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
                                  <p className="text-xs text-gray-500 mt-1">
                                    {t('eventTickets.commissionRange', {
                                      min: ticket.commissionPercentRange.min,
                                      max: ticket.commissionPercentRange.max,
                                    })}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">{t('eventTickets.available')}</p>
                                  <p className="text-sm text-gray-900">
                                    {t('eventTickets.ticketsAvailable', { count: ticket.available })}
                                    {ticket.sellTogether ? (
                                      <span className="ml-1 text-gray-500">
                                        ({t('eventTickets.soldAsBundle')})
                                      </span>
                                    ) : (
                                      <span className="ml-1 text-gray-500">
                                        ({t('eventTickets.soldIndividually')})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Seller Information */}
                            <div className="border-t border-gray-200 pt-4 mt-auto">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">{t('eventTickets.soldBy')}</h4>
                              <div className="flex items-start gap-3 mb-4">
                                {/* Seller Picture */}
                                {ticket.sellerPicture ? (
                                  <img
                                    src={ticket.sellerPicture}
                                    alt={ticket.sellerName}
                                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {ticket.sellerName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                  </div>
                                )}

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
                                    {ticket.sellerTotalSales > 0 && (
                                      <p className="text-xs text-gray-600">
                                        {t('eventTickets.ticketsSold', { count: ticket.sellerTotalSales })}
                                      </p>
                                    )}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
