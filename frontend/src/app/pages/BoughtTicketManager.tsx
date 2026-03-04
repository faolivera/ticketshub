import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ticket, CheckCircle, Clock, Calendar, User, DollarSign, Edit, AlertCircle, Eye, Link as LinkIcon, MessageCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ticketsService } from '../../api/services/tickets.service';
import { offersService } from '../../api/services/offers.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { EventBanner, useEventBannerVariant } from '../components/EventBanner';
import type { TransactionWithDetails, TicketListingWithEvent, Offer, OfferWithListingSummary, OfferWithReceivedContext } from '../../api/types';
import { TicketUnitStatus, RequiredActor, TransactionStatus } from '../../api/types';
import { useUser } from '../contexts/UserContext';
import { SellerUnverifiedModalTrigger } from '../components/SellerUnverifiedModalTrigger';
import { BRAND_NAME } from '../../constants/brand';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate } from '@/lib/format-date';

type MyTicketsTab = 'tickets' | 'offers';
type SellerDashboardTab = 'listed' | 'sold' | 'received';

const MY_TICKETS_TABS: MyTicketsTab[] = ['tickets', 'offers'];
const SELLER_DASHBOARD_TABS: SellerDashboardTab[] = ['listed', 'sold', 'received'];

function isValidMyTicketsTab(tab: string | null): tab is MyTicketsTab {
  return tab !== null && MY_TICKETS_TABS.includes(tab as MyTicketsTab);
}

function isValidSellerDashboardTab(tab: string | null): tab is SellerDashboardTab {
  return tab !== null && SELLER_DASHBOARD_TABS.includes(tab as SellerDashboardTab);
}

/**
 * Terminal statuses - transactions that are "completed" (no more actions needed)
 */
const TERMINAL_STATUSES: TransactionStatus[] = [
  TransactionStatus.Completed,
  TransactionStatus.Cancelled,
  TransactionStatus.Refunded,
];

/**
 * Get the "waiting for" label based on requiredActor
 */
function getWaitingForLabel(
  requiredActor: RequiredActor,
  t: (key: string, options?: Record<string, string>) => string
): string {
  switch (requiredActor) {
    case RequiredActor.Buyer:
      return t('boughtTickets.waitingForBuyer');
    case RequiredActor.Seller:
      return t('boughtTickets.waitingForSeller');
    case RequiredActor.Platform:
      return t('boughtTickets.waitingForPlatform', { brand: BRAND_NAME });
    default:
      return '';
  }
}

/**
 * Determine if the current user is the required actor for a transaction
 */
function isUserRequiredActor(
  transaction: TransactionWithDetails,
  userId: string | undefined,
  activeTab: 'bought' | 'sold'
): boolean {
  if (!userId) return false;

  const isBuyer = transaction.buyerId === userId;
  const isSeller = transaction.sellerId === userId;

  switch (transaction.requiredActor) {
    case RequiredActor.Buyer:
      return activeTab === 'bought' && isBuyer;
    case RequiredActor.Seller:
      return activeTab === 'sold' && isSeller;
    default:
      return false;
  }
}

/**
 * Map API transaction status to display info
 */
function getTransactionStatusInfo(
  status: TransactionStatus,
  t: (key: string) => string,
  isSellerView: boolean = false
) {
  switch (status) {
    case 'PendingPayment':
      return {
        label: t('boughtTickets.pendingPayment'),
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock
      };
    case 'PaymentPendingVerification':
      return {
        label: t(isSellerView ? 'myTicket.statusPaymentPendingVerificationSeller' : 'myTicket.statusPaymentPendingVerificationBuyer'),
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock
      };
    case 'PaymentReceived':
      return {
        label: t('boughtTickets.pending'),
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock
      };
    case 'TicketTransferred':
      return {
        label: t('boughtTickets.transferConfirmed'),
        color: 'bg-blue-100 text-blue-800',
        icon: Clock
      };
    case 'Completed':
      return {
        label: t('boughtTickets.completed'),
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle
      };
    case 'Disputed':
      return {
        label: t('boughtTickets.disputed'),
        color: 'bg-red-100 text-red-800',
        icon: AlertCircle
      };
    case 'Refunded':
      return {
        label: t('boughtTickets.refunded'),
        color: 'bg-gray-100 text-gray-800',
        icon: CheckCircle
      };
    case 'Cancelled':
      return {
        label: t('boughtTickets.cancelled'),
        color: 'bg-gray-100 text-gray-800',
        icon: CheckCircle
      };
    default:
      return {
        label: status,
        color: 'bg-gray-100 text-gray-800',
        icon: Clock
      };
  }
}

/**
 * Map listing status to display info
 */
function getListedStatusInfo(status: string, t: (key: string) => string) {
  switch (status) {
    case 'Active':
      return {
        label: t('boughtTickets.activeListing'),
        color: 'bg-green-100 text-green-800',
        icon: CheckCircle
      };
    case 'Sold':
      return {
        label: t('boughtTickets.sold'),
        color: 'bg-gray-100 text-gray-800',
        icon: CheckCircle
      };
    case 'Cancelled':
      return {
        label: t('boughtTickets.cancelled'),
        color: 'bg-gray-100 text-gray-800',
        icon: Clock
      };
    case 'Expired':
      return {
        label: t('boughtTickets.expired'),
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock
      };
    default:
      return {
        label: status,
        color: 'bg-gray-100 text-gray-800',
        icon: Clock
      };
  }
}

interface TransactionCardProps {
  transaction: TransactionWithDetails;
  userId: string | undefined;
  showWaitingFor: boolean;
  activeTab: 'bought' | 'sold';
  t: (key: string, options?: Record<string, string>) => string;
}

function TransactionCard({ transaction, userId, showWaitingFor, activeTab, t }: TransactionCardProps) {
  const statusInfo = getTransactionStatusInfo(transaction.status, t, activeTab === 'sold');
  const StatusIcon = statusInfo.icon;
  const eventDate = new Date(transaction.eventDate);
  const isSellerRole = transaction.sellerId === userId;
  const counterparty = isSellerRole ? transaction.buyerName : transaction.sellerName;
  const waitingForLabel = showWaitingFor ? getWaitingForLabel(transaction.requiredActor, t) : '';
  const bannerVariant = useEventBannerVariant();

  const fromUrl = activeTab === 'bought' ? '/my-tickets' : '/seller-dashboard?tab=sold';
  return (
    <Link
      to={`/transaction/${transaction.id}`}
      state={{ from: fromUrl }}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Event Image */}
      <div className="relative h-48">
        <EventBanner
          variant={bannerVariant}
          squareUrl={transaction.bannerUrls?.square}
          rectangleUrl={transaction.bannerUrls?.rectangle}
          alt={transaction.eventName}
          className="h-full"
        />
        {/* Status Badge */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.color} backdrop-blur-sm bg-opacity-95`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </span>
          {showWaitingFor && waitingForLabel && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/90 text-gray-700 backdrop-blur-sm">
              <Clock className="w-3 h-3" />
              {waitingForLabel}
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Event Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          {transaction.eventName}
        </h3>

        {/* Ticket Type */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium mb-3">
          <Ticket className="w-3.5 h-3.5" />
          {transaction.ticketType}
        </div>

        {/* Date and Time */}
        <div className="flex items-center gap-2 text-gray-600 mb-3">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">
            {formatDate(eventDate)}
          </span>
        </div>

        {/* Seller/Buyer Info */}
        <div className="flex items-center gap-2 text-gray-600 pt-3 border-t border-gray-100">
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">
            {isSellerRole ? t('boughtTickets.to') : t('boughtTickets.soldBy')}{' '}
            <span className="font-medium text-gray-900">{counterparty}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function getOfferStatusInfo(
  status: Offer['status'],
  t: (key: string) => string
): { label: string; color: string; icon: typeof Clock } {
  switch (status) {
    case 'accepted':
      return { label: t('boughtTickets.offerStatusAccepted'), color: 'bg-green-100 text-green-800', icon: CheckCircle };
    case 'pending':
      return { label: t('boughtTickets.offerStatusPending'), color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    case 'rejected':
      return { label: t('boughtTickets.offerStatusRejected'), color: 'bg-red-100 text-red-800', icon: AlertCircle };
    case 'converted':
      return { label: t('boughtTickets.offerStatusConverted'), color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
    case 'cancelled':
      return { label: t('boughtTickets.offerStatusCancelled'), color: 'bg-gray-100 text-gray-700', icon: Clock };
    default:
      return { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
  }
}

interface OfferCardProps {
  offer: OfferWithListingSummary;
  t: (key: string, options?: Record<string, string>) => string;
}

/** Offer card with celeste accent so it’s visually distinct from transaction (ticket) cards */
function OfferCard({ offer, t }: OfferCardProps) {
  const bannerVariant = useEventBannerVariant();
  const statusInfo = getOfferStatusInfo(offer.status, t);
  const StatusIcon = statusInfo.icon;
  const summary = offer.listingSummary;
  const eventDate = new Date(summary.eventDate);
  const ticketLabel =
    offer.tickets.type === 'numbered'
      ? `${offer.tickets.seats.length} ${offer.tickets.seats.length === 1 ? t('boughtTickets.seat') : t('boughtTickets.seats')}`
      : `${offer.tickets.count} ${offer.tickets.count === 1 ? t('boughtTickets.ticket') : t('boughtTickets.tickets')}`;

  const content = (
    <>
      <div className="relative h-48">
        <EventBanner
          variant={bannerVariant}
          squareUrl={summary.bannerUrls?.square}
          rectangleUrl={summary.bannerUrls?.rectangle}
          alt={summary.eventName}
          className="h-full"
        />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-cyan-100 text-cyan-800 backdrop-blur-sm">
            {t('boughtTickets.offerLabel')}
          </span>
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.color} backdrop-blur-sm bg-opacity-95`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{summary.eventName}</h3>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-md text-sm font-medium mb-3">
          <Ticket className="w-3.5 h-3.5" />
          {ticketLabel}
        </div>
        <div className="flex items-center gap-2 text-gray-600 mb-3">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{formatDate(eventDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 mb-3">
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">
            {t('boughtTickets.soldBy')} <span className="font-medium text-gray-900">{summary.sellerName}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-900 pt-3 border-t border-gray-100">
          <DollarSign className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold">
            {formatCurrency(offer.offeredPrice.amount, offer.offeredPrice.currency)} / {t('boughtTickets.perTicket')}
          </span>
        </div>
        {offer.status === 'accepted' && (
          <Link
            to={`/buy/${offer.listingId}?offerId=${offer.id}`}
            className="mt-4 block w-full py-2.5 text-center bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {t('boughtTickets.completePurchase')}
          </Link>
        )}
      </div>
    </>
  );

  const to = offer.status === 'accepted' ? `/buy/${offer.listingId}?offerId=${offer.id}` : `/buy/${offer.listingId}`;
  return (
    <Link
      to={to}
      state={offer.status === 'accepted' ? undefined : { from: '/my-tickets?tab=offers' }}
      className="block overflow-hidden rounded-lg bg-white shadow-md ring-2 ring-cyan-200 hover:shadow-lg hover:ring-cyan-300 transition-all"
    >
      {content}
    </Link>
  );
}

/** Seller view: offer received on my listing — event, listing price, offered price, ticket detail, accept/reject, status */
interface ReceivedOfferCardProps {
  offer: OfferWithReceivedContext;
  t: (key: string, options?: Record<string, string>) => string;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  isProcessing?: boolean;
}

function ReceivedOfferCard({ offer, t, onAccept, onReject, isProcessing }: ReceivedOfferCardProps) {
  const bannerVariant = useEventBannerVariant();
  const statusInfo = getOfferStatusInfo(offer.status, t);
  const StatusIcon = statusInfo.icon;
  const ctx = offer.receivedContext;
  const eventDate = new Date(ctx.eventDate);
  const ticketLabel =
    offer.tickets.type === 'numbered'
      ? `${offer.tickets.seats.length} ${offer.tickets.seats.length === 1 ? t('boughtTickets.seat') : t('boughtTickets.seats')}`
      : `${offer.tickets.count} ${offer.tickets.count === 1 ? t('boughtTickets.ticket') : t('boughtTickets.tickets')}`;

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-md ring-2 ring-cyan-200">
      <div className="relative h-48">
        <EventBanner
          variant={bannerVariant}
          squareUrl={ctx.bannerUrls?.square}
          rectangleUrl={ctx.bannerUrls?.rectangle}
          alt={ctx.eventName}
          className="h-full"
        />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-cyan-100 text-cyan-800 backdrop-blur-sm">
            {t('sellerDashboard.offerReceived')}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.color} backdrop-blur-sm bg-opacity-95`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.label}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{ctx.eventName}</h3>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-md text-sm font-medium mb-3">
          <Ticket className="w-3.5 h-3.5" />
          {ticketLabel}
        </div>
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{formatDate(eventDate)}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">
            {t('sellerDashboard.fromBuyer')} <span className="font-medium text-gray-900">{ctx.buyerName}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100 text-sm">
          <span className="text-gray-600">
            {t('sellerDashboard.listingPrice')}:{' '}
            <span className="font-semibold text-gray-900">
              {formatCurrency(ctx.listingPrice.amount, ctx.listingPrice.currency)} / {t('boughtTickets.perTicket')}
            </span>
          </span>
          <span className="text-gray-600">
            {t('sellerDashboard.offeredPrice')}:{' '}
            <span className="font-semibold text-cyan-700">
              {formatCurrency(offer.offeredPrice.amount, offer.offeredPrice.currency)} / {t('boughtTickets.perTicket')}
            </span>
          </span>
        </div>
        {offer.status === 'pending' && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onAccept(offer.id)}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {t('boughtTickets.acceptOffer')}
            </button>
            <button
              type="button"
              onClick={() => onReject(offer.id)}
              disabled={isProcessing}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              {t('boughtTickets.rejectOffer')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface TransactionSectionsProps {
  groupedTransactions: {
    pendingMyAction: TransactionWithDetails[];
    pendingOtherAction: TransactionWithDetails[];
    completed: TransactionWithDetails[];
  };
  activeTab: 'bought' | 'sold';
  userId: string | undefined;
  t: (key: string, options?: Record<string, string>) => string;
}

function TransactionSections({ groupedTransactions, activeTab, userId, t }: TransactionSectionsProps) {
  const { pendingMyAction, pendingOtherAction, completed } = groupedTransactions;
  const hasAnyTransactions = pendingMyAction.length > 0 || pendingOtherAction.length > 0 || completed.length > 0;

  if (!hasAnyTransactions) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12">
        <EmptyState
          icon={Ticket}
          title={t('boughtTickets.noTicketsYet')}
          description={activeTab === 'bought' 
            ? t('boughtTickets.purchasedTicketsWillAppear')
            : t('boughtTickets.soldTicketsWillAppear')
          }
          action={activeTab === 'bought' ? {
            label: t('landing.upcomingEvents'),
            to: '/',
          } : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending Tickets Header */}
      {(pendingMyAction.length > 0 || pendingOtherAction.length > 0) && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">{t('boughtTickets.pendingTickets')}</h2>

          {/* Awaiting My Action */}
          {pendingMyAction.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-orange-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {t('boughtTickets.pendingAwaitingMyAction')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingMyAction.map((tx) => (
                  <TransactionCard
                    key={tx.id}
                    transaction={tx}
                    userId={userId}
                    showWaitingFor={false}
                    activeTab={activeTab}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Awaiting Other's Action */}
          {pendingOtherAction.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-600 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {t('boughtTickets.pendingAwaitingOtherAction')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingOtherAction.map((tx) => (
                  <TransactionCard
                    key={tx.id}
                    transaction={tx}
                    userId={userId}
                    showWaitingFor={true}
                    activeTab={activeTab}
                    t={t}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completed Tickets */}
      {completed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">{t('boughtTickets.completedTickets')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completed.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                userId={userId}
                showWaitingFor={false}
                activeTab={activeTab}
                t={t}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface BoughtTabWithOffersProps {
  groupedTransactions: {
    pendingMyAction: TransactionWithDetails[];
    pendingOtherAction: TransactionWithDetails[];
    completed: TransactionWithDetails[];
  };
  myOffers: OfferWithListingSummary[];
  offersLoading: boolean;
  userId: string | undefined;
  t: (key: string, options?: Record<string, string>) => string;
}

function BoughtTabWithOffers({
  groupedTransactions,
  myOffers,
  offersLoading,
  userId,
  t,
}: BoughtTabWithOffersProps) {
  const { pendingMyAction, pendingOtherAction, completed } = groupedTransactions;
  const offersRequireAction = myOffers.filter((o) => o.status === 'accepted');
  const offersWaiting = myOffers.filter((o) => o.status === 'pending');
  const offersExpiredCancelled = myOffers.filter((o) =>
    ['rejected', 'converted', 'cancelled'].includes(o.status),
  );

  const hasRequireAction = pendingMyAction.length > 0 || offersRequireAction.length > 0;
  const hasWaiting = pendingOtherAction.length > 0 || offersWaiting.length > 0;
  const hasCompleted = completed.length > 0;
  const hasExpiredCancelled = offersExpiredCancelled.length > 0;
  const hasAny = hasRequireAction || hasWaiting || hasCompleted || hasExpiredCancelled;

  if (offersLoading && myOffers.length === 0 && !hasAny) {
    return <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />;
  }

  if (!hasAny) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12">
        <EmptyState
          icon={Ticket}
          title={t('boughtTickets.noTicketsYet')}
          description={t('boughtTickets.purchasedTicketsWillAppear')}
          action={{ label: t('landing.upcomingEvents'), to: '/' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hasRequireAction && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">{t('boughtTickets.requireAction')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingMyAction.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                userId={userId}
                showWaitingFor={false}
                activeTab="bought"
                t={t}
              />
            ))}
            {offersRequireAction.map((offer) => (
              <OfferCard key={offer.id} offer={offer} t={t} />
            ))}
          </div>
        </div>
      )}

      {hasWaiting && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">{t('boughtTickets.waiting')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingOtherAction.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                userId={userId}
                showWaitingFor={true}
                activeTab="bought"
                t={t}
              />
            ))}
            {offersWaiting.map((offer) => (
              <OfferCard key={offer.id} offer={offer} t={t} />
            ))}
          </div>
        </div>
      )}

      {hasCompleted && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">{t('boughtTickets.completedTickets')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completed.map((tx) => (
              <TransactionCard
                key={tx.id}
                transaction={tx}
                userId={userId}
                showWaitingFor={false}
                activeTab="bought"
                t={t}
              />
            ))}
          </div>
        </div>
      )}

      {hasExpiredCancelled && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">{t('boughtTickets.expiredCancelledOffers')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offersExpiredCancelled.map((offer) => (
              <OfferCard key={offer.id} offer={offer} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ListedTicketsGridProps {
  listed: TicketListingWithEvent[];
  isPast?: boolean;
  t: (key: string, options?: Record<string, string>) => string;
  onCopyLink: (listingId: string) => void;
  copiedListingId: string | null;
}

function ListedTicketsGrid({
  listed,
  isPast = false,
  t,
  onCopyLink,
  copiedListingId,
}: ListedTicketsGridProps) {
  const bannerVariant = useEventBannerVariant();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listed.map((listing) => {
        const statusInfo = getListedStatusInfo(listing.status, t);
        const StatusIcon = statusInfo.icon;
        const eventDate = new Date(listing.eventDate);
        const priceFormatted = formatCurrency(listing.pricePerTicket.amount, listing.pricePerTicket.currency);
        const availableCount = listing.ticketUnits.filter(
          (unit) => unit.status === TicketUnitStatus.Available,
        ).length;

        return (
          <div
            key={listing.id}
            className={`bg-white rounded-lg shadow-md overflow-hidden transition-shadow ${
              isPast
                ? 'opacity-80 grayscale-[0.4] hover:opacity-90 hover:grayscale-[0.2] hover:shadow-md'
                : 'hover:shadow-lg'
            }`}
          >
            {/* Event Image */}
            <div className="relative h-48">
              <EventBanner
                variant={bannerVariant}
                squareUrl={listing.bannerUrls?.square}
                rectangleUrl={listing.bannerUrls?.rectangle}
                alt={listing.eventName}
                className="h-full"
              />
              {/* Status Badge */}
              <div className="absolute top-3 right-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusInfo.color} backdrop-blur-sm bg-opacity-95`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusInfo.label}
                </span>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-5">
              {/* Event Name */}
              <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                {listing.eventName}
              </h3>

              {/* Ticket Type */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium mb-3">
                <Ticket className="w-3.5 h-3.5" />
                {listing.sectionName || listing.type}
              </div>

              {/* Date and Time */}
              <div className="flex items-center gap-2 text-gray-600 mb-3">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">
                  {eventDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>

              {/* Price and Quantity */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 mb-3">
                <div className="flex items-center gap-1.5 text-gray-900">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-lg font-bold">{priceFormatted}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {availableCount} {t('boughtTickets.available')}
                </span>
              </div>

              {/* Action Buttons */}
              {listing.status === 'Active' && (
                <div className="flex flex-col gap-2">
                  <Link
                    to={`/edit-listing/${listing.id}`}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {t('boughtTickets.editListing')}
                  </Link>
                  <Link
                    to={`/buy/${listing.id}`}
                    className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {t('boughtTickets.viewListing')}
                  </Link>
                  <button
                    onClick={() => onCopyLink(listing.id)}
                    className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <LinkIcon className="w-4 h-4" />
                    {copiedListingId === listing.id
                      ? t('boughtTickets.copied')
                      : t('boughtTickets.copyLink')}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** "Mis Entradas" at /my-tickets: 2 tabs — Mis entradas (bought), Mis ofertas (my offers) */
export function MyTicketsPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bought, setBought] = useState<TransactionWithDetails[]>([]);
  const [myOffers, setMyOffers] = useState<OfferWithListingSummary[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabFromUrl = searchParams.get('tab');
  const offerIdFromUrl = searchParams.get('offerId');
  // When offerId is in URL, show "offers" tab so the link from "offer accepted" notification works
  const activeTab: MyTicketsTab = offerIdFromUrl ? 'offers' : (isValidMyTicketsTab(tabFromUrl) ? tabFromUrl : 'tickets');

  // Normalize tab param but preserve other params (e.g. offerId from notification link)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'offers' || tab === 'my-offers') {
      setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', 'offers'); return n; }, { replace: true });
    } else if (tab === 'bought') {
      setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', 'tickets'); return n; }, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  useEffect(() => {
    if (offerIdFromUrl && tabFromUrl !== 'offers') setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', 'offers'); if (prev.get('offerId')) n.set('offerId', prev.get('offerId')!); return n; }, { replace: true });
  }, [offerIdFromUrl, tabFromUrl, setSearchParams]);

  const setActiveTab = (tab: MyTicketsTab) => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', tab); if (tab !== 'offers') n.delete('offerId'); return n; });
  const clearOfferIdFilter = () => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('offerId'); return n; }, { replace: true });

  const myOffersFiltered = useMemo(() => {
    if (!offerIdFromUrl) return myOffers;
    return myOffers.filter((o) => o.id === offerIdFromUrl);
  }, [myOffers, offerIdFromUrl]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    setError(null);
    ticketsService
      .getMyTickets()
      .then((data) => setBought(data.bought))
      .catch((err) => {
        console.error('Failed to fetch data:', err);
        setError(t('common.errorLoading'));
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, t]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setOffersLoading(true);
    offersService
      .listMyOffers()
      .then((res) => setMyOffers(Array.isArray(res) ? res : []))
      .catch(() => setMyOffers([]))
      .finally(() => setOffersLoading(false));
  }, [isAuthenticated]);

  const groupedBought = useMemo(() => {
    const pendingMyAction: TransactionWithDetails[] = [];
    const pendingOtherAction: TransactionWithDetails[] = [];
    const completed: TransactionWithDetails[] = [];
    for (const tx of bought) {
      if (TERMINAL_STATUSES.includes(tx.status)) {
        completed.push(tx);
      } else if (isUserRequiredActor(tx, user?.id, 'bought')) {
        pendingMyAction.push(tx);
      } else {
        pendingOtherAction.push(tx);
      }
    }
    return { pendingMyAction, pendingOtherAction, completed };
  }, [bought, user?.id]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <EmptyState
          icon={Ticket}
          title={t('boughtTickets.loginRequired')}
          description={t('boughtTickets.loginToView')}
          action={{ label: t('header.login'), to: '/register' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('boughtTickets.title')}</h1>
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('tickets')}
                className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                  activeTab === 'tickets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('boughtTickets.myTicketsTabTickets')}
              </button>
              <button
                onClick={() => setActiveTab('offers')}
                className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                  activeTab === 'offers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('boughtTickets.myTicketsTabOffers')}
              </button>
            </div>
          </div>
        </div>
        {isLoading && <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />}
        {error && <ErrorAlert message={error} className="mb-6" />}
        {!isLoading && !error && (
          activeTab === 'tickets' ? (
            <TransactionSections
              groupedTransactions={groupedBought}
              activeTab="bought"
              userId={user?.id}
              t={t}
            />
          ) : (
            <div className="space-y-6">
              {offerIdFromUrl && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {t('boughtTickets.filterByOffer')}
                    <button
                      type="button"
                      onClick={clearOfferIdFilter}
                      className="p-0.5 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={t('common.clearFilter')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                </div>
              )}
              <BoughtTabWithOffers
                groupedTransactions={{ pendingMyAction: [], pendingOtherAction: [], completed: [] }}
                myOffers={myOffersFiltered}
                offersLoading={offersLoading}
                userId={user?.id}
                t={t}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

/** "Mis Ventas" at /seller-dashboard: 3 tabs — Entradas Publicadas, Entradas Vendidas, Ofertas Recibidas */
export function SellerDashboardPage() {
  const { t } = useTranslation();
  const { user, isAuthenticated, canSell } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const [listed, setListed] = useState<TicketListingWithEvent[]>([]);
  const [sold, setSold] = useState<TransactionWithDetails[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<OfferWithReceivedContext[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedListingId, setCopiedListingId] = useState<string | null>(null);
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(null);

  const tabFromUrl = searchParams.get('tab');
  const offerIdFromUrl = searchParams.get('offerId');
  // When offerId is in URL, show "received" tab so the link from "offer received" notification works
  const activeTab: SellerDashboardTab = offerIdFromUrl
    ? 'received'
    : (isValidSellerDashboardTab(tabFromUrl) ? tabFromUrl : 'listed');

  // Normalize tab param but preserve other params (e.g. offerId from notification link)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'listed' || tab === 'sold' || tab === 'received') {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  // Sync URL tab when we're showing received due to offerId
  useEffect(() => {
    if (offerIdFromUrl && tabFromUrl !== 'received') setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', 'received'); if (prev.get('offerId')) n.set('offerId', prev.get('offerId')!); return n; }, { replace: true });
  }, [offerIdFromUrl, tabFromUrl, setSearchParams]);

  const setActiveTab = (tab: SellerDashboardTab) => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set('tab', tab); if (tab !== 'received') n.delete('offerId'); return n; });
  const clearOfferIdFilter = () => setSearchParams((prev) => {
    const next = new URLSearchParams(prev);
    next.delete('offerId');
    return next;
  }, { replace: true });

  useEffect(() => {
    if (!isAuthenticated || !canSell()) return;
    setIsLoading(true);
    setError(null);
    ticketsService
      .getMyTickets()
      .then((data) => {
        setListed(data.listed);
        setSold(data.sold);
      })
      .catch((err) => {
        console.error('Failed to fetch data:', err);
        setError(t('common.errorLoading'));
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, canSell, t]);

  useEffect(() => {
    if (!isAuthenticated || !canSell() || activeTab !== 'received') return;
    setOffersLoading(true);
    offersService
      .listReceivedOffers()
      .then((res) => setReceivedOffers(Array.isArray(res) ? res : []))
      .catch(() => setReceivedOffers([]))
      .finally(() => setOffersLoading(false));
  }, [isAuthenticated, canSell, activeTab]);

  const groupedSold = useMemo(() => {
    const pendingMyAction: TransactionWithDetails[] = [];
    const pendingOtherAction: TransactionWithDetails[] = [];
    const completed: TransactionWithDetails[] = [];
    for (const tx of sold) {
      if (TERMINAL_STATUSES.includes(tx.status)) {
        completed.push(tx);
      } else if (isUserRequiredActor(tx, user?.id, 'sold')) {
        pendingMyAction.push(tx);
      } else {
        pendingOtherAction.push(tx);
      }
    }
    return { pendingMyAction, pendingOtherAction, completed };
  }, [sold, user?.id]);

  const { activeListings, pastListings } = useMemo(() => {
    const active = listed.filter((l) => l.status === 'Active');
    const past = listed.filter((l) => l.status !== 'Active');
    return { activeListings: active, pastListings: past };
  }, [listed]);

  const receivedOffersFiltered = useMemo(() => {
    if (!offerIdFromUrl) return receivedOffers;
    return receivedOffers.filter((o) => o.id === offerIdFromUrl);
  }, [receivedOffers, offerIdFromUrl]);

  const handleCopyLink = async (listingId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/buy/${listingId}`);
      setCopiedListingId(listingId);
      setTimeout(() => setCopiedListingId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    setProcessingOfferId(offerId);
    try {
      await offersService.accept(offerId);
      const next = await offersService.listReceivedOffers();
      setReceivedOffers(Array.isArray(next) ? next : []);
    } finally {
      setProcessingOfferId(null);
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    setProcessingOfferId(offerId);
    try {
      await offersService.reject(offerId);
      const next = await offersService.listReceivedOffers();
      setReceivedOffers(Array.isArray(next) ? next : []);
    } finally {
      setProcessingOfferId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <EmptyState
          icon={Ticket}
          title={t('boughtTickets.loginRequired')}
          description={t('boughtTickets.loginToView')}
          action={{ label: t('header.login'), to: '/register' }}
        />
      </div>
    );
  }

  if (!canSell()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <EmptyState
          icon={Ticket}
          title={t('sellerDashboard.title')}
          description={t('boughtTickets.listedTicketsWillAppear')}
          action={{ label: t('boughtTickets.startSelling'), to: '/sell-ticket' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('sellerDashboard.title')}</h1>
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex flex-wrap gap-6">
              <button
                onClick={() => setActiveTab('listed')}
                className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                  activeTab === 'listed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('sellerDashboard.tabListed')}
              </button>
              <button
                onClick={() => setActiveTab('sold')}
                className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                  activeTab === 'sold' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('sellerDashboard.tabSold')}
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                  activeTab === 'received' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('sellerDashboard.tabReceived')}
              </button>
            </div>
          </div>
        </div>
        {isLoading && <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />}
        {error && <ErrorAlert message={error} className="mb-6" />}
        {!isLoading && !error && (
          <>
            {activeTab === 'listed' && (
              listed.length > 0 ? (
                <div className="space-y-10">
                  {activeListings.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold text-gray-900">{t('boughtTickets.activeListings')}</h2>
                      <ListedTicketsGrid
                        listed={activeListings}
                        t={t}
                        onCopyLink={handleCopyLink}
                        copiedListingId={copiedListingId}
                      />
                    </div>
                  )}
                  {pastListings.length > 0 && (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold text-gray-700">{t('boughtTickets.pastListings')}</h2>
                      <ListedTicketsGrid
                        listed={pastListings}
                        isPast
                        t={t}
                        onCopyLink={handleCopyLink}
                        copiedListingId={copiedListingId}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-12">
                  <EmptyState
                    icon={Ticket}
                    title={t('boughtTickets.noListingsYet')}
                    description={t('boughtTickets.listedTicketsWillAppear')}
                    action={{ label: t('boughtTickets.startSelling'), to: '/sell-ticket' }}
                  />
                </div>
              )
            )}
            {activeTab === 'sold' && (
              <TransactionSections
                groupedTransactions={groupedSold}
                activeTab="sold"
                userId={user?.id}
                t={t}
              />
            )}
            {activeTab === 'received' && (
              offersLoading && receivedOffers.length === 0 ? (
                <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />
              ) : receivedOffers.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12">
                  <EmptyState
                    icon={MessageCircle}
                    title={t('sellerDashboard.noReceivedOffers')}
                    description={t('sellerDashboard.receivedOffersWillAppear')}
                    action={{ label: t('boughtTickets.ticketsListed'), to: '/seller-dashboard?tab=listed' }}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-gray-900">{t('sellerDashboard.tabReceived')}</h2>
                    {offerIdFromUrl && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {t('sellerDashboard.filterByOffer')}
                        <button
                          type="button"
                          onClick={clearOfferIdFilter}
                          className="p-0.5 rounded hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={t('common.clearFilter')}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {receivedOffersFiltered.map((offer) => (
                      <ReceivedOfferCard
                        key={offer.id}
                        offer={offer}
                        t={t}
                        onAccept={handleAcceptOffer}
                        onReject={handleRejectOffer}
                        isProcessing={processingOfferId === offer.id}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
      <SellerUnverifiedModalTrigger showWhen={activeTab === 'sold' && sold.length > 0} />
    </div>
  );
}

/** @deprecated Use MyTicketsPage for /my-tickets. Kept for backwards compatibility. */
export const BoughtTicketManager = MyTicketsPage;
