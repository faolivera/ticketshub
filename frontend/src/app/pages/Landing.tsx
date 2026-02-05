import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Shield } from 'lucide-react';
import { EventCard } from '@/app/components/EventCard';
import { useTranslation } from 'react-i18next';

const mockEvents = [
  {
    id: '1',
    name: 'Summer Music Festival',
    artist: 'Various Artists',
    location: 'Los Angeles, CA',
    venue: 'LA Stadium',
    showTimes: [
      { date: 'July 15, 2026', time: '4:00 PM' },
      { date: 'July 15, 2026', time: '10:00 PM' },
      { date: 'July 17, 2026', time: '10:00 PM' }
    ],
    ticketTypes: ['VIP', 'General Admission', 'Field'],
    labels: ['Trending', 'New Event'],
    price: 89
  },
  {
    id: '2',
    name: 'Bad Bunny',
    artist: 'Bad Bunny',
    location: 'New York, NY',
    venue: 'Madison Square Garden',
    showTimes: [
      { date: 'July 15, 2026', time: '4:00 PM' },
      { date: 'July 15, 2026', time: '10:00 PM' },
      { date: 'July 17, 2026', time: '10:00 PM' }
    ],
    ticketTypes: ['VIP', 'Normal'],
    labels: ['Trending'],
    price: 125
  },
  {
    id: '3',
    name: 'Jazz Evening',
    artist: 'Jazz Masters',
    location: 'Chicago, IL',
    venue: 'Chicago Theatre',
    showTimes: [
      { date: 'September 5, 2026', time: '7:30 PM' },
      { date: 'September 6, 2026', time: '7:30 PM' }
    ],
    ticketTypes: ['Premium', 'Standard'],
    labels: ['New Event'],
    price: 75
  },
  {
    id: '4',
    name: 'Pop Concert',
    artist: 'Pop Star',
    location: 'Miami, FL',
    venue: 'American Airlines Arena',
    showTimes: [
      { date: 'October 10, 2026', time: '9:00 PM' }
    ],
    ticketTypes: ['VIP', 'General Admission', 'Standing'],
    price: 99
  },
  {
    id: '5',
    name: 'Electronic Dance Night',
    artist: 'DJ Masters',
    location: 'Las Vegas, NV',
    venue: 'The Sphere',
    showTimes: [
      { date: 'November 1, 2026', time: '10:00 PM' },
      { date: 'November 2, 2026', time: '10:00 PM' },
      { date: 'November 3, 2026', time: '10:00 PM' },
      { date: 'November 4, 2026', time: '10:00 PM' }
    ],
    ticketTypes: ['VIP', 'GA', 'Field'],
    labels: ['Trending'],
    price: 150
  },
  {
    id: '6',
    name: 'Classical Symphony',
    artist: 'National Orchestra',
    location: 'Boston, MA',
    venue: 'Symphony Hall',
    showTimes: [
      { date: 'December 12, 2026', time: '7:00 PM' }
    ],
    ticketTypes: ['Premium', 'Standard', 'Balcony'],
    price: 60
  }
];

export function Landing() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEvents = mockEvents.filter(event =>
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-4 text-center">
            {t('landing.title')}
          </h1>
          <p className="text-xl text-center mb-4 text-blue-100">
            {t('landing.subtitle')}
          </p>
          
          <div className="flex items-center justify-center gap-2 mb-8">
            <Shield className="w-5 h-5 text-green-300" />
            <Link 
              to="/how-it-works"
              className="text-white hover:text-green-300 transition-colors font-semibold underline decoration-2 underline-offset-4"
            >
              {t('landing.securePayment')}
            </Link>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder={t('landing.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white shadow-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          {searchTerm ? t('landing.searchResults') : t('landing.upcomingEvents')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} {...event} />
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {t('landing.noEventsFound')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
