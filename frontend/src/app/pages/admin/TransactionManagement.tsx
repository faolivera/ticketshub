import React, { Fragment, type ReactNode, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import {
  Braces,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Eye,
  FileText,
  Image,
  Loader2,
  Pencil,
  Search,
  X,
} from 'lucide-react';
import { adminService, paymentConfirmationsService } from '@/api/services';
import { formatCurrency } from '@/lib/format-currency';
import { formatDateTimeMedium } from '@/lib/format-date';
import type {
  AdminTransactionAuditLogEntry,
  AdminTransactionDetailResponse,
  AdminTransactionListItem,
  AdminTransactionPaymentConfirmation,
  AdminTransactionPayoutReceiptFile,
  AdminTransactionsPendingSummaryResponse,
  AdminUpdateTransactionRequest,
} from '@/api/types/admin';

const ITEMS_PER_PAGE = 20;

/** Transaction statuses in chronological order (main flow first, then terminal statuses). */
const TRANSACTION_STATUS_ORDER: string[] = [
  'PendingPayment',
  'PaymentPendingVerification',
  'PaymentReceived',
  'TicketTransferred',
  'DepositHold',
  'TransferringFund',
  'Completed',
  'Disputed',
  'Refunded',
  'Cancelled',
];

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

  const [payoutPreviewDialogOpen, setPayoutPreviewDialogOpen] = useState(false);
  const [payoutPreviewLoading, setPayoutPreviewLoading] = useState(false);
  const [payoutPreviewFile, setPayoutPreviewFile] = useState<AdminTransactionPayoutReceiptFile | null>(null);
  const [payoutPreviewBlobUrl, setPayoutPreviewBlobUrl] = useState<string | null>(null);

  const [transferProofDialogOpen, setTransferProofDialogOpen] = useState(false);
  const [transferProofDialogTxId, setTransferProofDialogTxId] = useState<string | null>(null);
  const [transferProofLoading, setTransferProofLoading] = useState(false);
  const [transferProofBlobUrl, setTransferProofBlobUrl] = useState<string | null>(null);

  const [receiptProofDialogOpen, setReceiptProofDialogOpen] = useState(false);
  const [receiptProofDialogTxId, setReceiptProofDialogTxId] = useState<string | null>(null);
  const [receiptProofLoading, setReceiptProofLoading] = useState(false);
  const [receiptProofBlobUrl, setReceiptProofBlobUrl] = useState<string | null>(null);

  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [jsonDialogTransactionId, setJsonDialogTransactionId] = useState<string | null>(null);
  const [jsonCopied, setJsonCopied] = useState(false);

  const [editModalTransactionId, setEditModalTransactionId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AdminUpdateTransactionRequest | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [auditLogsDialogOpen, setAuditLogsDialogOpen] = useState(false);
  const [auditLogsTransactionId, setAuditLogsTransactionId] = useState<string | null>(null);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditLogsError, setAuditLogsError] = useState<string | null>(null);
  const [auditLogsItems, setAuditLogsItems] = useState<AdminTransactionAuditLogEntry[]>([]);

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

  useEffect(() => {
    if (!editModalTransactionId) {
      setEditForm(null);
      return;
    }
    const detail = detailCache[editModalTransactionId];
    if (!detail) return;
    setEditForm({
      status: detail.status,
      quantity: detail.quantity,
      ticketPrice: detail.ticketPrice,
      buyerPlatformFee: detail.buyerPlatformFee,
      sellerPlatformFee: detail.sellerPlatformFee,
      paymentMethodCommission: detail.paymentMethodCommission,
      totalPaid: detail.totalPaid,
      sellerReceives: detail.sellerReceives,
      paymentReceivedAt: detail.paymentReceivedAt ?? null,
      ticketTransferredAt: detail.ticketTransferredAt ?? null,
      buyerConfirmedAt: detail.buyerConfirmedAt ?? null,
      completedAt: detail.completedAt ?? null,
      cancelledAt: detail.cancelledAt ?? null,
      refundedAt: detail.refundedAt ?? null,
      paymentApprovedAt: detail.paymentApprovedAt ?? null,
      paymentApprovedBy: detail.paymentApprovedBy ?? null,
      disputeId: detail.disputeId ?? null,
      buyerId: detail.buyer?.id,
      sellerId: detail.seller?.id,
      listingId: detail.listing?.id,
    });
  }, [editModalTransactionId, detailCache]);

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
      if (!detailCache[transactionId]) {
        await loadDetail(transactionId);
      }
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

  const openPayoutReceiptPreview = async (
    transactionId: string,
    file: AdminTransactionPayoutReceiptFile,
  ): Promise<void> => {
    try {
      setPayoutPreviewDialogOpen(true);
      setPayoutPreviewLoading(true);
      setPayoutPreviewFile(file);
      setPayoutPreviewBlobUrl(null);
      const blobUrl = await adminService.getPayoutReceiptFileBlobUrl(transactionId, file.id);
      setPayoutPreviewBlobUrl(blobUrl);
    } catch {
      setPayoutPreviewBlobUrl(null);
    } finally {
      setPayoutPreviewLoading(false);
    }
  };

  const closePayoutReceiptPreview = (): void => {
    setPayoutPreviewDialogOpen(false);
    setPayoutPreviewFile(null);
    if (payoutPreviewBlobUrl) {
      URL.revokeObjectURL(payoutPreviewBlobUrl);
    }
    setPayoutPreviewBlobUrl(null);
  };

  const openTransferProofPreview = async (transactionId: string): Promise<void> => {
    try {
      setTransferProofDialogOpen(true);
      setTransferProofLoading(true);
      setTransferProofDialogTxId(transactionId);
      setTransferProofBlobUrl(null);
      const blobUrl = await adminService.getTransferProofBlobUrl(transactionId);
      setTransferProofBlobUrl(blobUrl);
    } catch {
      setTransferProofBlobUrl(null);
    } finally {
      setTransferProofLoading(false);
    }
  };

  const closeTransferProofPreview = (): void => {
    setTransferProofDialogOpen(false);
    setTransferProofDialogTxId(null);
    if (transferProofBlobUrl) URL.revokeObjectURL(transferProofBlobUrl);
    setTransferProofBlobUrl(null);
  };

  const openReceiptProofPreview = async (transactionId: string): Promise<void> => {
    try {
      setReceiptProofDialogOpen(true);
      setReceiptProofLoading(true);
      setReceiptProofDialogTxId(transactionId);
      setReceiptProofBlobUrl(null);
      const blobUrl = await adminService.getReceiptProofBlobUrl(transactionId);
      setReceiptProofBlobUrl(blobUrl);
    } catch {
      setReceiptProofBlobUrl(null);
    } finally {
      setReceiptProofLoading(false);
    }
  };

  const closeReceiptProofPreview = (): void => {
    setReceiptProofDialogOpen(false);
    setReceiptProofDialogTxId(null);
    if (receiptProofBlobUrl) URL.revokeObjectURL(receiptProofBlobUrl);
    setReceiptProofBlobUrl(null);
  };

  const openAuditLogsDialog = async (transactionId: string): Promise<void> => {
    setAuditLogsDialogOpen(true);
    setAuditLogsTransactionId(transactionId);
    setAuditLogsLoading(true);
    setAuditLogsError(null);
    setAuditLogsItems([]);
    try {
      const response = await adminService.getTransactionAuditLogs(transactionId, 'desc');
      setAuditLogsItems(Array.isArray(response.items) ? response.items : []);
    } catch (err) {
      setAuditLogsError(err instanceof Error ? err.message : t('common.errorLoading'));
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const closeAuditLogsDialog = (): void => {
    setAuditLogsDialogOpen(false);
    setAuditLogsTransactionId(null);
    setAuditLogsLoading(false);
    setAuditLogsError(null);
    setAuditLogsItems([]);
  };

  const getAuditActionLabel = (action: string): string =>
    action === 'created'
      ? t('admin.transactions.auditActionCreated')
      : action === 'updated'
        ? t('admin.transactions.auditActionUpdated')
        : action;

  const getAuditPayloadPreview = (payload: unknown): string => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return t('admin.transactions.auditPayloadNoDetails');
    }
    const entries = Object.entries(payload as Record<string, unknown>);
    if (entries.length === 0) {
      return t('admin.transactions.auditPayloadNoDetails');
    }
    return entries
      .slice(0, 4)
      .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
      .join(' • ');
  };

  const getStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      PendingPayment: t('admin.transactions.statusPendingPayment'),
      PaymentPendingVerification: t('admin.transactions.statusPaymentPendingVerification'),
      PaymentReceived: t('admin.transactions.statusPaymentReceived'),
      TicketTransferred: t('admin.transactions.statusTicketTransferred'),
      DepositHold: t('admin.transactions.statusDepositHold'),
      TransferringFund: t('admin.transactions.statusTransferringFund'),
      Completed: t('admin.transactions.statusCompleted'),
      Cancelled: t('admin.transactions.statusCancelled'),
      Refunded: t('admin.transactions.statusRefunded'),
      Disputed: t('admin.transactions.statusDisputed'),
    };
    return statusLabels[status] ?? status;
  };

  const getStatusBadge = (status: string): ReactNode => {
    const label = getStatusLabel(status);
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
    if (status === 'DepositHold' || status === 'TransferringFund') {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-600">
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
    if (status === 'Disputed') {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-600">
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

  const formatDate = (dateInput?: string): string => {
    if (!dateInput) return '-';
    return formatDateTimeMedium(dateInput);
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

    const getStatusStep = (): number => {
      if (detail.completedAt) return 4;
      if (detail.buyerConfirmedAt) return 3;
      if (detail.ticketTransferredAt) return 2;
      if (detail.paymentReceivedAt || detail.paymentApprovedAt) return 1;

      switch (detail.status) {
        case 'Completed':
          return 4;
        case 'TicketTransferred':
          return 2;
        case 'PaymentReceived':
          return 1;
        default:
          return 0;
      }
    };

    const statusStep = getStatusStep();

    const timelineSteps = [
      { step: 1, labelKey: 'statusStepPaid', date: detail.paymentReceivedAt ?? detail.paymentApprovedAt ?? detail.createdAt },
      { step: 2, labelKey: 'statusStepTransferred', date: detail.ticketTransferredAt },
      { step: 3, labelKey: 'statusStepConfirmed', date: detail.buyerConfirmedAt },
      { step: 4, labelKey: 'statusStepReleased', date: detail.completedAt },
    ];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">{t('admin.transactions.listingId')}:</span>
            <p className="font-medium">
              <Link
                to={`/buy/${detail.listing.eventSlug}/${detail.listing.id}`}
                className="text-primary hover:underline font-mono"
              >
                {detail.listing.id}
              </Link>
            </p>
          </div>
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
            <span className="text-muted-foreground">{t('admin.transactions.paymentMethod')}:</span>
            <p className="font-medium">
              {detail.paymentMethod
                ? `${detail.paymentMethod.name} (${detail.paymentMethod.type})`
                : detail.paymentMethodId ?? '-'}
            </p>
          </div>
          {detail.appliedPromotion && (
            <div>
              <span className="text-muted-foreground">{t('admin.transactions.appliedPromotion')}:</span>
              <p className="font-medium">
                {detail.appliedPromotion.name} <span className="text-muted-foreground font-normal">({detail.appliedPromotion.id})</span>
              </p>
              {detail.appliedPromotion.config && Object.keys(detail.appliedPromotion.config).length > 0 && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {Object.entries(detail.appliedPromotion.config).map(([key, value]) => (
                    <span key={key} className="mr-3">
                      {key}: {String(value)}
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">{t('admin.transactions.priceBreakdown')}</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">{t('admin.transactions.ticketPrice')}:</span>
              <p className="font-medium">
                {formatCurrency(detail.ticketPrice.amount, detail.ticketPrice.currency)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('admin.transactions.buyerPlatformFee')}:</span>
              <p className="font-medium">
                {formatCurrency(detail.buyerPlatformFee.amount, detail.buyerPlatformFee.currency)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('admin.transactions.sellerPlatformFee')}:</span>
              <p className="font-medium">
                {formatCurrency(detail.sellerPlatformFee.amount, detail.sellerPlatformFee.currency)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('admin.transactions.platformReceives')}:</span>
              <p className="font-medium">
                {formatCurrency(
                  detail.buyerPlatformFee.amount + detail.sellerPlatformFee.amount,
                  detail.buyerPlatformFee.currency,
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('admin.transactions.paymentMethodCommission')}:</span>
              <p className="font-medium">
                {formatCurrency(detail.paymentMethodCommission.amount, detail.paymentMethodCommission.currency)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('admin.transactions.totalPaid')}:</span>
              <p className="font-medium">
                {formatCurrency(detail.totalPaid.amount, detail.totalPaid.currency)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">{t('admin.transactions.sellerReceives')}:</span>
              <p className="font-medium">
                {formatCurrency(detail.sellerReceives.amount, detail.sellerReceives.currency)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-4 mb-3">
            <h4 className="text-sm font-semibold">{t('admin.transactions.transactionStatus')}</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setJsonDialogTransactionId(transactionId);
                setJsonDialogOpen(true);
                setJsonCopied(false);
              }}
            >
              <Braces className="w-3 h-3 mr-1" />
              {t('admin.transactions.viewJson')}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {t('admin.transactions.status')}: <span className="font-medium text-foreground">{getStatusLabel(detail.status)}</span>
            <span className="ml-2 font-mono text-xs">({detail.status})</span>
          </p>
          <div className="relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" aria-hidden="true" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
              style={{
                width: `${(statusStep / 4) * 100}%`,
              }}
              aria-hidden="true"
            />
            <div className="relative grid grid-cols-4 gap-2">
              {timelineSteps.map(({ step, labelKey, date }) => {
                const isDone = statusStep >= step;
                const isCurrent = statusStep === step - 1;
                const stepColor = isDone
                  ? 'bg-primary text-primary-foreground'
                  : isCurrent
                    ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-500'
                    : 'bg-muted text-muted-foreground';
                return (
                  <div key={step} className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${stepColor}`}
                    >
                      {isDone ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <p
                      className={`text-xs text-center font-medium ${
                        isDone ? 'text-foreground' : isCurrent ? 'text-yellow-600 dark:text-yellow-500' : 'text-muted-foreground'
                      }`}
                    >
                      {t(`myTicket.${labelKey}`)}
                    </p>
                    {date && (
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(date)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold mb-2">
              {t('admin.transactions.buyerPaymentConfirmations')}
            </h4>
            {detail.paymentConfirmations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('admin.transactions.noPaymentConfirmations')}
              </p>
            ) : (
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
                    {confirmation.status !== 'Pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openPreview(transactionId)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {t('admin.transactions.view')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">
              {t('admin.transactions.sellerPaymentReceipts')}
            </h4>
            {detail.payoutReceiptFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('admin.transactions.noPayoutReceipts')}
              </p>
            ) : (
              <div className="space-y-2">
                {detail.payoutReceiptFiles.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="flex items-center justify-between rounded-lg border p-3 bg-background"
                  >
                    <div className="flex items-center gap-3">
                      {getFileIcon(receipt.contentType)}
                      <span className="text-sm">{receipt.originalFilename}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void openPayoutReceiptPreview(transactionId, receipt)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {t('admin.transactions.view')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">
              {t('admin.transactions.transferProof')}
            </h4>
            {detail.transferProofStorageKey ? (
              <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
                <div className="flex items-center gap-3">
                  {detail.transferProofOriginalFilename && getFileIcon(detail.transferProofOriginalFilename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')}
                  <span className="text-sm">{detail.transferProofOriginalFilename ?? t('admin.transactions.transferProof')}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void openTransferProofPreview(transactionId)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {t('admin.transactions.view')}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('admin.transactions.noTransferProof')}</p>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">
              {t('admin.transactions.receiptProof')}
            </h4>
            {detail.receiptProofStorageKey ? (
              <div className="flex items-center justify-between rounded-lg border p-3 bg-background">
                <div className="flex items-center gap-3">
                  {detail.receiptProofOriginalFilename && getFileIcon(detail.receiptProofOriginalFilename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')}
                  <span className="text-sm">{detail.receiptProofOriginalFilename ?? t('admin.transactions.receiptProof')}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void openReceiptProofPreview(transactionId)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {t('admin.transactions.view')}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('admin.transactions.noReceiptProof')}</p>
            )}
          </div>
        </div>
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
              <button
                type="button"
                className="rounded-lg border px-4 py-3 bg-muted/50 text-left hover:bg-muted transition-colors cursor-pointer"
                onClick={() => {
                  if (pendingSummary.pendingConfirmationTransactionIds.length > 0) {
                    setSearchQuery(pendingSummary.pendingConfirmationTransactionIds.join(','));
                  }
                }}
                disabled={pendingSummary.pendingConfirmationsCount === 0}
              >
                <div className="text-2xl font-bold">{pendingSummary.pendingConfirmationsCount}</div>
                <div className="text-sm text-muted-foreground">
                  {t('admin.transactions.pendingConfirmations')}
                </div>
              </button>
              <button
                type="button"
                className="rounded-lg border px-4 py-3 bg-muted/50 text-left hover:bg-muted transition-colors cursor-pointer"
                onClick={() => {
                  if (pendingSummary.pendingTransactionIds.length > 0) {
                    setSearchQuery(pendingSummary.pendingTransactionIds.join(','));
                  }
                }}
                disabled={pendingSummary.pendingTransactionsCount === 0}
              >
                <div className="text-2xl font-bold">{pendingSummary.pendingTransactionsCount}</div>
                <div className="text-sm text-muted-foreground">
                  {t('admin.transactions.pendingTransactions')}
                </div>
              </button>
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
                    <TableHead className="w-[180px]">{t('admin.transactions.actions')}</TableHead>
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
                          <TableCell className="min-w-[140px]">
                            <span className="font-medium block text-sm">{transaction.buyer.name ?? '—'}</span>
                            <span className="text-xs text-muted-foreground block">{transaction.buyer.email ?? '—'}</span>
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <span className="font-medium block text-sm">{transaction.seller.name ?? '—'}</span>
                            <span className="text-xs text-muted-foreground block">{transaction.seller.email ?? '—'}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(transaction.totalPaid.amount, transaction.totalPaid.currency)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  setEditModalTransactionId(transaction.id);
                                  setEditError(null);
                                  await loadDetail(transaction.id);
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                {t('admin.transactions.edit')}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void openAuditLogsDialog(transaction.id)}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                {t('admin.transactions.logs')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 p-0">
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

      <Dialog
        open={!!editModalTransactionId}
        onOpenChange={(open) => {
          if (!open) {
            setEditModalTransactionId(null);
            setEditForm(null);
            setEditError(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.transactions.editTransaction')}</DialogTitle>
            <DialogDescription>
              {editModalTransactionId}
            </DialogDescription>
          </DialogHeader>
          {!editModalTransactionId ? null : !detailCache[editModalTransactionId] ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !editForm ? (
            <div className="py-8 text-muted-foreground text-sm">{t('common.loading')}</div>
          ) : (
            <form
              className="space-y-4 overflow-y-auto pr-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editModalTransactionId || !editForm) return;
                setEditSaving(true);
                setEditError(null);
                try {
                  const updated = await adminService.updateTransaction(editModalTransactionId, editForm);
                  setDetailCache((prev) => ({ ...prev, [editModalTransactionId]: updated }));
                  setEditModalTransactionId(null);
                  setEditForm(null);
                } catch (err) {
                  setEditError(err instanceof Error ? err.message : t('common.errorLoading'));
                } finally {
                  setEditSaving(false);
                }
              }}
            >
              {editError && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{editError}</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('admin.transactions.status')}</Label>
                  <Select
                    value={editForm.status ?? ''}
                    onValueChange={(v) => setEditForm((f) => ({ ...f!, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.transactions.status')} />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_STATUS_ORDER.map((status) => (
                        <SelectItem key={status} value={status}>
                          {getStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.transactions.quantity')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.quantity ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f!, quantity: e.target.value ? parseInt(e.target.value, 10) : undefined }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.transactions.buyerId')}</Label>
                  <Input
                    value={editForm.buyerId ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f!, buyerId: e.target.value || undefined }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.transactions.sellerId')}</Label>
                  <Input
                    value={editForm.sellerId ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f!, sellerId: e.target.value || undefined }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('admin.transactions.listingId')}</Label>
                  <Input
                    value={editForm.listingId ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f!, listingId: e.target.value || undefined }))}
                  />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('admin.transactions.priceBreakdown')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['ticketPrice', 'buyerPlatformFee', 'sellerPlatformFee', 'paymentMethodCommission', 'totalPaid', 'sellerReceives'] as const).map((field) => (
                    <div key={field} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">{t(`admin.transactions.${field}`)}</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Amount (cents)"
                            value={editForm[field]?.amount ?? ''}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f!,
                                [field]: {
                                  ...(f![field] ?? { amount: 0, currency: 'USD' }),
                                  amount: e.target.value ? Number(e.target.value) : 0,
                                },
                              }))
                            }
                          />
                          <Input
                            className="w-24"
                            placeholder="USD"
                            value={editForm[field]?.currency ?? ''}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f!,
                                [field]: {
                                  ...(f![field] ?? { amount: 0, currency: 'USD' }),
                                  currency: e.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('admin.transactions.timeline')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    'paymentReceivedAt',
                    'ticketTransferredAt',
                    'buyerConfirmedAt',
                    'completedAt',
                    'cancelledAt',
                    'refundedAt',
                    'paymentApprovedAt',
                  ].map((field) => (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs">{t(`admin.transactions.${field}`)}</Label>
                      <Input
                        type="datetime-local"
                        step={1}
                        value={
                          (editForm as Record<string, string | null | undefined>)[field]
                            ? (() => {
                                const d = new Date((editForm as Record<string, string | null | undefined>)[field] as string);
                                if (Number.isNaN(d.getTime())) return '';
                                const pad = (n: number) => n.toString().padStart(2, '0');
                                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                              })()
                            : ''
                        }
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f!,
                            [field]: e.target.value ? new Date(e.target.value).toISOString() : null,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('admin.transactions.paymentApprovedBy')}</Label>
                  <Input
                    value={editForm.paymentApprovedBy ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f!, paymentApprovedBy: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.transactions.disputeId')}</Label>
                  <Input
                    value={editForm.disputeId ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f!, disputeId: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.transactions.requiredActor')}</Label>
                  <Input
                    value={editForm.requiredActor ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f!, requiredActor: e.target.value || undefined }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.transactions.cancellationReason')}</Label>
                  <Input
                    value={editForm.cancellationReason ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f!, cancellationReason: e.target.value || null }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.transactions.cancelledBy')}</Label>
                  <Input
                    value={editForm.cancelledBy ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f!, cancelledBy: e.target.value || null }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditModalTransactionId(null);
                    setEditForm(null);
                    setEditError(null);
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {t('admin.transactions.save')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={(open) => !open && closePreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.transactions.viewConfirmation')}</DialogTitle>
            <DialogDescription>{previewTransactionId}</DialogDescription>
          </DialogHeader>
          {previewTransactionId && detailCache[previewTransactionId] && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">
                    {t('admin.transactions.proofPreviewBuyerName')}
                  </span>
                  <span className="font-medium">
                    {detailCache[previewTransactionId].buyer?.name ?? '-'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">
                    {t('admin.transactions.proofPreviewTotalAmount')}
                  </span>
                  <span className="font-medium">
                    {detailCache[previewTransactionId].totalPaid
                      ? formatCurrency(
                          detailCache[previewTransactionId].totalPaid.amount,
                          detailCache[previewTransactionId].totalPaid.currency,
                        )
                      : '-'}
                  </span>
                </div>
              </div>
              {detailCache[previewTransactionId].bankTransferDestination && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                    {t('admin.transactions.proofPreviewBankDetailsTitle')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        {t('admin.transactions.proofPreviewHolderName')}
                      </span>
                      <span className="font-medium">
                        {detailCache[previewTransactionId].bankTransferDestination?.holderName ?? '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-xs">
                        {t('admin.transactions.proofPreviewDestinationAccount')}
                      </span>
                      <span className="font-medium">
                        {detailCache[previewTransactionId].bankTransferDestination?.cbuOrCvu ?? '-'}
                      </span>
                    </div>
                    {detailCache[previewTransactionId].bankTransferDestination?.alias && (
                      <div>
                        <span className="text-muted-foreground block text-xs">
                          {t('admin.transactions.proofPreviewAlias')}
                        </span>
                        <span className="font-medium">
                          {detailCache[previewTransactionId].bankTransferDestination.alias}
                        </span>
                      </div>
                    )}
                    {detailCache[previewTransactionId].bankTransferDestination?.bic && (
                      <div>
                        <span className="text-muted-foreground block text-xs">
                          {t('admin.transactions.proofPreviewBic')}
                        </span>
                        <span className="font-medium">
                          {detailCache[previewTransactionId].bankTransferDestination.bic}
                        </span>
                      </div>
                    )}
                    {detailCache[previewTransactionId].bankTransferDestination?.bankName && (
                      <div>
                        <span className="text-muted-foreground block text-xs">
                          {t('admin.transactions.proofPreviewBankName')}
                        </span>
                        <span className="font-medium">
                          {detailCache[previewTransactionId].bankTransferDestination.bankName}
                        </span>
                      </div>
                    )}
                    {detailCache[previewTransactionId].bankTransferDestination?.cuitCuil && (
                      <div>
                        <span className="text-muted-foreground block text-xs">
                          {t('admin.transactions.proofPreviewCuitCuil')}
                        </span>
                        <span className="font-medium">
                          {detailCache[previewTransactionId].bankTransferDestination.cuitCuil}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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

      <Dialog open={payoutPreviewDialogOpen} onOpenChange={(open) => !open && closePayoutReceiptPreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.transactions.viewPayoutReceipt')}</DialogTitle>
            <DialogDescription>{payoutPreviewFile?.originalFilename}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-[400px]">
            {payoutPreviewLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : payoutPreviewBlobUrl ? (
              <iframe
                src={payoutPreviewBlobUrl}
                className="w-full h-[500px] border rounded"
                title={t('admin.transactions.viewPayoutReceipt')}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                {t('common.errorLoading')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePayoutReceiptPreview}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferProofDialogOpen} onOpenChange={(open) => !open && closeTransferProofPreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.transactions.transferProof')}</DialogTitle>
            <DialogDescription>{transferProofDialogTxId}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-[400px]">
            {transferProofLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : transferProofBlobUrl ? (
              <iframe
                src={transferProofBlobUrl}
                className="w-full h-[500px] border rounded"
                title={t('admin.transactions.transferProof')}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                {t('common.errorLoading')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTransferProofPreview}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiptProofDialogOpen} onOpenChange={(open) => !open && closeReceiptProofPreview()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.transactions.receiptProof')}</DialogTitle>
            <DialogDescription>{receiptProofDialogTxId}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-[400px]">
            {receiptProofLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : receiptProofBlobUrl ? (
              <iframe
                src={receiptProofBlobUrl}
                className="w-full h-[500px] border rounded"
                title={t('admin.transactions.receiptProof')}
              />
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                {t('common.errorLoading')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeReceiptProofPreview}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.transactions.transactionDataJson')}</DialogTitle>
            <DialogDescription>
              {jsonDialogTransactionId ? (
                <span className="font-mono text-xs">{jsonDialogTransactionId}</span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-[300px] rounded-lg border bg-muted/30 p-4">
            {jsonDialogTransactionId && detailCache[jsonDialogTransactionId] ? (
              <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                {JSON.stringify(detailCache[jsonDialogTransactionId], null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground">{t('common.errorLoading')}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!jsonDialogTransactionId || !detailCache[jsonDialogTransactionId]) return;
                try {
                  await navigator.clipboard.writeText(
                    JSON.stringify(detailCache[jsonDialogTransactionId], null, 2),
                  );
                  setJsonCopied(true);
                  setTimeout(() => setJsonCopied(false), 2000);
                } catch {
                  setJsonCopied(false);
                }
              }}
            >
              <Copy className="w-3 h-3 mr-1" />
              {jsonCopied ? t('admin.transactions.copied') : t('admin.transactions.copy')}
            </Button>
            <Button variant="outline" onClick={() => setJsonDialogOpen(false)}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={auditLogsDialogOpen} onOpenChange={(open) => !open && closeAuditLogsDialog()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('admin.transactions.auditLogsTitle')}</DialogTitle>
            <DialogDescription>
              {auditLogsTransactionId ? (
                <span className="font-mono text-xs">{auditLogsTransactionId}</span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-[300px] pr-1">
            {auditLogsLoading ? (
              <div className="flex items-center justify-center h-[280px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : auditLogsError ? (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {auditLogsError}
              </div>
            ) : !Array.isArray(auditLogsItems) || auditLogsItems.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                {t('admin.transactions.auditLogsEmpty')}
              </div>
            ) : (
              <div className="space-y-3">
                {auditLogsItems.map((log) => (
                  <div key={log.id} className="rounded-lg border p-3 bg-background">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{getAuditActionLabel(log.action)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {t('admin.transactions.auditBy')}: <span className="font-mono">{log.changedBy}</span>
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.changedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 break-all">
                      {getAuditPayloadPreview(log.payload)}
                    </p>
                    <details className="rounded border bg-muted/20 p-2">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                        {t('admin.transactions.auditViewPayload')}
                      </summary>
                      <pre className="text-xs whitespace-pre-wrap break-all font-mono mt-2">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAuditLogsDialog}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
