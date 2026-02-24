import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Ticket, MapPin, Calendar, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ticketsService } from '../../api/services/tickets.service';
import { transactionsService } from '../../api/services/transactions.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage, ErrorAlert } from '../components/ErrorMessage';
import type { TicketListingWithEvent } from '../../api/types';
import { TicketUnitStatus } from '../../api/types';
import { useUser } from '../contexts/UserContext';

export function BuyTicketPage() {
  const { t } = useTranslation();
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  
  const [listing, setListing] = useState<TicketListingWithEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Fetch listing details
  useEffect(() => {
    async function fetchListing() {
      if (!ticketId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await ticketsService.getListing(ticketId);
        setListing(data);
      } catch (err) {
        console.error('Failed to fetch listing:', err);
        setError(t('buyTicket.errorLoading'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchListing();
  }, [ticketId, t]);

  const handlePurchase = async () => {
    if (!listing || !ticketId) return;
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      navigate('/register', { state: { from: `/buy/${ticketId}` } });
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const availableUnits = listing.ticketUnits.filter(
        (unit) => unit.status === TicketUnitStatus.Available,
      );
      const selectedUnitIds = listing.sellTogether
        ? availableUnits.map((unit) => unit.id)
        : availableUnits.slice(0, quantity).map((unit) => unit.id);

      const response = await transactionsService.initiatePurchase({
        listingId: ticketId,
        ticketUnitIds: selectedUnitIds,
      });

      // Navigate to the transaction/ticket page
      navigate(`/ticket/${response.transaction.id}`);
    } catch (err) {
      console.error('Purchase failed:', err);
      setPurchaseError(
        err instanceof Error ? err.message : t('buyTicket.purchaseFailed')
      );
    } finally {
      setIsPurchasing(false);
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

  // Error state
  if (error || !listing) {
    return (
      <ErrorMessage 
        title={error || t('buyTicket.ticketNotFound')}
        message={t('buyTicket.errorLoading')}
        fullScreen
      />
    );
  }

  // Calculate pricing
  const pricePerTicket = listing.pricePerTicket.amount / 100;
  const availableUnits = listing.ticketUnits.filter(
    (unit) => unit.status === TicketUnitStatus.Available,
  );
  const selectedQuantity = listing.sellTogether ? availableUnits.length : quantity;
  const total = pricePerTicket * selectedQuantity;
  const serviceFee = total * 0.1; // 10% service fee
  const grandTotal = total + serviceFee;

  // Format event date
  const eventDate = new Date(listing.eventDate);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Get max quantity
  const maxQuantity = Math.min(availableUnits.length, listing.sellTogether ? availableUnits.length : 5);
  const quantityOptions = listing.sellTogether 
    ? [availableUnits.length] // Must buy all if sellTogether
    : Array.from({ length: maxQuantity }, (_, i) => i + 1);

  // Ticket type display
  const ticketTypeDisplay = listing.section || 
    (listing.type === 'Physical' ? 'Physical Ticket' 
      : listing.type === 'DigitalTransferable' ? 'Digital Ticket' 
      : 'Digital (Non-transferable)');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          to={`/event/${listing.eventId}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('buyTicket.backToEvent')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('buyTicket.ticketDetails')}</h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t('buyTicket.event')}</p>
                <p className="text-lg font-semibold text-gray-900">{listing.eventName}</p>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{formattedDate} at {formattedTime}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>{listing.venue}</span>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">{t('buyTicket.ticketType')}</p>
                <p className="text-lg font-semibold text-gray-900">{ticketTypeDisplay}</p>
                {availableUnits.some((unit) => unit.seat) && (
                  <p className="text-sm text-gray-600">
                    Seats: {availableUnits.filter((unit) => unit.seat).map((unit) => `${unit.seat!.row}-${unit.seat!.seatNumber}`).join(', ')}
                  </p>
                )}
              </div>

              {listing.description && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('buyTicket.description')}</p>
                  <p className="text-gray-700">{listing.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 mb-1">{t('buyTicket.seller')}</p>
                <Link 
                  to={`/seller/${listing.sellerId}`}
                  className="text-blue-600 hover:text-blue-700"
                >
                  View Seller Profile
                </Link>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">{t('buyTicket.quantity')}</label>
                {listing.sellTogether ? (
                  <div className="px-4 py-2 bg-gray-100 rounded-lg">
                    <span className="font-semibold">{availableUnits.length}</span>
                    <span className="text-sm text-gray-500 ml-2">(sold together)</span>
                  </div>
                ) : (
                  <select 
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {quantityOptions.map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {availableUnits.length} {t('buyTicket.available')}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('buyTicket.paymentSummary')}</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-700">
                  {t('buyTicket.ticketPrice', { quantity: selectedQuantity })}
                </span>
                <span className="font-semibold text-gray-900">
                  ${total.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-700">{t('buyTicket.serviceFee')}</span>
                <span className="font-semibold text-gray-900">
                  ${serviceFee.toFixed(2)}
                </span>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-between">
                <span className="text-lg font-bold text-gray-900">{t('buyTicket.total')}</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment form placeholder - in production, integrate with payment provider */}
            <div className="mb-6">
              <label className="text-sm text-gray-600 block mb-2">{t('buyTicket.cardNumber')}</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder={t('buyTicket.cardPlaceholder')}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-gray-600 block mb-2">{t('buyTicket.expiryDate')}</label>
                <input 
                  type="text" 
                  placeholder={t('buyTicket.expiryPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">{t('buyTicket.cvv')}</label>
                <input 
                  type="text" 
                  placeholder={t('buyTicket.cvvPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {purchaseError && (
              <ErrorAlert message={purchaseError} className="mb-4" />
            )}

            <button 
              onClick={handlePurchase}
              disabled={isPurchasing || availableUnits.length === 0}
              className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPurchasing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Ticket className="w-5 h-5" />
              )}
              {isPurchasing ? t('buyTicket.processing') : t('buyTicket.completePurchase')}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              {t('buyTicket.securePayment')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
