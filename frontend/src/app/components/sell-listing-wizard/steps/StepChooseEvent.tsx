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
import { V, VLIGHT, DARK, MUTED, HINT, BORDER, BG, CARD, S, stepHeadingStyle, stepDescStyle } from '../wizardTokens';

const EVENT_CATEGORY_I18N: Record<EventCategory, string> = {
  [EventCategory.Concert]:    'landing.categoryConcert',
  [EventCategory.Sports]:     'landing.categorySports',
  [EventCategory.Theater]:    'landing.categoryTheater',
  [EventCategory.Festival]:   'landing.categoryFestival',
  [EventCategory.Conference]: 'landing.categoryConference',
  [EventCategory.Comedy]:     'landing.categoryComedy',
  [EventCategory.Other]:      'landing.categoryOther',
};

interface StepChooseEventProps {
  onSelect: (eventId: string) => void;
  isMobile: boolean;
  initialSearchTerm?: string;
}

interface EventCardProps {
  event: EventSelectItem;
  onClick: () => void;
}

const EventCard = forwardRef<HTMLButtonElement, EventCardProps>(({ event, onClick }, ref) => {
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
        name: event.name, venue: event.venue, category: categoryLabel,
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
          <Badge variant="secondary" className="text-xs font-medium text-muted-foreground">
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
});
EventCard.displayName = 'EventCard';

export function StepChooseEvent({ onSelect, isMobile, initialSearchTerm = '' }: StepChooseEventProps) {
  const { t } = useTranslation();
  const { events, isLoading, isLoadingMore, hasMore, searchTerm, setSearchTerm, loadMore, error } =
    useEventSelection(initialSearchTerm);

  const showEmpty           = !isLoading && events.length === 0;
  const showNoSearchResults = searchTerm.trim() !== '' && events.length === 0 && !isLoading;

  return (
    <div role="group" aria-label={t('sellListingWizard.selectEvent')}>
      <h2 style={stepHeadingStyle}>{t('sellListingWizard.selectEvent')}</h2>
      <p style={stepDescStyle}>{t('sellListingWizard.selectEventDescription')}</p>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search
          size={18}
          style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: MUTED }}
          aria-hidden
        />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('sellListingWizard.searchEvents')}
          style={{
            width: '100%', paddingLeft: 44, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
            borderRadius: 12, border: `1.5px solid ${BORDER}`, background: CARD,
            fontSize: 14, color: DARK, outline: 'none',
            ...S,
          }}
          className="focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t('sellListingWizard.searchEvents')}
        />
      </div>

      {error && (
        <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12, ...S }} role="alert">{error}</p>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 12 }}>
          <Loader2 size={32} style={{ color: V, animation: 'spin 0.7s linear infinite' }} />
          <p style={{ fontSize: 14, color: MUTED, ...S }}>{t('sellTicket.loadingEvents')}</p>
        </div>
      ) : showEmpty && !searchTerm ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 6, ...S }}>{t('sellListingWizard.noEvents')}</p>
          <p style={{ fontSize: 13, color: HINT, marginBottom: 20, ...S }}>{t('sellListingWizard.noEventsHint')}</p>
          <Link
            to="/create-event"
            state={{ fromSellTicket: true }}
            style={{ textDecoration: 'none' }}
          >
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 22px', borderRadius: 11, border: 'none',
              background: V, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44, ...S,
            }}>
              <Plus size={18} />
              {t('sellListingWizard.createNewEvent')}
            </button>
          </Link>
        </div>
      ) : showNoSearchResults ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 20, ...S }}>{t('sellListingWizard.noSearchResults')}</p>
          <Link to="/create-event" state={{ fromSellTicket: true }} style={{ textDecoration: 'none' }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '11px 22px', borderRadius: 11, border: 'none',
              background: V, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44, ...S,
            }}>
              <Plus size={18} />
              {t('sellListingWizard.createNewEvent')}
            </button>
          </Link>
        </div>
      ) : (
        <>
          <div
            className={cn('grid gap-4', isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3')}
            role="radiogroup"
            aria-label={t('sellListingWizard.selectEvent')}
          >
            {events.map((event) => (
              <EventCard key={event.id} event={event} onClick={() => onSelect(event.id)} />
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              disabled={isLoadingMore}
              aria-busy={isLoadingMore}
              onClick={() => void loadMore()}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 700,
                color: V,
                background: `${VLIGHT}33`,
                border: `1.5px solid ${BORDER}`,
                borderRadius: 12,
                cursor: isLoadingMore ? 'wait' : 'pointer',
                minHeight: 44,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: isLoadingMore ? 0.85 : 1,
                ...S,
              }}
              className="hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
            >
              {isLoadingMore && (
                <Loader2 size={18} className="shrink-0 animate-spin" style={{ color: V }} aria-hidden />
              )}
              {t('sellTicket.loadMore')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
