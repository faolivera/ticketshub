import { Fragment, type ReactNode, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Input } from '../../components/ui/input';
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
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Eye,
  FileText,
  Image,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { adminService, paymentConfirmationsService } from '../../../api/services';
import type {
  AdminTransactionDetailResponse,
  AdminTransactionListItem,
  AdminTransactionPaymentConfirmation,
  AdminTransactionsPendingSummaryResponse,
} from '../../../api/types/admin';

const ITEMS_PER_PAGE = 20;

export default function TransactionManagement() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const openIdParam = searchParams.get('open');

  const [transactions, setTransactions] = useState<AdminTransactionListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pendingSummary, setPendingSummary] =
    useState<AdminTransactionsPendingSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(openIdParam);
  const [detailCache, setDetailCache] = useState<
    Record<string, AdminTransactionDetailResponse>
  >({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const [processingConfirmationId, setProcessingConfirmationId] = useState<string | null>(
    null,
  );
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<{
    transactionId: string;
    confirmation: AdminTransactionPaymentConfirmation;
  } | null>(null);

  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTransactionId, setPreviewTransactionId] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchSummary = useCallback(async (): Promise<void> => {
    try {
      setSummaryLoading(true);
      const data = await adminService.getTransactionsPendingSummary();
      setPendingSummary(data);
    } catch {
      setPendingSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getTransactions({
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
      });
      setTransactions(data.transactions);
      setTotal(data.total);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, t]);

  const loadDetail = useCallback(
    async (transactionId: string): Promise<void> => {
      if (detailCache[transactionId]) {
        return;
      }

      try {
        setDetailLoading(transactionId);
        const detail = await adminService.getTransactionById(transactionId);
        setDetailCache((prev) => ({ ...prev, [transactionId]: detail }));
      } catch (err) {
        setError(err instanceof Error ? err.message : t('common.errorLoading'));
      } finally {
        setDetailLoading(null);
      }
    },
    [detailCache, t],
  );

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!openIdParam) return;
    setExpandedId(openIdParam);
    void loadDetail(openIdParam);
  }, [loadDetail, openIdParam]);

  const refreshAfterReview = useCallback(
    async (transactionId: string): Promise<void> => {
      const [detail] = await Promise.all([
        adminService.getTransactionById(transactionId),
        fetchSummary(),
        fetchTransactions(),
      ]);
      setDetailCache((prev) => ({ ...prev, [transactionId]: detail }));
    },
    [fetchSummary, fetchTransactions],
  );

  const handleToggleExpand = async (transactionId: string): Promise<void> => {
    if (expandedId === transactionId) {
      setExpandedId(null);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('open');
        return next;
      });
      return;
    }

    setExpandedId(transactionId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('open', transactionId);
      return next;
    });

    await loadDetail(transactionId);
  };

  const handleApprove = async (
    transactionId: string,
    confirmationId: string,
  ): Promise<void> => {
    try {
      setProcessingConfirmationId(confirmationId);
      await paymentConfirmationsService.updateStatus(confirmationId, 'Accepted');
      await refreshAfterReview(transactionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    } finally {
      setProcessingConfirmationId(null);
    }
  };

  const openRejectDialog = (
    transactionId: string,
    confirmation: AdminTransactionPaymentConfirmation,
  ): void => {
    setRejectTarget({ transactionId, confirmation });
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async (): Promise<void> => {
    if (!rejectTarget) return;
    try {
      setProcessingConfirmationId(rejectTarget.confirmation.id);
      await paymentConfirmationsService.updateStatus(
        rejectTarget.confirmation.id,
        'Rejected',
        rejectionReason || undefined,
      );
      await refreshAfterReview(rejectTarget.transactionId);
      setRejectDialogOpen(false);
      setRejectTarget(null);
      setRejectionReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.errorLoading'));
    } finally {
      setProcessingConfirmationId(null);
    }
  };

  const openPreview = async (transactionId: string): Promise<void> => {
    try {
      setPreviewDialogOpen(true);
      setPreviewLoading(true);
      setPreviewTransactionId(transactionId);
      setPreviewBlobUrl(null);
      const blobUrl = await paymentConfirmationsService.getFileBlobUrl(transactionId);
      setPreviewBlobUrl(blobUrl);
    } catch {
      setPreviewBlobUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = (): void => {
    setPreviewDialogOpen(false);
    setPreviewTransactionId(null);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
    }
    setPreviewBlobUrl(null);
  };

  const getStatusBadge = (status: string): ReactNode => {
    const statusLabels: Record<string, string> = {
      PendingPayment: t('admin.transactions.statusPendingPayment'),
      PaymentReceived: t('admin.transactions.statusPaymentReceived'),
      TicketTransferred: t('admin.transactions.statusTicketTransferred'),
      Completed: t('admin.transactions.statusCompleted'),
      Cancelled: t('admin.transactions.statusCancelled'),
      Refunded: t('admin.transactions.statusRefunded'),
      Disputed: t('admin.transactions.statusDisputed'),
    };
    const label = statusLabels[status] ?? status;
    if (status.includes('Pending') || status === 'PendingPayment') {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          {label}
        </Badge>
      );
    }
    if (status === 'Completed' || status === 'PaymentReceived' || status === 'TicketTransferred') {
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          {label}
        </Badge>
      );
    }
    if (status === 'Cancelled' || status === 'Refunded' || status === 'Rejected') {
      return (
        <Badge variant="outline" className="text-red-600 border-red-600">
          {label}
        </Badge>
      );
    }
    return <Badge variant="outline">{label}</Badge>;
  };

  const getConfirmationStatusBadge = (status: string): ReactNode => {
    if (status === 'Pending') {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          {t('admin.transactions.confirmationPending')}
        </Badge>
      );
    }
    if (status === 'Accepted') {
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          {t('admin.transactions.confirmationAccepted')}
        </Badge>
      );
    }
    if (status === 'Rejected') {
      return (
        <Badge variant="outline" className="text-red-600 border-red-600">
          {t('admin.transactions.confirmationRejected')}
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  const getFileIcon = (contentType: string): ReactNode =>
    contentType.includes('pdf') ? (
      <FileText className="w-4 h-4" />
    ) : (
      <Image className="w-4 h-4" />
    );

  const formatAmount = (amount: number, currency: string): string =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amount / 100);

  const formatDate = (dateInput?: string): string => {
    if (!dateInput) return '-';
    return new Date(dateInput).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderExpandedContent = (transactionId: string): ReactNode => {
    if (detailLoading === transactionId) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    const detail = detailCache[transactionId];
    if (!detail) {
      return (
        <div className="text-sm text-muted-foreground py-6">
          {t('common.errorLoading')}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t('admin.transactions.event')}:</span>
            <p className="font-medium">{detail.listing.eventName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('admin.transactions.eventDate')}:</span>
            <p className="font-medium">{formatDate(detail.listing.eventDate)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('admin.transactions.quantity')}:</span>
            <p className="font-medium">
              {detail.quantity} {t('admin.transactions.tickets')}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">{t('admin.transactions.amount')}:</span>
            <p className="font-medium">
              {formatAmount(detail.totalPaid.amount, detail.totalPaid.currency)}
            </p>
          </div>
        </div>

        {detail.paymentConfirmations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('admin.transactions.noPaymentConfirmations')}
          </p>
        ) : (
          <div>
            <h4 className="text-sm font-semibold mb-2">
              {t('admin.transactions.paymentConfirmations')}
            </h4>
            <div className="space-y-2">
              {detail.paymentConfirmations.map((confirmation) => (
                <div
                  key={confirmation.id}
                  className="flex items-center justify-between rounded-lg border p-3 bg-background"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(confirmation.contentType)}
                    <span className="text-sm">{confirmation.originalFilename}</span>
                    {getConfirmationStatusBadge(confirmation.status)}
                  </div>
                  {confirmation.status === 'Pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openPreview(transactionId)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {t('admin.transactions.view')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600"
                        disabled={processingConfirmationId === confirmation.id}
                        onClick={() => void handleApprove(transactionId, confirmation.id)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        {t('admin.transactions.approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        disabled={processingConfirmationId === confirmation.id}
                        onClick={() => openRejectDialog(transactionId, confirmation)}
                      >
                        <X className="w-3 h-3 mr-1" />
                        {t('admin.transactions.reject')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('admin.transactions.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('admin.transactions.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('admin.transactions.pendingSummary')}
          </CardTitle>
          <CardDescription>{t('admin.transactions.pendingSummaryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingSummary ? (
            <div className="flex gap-6">
              <div className="rounded-lg border px-4 py-3 bg-muted/50">
                <div className="text-2xl font-bold">{pendingSummary.pendingConfirmationsCount}</div>
                <div className="text-sm text-muted-foreground">
                  {t('admin.transactions.pendingConfirmations')}
                </div>
              </div>
              <div className="rounded-lg border px-4 py-3 bg-muted/50">
                <div className="text-2xl font-bold">{pendingSummary.pendingTransactionsCount}</div>
                <div className="text-sm text-muted-foreground">
                  {t('admin.transactions.pendingTransactions')}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('admin.transactions.summaryUnavailable')}</p>
          )}
        </CardContent>
      </Card>

      {openIdParam &&
        detailCache[openIdParam] &&
        !transactions.some((transaction) => transaction.id === openIdParam) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('admin.transactions.deepLinkTitle')}</CardTitle>
              <CardDescription>{t('admin.transactions.deepLinkDesc')}</CardDescription>
            </CardHeader>
            <CardContent>{renderExpandedContent(openIdParam)}</CardContent>
          </Card>
        )}

      <Card>
        <CardHeader>
          <CardTitle>{t('admin.transactions.tableTitle')}</CardTitle>
          <CardDescription>{t('admin.transactions.tableDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('admin.transactions.searchPlaceholder')}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('admin.transactions.noTransactions')}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>{t('admin.transactions.transactionId')}</TableHead>
                    <TableHead>{t('admin.transactions.buyer')}</TableHead>
                    <TableHead>{t('admin.transactions.seller')}</TableHead>
                    <TableHead>{t('admin.transactions.status')}</TableHead>
                    <TableHead className="text-right">{t('admin.transactions.amount')}</TableHead>
                    <TableHead>{t('admin.transactions.createdAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const isExpanded = expandedId === transaction.id;
                    return (
                      <Fragment key={transaction.id}>
                        <TableRow>
                          <TableCell className="w-10">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => void handleToggleExpand(transaction.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                          <TableCell className="text-sm">{transaction.buyer.email}</TableCell>
                          <TableCell className="text-sm">{transaction.seller.email}</TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatAmount(transaction.totalPaid.amount, transaction.totalPaid.currency)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-muted/30 p-0">
                              <div className="p-4 pl-12">{renderExpandedContent(transaction.id)}</div>
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
                  {t('admin.transactions.showingResults', {
                    count: transactions.length,
                    total,
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    {t('admin.transactions.previous')}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t('admin.transactions.pageInfo', { page, totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    {t('admin.transactions.next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.transactions.rejectTitle')}</DialogTitle>
            <DialogDescription>{t('admin.transactions.rejectDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {rejectTarget && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{rejectTarget.confirmation.originalFilename}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">{t('admin.transactions.rejectionReason')}</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder={t('admin.transactions.rejectionReasonPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleReject()}
              disabled={processingConfirmationId !== null}
            >
              {t('admin.transactions.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.transactions.viewConfirmation')}</DialogTitle>
            <DialogDescription>{previewTransactionId}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-[400px]">
            {previewLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewBlobUrl ? (
              <iframe
                src={previewBlobUrl}
                className="w-full h-[500px] border rounded"
                title={t('admin.transactions.paymentConfirmation')}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                {t('common.errorLoading')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePreview}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
