import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, CheckCircle, Clock, Calendar, User, DollarSign, Edit, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ticketsService } from '../../api/services/tickets.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import type { TransactionWithDetails, TicketListingWithEvent, TransactionStatus } from '../../api/types';
import { TicketUnitStatus } from '../../api/types';
import { useUser } from '../contexts/UserContext';

type TabType = 'bought' | 'sold' | 'listed';

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

export function BoughtTicketManager() {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useUser();
  
  const [bought, setBought] = useState<TransactionWithDetails[]>([]);
  const [sold, setSold] = useState<TransactionWithDetails[]>([]);
  const [listed, setListed] = useState<TicketListingWithEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('bought');

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

  const displayedTransactions = activeTab === 'bought' ? bought : sold;

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
              // Listed Tickets View
              listed.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listed.map((listing) => {
                    const statusInfo = getListedStatusInfo(listing.status, t);
                    const StatusIcon = statusInfo.icon;
                    const eventDate = new Date(listing.eventDate);
                    const priceDisplay = listing.pricePerTicket.amount / 100;
                    const availableCount = listing.ticketUnits.filter(
                      (unit) => unit.status === TicketUnitStatus.Available,
                    ).length;

                    return (
                      <div
                        key={listing.id}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {/* Event Image */}
                        <div className="relative h-48 bg-gray-200">
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Ticket className="w-16 h-16 text-white opacity-50" />
                          </div>
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
                            {listing.section || listing.type}
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
                              <span className="text-lg font-bold">{priceDisplay.toFixed(2)}</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {availableCount} {t('boughtTickets.available')}
                            </span>
                          </div>

                          {/* Edit Button */}
                          {listing.status === 'Active' && (
                            <Link
                              to={`/edit-listing/${listing.id}`}
                              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              {t('boughtTickets.editListing')}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
              // Bought/Sold Tickets View
              displayedTransactions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedTransactions.map((transaction) => {
                    const statusInfo = getTransactionStatusInfo(transaction.status, t);
                    const StatusIcon = statusInfo.icon;
                    const eventDate = new Date(transaction.eventDate);
                    const isSeller = transaction.sellerId === user?.id;
                    const counterparty = isSeller ? transaction.buyerName : transaction.sellerName;

                    return (
                      <Link
                        key={transaction.id}
                        to={`/ticket/${transaction.id}`}
                        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                      >
                        {/* Event Image */}
                        <div className="relative h-48 bg-gray-200">
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Ticket className="w-16 h-16 text-white opacity-50" />
                          </div>
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
                              {isSeller ? t('boughtTickets.to') : t('boughtTickets.soldBy')}{' '}
                              <span className="font-medium text-gray-900">{counterparty}</span>
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
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
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
