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
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Calendar, Check, X, Plus, Clock, MapPin } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';

interface Event {
  id: string;
  name: string;
  venue: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  dates: EventDate[];
}

interface EventDate {
  id: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

export function EventManagement() {
  const { t } = useTranslation();
  const { token } = useUser();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/events/admin/pending', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEvents();
  }, [token]);

  const handleApprove = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved: true }),
      });
      if (!response.ok) throw new Error('Failed to approve event');
      await fetchPendingEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!selectedEvent) return;
    try {
      const response = await fetch(`/api/events/${selectedEvent.id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approved: false,
          rejectionReason,
        }),
      });
      if (!response.ok) throw new Error('Failed to reject event');
      setIsRejectDialogOpen(false);
      setRejectionReason('');
      setSelectedEvent(null);
      await fetchPendingEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const openRejectDialog = (event: Event) => {
    setSelectedEvent(event);
    setIsRejectDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.events.name')}</TableHead>
                  <TableHead>{t('admin.events.venue')}</TableHead>
                  <TableHead>{t('admin.events.category')}</TableHead>
                  <TableHead>{t('admin.events.dates')}</TableHead>
                  <TableHead>{t('admin.events.status')}</TableHead>
                  <TableHead>{t('admin.events.createdAt')}</TableHead>
                  <TableHead className="text-right">{t('admin.events.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {event.venue}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{event.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {event.dates?.length || 0} {t('admin.events.datesCount')}
                    </TableCell>
                    <TableCell>{getStatusBadge(event.status)}</TableCell>
                    <TableCell>{formatDate(event.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApprove(event.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          {t('admin.events.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openRejectDialog(event)}
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
          )}
        </CardContent>
      </Card>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.events.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('admin.events.rejectDescription', { name: selectedEvent?.name })}
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
