import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Ticket, User, Mail, Phone, MessageCircle, AlertCircle, CheckCircle, Clock, CreditCard, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TicketChat } from '@/app/components/TicketChat';

// Mock data generator - in real app, this would come from API/context
const getMockTicketData = (ticketId: string) => ({
  id: ticketId || 'TKT-2026-001234',
  event: {
    name: 'Bad Bunny',
    date: 'July 15, 2026',
    time: '8:00 PM',
    venue: 'Madison Square Garden',
    location: 'New York, NY'
  },
  ticket: {
    type: 'VIP',
    section: 'Floor A',
    row: '5',
    seat: '12',
    quantity: 2,
    deliveryMethod: 'digital'
  },
  payment: {
    subtotal: 450.00,
    serviceFee: 45.00,
    processingFee: 12.75,
    total: 507.75,
    paymentMethod: 'Visa ****1234',
    paidAt: 'Jan 20, 2026 - 3:45 PM'
  },
  status: 'pending_transfer', // pending_transfer, transferred, confirmed, completed
  purchaseDate: 'January 20, 2026',
  seller: {
    id: 'seller123',
    name: 'John Smith',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    rating: 4.8,
    reviewCount: 234,
    ticketsSold: 156,
    level: 2,
    verified: true
  }
});

export function MyTicket() {
  const { t } = useTranslation();
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket] = useState(getMockTicketData(ticketId || ''));
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending_transfer':
        return {
          label: t('myTicket.statusPendingTransfer'),
          color: 'yellow',
          icon: Clock,
          description: t('myTicket.statusPendingTransferDesc')
        };
      case 'transferred':
        return {
          label: t('myTicket.statusTransferred'),
          color: 'blue',
          icon: AlertCircle,
          description: t('myTicket.statusTransferredDesc')
        };
      case 'confirmed':
        return {
          label: t('myTicket.statusConfirmed'),
          color: 'green',
          icon: CheckCircle,
          description: t('myTicket.statusConfirmedDesc')
        };
      case 'completed':
        return {
          label: t('myTicket.statusCompleted'),
          color: 'green',
          icon: CheckCircle,
          description: t('myTicket.statusCompletedDesc')
        };
      default:
        return {
          label: status,
          color: 'gray',
          icon: AlertCircle,
          description: ''
        };
    }
  };

  const statusInfo = getStatusInfo(ticket.status);
  const StatusIcon = statusInfo.icon;

  const handleConfirmAction = () => {
    // Handle confirmation logic
    console.log('Ticket action confirmed');
    setShowConfirmModal(false);
    // Update ticket status
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link 
          to="/bought-tickets"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('myTicket.backToMyTickets')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Ticket Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">{ticket.event.name}</h1>
                    <div className="flex items-center gap-2 text-blue-100">
                      <Calendar className="w-4 h-4" />
                      <span>{ticket.event.date} • {ticket.event.time}</span>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                    <span className="text-xs font-semibold">{ticket.ticket.type}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <MapPin className="w-4 h-4" />
                  <span>{ticket.event.venue}, {ticket.event.location}</span>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.section')}</p>
                    <p className="font-semibold text-gray-900">{ticket.ticket.section}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.row')}</p>
                    <p className="font-semibold text-gray-900">{ticket.ticket.row}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.seat')}</p>
                    <p className="font-semibold text-gray-900">{ticket.ticket.seat}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.quantity')}</p>
                    <p className="font-semibold text-gray-900">{ticket.ticket.quantity}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-1">{t('myTicket.ticketId')}</p>
                  <p className="font-mono text-sm text-gray-900">{ticket.id}</p>
                </div>
              </div>
            </div>

            {/* Status & Timeline */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t('myTicket.ticketStatus')}</h2>

              {/* Status Timeline */}
              <div className="mb-6">
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{
                        width: ticket.status === 'pending_transfer' ? '0%' :
                               ticket.status === 'transferred' ? '33.33%' :
                               ticket.status === 'confirmed' ? '66.66%' :
                               ticket.status === 'completed' ? '100%' : '0%'
                      }}
                    />
                  </div>

                  {/* Status Steps */}
                  <div className="relative grid grid-cols-4 gap-2">
                    {/* Step 1: Paid/Bought */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        ['pending_transfer', 'transferred', 'confirmed', 'completed'].includes(ticket.status)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <p className={`text-xs text-center font-medium ${
                        ['pending_transfer', 'transferred', 'confirmed', 'completed'].includes(ticket.status)
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}>
                        {t('myTicket.statusStepPaid')}
                      </p>
                    </div>

                    {/* Step 2: Ticket Transferred */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        ['transferred', 'confirmed', 'completed'].includes(ticket.status)
                          ? 'bg-blue-600 text-white'
                          : ticket.status === 'pending_transfer'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {ticket.status === 'pending_transfer' ? (
                          <Clock className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </div>
                      <p className={`text-xs text-center font-medium ${
                        ['transferred', 'confirmed', 'completed'].includes(ticket.status)
                          ? 'text-gray-900'
                          : ticket.status === 'pending_transfer'
                          ? 'text-yellow-600'
                          : 'text-gray-400'
                      }`}>
                        {t('myTicket.statusStepTransferred')}
                      </p>
                    </div>

                    {/* Step 3: Receipt Confirmed */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        ['confirmed', 'completed'].includes(ticket.status)
                          ? 'bg-blue-600 text-white'
                          : ticket.status === 'transferred'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {ticket.status === 'transferred' ? (
                          <Clock className="w-5 h-5" />
                        ) : (
                          <CheckCircle className="w-5 h-5" />
                        )}
                      </div>
                      <p className={`text-xs text-center font-medium ${
                        ['confirmed', 'completed'].includes(ticket.status)
                          ? 'text-gray-900'
                          : ticket.status === 'transferred'
                          ? 'text-yellow-600'
                          : 'text-gray-400'
                      }`}>
                        {t('myTicket.statusStepConfirmed')}
                      </p>
                    </div>

                    {/* Step 4: Deposit Released */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        ticket.status === 'completed'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {ticket.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Clock className="w-5 h-5" />
                        )}
                      </div>
                      <p className={`text-xs text-center font-medium ${
                        ticket.status === 'completed'
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      }`}>
                        {t('myTicket.statusStepReleased')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Status Description */}
              <div className={`p-4 rounded-lg mb-4 ${
                statusInfo.color === 'yellow' ? 'bg-yellow-50 border border-yellow-200' :
                statusInfo.color === 'blue' ? 'bg-blue-50 border border-blue-200' :
                statusInfo.color === 'green' ? 'bg-green-50 border border-green-200' :
                'bg-gray-50 border border-gray-200'
              }`}>
                <div className="flex items-start gap-3">
                  <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    statusInfo.color === 'yellow' ? 'text-yellow-600' :
                    statusInfo.color === 'blue' ? 'text-blue-600' :
                    statusInfo.color === 'green' ? 'text-green-600' :
                    'text-gray-600'
                  }`} />
                  <div>
                    <p className={`font-semibold mb-1 ${
                      statusInfo.color === 'yellow' ? 'text-yellow-900' :
                      statusInfo.color === 'blue' ? 'text-blue-900' :
                      statusInfo.color === 'green' ? 'text-green-900' :
                      'text-gray-900'
                    }`}>
                      {statusInfo.label}
                    </p>
                    <p className={`text-sm ${
                      statusInfo.color === 'yellow' ? 'text-yellow-800' :
                      statusInfo.color === 'blue' ? 'text-blue-800' :
                      statusInfo.color === 'green' ? 'text-green-800' :
                      'text-gray-800'
                    }`}>
                      {statusInfo.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              {ticket.status === 'transferred' && (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t('myTicket.confirmTicketReceived')}
                </button>
              )}

              {ticket.status === 'pending_transfer' && (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600">{t('myTicket.waitingForSeller')}</p>
                </div>
              )}
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">{t('myTicket.paymentInfo')}</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('myTicket.subtotal')}</span>
                  <span className="text-gray-900">${ticket.payment.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('myTicket.serviceFee')}</span>
                  <span className="text-gray-900">${ticket.payment.serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('myTicket.processingFee')}</span>
                  <span className="text-gray-900">${ticket.payment.processingFee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span className="text-gray-900">{t('myTicket.total')}</span>
                  <span className="text-gray-900">${ticket.payment.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('myTicket.paymentMethod')}</span>
                  <span className="text-gray-900">{ticket.payment.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('myTicket.paidAt')}</span>
                  <span className="text-gray-900">{ticket.payment.paidAt}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900">{t('myTicket.buyerProtection')}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Seller Information */}
          <div className="space-y-6">
            {/* Seller Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('myTicket.sellerInfo')}</h2>

              <div className="flex items-start gap-4 mb-4">
                <img
                  src={ticket.seller.avatar}
                  alt={ticket.seller.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{ticket.seller.name}</h3>
                    {ticket.seller.verified && (
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                    <span className="text-yellow-500">★</span>
                    <span className="font-semibold">{ticket.seller.rating}</span>
                    <span>({ticket.seller.reviewCount} {t('myTicket.reviews')})</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {ticket.seller.ticketsSold} {t('myTicket.ticketsSold')}
                  </p>
                </div>
              </div>

              <Link
                to={`/seller/${ticket.seller.id}`}
                className="block w-full text-center bg-gray-100 text-gray-900 py-2 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors mb-3"
              >
                {t('myTicket.viewSellerProfile')}
              </Link>

              <button
                onClick={() => setIsChatOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {t('myTicket.contactSeller')}
              </button>
            </div>

            {/* Support Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('myTicket.needHelp')}</h2>
              
              <p className="text-sm text-gray-600 mb-4">
                {t('myTicket.supportDescription')}
              </p>

              <button
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                <Mail className="w-4 h-4" />
                {t('myTicket.contactSupport')}
              </button>
            </div>

            {/* Purchase Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('myTicket.purchaseInfo')}</h2>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">{t('myTicket.purchaseDate')}</span>
                  <p className="font-semibold text-gray-900">{ticket.purchaseDate}</p>
                </div>
                <div>
                  <span className="text-gray-600">{t('myTicket.deliveryMethod')}</span>
                  <p className="font-semibold text-gray-900 capitalize">{ticket.ticket.deliveryMethod}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t('myTicket.confirmReceiptTitle')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('myTicket.confirmReceiptMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('myTicket.cancel')}
              </button>
              <button
                onClick={handleConfirmAction}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('myTicket.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Component */}
      <TicketChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        sellerName={ticket.seller.name}
        sellerImage={ticket.seller.avatar}
        sellerRating={ticket.seller.rating}
        sellerLevel={ticket.seller.level}
        ticketTitle={`${ticket.event.name} - ${ticket.ticket.type}`}
      />
    </div>
  );
}
