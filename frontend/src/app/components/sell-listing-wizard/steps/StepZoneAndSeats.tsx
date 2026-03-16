import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import type { PublicListEventItem, EventSection } from '@/api/types';
import { EventSectionStatus, SeatingType } from '@/api/types';
import type { WizardFormState, NumberedSeatInput } from '../types';
import { cn } from '@/app/components/ui/utils';

interface StepZoneAndSeatsProps {
  event: PublicListEventItem;
  form: WizardFormState;
  onFormChange: (patch: Partial<WizardFormState>) => void;
  onCreateSection: () => void;
  isMobile: boolean;
}

export const StepZoneAndSeats: FC<StepZoneAndSeatsProps> = ({
  event,
  form,
  onFormChange,
  onCreateSection,
  isMobile,
}) => {
  const { t } = useTranslation();

  const sections = event.sections.filter(
    (s) => s.status === EventSectionStatus.Approved || s.status === EventSectionStatus.Pending
  );
  const selectedSection = event.sections.find((s) => s.id === form.eventSectionId);
  const isNumbered = form.seatingType === 'numbered';
  const validSeats = form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim());

  const handleSectionSelect = (section: EventSection) => {
    const seatingType = section.seatingType === SeatingType.Numbered ? 'numbered' : 'unnumbered';
    onFormChange({
      eventSectionId: section.id,
      seatingType,
      quantity: seatingType === 'unnumbered' ? form.quantity || 1 : form.quantity,
      numberedSeats:
        seatingType === 'numbered' && form.numberedSeats.length > 0
          ? form.numberedSeats
          : [{ row: '', seatNumber: '' }],
    });
  };

  const updateSeat = (index: number, field: keyof NumberedSeatInput, value: string) => {
    const newSeats = [...form.numberedSeats];
    newSeats[index] = { ...newSeats[index], [field]: value };
    onFormChange({ numberedSeats: newSeats });
  };

  const addSeat = () => {
    onFormChange({ numberedSeats: [...form.numberedSeats, { row: '', seatNumber: '' }] });
  };

  const removeSeat = (index: number) => {
    const newSeats = form.numberedSeats.filter((_, i) => i !== index);
    onFormChange({ numberedSeats: newSeats.length ? newSeats : [{ row: '', seatNumber: '' }] });
  };

  return (
    <div className="space-y-6" role="group" aria-label={t('sellListingWizard.zoneAndSeats')}>
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {t('sellListingWizard.zoneAndSeats')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {t('sellListingWizard.zoneAndSeatsDescription')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('sellListingWizard.section')} <span className="text-destructive">*</span>
        </label>
        <div
          className={cn(
            'grid gap-3',
            isMobile ? 'grid-cols-1' : 'grid-cols-2'
          )}
          role="radiogroup"
          aria-label={t('sellListingWizard.section')}
        >
          {sections.map((section) => {
            const isSelected = form.eventSectionId === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => handleSectionSelect(section)}
                role="radio"
                aria-checked={isSelected}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <span className="font-medium text-foreground">{section.name}</span>
                {section.status === EventSectionStatus.Pending && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {t('common.pending')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onCreateSection}
          className="mt-3 min-h-[44px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('sellTicket.createNewSection')}
        </Button>
      </div>

      {selectedSection && (
        <>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">
              {t('sellListingWizard.seatingType')}:{' '}
              {isNumbered ? t('sellListingWizard.numbered') : t('sellListingWizard.unnumbered')}
            </p>
          </div>

          {isNumbered ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('sellTicket.addSeatsDescription')}
              </p>
              <div className={cn(isMobile ? 'space-y-3' : 'space-y-2')}>
                {form.numberedSeats.map((seat, index) => (
                  <div
                    key={index}
                    className={cn(
                      'flex gap-2 items-center',
                      isMobile ? 'flex-col items-stretch' : 'flex-row'
                    )}
                  >
                    <div className={cn('flex gap-2 flex-1', isMobile && 'flex-col')}>
                      <Input
                        value={seat.row}
                        onChange={(e) => updateSeat(index, 'row', e.target.value)}
                        placeholder={t('sellTicket.rowPlaceholder')}
                        className="min-h-[44px]"
                        aria-label={`${t('sellListingWizard.row')} ${index + 1}`}
                      />
                      <Input
                        value={seat.seatNumber}
                        onChange={(e) => updateSeat(index, 'seatNumber', e.target.value)}
                        placeholder={t('sellTicket.seatPlaceholder')}
                        className="min-h-[44px]"
                        aria-label={`${t('sellListingWizard.seatNumber')} ${index + 1}`}
                      />
                    </div>
                    {form.numberedSeats.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSeat(index)}
                        className="shrink-0 h-10 w-10 text-destructive hover:text-destructive"
                        aria-label={t('sellTicket.removeSeat')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={addSeat} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                {t('sellListingWizard.addSeat')}
              </Button>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('sellListingWizard.quantity')} <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-lg"
                  onClick={() =>
                    onFormChange({
                      quantity: Math.max(1, (form.quantity ?? 1) - 1),
                    })
                  }
                  disabled={(form.quantity ?? 1) <= 1}
                  aria-label={t('sellListingWizard.quantityDecrease')}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span
                  className="min-w-[3rem] text-center text-lg font-medium tabular-nums"
                  aria-live="polite"
                >
                  {form.quantity ?? 1}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-lg"
                  onClick={() =>
                    onFormChange({
                      quantity: Math.min(100, (form.quantity ?? 1) + 1),
                    })
                  }
                  disabled={(form.quantity ?? 1) >= 100}
                  aria-label={t('sellListingWizard.quantityIncrease')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p id="quantity-hint" className="text-sm text-muted-foreground mt-1">
                {t('sellListingWizard.quantityMin')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
