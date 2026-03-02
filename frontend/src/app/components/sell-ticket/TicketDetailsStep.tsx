import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Ticket,
  Plus,
  Loader2,
  Trash2,
  Clock,
  AlertTriangle,
  Calendar,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { eventsService } from '@/api/services/events.service';
import { ticketsService } from '@/api/services/tickets.service';
import { useUser } from '@/app/contexts/UserContext';
import { formatCurrencyFromUnits } from '@/lib/format-currency';
import {
  SeatingType,
  TicketType,
  DeliveryMethod,
  EventStatus,
  EventDateStatus,
  EventSectionStatus,
} from '@/api/types';
import type { EventWithDates, EventDate, EventSection } from '@/api/types';
import { ErrorAlert } from '@/app/components/ErrorMessage';

interface NumberedSeat {
  row: string;
  seatNumber: string;
}

interface TicketListingForm {
  eventId: string;
  eventDateId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventSectionId: string;
  seatingType: 'numbered' | 'unnumbered';
  deliveryMethod: 'digital' | 'physical';
  digitallyTransferable: boolean;
  physicalDeliveryMethod: 'pickup' | 'arrange' | '';
  pickupAddress: string;
  quantity: number;
  sellTogether: boolean;
  pricePerTicket: number;
  numberedSeats: NumberedSeat[];
  description?: string;
}

interface TicketDetailsStepProps {
  event: EventWithDates;
  onBack: () => void;
  preselectedDateISO?: string;
}

export function TicketDetailsStep({ event, onBack, preselectedDateISO }: TicketDetailsStepProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const sellerCurrency = user?.currency ?? 'ARS';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateDateModal, setShowCreateDateModal] = useState(false);
  const [isCreatingDate, setIsCreatingDate] = useState(false);
  const [newDateForm, setNewDateForm] = useState({ date: '', time: '' });

  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionSeatingType, setNewSectionSeatingType] = useState<'numbered' | 'unnumbered'>(
    'unnumbered'
  );

  const [isPendingListing, setIsPendingListing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EventWithDates>(event);

  const [formData, setFormData] = useState<TicketListingForm>({
    eventId: event.id,
    eventDateId: '',
    eventName: event.name,
    eventDate: '',
    eventTime: '',
    eventSectionId: '',
    deliveryMethod: 'digital',
    digitallyTransferable: true,
    physicalDeliveryMethod: '',
    pickupAddress: '',
    quantity: 1,
    sellTogether: false,
    pricePerTicket: 0,
    seatingType: 'unnumbered',
    numberedSeats: [{ row: '', seatNumber: '' }],
  });

  const [ticketTypeSearchTerm, setTicketTypeSearchTerm] = useState('');
  const [dateSearchTerm, setDateSearchTerm] = useState('');
  const [showTicketTypeSuggestions, setShowTicketTypeSuggestions] = useState(false);
  const [showDateSuggestions, setShowDateSuggestions] = useState(false);

  useEffect(() => {
    setIsPendingListing(event.status === EventStatus.Pending);
  }, [event]);

  useEffect(() => {
    if (preselectedDateISO && currentEvent.dates.length > 0) {
      const preselectedTime = new Date(preselectedDateISO).getTime();
      const matchingDate = currentEvent.dates.find(
        (d) => new Date(d.date).getTime() === preselectedTime
      );
      if (matchingDate && !formData.eventDateId) {
        handleDateSelect(matchingDate);
      }
    }
  }, [preselectedDateISO, currentEvent.dates]);

  const isFormValid = (): boolean => {
    if (!formData.eventDateId) return false;
    if (!formData.eventSectionId) return false;
    if (formData.pricePerTicket <= 0) return false;

    const isNumberedListing = formData.seatingType === 'numbered';
    if (isNumberedListing) {
      const validSeats = formData.numberedSeats.filter(
        (s) => s.row.trim() && s.seatNumber.trim()
      );
      if (validSeats.length === 0) return false;
    } else {
      if (formData.quantity < 1) return false;
    }

    if (formData.deliveryMethod === 'physical') {
      if (!formData.physicalDeliveryMethod) return false;
      if (formData.physicalDeliveryMethod === 'pickup' && !formData.pickupAddress.trim()) {
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.eventId || !formData.eventDateId || !formData.eventSectionId || formData.pricePerTicket <= 0) {
      setError(t('sellTicket.pleaseCompleteAllFields'));
      return;
    }

    if (formData.deliveryMethod === 'physical' && !formData.physicalDeliveryMethod) {
      setError(t('sellTicket.pleaseSelectDeliveryMethod'));
      return;
    }

    if (formData.physicalDeliveryMethod === 'pickup' && !formData.pickupAddress.trim()) {
      setError(t('sellTicket.pleaseEnterPickupAddress'));
      return;
    }

    const isNumberedListing = formData.seatingType === 'numbered';

    if (isNumberedListing) {
      const validSeats = formData.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim());
      if (validSeats.length === 0) {
        setError(t('sellTicket.seatsRequired'));
        return;
      }
    } else {
      if (formData.quantity < 1) {
        setError(t('sellTicket.pleaseCompleteAllFields'));
        return;
      }
    }

    let ticketType: TicketType;
    if (formData.deliveryMethod === 'physical') {
      ticketType = TicketType.Physical;
    } else if (formData.digitallyTransferable) {
      ticketType = TicketType.DigitalTransferable;
    } else {
      ticketType = TicketType.DigitalNonTransferable;
    }

    let deliveryMethod: DeliveryMethod | undefined;
    if (formData.deliveryMethod === 'physical') {
      deliveryMethod =
        formData.physicalDeliveryMethod === 'pickup'
          ? DeliveryMethod.Pickup
          : DeliveryMethod.ArrangeWithSeller;
    }

    setIsSubmitting(true);

    try {
      const listing = await ticketsService.createListing({
        eventId: formData.eventId,
        eventDateId: formData.eventDateId,
        type: ticketType,
        quantity: isNumberedListing ? undefined : formData.quantity,
        ticketUnits: isNumberedListing
          ? formData.numberedSeats
              .filter((s) => s.row.trim() && s.seatNumber.trim())
              .map((seat) => ({
                seat: {
                  row: seat.row.trim(),
                  seatNumber: seat.seatNumber.trim(),
                },
              }))
          : undefined,
        sellTogether: formData.sellTogether,
        pricePerTicket: {
          amount: Math.round(formData.pricePerTicket * 100),
          currency: sellerCurrency,
        },
        deliveryMethod,
        pickupAddress:
          formData.physicalDeliveryMethod === 'pickup'
            ? {
                line1: formData.pickupAddress,
                city: '',
                countryCode: 'US',
              }
            : undefined,
        eventSectionId: formData.eventSectionId,
        description: formData.description,
      });

      navigate(`/buy/${listing.id}`);
    } catch (err) {
      console.error('Failed to create listing:', err);
      setError(err instanceof Error ? err.message : t('sellTicket.createListingFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSectionSelect = (section: EventSection | 'create-new') => {
    if (section === 'create-new') {
      setShowCreateSectionModal(true);
      setShowTicketTypeSuggestions(false);
      return;
    }

    const seatingType = section.seatingType === SeatingType.Numbered ? 'numbered' : 'unnumbered';
    setFormData({
      ...formData,
      eventSectionId: section.id,
      seatingType,
      quantity: seatingType === 'unnumbered' ? formData.quantity || 1 : formData.quantity,
      numberedSeats:
        seatingType === 'numbered' && formData.numberedSeats.length > 0
          ? formData.numberedSeats
          : [{ row: '', seatNumber: '' }],
    });
    setTicketTypeSearchTerm(section.name);
    setShowTicketTypeSuggestions(false);

    updatePendingStatus(section.status === EventSectionStatus.Pending);
  };

  const updatePendingStatus = (sectionPending: boolean) => {
    const eventPending = currentEvent.status === EventStatus.Pending;
    const selectedDate = currentEvent.dates.find((d) => d.id === formData.eventDateId);
    const datePending = selectedDate?.status === EventDateStatus.Pending;

    setIsPendingListing(eventPending || datePending || sectionPending);
  };

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) {
      setError(t('sellTicket.sectionNameRequired'));
      return;
    }

    setIsCreatingSection(true);
    setError(null);

    try {
      const seatingType =
        newSectionSeatingType === 'numbered' ? SeatingType.Numbered : SeatingType.Unnumbered;
      const newSection = await eventsService.addEventSection(currentEvent.id, {
        name: newSectionName.trim(),
        seatingType,
      });

      const updatedEvent = {
        ...currentEvent,
        sections: [...currentEvent.sections, newSection],
      };
      setCurrentEvent(updatedEvent);

      const sectionSeatingType =
        newSection.seatingType === SeatingType.Numbered ? 'numbered' : 'unnumbered';
      setFormData({
        ...formData,
        eventSectionId: newSection.id,
        seatingType: sectionSeatingType,
        numberedSeats:
          sectionSeatingType === 'numbered' ? [{ row: '', seatNumber: '' }] : formData.numberedSeats,
      });
      setTicketTypeSearchTerm(newSection.name);

      updatePendingStatus(newSection.status === EventSectionStatus.Pending);

      setShowCreateSectionModal(false);
      setNewSectionName('');
      setNewSectionSeatingType('unnumbered');
    } catch (err) {
      console.error('Failed to create section:', err);
      setError(err instanceof Error ? err.message : t('sellTicket.createSectionFailed'));
    } finally {
      setIsCreatingSection(false);
    }
  };

  const handleSectionInputChange = (value: string) => {
    setTicketTypeSearchTerm(value);
    setFormData({ ...formData, eventSectionId: '', seatingType: 'unnumbered' });
    setShowTicketTypeSuggestions(value.length > 0);
  };

  const handleDateSelect = (eventDate: EventDate | 'create-new') => {
    if (eventDate === 'create-new') {
      setShowCreateDateModal(true);
      setShowDateSuggestions(false);
      return;
    }

    const date = new Date(eventDate.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    setFormData({
      ...formData,
      eventDateId: eventDate.id,
      eventDate: formattedDate,
      eventTime: formattedTime,
    });

    setDateSearchTerm(`${formattedDate} at ${formattedTime}`);
    setShowDateSuggestions(false);

    const eventPending = currentEvent.status === EventStatus.Pending;
    const datePending = eventDate.status === EventDateStatus.Pending;
    const selectedSection = currentEvent.sections.find((s) => s.id === formData.eventSectionId);
    const sectionPending = selectedSection?.status === EventSectionStatus.Pending;
    setIsPendingListing(eventPending || datePending || sectionPending);
  };

  const handleCreateDate = async () => {
    if (!newDateForm.date || !newDateForm.time) {
      setError(t('sellTicket.dateTimeRequired'));
      return;
    }

    setIsCreatingDate(true);
    setError(null);

    try {
      const dateTime = new Date(`${newDateForm.date}T${newDateForm.time}`);
      if (Number.isNaN(dateTime.getTime())) {
        setError(t('sellTicket.dateTimeRequired'));
        setIsCreatingDate(false);
        return;
      }

      const newEventDate = await eventsService.addEventDate(currentEvent.id, {
        date: dateTime.toISOString(),
      });

      const updatedEvent = {
        ...currentEvent,
        dates: [...currentEvent.dates, newEventDate],
      };
      setCurrentEvent(updatedEvent);

      handleDateSelect(newEventDate);

      setShowCreateDateModal(false);
      setNewDateForm({ date: '', time: '' });
    } catch (err) {
      console.error('Failed to create event date:', err);
      setError(err instanceof Error ? err.message : t('sellTicket.createDateFailed'));
    } finally {
      setIsCreatingDate(false);
    }
  };

  const formatDateForDisplay = (eventDate: EventDate) => {
    const date = new Date(eventDate.date);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${formattedDate} at ${formattedTime}`;
  };

  const getFilteredDates = () => {
    const searchLower = dateSearchTerm.toLowerCase();

    const approved = currentEvent.dates
      .filter((d) => d.status === EventDateStatus.Approved)
      .filter((d) => formatDateForDisplay(d).toLowerCase().includes(searchLower));

    const pending = currentEvent.dates
      .filter((d) => d.status === EventDateStatus.Pending)
      .filter((d) => formatDateForDisplay(d).toLowerCase().includes(searchLower));

    return { approved, pending };
  };

  return (
    <>
      {showCreateDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  {t('sellTicket.createDateTitle')}
                </h2>
              </div>
              <button
                onClick={() => setShowCreateDateModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              {t('sellTicket.createDateDesc', { eventName: currentEvent.name })}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('sellTicket.eventDate')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newDateForm.date}
                  onChange={(e) => setNewDateForm({ ...newDateForm, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('sellTicket.dateTime')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={newDateForm.time}
                  onChange={(e) => setNewDateForm({ ...newDateForm, time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{t('sellTicket.newDatePendingNote')}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateDateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleCreateDate}
                disabled={isCreatingDate || !newDateForm.date || !newDateForm.time}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreatingDate ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isCreatingDate ? t('common.creating') : t('sellTicket.createDate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Ticket className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  {t('sellTicket.createSectionTitle')}
                </h2>
              </div>
              <button
                onClick={() => setShowCreateSectionModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">
              {t('sellTicket.createSectionDesc', { eventName: currentEvent.name })}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('sellTicket.sectionName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder={t('sellTicket.sectionNamePlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sellTicket.seatingType')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewSectionSeatingType('unnumbered')}
                    className={`p-4 border-2 rounded-lg transition-colors text-left ${
                      newSectionSeatingType === 'unnumbered'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{t('sellTicket.generalAdmission')}</p>
                    <p className="text-sm text-gray-600">{t('sellTicket.generalAdmissionDesc')}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSectionSeatingType('numbered')}
                    className={`p-4 border-2 rounded-lg transition-colors text-left ${
                      newSectionSeatingType === 'numbered'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{t('sellTicket.numberedSeating')}</p>
                    <p className="text-sm text-gray-600">{t('sellTicket.numberedSeatingDesc')}</p>
                  </button>
                </div>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">{t('sellTicket.newSectionPendingNote')}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCreateSectionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleCreateSection}
                disabled={isCreatingSection || !newSectionName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreatingSection ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {isCreatingSection ? t('common.creating') : t('sellTicket.createSection')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('sellTicket.backToEvents')}
        </button>

        <div className="bg-gray-100 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Ticket className="w-6 h-6 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">{t('sellTicket.eventName')}</p>
              <p className="font-semibold text-gray-900">{currentEvent.name}</p>
            </div>
          </div>
        </div>

        {error && <ErrorAlert message={error} className="mb-6" />}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('sellTicket.dateTime')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={dateSearchTerm}
                onChange={(e) => {
                  setDateSearchTerm(e.target.value);
                  setFormData({ ...formData, eventDateId: '', eventDate: '', eventTime: '' });
                  setShowDateSuggestions(true);
                }}
                onFocus={() => setShowDateSuggestions(true)}
                placeholder={t('sellTicket.selectDateTime')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              {showDateSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {getFilteredDates().approved.map((eventDate) => (
                    <button
                      key={eventDate.id}
                      type="button"
                      onClick={() => handleDateSelect(eventDate)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100"
                    >
                      <p className="font-semibold text-gray-900">
                        {formatDateForDisplay(eventDate)}
                      </p>
                    </button>
                  ))}

                  {getFilteredDates().pending.map((eventDate) => (
                    <button
                      key={eventDate.id}
                      type="button"
                      onClick={() => handleDateSelect(eventDate)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900">
                          {formatDateForDisplay(eventDate)}
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                          <Clock className="w-3 h-3" />
                          {t('common.pending')}
                        </span>
                      </div>
                    </button>
                  ))}

                  {getFilteredDates().approved.length === 0 &&
                    getFilteredDates().pending.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-600">
                        {t('sellTicket.noDatesFound')}
                      </div>
                    )}

                  <button
                    type="button"
                    onClick={() => handleDateSelect('create-new')}
                    className="w-full text-left px-4 py-3 hover:bg-green-50 border-t border-gray-200 text-green-700 font-semibold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('sellTicket.createNewDateTime')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('sellTicket.ticketType')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={ticketTypeSearchTerm}
                onChange={(e) => handleSectionInputChange(e.target.value)}
                onFocus={() => setShowTicketTypeSuggestions(true)}
                placeholder={t('sellTicket.typeToSearchTicketType')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />

              {showTicketTypeSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {currentEvent.sections
                    .filter(
                      (s) =>
                        s.status === EventSectionStatus.Approved &&
                        s.name.toLowerCase().includes(ticketTypeSearchTerm.toLowerCase())
                    )
                    .map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => handleSectionSelect(section)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100"
                      >
                        <p className="font-semibold text-gray-900">{section.name}</p>
                      </button>
                    ))}

                  {currentEvent.sections
                    .filter(
                      (s) =>
                        s.status === EventSectionStatus.Pending &&
                        s.name.toLowerCase().includes(ticketTypeSearchTerm.toLowerCase())
                    )
                    .map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => handleSectionSelect(section)}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900">{section.name}</p>
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                            <Clock className="w-3 h-3" />
                            {t('common.pending')}
                          </span>
                        </div>
                      </button>
                    ))}

                  {currentEvent.sections.filter((s) =>
                    s.name.toLowerCase().includes(ticketTypeSearchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="px-4 py-3 text-sm text-gray-600">
                      {t('sellTicket.noSectionsFound')}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSectionSelect('create-new')}
                    className="w-full text-left px-4 py-3 hover:bg-green-50 border-t border-gray-200 text-green-700 font-semibold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('sellTicket.createNewSection')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {formData.eventSectionId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {formData.seatingType === 'unnumbered'
                  ? t('sellTicket.generalAdmission')
                  : t('sellTicket.numberedSeating')}
              </label>

              {formData.seatingType === 'unnumbered' && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('sellTicket.quantity')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              {formData.seatingType === 'numbered' && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-600">{t('sellTicket.addSeatsDescription')}</p>
                  {formData.numberedSeats.map((seat, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={seat.row}
                          onChange={(e) => {
                            const newSeats = [...formData.numberedSeats];
                            newSeats[index] = { ...newSeats[index], row: e.target.value };
                            setFormData({ ...formData, numberedSeats: newSeats });
                          }}
                          placeholder={t('sellTicket.rowPlaceholder')}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={seat.seatNumber}
                          onChange={(e) => {
                            const newSeats = [...formData.numberedSeats];
                            newSeats[index] = { ...newSeats[index], seatNumber: e.target.value };
                            setFormData({ ...formData, numberedSeats: newSeats });
                          }}
                          placeholder={t('sellTicket.seatPlaceholder')}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {formData.numberedSeats.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newSeats = formData.numberedSeats.filter((_, i) => i !== index);
                            setFormData({ ...formData, numberedSeats: newSeats });
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('sellTicket.removeSeat')}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        numberedSeats: [...formData.numberedSeats, { row: '', seatNumber: '' }],
                      })
                    }
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {t('sellTicket.addAnotherSeat')}
                  </button>
                </div>
              )}

              {((formData.seatingType === 'unnumbered' && formData.quantity > 1) ||
                (formData.seatingType === 'numbered' &&
                  formData.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim())
                    .length > 1)) && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sellTogether}
                      onChange={(e) => setFormData({ ...formData, sellTogether: e.target.checked })}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{t('sellTicket.sellTogether')}</p>
                      <p className="text-sm text-gray-600">{t('sellTicket.sellTogetherDesc')}</p>
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('sellTicket.pricePerTicket')} <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-stretch">
              <span className="flex items-center pl-4 pr-2 text-gray-500 font-semibold border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 min-w-[4rem]">
                {sellerCurrency === 'ARS' ? '$' : sellerCurrency}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.pricePerTicket || ''}
                onChange={(e) =>
                  setFormData({ ...formData, pricePerTicket: parseFloat(e.target.value) || 0 })
                }
                className="flex-1 rounded-r-lg border border-gray-300 pl-4 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>
            {(() => {
              const ticketCount =
                formData.seatingType === 'numbered'
                  ? formData.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim()).length
                  : formData.quantity;
              return ticketCount > 1 ? (
                <p className="text-sm text-gray-600 mt-2">
                  {t('sellTicket.totalValue')}: {formatCurrencyFromUnits(formData.pricePerTicket * ticketCount, sellerCurrency)}
                </p>
              ) : null;
            })()}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('sellTicket.deliveryMethod')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    deliveryMethod: 'digital',
                    digitallyTransferable: true,
                    physicalDeliveryMethod: '',
                    pickupAddress: '',
                  })
                }
                className={`p-4 border-2 rounded-lg transition-colors ${
                  formData.deliveryMethod === 'digital'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{t('sellTicket.digital')}</p>
                  <p className="text-sm text-gray-600">{t('sellTicket.digitalDesc')}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, deliveryMethod: 'physical', digitallyTransferable: false })
                }
                className={`p-4 border-2 rounded-lg transition-colors ${
                  formData.deliveryMethod === 'physical'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
              >
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{t('sellTicket.physical')}</p>
                  <p className="text-sm text-gray-600">{t('sellTicket.physicalDesc')}</p>
                </div>
              </button>
            </div>

            {formData.deliveryMethod === 'digital' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.digitallyTransferable}
                    onChange={(e) =>
                      setFormData({ ...formData, digitallyTransferable: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {t('sellTicket.digitallyTransferable')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {t('sellTicket.digitallyTransferableDesc')}
                    </p>
                  </div>
                </label>
              </div>
            )}

            {formData.deliveryMethod === 'physical' && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('sellTicket.howToDeliver')} <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, physicalDeliveryMethod: 'pickup', pickupAddress: '' })
                      }
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        formData.physicalDeliveryMethod === 'pickup'
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">{t('sellTicket.pickupAddress')}</p>
                        <p className="text-sm text-gray-600">{t('sellTicket.pickupAddressDesc')}</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, physicalDeliveryMethod: 'arrange', pickupAddress: '' })
                      }
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        formData.physicalDeliveryMethod === 'arrange'
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-300 hover:border-green-400'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">
                          {t('sellTicket.arrangeWithBuyer')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t('sellTicket.arrangeWithBuyerDesc')}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {formData.physicalDeliveryMethod === 'pickup' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('sellTicket.enterPickupAddress')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.pickupAddress}
                      onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                      placeholder={t('sellTicket.pickupAddressPlaceholder')}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('sellTicket.description')}
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('sellTicket.descriptionPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              className="flex-1 px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Ticket className="w-5 h-5" />
              )}
              {isSubmitting ? t('common.saving') : t('sellTicket.createListing')}
            </button>
          </div>

          {isPendingListing && formData.eventDateId && formData.eventSectionId && (() => {
            const eventPending = currentEvent.status === EventStatus.Pending;
            const selectedDate = currentEvent.dates.find((d) => d.id === formData.eventDateId);
            const datePending = selectedDate?.status === EventDateStatus.Pending;
            const selectedSection = currentEvent.sections.find(
              (s) => s.id === formData.eventSectionId
            );
            const sectionPending = selectedSection?.status === EventSectionStatus.Pending;

            return (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">
                      {t('sellTicket.pendingListingWarningTitle')}
                    </p>
                    <p className="mb-2">{t('sellTicket.pendingListingWarningDescSpecific')}</p>
                    <ul className="list-disc list-inside space-y-1">
                      {eventPending && <li>{t('sellTicket.pendingEvent')}</li>}
                      {datePending && <li>{t('sellTicket.pendingDate')}</li>}
                      {sectionPending && <li>{t('sellTicket.pendingSection')}</li>}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })()}
        </form>
      </div>
    </>
  );
}
