import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Star, Upload, ImageIcon, Crop } from 'lucide-react';
import { adminService } from '@/api/services/admin.service';
import { getToken } from '@/api/client';
import type { AdminAllEventItem } from '@/api/types/admin';
import { HighlightedEventsHero } from '@/app/components/home/HighlightedEventsHero';
import AvatarCropModal from '@/app/components/Avatarcropmodal';
import { cn } from '@/app/components/ui/utils';

const PAGE_SIZE = 20;

export function FeaturedEventsManagement() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<AdminAllEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [highlightedOnly, setHighlightedOnly] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cropModalEventId, setCropModalEventId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchEvents = async (pageNum: number, searchTerm: string, onlyHighlighted: boolean) => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAllEvents({
        page: pageNum,
        limit: PAGE_SIZE,
        search: searchTerm.trim() || undefined,
        highlighted: onlyHighlighted || undefined,
      });
      setEvents(data.events);
      setPage(data.page);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.featuredEvents.error'));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(1, search, highlightedOnly);
  }, [search, highlightedOnly]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchEvents(newPage, search, highlightedOnly);
  };

  const handleSetHighlight = async (eventId: string, value: boolean) => {
    try {
      setActionLoading(eventId);
      await adminService.setFeaturedEvent(eventId, { highlighted: value });
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, highlight: value } : e))
      );
    } catch {
      setError(t('admin.featuredEvents.updateError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleFileChange = async (eventId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setActionLoading(eventId);
      await adminService.uploadEventBanner(eventId, 'rectangle', file);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId ? { ...e, hasRectangleBanner: true } : e
        )
      );
    } catch {
      setError(t('admin.featuredEvents.uploadError'));
    } finally {
      setActionLoading(null);
      e.target.value = '';
    }
  };

  const handleCropSave = async (blob: Blob) => {
    if (!cropModalEventId) return;
    const file = new File([blob], 'banner-rectangle.jpg', { type: 'image/jpeg' });
    await adminService.uploadEventBanner(cropModalEventId, 'rectangle', file);
    setEvents((prev) =>
      prev.map((e) => (e.id === cropModalEventId ? { ...e, hasRectangleBanner: true } : e))
    );
  };

  const setFileInputRef = (eventId: string, el: HTMLInputElement | null) => {
    fileInputRefs.current[eventId] = el;
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return t('admin.featuredEvents.approved');
      case 'pending':
        return t('admin.featuredEvents.pending');
      case 'rejected':
        return t('admin.featuredEvents.rejected');
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <section aria-label={t('admin.featuredEvents.preview')}>
        <HighlightedEventsHero />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.featuredEvents.title')}</CardTitle>
          <CardDescription>{t('admin.featuredEvents.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder={t('admin.featuredEvents.eventName')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="max-w-xs"
              />
              <Button onClick={handleSearch} variant="secondary">
                {t('admin.featuredEvents.search')}
              </Button>
              <Button
                onClick={() => setHighlightedOnly((v) => !v)}
                variant={highlightedOnly ? 'default' : 'outline'}
              >
                <Star className={cn('h-4 w-4 mr-1', highlightedOnly && 'fill-current')} />
                {t('admin.featuredEvents.showHighlightedOnly')}
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-muted-foreground">{t('admin.featuredEvents.loading')}</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground">
              {search || highlightedOnly ? t('landing.noEventsFound') : t('landing.checkBackLater')}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.featuredEvents.eventName')}</TableHead>
                      <TableHead>{t('admin.featuredEvents.dates')}</TableHead>
                      <TableHead>{t('admin.featuredEvents.venue')}</TableHead>
                      <TableHead>{t('admin.featuredEvents.city')}</TableHead>
                      <TableHead>{t('admin.featuredEvents.status')}</TableHead>
                      <TableHead>{t('admin.featuredEvents.rectangleBanner')}</TableHead>
                      <TableHead>{t('admin.featuredEvents.highlight')}</TableHead>
                      <TableHead className="w-[220px]">{t('admin.eventBanners.uploadOrReplace')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-medium">{event.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {event.dates.length === 0
                            ? '—'
                            : event.dates.map((d) =>
                                new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
                              ).join(', ')}
                        </TableCell>
                        <TableCell className="text-sm">{event.venue}</TableCell>
                        <TableCell className="text-sm">{event.city}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              event.status === 'approved'
                                ? 'default'
                                : event.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {statusLabel(event.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {Boolean(event.hasRectangleBanner) ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <ImageIcon className="h-4 w-4" />
                              {t('admin.featuredEvents.hasRectangle')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {t('admin.featuredEvents.noRectangle')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={Boolean(event.highlight) ? 'secondary' : 'outline'}
                            onClick={() => handleSetHighlight(event.id, !Boolean(event.highlight))}
                            disabled={actionLoading === event.id}
                          >
                            {actionLoading === event.id ? (
                              t('admin.featuredEvents.updating')
                            ) : Boolean(event.highlight) ? (
                              <>
                                <Star className="h-4 w-4 fill-current mr-1" />
                                {t('admin.featuredEvents.removeFeatured')}
                              </>
                            ) : (
                              <>
                                <Star className="h-4 w-4 mr-1" />
                                {t('admin.featuredEvents.setFeatured')}
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <input
                              ref={(el) => setFileInputRef(event.id, el)}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(e) => handleFileChange(event.id, e)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fileInputRefs.current[event.id]?.click()}
                              disabled={actionLoading === event.id}
                            >
                              {actionLoading === event.id
                                ? t('admin.featuredEvents.uploading')
                                : t('admin.featuredEvents.uploadRectangle')}
                              <Upload className="h-4 w-4 ml-1" />
                            </Button>
                            {event.squareBannerUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCropModalEventId(event.id)}
                                disabled={actionLoading === event.id}
                              >
                                <Crop className="h-4 w-4 mr-1" />
                                {t('admin.featuredEvents.cropFromSquare')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t('admin.featuredEvents.eventName')}: {total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-2 text-sm">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AvatarCropModal
        open={cropModalEventId !== null}
        onClose={() => setCropModalEventId(null)}
        onSave={handleCropSave}
        imageSrc={cropModalEventId ? `/api/admin/events/${cropModalEventId}/banners/square/file` : undefined}
        fetchHeaders={getToken() ? { Authorization: `Bearer ${getToken()}` } : undefined}
        aspect={1400 / 400}
        outputWidth={1400}
        outputHeight={400}
        cropShape="rect"
      />
    </div>
  );
}
