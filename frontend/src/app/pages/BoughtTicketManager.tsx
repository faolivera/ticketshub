import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, CheckCircle, Clock, Calendar, User, DollarSign, Edit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface TicketTransaction {
  id: string;
  eventName: string;
  eventImage: string;
  ticketType: string;
  eventDate: string;
  eventTime: string;
  price: number;
  isSeller: boolean;
  status: 'pending_transfer' | 'transferred' | 'confirmed' | 'completed';
  counterparty: string;
  purchaseDate: string;
}

interface ListedTicket {
  id: string;
  eventName: string;
  eventImage: string;
  ticketType: string;
  eventDate: string;
  eventTime: string;
  listPrice: number;
  status: 'active' | 'pending_sale' | 'sold';
  views: number;
  listedDate: string;
}

const mockTickets: TicketTransaction[] = [
  {
    id: '1',
    eventName: 'Summer Music Festival',
    eventImage: 'https://images.unsplash.com/photo-1656848981929-bab777fc26a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGZlc3RpdmFsJTIwY29uY2VydHxlbnwxfHx8fDE3Njk0MTQyOTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    ticketType: 'VIP',
    eventDate: 'July 15, 2026',
    eventTime: '4:00 PM',
    price: 250,
    isSeller: false,
    status: 'pending_transfer',
    counterparty: 'John Smith',
    purchaseDate: 'January 20, 2026'
  },
  {
    id: '2',
    eventName: 'Rock Night',
    eventImage: 'https://images.unsplash.com/photo-1723902701334-08b0fe53ff4c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrJTIwY29uY2VydCUyMHN0YWdlfGVufDF8fHx8MTc2OTM1MzMyM3ww&ixlib=rb-4.1.0&q=80&w=1080',
    ticketType: 'General Admission',
    eventDate: 'August 20, 2026',
    eventTime: '8:00 PM',
    price: 125,
    isSeller: true,
    status: 'transferred',
    counterparty: 'Alice Brown',
    purchaseDate: 'January 18, 2026'
  },
  {
    id: '3',
    eventName: 'Jazz Evening',
    eventImage: 'https://images.unsplash.com/photo-1757439160077-dd5d62a4d851?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXp6JTIwcGVyZm9ybWFuY2UlMjBsaXZlfGVufDF8fHx8MTc2OTM1MzMyNHww&ixlib=rb-4.1.0&q=80&w=1080',
    ticketType: 'Premium',
    eventDate: 'September 5, 2026',
    eventTime: '7:00 PM',
    price: 75,
    isSeller: false,
    status: 'completed',
    counterparty: 'Sarah Johnson',
    purchaseDate: 'January 15, 2026'
  },
  {
    id: '4',
    eventName: 'Summer Music Festival',
    eventImage: 'https://images.unsplash.com/photo-1656848981929-bab777fc26a9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMGZlc3RpdmFsJTIwY29uY2VydHxlbnwxfHx8fDE3Njk0MTQyOTN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    ticketType: 'General Admission',
    eventDate: 'July 15, 2026',
    eventTime: '10:00 PM',
    price: 150,
    isSeller: false,
    status: 'transferred',
    counterparty: 'Mike Davis',
    purchaseDate: 'January 22, 2026'
  }
];

const mockListedTickets: ListedTicket[] = [
  {
    id: '5',
    eventName: 'Football Championship',
    eventImage: 'https://images.unsplash.com/photo-1764050359179-517599dab87b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBzdGFkaXVtJTIwZXZlbnR8ZW58MXx8fHwxNzY5MzU4NzI2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    ticketType: 'VIP Box',
    eventDate: 'June 10, 2026',
    eventTime: '3:00 PM',
    listPrice: 300,
    status: 'active',
    views: 42,
    listedDate: 'January 10, 2026'
  },
  {
    id: '6',
    eventName: 'Theater Spectacular',
    eventImage: 'https://images.unsplash.com/photo-1764936394584-c4a66ac31e00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGVhdGVyJTIwcGVyZm9ybWFuY2UlMjBzdGFnZXxlbnwxfHx8fDE3NjkzNTUyOTd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    ticketType: 'Orchestra',
    eventDate: 'May 22, 2026',
    eventTime: '7:30 PM',
    listPrice: 180,
    status: 'active',
    views: 28,
    listedDate: 'January 12, 2026'
  },
  {
    id: '7',
    eventName: 'Rock Night',
    eventImage: 'https://images.unsplash.com/photo-1723902701334-08b0fe53ff4c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrJTIwY29uY2VydCUyMHN0YWdlfGVufDF8fHx8MTc2OTM1MzMyM3ww&ixlib=rb-4.1.0&q=80&w=1080',
    ticketType: 'VIP',
    eventDate: 'August 20, 2026',
    eventTime: '8:00 PM',
    listPrice: 200,
    status: 'pending_sale',
    views: 15,
    listedDate: 'January 19, 2026'
  }
];

export function BoughtTicketManager() {
  const { t } = useTranslation();
  const [tickets] = useState<TicketTransaction[]>(mockTickets);
  const [listedTickets] = useState<ListedTicket[]>(mockListedTickets);
  const [activeTab, setActiveTab] = useState<'bought' | 'sold' | 'listed'>('bought');

  // Filter tickets based on active tab
  const filteredTickets = tickets.filter(ticket => 
    activeTab === 'bought' ? !ticket.isSeller : ticket.isSeller
  );

  const getTransactionStatusInfo = (status: TicketTransaction['status']) => {
    switch (status) {
      case 'pending_transfer':
        return {
          label: t('boughtTickets.pending'),
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock
        };
      case 'transferred':
        return {
          label: t('boughtTickets.transferConfirmed'),
          color: 'bg-blue-100 text-blue-800',
          icon: Clock
        };
      case 'confirmed':
        return {
          label: t('boughtTickets.receiptConfirmed'),
          color: 'bg-purple-100 text-purple-800',
          icon: CheckCircle
        };
      case 'completed':
        return {
          label: t('boughtTickets.completed'),
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle
        };
    }
  };

  const getListedStatusInfo = (status: ListedTicket['status']) => {
    switch (status) {
      case 'active':
        return {
          label: t('boughtTickets.activeListing'),
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle
        };
      case 'pending_sale':
        return {
          label: t('boughtTickets.pendingSale'),
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock
        };
      case 'sold':
        return {
          label: t('boughtTickets.sold'),
          color: 'bg-gray-100 text-gray-800',
          icon: CheckCircle
        };
    }
  };

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

        {/* Tickets Grid */}
        {activeTab === 'listed' ? (
          // Listed Tickets View
          listedTickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listedTickets.map((ticket) => {
                const statusInfo = getListedStatusInfo(ticket.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <div
                    key={ticket.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Event Image */}
                    <div className="relative h-48 bg-gray-200">
                      <ImageWithFallback
                        src={ticket.eventImage}
                        alt={ticket.eventName}
                        className="w-full h-full object-cover"
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
                        {ticket.eventName}
                      </h3>

                      {/* Ticket Type */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium mb-3">
                        <Ticket className="w-3.5 h-3.5" />
                        {ticket.ticketType}
                      </div>

                      {/* Date and Time */}
                      <div className="flex items-center gap-2 text-gray-600 mb-3">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">
                          {ticket.eventDate} • {ticket.eventTime}
                        </span>
                      </div>

                      {/* Price and Views */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 mb-3">
                        <div className="flex items-center gap-1.5 text-gray-900">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-lg font-bold">{ticket.listPrice.toFixed(2)}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {ticket.views} {t('boughtTickets.views')}
                        </span>
                      </div>

                      {/* Edit Button */}
                      <Link
                        to={`/edit-listing/${ticket.id}`}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        {t('boughtTickets.editListing')}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('boughtTickets.noListingsYet')}
              </h3>
              <p className="text-gray-600 mb-6">
                {t('boughtTickets.listedTicketsWillAppear')}
              </p>
              <Link
                to="/event-tickets"
                className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {t('boughtTickets.startSelling')}
              </Link>
            </div>
          )
        ) : (
          // Bought/Sold Tickets View
          filteredTickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTickets.map((ticket) => {
                const statusInfo = getTransactionStatusInfo(ticket.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Link
                    key={ticket.id}
                    to={`/ticket/TKT-2026-${ticket.id.padStart(6, '0')}`}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Event Image */}
                    <div className="relative h-48 bg-gray-200">
                      <ImageWithFallback
                        src={ticket.eventImage}
                        alt={ticket.eventName}
                        className="w-full h-full object-cover"
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
                        {ticket.eventName}
                      </h3>

                      {/* Ticket Type */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium mb-3">
                        <Ticket className="w-3.5 h-3.5" />
                        {ticket.ticketType}
                      </div>

                      {/* Date and Time */}
                      <div className="flex items-center gap-2 text-gray-600 mb-3">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">
                          {ticket.eventDate} • {ticket.eventTime}
                        </span>
                      </div>

                      {/* Seller/Buyer Info */}
                      <div className="flex items-center gap-2 text-gray-600 pt-3 border-t border-gray-100">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">
                          {ticket.isSeller ? t('boughtTickets.to') : t('boughtTickets.soldBy')}{' '}
                          <span className="font-medium text-gray-900">{ticket.counterparty}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('boughtTickets.noTicketsYet')}
              </h3>
              <p className="text-gray-600">
                {activeTab === 'bought' 
                  ? t('boughtTickets.purchasedTicketsWillAppear')
                  : t('boughtTickets.soldTicketsWillAppear')
                }
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
