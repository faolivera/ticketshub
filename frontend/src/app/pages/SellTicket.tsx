import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Ticket, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/contexts/UserContext';
import { SellerIntroModal } from '@/app/components/SellerIntroModal';
import { SellerStatusBanner } from '@/app/components/SellerStatusBanner';

interface TicketListing {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  ticketType: string;
  deliveryMethod: 'digital' | 'physical';
  digitallyTransferable: boolean;
  physicalDeliveryMethod: 'pickup' | 'arrange' | '';
  pickupAddress: string;
  quantity: number;
  sellTogether: boolean;
  pricePerTicket: number;
}

const availableEvents = [
  { 
    id: '1', 
    name: 'Summer Music Festival', 
    dates: [
      { id: 'd1', date: '2026-07-15', time: '19:00', displayDate: 'July 15, 2026', displayTime: '7:00 PM' },
      { id: 'd2', date: '2026-07-16', time: '19:00', displayDate: 'July 16, 2026', displayTime: '7:00 PM' }
    ]
  },
  { 
    id: '2', 
    name: 'Bad Bunny', 
    dates: [
      { id: 'd3', date: '2026-07-15', time: '20:00', displayDate: 'July 15, 2026', displayTime: '8:00 PM' },
      { id: 'd4', date: '2026-07-22', time: '20:00', displayDate: 'July 22, 2026', displayTime: '8:00 PM' },
      { id: 'd5', date: '2026-07-29', time: '20:00', displayDate: 'July 29, 2026', displayTime: '8:00 PM' }
    ]
  },
  { 
    id: '3', 
    name: 'Jazz Evening', 
    dates: [
      { id: 'd6', date: '2026-09-05', time: '21:00', displayDate: 'September 5, 2026', displayTime: '9:00 PM' }
    ]
  },
  { 
    id: '4', 
    name: 'Rock Concert', 
    dates: [
      { id: 'd7', date: '2026-08-20', time: '18:30', displayDate: 'August 20, 2026', displayTime: '6:30 PM' }
    ]
  }
];

const defaultTicketTypes = ['General Admission', 'VIP', 'Premium', 'Field', 'Normal'];

export function SellTicket() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const newEvent = location.state?.newEvent;
  const { user, upgradeToLevel1 } = useUser();

  const [showSellerIntroModal, setShowSellerIntroModal] = useState(false);
  
  const [formData, setFormData] = useState<TicketListing>({
    eventId: '',
    eventName: '',
    eventDate: '',
    eventTime: '',
    ticketType: '',
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
  const [showAddNewDate, setShowAddNewDate] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [selectedEventDates, setSelectedEventDates] = useState<any[]>([]);

  // Check if user needs to see seller intro modal
  useEffect(() => {
    if (user && user.level === 0 && !user.hasSeenSellerIntro) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.eventName || !formData.eventDate || !formData.eventTime || !formData.ticketType || formData.pricePerTicket <= 0) {
      alert(t('sellTicket.pleaseCompleteAllFields'));
      return;
    }

    if (formData.deliveryMethod === 'physical' && !formData.physicalDeliveryMethod) {
      alert(t('sellTicket.pleaseSelectDeliveryMethod'));
      return;
    }

    if (formData.physicalDeliveryMethod === 'pickup' && !formData.pickupAddress.trim()) {
      alert(t('sellTicket.pleaseEnterPickupAddress'));
      return;
    }

    console.log('Ticket listing created:', formData);
    alert(t('sellTicket.listingCreatedSuccess'));
    navigate('/bought-tickets');
  };

  const filteredEvents = availableEvents.filter(event =>
    event.name.toLowerCase().includes(eventSearchTerm.toLowerCase())
  );

  const filteredTicketTypes = ticketTypes.filter(type =>
    type.toLowerCase().includes(ticketTypeSearchTerm.toLowerCase())
  );

  const handleEventSelect = (event: typeof availableEvents[0]) => {
    setFormData({ ...formData, eventId: event.id, eventName: event.name, eventDate: '', eventTime: '' });
    setEventSearchTerm(event.name);
    setShowEventSuggestions(false);
    setSelectedEventDates(event.dates || []);
  };

  const handleTicketTypeSelect = (type: string) => {
    setFormData({ ...formData, ticketType: type });
    setTicketTypeSearchTerm(type);
    setShowTicketTypeSuggestions(false);
  };

  const handleEventInputChange = (value: string) => {
    setEventSearchTerm(value);
    setFormData({ ...formData, eventName: value, eventId: '', eventDate: '', eventTime: '' });
    setShowEventSuggestions(value.length > 0);
    setSelectedEventDates([]);
  };

  const handleTicketTypeInputChange = (value: string) => {
    setTicketTypeSearchTerm(value);
    setFormData({ ...formData, ticketType: value });
    setShowTicketTypeSuggestions(value.length > 0);
  };

  const handleDateTimeSelect = (dateInfo: any) => {
    setFormData({ 
      ...formData, 
      eventDate: dateInfo.displayDate, 
      eventTime: dateInfo.displayTime 
    });
  };

  const handleAddNewDate = () => {
    if (newDate && newTime) {
      const dateObj = new Date(newDate + 'T' + newTime);
      const displayDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const displayTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      
      const newDateInfo = {
        id: `custom-${Date.now()}`,
        date: newDate,
        time: newTime,
        displayDate,
        displayTime
      };
      
      setSelectedEventDates([...selectedEventDates, newDateInfo]);
      setFormData({ ...formData, eventDate: displayDate, eventTime: displayTime });
      setShowAddNewDate(false);
      setNewDate('');
      setNewTime('');
    }
  };

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
                  placeholder={t('sellTicket.typeToSearchEvent')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          <p className="text-sm text-gray-600">{event.date}</p>
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
              
              {formData.eventName && !formData.eventId && (
                <p className="text-sm text-amber-600 mt-2">
                  {t('sellTicket.creatingNewEvent')}: "{formData.eventName}"
                </p>
              )}
            </div>

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
                  onFocus={() => setShowTicketTypeSuggestions(ticketTypeSearchTerm.length > 0)}
                  placeholder={t('sellTicket.typeToSearchTicketType')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                
                {showTicketTypeSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredTicketTypes.length > 0 ? (
                      filteredTicketTypes.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleTicketTypeSelect(type)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-semibold text-gray-900">{type}</p>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-600">
                        {t('sellTicket.noTicketTypesFound')}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {formData.ticketType && !ticketTypes.includes(formData.ticketType) && (
                <p className="text-sm text-amber-600 mt-2">
                  {t('sellTicket.creatingNewType')}: "{formData.ticketType}"
                </p>
              )}
            </div>

            {/* Date & Time Selection */}
            {formData.eventName && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('sellTicket.dateTime')} <span className="text-red-500">*</span>
                </label>
                
                {!showAddNewDate ? (
                  <div>
                    <select
                      value={formData.eventDate && formData.eventTime ? `${formData.eventDate}|${formData.eventTime}` : ''}
                      onChange={(e) => {
                        if (e.target.value === 'add-new') {
                          setShowAddNewDate(true);
                        } else if (e.target.value) {
                          const selected = selectedEventDates.find(d => `${d.displayDate}|${d.displayTime}` === e.target.value);
                          if (selected) {
                            handleDateTimeSelect(selected);
                          }
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">{t('sellTicket.selectDateTime')}</option>
                      {selectedEventDates.map((dateInfo) => (
                        <option key={dateInfo.id} value={`${dateInfo.displayDate}|${dateInfo.displayTime}`}>
                          {dateInfo.displayDate} {t('sellTicket.at')} {dateInfo.displayTime}
                        </option>
                      ))}
                      <option value="add-new">+ {t('sellTicket.addNewDateTime')}</option>
                    </select>
                    
                    {formData.eventDate && formData.eventTime && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {formData.eventDate} {t('sellTicket.at')} {formData.eventTime}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <p className="text-sm font-semibold text-gray-700">{t('sellTicket.addNewDateTime')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('sellTicket.date')}</label>
                        <input
                          type="date"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">{t('sellTicket.time')}</label>
                        <input
                          type="time"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddNewDate}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                        disabled={!newDate || !newTime}
                      >
                        <Plus className="w-4 h-4" />
                        {t('sellTicket.addDate')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddNewDate(false);
                          setNewDate('');
                          setNewTime('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
              {formData.quantity > 1 && !formData.sellTogether && (
                <p className="text-sm text-gray-600 mt-2">
                  {t('sellTicket.totalValue')}: ${(formData.pricePerTicket * formData.quantity).toFixed(2)}
                </p>
              )}
              {formData.quantity > 1 && formData.sellTogether && (
                <p className="text-sm text-gray-600 mt-2">
                  {t('sellTicket.bundlePrice')}: ${(formData.pricePerTicket * formData.quantity).toFixed(2)} {t('sellTicket.forAllTickets', { count: formData.quantity })}
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('sellTicket.summary')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('sellTicket.event')}:</span>
                  <span className="font-semibold text-gray-900">
                    {formData.eventName || '-'}
                  </span>
                </div>
                {formData.eventDate && formData.eventTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('sellTicket.dateTime')}:</span>
                    <span className="font-semibold text-gray-900">
                      {formData.eventDate} {t('sellTicket.at')} {formData.eventTime}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('sellTicket.ticketType')}:</span>
                  <span className="font-semibold text-gray-900">{formData.ticketType || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('sellTicket.deliveryMethod')}:</span>
                  <span className="font-semibold text-gray-900">
                    {formData.deliveryMethod === 'digital' ? t('sellTicket.digital') : t('sellTicket.physical')}
                    {formData.deliveryMethod === 'digital' && formData.digitallyTransferable && 
                      ` (${t('sellTicket.transferable')})`}
                    {formData.deliveryMethod === 'physical' && formData.physicalDeliveryMethod === 'pickup' &&
                      ` (${t('sellTicket.pickup')})`}
                    {formData.deliveryMethod === 'physical' && formData.physicalDeliveryMethod === 'arrange' &&
                      ` (${t('sellTicket.arrangeWithBuyerShort')})`}
                  </span>
                </div>
                {formData.physicalDeliveryMethod === 'pickup' && formData.pickupAddress && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('sellTicket.pickupLocation')}:</span>
                    <span className="font-semibold text-gray-900 text-right max-w-xs">{formData.pickupAddress}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('sellTicket.quantity')}:</span>
                  <span className="font-semibold text-gray-900">
                    {formData.quantity} {formData.sellTogether && formData.quantity > 1 
                      ? `(${t('sellTicket.mustBeSoldTogether')})` 
                      : ''}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-600">{t('sellTicket.totalPrice')}:</span>
                  <span className="text-xl font-bold text-blue-600">
                    ${(formData.pricePerTicket * (formData.sellTogether ? formData.quantity : 1)).toFixed(2)}
                  </span>
                </div>
              </div>
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
                className="flex-1 px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Ticket className="w-5 h-5" />
                {t('sellTicket.createListing')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
