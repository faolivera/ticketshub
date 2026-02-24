import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Ticket, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/contexts/UserContext';
import { SellerIntroModal } from '@/app/components/SellerIntroModal';
import { SellerStatusBanner } from '@/app/components/SellerStatusBanner';
import { EmptyState } from '@/app/components/EmptyState';
import { ErrorAlert } from '@/app/components/ErrorMessage';
import { eventsService } from '../../api/services/events.service';
import { ticketsService } from '../../api/services/tickets.service';
import type { EventWithDates, TicketType, DeliveryMethod } from '../../api/types';

interface TicketListingForm {
  eventId: string;
  eventDateId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  section: string;
  deliveryMethod: 'digital' | 'physical';
  digitallyTransferable: boolean;
  physicalDeliveryMethod: 'pickup' | 'arrange' | '';
  pickupAddress: string;
  quantity: number;
  sellTogether: boolean;
  pricePerTicket: number;
  row?: string;
  seats?: string;
  description?: string;
}

const defaultTicketTypes = ['General Admission', 'VIP', 'Premium', 'Field', 'Normal'];

export function SellTicket() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const newEvent = location.state?.newEvent;
  const { user, isAuthenticated } = useUser();

  const [showSellerIntroModal, setShowSellerIntroModal] = useState(false);
  const [events, setEvents] = useState<EventWithDates[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<TicketListingForm>({
    eventId: '',
    eventDateId: '',
    eventName: '',
    eventDate: '',
    eventTime: '',
    section: '',
    deliveryMethod: 'digital',
    digitallyTransferable: true,
    physicalDeliveryMethod: '',
    pickupAddress: '',
    quantity: 1,
    sellTogether: false,
    pricePerTicket: 0
  });

  const [ticketTypes] = useState<string[]>(defaultTicketTypes);
  const [eventSearchTerm, setEventSearchTerm] = useState(newEvent?.name || '');
  const [ticketTypeSearchTerm, setTicketTypeSearchTerm] = useState('');
  const [showEventSuggestions, setShowEventSuggestions] = useState(false);
  const [showTicketTypeSuggestions, setShowTicketTypeSuggestions] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithDates | null>(null);

  // Fetch approved events
  useEffect(() => {
    async function fetchEvents() {
      setIsLoadingEvents(true);
      try {
        const data = await eventsService.listEvents({ status: 'approved' });
        setEvents(data);
      } catch (err) {
        console.error('Failed to fetch events:', err);
      } finally {
        setIsLoadingEvents(false);
      }
    }

    fetchEvents();
  }, []);

  // Check if user needs to see seller intro modal
  useEffect(() => {
    if (user && user.level === 'Basic' && !user.hasSeenSellerIntro) {
      setShowSellerIntroModal(true);
    }

    // If coming back from create event, populate the event
    if (newEvent) {
      setFormData(prev => ({
        ...prev,
        eventId: newEvent.id,
        eventName: newEvent.name
      }));
      setEventSearchTerm(newEvent.name);
    }
  }, [user, newEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.eventId || !formData.eventDateId || !formData.section || formData.pricePerTicket <= 0) {
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

    const parsedSeats = formData.seats
      ? formData.seats.split(',').map((seat) => seat.trim()).filter(Boolean)
      : [];
    const isNumberedListing = parsedSeats.length > 0;
    if (isNumberedListing && !formData.row?.trim()) {
      setError(t('sellTicket.row'));
      return;
    }

    // Map form data to API request
    let ticketType: TicketType;
    if (formData.deliveryMethod === 'physical') {
      ticketType = 'Physical';
    } else if (formData.digitallyTransferable) {
      ticketType = 'DigitalTransferable';
    } else {
      ticketType = 'DigitalNonTransferable';
    }

    let deliveryMethod: DeliveryMethod | undefined;
    if (formData.deliveryMethod === 'physical') {
      deliveryMethod = formData.physicalDeliveryMethod === 'pickup' ? 'Pickup' : 'ArrangeWithSeller';
    }

    setIsSubmitting(true);

    try {
      await ticketsService.createListing({
        eventId: formData.eventId,
        eventDateId: formData.eventDateId,
        type: ticketType,
        quantity: isNumberedListing ? undefined : formData.quantity,
        ticketUnits: isNumberedListing
          ? parsedSeats.map((seatNumber) => ({
              seat: {
                row: formData.row!.trim(),
                seatNumber,
              },
            }))
          : undefined,
        sellTogether: formData.sellTogether,
        pricePerTicket: {
          amount: Math.round(formData.pricePerTicket * 100), // Convert to cents
          currency: 'USD',
        },
        deliveryMethod,
        pickupAddress: formData.physicalDeliveryMethod === 'pickup' ? {
          line1: formData.pickupAddress,
          city: '',
          countryCode: 'US',
        } : undefined,
        section: formData.section,
        description: formData.description,
      });

      navigate('/bought-tickets', { state: { tab: 'listed' } });
    } catch (err) {
      console.error('Failed to create listing:', err);
      setError(err instanceof Error ? err.message : t('sellTicket.createListingFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(eventSearchTerm.toLowerCase())
  );

  const filteredTicketTypes = ticketTypes.filter(type =>
    type.toLowerCase().includes(ticketTypeSearchTerm.toLowerCase())
  );

  const handleEventSelect = (event: EventWithDates) => {
    setFormData({ 
      ...formData, 
      eventId: event.id, 
      eventName: event.name, 
      eventDateId: '',
      eventDate: '', 
      eventTime: '' 
    });
    setEventSearchTerm(event.name);
    setShowEventSuggestions(false);
    setSelectedEvent(event);
  };

  const handleTicketTypeSelect = (type: string) => {
    setFormData({ ...formData, section: type });
    setTicketTypeSearchTerm(type);
    setShowTicketTypeSuggestions(false);
  };

  const handleEventInputChange = (value: string) => {
    setEventSearchTerm(value);
    setFormData({ ...formData, eventName: value, eventId: '', eventDateId: '', eventDate: '', eventTime: '' });
    setShowEventSuggestions(value.length > 0);
    setSelectedEvent(null);
  };

  const handleTicketTypeInputChange = (value: string) => {
    setTicketTypeSearchTerm(value);
    setFormData({ ...formData, section: value });
    setShowTicketTypeSuggestions(value.length > 0);
  };

  const handleDateSelect = (dateId: string) => {
    if (!selectedEvent) return;
    
    const eventDate = selectedEvent.dates.find(d => d.id === dateId);
    if (eventDate) {
      const date = new Date(eventDate.date);
      const time = eventDate.startTime ? new Date(eventDate.startTime) : date;
      
      setFormData({
        ...formData,
        eventDateId: dateId,
        eventDate: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        eventTime: time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      });
    }
  };

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <EmptyState
          icon={Ticket}
          title={t('sellTicket.loginRequired')}
          description={t('sellTicket.mustBeLoggedIn')}
          action={{
            label: t('sellTicket.loginToSell'),
            to: '/register',
          }}
        />
      </div>
    );
  }

  return (
    <>
      {showSellerIntroModal && (
        <SellerIntroModal
          onClose={() => {
            setShowSellerIntroModal(false);
            navigate('/');
          }}
        />
      )}

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link 
            to="/bought-tickets"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('sellTicket.backToTickets')}
          </Link>

          <SellerStatusBanner />

          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="flex items-center gap-3 mb-6">
              <Ticket className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">{t('sellTicket.title')}</h1>
            </div>

            <p className="text-gray-600 mb-8">
              {t('sellTicket.subtitle')}
            </p>

            {error && (
              <ErrorAlert message={error} className="mb-6" />
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Selection with Autocomplete */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sellTicket.eventName')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={eventSearchTerm}
                    onChange={(e) => handleEventInputChange(e.target.value)}
                    onFocus={() => setShowEventSuggestions(eventSearchTerm.length > 0)}
                    placeholder={isLoadingEvents ? t('common.loading') : t('sellTicket.typeToSearchEvent')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoadingEvents}
                    required
                  />
                  
                  {showEventSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredEvents.length > 0 ? (
                        filteredEvents.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => handleEventSelect(event)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="font-semibold text-gray-900">{event.name}</p>
                            <p className="text-sm text-gray-600">
                              {event.dates.length} date{event.dates.length !== 1 ? 's' : ''} available
                            </p>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3">
                          <p className="text-sm text-gray-600 mb-2">
                            {t('sellTicket.noEventsFound')}
                          </p>
                          <Link
                            to="/create-event"
                            state={{ fromSellTicket: true }}
                            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
                            onClick={() => setShowEventSuggestions(false)}
                          >
                            <Plus className="w-4 h-4" />
                            {t('sellTicket.createNewEvent')}
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Date Selection */}
              {selectedEvent && selectedEvent.dates.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('sellTicket.dateTime')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.eventDateId}
                    onChange={(e) => handleDateSelect(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">{t('sellTicket.selectDateTime')}</option>
                    {selectedEvent.dates
                      .filter(d => d.status === 'approved')
                      .map((eventDate) => {
                        const date = new Date(eventDate.date);
                        const time = eventDate.startTime ? new Date(eventDate.startTime) : date;
                        return (
                          <option key={eventDate.id} value={eventDate.id}>
                            {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            {' '}at{' '}
                            {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}

              {/* Ticket Type with Autocomplete */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sellTicket.ticketType')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={ticketTypeSearchTerm}
                    onChange={(e) => handleTicketTypeInputChange(e.target.value)}
                    onFocus={() => setShowTicketTypeSuggestions(true)}
                    placeholder={t('sellTicket.typeToSearchTicketType')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  
                  {showTicketTypeSuggestions && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredTicketTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleTicketTypeSelect(type)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-semibold text-gray-900">{type}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row and Seats (optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('sellTicket.row')}
                  </label>
                  <input
                    type="text"
                    value={formData.row || ''}
                    onChange={(e) => setFormData({ ...formData, row: e.target.value })}
                    placeholder="e.g., A, 12"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('sellTicket.seats')}
                  </label>
                  <input
                    type="text"
                    value={formData.seats || ''}
                    onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                    placeholder="e.g., 1, 2, 3"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Delivery Method */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sellTicket.deliveryMethod')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMethod: 'digital', digitallyTransferable: true, physicalDeliveryMethod: '', pickupAddress: '' })}
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
                    onClick={() => setFormData({ ...formData, deliveryMethod: 'physical', digitallyTransferable: false })}
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

                {/* Digital Transfer Option */}
                {formData.deliveryMethod === 'digital' && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.digitallyTransferable}
                        onChange={(e) => setFormData({ ...formData, digitallyTransferable: e.target.checked })}
                        className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-semibold text-gray-900">{t('sellTicket.digitallyTransferable')}</p>
                        <p className="text-sm text-gray-600">{t('sellTicket.digitallyTransferableDesc')}</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Physical Delivery Options */}
                {formData.deliveryMethod === 'physical' && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {t('sellTicket.howToDeliver')} <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, physicalDeliveryMethod: 'pickup', pickupAddress: '' })}
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
                          onClick={() => setFormData({ ...formData, physicalDeliveryMethod: 'arrange', pickupAddress: '' })}
                          className={`p-4 border-2 rounded-lg transition-colors ${
                            formData.physicalDeliveryMethod === 'arrange'
                              ? 'border-green-600 bg-green-50'
                              : 'border-gray-300 hover:border-green-400'
                          }`}
                        >
                          <div className="text-left">
                            <p className="font-semibold text-gray-900">{t('sellTicket.arrangeWithBuyer')}</p>
                            <p className="text-sm text-gray-600">{t('sellTicket.arrangeWithBuyerDesc')}</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Pickup Address Input */}
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

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sellTicket.quantity')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Sell Together Option */}
              {formData.quantity > 1 && (
                <div className="p-4 bg-gray-50 rounded-lg">
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

              {/* Price */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sellTicket.pricePerTicket')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.pricePerTicket || ''}
                    onChange={(e) => setFormData({ ...formData, pricePerTicket: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
                {formData.quantity > 1 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {t('sellTicket.totalValue')}: ${(formData.pricePerTicket * formData.quantity).toFixed(2)}
                  </p>
                )}
              </div>

              {/* Description */}
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

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/bought-tickets')}
                  className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
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
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
