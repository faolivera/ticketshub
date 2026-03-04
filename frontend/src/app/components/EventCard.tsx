import { Link } from 'react-router-dom';
import { MapPin, Calendar, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EventBanner, useEventBannerVariant } from './EventBanner';

interface ShowTime {
  date: string;
  time: string;
}

interface EventCardProps {
  id: string;
  name: string;
  artist: string;
  location: string;
  venue: string;
  showTimes: ShowTime[];
  ticketTypes: string[];
  labels?: string[];
  bannerUrls?: {
    square?: string;
    rectangle?: string;
  };
  image?: string;
  price?: number;
}

export function EventCard({
  id,
  name,
  location,
  venue,
  showTimes,
  ticketTypes,
  labels = [],
  bannerUrls,
  image,
  price
}: EventCardProps) {
  const { t } = useTranslation();
  const bannerVariant = useEventBannerVariant();
  const maxDatesToShow = 2;
  const hasMoreDates = showTimes.length > maxDatesToShow;
  const displayDates = showTimes.slice(0, maxDatesToShow);
  const remainingDates = showTimes.length - maxDatesToShow;

  // Translate labels
  const translateLabel = (label: string) => {
    if (label === 'Trending') return t('eventCard.trending');
    if (label === 'New Event') return t('eventCard.newEvent');
    return label;
  };

  return (
    <Link
      to={`/event/${id}`}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col h-full"
    >
      <div className="relative h-48 overflow-hidden flex-shrink-0">
        <EventBanner
          variant={bannerVariant}
          squareUrl={bannerUrls?.square || image}
          rectangleUrl={bannerUrls?.rectangle}
          alt={name}
          className="h-full group-hover:scale-105 transition-transform duration-300"
        />
        {/* Hover overlay with CTA */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="px-5 py-2 bg-white text-gray-900 font-semibold rounded-full text-sm shadow">
            {t('eventCard.viewTickets')}
          </span>
        </div>
        {labels.length > 0 && (
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {labels.map((label, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-yellow-400 text-gray-900 text-xs font-semibold rounded-full"
              >
                {translateLabel(label)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">{name}</h3>

        <div className="space-y-3 mb-4 flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="line-clamp-1">{location} - {venue}</span>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="font-semibold">{t('eventCard.availableDates')}</span>
            </div>
            <div className="ml-6 space-y-1">
              {displayDates.map((showTime, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                  <span>{showTime.date} {t('common.at')} {showTime.time}</span>
                </div>
              ))}
              {hasMoreDates && (
                <p className="text-xs text-blue-600 ml-5 font-medium">
                  {remainingDates === 1
                    ? t('eventCard.moreDate')
                    : t('eventCard.moreDates', { count: remainingDates })
                  }
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">{t('eventCard.availableTickets')}</p>
            <div className="flex flex-wrap gap-2">
              {ticketTypes.map((type, index) => (
                <span
                  key={index}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium rounded-full"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        </div>

        {price && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-auto">
            <span className="text-sm text-gray-600">{t('eventCard.startingFrom')}</span>
            <span className="text-2xl font-bold text-blue-600">${price}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
