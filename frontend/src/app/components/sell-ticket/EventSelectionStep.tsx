import { forwardRef, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEventSelection } from '@/app/hooks';
import { EventBanner } from '@/app/components/EventBanner';
import type { EventSelectItem } from '@/api/types';

interface EventSelectionStepProps {
  onSelect: (eventId: string) => void;
  /** Pre-fill the event search box (e.g. from URL ?eventName=...) */
  initialSearchTerm?: string;
}

interface EventCardProps {
  event: EventSelectItem;
  onClick: () => void;
}

const EventCard = forwardRef<HTMLButtonElement, EventCardProps>(
  ({ event, onClick }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        className="group relative w-full rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <div className="relative">
          <EventBanner
            variant="rectangle"
            squareUrl={event.squareBannerUrl}
            rectangleUrl={event.rectangleBannerUrl}
            alt={event.name}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-3 px-3">
          <h3 className="font-semibold text-white text-base line-clamp-1 drop-shadow-md group-hover:text-blue-200 transition-colors">
            {event.name}
          </h3>
          <p className="text-white/90 text-sm line-clamp-1 drop-shadow-sm">{event.venue}</p>
        </div>
      </button>
    );
  }
);

EventCard.displayName = 'EventCard';

export function EventSelectionStep({ onSelect, initialSearchTerm = '' }: EventSelectionStepProps) {
  const { t } = useTranslation();
  const {
    events,
    isLoading,
    isLoadingMore,
    hasMore,
    searchTerm,
    setSearchTerm,
    loadMore,
    error,
  } = useEventSelection(initialSearchTerm);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastCardRef = useRef<HTMLButtonElement | null>(null);

  const handleLastCardRef = useCallback(
    (node: HTMLButtonElement | null) => {
      if (isLoadingMore) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            loadMore();
          }
        },
        { threshold: 0.1 }
      );

      if (node) {
        observerRef.current.observe(node);
        lastCardRef.current = node;
      }
    },
    [isLoadingMore, hasMore, loadMore]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const showAddEventButton = searchTerm.trim() !== '' && events.length === 0 && !isLoading;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('sellTicket.selectEvent')}</h2>
        <p className="text-gray-600 mt-1">{t('sellTicket.selectEventDescription')}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('sellTicket.searchEvents')}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
        />
      </div>

      {error && (
        <div className="text-center py-4 text-red-600">{error}</div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">{t('sellTicket.loadingEvents')}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-600 mb-4">{t('sellTicket.noEventsFoundSearch')}</p>
          {showAddEventButton && (
            <Link
              to="/create-event"
              state={{ fromSellTicket: true }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('sellTicket.createNewEvent')}
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {events.map((event, index) => {
              const isLast = index === events.length - 1;
              return (
                <EventCard
                  key={event.id}
                  ref={isLast ? handleLastCardRef : undefined}
                  event={event}
                  onClick={() => onSelect(event.id)}
                />
              );
            })}
          </div>

          {isLoadingMore && (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-gray-600">{t('sellTicket.loadingMore')}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
