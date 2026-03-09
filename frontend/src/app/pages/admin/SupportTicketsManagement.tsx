import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { MessageSquare, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { adminService } from '../../../api/services';
import type {
  AdminSupportTicketItem,
  AdminSupportTicketsResponse,
} from '../../../api/types/admin';
import { formatDateTimeMedium } from '@/lib/format-date';

const STATUS_OPTIONS = [
  { value: '', labelKey: 'admin.supportTickets.allStatuses' },
  { value: 'open', labelKey: 'admin.supportTickets.open' },
  { value: 'inProgress', labelKey: 'admin.supportTickets.inProgress' },
  { value: 'waitingForCustomer', labelKey: 'admin.supportTickets.waitingForCustomer' },
  { value: 'resolved', labelKey: 'admin.supportTickets.resolved' },
  { value: 'closed', labelKey: 'admin.supportTickets.closed' },
];

const CATEGORY_OPTIONS = [
  { value: '', labelKey: 'admin.supportTickets.allCategories' },
  { value: 'TicketDispute', labelKey: 'admin.supportTickets.ticketDispute' },
  { value: 'PaymentIssue', labelKey: 'admin.supportTickets.paymentIssue' },
  { value: 'AccountIssue', labelKey: 'admin.supportTickets.accountIssue' },
  { value: 'Other', labelKey: 'admin.supportTickets.other' },
];

const SOURCE_OPTIONS = [
  { value: '', labelKey: 'admin.supportTickets.allSources' },
  { value: 'Dispute', labelKey: 'admin.supportTickets.dispute' },
  { value: 'ContactFromTransaction', labelKey: 'admin.supportTickets.contactFromTransaction' },
  { value: 'ContactForm', labelKey: 'admin.supportTickets.contactForm' },
];

const ITEMS_PER_PAGE = 20;

function priorityColor(priority: string): string {
  switch (priority) {
    case 'urgent':
      return 'destructive';
    case 'high':
      return 'default';
    case 'medium':
      return 'secondary';
    default:
      return 'outline';
  }
}

export function SupportTicketsManagement() {
  const { t } = useTranslation();
  const [data, setData] = useState<AdminSupportTicketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.getSupportTickets({
        page,
        limit: ITEMS_PER_PAGE,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        source: sourceFilter || undefined,
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.supportTickets.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, categoryFilter, sourceFilter, t]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('admin.supportTickets.title')}</h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.supportTickets.description')}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle>{t('admin.supportTickets.filters')}</CardTitle>
          <CardDescription>
            {t('admin.supportTickets.status')}, {t('admin.supportTickets.category')},{' '}
            {t('admin.supportTickets.source')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Select
            value={statusFilter || '__all__'}
            onValueChange={(v) => { setStatusFilter(v === '__all__' ? '' : v); setPage(1); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('admin.supportTickets.status')} />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || 'all'} value={opt.value || '__all__'}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={categoryFilter || '__all__'}
            onValueChange={(v) => { setCategoryFilter(v === '__all__' ? '' : v); setPage(1); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('admin.supportTickets.category')} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || 'all'} value={opt.value || '__all__'}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sourceFilter || '__all__'}
            onValueChange={(v) => { setSourceFilter(v === '__all__' ? '' : v); setPage(1); }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('admin.supportTickets.source')} />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || 'all'} value={opt.value || '__all__'}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.supportTickets.title')}</CardTitle>
          <CardDescription>
            {data ? `Total: ${data.total} tickets` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-destructive text-sm mb-4">{error}</p>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.tickets.length ? (
            <p className="text-muted-foreground py-8 text-center">
              {t('admin.supportTickets.noTickets')}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.supportTickets.id')}</TableHead>
                    <TableHead>{t('admin.supportTickets.initiator')}</TableHead>
                    <TableHead>{t('admin.supportTickets.subject')}</TableHead>
                    <TableHead>{t('admin.supportTickets.status')}</TableHead>
                    <TableHead>{t('admin.supportTickets.priority')}</TableHead>
                    <TableHead>{t('admin.supportTickets.createdAt')}</TableHead>
                    <TableHead className="w-[100px]">{t('admin.supportTickets.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.tickets.map((ticket: AdminSupportTicketItem) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-xs">
                        {ticket.id.slice(0, 12)}…
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <span className="font-medium block">{ticket.initiatorName ?? '—'}</span>
                        <span className="text-xs text-muted-foreground block">
                          {ticket.initiatorEmail ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{ticket.subject}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{ticket.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={priorityColor(ticket.priority) as 'default'}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDateTimeMedium(ticket.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to={`/admin/support-tickets/${ticket.id}`}>
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {t('admin.supportTickets.view')}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {data.totalPages} — {data.total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="flex items-center px-2 text-sm">
                      {page} / {data.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SupportTicketsManagement;
