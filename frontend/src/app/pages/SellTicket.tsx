import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Ticket, Plus, Loader2, Phone, Trash2, Clock, AlertTriangle, Calendar, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/contexts/UserContext';
import { SellerIntroModal } from '@/app/components/SellerIntroModal';
import { SellerStatusBanner } from '@/app/components/SellerStatusBanner';
import { EmptyState } from '@/app/components/EmptyState';
import { ErrorAlert } from '@/app/components/ErrorMessage';
import { eventsService } from '../../api/services/events.service';
import { ticketsService } from '../../api/services/tickets.service';
import { SeatingType, TicketType, DeliveryMethod, EventStatus, EventDateStatus, EventSectionStatus } from '../../api/types';
import type { EventWithDates, EventDate, EventSection } from '../../api/types';

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
  deliveryMethod: 'digital' | 'physical';
  digitallyTransferable: boolean;
  physicalDeliveryMethod: 'pickup' | 'arrange' | '';
  pickupAddress: string;
  quantity: number;
  sellTogether: boolean;
  pricePerTicket: number;
  seatingType: 'numbered' | 'unnumbered';
  numberedSeats: NumberedSeat[];
  description?: string;
}

export function SellTicket() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const newEvent = location.state?.newEvent;
  const { user, isAuthenticated, canSell } = useUser();

  const [showSellerIntroModal, setShowSellerIntroModal] = useState(false);
  const [events, setEvents] = useState<EventWithDates[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create date modal state
  const [showCreateDateModal, setShowCreateDateModal] = useState(false);
  const [isCreatingDate, setIsCreatingDate] = useState(false);
  const [newDateForm, setNewDateForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    doorsOpenAt: '',
  });
  
  // Create section modal state
  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  
  // Track if selected event/date/section is pending
  const [isPendingListing, setIsPendingListing] = useState(false);
  
  const [formData, setFormData] = useState<TicketListingForm>({
    eventId: '',
    eventDateId: '',
    eventName: '',
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
    numberedSeats: [{ row: '', seatNumber: '' }]
  });

  const [eventSearchTerm, setEventSearchTerm] = useState(newEvent?.name || '');
  const [ticketTypeSearchTerm, setTicketTypeSearchTerm] = useState('');
  const [showEventSuggestions, setShowEventSuggestions] = useState(false);
  const [showTicketTypeSuggestions, setShowTicketTypeSuggestions] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventWithDates | null>(null);

  // Fetch events (both approved and pending for creation)
  useEffect(() => {
    async function fetchEvents() {
      setIsLoadingEvents(true);
      try {
        // Fetch approved events for public listing
        const approvedData = await eventsService.listEvents({ status: 'approved' });
        // Also fetch user's own events which may include pending
        let myEvents: EventWithDates[] = [];
        try {
          myEvents = await eventsService.getMyEvents();
        } catch {
          // User may not have any events, ignore error
        }
        
        // Merge events, removing duplicates
        const eventMap = new Map<string, EventWithDates>();
        for (const event of approvedData) {
          eventMap.set(event.id, event);
        }
        for (const event of myEvents) {
          if (!eventMap.has(event.id)) {
            eventMap.set(event.id, event);
          }
        }
        
        setEvents(Array.from(eventMap.values()));
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
    if (user && !canSell() && !user.hasSeenSellerIntro) {
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
    const seatingType = isNumberedListing ? SeatingType.Numbered : SeatingType.Unnumbered;

    if (isNumberedListing) {
      const validSeats = formData.numberedSeats.filter(s => s.row.trim() && s.seatNumber.trim());
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

    // Map form data to API request
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
      deliveryMethod = formData.physicalDeliveryMethod === 'pickup' ? DeliveryMethod.Pickup : DeliveryMethod.ArrangeWithSeller;
    }

    setIsSubmitting(true);

    try {
      const listing = await ticketsService.createListing({
        eventId: formData.eventId,
        eventDateId: formData.eventDateId,
        type: ticketType,
        seatingType,
        quantity: isNumberedListing ? undefined : formData.quantity,
        ticketUnits: isNumberedListing
          ? formData.numberedSeats
              .filter(s => s.row.trim() && s.seatNumber.trim())
              .map((seat) => ({
                seat: {
                  row: seat.row.trim(),
                  seatNumber: seat.seatNumber.trim(),
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

  const filteredEvents = events.filter(event =>
    event.name.toLowerCase().includes(eventSearchTerm.toLowerCase())
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
    setIsPendingListing(event.status === EventStatus.Pending);
  };

  const handleSectionSelect = (section: EventSection | 'create-new') => {
    if (section === 'create-new') {
      setShowCreateSectionModal(true);
      setShowTicketTypeSuggestions(false);
      return;
    }
    
    setFormData({ ...formData, eventSectionId: section.id });
    setTicketTypeSearchTerm(section.name);
    setShowTicketTypeSuggestions(false);
    
    // Update pending status based on section
    updatePendingStatus(section.status === EventSectionStatus.Pending);
  };
  
  const updatePendingStatus = (sectionPending: boolean) => {
    if (!selectedEvent) return;
    
    const eventPending = selectedEvent.status === EventStatus.Pending;
    const selectedDate = selectedEvent.dates.find(d => d.id === formData.eventDateId);
    const datePending = selectedDate?.status === EventDateStatus.Pending;
    
    setIsPendingListing(eventPending || datePending || sectionPending);
  };
  
  const handleCreateSection = async () => {
    if (!selectedEvent || !newSectionName.trim()) {
      setError(t('sellTicket.sectionNameRequired'));
      return;
    }

    setIsCreatingSection(true);
    setError(null);

    try {
      const newSection = await eventsService.addEventSection(selectedEvent.id, {
        name: newSectionName.trim(),
      });

      // Update the selected event with the new section
      const updatedEvent = {
        ...selectedEvent,
        sections: [...selectedEvent.sections, newSection],
      };
      setSelectedEvent(updatedEvent);
      
      // Update events list
      setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e));

      // Select the new section
      setFormData({ ...formData, eventSectionId: newSection.id });
      setTicketTypeSearchTerm(newSection.name);
      
      // Update pending status
      updatePendingStatus(newSection.status === EventSectionStatus.Pending);
      
      // Close modal and reset form
      setShowCreateSectionModal(false);
      setNewSectionName('');
    } catch (err) {
      console.error('Failed to create section:', err);
      setError(err instanceof Error ? err.message : t('sellTicket.createSectionFailed'));
    } finally {
      setIsCreatingSection(false);
    }
  };

  const handleEventInputChange = (value: string) => {
    setEventSearchTerm(value);
    setFormData({ ...formData, eventName: value, eventId: '', eventDateId: '', eventDate: '', eventTime: '' });
    setShowEventSuggestions(value.length > 0);
    setSelectedEvent(null);
    setIsPendingListing(false);
  };

  const handleCreateDate = async () => {
    if (!selectedEvent || !newDateForm.date || !newDateForm.startTime) {
      setError(t('sellTicket.dateTimeRequired'));
      return;
    }

    setIsCreatingDate(true);
    setError(null);

    try {
      const dateTime = new Date(`${newDateForm.date}T${newDateForm.startTime}`);
      const endDateTime = newDateForm.endTime ? new Date(`${newDateForm.date}T${newDateForm.endTime}`) : undefined;
      const doorsOpenDateTime = newDateForm.doorsOpenAt ? new Date(`${newDateForm.date}T${newDateForm.doorsOpenAt}`) : undefined;

      const newEventDate = await eventsService.addEventDate(selectedEvent.id, {
        date: dateTime,
        startTime: dateTime,
        endTime: endDateTime,
        doorsOpenAt: doorsOpenDateTime,
      });

      // Update the selected event with the new date
      const updatedEvent = {
        ...selectedEvent,
        dates: [...selectedEvent.dates, newEventDate],
      };
      setSelectedEvent(updatedEvent);
      
      // Update events list
      setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e));

      // Select the new date
      handleDateSelect(newEventDate.id);
      
      // Close modal and reset form
      setShowCreateDateModal(false);
      setNewDateForm({ date: '', startTime: '', endTime: '', doorsOpenAt: '' });
    } catch (err) {
      console.error('Failed to create event date:', err);
      setError(err instanceof Error ? err.message : t('sellTicket.createDateFailed'));
    } finally {
      setIsCreatingDate(false);
    }
  };

  const handleSectionInputChange = (value: string) => {
    setTicketTypeSearchTerm(value);
    setFormData({ ...formData, eventSectionId: '' });
    setShowTicketTypeSuggestions(value.length > 0);
  };

  const handleDateSelect = (dateId: string) => {
    if (!selectedEvent) return;
    
    if (dateId === 'create-new') {
      setShowCreateDateModal(true);
      return;
    }
    
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
      
      // Check if this creates a pending listing
      const eventPending = selectedEvent.status === EventStatus.Pending;
      const datePending = eventDate.status === EventDateStatus.Pending;
      const selectedSection = selectedEvent.sections.find(s => s.id === formData.eventSectionId);
      const sectionPending = selectedSection?.status === EventSectionStatus.Pending;
      setIsPendingListing(eventPending || datePending || sectionPending);
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

  // Block selling without verified phone
  if (user && !user.phoneVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <Phone className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('sellTicket.phoneRequired')}</h2>
          <p className="text-gray-600 mb-6">{t('sellTicket.phoneRequiredDescription')}</p>
          <Link
            to="/phone-verification"
            state={{ returnTo: '/sell-ticket' }}
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('sellTicket.verifyPhoneNow')}
          </Link>
        </div>
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

      {/* Create Date Modal */}
      {showCreateDateModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">{t('sellTicket.createDateTitle')}</h2>
              </div>
              <button
                onClick={() => setShowCreateDateModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              {t('sellTicket.createDateDesc', { eventName: selectedEvent.name })}
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('sellTicket.startTime')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={newDateForm.startTime}
                    onChange={(e) => setNewDateForm({ ...newDateForm, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('sellTicket.endTime')}
                  </label>
                  <input
                    type="time"
                    value={newDateForm.endTime}
                    onChange={(e) => setNewDateForm({ ...newDateForm, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('sellTicket.doorsOpen')}
                </label>
                <input
                  type="time"
                  value={newDateForm.doorsOpenAt}
                  onChange={(e) => setNewDateForm({ ...newDateForm, doorsOpenAt: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    {t('sellTicket.newDatePendingNote')}
                  </p>
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
                disabled={isCreatingDate || !newDateForm.date || !newDateForm.startTime}
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

      {/* Create Section Modal */}
      {showCreateSectionModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Ticket className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">{t('sellTicket.createSectionTitle')}</h2>
              </div>
              <button
                onClick={() => setShowCreateSectionModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <p className="text-gray-600 mb-4">
              {t('sellTicket.createSectionDesc', { eventName: selectedEvent.name })}
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
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    {t('sellTicket.newSectionPendingNote')}
                  </p>
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
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-gray-900">{event.name}</p>
                              {event.status === EventStatus.Pending && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                                  <Clock className="w-3 h-3" />
                                  {t('common.pending')}
                                </span>
                              )}
                            </div>
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
              {selectedEvent && (
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
                    
                    {/* Approved dates */}
                    {selectedEvent.dates
                      .filter(d => d.status === EventDateStatus.Approved)
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
                    
                    {/* Pending dates */}
                    {selectedEvent.dates
                      .filter(d => d.status === EventDateStatus.Pending)
                      .map((eventDate) => {
                        const date = new Date(eventDate.date);
                        const time = eventDate.startTime ? new Date(eventDate.startTime) : date;
                        return (
                          <option key={eventDate.id} value={eventDate.id}>
                            ⏳ {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            {' '}at{' '}
                            {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            {' '}({t('sellTicket.pendingApproval')})
                          </option>
                        );
                      })}
                    
                    {/* Create new date option */}
                    <option value="create-new">➕ {t('sellTicket.createNewDateTime')}</option>
                  </select>
                  
                </div>
              )}

              {/* Section Selection */}
              {selectedEvent && (
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
                        {/* Approved sections first */}
                        {selectedEvent.sections
                          .filter(s => s.status === EventSectionStatus.Approved && s.name.toLowerCase().includes(ticketTypeSearchTerm.toLowerCase()))
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
                        
                        {/* Pending sections */}
                        {selectedEvent.sections
                          .filter(s => s.status === EventSectionStatus.Pending && s.name.toLowerCase().includes(ticketTypeSearchTerm.toLowerCase()))
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
                        
                        {/* No sections message */}
                        {selectedEvent.sections.filter(s => s.name.toLowerCase().includes(ticketTypeSearchTerm.toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-sm text-gray-600">
                            {t('sellTicket.noSectionsFound')}
                          </div>
                        )}
                        
                        {/* Create new section option */}
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
              )}

              {/* Seating Type Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sellTicket.seatingType')} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, seatingType: 'unnumbered', quantity: formData.quantity || 1 })}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      formData.seatingType === 'unnumbered'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{t('sellTicket.generalAdmission')}</p>
                      <p className="text-sm text-gray-600">{t('sellTicket.generalAdmissionDesc')}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, seatingType: 'numbered', numberedSeats: formData.numberedSeats.length > 0 ? formData.numberedSeats : [{ row: '', seatNumber: '' }] })}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      formData.seatingType === 'numbered'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{t('sellTicket.numberedSeating')}</p>
                      <p className="text-sm text-gray-600">{t('sellTicket.numberedSeatingDesc')}</p>
                    </div>
                  </button>
                </div>

                {/* Quantity field for unnumbered seating */}
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
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                {/* Numbered seats list */}
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
                      onClick={() => setFormData({ ...formData, numberedSeats: [...formData.numberedSeats, { row: '', seatNumber: '' }] })}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      {t('sellTicket.addAnotherSeat')}
                    </button>
                  </div>
                )}

                {/* Sell Together Option - shown when multiple tickets */}
                {((formData.seatingType === 'unnumbered' && formData.quantity > 1) ||
                  (formData.seatingType === 'numbered' && formData.numberedSeats.filter(s => s.row.trim() && s.seatNumber.trim()).length > 1)) && (
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

                {/* Price Per Ticket */}
                <div className="mt-4">
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
                  {(() => {
                    const ticketCount = formData.seatingType === 'numbered'
                      ? formData.numberedSeats.filter(s => s.row.trim() && s.seatNumber.trim()).length
                      : formData.quantity;
                    return ticketCount > 1 ? (
                      <p className="text-sm text-gray-600 mt-2">
                        {t('sellTicket.totalValue')}: ${(formData.pricePerTicket * ticketCount).toFixed(2)}
                      </p>
                    ) : null;
                  })()}
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

              {/* Pending listing warning - shows which items need approval */}
              {isPendingListing && formData.eventDateId && formData.eventSectionId && (() => {
                const eventPending = selectedEvent?.status === EventStatus.Pending;
                const selectedDate = selectedEvent?.dates.find(d => d.id === formData.eventDateId);
                const datePending = selectedDate?.status === EventDateStatus.Pending;
                const selectedSection = selectedEvent?.sections.find(s => s.id === formData.eventSectionId);
                const sectionPending = selectedSection?.status === EventSectionStatus.Pending;
                
                return (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-semibold mb-1">{t('sellTicket.pendingListingWarningTitle')}</p>
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
        </div>
      </div>
    </>
  );
}
