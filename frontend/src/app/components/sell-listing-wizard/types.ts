import type { EventWithDates, EventDate, EventSection } from '@/api/types';

export type WizardStepIndex = 0 | 1 | 2 | 3 | 4 | 5;

export const WIZARD_STEPS: WizardStepIndex[] = [0, 1, 2, 3, 4, 5];
export const WIZARD_TOTAL_STEPS = 6;

export interface NumberedSeatInput {
  row: string;
  seatNumber: string;
}

export interface WizardFormState {
  eventId: string;
  eventDateId: string;
  eventSectionId: string;
  seatingType: 'numbered' | 'unnumbered';
  quantity: number;
  numberedSeats: NumberedSeatInput[];
  pricePerTicket: number;
  bestOfferEnabled: boolean;
  bestOfferMinPrice: string;
  deliveryMethod: 'digital' | 'physical';
  physicalDeliveryMethod: 'pickup' | 'arrange' | '';
  pickupAddress: string;
  sellTogether: boolean;
}

export const defaultWizardFormState: WizardFormState = {
  eventId: '',
  eventDateId: '',
  eventSectionId: '',
  seatingType: 'unnumbered',
  quantity: 1,
  numberedSeats: [{ row: '', seatNumber: '' }],
  pricePerTicket: 0,
  bestOfferEnabled: false,
  bestOfferMinPrice: '',
  deliveryMethod: 'digital',
  physicalDeliveryMethod: '',
  pickupAddress: '',
  sellTogether: false,
};

export interface WizardData {
  event: EventWithDates | null;
  selectedDate: EventDate | null;
  selectedSection: EventSection | null;
  form: WizardFormState;
}
