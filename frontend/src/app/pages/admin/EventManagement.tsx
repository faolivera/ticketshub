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
import { Calendar, Check, X, Plus, Clock, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { eventsService } from '../../../api/services/events.service';
import { adminService } from '../../../api/services/admin.service';
import type { AdminPendingEventItem, AdminPendingEventDateItem } from '../../../api/types/admin';

type RejectTarget = { type: 'event'; event: AdminPendingEventItem } | { type: 'date'; event: AdminPendingEventItem; date: AdminPendingEventDateItem };

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

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      if (rejectTarget.type === 'event') {
        await eventsService.approveEvent(rejectTarget.event.id, {
          approved: false,
          rejectionReason,
        });
      } else {
        await eventsService.approveEventDate(rejectTarget.date.id, {
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

  const rejectDialogTitle = rejectTarget?.type === 'event' 
    ? t('admin.events.rejectTitle')
    : t('admin.events.rejectDateTitle');
  
  const rejectDialogDescription = rejectTarget?.type === 'event'
    ? t('admin.events.rejectDescription', { name: rejectTarget?.event?.name })
    : t('admin.events.rejectDateDescription', { 
        eventName: rejectTarget?.event?.name,
        date: rejectTarget?.type === 'date' ? formatDate(rejectTarget.date.date) : '',
      });

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
                const isExpanded = expandedEvents.has(event.id);
                const hasPendingDates = pendingDatesCount > 0;
                
                return (
                  <Collapsible key={event.id} open={isExpanded} onOpenChange={() => toggleEventExpanded(event.id)}>
                    <div className="border rounded-lg">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {hasPendingDates && (
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
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            {getStatusBadge(event.status)}
                            
                            {event.status === 'pending' && (
                              <div className="flex gap-2">
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
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {hasPendingDates && (
                        <CollapsibleContent>
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
    </div>
  );
}

export default EventManagement;
