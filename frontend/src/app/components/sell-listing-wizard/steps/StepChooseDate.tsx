import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus, X } from 'lucide-react';
import { formatDateTime } from '@/lib/format-date';
import type { EventWithDates, EventDate } from '@/api/types';
import { EventDateStatus } from '@/api/types';
import { cn } from '@/app/components/ui/utils';

interface StepChooseDateProps {
  event: EventWithDates;
  selectedDateId: string;
  onSelect: (date: EventDate) => void;
  onAddDate: () => void;
  isMobile: boolean;
}

export const StepChooseDate: FC<StepChooseDateProps> = ({
  event,
  selectedDateId,
  onSelect,
  onAddDate,
  isMobile,
}) => {
  const { t } = useTranslation();

  const approvedDates = event.dates.filter((d) => d.status === EventDateStatus.Approved);
  const futureDates = approvedDates.filter((d) => new Date(d.date) >= new Date());
  const pastDates = approvedDates.filter((d) => new Date(d.date) < new Date());

  if (event.dates.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            {t('sellListingWizard.selectDate')}
          </h2>
          <p className="text-muted-foreground mt-1">{t('sellListingWizard.noDates')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" role="group" aria-label={t('sellListingWizard.selectDate')}>
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {t('sellListingWizard.selectDate')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('sellListingWizard.selectDateDescription')}
        </p>
      </div>

      <div
        className={cn(
          'grid gap-3',
          isMobile ? 'grid-cols-1' : 'grid-cols-2'
        )}
        role="radiogroup"
        aria-label={t('sellListingWizard.selectDate')}
      >
        {futureDates.map((eventDate) => {
          const isSelected = selectedDateId === eventDate.id;
          return (
            <button
              key={eventDate.id}
              type="button"
              onClick={() => onSelect(eventDate)}
              role="radio"
              aria-checked={isSelected}
              className={cn(
                'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  {formatDateTime(eventDate.date)}
                </p>
                <p className="text-sm text-muted-foreground">{event.venue}</p>
              </div>
            </button>
          );
        })}
        {pastDates.length > 0 && (
          <div className="col-span-full space-y-2">
            {pastDates.slice(0, 3).map((eventDate) => (
              <div
                key={eventDate.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border opacity-60 cursor-not-allowed"
                aria-disabled="true"
              >
                <Calendar className="h-10 w-10 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-muted-foreground">{formatDateTime(eventDate.date)}</p>
                  <p className="text-xs text-muted-foreground">{t('sellListingWizard.pastDate')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onAddDate}
        className="flex items-center gap-2 w-full py-3 px-4 rounded-lg border border-dashed border-muted-foreground/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors min-h-[44px]"
      >
        <Plus className="h-5 w-5 shrink-0" />
        {t('sellListingWizard.addDate')}
      </button>
    </div>
  );
};
