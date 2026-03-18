import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus, Trash2, Grid2x2 } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import type { PublicListEventItem, EventSection } from '@/api/types';
import { EventSectionStatus, SeatingType } from '@/api/types';
import type { WizardFormState, NumberedSeatInput } from '../types';
import { cn } from '@/app/components/ui/utils';
import { V, VLIGHT, VBORD, DARK, MUTED, HINT, BORDER, BG, CARD, S, stepHeadingStyle, stepDescStyle } from '../wizardTokens';

interface StepZoneAndSeatsProps {
  event: PublicListEventItem;
  form: WizardFormState;
  onFormChange: (patch: Partial<WizardFormState>) => void;
  onCreateSection: () => void;
  isMobile: boolean;
}

export const StepZoneAndSeats: FC<StepZoneAndSeatsProps> = ({
  event, form, onFormChange, onCreateSection, isMobile,
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
    <div role="group" aria-label={t('sellListingWizard.zoneAndSeats')}>
      <h2 style={stepHeadingStyle}>{t('sellListingWizard.zoneAndSeats')}</h2>
      <p style={stepDescStyle}>{t('sellListingWizard.zoneAndSeatsDescription')}</p>

      {/* Section picker */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: DARK, marginBottom: 8, ...S }}>
          {t('sellListingWizard.section')} <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <div
          className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}
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
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', borderRadius: 12, textAlign: 'left',
                  border: `2px solid ${isSelected ? V : BORDER}`,
                  background: isSelected ? VLIGHT : CARD,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:border-primary/50"
              >
                <span style={{ fontWeight: 700, color: isSelected ? V : DARK, fontSize: 14, ...S }}>
                  {section.name}
                </span>
                {section.status === EventSectionStatus.Pending && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', ...S }}>
                    {t('common.pending')}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onCreateSection}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            marginTop: 10, padding: '8px 14px', borderRadius: 9,
            border: `1.5px dashed ${HINT}`, background: 'transparent',
            color: MUTED, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
            minHeight: 44, transition: 'all 0.14s', ...S,
          }}
          className="hover:border-primary hover:text-primary hover:bg-primary/5"
        >
          <Plus size={16} />
          {t('sellTicket.createNewSection')}
        </button>
      </div>

      {/* Seating type indicator */}
      {selectedSection && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '6px 12px', borderRadius: 100,
            background: BG, border: `1px solid ${BORDER}`,
            fontSize: 13, color: DARK, ...S,
          }}>
            <Grid2x2 size={14} color={MUTED} />
            <span style={{ fontWeight: 600 }}>
              {isNumbered ? t('sellListingWizard.numbered') : t('sellListingWizard.unnumbered')}
            </span>
            <span style={{ color: MUTED, fontSize: 12.5 }}>
              — {isNumbered
                ? t('sellTicket.numberedSeatingDesc', { defaultValue: 'Fila y butaca específica' })
                : t('sellTicket.generalAdmissionDesc', { defaultValue: 'Sin asiento asignado' })}
            </span>
          </div>
        </div>
      )}

      {/* Numbered seats */}
      {selectedSection && isNumbered && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 12, ...S }}>
            {t('sellTicket.addSeatsDescription')}
          </p>
          <div className={cn(isMobile ? 'space-y-3' : 'space-y-2')}>
            {form.numberedSeats.map((seat, index) => (
              <div
                key={index}
                className={cn('flex gap-2 items-center', isMobile ? 'flex-col items-stretch' : 'flex-row')}
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
                    type="button" variant="ghost" size="icon"
                    onClick={() => removeSeat(index)}
                    className="shrink-0 h-10 w-10 text-destructive hover:text-destructive"
                    aria-label={t('sellTicket.removeSeat')}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button" variant="outline" onClick={addSeat}
            className="mt-3 min-h-[44px]"
          >
            <Plus size={16} className="mr-2" />
            {t('sellListingWizard.addSeat')}
          </Button>
        </div>
      )}

      {/* Quantity picker for unnumbered */}
      {selectedSection && !isNumbered && (
        <div>
          <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: DARK, marginBottom: 10, ...S }}>
            {t('sellListingWizard.quantity')} <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onFormChange({ quantity: Math.max(1, (form.quantity ?? 1) - 1) })}
              disabled={(form.quantity ?? 1) <= 1}
              aria-label={t('sellListingWizard.quantityDecrease')}
              style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                border: `1.5px solid ${BORDER}`, background: CARD, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: DARK, opacity: (form.quantity ?? 1) <= 1 ? 0.35 : 1,
              }}
            >
              <Minus size={18} />
            </button>

            <span
              aria-live="polite"
              style={{ minWidth: 48, textAlign: 'center', fontSize: 22, fontWeight: 800, color: DARK, ...S }}
            >
              {form.quantity ?? 1}
            </span>

            <button
              type="button"
              onClick={() => onFormChange({ quantity: Math.min(100, (form.quantity ?? 1) + 1) })}
              disabled={(form.quantity ?? 1) >= 100}
              aria-label={t('sellListingWizard.quantityIncrease')}
              style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                border: `1.5px solid ${V}`, background: VLIGHT, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: V, opacity: (form.quantity ?? 1) >= 100 ? 0.35 : 1,
              }}
            >
              <Plus size={18} />
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: HINT, marginTop: 6, ...S }}>
            {t('sellListingWizard.quantityMin')}
          </p>
        </div>
      )}
    </div>
  );
};
