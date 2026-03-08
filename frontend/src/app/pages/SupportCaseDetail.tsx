import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Textarea } from '@/app/components/ui/textarea';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { supportService } from '@/api/services';
import type { SupportTicketWithMessages, SupportMessage } from '@/api/types';
import { formatDateTimeMedium } from '@/lib/format-date';

const STATUS_LABEL_KEYS: Record<string, string> = {
  open: 'support.statusOpen',
  inProgress: 'support.statusInProgress',
  waitingForCustomer: 'support.statusWaitingForCustomer',
  resolved: 'support.statusResolved',
  closed: 'support.statusClosed',
};

export function SupportCaseDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<SupportTicketWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await supportService.getTicket(id);
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('support.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const handleSendReply = async () => {
    if (!id || !replyText.trim()) return;
    try {
      setSendingReply(true);
      setReplyError(null);
      await supportService.addMessage(id, { message: replyText.trim() });
      setReplyText('');
      await fetchTicket();
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : t('support.errorReply'));
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!id) return;
    try {
      setClosing(true);
      setCloseError(null);
      await supportService.closeTicket(id);
      await fetchTicket();
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : t('support.errorClose'));
    } finally {
      setClosing(false);
    }
  };

  const isOpen = ticket?.status !== 'closed' && ticket?.status !== 'resolved';
  const canReply = isOpen && ticket;

  if (!id) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-destructive">{t('support.errorLoad')}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/support">{t('support.backToList')}</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <p className="text-destructive">{error ?? t('support.errorLoad')}</p>
        <Button asChild variant="outline">
          <Link to="/support">{t('support.backToList')}</Link>
        </Button>
      </div>
    );
  }

  const statusLabel =
    ticket.status === 'waitingForCustomer'
      ? t('support.waitingForYou')
      : t(STATUS_LABEL_KEYS[ticket.status] ?? ticket.status);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/support" className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground font-mono truncate">{ticket.id}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{t('support.detailTitle')}</CardTitle>
            <Badge
              variant={
                ticket.status === 'waitingForCustomer'
                  ? 'destructive'
                  : ticket.status === 'closed' || ticket.status === 'resolved'
                    ? 'secondary'
                    : 'default'
              }
            >
              {statusLabel}
            </Badge>
          </div>
          <CardDescription>
            {t('support.lastUpdated')}: {formatDateTimeMedium(ticket.updatedAt)}
            {ticket.transactionId && (
              <> · {t('support.linkedTransaction')}: {ticket.transactionId}</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('support.messages')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {(ticket.messages ?? []).map((msg: SupportMessage) => (
              <div
                key={msg.id}
                className={`rounded-lg p-3 ${
                  msg.isAdmin
                    ? 'bg-primary/10 border border-primary/20 ml-0 mr-4 sm:mr-8'
                    : 'bg-muted/50 mr-0 ml-4 sm:ml-8'
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Badge variant={msg.isAdmin ? 'default' : 'outline'} className="text-xs">
                    {msg.isAdmin ? t('support.fromSupport') : t('support.you')}
                  </Badge>
                  <span>{formatDateTimeMedium(msg.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
          </div>
          <div ref={messagesEndRef} />

          {canReply && (
            <div className="pt-4 border-t space-y-2">
              <Textarea
                placeholder={t('support.replyPlaceholder')}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="resize-none min-h-[80px]"
              />
              {replyError && (
                <p className="text-destructive text-sm">{replyError}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="min-h-[44px]"
                >
                  {sendingReply ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  {sendingReply ? t('support.sending') : t('support.send')}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseTicket}
                  disabled={closing}
                  className="min-h-[44px]"
                >
                  {closing ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {t('support.closeCase')}
                </Button>
              </div>
              {closeError && <p className="text-destructive text-sm">{closeError}</p>}
            </div>
          )}

          {(ticket.status === 'closed' || ticket.status === 'resolved') && (
            <p className="text-sm text-muted-foreground pt-2">{t('support.caseClosed')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
