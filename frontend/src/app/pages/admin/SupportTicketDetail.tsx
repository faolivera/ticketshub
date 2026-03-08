import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { ArrowLeft, Loader2, Send, Scale } from 'lucide-react';
import { adminService } from '../../../api/services';
import type {
  AdminSupportTicketDetailResponse,
  AdminSupportMessageItem,
} from '../../../api/types/admin';
import { formatDateTimeMedium } from '@/lib/format-date';

const STATUS_OPTIONS = [
  { value: 'open', labelKey: 'admin.supportTickets.open' },
  { value: 'inProgress', labelKey: 'admin.supportTickets.inProgress' },
  { value: 'waitingForCustomer', labelKey: 'admin.supportTickets.waitingForCustomer' },
  { value: 'resolved', labelKey: 'admin.supportTickets.resolved' },
  { value: 'closed', labelKey: 'admin.supportTickets.closed' },
];

const RESOLUTION_OPTIONS = [
  { value: 'BuyerWins', labelKey: 'admin.supportTickets.buyerWins' },
  { value: 'SellerWins', labelKey: 'admin.supportTickets.sellerWins' },
  { value: 'SplitResolution', labelKey: 'admin.supportTickets.splitResolution' },
  { value: 'NoResolution', labelKey: 'admin.supportTickets.noResolution' },
];

export function SupportTicketDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<AdminSupportTicketDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [newStatus, setNewStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getSupportTicketById(id);
      setTicket(data);
      setNewStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.supportTickets.errorDetail'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleSendReply = async () => {
    if (!id || !replyText.trim()) return;
    try {
      setSendingReply(true);
      setReplyError(null);
      await adminService.addSupportTicketMessage(id, { message: replyText.trim() });
      setReplyText('');
      await fetchTicket();
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : t('admin.supportTickets.errorReply'));
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!id || newStatus === ticket?.status) return;
    try {
      setUpdatingStatus(true);
      setStatusError(null);
      await adminService.updateSupportTicketStatus(id, { status: newStatus });
      await fetchTicket();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : t('admin.supportTickets.errorUpdateStatus'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleResolve = async () => {
    if (!id || !resolution || !resolutionNotes.trim()) return;
    try {
      setResolving(true);
      setResolveError(null);
      await adminService.resolveSupportDispute(id, {
        resolution,
        resolutionNotes: resolutionNotes.trim(),
      });
      setResolveDialogOpen(false);
      setResolution('');
      setResolutionNotes('');
      await fetchTicket();
    } catch (err) {
      setResolveError(err instanceof Error ? err.message : t('admin.supportTickets.errorResolve'));
    } finally {
      setResolving(false);
    }
  };

  if (!id) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">Missing ticket ID.</p>
        <Button asChild variant="outline">
          <Link to="/admin/support-tickets">{t('admin.supportTickets.backToList')}</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <p className="text-destructive">{error ?? t('admin.supportTickets.errorDetail')}</p>
        <Button asChild variant="outline">
          <Link to="/admin/support-tickets">{t('admin.supportTickets.backToList')}</Link>
        </Button>
      </div>
    );
  }

  const isDispute = ticket.category === 'TicketDispute';
  const canResolve =
    isDispute &&
    ticket.status !== 'resolved' &&
    ticket.status !== 'closed';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/support-tickets">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('admin.supportTickets.detailTitle')}</h1>
          <p className="text-muted-foreground text-sm font-mono">{ticket.id}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{ticket.subject}</CardTitle>
            <Badge variant="outline">{ticket.status}</Badge>
            <Badge>{ticket.priority}</Badge>
            {ticket.category && <Badge variant="secondary">{ticket.category}</Badge>}
          </div>
          <CardDescription>
            {ticket.guestEmail
              ? `${t('admin.supportTickets.guest')}: ${ticket.guestName ?? ''} (${ticket.guestEmail})`
              : `${t('admin.supportTickets.user')}: ${ticket.userId ?? '—'}`}
            {ticket.transactionId && (
              <> · {t('admin.supportTickets.transaction')}: {ticket.transactionId}</>
            )}
            {' · '}
            {formatDateTimeMedium(ticket.createdAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>

          <div className="flex flex-wrap gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">{t('admin.supportTickets.updateStatus')}</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={newStatus === ticket.status || updatingStatus}
                onClick={handleUpdateStatus}
              >
                {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : t('admin.supportTickets.updateStatus')}
              </Button>
            </div>
            {statusError && <p className="text-destructive text-sm">{statusError}</p>}
            {canResolve && (
              <Button variant="outline" size="sm" onClick={() => setResolveDialogOpen(true)}>
                <Scale className="w-4 h-4 mr-1" />
                {t('admin.supportTickets.resolveDispute')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.supportTickets.messages')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {ticket.messages.map((msg: AdminSupportMessageItem) => (
              <div
                key={msg.id}
                className={`rounded-lg p-3 ${
                  msg.isAdmin ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  {msg.isAdmin ? (
                    <Badge variant="default">Admin</Badge>
                  ) : (
                    <Badge variant="outline">{t('admin.supportTickets.user')}</Badge>
                  )}
                  <span>{formatDateTimeMedium(msg.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t space-y-2">
            <Label>{t('admin.supportTickets.reply')}</Label>
            <Textarea
              placeholder={t('admin.supportTickets.replyPlaceholder')}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {replyError && <p className="text-destructive text-sm">{replyError}</p>}
            <Button
              onClick={handleSendReply}
              disabled={!replyText.trim() || sendingReply}
            >
              {sendingReply ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {sendingReply ? t('admin.supportTickets.sending') : t('admin.supportTickets.sendReply')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.supportTickets.resolveDispute')}</DialogTitle>
            <DialogDescription>
              {t('admin.supportTickets.resolution')} and {t('admin.supportTickets.resolutionNotes')}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('admin.supportTickets.resolution')}</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('admin.supportTickets.resolution')} />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(opt.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('admin.supportTickets.resolutionNotes')}</Label>
              <Textarea
                placeholder={t('admin.supportTickets.resolutionNotesPlaceholder')}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
                className="mt-1 resize-none"
              />
            </div>
            {resolveError && <p className="text-destructive text-sm">{resolveError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              {t('admin.sellerPayouts.cancel')}
            </Button>
            <Button
              onClick={handleResolve}
              disabled={!resolution || !resolutionNotes.trim() || resolving}
            >
              {resolving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {resolving ? t('admin.supportTickets.resolving') : t('admin.supportTickets.submitResolve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SupportTicketDetail;
