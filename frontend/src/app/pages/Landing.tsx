import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Shield, Calendar } from 'lucide-react';
import { EventCard } from '@/app/components/EventCard';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorMessage } from '@/app/components/ErrorMessage';
import { EmptyState } from '@/app/components/EmptyState';
import { useTranslation } from 'react-i18next';
import { eventsService } from '../../api/services/events.service';
import type { EventWithDates, EventCategory } from '../../api/types';

/**
 * Transform API event data to EventCard props format
 */
function transformEventForCard(event: EventWithDates) {
  // Transform dates to showTimes format
  const showTimes = event.dates
    .filter(d => d.status === 'approved')
    .map(d => {
      const date = new Date(d.date);
      const startTime = d.startTime ? new Date(d.startTime) : date;
      return {
        date: date.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        }),
        time: startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
      };
    });

  // Generate labels based on event properties
  const labels: string[] = [];
  const createdRecently = new Date(event.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  if (createdRecently) {
    labels.push('New Event');
  }

  // Build location string
  const locationStr = [event.location.city, event.location.countryCode].filter(Boolean).join(', ');

  return {
    id: event.id,
    name: event.name,
    artist: event.name, // Use event name as artist since backend doesn't have artist field
    location: locationStr,
    venue: event.venue,
    showTimes,
    ticketTypes: ['General'], // Will be updated when we fetch listings
    labels,
    image: event.images?.[0]?.src,
    price: undefined, // Will be updated when we fetch listings
  };
}

export function Landing() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
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

  // Transform and filter events
  const filteredEvents = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    
    return events
      .filter(event => {
        if (!searchTerm) return true;
        return (
          event.name.toLowerCase().includes(searchLower) ||
          event.venue.toLowerCase().includes(searchLower) ||
          event.location.city.toLowerCase().includes(searchLower) ||
          event.description.toLowerCase().includes(searchLower)
        );
      })
      .map(transformEventForCard);
  }, [events, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4 text-center">
            {t('landing.title')}
          </h1>
          <p className="text-xl text-center mb-4 text-blue-100">
            {t('landing.subtitle')}
          </p>
          
          <div className="flex items-center justify-center gap-2 mb-8">
            <Shield className="w-5 h-5 text-green-300" />
            <Link 
              to="/how-it-works"
              className="text-white hover:text-green-300 transition-colors font-semibold underline decoration-2 underline-offset-4"
            >
              {t('landing.securePayment')}
            </Link>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder={t('landing.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          {searchTerm ? t('landing.searchResults') : t('landing.upcomingEvents')}
        </h2>

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
