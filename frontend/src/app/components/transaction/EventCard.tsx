import { Calendar, MapPin } from 'lucide-react';
import { EventBanner } from '@/app/components/EventBanner';
import { CARD, BORDER, E, S } from '@/lib/design-tokens';
import type { EventCardProps } from './types';

export function EventCard({
  eventName,
  eventDateLabel,
  venue,
  ticketTypeLabel,
  sectorLabel,
  squareUrl,
  rectangleUrl,
  quantity,
}: EventCardProps) {
  return (
    <div
      className="overflow-hidden rounded-card border shadow-sm"
      style={{ ...S, background: CARD, borderColor: BORDER }}
    >
      <div className="relative">
        <EventBanner
          variant="rectangle"
          squareUrl={squareUrl ?? undefined}
          rectangleUrl={rectangleUrl ?? undefined}
          alt={eventName}
          className="h-44 sm:h-52 md:h-56"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white sm:p-5">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <h1
              className="max-w-[90%] text-xl font-normal leading-tight drop-shadow-md sm:text-2xl"
              style={E}
            >
              {eventName}
            </h1>
            <div className="flex flex-wrap gap-2">
              <span
                className="rounded-pill px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
              >
                {ticketTypeLabel}
              </span>
              {sectorLabel && (
                <span
                  className="rounded-pill px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: 'rgba(255,255,255,0.15)' }}
                >
                  {sectorLabel}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 shrink-0 opacity-90" />
              {eventDateLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 opacity-90" />
              {venue}
            </span>
            <span className="font-semibold">×{quantity}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
