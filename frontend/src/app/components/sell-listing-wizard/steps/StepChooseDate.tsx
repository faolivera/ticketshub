import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus } from 'lucide-react';
import { formatDateTime } from '@/lib/format-date';
import type { PublicListEventItem, EventDate } from '@/api/types';
import { EventDateStatus } from '@/api/types';
import { cn } from '@/app/components/ui/utils';
import { V, VLIGHT, DARK, MUTED, HINT, BORDER, CARD, BG, S, R_CARD, R_INPUT } from '@/lib/design-tokens';
import { stepHeadingStyle, stepDescStyle } from '../wizardTokens';

interface StepChooseDateProps {
  event: PublicListEventItem;
  selectedDateId: string;
  /** On mobile: auto-advances when called. On desktop: just marks selection, footer handles advance. */
  onSelect: (date: EventDate) => void | Promise<void>;
  onAddDate: () => void;
  isMobile: boolean;
}

export const StepChooseDate: FC<StepChooseDateProps> = ({
  event, selectedDateId, onSelect, onAddDate, isMobile,
}) => {
  const { t } = useTranslation();

  const approvedDates = event.dates.filter((d) => d.status === EventDateStatus.Approved);
  const futureDates   = approvedDates.filter((d) => new Date(d.date) >= new Date());
  const pastDates     = approvedDates.filter((d) => new Date(d.date) < new Date());

  if (event.dates.length === 0) {
    return (
      <div>
        <h2 style={stepHeadingStyle}>{t('sellListingWizard.selectDate')}</h2>
        <p style={stepDescStyle}>{t('sellListingWizard.noDates')}</p>
      </div>
    );
  }

  return (
    <div role="group" aria-label={t('sellListingWizard.selectDate')}>
      <h2 style={stepHeadingStyle}>{t('sellListingWizard.selectDate')}</h2>
      <p style={stepDescStyle}>{t('sellListingWizard.selectDateDescription')}</p>

      <div
        className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}
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
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: R_CARD, textAlign: 'left',
                border: `2px solid ${isSelected ? V : BORDER}`,
                background: isSelected ? VLIGHT : CARD,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: isSelected ? V : BG,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Calendar size={18} color={isSelected ? 'white' : MUTED} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontWeight: 700, color: isSelected ? V : DARK, fontSize: 14, marginBottom: 2, ...S }}>
                  {formatDateTime(eventDate.date)}
                </p>
                <p style={{ fontSize: 13, color: MUTED, ...S }}>{event.venue}</p>
              </div>
            </button>
          );
        })}

        {/* Past dates — disabled */}
        {pastDates.length > 0 && (
          <div className="col-span-full" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pastDates.slice(0, 3).map((eventDate) => (
              <div
                key={eventDate.id}
                aria-disabled="true"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 16px', borderRadius: R_INPUT,
                  border: `1px solid ${BORDER}`, background: BG,
                  opacity: 0.55, cursor: 'not-allowed',
                }}
              >
                <Calendar size={20} color={MUTED} />
                <div>
                  <p style={{ fontWeight: 600, color: MUTED, fontSize: 13.5, ...S }}>{formatDateTime(eventDate.date)}</p>
                  <p style={{ fontSize: 12.5, color: HINT, ...S }}>{t('sellListingWizard.pastDate')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add date button */}
      <button
        type="button"
        onClick={onAddDate}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', marginTop: 12, padding: '12px 16px', borderRadius: R_INPUT,
          border: `1.5px dashed ${HINT}`, background: 'transparent',
          color: MUTED, cursor: 'pointer', fontSize: 14, fontWeight: 600,
          transition: 'all 0.14s',
          minHeight: 44,
          ...S,
        }}
        className="hover:border-primary hover:text-primary hover:bg-primary/5"
      >
        <Plus size={18} style={{ flexShrink: 0 }} />
        {t('sellListingWizard.addDate')}
      </button>
    </div>
  );
};
