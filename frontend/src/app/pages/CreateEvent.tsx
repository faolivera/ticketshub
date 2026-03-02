import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, FileText, Tag, Image as ImageIcon, Plus, Loader2, Upload, X } from 'lucide-react';
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
  category: string;
}

interface BannerState {
  file: File | null;
  preview: string | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface BannerUploadProps {
  label: string;
  hint: string;
  file: File | null;
  preview: string | null;
  onChange: (file: File | null) => void;
  aspectRatio: 'square' | 'rectangle';
  t: (key: string) => string;
}

function BannerUpload({ label, hint, file, preview, onChange, aspectRatio, t }: BannerUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSetFile = (selected: File) => {
    setError(null);
    
    if (selected.size > MAX_FILE_SIZE) {
      setError(t('createEvent.fileTooLarge'));
      return;
    }
    
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError(t('createEvent.invalidFileType'));
      return;
    }
    
    onChange(selected);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      validateAndSetFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const selected = e.dataTransfer.files[0];
    if (selected) {
      validateAndSetFile(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const aspectRatioClass = aspectRatio === 'square' ? 'aspect-square' : 'aspect-video';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <p className="text-sm text-gray-500">{hint}</p>
      
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          <div className={`${aspectRatioClass} w-full max-w-md overflow-hidden rounded-lg border border-gray-200`}>
            <img
              src={preview}
              alt="Banner preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="mt-2 flex items-center justify-between max-w-md">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{file?.name}</span>
              <span className="ml-2 text-gray-400">({file ? formatFileSize(file.size) : ''})</span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              {t('createEvent.remove')}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`${aspectRatioClass} w-full max-w-md border-2 border-dashed rounded-lg cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
          }`}
        >
          <div className="p-3 bg-white rounded-full shadow-sm">
            <Upload className="w-6 h-6 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-blue-600">{t('createEvent.uploadBanner')}</p>
            <p className="text-xs text-gray-500 mt-1">{t('createEvent.dragDropHint')}</p>
          </div>
          <div className="text-xs text-gray-400">
            <p>{t('createEvent.allowedFormats')}</p>
            <p>{t('createEvent.maxFileSize')}</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
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
    countryCode: 'AR',
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
    category: '',
  });

  const [squareBanner, setSquareBanner] = useState<BannerState>({ file: null, preview: null });
  const [rectangleBanner, setRectangleBanner] = useState<BannerState>({ file: null, preview: null });

  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingBanners, setIsUploadingBanners] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle banner file changes and create object URLs for previews
  const handleSquareBannerChange = (file: File | null) => {
    // Revoke old preview URL to prevent memory leaks
    if (squareBanner.preview) {
      URL.revokeObjectURL(squareBanner.preview);
    }
    setSquareBanner({
      file,
      preview: file ? URL.createObjectURL(file) : null,
    });
  };

  const handleRectangleBannerChange = (file: File | null) => {
    if (rectangleBanner.preview) {
      URL.revokeObjectURL(rectangleBanner.preview);
    }
    setRectangleBanner({
      file,
      preview: file ? URL.createObjectURL(file) : null,
    });
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (squareBanner.preview) URL.revokeObjectURL(squareBanner.preview);
      if (rectangleBanner.preview) URL.revokeObjectURL(rectangleBanner.preview);
    };
  }, []);

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
        category: mapCategoryToApi(formData.category),
        venue: formData.venue.trim(),
        location: mapLocationToAddress(formData.location),
      });

      await eventsService.addEventDate(createdEvent.id, {
        date: eventDateTime.toISOString(),
      });

      // Upload banners in parallel if provided
      const bannerUploads: Promise<unknown>[] = [];
      if (squareBanner.file) {
        bannerUploads.push(
          eventsService.uploadEventBanner(createdEvent.id, 'square', squareBanner.file)
        );
      }
      if (rectangleBanner.file) {
        bannerUploads.push(
          eventsService.uploadEventBanner(createdEvent.id, 'rectangle', rectangleBanner.file)
        );
      }

      if (bannerUploads.length > 0) {
        setIsUploadingBanners(true);
        try {
          await Promise.all(bannerUploads);
        } catch (bannerError) {
          console.error('Failed to upload banners:', bannerError);
        } finally {
          setIsUploadingBanners(false);
        }
      }

      // Navigate to sell-ticket with the new event data and selected date
      navigate('/sell-ticket', {
        state: {
          newEvent: {
            id: createdEvent.id,
            name: createdEvent.name,
            dateISO: eventDateTime.toISOString(),
            venue: createdEvent.venue,
            location: formData.location,
          },
        },
      });
    } catch (submitError) {
      console.error('Failed to create event:', submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : t('createEvent.createFailed')
      );
    } finally {
      setIsSubmitting(false);
      setIsUploadingBanners(false);
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

            {/* Event Banners */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gray-700" />
                <h3 className="text-sm font-semibold text-gray-700">{t('createEvent.banners')}</h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BannerUpload
                  label={t('createEvent.squareBanner')}
                  hint={t('createEvent.squareBannerHint')}
                  file={squareBanner.file}
                  preview={squareBanner.preview}
                  onChange={handleSquareBannerChange}
                  aspectRatio="square"
                  t={t}
                />

                <BannerUpload
                  label={t('createEvent.rectangleBanner')}
                  hint={t('createEvent.rectangleBannerHint')}
                  file={rectangleBanner.file}
                  preview={rectangleBanner.preview}
                  onChange={handleRectangleBannerChange}
                  aspectRatio="rectangle"
                  t={t}
                />
              </div>
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
                disabled={isSubmitting || isUploadingBanners}
                className="flex-1 px-6 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {(isSubmitting || isUploadingBanners) ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {isUploadingBanners 
                  ? t('createEvent.uploadingBanners') 
                  : isSubmitting 
                    ? t('common.saving') 
                    : t('createEvent.createEvent')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
