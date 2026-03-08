import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Loader2, ChevronRight, HelpCircle } from 'lucide-react';
import { supportService } from '@/api/services';
import type { SupportTicket, SupportTicketStatus } from '@/api/types';
import { formatDateTimeShort } from '@/lib/format-date';

const STATUS_OPTIONS: { value: '' | SupportTicketStatus; labelKey: string }[] = [
  { value: '', labelKey: 'support.filterAllStatuses' },
  { value: 'open', labelKey: 'support.statusOpen' },
  { value: 'inProgress', labelKey: 'support.statusInProgress' },
  { value: 'waitingForCustomer', labelKey: 'support.statusWaitingForCustomer' },
  { value: 'resolved', labelKey: 'support.statusResolved' },
  { value: 'closed', labelKey: 'support.statusClosed' },
];

function statusBadgeVariant(
  status: SupportTicketStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'waitingForCustomer':
      return 'destructive';
    case 'open':
    case 'inProgress':
      return 'default';
    case 'resolved':
    case 'closed':
      return 'secondary';
    default:
      return 'outline';
  }
}

const STATUS_LABEL_KEYS: Record<SupportTicketStatus, string> = {
  open: 'support.statusOpen',
  inProgress: 'support.statusInProgress',
  waitingForCustomer: 'support.statusWaitingForCustomer',
  resolved: 'support.statusResolved',
  closed: 'support.statusClosed',
};

function sourceLabelKey(source?: string): string {
  switch (source) {
    case 'Dispute':
      return 'support.sourceDispute';
    case 'ContactFromTransaction':
      return 'support.sourceContactTransaction';
    case 'ContactForm':
      return 'support.sourceContactForm';
    default:
      return 'support.sourceContactForm';
  }
}

export function SupportListPage() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await supportService.listTickets({
        status: statusFilter || undefined,
      });
      setTickets(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('support.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('support.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('support.description')}</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Select
          value={statusFilter || '__all__'}
          onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t('support.filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || 'all'} value={opt.value || '__all__'}>
                {t(opt.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/contact">
            <HelpCircle className="w-4 h-4 mr-2" />
            {t('support.newCase')}
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!error && tickets.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">{t('support.emptyTitle')}</CardTitle>
            <CardDescription>{t('support.emptyDescription')}</CardDescription>
            <Button asChild className="mt-4 w-fit">
              <Link to="/contact">{t('support.newCase')}</Link>
            </Button>
          </CardHeader>
        </Card>
      )}

      {!error && tickets.length > 0 && (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                to={`/support/${ticket.id}`}
                className="block rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors"
              >
                <Card className="border-0 shadow-none">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h2 className="font-semibold text-base truncate">{ticket.subject}</h2>
                          <Badge variant={statusBadgeVariant(ticket.status)}>
                            {ticket.status === 'waitingForCustomer'
                              ? t('support.waitingForYou')
                              : t(STATUS_LABEL_KEYS[ticket.status])}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {t('support.lastUpdated')}: {formatDateTimeShort(ticket.updatedAt)}
                        </p>
                        {ticket.source && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t(sourceLabelKey(ticket.source))}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
