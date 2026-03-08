import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEventSelection } from '@/app/hooks';
import { EventBanner } from '@/app/components/EventBanner';
import { Badge } from '@/app/components/ui/badge';
import type { EventSelectItem } from '@/api/types';
import { EventCategory } from '@/api/types';
import { cn } from '@/app/components/ui/utils';

/** i18n keys for event category labels (shared with landing) */
const EVENT_CATEGORY_I18N: Record<EventCategory, string> = {
  [EventCategory.Concert]: 'landing.categoryConcert',
  [EventCategory.Sports]: 'landing.categorySports',
  [EventCategory.Theater]: 'landing.categoryTheater',
  [EventCategory.Festival]: 'landing.categoryFestival',
  [EventCategory.Conference]: 'landing.categoryConference',
  [EventCategory.Comedy]: 'landing.categoryComedy',
  [EventCategory.Other]: 'landing.categoryOther',
};

interface StepChooseEventProps {
  onSelect: (eventId: string) => void;
  isMobile: boolean;
}

interface EventCardProps {
  event: EventSelectItem;
  onClick: () => void;
}

const EventCard = forwardRef<HTMLButtonElement, EventCardProps>(
  ({ event, onClick }, ref) => {
    const { t } = useTranslation();
    const categoryLabel = t(EVENT_CATEGORY_I18N[event.category]);

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        role="radio"
        aria-checked={false}
        aria-label={t('sellListingWizard.eventCardA11y', {
          name: event.name,
          venue: event.venue,
          category: categoryLabel,
        })}
        className={cn(
          'group flex min-h-[44px] w-full flex-col rounded-xl border border-border bg-card text-left shadow-md transition-all duration-200',
          'hover:shadow-lg hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
      >
        <div className="relative aspect-video w-full shrink-0 overflow-hidden">
          <EventBanner
            variant="rectangle"
            squareUrl={event.squareBannerUrl}
            rectangleUrl={event.rectangleBannerUrl}
            alt={event.name}
            className="transition-transform duration-200 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="text-xs font-medium text-muted-foreground"
            >
              {categoryLabel}
            </Badge>
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold text-foreground md:text-base">
            {event.name}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground md:text-sm">
            {event.venue}
          </p>
        </div>
      </button>
    );
  }
);
EventCard.displayName = 'EventCard';

export function StepChooseEvent({ onSelect, isMobile }: StepChooseEventProps) {
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
  } = useEventSelection();

  const showEmpty = !isLoading && events.length === 0;
  const showNoSearchResults = searchTerm.trim() !== '' && events.length === 0 && !isLoading;

  return (
    <div className="space-y-6" role="group" aria-label={t('sellListingWizard.selectEvent')}>
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {t('sellListingWizard.selectEvent')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('sellListingWizard.selectEventDescription')}
        </p>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('sellListingWizard.searchEvents')}
          className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('sellListingWizard.searchEvents')}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('sellTicket.loadingEvents')}</p>
        </div>
      ) : showEmpty && !searchTerm ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">{t('sellListingWizard.noEvents')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('sellListingWizard.noEventsHint')}</p>
          <Link
            to="/create-event"
            state={{ fromSellTicket: true }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-opacity min-h-[44px]"
          >
            <Plus className="h-5 w-5" />
            {t('sellListingWizard.createNewEvent')}
          </Link>
        </div>
      ) : showNoSearchResults ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{t('sellListingWizard.noSearchResults')}</p>
          <Link
            to="/create-event"
            state={{ fromSellTicket: true }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 min-h-[44px]"
          >
            <Plus className="h-5 w-5" />
            {t('sellListingWizard.createNewEvent')}
          </Link>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'grid gap-4',
              isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'
            )}
            role="radiogroup"
            aria-label={t('sellListingWizard.selectEvent')}
          >
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onSelect(event.id)}
              />
            ))}
          </div>
          {isLoadingMore && (
            <div className="flex justify-center py-4 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground text-sm">{t('sellTicket.loadingMore')}</span>
            </div>
          )}
          {hasMore && !isLoadingMore && (
            <button
              type="button"
              onClick={() => loadMore()}
              className="w-full py-2 text-sm text-primary font-medium hover:underline"
            >
              {t('sellTicket.loadingMore')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
