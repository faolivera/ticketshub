import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Ticket, DollarSign, Save, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ticketsService } from '../../api/services/tickets.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage, ErrorAlert } from '../components/ErrorMessage';
import type { TicketListingWithEvent } from '../../api/types';
import { TicketUnitStatus } from '../../api/types';

export function EditListing() {
  const { t } = useTranslation();
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();

  const [listing, setListing] = useState<TicketListingWithEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch listing data
  useEffect(() => {
    async function fetchListing() {
      if (!listingId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await ticketsService.getListing(listingId);
        setListing(data);
        setPrice((data.pricePerTicket.amount / 100).toString());
        setDescription(data.description || '');
      } catch (err) {
        console.error('Failed to fetch listing:', err);
        setError(t('editListing.errorLoading'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchListing();
  }, [listingId, t]);

  const handleSave = async () => {
    if (!listingId) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      await ticketsService.updateListing(listingId, {
        pricePerTicket: {
          amount: Math.round(parseFloat(price) * 100),
          currency: listing?.pricePerTicket.currency || 'USD',
        },
        description: description || undefined,
      });
      
      navigate('/my-tickets');
    } catch (err) {
      console.error('Failed to update listing:', err);
      setError(err instanceof Error ? err.message : t('editListing.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!listingId) return;
    
    if (!confirm(t('editListing.confirmCancel'))) {
      return;
    }
    
    setIsCancelling(true);
    setError(null);
    
    try {
      await ticketsService.cancelListing(listingId);
      navigate('/my-tickets');
    } catch (err) {
      console.error('Failed to cancel listing:', err);
      setError(err instanceof Error ? err.message : t('editListing.cancelFailed'));
    } finally {
      setIsCancelling(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <LoadingSpinner 
        size="lg" 
        text={t('common.loading')} 
        fullScreen 
      />
    );
  }

  // Error or not found
  if (!listing) {
    return (
      <ErrorMessage 
        title={error || t('editListing.listingNotFound')}
        message={t('editListing.errorLoading')}
        fullScreen
      />
    );
  }

  const priceValue = parseFloat(price) || 0;
  const isValidPrice = priceValue > 0;
  const eventDate = new Date(listing.eventDate);
  const isActive = listing.status === 'Active';
  const availableUnits = listing.ticketUnits.filter((unit) => unit.status === TicketUnitStatus.Available);
  const numberedSeats = listing.ticketUnits
    .filter((unit) => unit.seat)
    .map((unit) => `${unit.seat!.row}-${unit.seat!.seatNumber}`);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/my-tickets"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('editListing.backToMyTickets')}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t('editListing.title')}</h1>
        </div>

        {/* Error Message */}
        {error && (
          <ErrorAlert message={error} className="mb-6" />
        )}

        {/* Important Disclaimer */}
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">{t('editListing.importantNote')}</span> {t('editListing.changesDisclaimer')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left Column - Ticket Preview */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="relative h-64 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Ticket className="w-24 h-24 text-white opacity-50" />
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-opacity-95 ${
                    isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {isActive ? t('editListing.active') : listing.status}
                </span>
              </div>
            </div>

            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{listing.eventName}</h2>

              {/* Non-editable Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('editListing.ticketType')}
                  </label>
                  <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-md font-medium">
                    <Ticket className="w-4 h-4" />
                    {listing.section || listing.type}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('editListing.eventDateTime')}
                  </label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {eventDate.toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('editListing.venue')}
                  </label>
                  <p className="text-gray-900">{listing.venue}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('editListing.quantity')}
                  </label>
                  <p className="text-gray-900">
                    {availableUnits.length} of {listing.ticketUnits.length} available
                    {listing.sellTogether && ' (sold together)'}
                  </p>
                </div>

                {numberedSeats.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      {t('editListing.seats')}
                    </label>
                    <p className="text-gray-900">{numberedSeats.join(', ')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Editable Fields */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t('editListing.editableFields')}
              </h3>

              <div className="space-y-6">
                {/* Price Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('editListing.listingPrice')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <DollarSign className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                      placeholder="0.00"
                      disabled={!isActive}
                    />
                  </div>
                  {!isValidPrice && price !== '' && (
                    <p className="mt-1 text-sm text-red-600">{t('editListing.enterValidPrice')}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {t('editListing.priceDescription')}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('editListing.description')}
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={t('editListing.descriptionPlaceholder')}
                    disabled={!isActive}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {isActive ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={!isValidPrice || isSaving}
                    className={`w-full py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                      !isValidPrice || isSaving
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    {isSaving ? t('editListing.saving') : t('editListing.saveChanges')}
                  </button>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleCancel}
                      disabled={isCancelling}
                      className="w-full py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isCancelling ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                      {isCancelling ? t('common.loading') : t('editListing.cancelListing')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <EyeOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">
                    {t('editListing.listingInactive')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
