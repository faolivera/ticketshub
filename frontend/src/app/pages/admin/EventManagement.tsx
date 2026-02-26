import { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../components/ui/collapsible';
import { Calendar, Check, X, Plus, Clock, MapPin, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { eventsService } from '../../../api/services/events.service';
import { adminService } from '../../../api/services/admin.service';
import type { AdminPendingEventItem, AdminPendingEventDateItem, AdminPendingSectionItem } from '../../../api/types/admin';
import type { Event, EventDate } from '../../../api/types/events';
import { EditEventModal } from './components/EditEventModal';
import { Layers } from 'lucide-react';

type RejectTarget = 
  | { type: 'event'; event: AdminPendingEventItem } 
  | { type: 'date'; event: AdminPendingEventItem; date: AdminPendingEventDateItem }
  | { type: 'section'; event: AdminPendingEventItem; section: AdminPendingSectionItem };

export function EventManagement() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<AdminPendingEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingEventDates, setEditingEventDates] = useState<EventDate[]>([]);

  const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getPendingEvents();
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const handleApproveEvent = async (eventId: string) => {
    try {
      setActionLoading(eventId);
      await eventsService.approveEvent(eventId, { approved: true });
      await fetchPendingEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveDate = async (dateId: string) => {
    try {
      setActionLoading(dateId);
      await eventsService.approveEventDate(dateId, { approved: true });
      await fetchPendingEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve date');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveSection = async (sectionId: string) => {
    try {
      setActionLoading(sectionId);
      await adminService.approveSection(sectionId, { approved: true });
      await fetchPendingEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve section');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      if (rejectTarget.type === 'event') {
        await eventsService.approveEvent(rejectTarget.event.id, {
          approved: false,
          rejectionReason,
        });
      } else if (rejectTarget.type === 'date') {
        await eventsService.approveEventDate(rejectTarget.date.id, {
          approved: false,
          rejectionReason,
        });
      } else if (rejectTarget.type === 'section') {
        await adminService.approveSection(rejectTarget.section.id, {
          approved: false,
          rejectionReason,
        });
      }
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setRejectTarget(null);
      await fetchPendingEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const openRejectEventDialog = (event: AdminPendingEventItem) => {
    setRejectTarget({ type: 'event', event });
    setIsRejectDialogOpen(true);
  };

  const openRejectDateDialog = (event: AdminPendingEventItem, date: AdminPendingEventDateItem) => {
    setRejectTarget({ type: 'date', event, date });
    setIsRejectDialogOpen(true);
  };

  const openRejectSectionDialog = (event: AdminPendingEventItem, section: AdminPendingSectionItem) => {
    setRejectTarget({ type: 'section', event, section });
    setIsRejectDialogOpen(true);
  };

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
    fetchPendingEvents();
  };

  const toggleEventExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = new Date(dateString);
    const dateFormatted = date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    if (timeString) {
      const time = new Date(timeString);
      return `${dateFormatted} at ${time.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    }
    return dateFormatted;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" /> {t('admin.events.statusPending')}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><Check className="w-3 h-3 mr-1" /> {t('admin.events.statusApproved')}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><X className="w-3 h-3 mr-1" /> {t('admin.events.statusRejected')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPendingDatesCount = (event: AdminPendingEventItem) => {
    return event.pendingDates?.length || 0;
  };

  const getPendingSectionsCount = (event: AdminPendingEventItem) => {
    return event.pendingSections?.length || 0;
  };

  const getRejectDialogTitle = () => {
    if (rejectTarget?.type === 'event') return t('admin.events.rejectTitle');
    if (rejectTarget?.type === 'date') return t('admin.events.rejectDateTitle');
    if (rejectTarget?.type === 'section') return t('admin.events.rejectSectionTitle');
    return '';
  };

  const getRejectDialogDescription = () => {
    if (rejectTarget?.type === 'event') {
      return t('admin.events.rejectDescription', { name: rejectTarget?.event?.name });
    }
    if (rejectTarget?.type === 'date') {
      return t('admin.events.rejectDateDescription', { 
        eventName: rejectTarget?.event?.name,
        date: formatDate(rejectTarget.date.date),
      });
    }
    if (rejectTarget?.type === 'section') {
      return t('admin.events.rejectSectionDescription', { 
        eventName: rejectTarget?.event?.name,
        sectionName: rejectTarget.section.name,
      });
    }
    return '';
  };

  const rejectDialogTitle = getRejectDialogTitle();
  const rejectDialogDescription = getRejectDialogDescription();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.events.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.events.subtitle')}
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('admin.events.createEvent')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('admin.events.pendingApproval')}
          </CardTitle>
          <CardDescription>
            {t('admin.events.pendingDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('admin.events.noEvents')}
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const pendingDatesCount = getPendingDatesCount(event);
                const pendingSectionsCount = getPendingSectionsCount(event);
                const isExpanded = expandedEvents.has(event.id);
                const hasPendingDates = pendingDatesCount > 0;
                const hasPendingSections = pendingSectionsCount > 0;
                const hasExpandableContent = hasPendingDates || hasPendingSections;
                
                return (
                  <Collapsible key={event.id} open={isExpanded} onOpenChange={() => toggleEventExpanded(event.id)}>
                    <div className="border rounded-lg">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {hasExpandableContent && (
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-auto">
                                  {isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            )}
                            <div>
                              <h3 className="font-semibold text-lg">{event.name}</h3>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.venue}
                                </span>
                                <Badge variant="secondary">{event.category}</Badge>
                                {hasPendingDates && (
                                  <span className="text-yellow-600">
                                    {pendingDatesCount} {t('admin.events.pendingDates')}
                                  </span>
                                )}
                                {hasPendingSections && (
                                  <span className="text-yellow-600">
                                    {pendingSectionsCount} {t('admin.events.pendingSections')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {getStatusBadge(event.status)}
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditModal(event.id)}
                                disabled={actionLoading === event.id}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                {t('common.edit')}
                              </Button>
                              {event.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => handleApproveEvent(event.id)}
                                    disabled={actionLoading === event.id}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    {t('admin.events.approve')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => openRejectEventDialog(event)}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    {t('admin.events.reject')}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {hasExpandableContent && (
                        <CollapsibleContent>
                          {hasPendingDates && (
                            <div className="border-t bg-muted/30 p-4">
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {t('admin.events.pendingDatesTitle')}
                              </h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t('admin.events.dateColumn')}</TableHead>
                                    <TableHead>{t('admin.events.status')}</TableHead>
                                    <TableHead>{t('admin.events.createdAt')}</TableHead>
                                    <TableHead className="text-right">{t('admin.events.actions')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {event.pendingDates.map((eventDate) => (
                                      <TableRow key={eventDate.id}>
                                        <TableCell className="font-medium">
                                          {formatDateTime(eventDate.date, eventDate.startTime)}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(eventDate.status)}</TableCell>
                                        <TableCell>{formatDate(eventDate.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                              onClick={() => handleApproveDate(eventDate.id)}
                                              disabled={actionLoading === eventDate.id}
                                            >
                                              <Check className="w-4 h-4 mr-1" />
                                              {t('admin.events.approve')}
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                              onClick={() => openRejectDateDialog(event, eventDate)}
                                            >
                                              <X className="w-4 h-4 mr-1" />
                                              {t('admin.events.reject')}
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}

                          {hasPendingSections && (
                            <div className="border-t bg-muted/30 p-4">
                              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                {t('admin.events.pendingSectionsTitle')}
                              </h4>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t('admin.events.sectionName')}</TableHead>
                                    <TableHead>{t('admin.events.status')}</TableHead>
                                    <TableHead>{t('admin.events.pendingListings')}</TableHead>
                                    <TableHead>{t('admin.events.createdAt')}</TableHead>
                                    <TableHead className="text-right">{t('admin.events.actions')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {event.pendingSections.map((section) => (
                                      <TableRow key={section.id}>
                                        <TableCell className="font-medium">
                                          {section.name}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(section.status)}</TableCell>
                                        <TableCell>{section.pendingListingsCount}</TableCell>
                                        <TableCell>{formatDate(section.createdAt)}</TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                              onClick={() => handleApproveSection(section.id)}
                                              disabled={actionLoading === section.id}
                                            >
                                              <Check className="w-4 h-4 mr-1" />
                                              {t('admin.events.approveSection')}
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                              onClick={() => openRejectSectionDialog(event, section)}
                                            >
                                              <X className="w-4 h-4 mr-1" />
                                              {t('admin.events.rejectSection')}
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </CollapsibleContent>
                      )}
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectDialogTitle}</DialogTitle>
            <DialogDescription>
              {rejectDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">{t('admin.events.rejectionReason')}</Label>
              <Textarea
                id="reason"
                placeholder={t('admin.events.rejectionReasonPlaceholder')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              {t('admin.events.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.events.createEventTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.events.createEventDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              {t('admin.events.createEventNote')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditEventModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        event={editingEvent}
        eventDates={editingEventDates}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}

export default EventManagement;
