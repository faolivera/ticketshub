import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ticket, MapPin, Calendar, Loader2, ShieldCheck, Award, Trophy, Phone, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ticketsService } from '../../api/services/tickets.service';
import { transactionsService } from '../../api/services/transactions.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage, ErrorAlert } from '../components/ErrorMessage';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import type { BuyPageData, PaymentMethodOption } from '../../api/types';
import { SeatingType, TicketUnitStatus } from '../../api/types';
import { useUser } from '../contexts/UserContext';

function getBadgeIcon(badge: string) {
  const b = badge.toLowerCase();
  if (b === 'trusted') return <ShieldCheck className="w-4 h-4" />;
  if (b === 'verified') return <Award className="w-4 h-4" />;
  if (b === 'best_seller') return <Trophy className="w-4 h-4" />;
  return null;
}

function getBadgeColor(badge: string) {
  const b = badge.toLowerCase();
  if (b === 'trusted') return 'bg-blue-100 text-blue-700';
  if (b === 'verified') return 'bg-green-100 text-green-700';
  if (b === 'best_seller') return 'bg-purple-100 text-purple-700';
  return 'bg-gray-100 text-gray-700';
}

function getBadgeLabel(badge: string, t: (key: string) => string) {
  const b = badge.toLowerCase();
  if (b === 'trusted') return t('eventTickets.badgeTrusted');
  if (b === 'verified') return t('eventTickets.badgeVerified');
  if (b === 'best_seller') return t('eventTickets.badgeBestSeller');
  return badge;
}

export function BuyTicketPage() {
  const { t } = useTranslation();
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, canBuy } = useUser();

  const [buyPageData, setBuyPageData] = useState<BuyPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodOption | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const listing = buyPageData?.listing ?? null;
  const seller = buyPageData?.seller ?? null;
  const paymentMethods = buyPageData?.paymentMethods ?? [];

  const isOwnListing = user?.id === listing?.sellerId;

  // Fetch buy page data from BFF
  useEffect(() => {
    async function fetchBuyPage() {
      if (!ticketId) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await ticketsService.getBuyPage(ticketId);
        setBuyPageData(data);
        if (data.paymentMethods.length > 0) {
          setSelectedPaymentMethod(data.paymentMethods[0]);
        } else {
          setSelectedPaymentMethod(null);
        }
      } catch (err) {
        console.error('Failed to fetch buy page:', err);
        setError(t('buyTicket.errorLoading'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchBuyPage();
  }, [ticketId, t]);

  const availableUnits =
    listing?.ticketUnits.filter((unit) => unit.status === TicketUnitStatus.Available) ?? [];
  const numberedUnits = availableUnits.filter((unit) => unit.seat);
  const isNumberedListing = listing?.seatingType === SeatingType.Numbered;
  const availableIds = availableUnits.map((u) => u.id).join(',');
  const availableCount = availableUnits.length;

  useEffect(() => {
    if (!listing) return;

    const ids = availableIds ? availableIds.split(',') : [];

    if (listing.sellTogether) {
      setSelectedUnitIds(ids);
      return;
    }

    if (!isNumberedListing) {
      setSelectedUnitIds([]);
      setQuantity((current) =>
        Math.min(Math.max(current, 1), Math.max(availableCount, 1))
      );
      return;
    }

    // Numbered listing, not sellTogether: preselect if only one available
    if (availableCount === 1 && ids[0]) {
      setSelectedUnitIds([ids[0]]);
    } else {
      setSelectedUnitIds([]);
    }
  }, [listing, isNumberedListing, listing?.sellTogether, availableIds, availableCount]);

  const toggleSeatSelection = (unitId: string) => {
    if (listing?.sellTogether) return;

    setSelectedUnitIds((current) =>
      current.includes(unitId) ? current.filter((id) => id !== unitId) : [...current, unitId]
    );
  };

  const handlePurchase = async () => {
    if (!listing || !ticketId) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/buy/${ticketId}` } });
      return;
    }

    if (!user?.phoneVerified) {
      setPurchaseError(t('buyTicket.phoneRequiredToPurchase'));
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      const unitsToPurchase = listing.sellTogether
        ? availableUnits.map((unit) => unit.id)
        : isNumberedListing
          ? selectedUnitIds
          : availableUnits.slice(0, quantity).map((unit) => unit.id);

      if (!unitsToPurchase.length) {
        setPurchaseError(t('buyTicket.selectAtLeastOneSeat'));
        setIsPurchasing(false);
        return;
      }

      const response = await transactionsService.initiatePurchase({
        listingId: ticketId,
        ticketUnitIds: unitsToPurchase,
        paymentMethodId: selectedPaymentMethod?.id ?? 'payway',
      });

      navigate(`/transaction/${response.transaction.id}`);
    } catch (err) {
      console.error('Purchase failed:', err);
      setPurchaseError(
        err instanceof Error ? err.message : t('buyTicket.purchaseFailed')
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <LoadingSpinner size="lg" text={t('common.loading')} fullScreen />
    );
  }

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
  const selectedQuantity = listing.sellTogether
    ? availableUnits.length
    : isNumberedListing
      ? selectedUnitIds.length
      : quantity;
  const subtotal = pricePerTicket * selectedQuantity;
  const commissionPercent = selectedPaymentMethod?.commissionPercent ?? 0;
  const buyerFee = subtotal * (commissionPercent / 100);
  const grandTotal = subtotal + buyerFee;

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

  const maxQuantity = availableUnits.length;
  const quantityOptions = listing.sellTogether
    ? [availableUnits.length]
    : Array.from({ length: maxQuantity }, (_, i) => i + 1);

  const sortedNumberedUnits = [...numberedUnits].sort((a, b) => {
    const rowCompare = (a.seat?.row ?? '').localeCompare(b.seat?.row ?? '');
    if (rowCompare !== 0) return rowCompare;
    return (a.seat?.seatNumber ?? '').localeCompare(b.seat?.seatNumber ?? '', undefined, {
      numeric: true,
    });
  });

  const ticketTypeDisplay =
    listing.sectionName ||
    (listing.type === 'Physical'
      ? 'Physical Ticket'
      : listing.type === 'DigitalTransferable'
        ? 'Digital Ticket'
        : 'Digital (Non-transferable)');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isOwnListing && listing && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 mb-1">
                  {t('buyTicket.ownListingPreview')}
                </p>
                <p className="text-sm text-amber-700">
                  {t('buyTicket.ownListingPreviewDescription')}
                </p>
              </div>
            </div>
          </div>
        )}

        <Link
          to={`/event/${listing.eventId}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('buyTicket.backToEvent')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('buyTicket.ticketDetails')}
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{t('buyTicket.event')}</p>
                  <p className="text-lg font-semibold text-gray-900">{listing.eventName}</p>
                </div>

                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>
                    {formattedDate} at {formattedTime}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span>{listing.venue}</span>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">{t('buyTicket.ticketType')}</p>
                  <p className="text-lg font-semibold text-gray-900">{ticketTypeDisplay}</p>
                  {isNumberedListing && (
                    <p className="text-sm text-gray-600">
                      {t('buyTicket.numberedTicketsAvailable')}
                    </p>
                  )}
                </div>

                {listing.description && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{t('buyTicket.description')}</p>
                    <p className="text-gray-700">{listing.description}</p>
                  </div>
                )}

                {!isNumberedListing ? (
                  <div>
                    <label className="text-sm text-gray-600 block mb-2">
                      {t('buyTicket.quantity')}
                    </label>
                    {listing.sellTogether ? (
                      <div className="px-4 py-2 bg-gray-100 rounded-lg">
                        <span className="font-semibold">{availableUnits.length}</span>
                      </div>
                    ) : (
                      <select
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {quantityOptions.map((num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {listing.sellTogether
                        ? t('buyTicket.sellTogetherSeatHint')
                        : `${availableUnits.length} ${t('buyTicket.available')}`}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm text-gray-600 block mb-2">
                      {t('buyTicket.selectSeats')}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {sortedNumberedUnits.map((unit) => {
                        const isSelected = selectedUnitIds.includes(unit.id);
                        return (
                          <button
                            key={unit.id}
                            type="button"
                            onClick={() => toggleSeatSelection(unit.id)}
                            disabled={listing.sellTogether}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                            } ${listing.sellTogether ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            {unit.seat?.row}-{unit.seat?.seatNumber}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {listing.sellTogether
                        ? t('buyTicket.sellTogetherSeatHint')
                        : t('buyTicket.seatsSelected', { count: selectedUnitIds.length })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {seller && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('buyTicket.seller')}</h2>
                <Link
                  to={`/seller/${seller.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-gray-50 transition-colors"
                >
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={seller.pic.src} alt={seller.publicName} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                      {seller.publicName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{seller.publicName}</p>
                    {seller.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {seller.badges.map((badge) => (
                          <span
                            key={badge}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${getBadgeColor(badge)}`}
                          >
                            {getBadgeIcon(badge) ?? null}
                            {getBadgeLabel(badge, t)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <span>{t('buyTicket.sellerTotalSales', { count: seller.totalSales })}</span>
                      {seller.totalReviews > 0 ? (
                        <span>
                          {seller.percentPositiveReviews != null
                            ? t('buyTicket.sellerReviews', {
                                percent: seller.percentPositiveReviews,
                                total: seller.totalReviews,
                              })
                            : t('buyTicket.sellerReviewsCount', {
                                total: seller.totalReviews,
                              })}
                        </span>
                      ) : (
                        <span>{t('eventTickets.noReviewsYet')}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('buyTicket.paymentSummary')}
              </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-700">
                  {t('buyTicket.ticketPrice', { quantity: selectedQuantity })}
                </span>
                <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-700">
                  {selectedPaymentMethod?.commissionPercent != null
                    ? t('buyTicket.buyerFee', {
                        percent: selectedPaymentMethod.commissionPercent,
                      })
                    : t('buyTicket.buyerFeeManual')}
                </span>
                <span className="font-semibold text-gray-900">${buyerFee.toFixed(2)}</span>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-between">
                <span className="text-lg font-bold text-gray-900">{t('buyTicket.total')}</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment method selection */}
            {paymentMethods.length > 0 && (
              <div className="mb-6">
                <label className="text-sm text-gray-600 block mb-3">
                  {t('buyTicket.paymentMethod')}
                </label>
                <div className="space-y-2">
                  {paymentMethods.map((method) => {
                    const isSelected = selectedPaymentMethod?.id === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(method)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                            : 'border-gray-300 hover:border-gray-400 bg-white'
                        }`}
                      >
                        <span className="font-medium text-gray-900">{method.name}</span>
                        <span className="text-sm text-gray-500">
                          {method.commissionPercent != null
                            ? t('buyTicket.commissionPercent', {
                                percent: method.commissionPercent,
                              })
                            : t('buyTicket.manualApproval')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isAuthenticated && !canBuy() && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-800 mb-1">
                      {t('buyTicket.phoneRequired')}
                    </p>
                    <p className="text-sm text-yellow-700 mb-3">
                      {t('buyTicket.phoneRequiredDescription')}
                    </p>
                    <Link
                      to="/phone-verification"
                      state={{ returnTo: `/buy/${ticketId}` }}
                      className="inline-block px-4 py-2 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      {t('buyTicket.verifyPhoneNow')}
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {purchaseError && (
              <ErrorAlert message={purchaseError} className="mb-4" />
            )}

            <button
              onClick={handlePurchase}
              disabled={
                isPurchasing ||
                availableUnits.length === 0 ||
                selectedQuantity === 0 ||
                isOwnListing ||
                (isAuthenticated && !canBuy())
              }
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
    </div>
  );
}
