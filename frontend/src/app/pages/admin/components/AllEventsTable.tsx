import { useState, useEffect, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../components/ui/utils';
import {
  Calendar,
  Pencil,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { adminService } from '../../../../api/services/admin.service';
import type {
  AdminAllEventItem,
  AdminEventListingsResponse,
} from '../../../../api/types/admin';
import type { EventWithDates, EventDate } from '../../../../api/types/events';
import { eventsService } from '../../../../api/services/events.service';
import { EditEventModal } from './EditEventModal';

const ITEMS_PER_PAGE = 20;

interface AllEventsTableProps {
  onEventUpdated?: () => void;
}

export function AllEventsTable({ onEventUpdated }: AllEventsTableProps) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<AdminAllEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithDates | null>(null);
  const [editingEventDates, setEditingEventDates] = useState<EventDate[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventListings, setEventListings] = useState<
    Record<string, AdminEventListingsResponse>
  >({});
  const [loadingListings, setLoadingListings] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAllEvents({
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
      });
      setEvents(data.events);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleOpenEditModal = async (eventId: string) => {
    try {
      setActionLoading(eventId);
      const eventWithDates = await eventsService.getEvent(eventId);
      setEditingEvent(eventWithDates);
      setEditingEventDates(eventWithDates.dates || []);
      setIsEditModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event details');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditSuccess = () => {
    fetchEvents();
    onEventUpdated?.();
  };

  const handleToggleExpand = async (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      return;
    }

    setExpandedEventId(eventId);

    if (!eventListings[eventId]) {
      try {
        setLoadingListings(eventId);
        const data = await adminService.getEventListings(eventId);
        setEventListings((prev) => ({ ...prev, [eventId]: data }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch listings'
        );
        setExpandedEventId(null);
      } finally {
        setLoadingListings(null);
      }
    }
  };

  const formatDate = (dateString: string): string => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateString));
  };

  const formatPrice = (amount: number, currency: string): string => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const getListingStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge
            variant="outline"
            className="text-green-600 border-green-600"
          >
            {status}
          </Badge>
        );
      case 'sold':
        return (
          <Badge
            variant="outline"
            className="text-blue-600 border-blue-600"
          >
            {status}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge
            variant="outline"
            className="text-red-600 border-red-600"
          >
            {status}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">{t('admin.events.statusPending')}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600">{t('admin.events.statusApproved')}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600">{t('admin.events.statusRejected')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('admin.events.allEvents.title')}
          </CardTitle>
          <CardDescription>
            {t('admin.events.allEvents.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.events.allEvents.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('admin.events.allEvents.noEvents')}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.events.allEvents.eventName')}</TableHead>
                    <TableHead>{t('admin.events.allEvents.createdBy')}</TableHead>
                    <TableHead className="text-right">{t('admin.events.allEvents.listings')}</TableHead>
                    <TableHead className="text-right">{t('admin.events.allEvents.availableTickets')}</TableHead>
                    <TableHead>{t('admin.events.allEvents.status')}</TableHead>
                    <TableHead className="text-right">{t('admin.events.allEvents.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const isExpanded = expandedEventId === event.id;
                    const listings = eventListings[event.id];
                    const isLoadingThisEvent = loadingListings === event.id;

                    return (
                      <Fragment key={event.id}>
                        <TableRow>
                          <TableCell className="font-medium">
                            <button
                              type="button"
                              onClick={() => handleToggleExpand(event.id)}
                              className="flex items-center gap-2 text-left hover:text-primary transition-colors group"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                              )}
                              <span className="hover:underline">
                                {event.name}
                              </span>
                            </button>
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/seller/${event.createdBy.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {event.createdBy.publicName}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right">
                            {event.listingsCount}
                          </TableCell>
                          <TableCell className="text-right">
                            {event.availableTicketsCount}
                          </TableCell>
                          <TableCell>{getStatusBadge(event.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditModal(event.id)}
                              disabled={actionLoading === event.id}
                            >
                              <Pencil className="w-4 h-4 mr-1" />
                              {t('common.edit')}
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              className="bg-muted/30 p-0"
                            >
                              <div
                                className={cn(
                                  'overflow-hidden transition-all duration-300 ease-in-out',
                                  isExpanded
                                    ? 'max-h-[1000px] opacity-100'
                                    : 'max-h-0 opacity-0'
                                )}
                              >
                                <div className="p-4 pl-10">
                                  {isLoadingThisEvent ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                  ) : listings?.listings.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                      {t(
                                        'admin.events.allEvents.noListings'
                                      )}
                                    </div>
                                  ) : listings ? (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>
                                            {t(
                                              'admin.events.allEvents.listingsTable.listingId'
                                            )}
                                          </TableHead>
                                          <TableHead>
                                            {t(
                                              'admin.events.allEvents.listingsTable.creator'
                                            )}
                                          </TableHead>
                                          <TableHead>
                                            {t(
                                              'admin.events.allEvents.listingsTable.date'
                                            )}
                                          </TableHead>
                                          <TableHead>
                                            {t(
                                              'admin.events.allEvents.listingsTable.section'
                                            )}
                                          </TableHead>
                                          <TableHead className="text-right">
                                            {t(
                                              'admin.events.allEvents.listingsTable.totalTickets'
                                            )}
                                          </TableHead>
                                          <TableHead className="text-center">
                                            {t(
                                              'admin.events.allEvents.listingsTable.ticketStatus'
                                            )}
                                          </TableHead>
                                          <TableHead>
                                            {t(
                                              'admin.events.allEvents.listingsTable.listingStatus'
                                            )}
                                          </TableHead>
                                          <TableHead className="text-right">
                                            {t(
                                              'admin.events.allEvents.listingsTable.price'
                                            )}
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {listings.listings.map((listing) => (
                                          <TableRow key={listing.id}>
                                            <TableCell>
                                              <Link
                                                to={`/buy/${listing.id}`}
                                                className="text-blue-600 hover:text-blue-800 hover:underline font-mono text-xs"
                                              >
                                                {listing.id}
                                              </Link>
                                            </TableCell>
                                            <TableCell>
                                              <Link
                                                to={`/seller/${listing.createdBy.id}`}
                                                className="text-blue-600 hover:text-blue-800 hover:underline"
                                              >
                                                {listing.createdBy.publicName}
                                              </Link>
                                            </TableCell>
                                            <TableCell>
                                              {formatDate(listing.eventDate.date)}
                                            </TableCell>
                                            <TableCell>
                                              {listing.eventSection.name}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {listing.totalTickets}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              <span className="inline-flex items-center gap-1">
                                                <Badge
                                                  variant="outline"
                                                  className="text-green-600 border-green-600"
                                                >
                                                  {listing.ticketsByStatus.available}
                                                </Badge>
                                                <span className="text-muted-foreground">
                                                  /
                                                </span>
                                                <Badge
                                                  variant="outline"
                                                  className="text-yellow-600 border-yellow-600"
                                                >
                                                  {listing.ticketsByStatus.reserved}
                                                </Badge>
                                                <span className="text-muted-foreground">
                                                  /
                                                </span>
                                                <Badge
                                                  variant="outline"
                                                  className="text-blue-600 border-blue-600"
                                                >
                                                  {listing.ticketsByStatus.sold}
                                                </Badge>
                                              </span>
                                            </TableCell>
                                            <TableCell>
                                              {getListingStatusBadge(
                                                listing.status
                                              )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                              {formatPrice(
                                                listing.pricePerTicket.amount,
                                                listing.pricePerTicket.currency
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  ) : null}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  {t('admin.events.allEvents.showingResults', {
                    count: events.length,
                    total,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t('admin.events.allEvents.previous')}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t('admin.events.allEvents.pageInfo', { page, totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    {t('admin.events.allEvents.next')}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <EditEventModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        event={editingEvent}
        eventDates={editingEventDates}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}

export default AllEventsTable;
