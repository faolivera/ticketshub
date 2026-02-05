import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Ticket, DollarSign, Save, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface ListedTicket {
  id: string;
  eventName: string;
  eventImage: string;
  ticketType: string;
  eventDate: string;
  eventTime: string;
  listPrice: number;
  isActive: boolean;
  views: number;
  listedDate: string;
}

// Mock data - in a real app this would come from an API/database
const mockListedTickets: Record<string, ListedTicket> = {
  '5': {
    id: '5',
    eventName: 'Football Championship',
    eventImage: 'https://images.unsplash.com/photo-1764050359179-517599dab87b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcG9ydHMlMjBzdGFkaXVtJTIwZXZlbnR8ZW58MXx8fHwxNzY5MzU4NzI2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    ticketType: 'VIP Box',
    eventDate: 'June 10, 2026',
    eventTime: '3:00 PM',
    listPrice: 300,
    isActive: true,
    views: 42,
    listedDate: 'January 10, 2026'
  },
  '6': {
    id: '6',
    eventName: 'Theater Spectacular',
    eventImage: 'https://images.unsplash.com/photo-1764936394584-c4a66ac31e00?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aGVhdGVyJTIwcGVyZm9ybWFuY2UlMjBzdGFnZXxlbnwxfHx8fDE3NjkzNTUyOTd8MA&ixlib=rb-4.1.0&q=80&w=1080',
    ticketType: 'Orchestra',
    eventDate: 'May 22, 2026',
    eventTime: '7:30 PM',
    listPrice: 180,
    isActive: true,
    views: 28,
    listedDate: 'January 12, 2026'
  },
  '7': {
    id: '7',
    eventName: 'Rock Night',
    eventImage: 'https://images.unsplash.com/photo-1723902701334-08b0fe53ff4c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb2NrJTIwY29uY2VydCUyMHN0YWdlfGVufDF8fHx8MTc2OTM1MzMyM3ww&ixlib=rb-4.1.0&q=80&w=1080',
    ticketType: 'VIP',
    eventDate: 'August 20, 2026',
    eventTime: '8:00 PM',
    listPrice: 200,
    isActive: false,
    views: 15,
    listedDate: 'January 19, 2026'
  }
};

export function EditListing() {
  const { t } = useTranslation();
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();

  const listing = listingId ? mockListedTickets[listingId] : null;

  const [price, setPrice] = useState(listing?.listPrice.toString() || '');
  const [isActive, setIsActive] = useState(listing?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('editListing.listingNotFound')}
          </h2>
          <Link to="/my-tickets" className="text-blue-600 hover:text-blue-700">
            {t('editListing.backToMyTickets')}
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    navigate('/my-tickets');
  };

  const priceValue = parseFloat(price) || 0;
  const isValidPrice = priceValue > 0;

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
            <div className="relative h-64 bg-gray-200">
              <ImageWithFallback
                src={listing.eventImage}
                alt={listing.eventName}
                className="w-full h-full object-cover"
              />
              {/* Active/Inactive Badge */}
              <div className="absolute top-4 right-4">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm bg-opacity-95 ${
                    isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {isActive ? t('editListing.active') : t('editListing.inactive')}
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
                    {listing.ticketType}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('editListing.eventDateTime')}
                  </label>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Calendar className="w-4 h-4" />
                    <span>{listing.eventDate} • {listing.eventTime}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('editListing.listedSince')}
                  </label>
                  <p className="text-gray-900">{listing.listedDate}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    {t('editListing.totalViews')}
                  </label>
                  <p className="text-gray-900">{listing.views} {t('boughtTickets.views')}</p>
                </div>
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
                    />
                  </div>
                  {!isValidPrice && price !== '' && (
                    <p className="mt-1 text-sm text-red-600">{t('editListing.enterValidPrice')}</p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {t('editListing.priceDescription')}
                  </p>
                </div>

                {/* Active/Inactive Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {t('editListing.listingStatus')}
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsActive(true)}
                      className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                        isActive
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Eye className="w-5 h-5" />
                        {t('editListing.active')}
                      </div>
                    </button>
                    <button
                      onClick={() => setIsActive(false)}
                      className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                        !isActive
                          ? 'bg-gray-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <EyeOff className="w-5 h-5" />
                        {t('editListing.inactive')}
                      </div>
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {isActive
                      ? t('editListing.activeDescription')
                      : t('editListing.inactiveDescription')
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                onClick={handleSave}
                disabled={!isValidPrice || isSaving}
                className={`w-full py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                  !isValidPrice || isSaving
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Save className="w-5 h-5" />
                {isSaving ? t('editListing.saving') : t('editListing.saveChanges')}
              </button>

              {!isActive && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    {t('editListing.inactiveWarning')}
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
