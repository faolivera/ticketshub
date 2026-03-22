import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, MessageCircle, AlertCircle, X, ThumbsUp, ThumbsDown, Minus, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TicketChat } from '@/app/components/TicketChat';
import { BackButton } from '@/app/components/BackButton';
import { TransactionSkeleton } from '@/app/components/transaction/TransactionSkeleton';
import { ErrorAlert } from '@/app/components/ErrorMessage';
import { TransactionLayout } from '@/app/components/transaction/TransactionLayout';
import { EventCard } from '@/app/components/transaction/EventCard';
import { TxMeta } from '@/app/components/transaction/TxMeta';
import { TransactionStepper } from '@/app/components/transaction/TransactionStepper';
import { BuyerActionBlock } from '@/app/components/transaction/BuyerActionBlock';
import { SellerActionBlock } from '@/app/components/transaction/SellerActionBlock';
import { EscrowCard } from '@/app/components/transaction/EscrowCard';
import { HelpCard } from '@/app/components/transaction/HelpCard';
import { PaymentInfoBuyerCard, PaymentInfoSellerCard } from '@/app/components/transaction/PaymentInfoCard';
import { ModalOverlay } from '@/app/components/transaction/ModalOverlay';
import { PaymentProofPreviewModal } from '@/app/components/transaction/PaymentProofPreviewModal';
import { CounterpartCard } from '@/app/components/transaction/CounterpartCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { transactionsService, paymentConfirmationsService, reviewsService, bffService, supportService } from '@/api/services';
import type { ApiError } from '@/api/client';
import { getSafeErrorMessage } from '@/lib/error-handler';
import { SupportCategory } from '@/api/types/support';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { useUser } from '../contexts/UserContext';
import { useSocket, SOCKET_EVENTS } from '../contexts/SocketContext';
import { SellerUnverifiedModalTrigger } from '../components/SellerUnverifiedModalTrigger';
import { useIsMobile } from '../components/ui/use-mobile';
import { isSellerUnverified } from '../components/SellerUnverifiedModal';
import type { TransactionWithDetails, PaymentConfirmation, ReviewRating, TransactionReviewsData, BankTransferConfig } from '@/api/types';
import type { TransactionTicketUnit, TransactionDetailsChatConfig } from '@/api/types/bff';
import { TransactionStatus, CancellationReason } from '@/api/types';
import { DARK, V, VLIGHT, BORD2, BG, HINT, BORDER, SURFACE, MUTED, SUCCESS, SUCCESS_LIGHT, SUCCESS_BORDER, S } from '@/lib/design-tokens';

export function MyTicket() {
  const { t } = useTranslation();
  const { transactionId } = useParams();
  const { user } = useUser();
  const { socket } = useSocket();
  const isMobile = useIsMobile();
  
  const [transaction, setTransaction] = useState<TransactionWithDetails | null>(null);
  const [paymentConfirmation, setPaymentConfirmation] = useState<PaymentConfirmation | null>(null);
  const [bankTransferConfig, setBankTransferConfig] = useState<BankTransferConfig | null>(null);
  const [ticketUnits, setTicketUnits] = useState<TransactionTicketUnit[]>([]);
  const [paymentMethodPublicName, setPaymentMethodPublicName] = useState<string | null>(null);
  const [chatConfig, setChatConfig] = useState<TransactionDetailsChatConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWasAutoOpened, setChatWasAutoOpened] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  const [reviewData, setReviewData] = useState<TransactionReviewsData | null>(null);
  const [selectedRating, setSelectedRating] = useState<ReviewRating | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [copiedCbu, setCopiedCbu] = useState(false);
  const [copiedTransactionId, setCopiedTransactionId] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputSellerTransferRef = useRef<HTMLInputElement>(null);
  const transferProofModalInputRef = useRef<HTMLInputElement>(null);
  const receiptProofInputRef = useRef<HTMLInputElement>(null);
  const [receiptProofPreview, setReceiptProofPreview] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPaymentExpiredLocally, setIsPaymentExpiredLocally] = useState(false);

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  /** When 'choice', show disclaimer + Contact / Report; when 'form', show dispute form; when 'report_sent', show success. */
  const [disputeModalStep, setDisputeModalStep] = useState<'choice' | 'form' | 'report_sent'>('choice');
  const [reportCategory, setReportCategory] = useState<SupportCategory>(SupportCategory.TicketNotReceived);
  const [disputeSubject, setDisputeSubject] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeExistingTicketId, setDisputeExistingTicketId] = useState<string | null>(null);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [reportSuccessTicketId, setReportSuccessTicketId] = useState<string | null>(null);

  const [showConfirmTransferModal, setShowConfirmTransferModal] = useState(false);
  const [confirmTransferModalStep, setConfirmTransferModalStep] = useState<1 | 2>(1);
  const [confirmTransferPayloadType, setConfirmTransferPayloadType] = useState<'ticketera' | 'pdf_or_image' | 'other'>('ticketera');
  const [confirmTransferPayloadTypeOtherText, setConfirmTransferPayloadTypeOtherText] = useState('');
  const [isConfirmingTransfer, setIsConfirmingTransfer] = useState(false);
  const [transferProofFile, setTransferProofFile] = useState<File | null>(null);
  const [transferProofPreview, setTransferProofPreview] = useState<string | null>(null);
  const [transferProofError, setTransferProofError] = useState<string | null>(null);
  const [isUploadingTransferProof, setIsUploadingTransferProof] = useState(false);
  const [counterpartyEmail, setCounterpartyEmail] = useState<string | null>(null);

  const [receiptProofFile, setReceiptProofFile] = useState<File | null>(null);
  const [receiptProofError, setReceiptProofError] = useState<string | null>(null);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);

  const refetch = useCallback(async () => {
    if (!transactionId) return;
    try {
      const data = await bffService.getTransactionDetails(transactionId);
      setTransaction(data.transaction);
      setPaymentConfirmation(data.paymentConfirmation);
      setReviewData(data.reviews);
      setBankTransferConfig(data.bankTransferConfig);
      setTicketUnits(data.ticketUnits ?? []);
      setPaymentMethodPublicName(data.paymentMethodPublicName ?? null);
      setChatConfig(data.chat ?? null);
      setCounterpartyEmail(data.counterpartyEmail ?? null);
    } catch (err) {
      console.error('Failed to refetch transaction:', err);
    }
  }, [transactionId]);

  const handleCopyCbu = async (cbu: string) => {
    try {
      await navigator.clipboard.writeText(cbu);
      setCopiedCbu(true);
      setTimeout(() => setCopiedCbu(false), 2000);
    } catch (err) {
      console.error('Failed to copy CBU:', err);
    }
  };

  const copyTransactionId = useCallback(() => {
    if (!transaction?.id) return;
    try {
      navigator.clipboard.writeText(transaction.id);
      setCopiedTransactionId(true);
      setTimeout(() => setCopiedTransactionId(false), 2000);
    } catch (err) {
      console.error('Failed to copy transaction ID:', err);
    }
  }, [transaction?.id]);

  const handleCancelTransaction = useCallback(async () => {
    if (!transaction) return;
    setIsCancelling(true);
    try {
      await transactionsService.cancelTransaction(transaction.id);
      await refetch();
    } catch (err) {
      console.error('Failed to cancel transaction:', err);
    } finally {
      setIsCancelling(false);
    }
  }, [transaction, refetch]);

  const handleSellerTransferProofUpload = useCallback(async () => {
    if (!transferProofFile || !transactionId || !transaction) return;
    const ACCEPTED_TYPES = ['image/', 'application/pdf'];
    const MAX_SIZE_MB = 10;
    const validType = ACCEPTED_TYPES.some(
      (type) =>
        transferProofFile.type === type || (type.endsWith('/') && transferProofFile.type.startsWith(type))
    );
    if (!validType) {
      setTransferProofError(t('myTicket.invalidFileType'));
      return;
    }
    if (transferProofFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setTransferProofError(t('myTicket.fileTooLarge', { maxMb: MAX_SIZE_MB }));
      return;
    }
    try {
      setIsUploadingTransferProof(true);
      setTransferProofError(null);
      await transactionsService.uploadTransferProof(transaction.id, transferProofFile);
      setTransferProofFile(null);
      if (transferProofPreview) URL.revokeObjectURL(transferProofPreview);
      setTransferProofPreview(null);
      const data = await bffService.getTransactionDetails(transactionId);
      setTransaction(data.transaction);
    } catch (err) {
      console.error('Failed to upload transfer proof:', err);
      setTransferProofError(getSafeErrorMessage(err, t('myTicket.proofUploadFailed')));
    } finally {
      setIsUploadingTransferProof(false);
    }
  }, [transferProofFile, transactionId, transaction, t]);

  const isBuyer = transaction?.buyerId === user?.id;
  const isSeller = transaction?.sellerId === user?.id;

  useEffect(() => {
    async function fetchData() {
      if (!transactionId) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await bffService.getTransactionDetails(transactionId);
        setTransaction(data.transaction);
        setPaymentConfirmation(data.paymentConfirmation);
        setReviewData(data.reviews);
        setBankTransferConfig(data.bankTransferConfig);
        setTicketUnits(data.ticketUnits ?? []);
        setPaymentMethodPublicName(data.paymentMethodPublicName ?? null);
        setChatConfig(data.chat ?? null);
        setCounterpartyEmail(data.counterpartyEmail ?? null);
        if (data.chat?.hasUnreadMessages) {
          setIsChatOpen(true);
        }
      } catch (err) {
        console.error('Failed to fetch transaction:', err);
        setError(t('common.errorLoading'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [transactionId, t]);

  // Open chat when receiving a message from the other party (e.g. they sent while chat was closed)
  useEffect(() => {
    if (!socket || !transactionId || !user?.id) return;
    const handler = (payload: { transactionId?: string; senderId?: string }) => {
      if (payload.transactionId !== transactionId || payload.senderId === user?.id) return;
      setChatWasAutoOpened(true);
      setIsChatOpen(true);
    };
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handler);
    return () => {
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handler);
    };
  }, [socket, transactionId, user?.id]);

  // Refresh transaction data when a notification pointing to this transaction is received
  useEffect(() => {
    if (!socket || !transactionId) return;
    const handler = (payload: { actionUrl?: string }) => {
      if (payload.actionUrl?.includes(transactionId)) {
        refetch();
      }
    };
    socket.on(SOCKET_EVENTS.NOTIFICATION, handler);
    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION, handler);
    };
  }, [socket, transactionId, refetch]);

  const openPreviewModal = async () => {
    if (!transactionId) return;
    setShowPreviewModal(true);
    setPreviewLoading(true);
    setPreviewBlobUrl(null);
    
    try {
      const blobUrl = await paymentConfirmationsService.getFileBlobUrl(transactionId);
      setPreviewBlobUrl(blobUrl);
    } catch (err) {
      console.error('Failed to load file preview:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      setPreviewBlobUrl(null);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !transactionId) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError(t('myTicket.invalidFileType'));
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadError(t('myTicket.fileTooLarge'));
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await paymentConfirmationsService.uploadConfirmation(transactionId, file);
      setPaymentConfirmation(result.confirmation);
      setTransaction(prev => prev ? {
        ...prev,
        status: TransactionStatus.PaymentPendingVerification,
        requiredActor: 'Platform' as const,
      } : null);
    } catch (err: unknown) {
      console.error('Failed to upload confirmation:', err);
      const errorMessage = err instanceof Error ? err.message : t('myTicket.uploadFailed');
      setUploadError(errorMessage);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmReceipt = async () => {
    if (!transactionId) return;

    const ACCEPTED_TYPES = ['image/', 'application/pdf'];
    const MAX_SIZE_MB = 10;
    if (receiptProofFile) {
      const validType = ACCEPTED_TYPES.some(
        (t) => receiptProofFile.type === t || (t.endsWith('/') && receiptProofFile.type.startsWith(t))
      );
      if (!validType) {
        setReceiptProofError(t('myTicket.invalidFileType'));
        return;
      }
      if (receiptProofFile.size > MAX_SIZE_MB * 1024 * 1024) {
        setReceiptProofError(t('myTicket.fileTooLarge', { maxMb: MAX_SIZE_MB }));
        return;
      }
    }

    try {
      setIsConfirmingReceipt(true);
      setReceiptProofError(null);
      let receiptProof: string | undefined;
      let receiptProofOriginalFilename: string | undefined;
      if (receiptProofFile) {
        const { storageKey } = await transactionsService.uploadReceiptProof(transactionId, receiptProofFile);
        receiptProof = storageKey;
        receiptProofOriginalFilename = receiptProofFile.name;
      }
      const updated = await transactionsService.confirmReceipt(transactionId, {
        confirmed: true,
        ...(receiptProof && { receiptProof, receiptProofOriginalFilename }),
      });
      setTransaction(prev => prev ? { ...prev, ...updated } : null);
      setShowConfirmModal(false);
      setReceiptProofFile(null);
      if (receiptProofPreview) URL.revokeObjectURL(receiptProofPreview);
      setReceiptProofPreview(null);

      const updatedReviews = await reviewsService.getTransactionReviews(transactionId);
      setReviewData(updatedReviews);
    } catch (err) {
      console.error('Failed to confirm receipt:', err);
      setReceiptProofError(getSafeErrorMessage(err, t('myTicket.proofUploadFailed')));
    } finally {
      setIsConfirmingReceipt(false);
    }
  };

  const canReportAsBuyer =
    transaction &&
    isBuyer &&
    [
      TransactionStatus.PaymentReceived,
      TransactionStatus.TicketTransferred,
      TransactionStatus.DepositHold,
    ].includes(transaction.status);
  const canReportAsSeller =
    transaction &&
    isSeller &&
    transaction.status === TransactionStatus.TicketTransferred;
  const canOpenDispute = canReportAsBuyer || canReportAsSeller;

  const handleOpenDisputeClick = () => {
    setDisputeError(null);
    setDisputeExistingTicketId(null);
    setReportCategory(
      isSeller ? SupportCategory.BuyerDidNotConfirmReceipt : SupportCategory.TicketNotReceived,
    );
    setDisputeSubject(transaction ? `${t('myTicket.disputeSubjectPrefix')} ${transaction.eventName}` : '');
    setDisputeDescription('');
    const showChoiceStep =
      chatConfig?.chatMode === 'enabled' && !chatConfig?.hasExchangedMessages;
    setDisputeModalStep(showChoiceStep ? 'choice' : 'form');
    setShowDisputeModal(true);
  };

  const handleCloseDisputeModal = () => {
    setShowDisputeModal(false);
    setDisputeModalStep('choice');
    setReportSuccessTicketId(null);
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId || !transaction) return;
    setDisputeError(null);
    const subject = disputeSubject.trim() || t('myTicket.disputeSubjectPrefix');
    const description = disputeDescription.trim();
    if (!description) {
      setDisputeError(t('myTicket.disputeDescriptionRequired'));
      return;
    }
    setIsSubmittingDispute(true);
    setDisputeExistingTicketId(null);
    try {
      const createdTicket = await supportService.createTicket({
        transactionId,
        category: reportCategory,
        subject,
        description,
      });
      setReportSuccessTicketId(createdTicket.id);
      setDisputeModalStep('report_sent');
      const data = await bffService.getTransactionDetails(transactionId);
      setTransaction(data.transaction);
      setCounterpartyEmail(data.counterpartyEmail ?? null);
    } catch (err: unknown) {
      let msg: string;
      const apiErr = err as ApiError | undefined;
      const existingId = typeof apiErr?.details?.existingTicketId === 'string' ? apiErr.details.existingTicketId : null;
      setDisputeExistingTicketId(null);
      if (
        apiErr?.code === 'BAD_REQUEST' &&
        (existingId != null || (typeof apiErr?.message === 'string' && apiErr.message.toLowerCase().includes('already exists')))
      ) {
        msg = t('myTicket.reportProblemAlreadyExists');
        if (existingId) setDisputeExistingTicketId(existingId);
      } else if (
        apiErr?.code === 'CLAIM_TOO_EARLY' &&
        typeof apiErr.details?.minHours === 'number'
      ) {
        const refDateKey =
          apiErr.details?.refDateType === 'event_date'
            ? 'myTicket.referenceDateEvent'
            : apiErr.details?.refDateType === 'payment_received'
              ? 'myTicket.referenceDatePayment'
              : 'myTicket.referenceDateTransfer';
        msg = t('myTicket.claimTooEarly', {
          minHours: apiErr.details.minHours,
          referenceDate: t(refDateKey),
        });
      } else if (
        apiErr?.code === 'CLAIM_TOO_LATE' &&
        typeof apiErr.details?.maxHours === 'number'
      ) {
        const refDateKey =
          apiErr.details?.refDateType === 'event_date'
            ? 'myTicket.referenceDateEvent'
            : apiErr.details?.refDateType === 'payment_received'
              ? 'myTicket.referenceDatePayment'
              : 'myTicket.referenceDateTransfer';
        msg = t('myTicket.claimTooLate', {
          maxHours: apiErr.details.maxHours,
          referenceDate: t(refDateKey),
        });
      } else if (apiErr?.code === 'CLAIM_INVALID_STATUS') {
        msg = t('myTicket.claimInvalidStatus');
      } else if (apiErr?.code === 'CLAIM_TICKET_NOT_TRANSFERRED') {
        msg = t('myTicket.claimTicketNotTransferred');
      } else if (apiErr?.code === 'CLAIM_CONFIRM_RECEIPT_FIRST') {
        msg = t('myTicket.claimConfirmReceiptFirst');
      } else {
        msg = getSafeErrorMessage(err, t('myTicket.disputeSubmitFailed'));
      }
      setDisputeError(msg);
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!transactionId || !selectedRating) return;

    setIsSubmittingReview(true);
    setReviewError(null);

    try {
      await reviewsService.createReview({
        transactionId,
        rating: selectedRating,
        comment: reviewComment || undefined,
      });

      const updatedReviews = await reviewsService.getTransactionReviews(transactionId);
      setReviewData(updatedReviews);
      setSelectedRating(null);
      setReviewComment('');
    } catch (err) {
      console.error('Failed to submit review:', err);
      setReviewError(t('reviews.reviewError'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getRatingIcon = (rating: ReviewRating) => {
    switch (rating) {
      case 'positive':
        return <ThumbsUp className="w-5 h-5" />;
      case 'neutral':
        return <Minus className="w-5 h-5" />;
      case 'negative':
        return <ThumbsDown className="w-5 h-5" />;
    }
  };

  const getRatingColor = (rating: ReviewRating, isSelected: boolean) => {
    if (!isSelected) return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    switch (rating) {
      case 'positive':
        return 'bg-green-100 text-green-700 border-green-500';
      case 'neutral':
        return 'bg-yellow-100 text-yellow-700 border-yellow-500';
      case 'negative':
        return 'bg-red-100 text-red-700 border-red-500';
    }
  };

  const isManualPayment = bankTransferConfig !== null;

  if (isLoading) {
    return <TransactionSkeleton />;
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <ErrorAlert message={error || t('common.errorLoading')} />
        </div>
      </div>
    );
  }

  // When payment expires locally, treat as cancelled with PaymentTimeout reason
  const effectiveStatus = isPaymentExpiredLocally && transaction.status === TransactionStatus.PendingPayment
    ? TransactionStatus.Cancelled
    : transaction.status;
  const effectiveCancellationReason = isPaymentExpiredLocally && transaction.status === TransactionStatus.PendingPayment
    ? CancellationReason.PaymentTimeout
    : transaction.cancellationReason;

  const stepLabels: string[] = isBuyer
    ? [
        t('transaction.stepPayment'),
        t('transaction.stepTransfer'),
        t('transaction.stepProtected'),
        t('transaction.stepCompleted'),
      ]
    : [
        t('transaction.stepPayment'),
        t('transaction.stepTransfer'),
        t('transaction.stepProtected'),
        t('transaction.stepTransferringFunds'),
        t('transaction.stepCompleted'),
      ];
  const showEscrowCard = ![
    TransactionStatus.Completed,
    TransactionStatus.Cancelled,
    TransactionStatus.Refunded,
  ].includes(effectiveStatus);
  const escrowMessage = isBuyer
    ? effectiveStatus === TransactionStatus.Completed
      ? t('transaction.escrowBuyerReleased')
      : t('transaction.escrowBuyerWaiting')
    : effectiveStatus === TransactionStatus.Completed
      ? t('transaction.escrowSellerReleased', {
          amount: formatCurrency(transaction.sellerReceives.amount, transaction.sellerReceives.currency),
        })
      : t('transaction.escrowSellerWaiting');
  const sellerUnverifiedGate = Boolean(
    isSeller &&
      user &&
      isSellerUnverified(user) &&
      (effectiveStatus === TransactionStatus.DepositHold ||
        effectiveStatus === TransactionStatus.TransferringFund),
  );
  const paymentMethodDisplay =
    paymentMethodPublicName ??
    (transaction.paymentMethodId?.includes('bank_transfer')
      ? t('myTicket.bankTransfer')
      : transaction.paymentMethodId ?? null);

  return (
    <>
      <TransactionLayout
        backButton={
          !isMobile ? (
            <BackButton
              to={isBuyer ? '/my-tickets' : '/seller-dashboard?tab=sold'}
              labelKey="myTicket.backToMyTickets"
            />
          ) : (
            <div />
          )
        }
        topBanner={
          reportSuccessTicketId && !showDisputeModal ? (
            <div
              style={{
                marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 16, borderRadius: 12, border: `1px solid ${SUCCESS_BORDER}`,
                background: SUCCESS_LIGHT, padding: 16,
              }}
            >
              <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: SUCCESS }}>
                <CheckCircle style={{ width: 20, height: 20, flexShrink: 0, color: SUCCESS }} />
                {t('myTicket.reportProblemSuccess')}{' '}
                <Link
                  to={`/support/${reportSuccessTicketId}`}
                  style={{ fontWeight: 600, color: SUCCESS, textDecoration: 'underline' }}
                >
                  {t('myTicket.reportProblemSuccessLink')}
                </Link>
              </p>
              <button
                type="button"
                onClick={() => setReportSuccessTicketId(null)}
                style={{ borderRadius: 6, padding: 4, color: SUCCESS, background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label={t('myTicket.cancel')}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>
          ) : undefined
        }
        mainColumn={
          <>
            <EventCard
              eventName={transaction.eventName}
              eventDateLabel={formatDate(transaction.eventDate)}
              venue={transaction.venue}
              ticketTypeLabel={transaction.ticketType}
              sectorLabel={null}
              squareUrl={transaction.bannerUrls?.square}
              rectangleUrl={transaction.bannerUrls?.rectangle}
              quantity={transaction.quantity}
            />
            <div className="rounded-[16px] border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="mb-4" style={{ ...S, fontSize: 16, fontWeight: 700, color: DARK }}>
                {t('myTicket.ticketStatus')}
              </h2>
              <TransactionStepper
                effectiveStatus={effectiveStatus}
                disputed={effectiveStatus === TransactionStatus.Disputed}
                role={isBuyer ? 'buyer' : 'seller'}
                labels={stepLabels}
              />
              {sellerUnverifiedGate && (
                <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                  <p className="mb-1 text-sm font-medium text-amber-900">
                    {effectiveStatus === TransactionStatus.DepositHold
                      ? t('myTicket.statusDepositHoldSeller')
                      : t('myTicket.sellerUnverifiedDisclaimer')}
                  </p>
                  <p className="mb-2 text-sm text-amber-800">
                    {effectiveStatus === TransactionStatus.DepositHold
                      ? t('myTicket.sellerUnverifiedDisclaimerDepositHoldDesc')
                      : t('myTicket.sellerUnverifiedDisclaimerDesc')}
                  </p>
                  <Link
                    to="/become-seller"
                    className="text-sm font-semibold text-amber-700 underline underline-offset-2"
                  >
                    {t('myTicket.sellerUnverifiedVerifyLink')}
                  </Link>
                </div>
              )}
              {isBuyer && (
                <BuyerActionBlock
                  effectiveStatus={effectiveStatus}
                  effectiveCancellationReason={effectiveCancellationReason}
                  isManualPayment={isManualPayment}
                  paymentConfirmation={paymentConfirmation}
                  transaction={transaction}
                  bankTransferConfig={bankTransferConfig}
                  paymentExpiresAt={transaction.paymentExpiresAt}
                  isPaymentExpiredLocally={isPaymentExpiredLocally}
                  isUploading={isUploading}
                  uploadError={uploadError}
                  fileInputRef={fileInputRef}
                  onFileSelect={handleFileSelect}
                  onTriggerUpload={() => fileInputRef.current?.click()}
                  onOpenPreview={openPreviewModal}
                  isCancelling={isCancelling}
                  onCancelTransaction={handleCancelTransaction}
                  canOpenDispute={!!canOpenDispute}
                  onOpenDispute={handleOpenDisputeClick}
                  onOpenConfirmReceipt={() => setShowConfirmModal(true)}
                  copiedCbu={copiedCbu}
                  onCopyCbu={handleCopyCbu}
                  disputeId={transaction.disputeId}
                  onPaymentExpired={() => setIsPaymentExpiredLocally(true)}
                />
              )}
              {isSeller && (
                <SellerActionBlock
                  effectiveStatus={effectiveStatus}
                  transaction={transaction}
                  counterpartyEmail={counterpartyEmail}
                  canOpenDispute={!!canOpenDispute}
                  onOpenDispute={handleOpenDisputeClick}
                  onOpenTransferModal={() => {
                    setShowConfirmTransferModal(true);
                    setConfirmTransferModalStep(1);
                    setTransferProofFile(null);
                    setTransferProofError(null);
                  }}
                  isSellerUnverifiedGate={sellerUnverifiedGate}
                  transferProofFile={transferProofFile}
                  transferProofPreview={transferProofPreview}
                  isUploadingTransferProof={isUploadingTransferProof}
                  transferProofError={transferProofError}
                  onTransferProofSelect={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setTransferProofFile(f);
                    setTransferProofError(null);
                    if (f?.type.startsWith('image/')) {
                      if (transferProofPreview) URL.revokeObjectURL(transferProofPreview);
                      setTransferProofPreview(URL.createObjectURL(f));
                    } else {
                      if (transferProofPreview) URL.revokeObjectURL(transferProofPreview);
                      setTransferProofPreview(null);
                    }
                  }}
                  onTransferProofRemove={() => {
                    if (transferProofPreview) URL.revokeObjectURL(transferProofPreview);
                    setTransferProofFile(null);
                    setTransferProofPreview(null);
                    setTransferProofError(null);
                    if (fileInputSellerTransferRef.current) fileInputSellerTransferRef.current.value = '';
                  }}
                  fileInputTransferRef={fileInputSellerTransferRef}
                  onUploadTransferProof={handleSellerTransferProofUpload}
                  disputeId={transaction.disputeId}
                />
              )}
              {canOpenDispute &&
                effectiveStatus !== TransactionStatus.TicketTransferred &&
                effectiveStatus !== TransactionStatus.DepositHold &&
                !(isBuyer && effectiveStatus === TransactionStatus.PaymentReceived) &&
                !(
                  isSeller &&
                  (effectiveStatus === TransactionStatus.PaymentReceived ||
                    effectiveStatus === TransactionStatus.TicketTransferred)
                ) && (
                  <button
                    type="button"
                    onClick={handleOpenDisputeClick}
                    className="mt-4 w-full rounded-[10px] border-2 border-red-200 py-3 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    {t('myTicket.reportProblem')}
                  </button>
                )}
            </div>
            {(transaction.status === TransactionStatus.Completed || transaction.status === TransactionStatus.TransferringFund) && reviewData && (
              <div className="rounded-[16px] border bg-white p-5 sm:p-6" style={{ borderColor: BORDER }}>
                <h2 className="mb-4" style={{ ...S, fontSize: 16, fontWeight: 700, color: DARK }}>
                  {t('reviews.leaveReview')}
                </h2>
                {(() => {
                  const myReview = isBuyer ? reviewData.buyerReview : reviewData.sellerReview;
                  const counterpartReview = isBuyer ? reviewData.sellerReview : reviewData.buyerReview;
                  const counterpartName = isBuyer ? transaction.sellerName : transaction.buyerName;
                  const experiencePromptKey = isBuyer ? 'reviews.buyerExperiencePrompt' : 'reviews.sellerExperiencePrompt';
                  return (
                    <div className="space-y-3" style={{ ...S }}>
                      {counterpartReview && (
                        <div className="rounded-[10px] border p-3" style={{ borderColor: BORDER, background: SURFACE }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                            {t('reviews.otherPartyReview')}
                          </p>
                          <div className="flex items-center gap-2">
                            {getRatingIcon(counterpartReview.rating)}
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>{t(`reviews.${counterpartReview.rating}`)}</span>
                          </div>
                          {counterpartReview.comment && (
                            <p className="mt-1" style={{ fontSize: 13, color: MUTED }}>{counterpartReview.comment}</p>
                          )}
                        </div>
                      )}
                      {!myReview ? (
                        <>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>
                            {t(experiencePromptKey, { name: counterpartName })}
                          </p>
                          <div className="flex gap-2">
                            {(['positive', 'neutral', 'negative'] as const).map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setSelectedRating(r)}
                                className={`flex flex-1 flex-col items-center gap-1 rounded-[10px] border-2 p-2 ${getRatingColor(r, selectedRating === r)}`}
                                style={{ fontSize: 12, fontWeight: 600 }}
                              >
                                {getRatingIcon(r)}
                                {t(`reviews.${r}`)}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder={t('reviews.commentPlaceholder')}
                            className="w-full rounded-[10px] border p-3 outline-none"
                            rows={2}
                            style={{ fontSize: 13.5, color: DARK, borderColor: BORDER, background: BG, ...S }}
                          />
                          {reviewError && <p style={{ fontSize: 12, color: '#dc2626' }}>{reviewError}</p>}
                          <button
                            type="button"
                            onClick={handleSubmitReview}
                            disabled={!selectedRating || isSubmittingReview}
                            className="w-full rounded-[10px] py-3 text-white disabled:opacity-50"
                            style={{ background: V, fontSize: 14, fontWeight: 700 }}
                          >
                            {isSubmittingReview ? t('reviews.submitting') : t('reviews.submitReview')}
                          </button>
                        </>
                      ) : (
                        <div style={{ borderRadius: 10, border: `1px solid ${SUCCESS_BORDER}`, background: SUCCESS_LIGHT, padding: 16 }}>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <CheckCircle style={{ marginTop: 2, width: 20, height: 20, flexShrink: 0, color: SUCCESS }} />
                            <div>
                              <p style={{ fontSize: 13.5, fontWeight: 600, color: SUCCESS }}>{t('reviews.reviewSubmitted')}</p>
                              <p style={{ marginTop: 2, fontSize: 13, color: SUCCESS }}>{t('reviews.reviewSubmittedDesc')}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        }
        sidebar={
          <>
            <CounterpartCard
              userId={isBuyer ? transaction.sellerId : transaction.buyerId}
              name={isBuyer ? transaction.sellerName : transaction.buyerName}
              avatarUrl={isBuyer ? transaction.sellerPic : transaction.buyerPic}
              roleLabel={isBuyer ? t('myTicket.sellerInfo') : t('myTicket.buyerInfo')}
              contactLabel={
                chatConfig?.chatMode === 'only_read'
                  ? t('myTicket.readConversation')
                  : isBuyer
                    ? t('myTicket.contactSeller')
                    : t('myTicket.contactBuyer')
              }
              onContact={() => {
                setChatWasAutoOpened(false);
                setIsChatOpen(true);
              }}
              contactDisabled={!chatConfig}
              showProfileLink={isBuyer}
              counterpartRole={isBuyer ? 'seller' : 'buyer'}
            />
            {showEscrowCard && (
              <EscrowCard title={t('transaction.escrowCardTitle')} message={escrowMessage} />
            )}
            <HelpCard
              title={t('myTicket.needHelp')}
              body={isBuyer ? t('myTicket.supportDescription') : t('myTicket.supportDescriptionSeller')}
              supportLabel={t('myTicket.contactSupport')}
              supportTo={`/contact${transactionId ? `?transactionId=${encodeURIComponent(transactionId)}` : ''}`}
            />
            {isBuyer ? (
              <PaymentInfoBuyerCard
                title={t('myTicket.paymentInfo')}
                subtotalLabel={t('myTicket.ticketPriceTotal')}
                subtotalAmount={formatCurrency(transaction.ticketPrice.amount, transaction.ticketPrice.currency)}
                subtotalDetail={t('myTicket.pricePerUnitDetail', {
                  price: formatCurrency(
                    Math.round(transaction.ticketPrice.amount / transaction.quantity),
                    transaction.ticketPrice.currency,
                  ),
                  quantity: transaction.quantity,
                })}
                feeLabel={t('myTicket.servicePrice')}
                feeAmount={formatCurrency(transaction.servicePrice.amount, transaction.servicePrice.currency)}
                feeDetail={t('transaction.paymentInfoBuyerFeeDetail')}
                totalLabel={t('myTicket.totalPaid')}
                totalFormatted={formatCurrency(transaction.totalPaid.amount, transaction.totalPaid.currency)}
                methodLabel={t('myTicket.paymentMethod')}
                methodName={transaction.paymentMethodId ? paymentMethodDisplay : null}
                protectedNote={t('myTicket.buyerProtection')}
              />
            ) : (
              <PaymentInfoSellerCard
                title={t('myTicket.paymentInfo')}
                saleLabel={t('myTicket.ticketPriceTotal')}
                saleAmount={formatCurrency(transaction.ticketPrice.amount, transaction.ticketPrice.currency)}
                saleDetail={t('myTicket.pricePerUnitDetail', {
                  price: formatCurrency(
                    Math.round(transaction.ticketPrice.amount / transaction.quantity),
                    transaction.ticketPrice.currency,
                  ),
                  quantity: transaction.quantity,
                })}
                commissionLabel={t('myTicket.sellerPlatformFee')}
                commissionFormatted={`-${formatCurrency(transaction.sellerPlatformFee.amount, transaction.sellerPlatformFee.currency)}`}
                netLabel={t('myTicket.youReceive')}
                netFormatted={formatCurrency(transaction.sellerReceives.amount, transaction.sellerReceives.currency)}
                methodLabel={t('myTicket.paymentMethod')}
                methodName={paymentMethodDisplay}
              />
            )}
            <TxMeta
              transactionId={transaction.id}
              createdAtLabel={formatDateTime(transaction.createdAt)}
              copied={copiedTransactionId}
              onCopy={copyTransactionId}
              copyLabel={t('myTicket.copy')}
              copiedLabel={t('myTicket.copied')}
              idLabel={t('myTicket.transactionInfo')}
              createdLabel={t('myTicket.createdAt')}
            />
          </>
        }
      />


      {showConfirmTransferModal && transaction && (
        <ModalOverlay
          title={
            confirmTransferModalStep === 1
              ? t('myTicket.confirmTransferTitle')
              : t('myTicket.uploadTransferProof')
          }
          onClose={() => {
            setShowConfirmTransferModal(false);
            setConfirmTransferModalStep(1);
            setTransferProofFile(null);
            if (transferProofPreview) URL.revokeObjectURL(transferProofPreview);
            setTransferProofPreview(null);
            setTransferProofError(null);
            setConfirmTransferPayloadTypeOtherText('');
            if (transferProofModalInputRef.current) transferProofModalInputRef.current.value = '';
          }}
        >
          {confirmTransferModalStep === 1 ? (
            <>
              <p className="mb-4 text-sm text-gray-600">{t('myTicket.confirmTransferPayloadHint')}</p>
              {counterpartyEmail && (
                <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {t('myTicket.transferDisclaimerBuyerEmail', { email: counterpartyEmail })}
                </p>
              )}
              <div className="mb-4 space-y-2">
                {(['ticketera', 'pdf_or_image', 'other'] as const).map((type) => (
                  <label
                    key={type}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50"
                  >
                    <input
                      type="radio"
                      name="payloadTypeTx"
                      checked={confirmTransferPayloadType === type}
                      onChange={() => setConfirmTransferPayloadType(type)}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{t(`myTicket.payloadType_${type}`)}</span>
                  </label>
                ))}
              </div>
              {confirmTransferPayloadType === 'other' && (
                <input
                  type="text"
                  value={confirmTransferPayloadTypeOtherText}
                  onChange={(e) => setConfirmTransferPayloadTypeOtherText(e.target.value)}
                  placeholder={t('myTicket.payloadTypeOtherPlaceholder')}
                  className="mb-4 w-full rounded-lg border px-3 py-2 text-sm"
                />
              )}
              {transferProofError && <p className="mb-2 text-sm text-red-600">{transferProofError}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmTransferModal(false)}
                  className="flex-1 rounded-[10px] border py-2.5 text-sm font-semibold"
                >
                  {t('myTicket.cancel')}
                </button>
                <button
                  type="button"
                  disabled={isConfirmingTransfer}
                  onClick={async () => {
                    try {
                      setIsConfirmingTransfer(true);
                      setTransferProofError(null);
                      const updated = await transactionsService.confirmTransfer(transaction.id, {
                        payloadType: confirmTransferPayloadType,
                        ...(confirmTransferPayloadType === 'other' &&
                          confirmTransferPayloadTypeOtherText.trim() && {
                            payloadTypeOtherText: confirmTransferPayloadTypeOtherText.trim(),
                          }),
                      });
                      setTransaction((prev) => (prev ? { ...prev, ...updated } : null));
                      setConfirmTransferModalStep(2);
                      setConfirmTransferPayloadTypeOtherText('');
                    } catch (err) {
                      setTransferProofError(getSafeErrorMessage(err, t('myTicket.proofUploadFailed')));
                    } finally {
                      setIsConfirmingTransfer(false);
                    }
                  }}
                  className="flex-1 rounded-[10px] bg-violet-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isConfirmingTransfer ? t('myTicket.confirmingTransfer') : t('myTicket.confirmTransferSubmit')}
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: HINT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                {t('myTicket.attachTransferProofAfterTransfer')}
              </p>
              {transferProofFile ? (
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  {transferProofPreview ? (
                    <img
                      src={transferProofPreview}
                      alt=""
                      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 11, border: `1px solid ${BORDER}`, display: 'block' }}
                    />
                  ) : (
                    <div style={{ height: 120, borderRadius: 11, border: `1px solid ${BORDER}`, background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Upload size={20} style={{ color: HINT }} />
                      <p style={{ fontSize: 13, color: DARK, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transferProofFile.name}</p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (transferProofPreview) URL.revokeObjectURL(transferProofPreview);
                      setTransferProofFile(null);
                      setTransferProofPreview(null);
                      setTransferProofError(null);
                      if (transferProofModalInputRef.current) transferProofModalInputRef.current.value = '';
                    }}
                    style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={13} color="white" />
                  </button>
                </div>
              ) : (
                <label
                  className="mb-2 flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all"
                  style={{ borderColor: BORD2, background: BG }}
                  onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = V; (e.currentTarget as HTMLLabelElement).style.background = VLIGHT; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = BORD2; (e.currentTarget as HTMLLabelElement).style.background = BG; }}
                >
                  <Upload size={20} style={{ color: HINT, marginBottom: 7 }} />
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK, marginBottom: 2 }}>{t('myTicket.uploadFile')}</p>
                  <p style={{ fontSize: 11.5, color: HINT }}>JPG, PNG, PDF</p>
                  <input
                    ref={transferProofModalInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setTransferProofFile(f);
                      setTransferProofError(null);
                      if (f?.type.startsWith('image/')) {
                        if (transferProofPreview) URL.revokeObjectURL(transferProofPreview);
                        setTransferProofPreview(URL.createObjectURL(f));
                      } else {
                        if (transferProofPreview) URL.revokeObjectURL(transferProofPreview);
                        setTransferProofPreview(null);
                      }
                    }}
                  />
                </label>
              )}
              {transferProofError && (
                <p className="mb-2 flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {transferProofError}
                </p>
              )}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmTransferModal(false);
                    setConfirmTransferModalStep(1);
                    setTransferProofFile(null);
                    if (transferProofPreview) URL.revokeObjectURL(transferProofPreview);
                    setTransferProofPreview(null);
                    if (transferProofModalInputRef.current) transferProofModalInputRef.current.value = '';
                  }}
                  className="flex-1 rounded-[10px] border py-2.5 text-sm font-semibold"
                >
                  {t('myTicket.skipTransferProofStep')}
                </button>
                <button
                  type="button"
                  disabled={!transferProofFile || isUploadingTransferProof}
                  onClick={async () => {
                    if (!transferProofFile || !transactionId) return;
                    try {
                      setIsUploadingTransferProof(true);
                      await transactionsService.uploadTransferProof(transaction.id, transferProofFile);
                      const data = await bffService.getTransactionDetails(transactionId);
                      setTransaction(data.transaction);
                      setShowConfirmTransferModal(false);
                      setConfirmTransferModalStep(1);
                      setTransferProofFile(null);
                      if (transferProofPreview) URL.revokeObjectURL(transferProofPreview);
                      setTransferProofPreview(null);
                    } catch (err) {
                      setTransferProofError(getSafeErrorMessage(err, t('myTicket.proofUploadFailed')));
                    } finally {
                      setIsUploadingTransferProof(false);
                    }
                  }}
                  className="flex-1 rounded-[10px] bg-violet-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isUploadingTransferProof ? t('myTicket.confirmingTransfer') : t('myTicket.uploadTransferProof')}
                </button>
              </div>
            </>
          )}
        </ModalOverlay>
      )}

      {showDisputeModal && (
        <ModalOverlay title={t('myTicket.disputeTitle')} onClose={handleCloseDisputeModal}>
          {disputeModalStep === 'choice' ? (
            <>
              <p className="mb-6 text-gray-700">{t('myTicket.disputeTryChatFirst')}</p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleCloseDisputeModal();
                    setChatWasAutoOpened(false);
                    setIsChatOpen(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-violet-600 py-3 font-semibold text-white"
                >
                  <MessageCircle className="h-5 w-5" />
                  {isBuyer ? t('myTicket.contactSeller') : t('myTicket.contactBuyer')}
                </button>
                <button
                  type="button"
                  onClick={() => setDisputeModalStep('form')}
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] border-2 border-red-300 py-3 font-semibold text-red-700"
                >
                  <AlertCircle className="h-5 w-5" />
                  {t('myTicket.reportProblem')}
                </button>
              </div>
            </>
          ) : disputeModalStep === 'report_sent' ? (
            <div className="flex flex-col items-center py-4 text-center">
              <CheckCircle style={{ marginBottom: 16, width: 48, height: 48, color: SUCCESS }} />
              <h3 className="mb-6 text-lg font-bold">{t('myTicket.reportProblemSuccess')}</h3>
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Link
                  to={reportSuccessTicketId ? `/support/${reportSuccessTicketId}` : '#'}
                  onClick={handleCloseDisputeModal}
                  className="flex flex-1 items-center justify-center rounded-[10px] bg-violet-600 py-3 font-semibold text-white no-underline"
                >
                  {t('myTicket.reportProblemSuccessLink')}
                </Link>
                <button
                  type="button"
                  onClick={handleCloseDisputeModal}
                  className="flex-1 rounded-[10px] border py-3 font-semibold"
                >
                  {t('myTicket.close')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-600">{t('myTicket.disputeIntro')}</p>
              {!user?.phoneVerified && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="mb-2">{t('myTicket.disputePhoneRequiredDisclaimer')}</p>
                  <Link
                    to="/verify-user"
                    state={{ verifyPhone: true, returnTo: `/transaction/${transactionId}` }}
                    onClick={() => handleCloseDisputeModal()}
                    className="font-medium underline"
                  >
                    {t('myTicket.disputeVerifyPhoneLink')}
                  </Link>
                </div>
              )}
              <form onSubmit={handleSubmitDispute} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    {t('myTicket.disputeReason')} <span className="text-red-500">*</span>
                  </label>
                  <Select value={reportCategory} onValueChange={(v) => setReportCategory(v as SupportCategory)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('myTicket.disputeReason')} />
                    </SelectTrigger>
                    <SelectContent>
                      {isBuyer && (
                        <>
                          <SelectItem value={SupportCategory.TicketNotReceived}>
                            {t('myTicket.disputeReasonNotReceived')}
                          </SelectItem>
                          <SelectItem value={SupportCategory.TicketDidntWork}>
                            {t('myTicket.disputeReasonDidntWork')}
                          </SelectItem>
                        </>
                      )}
                      {isSeller && (
                        <SelectItem value={SupportCategory.BuyerDidNotConfirmReceipt}>
                          {t('myTicket.disputeReasonBuyerDidNotConfirm')}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">{t('myTicket.disputeSubject')}</label>
                  <input
                    type="text"
                    value={disputeSubject}
                    onChange={(e) => setDisputeSubject(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    {t('myTicket.disputeDescription')} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </div>
                {disputeError && (
                  <p className="text-sm text-red-600">
                    {disputeError}
                    {disputeExistingTicketId && (
                      <Link
                        to={`/support/${disputeExistingTicketId}`}
                        className="ml-1 font-medium underline"
                        onClick={handleCloseDisputeModal}
                      >
                        {t('myTicket.reportProblemViewExistingCase')}
                      </Link>
                    )}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleCloseDisputeModal} className="flex-1 rounded-lg border py-2">
                    {t('myTicket.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDispute || !user?.phoneVerified}
                    className="flex-1 rounded-lg bg-red-600 py-2 text-white disabled:opacity-50"
                  >
                    {isSubmittingDispute ? t('myTicket.disputeSubmitting') : t('myTicket.disputeSubmit')}
                  </button>
                </div>
              </form>
            </>
          )}
        </ModalOverlay>
      )}

      {showConfirmModal && (
        <ModalOverlay
          title={t('myTicket.confirmReceiptTitle')}
          onClose={() => {
            setShowConfirmModal(false);
            setReceiptProofFile(null);
            if (receiptProofPreview) URL.revokeObjectURL(receiptProofPreview);
            setReceiptProofPreview(null);
            setReceiptProofError(null);
            if (receiptProofInputRef.current) receiptProofInputRef.current.value = '';
          }}
        >
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {t('transaction.confirmReceiptWarning')}
          </p>
          {transaction.depositReleaseAt && (
            <p className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
              {t('transaction.confirmReceiptEscrowNote', {
                date: formatDateTime(transaction.depositReleaseAt),
              })}
            </p>
          )}
          <p style={{ fontSize: 11.5, fontWeight: 700, color: HINT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            {t('myTicket.attachReceiptProof')}
          </p>
          {receiptProofFile ? (
            <div style={{ position: 'relative', marginBottom: 8 }}>
              {receiptProofPreview ? (
                <img
                  src={receiptProofPreview}
                  alt=""
                  style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 11, border: `1px solid ${BORDER}`, display: 'block' }}
                />
              ) : (
                <div style={{ height: 120, borderRadius: 11, border: `1px solid ${BORDER}`, background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Upload size={20} style={{ color: HINT }} />
                  <p style={{ fontSize: 13, color: DARK, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{receiptProofFile.name}</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (receiptProofPreview) URL.revokeObjectURL(receiptProofPreview);
                  setReceiptProofFile(null);
                  setReceiptProofPreview(null);
                  setReceiptProofError(null);
                  if (receiptProofInputRef.current) receiptProofInputRef.current.value = '';
                }}
                style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={13} color="white" />
              </button>
            </div>
          ) : (
            <label
              className="group mb-2 flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all hover:border-violet-600 hover:bg-violet-50"
              style={{ borderColor: BORD2, background: BG }}
              onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = V; (e.currentTarget as HTMLLabelElement).style.background = VLIGHT; }}
              onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = BORD2; (e.currentTarget as HTMLLabelElement).style.background = BG; }}
            >
              <Upload size={20} style={{ color: HINT, marginBottom: 7 }} />
              <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK, marginBottom: 2 }}>{t('myTicket.uploadFile')}</p>
              <p style={{ fontSize: 11.5, color: HINT }}>JPG, PNG, PDF</p>
              <input
                ref={receiptProofInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setReceiptProofFile(file);
                  setReceiptProofError(null);
                  if (file?.type.startsWith('image/')) {
                    setReceiptProofPreview(URL.createObjectURL(file));
                  } else {
                    setReceiptProofPreview(null);
                  }
                }}
              />
            </label>
          )}
          {receiptProofError && <p className="mb-2 text-sm text-red-600">{receiptProofError}</p>}
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setShowConfirmModal(false);
                setReceiptProofFile(null);
              }}
              className="flex-1 rounded-lg border py-2"
            >
              {t('myTicket.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmReceipt()}
              disabled={isConfirmingReceipt}
              className="flex-1 rounded-lg bg-violet-600 py-2 text-white disabled:opacity-50"
            >
              {isConfirmingReceipt ? t('myTicket.confirmingReceipt') : t('myTicket.confirm')}
            </button>
          </div>
        </ModalOverlay>
      )}

      {showPreviewModal && paymentConfirmation && (
        <PaymentProofPreviewModal
          title={t('myTicket.paymentConfirmation')}
          onClose={closePreviewModal}
          loading={previewLoading}
          blobUrl={previewBlobUrl}
          contentTypePdf={paymentConfirmation.contentType.includes('pdf')}
        />
      )}


      {/* Chat Component - when chat is visible (enabled or only_read) */}
      {chatConfig && (
        <TicketChat
          isOpen={isChatOpen}
          onClose={() => { setIsChatOpen(false); setChatWasAutoOpened(false); }}
          transactionId={transaction.id}
          currentUserRole={isBuyer ? 'buyer' : 'seller'}
          counterpartName={isBuyer ? transaction.sellerName : transaction.buyerName}
          counterpartImage=""
          counterpartRating={0}
          counterpartLevel={1}
          ticketTitle={`${transaction.eventName} - ${transaction.ticketType}`}
          pollIntervalSeconds={chatConfig.chatPollIntervalSeconds}
          chatMaxMessages={chatConfig.chatMaxMessages}
          readOnly={chatConfig.chatMode === 'only_read'}
          wasAutoOpened={chatWasAutoOpened}
          onMarkAsRead={async () => {
            if (!transaction?.id) return;
            try {
              await transactionsService.markTransactionChatAsRead(transaction.id);
              setChatWasAutoOpened(false);
            } catch { /* ignore */ }
          }}
        />
      )}
      <SellerUnverifiedModalTrigger showWhen={!!(transaction && isSeller)} />
    </>
  );
}
