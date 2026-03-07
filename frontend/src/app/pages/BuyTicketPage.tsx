import React from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ticket, MapPin, Calendar, Loader2, ShieldCheck, Award, Trophy, Phone, Eye, AlertTriangle, MessageCircle, IdCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ticketsService } from '../../api/services/tickets.service';
import { transactionsService } from '../../api/services/transactions.service';
import { offersService } from '../../api/services/offers.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage, ErrorAlert } from '../components/ErrorMessage';
import { UserAvatar } from '../components/UserAvatar';
import { formatCurrencyFromUnits } from '@/lib/format-currency';
import { formatDateTime, formatMonthYear } from '@/lib/format-date';
import type { BuyPageData, BuyPagePaymentMethodOption, Offer } from '../../api/types';
import { SeatingType, TicketUnitStatus, ListingStatus } from '../../api/types';
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

const PENDING_REASON_I18N: Record<string, string> = {
  event: 'sellTicket.pendingEvent',
  date: 'sellTicket.pendingDate',
  section: 'sellTicket.pendingSection',
};

function getPendingReasonI18nKey(reason: string): string | null {
  return PENDING_REASON_I18N[reason.toLowerCase()] ?? null;
}

function isPricingSnapshotError(errorCode: string | undefined): boolean {
  return errorCode?.startsWith('PRICING_SNAPSHOT_') ?? false;
}

export function BuyTicketPage() {
  const { t } = useTranslation();
  const { ticketId } = useParams<{ ticketId: string }>();
  const [searchParams] = useSearchParams();
  const offerIdFromUrl = searchParams.get('offerId');
  const navigate = useNavigate();
  const { isAuthenticated, user } = useUser();

  const [buyPageData, setBuyPageData] = useState<BuyPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<BuyPagePaymentMethodOption | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  /** When user has an accepted offer for this listing, we show "Complete purchase" at offer price */
  const [acceptedOffer, setAcceptedOffer] = useState<Offer | null>(null);
  /** Pending offer for this listing (waiting for seller); restored on load or set after submit */
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  /** Make offer flow */
  const [offerPriceCents, setOfferPriceCents] = useState<number>(0);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  const listing = buyPageData?.listing ?? null;
  const seller = buyPageData?.seller ?? null;
  const paymentMethods = buyPageData?.paymentMethods ?? [];
  const pricingSnapshot = buyPageData?.pricingSnapshot ?? null;
  const checkoutRisk = buyPageData?.checkoutRisk;

  /** Purchase blocked when risk engine requires V1/V2/V3 and user has not completed them */
  const needsV1 = checkoutRisk?.requireV1 && !user?.emailVerified;
  const needsV2 = checkoutRisk?.requireV2 && !user?.phoneVerified;
  const needsV3 = checkoutRisk?.requireV3 && !user?.identityVerified;
  const cannotPurchaseDueToVerification = isAuthenticated && (needsV1 || needsV2 || needsV3);

  const isOwnListing = user?.id === listing?.sellerId;
  const isPendingOwnListing = isOwnListing && listing?.status === ListingStatus.Pending;
  const pendingReasonI18nKeys =
    listing?.status === ListingStatus.Pending && listing?.pendingReason
      ? listing.pendingReason
          .map((r) => getPendingReasonI18nKey(r))
          .filter((key): key is string => key != null)
      : [];
  const hasSpecificPendingReasons = pendingReasonI18nKeys.length > 0;

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

  // Resolve my offer for this listing: accepted (complete purchase) or pending (waiting for seller).
  // When URL has offerId, prefer that accepted offer; otherwise fetch my offers and detect state on load/refresh.
  useEffect(() => {
    if (!ticketId || !isAuthenticated || !listing) return;
    let cancelled = false;
    (async () => {
      try {
        const offers = await offersService.listMyOffers();
        const forListing = offers.filter((o) => o.listingId === ticketId);
        const accepted = offerIdFromUrl
          ? forListing.find((o) => o.id === offerIdFromUrl && o.status === 'accepted')
          : forListing.find((o) => o.status === 'accepted');
        const pending = forListing.find((o) => o.status === 'pending');
        if (!cancelled) {
          setAcceptedOffer(accepted ?? null);
          setPendingOffer(pending ?? null);
        }
      } catch {
        if (!cancelled) {
          setAcceptedOffer(null);
          setPendingOffer(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [offerIdFromUrl, ticketId, isAuthenticated, listing?.id]);

  // When we have an accepted offer, sync quantity and selectedUnitIds to the offer's selection
  // so the UI shows exactly what was agreed (disabled controls display the offer's choice).
  useEffect(() => {
    if (!acceptedOffer || !listing) return;
    if (acceptedOffer.tickets.type === 'unnumbered') {
      setQuantity(acceptedOffer.tickets.count);
      setSelectedUnitIds([]);
    } else {
      const offerSeats = acceptedOffer.tickets.seats;
      const ids = offerSeats
        .map((seat) =>
          availableUnits.find(
            (u) => u.seat?.row === seat.row && u.seat?.seatNumber === seat.seatNumber
          )?.id
        )
        .filter((id): id is string => id != null);
      setSelectedUnitIds(ids);
    }
  }, [acceptedOffer, listing?.id]);

  const toggleSeatSelection = (unitId: string) => {
    if (listing?.sellTogether) return;

    setSelectedUnitIds((current) =>
      current.includes(unitId) ? current.filter((id) => id !== unitId) : [...current, unitId]
    );
  };

  const refreshBuyPageData = async () => {
    if (!ticketId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await ticketsService.getBuyPage(ticketId);
      setBuyPageData(data);
      if (data.paymentMethods.length > 0) {
        setSelectedPaymentMethod(data.paymentMethods[0]);
      }
    } catch (err) {
      console.error('Failed to refresh buy page:', err);
      setError(t('buyTicket.errorLoading'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!listing || !ticketId) return;
    const useOffer = acceptedOffer != null;
    if (!useOffer && !pricingSnapshot) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/buy/${ticketId}` } });
      return;
    }

    if (!user?.phoneVerified) {
      setPurchaseError(t('buyTicket.phoneRequiredToPurchase'));
      return;
    }
    if (checkoutRisk?.requireV3 && !user?.identityVerified) {
      setPurchaseError(t('buyTicket.identityRequiredToPurchase'));
      return;
    }

    setIsPurchasing(true);
    setPurchaseError(null);

    try {
      if (useOffer) {
        const response = await transactionsService.initiatePurchase({
          listingId: ticketId,
          paymentMethodId: selectedPaymentMethod?.id ?? 'payway',
          offerId: acceptedOffer.id,
        });
        navigate(`/transaction/${response.transaction.id}`, { state: { from: '/my-tickets' } });
        return;
      }

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
        pricingSnapshotId: pricingSnapshot!.id,
      });

      navigate(`/transaction/${response.transaction.id}`, { state: { from: '/my-tickets' } });
    } catch (err: unknown) {
      console.error('Purchase failed:', err);
      
      const errorCode = (err as { code?: string })?.code;
      if (isPricingSnapshotError(errorCode)) {
        setPurchaseError(t('buyTicket.pricesChanged'));
        await refreshBuyPageData();
      } else {
        setPurchaseError(
          err instanceof Error ? err.message : t('buyTicket.purchaseFailed')
        );
      }
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

  // Calculate pricing (use listing currency throughout purchase flow)
  const listingCurrency = listing.pricePerTicket.currency;
  const pricePerTicket = (acceptedOffer ? acceptedOffer.offeredPrice.amount : listing.pricePerTicket.amount) / 100;
  const selectedQuantity = acceptedOffer
    ? (acceptedOffer.tickets.type === 'numbered' ? acceptedOffer.tickets.seats.length : acceptedOffer.tickets.count)
    : listing.sellTogether
      ? availableUnits.length
      : isNumberedListing
        ? selectedUnitIds.length
        : quantity;
  const subtotal = pricePerTicket * selectedQuantity;
  const serviceFeePercent = selectedPaymentMethod?.serviceFeePercent ?? 0;
  const servicePrice = subtotal * (serviceFeePercent / 100);
  const grandTotal = subtotal + servicePrice;

  const handleSubmitOffer = async () => {
    if (!ticketId || !listing?.bestOfferConfig?.enabled || !user) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/buy/${ticketId}` } });
      return;
    }
    const minCents = listing.bestOfferConfig.minimumPrice.amount ?? 0;
    if (offerPriceCents < minCents) {
      setOfferError(t('buyTicket.offerBelowMinimum'));
      return;
    }
    const ticketsPayload = listing.seatingType === SeatingType.Numbered
      ? { type: 'numbered' as const, seats: selectedUnitIds.map((id) => {
          const u = availableUnits.find((x) => x.id === id);
          return u?.seat ? { row: u.seat.row, seatNumber: u.seat.seatNumber } : null;
        }).filter((s): s is { row: string; seatNumber: string } => s != null) }
      : { type: 'unnumbered' as const, count: quantity };
    if (ticketsPayload.type === 'numbered' && ticketsPayload.seats.length === 0) {
      setOfferError(t('buyTicket.selectAtLeastOneSeat'));
      return;
    }
    if (ticketsPayload.type === 'unnumbered' && ticketsPayload.count < 1) {
      setOfferError(t('buyTicket.selectAtLeastOneSeat'));
      return;
    }
    setIsSubmittingOffer(true);
    setOfferError(null);
    try {
      const created = await offersService.create({
        listingId: ticketId,
        offeredPrice: { amount: offerPriceCents, currency: listing.pricePerTicket.currency },
        tickets: ticketsPayload,
      });
      setPendingOffer(created);
    } catch (err: unknown) {
      setOfferError(err instanceof Error ? err.message : t('buyTicket.offerSubmitFailed'));
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const eventDateTimeFormatted = formatDateTime(listing.eventDate);

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
    (listing.type === 'Physical' ? 'Physical Ticket' : 'Digital Ticket');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {isOwnListing && listing && (
          <>
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
            {isPendingOwnListing && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">{t('sellTicket.pendingListingWarningTitle')}</p>
                    <p className="mb-2">
                      {hasSpecificPendingReasons
                        ? t('sellTicket.pendingListingWarningDescSpecific')
                        : t('sellTicket.pendingListingWarningDesc')}
                    </p>
                    {hasSpecificPendingReasons && (
                      <ul className="list-disc list-inside space-y-1">
                        {pendingReasonI18nKeys.map((key) => (
                          <li key={key}>{t(key)}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <Link
          to={isOwnListing ? '/seller-dashboard?tab=listed' : `/event/${listing.eventId}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {isOwnListing ? t('buyTicket.backToMyListings') : t('buyTicket.backToEvent')}
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
                    {eventDateTimeFormatted}
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
                        disabled={!!acceptedOffer}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${acceptedOffer ? 'opacity-70 cursor-not-allowed bg-gray-50' : ''}`}
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
                        const selectionDisabled = listing.sellTogether || !!acceptedOffer;
                        return (
                          <button
                            key={unit.id}
                            type="button"
                            onClick={() => toggleSeatSelection(unit.id)}
                            disabled={selectionDisabled}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                            } ${selectionDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
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

            {/* Seller (moved from right column) */}
            {seller && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('buyTicket.seller')}</h2>
                <Link
                  to={`/seller/${seller.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-gray-50 transition-colors"
                >
                  <UserAvatar name={seller.publicName} src={seller.pic?.src} className="h-12 w-12" />
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
                    <p className="text-xs text-gray-500 mt-1">
                      {t('buyTicket.sellerMemberSince', {
                        date: formatMonthYear(seller.memberSince, true),
                      })}
                    </p>
                  </div>
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Make an offer / Pending offer (when seller enabled best offer; not for own listing) */}
            {listing.bestOfferConfig?.enabled && !isOwnListing && (
              <div className="bg-white rounded-lg shadow-md p-6 border-2 border-dashed border-amber-200">
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-amber-600" />
                  {t('buyTicket.makeOffer')}
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  {t('buyTicket.makeOfferDescription')}
                </p>
                {acceptedOffer ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-800">{t('buyTicket.acceptedOfferComplete')}</p>
                    <p className="text-xs text-green-700 mt-1">{t('buyTicket.acceptedOfferExpires')}</p>
                  </div>
                ) : pendingOffer ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-800">{t('buyTicket.offerSubmitted')}</p>
                    <Link to="/my-tickets?tab=offers" className="text-sm text-green-700 underline mt-1 inline-block">
                      {t('buyTicket.viewMyOffers')}
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="text-sm text-gray-600 block mb-1">
                        {t('buyTicket.yourOfferPrice')} ({listingCurrency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={(listing.pricePerTicket.amount ?? 0) / 100}
                        step="0.01"
                        value={offerPriceCents === 0 ? '' : offerPriceCents / 100}
                        onChange={(e) => {
                          const v = e.target.value;
                          setOfferPriceCents(v === '' ? 0 : Math.round(parseFloat(v) * 100));
                        }}
                        placeholder="—"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    {offerError && <ErrorAlert message={offerError} className="mb-4" />}
                    <button
                      type="button"
                      onClick={handleSubmitOffer}
                      disabled={isSubmittingOffer || !isAuthenticated}
                      className="w-full py-3 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingOffer ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                      {isSubmittingOffer ? t('common.loading') : t('buyTicket.submitOffer')}
                    </button>
                    {!isAuthenticated && (
                      <p className="text-xs text-amber-700 mt-2">
                        {t('buyTicket.loginToOffer')}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('buyTicket.paymentSummary')}
              </h2>

            <div className="space-y-3 mb-6">
              {/* Precio por entradas */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('myTicket.ticketPriceTotal')}</span>
                <span className="text-gray-900">
                  {formatCurrencyFromUnits(subtotal, listingCurrency)}
                </span>
              </div>
              {/* Detalle: precio por unidad × cantidad y asientos si aplica */}
              <div className="text-xs text-gray-500 pl-0">
                {acceptedOffer ? (
                  <>
                    <div className="line-through">
                      {t('myTicket.pricePerUnitDetail', {
                        price: formatCurrencyFromUnits(
                          (listing.pricePerTicket.amount ?? 0) / 100,
                          listingCurrency,
                        ),
                        quantity: selectedQuantity,
                      })}
                    </div>
                    <div>
                      {t('myTicket.pricePerUnitDetail', {
                        price: formatCurrencyFromUnits(pricePerTicket, listingCurrency),
                        quantity: selectedQuantity,
                      })}{' '}
                      ({t('buyTicket.offeredPrice')})
                    </div>
                  </>
                ) : (
                  <span>
                    {t('myTicket.pricePerUnitDetail', {
                      price: formatCurrencyFromUnits(pricePerTicket, listingCurrency),
                      quantity: selectedQuantity,
                    })}
                  </span>
                )}
                {isNumberedListing && (() => {
                  const seats =
                    acceptedOffer && acceptedOffer.tickets.type === 'numbered'
                      ? acceptedOffer.tickets.seats.map((s) => `${s.row}-${s.seatNumber}`)
                      : selectedUnitIds
                          .map((id) => availableUnits.find((u) => u.id === id)?.seat)
                          .filter((s): s is { row: string; seatNumber: string } => s != null)
                          .map((s) => `${s.row}-${s.seatNumber}`);
                  return seats.length > 0 ? (
                    <div className="mt-1">
                      {t('myTicket.seatDetail')}: {seats.join(', ')}
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Precio por servicio */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('myTicket.servicePrice')}</span>
                <span className="text-gray-900">
                  {formatCurrencyFromUnits(servicePrice, listingCurrency)}
                </span>
              </div>

              <div className="border-t pt-3 flex justify-between font-semibold">
                <span className="text-gray-900">{t('buyTicket.total')}</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrencyFromUnits(grandTotal, listingCurrency)}
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
                          {t('buyTicket.serviceFeePercent', {
                            percent: method.serviceFeePercent,
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {needsV1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="font-semibold text-amber-800 mb-1">{t('buyTicket.emailVerificationRequired')}</p>
                <p className="text-sm text-amber-700">{t('buyTicket.verifyEmailToPurchase')}</p>
              </div>
            )}
            {needsV2 && !needsV3 && (
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
            {needsV3 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <IdCard className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-800 mb-1">
                      {t('buyTicket.identityRequired')}
                    </p>
                    <p className="text-sm text-amber-700 mb-3">
                      {t('buyTicket.identityRequiredDescription')}
                    </p>
                    <Link
                      to="/verify-user"
                      state={{
                        verifyPhone: needsV2,
                        verifyIdentity: true,
                        returnTo: `/buy/${ticketId}`,
                      }}
                      className="inline-block px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      {t('buyTicket.verifyIdentityNow')}
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
                (acceptedOffer ? !selectedPaymentMethod : (availableUnits.length === 0 || selectedQuantity === 0 || !pricingSnapshot)) ||
                isOwnListing ||
                cannotPurchaseDueToVerification
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
