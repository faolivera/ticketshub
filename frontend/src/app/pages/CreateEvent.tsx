import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, FileText, Tag, Image as ImageIcon, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorAlert } from '@/app/components/ErrorMessage';
import { eventsService } from '@/api/services/events.service';
import { EventCategory } from '@/api/types';

interface EventData {
  name: string;
  date: string;
  time: string;
  venue: string;
  location: string;
  description: string;
  category: string;
  imageUrl: string;
}

const eventCategories = [
  'Music',
  'Sports',
  'Theater',
  'Comedy',
  'Arts',
  'Family',
  'Festival',
  'Conference',
  'Other'
];

const categoryToApiMap: Record<string, EventCategory> = {
  music: EventCategory.Concert,
  sports: EventCategory.Sports,
  theater: EventCategory.Theater,
  comedy: EventCategory.Comedy,
  arts: EventCategory.Other,
  family: EventCategory.Other,
  festival: EventCategory.Festival,
  conference: EventCategory.Conference,
  other: EventCategory.Other,
};

function mapCategoryToApi(category: string): EventCategory {
  const normalized = category.trim().toLowerCase();
  return categoryToApiMap[normalized] ?? EventCategory.Other;
}

function mapLocationToAddress(location: string): { line1: string; city: string; countryCode: string } {
  const normalized = location.trim();
  const city = normalized.split(',')[0]?.trim() || 'Unknown';
  return {
    line1: normalized,
    city,
    countryCode: 'US',
  };
}

export function CreateEvent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const fromSellTicket = location.state?.fromSellTicket;

  const [formData, setFormData] = useState<EventData>({
    name: '',
    date: '',
    time: '',
    venue: '',
    location: '',
    description: '',
    category: '',
    imageUrl: ''
  });

  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.date || !formData.time || !formData.venue || !formData.location) {
      setError(t('createEvent.pleaseCompleteRequiredFields'));
      return;
    }

    const eventDateTime = new Date(`${formData.date}T${formData.time}:00`);
    if (Number.isNaN(eventDateTime.getTime())) {
      setError(t('createEvent.invalidDateTime'));
      return;
    }

    try {
      setIsSubmitting(true);

      const createdEvent = await eventsService.createEvent({
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: mapCategoryToApi(formData.category),
        venue: formData.venue.trim(),
        location: mapLocationToAddress(formData.location),
      });

      await eventsService.addEventDate(createdEvent.id, {
        date: eventDateTime.toISOString(),
      });

      alert(t('createEvent.eventCreatedSuccess'));

      // If coming from sell ticket page, redirect back with the event info
      if (fromSellTicket) {
        navigate('/sell-ticket', {
          state: {
            newEvent: {
              id: createdEvent.id,
              name: createdEvent.name,
              date: `${formData.date} at ${formData.time}`,
              venue: createdEvent.venue,
              location: formData.location,
            },
          },
        });
      } else {
        navigate('/');
      }
    } catch (submitError) {
      console.error('Failed to create event:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('createEvent.createFailed')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomCategory(true);
      setFormData({ ...formData, category: '' });
    } else {
      setShowCustomCategory(false);
      setFormData({ ...formData, category: value });
    }
  };

  const handleAddCustomCategory = () => {
    if (customCategory.trim()) {
      setFormData({ ...formData, category: customCategory.trim() });
      setShowCustomCategory(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          to={fromSellTicket ? '/sell-ticket' : '/'}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {fromSellTicket ? t('createEvent.backToSellTicket') : t('createEvent.backToHome')}
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <Plus className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">{t('createEvent.title')}</h1>
          </div>

          <p className="text-gray-600 mb-8">
            {t('createEvent.subtitle')}
          </p>

          {error && (
            <ErrorAlert message={error} className="mb-6" />
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t('createEvent.eventName')} <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('createEvent.eventNamePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t('createEvent.eventDate')} <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t('createEvent.eventTime')} <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t('createEvent.venue')} <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                placeholder={t('createEvent.venuePlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t('createEvent.location')} <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder={t('createEvent.locationPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">{t('createEvent.locationHint')}</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  {t('createEvent.category')}
                </div>
              </label>
              
              {!showCustomCategory ? (
                <select
                  value={formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{t('createEvent.selectCategory')}</option>
                  {eventCategories.map((category) => (
                    <option key={category} value={category}>
                      {t(`createEvent.categories.${category.toLowerCase()}`)}
                    </option>
                  ))}
                  <option value="custom">+ {t('createEvent.addCustomCategory')}</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder={t('createEvent.enterCustomCategory')}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomCategory(false);
                      setCustomCategory('');
                    }}
                    className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {t('createEvent.description')}
                </div>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('createEvent.descriptionPlaceholder')}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Event Image URL */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {t('createEvent.imageUrl')}
                </div>
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder={t('createEvent.imageUrlPlaceholder')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">{t('createEvent.imageUrlHint')}</p>
              
              {formData.imageUrl && (
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('createEvent.imagePreview')}</p>
                  <img 
                    src={formData.imageUrl} 
                    alt="Event preview" 
                    className="w-full max-w-md h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Preview Summary */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('createEvent.eventSummary')}</h3>
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600">{t('createEvent.eventName')}:</span>
                  <p className="font-semibold text-gray-900">{formData.name || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">{t('createEvent.dateTime')}:</span>
                  <p className="font-semibold text-gray-900">
                    {formData.date && formData.time 
                      ? `${new Date(formData.date).toLocaleDateString()} ${t('createEvent.at')} ${formData.time}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">{t('createEvent.venueLocation')}:</span>
                  <p className="font-semibold text-gray-900">
                    {formData.venue && formData.location 
                      ? `${formData.venue}, ${formData.location}`
                      : '-'}
                  </p>
                </div>
                {formData.category && (
                  <div>
                    <span className="text-sm text-gray-600">{t('createEvent.category')}:</span>
                    <p className="font-semibold text-gray-900">{formData.category}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(fromSellTicket ? '/sell-ticket' : '/')}
                className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {isSubmitting ? t('common.saving') : t('createEvent.createEvent')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
