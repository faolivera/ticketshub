import { useState, useEffect, useMemo } from 'react';
import { Search, Calendar, ShieldCheck, Ticket, Headphones, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EventCard } from '@/app/components/EventCard';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { EmptyState } from '@/app/components/EmptyState';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from '@/app/components/ui/drawer';
import { Checkbox } from '@/app/components/ui/checkbox';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/app/components/PageMeta';
import { JsonLd } from '@/app/components/JsonLd';
import { getBaseUrl } from '@/config/env';
import { eventsService } from '../../api/services/events.service';
import type { EventWithDates } from '../../api/types';
import { EventCategory, EventSectionStatus } from '../../api/types/events';
import { formatDate, formatTime } from '@/lib/format-date';

/**
 * Transform API event data to EventCard props format
 */
function transformEventForCard(event: EventWithDates) {
  // Transform dates to showTimes format
  const showTimes = event.dates
    .filter(d => d.status === 'approved')
    .map(d => {
      const date = new Date(d.date);
      return {
        date: formatDate(d.date),
        time: formatTime(d.date),
      };
    });

  // Generate labels based on event properties
  const labels: string[] = [];
  const createdRecently = new Date(event.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (createdRecently) {
    labels.push('New Event');
  }

  // Build location string (city + country name for display)
  const locationStr = buildLocationString(event.location.city, event.location.countryCode);

  // Unique approved section names (sectors with tickets available for purchase)
  const ticketTypes = [
    ...new Set(
      event.sections
        .filter(s => s.status === EventSectionStatus.Approved)
        .map(s => s.name)
    ),
  ];

  return {
    id: event.id,
    slug: event.slug,
    name: event.name,
    artist: event.name, // Use event name as artist since backend doesn't have artist field
    location: locationStr,
    venue: event.venue,
    showTimes,
    ticketTypes,
    labels,
    bannerUrls: event.bannerUrls,
    image: event.images?.[0]?.src,
    price: undefined, // Will be updated when we fetch listings
  };
}

/** Map ISO country code to display name (avoids showing raw "US" / "AR") */
const COUNTRY_NAMES: Record<string, string> = {
  AR: 'Argentina',
  US: 'United States',
  DE: 'Germany',
  ES: 'Spain',
  MX: 'Mexico',
  CO: 'Colombia',
  CL: 'Chile',
  BR: 'Brazil',
  UY: 'Uruguay',
  PY: 'Paraguay',
};

function buildLocationString(city: string, countryCode: string): string {
  const parts = [city?.trim(), countryCode ? (COUNTRY_NAMES[countryCode] ?? countryCode) : null].filter(Boolean);
  return parts.length ? parts.join(', ') : '';
}

function TrustItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 py-1 flex-shrink-0">
      <Icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{label}</span>
    </div>
  );
}

const CATEGORY_I18N_KEYS: Record<EventCategory, string> = {
  [EventCategory.Concert]:    'landing.categoryConcert',
  [EventCategory.Sports]:     'landing.categorySports',
  [EventCategory.Theater]:    'landing.categoryTheater',
  [EventCategory.Festival]:   'landing.categoryFestival',
  [EventCategory.Conference]: 'landing.categoryConference',
  [EventCategory.Comedy]:     'landing.categoryComedy',
  [EventCategory.Other]:      'landing.categoryOther',
};

export function Landing() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<EventCategory | null>(null);
  const [events, setEvents] = useState<EventWithDates[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch events on mount
  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await eventsService.listEvents({ 
          status: 'approved',
          limit: 50 
        });
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch events:', err);
        setError(t('landing.errorLoadingEvents'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, [t]);

  // Categories that actually have at least one loaded event
  const availableCategories = useMemo(() => {
    const present = new Set(events.map(e => e.category));
    return Object.values(EventCategory).filter(c => present.has(c));
  }, [events]);

  // Transform and filter events (guard against undefined string fields from API)
  const filteredEvents = useMemo(() => {
    const searchLower = (searchTerm ?? '').toLowerCase();

    return events
      .filter(event => {
        if (activeCategory && event.category !== activeCategory) return false;
        if (!searchTerm) return true;
        const name = (event.name ?? '').toLowerCase();
        const venue = (event.venue ?? '').toLowerCase();
        const city = (event.location?.city ?? '').toLowerCase();
        const description = (event.description ?? '').toLowerCase();
        return (
          name.includes(searchLower) ||
          venue.includes(searchLower) ||
          city.includes(searchLower) ||
          description.includes(searchLower)
        );
      })
      .map(transformEventForCard);
  }, [events, searchTerm, activeCategory]);

  const baseUrl = getBaseUrl();
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TicketsHub',
    url: baseUrl || 'https://ticketshub.com.ar',
    logo: `${baseUrl || 'https://ticketshub.com.ar'}/assets/og-default.png`,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageMeta title={t('seo.landing.title')} description={t('seo.landing.description')} />
      <JsonLd data={organizationJsonLd} />
      <div
        className="relative bg-cover bg-center bg-no-repeat text-white py-8 sm:py-12 md:py-28 min-h-[220px] sm:min-h-[260px] md:min-h-[420px] flex items-center"
        style={{ backgroundImage: 'url(/assets/hero.jpeg)' }}
      >
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 w-full">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4 text-center tracking-tight">
            {t('landing.title')}
          </h1>
          <p className="md:hidden text-base text-center mb-3 text-white/80">
            {t('landing.subtitleShort')}
          </p>
          <p className="hidden md:block text-xl text-center mb-4 text-white/80">
            {t('landing.subtitle')}
          </p>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder={t('landing.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 md:py-4 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white shadow-lg min-h-[44px]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-6 overflow-x-auto scrollbar-none md:justify-around">
          <TrustItem icon={ShieldCheck} label={t('landing.trustSecurePayment')} />
          <TrustItem icon={Ticket} label={t('landing.trustGuaranteedTickets')} />
          <TrustItem icon={Headphones} label={t('landing.trustSupport')} />
          <TrustItem icon={RotateCcw} label={t('landing.trustRefund')} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3 sm:mb-4 mb-4">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 truncate m-0 leading-tight py-0.5">
              {searchTerm ? t('landing.searchResults') : t('landing.upcomingEvents')}
            </h2>

            {/* Mobile: filter drawer trigger to the right of title (only when more than one category) */}
            {isMobile && !isLoading && !error && availableCategories.length > 1 && (
              <Drawer>
                <DrawerTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 min-h-[44px] text-sm font-medium border border-gray-300 rounded-lg bg-white text-gray-700 hover:border-gray-400 transition-colors flex-shrink-0 touch-manipulation"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {t('landing.filters')}
                    {activeCategory !== null && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                        1
                      </span>
                    )}
                  </button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>{t('landing.filters')}</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4 pb-4 space-y-1 overflow-y-auto">
                    <label className="flex items-center gap-3 py-3 px-1 rounded-md cursor-pointer hover:bg-gray-50">
                      <Checkbox
                        checked={activeCategory === null}
                        onCheckedChange={() => setActiveCategory(null)}
                      />
                      <span className="text-sm font-medium">{t('landing.categoryAll')}</span>
                    </label>
                    {availableCategories.map(category => (
                      <label
                        key={category}
                        className="flex items-center gap-3 py-3 px-1 rounded-md cursor-pointer hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={activeCategory === category}
                          onCheckedChange={() => setActiveCategory(category)}
                        />
                        <span className="text-sm">{t(CATEGORY_I18N_KEYS[category])}</span>
                      </label>
                    ))}
                  </div>
                  <DrawerFooter className="flex-row gap-2">
                    <DrawerClose asChild>
                      <button
                        type="button"
                        className="flex-1 px-4 py-2.5 min-h-[44px] text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors touch-manipulation"
                      >
                        {t('landing.applyFilters')}
                      </button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            )}
          </div>

          {/* Desktop: horizontal category chips — same row as title, aligned (only when more than one category) */}
          {!isMobile && !isLoading && !error && availableCategories.length > 1 && (
            <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto scrollbar-none pb-1">
              <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className={`px-4 py-2 sm:py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] sm:min-h-0 ${
                    activeCategory === null
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {t('landing.categoryAll')}
                </button>
                {availableCategories.map(category => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                    className={`px-4 py-2 sm:py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-h-[44px] sm:min-h-0 ${
                      activeCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {t(CATEGORY_I18N_KEYS[category])}
                  </button>
                  ))}
            </div>
          )}
        </div>

        {isLoading && (
          <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />
        )}

        {error && (
          <ErrorMessage 
            message={error}
            onRetry={() => window.location.reload()}
            className="py-12"
          />
        )}

        {!isLoading && !error && filteredEvents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        )}

        {!isLoading && !error && filteredEvents.length === 0 && (
          <EmptyState
            icon={Calendar}
            title={t('landing.noEventsFound')}
            description={searchTerm ? undefined : t('landing.checkBackLater')}
          />
        )}
      </div>
    </div>
  );
}
