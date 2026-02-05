import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Ticket, MapPin, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const mockTickets = {
  't1': {
    id: 't1',
    type: 'VIP',
    price: 250,
    eventName: 'Summer Music Festival',
    eventDate: 'July 15, 2026',
    eventTime: '4:00 PM',
    location: 'Los Angeles, CA',
    venue: 'LA Stadium',
    sellerName: 'John Smith',
    sellerId: 'seller1',
    eventId: '1'
  },
  't2': {
    id: 't2',
    type: 'General Admission',
    price: 89,
    eventName: 'Summer Music Festival',
    eventDate: 'July 15, 2026',
    eventTime: '4:00 PM',
    location: 'Los Angeles, CA',
    venue: 'LA Stadium',
    sellerName: 'Sarah Johnson',
    sellerId: 'seller2',
    eventId: '1'
  },
  't3': {
    id: 't3',
    type: 'VIP',
    price: 230,
    eventName: 'Summer Music Festival',
    eventDate: 'July 15, 2026',
    eventTime: '10:00 PM',
    location: 'Los Angeles, CA',
    venue: 'LA Stadium',
    sellerName: 'Mike Davis',
    sellerId: 'seller3',
    eventId: '1'
  },
  't4': {
    id: 't4',
    type: 'Field',
    price: 150,
    eventName: 'Summer Music Festival',
    eventDate: 'July 15, 2026',
    eventTime: '10:00 PM',
    location: 'Los Angeles, CA',
    venue: 'LA Stadium',
    sellerName: 'John Smith',
    sellerId: 'seller1',
    eventId: '1'
  },
  't5': {
    id: 't5',
    type: 'General Admission',
    price: 95,
    eventName: 'Summer Music Festival',
    eventDate: 'July 17, 2026',
    eventTime: '10:00 PM',
    location: 'Los Angeles, CA',
    venue: 'LA Stadium',
    sellerName: 'Emma Wilson',
    sellerId: 'seller4',
    eventId: '1'
  },
  't6': {
    id: 't6',
    type: 'VIP',
    price: 245,
    eventName: 'Summer Music Festival',
    eventDate: 'July 17, 2026',
    eventTime: '10:00 PM',
    location: 'Los Angeles, CA',
    venue: 'LA Stadium',
    sellerName: 'Sarah Johnson',
    sellerId: 'seller2',
    eventId: '1'
  },
  't7': {
    id: 't7',
    type: 'VIP',
    price: 300,
    eventName: 'Bad Bunny',
    eventDate: 'July 15, 2026',
    eventTime: '4:00 PM',
    location: 'New York, NY',
    venue: 'Madison Square Garden',
    sellerName: 'John Smith',
    sellerId: 'seller1',
    eventId: '2'
  },
  't8': {
    id: 't8',
    type: 'Normal',
    price: 125,
    eventName: 'Bad Bunny',
    eventDate: 'July 15, 2026',
    eventTime: '4:00 PM',
    location: 'New York, NY',
    venue: 'Madison Square Garden',
    sellerName: 'Mike Davis',
    sellerId: 'seller3',
    eventId: '2'
  },
  't9': {
    id: 't9',
    type: 'VIP',
    price: 295,
    eventName: 'Bad Bunny',
    eventDate: 'July 15, 2026',
    eventTime: '10:00 PM',
    location: 'New York, NY',
    venue: 'Madison Square Garden',
    sellerName: 'Sarah Johnson',
    sellerId: 'seller2',
    eventId: '2'
  },
  't10': {
    id: 't10',
    type: 'Normal',
    price: 130,
    eventName: 'Bad Bunny',
    eventDate: 'July 15, 2026',
    eventTime: '10:00 PM',
    location: 'New York, NY',
    venue: 'Madison Square Garden',
    sellerName: 'Emma Wilson',
    sellerId: 'seller4',
    eventId: '2'
  },
  't11': {
    id: 't11',
    type: 'VIP',
    price: 310,
    eventName: 'Bad Bunny',
    eventDate: 'July 17, 2026',
    eventTime: '10:00 PM',
    location: 'New York, NY',
    venue: 'Madison Square Garden',
    sellerName: 'John Smith',
    sellerId: 'seller1',
    eventId: '2'
  },
  't12': {
    id: 't12',
    type: 'Normal',
    price: 135,
    eventName: 'Bad Bunny',
    eventDate: 'July 17, 2026',
    eventTime: '10:00 PM',
    location: 'New York, NY',
    venue: 'Madison Square Garden',
    sellerName: 'Mike Davis',
    sellerId: 'seller3',
    eventId: '2'
  }
};

export function BuyTicketPage() {
  const { t } = useTranslation();
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const ticket = mockTickets[ticketId as keyof typeof mockTickets];

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('buyTicket.ticketNotFound')}</h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            {t('buyTicket.returnToHome')}
          </Link>
        </div>
      </div>
    );
  }

  const handlePurchase = () => {
    // In a real app, this would create a purchase record and get a new ticket ID
    // For demo purposes, we'll use the purchased ticket ID
    const purchasedTicketId = `TKT-2026-${Math.floor(Math.random() * 900000 + 100000)}`;
    navigate(`/ticket/${purchasedTicketId}`);
  };

  const total = ticket.price * quantity;
  const serviceFee = total * 0.1;
  const grandTotal = total + serviceFee;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          to={`/event/${ticket.eventId}`}
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
                <p className="text-lg font-semibold text-gray-900">{ticket.eventName}</p>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{ticket.eventDate} at {ticket.eventTime}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>{ticket.location} - {ticket.venue}</span>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-1">{t('buyTicket.ticketType')}</p>
                <p className="text-lg font-semibold text-gray-900">{ticket.type}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">{t('buyTicket.seller')}</p>
                <Link 
                  to={`/seller/${ticket.sellerId}`}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {ticket.sellerName}
                </Link>
              </div>

              <div>
                <label className="text-sm text-gray-600 block mb-2">{t('buyTicket.quantity')}</label>
                <select 
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('buyTicket.paymentSummary')}</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-700">{t('buyTicket.ticketPrice', { quantity })}</span>
                <span className="font-semibold text-gray-900">${total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-700">{t('buyTicket.serviceFee')}</span>
                <span className="font-semibold text-gray-900">${serviceFee.toFixed(2)}</span>
              </div>

              <div className="pt-4 border-t border-gray-200 flex justify-between">
                <span className="text-lg font-bold text-gray-900">{t('buyTicket.total')}</span>
                <span className="text-2xl font-bold text-blue-600">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

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

            <button 
              onClick={handlePurchase}
              className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Ticket className="w-5 h-5" />
              {t('buyTicket.completePurchase')}
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
