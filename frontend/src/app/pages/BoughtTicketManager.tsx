import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ticket, CheckCircle, Clock, Calendar, User, DollarSign, Edit, AlertCircle, Eye, Link as LinkIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ticketsService } from '../../api/services/tickets.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { EventBanner, useEventBannerVariant } from '../components/EventBanner';
import type { TransactionWithDetails, TicketListingWithEvent } from '../../api/types';
import { TicketUnitStatus, RequiredActor, TransactionStatus } from '../../api/types';
import { useUser } from '../contexts/UserContext';
import { BRAND_NAME } from '../../constants/brand';
import { formatCurrency } from '@/lib/format-currency';

type TabType = 'bought' | 'sold' | 'listed';

const VALID_TABS: TabType[] = ['bought', 'sold', 'listed'];

function isValidTab(tab: string | null): tab is TabType {
  return tab !== null && VALID_TABS.includes(tab as TabType);
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
function getTransactionStatusInfo(status: TransactionStatus, t: (key: string) => string) {
  switch (status) {
    case 'PendingPayment':
      return {
        label: t('boughtTickets.pendingPayment'),
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
  const statusInfo = getTransactionStatusInfo(transaction.status, t);
  const StatusIcon = statusInfo.icon;
  const eventDate = new Date(transaction.eventDate);
  const isSellerRole = transaction.sellerId === userId;
  const counterparty = isSellerRole ? transaction.buyerName : transaction.sellerName;
  const waitingForLabel = showWaitingFor ? getWaitingForLabel(transaction.requiredActor, t) : '';
  const bannerVariant = useEventBannerVariant();

  return (
    <Link
      to={`/transaction/${transaction.id}`}
      state={{ from: `/my-tickets?tab=${activeTab}` }}
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
            {eventDate.toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
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

interface ListedTicketsGridProps {
  listed: TicketListingWithEvent[];
  isPast?: boolean;
  t: (key: string, options?: Record<string, string>) => string;
  onCopyLink: (listingId: string) => void;
  copiedListingId: string | null;
}

function ListedTicketsGrid({ listed, isPast = false, t, onCopyLink, copiedListingId }: ListedTicketsGridProps) {
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

export function BoughtTicketManager() {
  const { t } = useTranslation();
  const { user, isAuthenticated, canSell } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [bought, setBought] = useState<TransactionWithDetails[]>([]);
  const [sold, setSold] = useState<TransactionWithDetails[]>([]);
  const [listed, setListed] = useState<TicketListingWithEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedListingId, setCopiedListingId] = useState<string | null>(null);

  const isSeller = canSell();

  // Get active tab from query string, default to 'bought'
  const tabFromUrl = searchParams.get('tab');
  const activeTab: TabType = isValidTab(tabFromUrl) ? tabFromUrl : 'bought';

  const setActiveTab = (tab: TabType) => {
    setSearchParams({ tab });
  };

  // Fetch all tickets once when authenticated
  useEffect(() => {
    async function fetchData() {
      if (!isAuthenticated) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await ticketsService.getMyTickets();
        setBought(data.bought);
        setSold(data.sold);
        setListed(data.listed);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(t('common.errorLoading'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isAuthenticated, t]);

  // Group transactions into pending (my action, other's action) and completed
  const groupedTransactions = useMemo(() => {
    const transactions = activeTab === 'bought' ? bought : sold;
    
    const pendingMyAction: TransactionWithDetails[] = [];
    const pendingOtherAction: TransactionWithDetails[] = [];
    const completed: TransactionWithDetails[] = [];

    for (const tx of transactions) {
      if (TERMINAL_STATUSES.includes(tx.status)) {
        completed.push(tx);
      } else if (isUserRequiredActor(tx, user?.id, activeTab as 'bought' | 'sold')) {
        pendingMyAction.push(tx);
      } else {
        pendingOtherAction.push(tx);
      }
    }

    return { pendingMyAction, pendingOtherAction, completed };
  }, [bought, sold, activeTab, user?.id]);

  const { activeListings, pastListings } = useMemo(() => {
    const active = listed.filter((l) => l.status === 'Active');
    const past = listed.filter((l) => l.status !== 'Active');
    return { activeListings: active, pastListings: past };
  }, [listed]);

  const handleCopyLink = async (listingId: string) => {
    const url = `${window.location.origin}/buy/${listingId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedListingId(listingId);
      setTimeout(() => setCopiedListingId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <EmptyState
          icon={Ticket}
          title={t('boughtTickets.loginRequired')}
          description={t('boughtTickets.loginToView')}
          action={{
            label: t('header.login'),
            to: '/register',
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('boughtTickets.title')}</h1>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('bought')}
                className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                  activeTab === 'bought'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('boughtTickets.ticketsBought')}
              </button>
              {isSeller && (
                <>
                  <button
                    onClick={() => setActiveTab('sold')}
                    className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                      activeTab === 'sold'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t('boughtTickets.ticketsSold')}
                  </button>
                  <button
                    onClick={() => setActiveTab('listed')}
                    className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                      activeTab === 'listed'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t('boughtTickets.ticketsListed')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />
        )}

        {/* Error state */}
        {error && (
          <ErrorAlert message={error} className="mb-6" />
        )}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {activeTab === 'listed' ? (
              // Listed Tickets View – active first, then past
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
                    action={{
                      label: t('boughtTickets.startSelling'),
                      to: '/sell-ticket',
                    }}
                  />
                </div>
              )
            ) : (
              // Bought/Sold Tickets View - Grouped by pending status
              <TransactionSections
                groupedTransactions={groupedTransactions}
                activeTab={activeTab as 'bought' | 'sold'}
                userId={user?.id}
                t={t}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
