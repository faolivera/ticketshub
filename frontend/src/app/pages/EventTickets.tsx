import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Calendar, Clock, Ticket, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ticketsService } from '../../api/services/tickets.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { EventBanner } from '../components/EventBanner';
import { TicketCard } from '../components/TicketCard';
import { TicketFilters } from '../components/TicketFilters';
import type { TransformedTicket } from '../components/TicketCard';
import type { PublicListEventItem, ListingWithSeller } from '../../api/types';
import { TicketUnitStatus } from '../../api/types';
import { useUser } from '../contexts/UserContext';
import { PageMeta } from '@/app/components/PageMeta';
import { JsonLd } from '@/app/components/JsonLd';
import { getBaseUrl } from '@/config/env';
import type { SortOption, ViewMode } from '../components/TicketFilters';
import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';
import { useIsMobile } from '../components/ui/use-mobile';
import { BackButton } from '../components/BackButton';
import { formatDate, formatTime, formatDateTime, formatDateTimeShort } from '@/lib/format-date';

/**
 * Transform BFF listing (with seller info) to UI format
 */
function transformListing(listing: ListingWithSeller, eventDates: PublicListEventItem['dates']): TransformedTicket {
  const eventDate = eventDates.find(d => d.id === listing.eventDateId);
  const dateObj = eventDate ? new Date(eventDate.date) : new Date(listing.eventDate);

  const typeDisplay = listing.type === 'Physical' ? 'Physical' : 'Digital';

  return {
    id: listing.id,
    eventSlug: listing.eventSlug,
    type: listing.sectionName || typeDisplay,
    price: listing.pricePerTicket.amount / 100,
    currency: listing.pricePerTicket.currency,
    available: listing.ticketUnits.filter((unit) => unit.status === TicketUnitStatus.Available).length,
    sellTogether: listing.sellTogether,
    commissionPercentRange: listing.commissionPercentRange,
    seller: listing.sellerId,
    sellerName: listing.sellerPublicName,
    sellerPicture: listing.sellerPic?.src,
    acceptsOffers: listing.bestOfferConfig?.enabled ?? false,
    sellerReputation: listing.sellerReputation,
    showTime: {
      date: formatDate(dateObj),
      time: formatTime(dateObj),
      dateObj,
      eventDateId: listing.eventDateId,
    },
  };
}


export function EventTickets() {
  const { t } = useTranslation();
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const { user } = useUser();
  
  const [event, setEvent] = useState<PublicListEventItem | null>(null);
  const [listings, setListings] = useState<ListingWithSeller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedShowTimes, setSelectedShowTimes] = useState<string[]>([]);
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>([]);
  const [acceptsOffersOnly, setAcceptsOffersOnly] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('price_asc');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [visibleCount, setVisibleCount] = useState(12);
  const isMobile = useIsMobile();
  // On mobile always use card view; list view is desktop-only
  const effectiveViewMode: ViewMode = isMobile ? 'card' : viewMode;

  // Fetch event and listings
  useEffect(() => {
    async function fetchData() {
      if (!eventSlug) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const { event: eventData, listings: listingsData } = await ticketsService.getEventPage(eventSlug);

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
  }, [eventSlug, t]);

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

  const headerStats = useMemo(() => {
    if (tickets.length === 0) return null;
    const prices = tickets.map(t => t.price);
    return {
      minPrice: Math.min(...prices),
      currency: tickets[0].currency,
      totalAvailable: tickets.reduce((sum, t) => sum + t.available, 0),
      sellersCount: new Set(tickets.map(t => t.seller)).size,
    };
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

  const toggleAcceptsOffers = () => setAcceptsOffersOnly(prev => !prev);

  const clearAllFilters = () => {
    setSelectedShowTimes([]);
    setSelectedTicketTypes([]);
    setAcceptsOffersOnly(false);
  };

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => {
      const dateCompare = a.showTime.dateObj.getTime() - b.showTime.dateObj.getTime();
      if (dateCompare !== 0) return dateCompare;
      switch (sortOption) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'most_available':
          return b.available - a.available;
        default:
          return a.type.localeCompare(b.type);
      }
    });
  }, [tickets, sortOption]);

  const hasOfferListings = useMemo(() => {
    return tickets.some(t => t.acceptsOffers);
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

    if (acceptsOffersOnly) {
      filtered = filtered.filter(t => t.acceptsOffers);
    }
    
    return filtered;
  }, [sortedTickets, selectedShowTimes, selectedTicketTypes, acceptsOffersOnly]);

  const bestPriceByType = useMemo(() => {
    const result: Record<string, string> = {};
    const typeGroups: Record<string, TransformedTicket[]> = {};

    for (const ticket of displayTickets) {
      if (!typeGroups[ticket.type]) typeGroups[ticket.type] = [];
      typeGroups[ticket.type].push(ticket);
    }

    for (const [, group] of Object.entries(typeGroups)) {
      if (group.length > 1) {
        const cheapest = group.reduce((min, t) => (t.price < min.price ? t : min), group[0]);
        result[cheapest.id] = cheapest.id;
      }
    }

    return result;
  }, [displayTickets]);

  const visibleTickets = useMemo(() => {
    return displayTickets.slice(0, visibleCount);
  }, [displayTickets, visibleCount]);

  const hasMoreTickets = displayTickets.length > visibleCount;
  const remainingCount = displayTickets.length - visibleCount;

  const ticketsByShowTime = useMemo(() => {
    return visibleTickets.reduce((acc, ticket) => {
      const key = `${ticket.showTime.date}|${ticket.showTime.time}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(ticket);
      return acc;
    }, {} as Record<string, TransformedTicket[]>);
  }, [visibleTickets]);

  // Loading state
  if (isLoading) {
    return (
      <>
        <PageMeta title={t('seo.defaultTitle')} description={t('seo.defaultDescription')} />
        <LoadingSpinner 
          size="lg" 
          text={t('common.loading')} 
          fullScreen 
        />
      </>
    );
  }

  // Error state
  if (error || !event) {
    return (
      <>
        <PageMeta title={t('seo.defaultTitle')} description={t('seo.defaultDescription')} />
        <ErrorMessage 
          title={error || t('eventTickets.eventNotFound')}
          message={t('eventTickets.errorLoading')}
          fullScreen
        />
      </>
    );
  }

  // Build location string
  const locationStr = [event.location.city, event.location.countryCode].filter(Boolean).join(', ');
  const baseUrl = getBaseUrl();
  const eventUrl = baseUrl ? `${baseUrl}/event/${event.slug}` : '';
  const firstDate = event.dates?.find(d => d.status === 'approved');
  const eventImage = event.bannerUrls?.rectangle ?? event.bannerUrls?.square ?? event.images?.[0]?.src;
  const eventImageAbs = eventImage
    ? (eventImage.startsWith('http') ? eventImage : `${baseUrl}${eventImage.startsWith('/') ? '' : '/'}${eventImage}`)
    : undefined;
  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    ...(firstDate && { startDate: new Date(firstDate.date).toISOString() }),
    ...(eventUrl && { url: eventUrl }),
    ...(eventImageAbs && { image: eventImageAbs }),
    location: {
      '@type': 'Place',
      name: event.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.location?.city,
        addressCountry: event.location?.countryCode,
      },
    },
    ...(listings.length > 0 &&
      baseUrl && {
        offers: listings.map((listing) => ({
          '@type': 'Offer',
          price: listing.pricePerTicket.amount / 100,
          priceCurrency: listing.pricePerTicket.currency,
          url: `${baseUrl}/buy/${event.slug}/${listing.id}`,
          availability: 'https://schema.org/InStock',
        })),
      }),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageMeta
        title={t('seo.eventTickets.title', { eventName: event.name })}
        description={t('seo.eventTickets.description', { eventName: event.name })}
        image={eventImage}
      />
      <JsonLd data={eventJsonLd} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <BackButton to="/" labelKey="eventTickets.backToEvents" className="mb-6" />

        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-2/5 flex-shrink-0">
              <EventBanner
                variant="rectangle"
                squareUrl={event.bannerUrls?.square || event.images?.[0]?.src}
                rectangleUrl={event.bannerUrls?.rectangle}
                alt={event.name}
                className="h-48 md:h-full md:min-h-[320px] md:aspect-auto"
              />
            </div>

            <div className="p-5 md:p-8 flex flex-col gap-3 md:gap-4 flex-1 min-w-0">
              <Badge variant="secondary" className="w-fit">{event.category}</Badge>

              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight">
                {event.name}
              </h1>

              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="truncate">
                  <span className="font-semibold">{event.venue}</span>
                  {locationStr && (
                    <span className="text-gray-500"> · {locationStr}</span>
                  )}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {tickets.length > 0 ? (
                  <>
                    {uniqueShowTimes.length > 1 && (
                      <button
                        onClick={() => setSelectedShowTimes([])}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                          selectedShowTimes.length === 0
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
                        )}
                      >
                        {t('eventTickets.allDates')}
                      </button>
                    )}
                    {uniqueShowTimes.map((st) => (
                      <button
                        key={st.key}
                        onClick={() => toggleShowTime(st.key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                          selectedShowTimes.includes(st.key)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
                        )}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateTimeShort(st.dateObj)}
                      </button>
                    ))}
                  </>
                ) : (
                  event.dates
                    .filter((d) => d.status === 'approved')
                    .slice(0, 5)
                    .map((eventDate) => (
                      <span
                        key={eventDate.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 bg-white text-gray-700"
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        {formatDateTimeShort(eventDate.date)}
                      </span>
                    ))
                )}
              </div>

              {headerStats && (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-base md:text-lg font-semibold text-blue-600">
                    {t('eventTickets.ticketsFrom', {
                      price: headerStats.minPrice.toLocaleString(undefined, {
                        style: 'currency',
                        currency: headerStats.currency,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }),
                    })}
                  </span>
                  <span className="text-sm text-gray-500">
                    {t('eventTickets.ticketsAvailable', { count: headerStats.totalAvailable })}
                    {' · '}
                    {t('eventTickets.fromSellersCount', { count: headerStats.sellersCount })}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 w-fit mt-auto">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">{t('eventTickets.buyerGuarantee')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('eventTickets.availableTickets')}</h2>

          {tickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title={t('eventTickets.noTicketsAvailable')}
              description={t('eventTickets.checkBackLater')}
              action={{
                label: t('boughtTickets.startSelling'),
                to: `/sell-ticket?eventName=${encodeURIComponent(event?.name ?? '')}`,
              }}
            />
          ) : (
            <>
              <TicketFilters
                uniqueShowTimes={uniqueShowTimes}
                uniqueTicketTypes={uniqueTicketTypes}
                selectedShowTimes={selectedShowTimes}
                selectedTicketTypes={selectedTicketTypes}
                onToggleShowTime={toggleShowTime}
                onToggleTicketType={toggleTicketType}
                onClearAll={clearAllFilters}
                sortOption={sortOption}
                onSortChange={setSortOption}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                displayCount={displayTickets.length}
                totalCount={sortedTickets.length}
                acceptsOffersOnly={acceptsOffersOnly}
                onAcceptsOffersToggle={toggleAcceptsOffers}
                hasOfferListings={hasOfferListings}
              />

              <div className="space-y-8">
                {Object.entries(ticketsByShowTime).map(([showTimeKey, showTimeTickets]) => {
                  const [date, time] = showTimeKey.split('|');
                  const totalTickets = showTimeTickets.reduce((sum, t) => sum + t.available, 0);
                  return (
                    <div key={showTimeKey}>
                      <div className="sticky top-0 z-10 bg-gray-50 flex items-center justify-between gap-2 mb-4 pb-3 pt-3 -mt-2 px-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                          <h3 className="text-sm md:text-lg font-bold text-gray-900">
                            {showTimeTickets[0] ? formatDateTime(showTimeTickets[0].showTime.dateObj) : `${date} ${time}`}
                          </h3>
                        </div>
                        <>
                          <span className="flex items-center gap-1.5 text-sm text-gray-500 md:hidden">
                            <Ticket className="w-4 h-4 text-blue-600" />
                            {totalTickets}
                          </span>
                          <span className="hidden md:inline text-sm text-gray-500">
                            {t('eventTickets.ticketsCount', { count: totalTickets })}
                          </span>
                        </>
                      </div>

                      {effectiveViewMode === 'card' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {showTimeTickets.map((ticket) => (
                            <TicketCard
                              key={ticket.id}
                              ticket={ticket}
                              isBestPrice={ticket.id in bestPriceByType}
                              variant="card"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {showTimeTickets.map((ticket) => (
                            <TicketCard
                              key={ticket.id}
                              ticket={ticket}
                              isBestPrice={ticket.id in bestPriceByType}
                              variant="list"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {hasMoreTickets && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 12)}
                    className="px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {t('eventTickets.showMore', { count: remainingCount })}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
