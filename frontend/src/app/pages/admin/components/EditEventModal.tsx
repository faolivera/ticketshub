import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Checkbox } from '../../../components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Badge } from '../../../components/ui/badge';
import {
  AlertTriangle,
  Calendar,
  Layers,
  Plus,
  Trash2,
  Loader2,
  MapPin,
  Pencil,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { adminService } from '../../../../api/services/admin.service';
import { EventBanner } from '../../../components/EventBanner';
import type {
  AdminUpdateEventRequest,
  AdminEventDateUpdate,
} from '../../../../api/types/admin';
import {
  EventCategory,
  EventDateStatus,
  EventSectionStatus,
  type Event,
  type EventDate,
  type EventSection,
  type EventWithDates,
} from '../../../../api/types/events';
import type { Address } from '../../../../api/types/common';

interface EditEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventWithDates | null;
  eventDates: EventDate[];
  onSuccess: () => void;
}

interface DateFormState {
  id?: string;
  date: string;
  time: string;
  status: EventDateStatus;
  isNew?: boolean;
  isDeleted?: boolean;
}

interface SectionFormState {
  id: string;
  name: string;
  seatingType: 'numbered' | 'unnumbered';
  status: EventSectionStatus;
  isNew?: boolean;
  isDeleted?: boolean;
}

function formatDateForInput(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

function formatTimeForInput(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toTimeString().slice(0, 5);
}

export function EditEventModal({
  open,
  onOpenChange,
  event,
  eventDates,
  onSuccess,
}: EditEventModalProps) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<EventCategory>(EventCategory.Other);
  const [venue, setVenue] = useState('');
  const [location, setLocation] = useState<Address>({
    line1: '',
    city: '',
    countryCode: '',
  });
  const [dates, setDates] = useState<DateFormState[]>([]);
  const [sections, setSections] = useState<SectionFormState[]>([]);
  const [isPopular, setIsPopular] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sectionActionLoading, setSectionActionLoading] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionSeatingType, setNewSectionSeatingType] = useState<'numbered' | 'unnumbered'>('unnumbered');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Banner state
  const [bannerUrls, setBannerUrls] = useState<{ square?: string; rectangle?: string; og_image?: string }>({});
  const [bannerUploading, setBannerUploading] = useState<'square' | 'rectangle' | 'og_image' | null>(null);
  const [bannerDeleting, setBannerDeleting] = useState<'square' | 'rectangle' | 'og_image' | null>(null);
  const [isDeleteBannerDialogOpen, setIsDeleteBannerDialogOpen] = useState(false);
  const [deleteBannerType, setDeleteBannerType] = useState<'square' | 'rectangle' | 'og_image' | null>(null);
  const squareBannerInputRef = useRef<HTMLInputElement>(null);
  const rectangleBannerInputRef = useRef<HTMLInputElement>(null);
  const ogImageBannerInputRef = useRef<HTMLInputElement>(null);

  const toSeatingType = (v: string): 'numbered' | 'unnumbered' =>
    v === 'numbered' ? 'numbered' : 'unnumbered';

  useEffect(() => {
    if (event && open) {
      setName(event.name);
      setSlug(event.slug ?? '');
      setDescription(event.description);
      setCategory(event.category);
      setVenue(event.venue);
      setLocation(event.location || { line1: '', city: '', countryCode: '' });
      setDates(
        eventDates.map((d) => ({
          id: d.id,
          date: formatDateForInput(d.date),
          time: formatTimeForInput(d.date),
          status: d.status,
          isNew: false,
          isDeleted: false,
        }))
      );
      setSections(
        (event.sections || []).map((s) => ({
          id: s.id,
          name: s.name,
          seatingType: toSeatingType(s.seatingType),
          status: s.status,
          isNew: false,
          isDeleted: false,
        }))
      );
      setIsPopular(event.isPopular ?? false);
      setBannerUrls(event.bannerUrls || {});
      setError(null);
      setWarnings([]);
      setEditingSectionId(null);
      setIsAddSectionOpen(false);
      setNewSectionName('');
      setNewSectionSeatingType('unnumbered');
    }
  }, [event, eventDates, open]);

  const handleAddDate = () => {
    setDates([
      ...dates,
      {
        date: '',
        time: '',
        status: EventDateStatus.Pending,
        isNew: true,
        isDeleted: false,
      },
    ]);
  };

  const handleRemoveDate = (index: number) => {
    const dateToRemove = dates[index];
    if (dateToRemove.isNew) {
      setDates(dates.filter((_, i) => i !== index));
    } else {
      const updated = [...dates];
      updated[index] = { ...updated[index], isDeleted: true };
      setDates(updated);
    }
  };

  const handleRestoreDate = (index: number) => {
    const updated = [...dates];
    updated[index] = { ...updated[index], isDeleted: false };
    setDates(updated);
  };

  const handleDateChange = (
    index: number,
    field: keyof DateFormState,
    value: string
  ) => {
    const updated = [...dates];
    updated[index] = { ...updated[index], [field]: value };
    setDates(updated);
  };

  const handleAddSection = async () => {
    if (!event || !newSectionName.trim()) return;
    try {
      setSectionActionLoading('add');
      setError(null);
      const created = await adminService.addSection(event.id, {
        name: newSectionName.trim(),
        seatingType: newSectionSeatingType,
      });
      setSections((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          seatingType: toSeatingType(created.seatingType),
          status: created.status as EventSectionStatus,
          isNew: false,
          isDeleted: false,
        },
      ]);
      setIsAddSectionOpen(false);
      setNewSectionName('');
      setNewSectionSeatingType('unnumbered');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.events.edit.sectionAddError'));
    } finally {
      setSectionActionLoading(null);
    }
  };

  const handleUpdateSection = async (sectionId: string, name: string, seatingType: 'numbered' | 'unnumbered') => {
    try {
      setSectionActionLoading(sectionId);
      setError(null);
      const updated = await adminService.updateSection(sectionId, { name, seatingType });
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? {
                ...s,
                name: updated.name,
                seatingType: toSeatingType(updated.seatingType),
                status: updated.status as EventSectionStatus,
              }
            : s
        )
      );
      setEditingSectionId(null);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.events.edit.sectionUpdateError'));
    } finally {
      setSectionActionLoading(null);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      setSectionActionLoading(sectionId);
      setError(null);
      await adminService.deleteSection(sectionId);
      setSections((prev) => prev.filter((s) => s.id !== sectionId));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.events.edit.sectionDeleteError'));
    } finally {
      setSectionActionLoading(null);
    }
  };

  const handleSectionChange = (index: number, field: keyof SectionFormState, value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const handleBannerUpload = async (bannerType: 'square' | 'rectangle' | 'og_image', file: File) => {
    if (!event) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

    if (file.size > MAX_FILE_SIZE) {
      setError(t('createEvent.fileTooLarge'));
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('createEvent.invalidFileType'));
      return;
    }

    try {
      setBannerUploading(bannerType);
      setError(null);
      const response = await adminService.uploadEventBanner(event.id, bannerType, file);
      setBannerUrls((prev) => ({ ...prev, [bannerType]: response.url }));
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createEvent.bannerUploadFailed'));
    } finally {
      setBannerUploading(null);
    }
  };

  const handleBannerFileChange = (bannerType: 'square' | 'rectangle' | 'og_image') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleBannerUpload(bannerType, file);
    }
    e.target.value = '';
  };

  const openDeleteBannerDialog = (bannerType: 'square' | 'rectangle' | 'og_image') => {
    setDeleteBannerType(bannerType);
    setIsDeleteBannerDialogOpen(true);
  };

  const handleDeleteBanner = async () => {
    if (!event || !deleteBannerType) return;
    try {
      setBannerDeleting(deleteBannerType);
      setError(null);
      await adminService.deleteEventBanner(event.id, deleteBannerType);
      setBannerUrls((prev) => {
        const updated = { ...prev };
        delete updated[deleteBannerType];
        return updated;
      });
      setIsDeleteBannerDialogOpen(false);
      setDeleteBannerType(null);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.eventBanners.deleteBannerError'));
    } finally {
      setBannerDeleting(null);
    }
  };

  const buildDateISO = (dateStr: string, timeStr: string): string => {
    if (!dateStr) return '';
    if (!timeStr) return new Date(dateStr).toISOString();
    return new Date(`${dateStr}T${timeStr}`).toISOString();
  };

  const handleSave = async () => {
    if (!event) return;

    setSaving(true);
    setError(null);
    setWarnings([]);

    try {
      const datesToUpdate: AdminEventDateUpdate[] = dates
        .filter((d) => !d.isDeleted)
        .map((d) => ({
          id: d.isNew ? undefined : d.id,
          date: buildDateISO(d.date, d.time || '00:00'),
          status: d.status,
        }));

      const datesToDelete: string[] = dates
        .filter((d) => d.isDeleted && d.id)
        .map((d) => d.id!);

      const request: AdminUpdateEventRequest = {
        name,
        ...(slug.trim() && { slug: slug.trim() }),
        description,
        category,
        venue,
        location,
        isPopular,
        dates: datesToUpdate,
        datesToDelete: datesToDelete.length > 0 ? datesToDelete : undefined,
      };

      const response = await adminService.updateEvent(event.id, request);

      if (response.warnings && response.warnings.length > 0) {
        setWarnings(response.warnings);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.events.edit.error'));
    } finally {
      setSaving(false);
    }
  };

  const visibleDates = dates.filter((d) => !d.isDeleted);
  const deletedDates = dates.filter((d) => d.isDeleted);

  const getStatusBadgeVariant = (status: EventDateStatus) => {
    switch (status) {
      case EventDateStatus.Approved:
        return 'default';
      case EventDateStatus.Pending:
        return 'secondary';
      case EventDateStatus.Rejected:
        return 'destructive';
      case EventDateStatus.Cancelled:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-6 pb-4 flex-shrink-0">
          <DialogTitle>{t('admin.events.edit.title')}</DialogTitle>
          <DialogDescription>
            {event?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          <div className="space-y-6 pb-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('common.error')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('admin.events.edit.warnings')}</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('admin.events.edit.eventDetails')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('admin.events.edit.name')}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">{t('admin.events.edit.slug')}</Label>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="event-name-venue-id"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('admin.events.edit.slugHint')}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="category">{t('admin.events.edit.category')}</Label>
                    <Select
                      value={category}
                      onValueChange={(value) => setCategory(value as EventCategory)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(EventCategory).map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t('admin.events.edit.description')}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue">{t('admin.events.edit.venue')}</Label>
                  <Input
                    id="venue"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPopular"
                    checked={isPopular}
                    onCheckedChange={(checked) => setIsPopular(checked === true)}
                  />
                  <Label htmlFor="isPopular" className="cursor-pointer font-normal">
                    {t('admin.events.edit.isPopular')}
                  </Label>
                </div>

                <div className="space-y-3">
                  <Label>{t('admin.events.edit.location')}</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="street" className="text-xs text-muted-foreground">
                        {t('admin.events.edit.street')}
                      </Label>
                      <Input
                        id="street"
                        value={location.line1}
                        onChange={(e) =>
                          setLocation({ ...location, line1: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-xs text-muted-foreground">
                        {t('admin.events.edit.city')}
                      </Label>
                      <Input
                        id="city"
                        value={location.city}
                        onChange={(e) =>
                          setLocation({ ...location, city: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-xs text-muted-foreground">
                        {t('admin.events.edit.state')}
                      </Label>
                      <Input
                        id="state"
                        value={location.state || ''}
                        onChange={(e) =>
                          setLocation({ ...location, state: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-xs text-muted-foreground">
                        {t('admin.events.edit.country')}
                      </Label>
                      <Input
                        id="country"
                        value={location.countryCode}
                        onChange={(e) =>
                          setLocation({ ...location, countryCode: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="zipCode" className="text-xs text-muted-foreground">
                        {t('admin.events.edit.zipCode')}
                      </Label>
                      <Input
                        id="zipCode"
                        value={location.postalCode || ''}
                        onChange={(e) =>
                          setLocation({ ...location, postalCode: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Banners Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  {t('admin.eventBanners.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!bannerUrls.square && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{t('common.error')}</AlertTitle>
                    <AlertDescription>
                      {t('admin.eventBanners.squareBannerRequired')}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Square Banner */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t('createEvent.squareBanner')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('createEvent.squareBannerHint')}
                    </p>
                    <input
                      ref={squareBannerInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleBannerFileChange('square')}
                      className="hidden"
                    />
                    {bannerUrls.square ? (
                      <div className="space-y-2">
                        <div className="aspect-square w-full max-w-[200px] overflow-hidden rounded-lg border">
                          <EventBanner
                            variant="square"
                            squareUrl={bannerUrls.square}
                            alt={name}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => squareBannerInputRef.current?.click()}
                            disabled={bannerUploading === 'square'}
                          >
                            {bannerUploading === 'square' ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-1" />
                            )}
                            {t('admin.eventBanners.uploadOrReplace')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteBannerDialog('square')}
                            disabled={bannerDeleting === 'square'}
                          >
                            {bannerDeleting === 'square' ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            {t('admin.eventBanners.deleteBanner')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => squareBannerInputRef.current?.click()}
                        className="aspect-square w-full max-w-[200px] border-2 border-dashed rounded-lg cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-muted/30 hover:bg-muted/50 hover:border-primary/50"
                      >
                        {bannerUploading === 'square' ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {t('admin.eventBanners.noBannerUploaded')}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rectangle Banner */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t('createEvent.rectangleBanner')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('createEvent.rectangleBannerHint')}
                    </p>
                    <input
                      ref={rectangleBannerInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleBannerFileChange('rectangle')}
                      className="hidden"
                    />
                    {bannerUrls.rectangle ? (
                      <div className="space-y-2">
                        <div className="aspect-video w-full max-w-[300px] overflow-hidden rounded-lg border">
                          <EventBanner
                            variant="rectangle"
                            squareUrl={bannerUrls.square}
                            rectangleUrl={bannerUrls.rectangle}
                            alt={name}
                            className="w-full h-full"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => rectangleBannerInputRef.current?.click()}
                            disabled={bannerUploading === 'rectangle'}
                          >
                            {bannerUploading === 'rectangle' ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-1" />
                            )}
                            {t('admin.eventBanners.uploadOrReplace')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteBannerDialog('rectangle')}
                            disabled={bannerDeleting === 'rectangle'}
                          >
                            {bannerDeleting === 'rectangle' ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            {t('admin.eventBanners.deleteBanner')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => rectangleBannerInputRef.current?.click()}
                        className="aspect-video w-full max-w-[300px] border-2 border-dashed rounded-lg cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-muted/30 hover:bg-muted/50 hover:border-primary/50"
                      >
                        {bannerUploading === 'rectangle' ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {t('admin.eventBanners.noBannerUploaded')}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* OG Image (social sharing) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      {t('createEvent.ogImageBanner')}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t('createEvent.ogImageBannerHint')}
                    </p>
                    <input
                      ref={ogImageBannerInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleBannerFileChange('og_image')}
                      className="hidden"
                    />
                    {bannerUrls.og_image ? (
                      <div className="space-y-2">
                        <div className="aspect-[1200/630] w-full max-w-[300px] overflow-hidden rounded-lg border">
                          <img
                            src={bannerUrls.og_image}
                            alt="OG"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => ogImageBannerInputRef.current?.click()}
                            disabled={bannerUploading === 'og_image'}
                          >
                            {bannerUploading === 'og_image' ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-1" />
                            )}
                            {t('admin.eventBanners.uploadOrReplace')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteBannerDialog('og_image')}
                            disabled={bannerDeleting === 'og_image'}
                          >
                            {bannerDeleting === 'og_image' ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            {t('admin.eventBanners.deleteBanner')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => ogImageBannerInputRef.current?.click()}
                        className="aspect-[1200/630] w-full max-w-[300px] border-2 border-dashed rounded-lg cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-muted/30 hover:bg-muted/50 hover:border-primary/50"
                      >
                        {bannerUploading === 'og_image' ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {t('admin.eventBanners.noBannerUploaded')}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('admin.events.edit.eventDates')}
                  </span>
                  <Button size="sm" variant="outline" onClick={handleAddDate}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('admin.events.edit.addDate')}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {visibleDates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('admin.events.noEvents')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {dates.map((dateItem, index) => {
                      if (dateItem.isDeleted) return null;

                      return (
                        <div
                          key={dateItem.id || `new-${index}`}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {dateItem.isNew ? (
                                <Badge variant="secondary">New</Badge>
                              ) : (
                                <Badge variant={getStatusBadgeVariant(dateItem.status)}>
                                  {dateItem.status}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveDate(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                {t('admin.events.edit.date')}
                              </Label>
                              <Input
                                type="date"
                                value={dateItem.date}
                                onChange={(e) =>
                                  handleDateChange(index, 'date', e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                {t('admin.events.edit.time')}
                              </Label>
                              <Input
                                type="time"
                                value={dateItem.time}
                                onChange={(e) =>
                                  handleDateChange(index, 'time', e.target.value)
                                }
                              />
                            </div>
                          </div>

                          {!dateItem.isNew && (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground">
                                {t('admin.events.edit.status')}
                              </Label>
                              <Select
                                value={dateItem.status}
                                onValueChange={(value) =>
                                  handleDateChange(index, 'status', value)
                                }
                              >
                                <SelectTrigger className="w-full sm:w-48">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.values(EventDateStatus).map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {deletedDates.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {t('admin.events.edit.confirmDeleteDate')}
                    </p>
                    <div className="space-y-2">
                      {dates.map((dateItem, index) => {
                        if (!dateItem.isDeleted) return null;

                        return (
                          <div
                            key={dateItem.id}
                            className="flex items-center justify-between p-2 bg-muted/50 rounded"
                          >
                            <span className="text-sm line-through text-muted-foreground">
                              {dateItem.date}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRestoreDate(index)}
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    {t('admin.events.edit.eventSections')}
                  </span>
                  {!isAddSectionOpen ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddSectionOpen(true)}
                      disabled={sectionActionLoading !== null}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('admin.events.edit.addSection')}
                    </Button>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isAddSectionOpen && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <p className="text-sm font-medium">{t('admin.events.edit.newSection')}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          {t('admin.events.sectionNameLabel')}
                        </Label>
                        <Input
                          value={newSectionName}
                          onChange={(e) => setNewSectionName(e.target.value)}
                          placeholder={t('admin.events.sectionNamePlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          {t('admin.events.sectionSeatingType')}
                        </Label>
                        <Select
                          value={newSectionSeatingType}
                          onValueChange={(v) => setNewSectionSeatingType(v as 'numbered' | 'unnumbered')}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unnumbered">
                              {t('sellTicket.generalAdmission')}
                            </SelectItem>
                            <SelectItem value="numbered">
                              {t('sellTicket.numberedSeating')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddSection}
                        disabled={!newSectionName.trim() || sectionActionLoading === 'add'}
                      >
                        {sectionActionLoading === 'add' ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        {t('admin.events.addSection')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsAddSectionOpen(false);
                          setNewSectionName('');
                          setNewSectionSeatingType('unnumbered');
                        }}
                        disabled={sectionActionLoading === 'add'}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                )}

                {sections.length === 0 && !isAddSectionOpen ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('admin.events.edit.noSections')}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {sections.map((section, index) => (
                      <div
                        key={section.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        {editingSectionId === section.id ? (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                  {t('admin.events.sectionNameLabel')}
                                </Label>
                                <Input
                                  value={section.name}
                                  onChange={(e) =>
                                    handleSectionChange(index, 'name', e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                  {t('admin.events.sectionSeatingType')}
                                </Label>
                                <Select
                                  value={section.seatingType}
                                  onValueChange={(v) =>
                                    handleSectionChange(index, 'seatingType', v)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unnumbered">
                                      {t('sellTicket.generalAdmission')}
                                    </SelectItem>
                                    <SelectItem value="numbered">
                                      {t('sellTicket.numberedSeating')}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleUpdateSection(
                                    section.id,
                                    section.name,
                                    section.seatingType
                                  )
                                }
                                disabled={
                                  !section.name.trim() ||
                                  sectionActionLoading === section.id
                                }
                              >
                                {sectionActionLoading === section.id ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : null}
                                {t('admin.events.edit.saveSection')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSectionId(null)}
                                disabled={sectionActionLoading === section.id}
                              >
                                {t('common.cancel')}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{section.status}</Badge>
                                <span className="font-medium">{section.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  ({t(section.seatingType === 'numbered' ? 'sellTicket.numberedSeating' : 'sellTicket.generalAdmission')})
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingSectionId(section.id)}
                                  disabled={sectionActionLoading !== null}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleDeleteSection(section.id)}
                                  disabled={sectionActionLoading !== null}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 p-6 pt-4 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('admin.events.edit.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('admin.events.edit.saving')}
              </>
            ) : (
              t('admin.events.edit.save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Delete Banner Confirmation Dialog */}
      <Dialog open={isDeleteBannerDialogOpen} onOpenChange={setIsDeleteBannerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.eventBanners.deleteBanner')}</DialogTitle>
            <DialogDescription>
              {t('admin.eventBanners.confirmDeleteBanner')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteBannerDialogOpen(false)}
              disabled={bannerDeleting !== null}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteBanner}
              disabled={bannerDeleting !== null}
            >
              {bannerDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export default EditEventModal;
