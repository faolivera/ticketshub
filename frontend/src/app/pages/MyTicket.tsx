import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, CreditCard, Shield, MessageCircle, Mail, Upload, FileText, Image, AlertCircle, Eye, X, ThumbsUp, ThumbsDown, Minus, Star, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TicketChat } from '@/app/components/TicketChat';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorAlert } from '@/app/components/ErrorMessage';
import { UserReviewsCard } from '@/app/components/UserReviewsCard';
import { EventBanner } from '@/app/components/EventBanner';
import { PaymentCountdown } from '@/app/components/PaymentCountdown';
import { Button } from '@/app/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { transactionsService, paymentConfirmationsService, reviewsService, bffService, supportService } from '@/api/services';
import type { ApiError } from '@/api/client';
import { SupportCategory } from '@/api/types/support';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { useUser } from '../contexts/UserContext';
import { useSocket, SOCKET_EVENTS } from '../contexts/SocketContext';
import { SellerUnverifiedModalTrigger } from '../components/SellerUnverifiedModalTrigger';
import { isSellerUnverified } from '../components/SellerUnverifiedModal';
import type { TransactionWithDetails, PaymentConfirmation, ReviewRating, TransactionReviewsData, BankTransferConfig } from '@/api/types';
import type { TransactionTicketUnit, TransactionDetailsChatConfig } from '@/api/types/bff';
import { TransactionStatus, CancellationReason } from '@/api/types';

export function MyTicket() {
  const { t } = useTranslation();
  const { transactionId } = useParams();
  const { user } = useUser();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  
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

  const isBuyer = transaction?.buyerId === user?.id;
  const isSeller = transaction?.sellerId === user?.id;

  const handleBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      navigate(isBuyer ? '/my-tickets' : '/seller-dashboard?tab=sold');
    }
  };

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

  const getStatusInfo = (status: TransactionStatus, role: 'buyer' | 'seller') => {
    const suffix = role === 'buyer' ? 'Buyer' : 'Seller';
    
    switch (status) {
      case TransactionStatus.PendingPayment:
        return {
          label: t(`myTicket.statusPendingPayment${suffix}`),
          color: 'yellow',
          icon: Clock,
          description: t(`myTicket.statusPendingPaymentDesc${suffix}`)
        };
      case TransactionStatus.PaymentPendingVerification:
        return {
          label: t(`myTicket.statusPaymentPendingVerification${suffix}`),
          color: 'blue',
          icon: Clock,
          description: t(`myTicket.statusPaymentPendingVerificationDesc${suffix}`)
        };
      case TransactionStatus.PaymentReceived:
        return {
          label: t(`myTicket.statusPaymentReceived${suffix}`),
          color: 'blue',
          icon: Clock,
          description: t(`myTicket.statusPaymentReceivedDesc${suffix}`)
        };
      case TransactionStatus.TicketTransferred:
        return {
          label: t(`myTicket.statusTransferred${suffix}`),
          color: 'blue',
          icon: AlertCircle,
          description: t(`myTicket.statusTransferredDesc${suffix}`)
        };
      case TransactionStatus.DepositHold:
        return {
          label: t(`myTicket.statusDepositHold${suffix}`),
          color: 'blue',
          icon: Clock,
          description: t(`myTicket.statusDepositHoldDesc${suffix}`)
        };
      case TransactionStatus.TransferringFund:
        return {
          label: t(`myTicket.statusTransferringFund${suffix}`),
          color: 'blue',
          icon: Clock,
          description: t(`myTicket.statusTransferringFundDesc${suffix}`)
        };
      case TransactionStatus.Completed:
        return {
          label: t(`myTicket.statusCompleted${suffix}`),
          color: 'green',
          icon: CheckCircle,
          description: t(`myTicket.statusCompletedDesc${suffix}`)
        };
      case TransactionStatus.Cancelled:
        return {
          label: t('myTicket.statusCancelled'),
          color: 'gray',
          icon: AlertCircle,
          description: t('myTicket.statusCancelledDesc')
        };
      case TransactionStatus.Refunded:
        return {
          label: t('myTicket.statusRefunded'),
          color: 'gray',
          icon: CheckCircle,
          description: t('myTicket.statusRefundedDesc')
        };
      case TransactionStatus.Disputed:
        return {
          label: t('myTicket.statusDisputed'),
          color: 'red',
          icon: AlertCircle,
          description: t('myTicket.statusDisputedDesc')
        };
      default:
        return {
          label: status,
          color: 'gray',
          icon: AlertCircle,
          description: ''
        };
    }
  };

  /** Buyer: 3 steps (Pago, Transferida, Completada). Seller: 5 steps (Pago, Transferida, Recibida, Fondos liberados, Completado). */
  const getStatusStep = (status: TransactionStatus, role: 'buyer' | 'seller'): number => {
    switch (status) {
      case TransactionStatus.PendingPayment:
      case TransactionStatus.PaymentPendingVerification:
        return 0;
      case TransactionStatus.PaymentReceived:
        return 1;
      case TransactionStatus.TicketTransferred:
        return 2;
      case TransactionStatus.DepositHold:
        return role === 'buyer' ? 3 : 3; // buyer: show "Completada" after confirm; seller: "Recibida / Fondos retenidos"
      case TransactionStatus.TransferringFund:
        return role === 'buyer' ? 3 : 4; // buyer: show "Completada"; seller: "Fondos liberados"
      case TransactionStatus.Completed:
        return role === 'buyer' ? 3 : 5;
      default:
        return 0;
    }
  };

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

      const updatedReviews = await reviewsService.getTransactionReviews(transactionId);
      setReviewData(updatedReviews);
    } catch (err) {
      console.error('Failed to confirm receipt:', err);
      setReceiptProofError((err as ApiError).message ?? t('myTicket.proofUploadFailed'));
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
      } else if (apiErr?.code === 'CLAIM_TICKET_NOT_TRANSFERRED') {
        msg = t('myTicket.claimTicketNotTransferred');
      } else if (apiErr?.code === 'CLAIM_CONFIRM_RECEIPT_FIRST') {
        msg = t('myTicket.claimConfirmReceiptFirst');
      } else {
        msg =
          apiErr && typeof apiErr === 'object' && 'message' in apiErr
            ? String(apiErr.message)
            : t('myTicket.disputeSubmitFailed');
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
  const needsPaymentConfirmation = isManualPayment && 
    transaction?.status === TransactionStatus.PendingPayment && 
    !isPaymentExpiredLocally &&
    isBuyer && 
    !paymentConfirmation;
  const isBankTransferPendingUpload = Boolean(
    isBuyer &&
    transaction?.status === TransactionStatus.PendingPayment &&
    !isPaymentExpiredLocally &&
    bankTransferConfig &&
    !paymentConfirmation
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text={t('common.loading')} />
      </div>
    );
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

  const statusInfo = getStatusInfo(effectiveStatus, isBuyer ? 'buyer' : 'seller');
  const StatusIcon = statusInfo.icon;
  const statusStep = getStatusStep(effectiveStatus, isBuyer ? 'buyer' : 'seller');
  const maxSteps = isBuyer ? 3 : 5;
  const eventDate = new Date(transaction.eventDate);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button 
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('myTicket.backToMyTickets')}
        </button>

        {reportSuccessTicketId && !showDisputeModal && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between gap-4">
            <p className="text-green-800 text-sm flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-600" />
              {t('myTicket.reportProblemSuccess')}{' '}
              <Link
                to={`/support/${reportSuccessTicketId}`}
                className="font-semibold text-green-700 underline hover:no-underline"
              >
                {t('myTicket.reportProblemSuccessLink')}
              </Link>
            </p>
            <button
              type="button"
              onClick={() => setReportSuccessTicketId(null)}
              className="p-1 rounded hover:bg-green-100 text-green-700"
              aria-label={t('myTicket.cancel')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Transaction Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <EventBanner
                  variant="rectangle"
                  squareUrl={transaction.bannerUrls?.square}
                  rectangleUrl={transaction.bannerUrls?.rectangle}
                  alt={transaction.eventName}
                  className="h-48 md:h-64"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h1 className="text-2xl font-bold mb-1 drop-shadow-lg">{transaction.eventName}</h1>
                      <div className="flex items-center gap-2 text-white/90">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {formatDate(transaction.eventDate)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                      <span className="text-xs font-semibold">{transaction.ticketType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/90">
                    <MapPin className="w-4 h-4" />
                    <span>{transaction.venue}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.quantity')}</p>
                    <p className="font-semibold text-gray-900">{transaction.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.ticketType')}</p>
                    <p className="font-semibold text-gray-900">{transaction.ticketType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.transactionId')}</p>
                    <div className="flex items-center gap-2 min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="font-mono text-xs text-gray-900 truncate block min-w-0" title={transaction.id}>
                            {transaction.id.length > 16
                              ? `${transaction.id.slice(0, 8)}…${transaction.id.slice(-8)}`
                              : transaction.id}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="font-mono text-xs max-w-xs break-all">
                          {transaction.id}
                        </TooltipContent>
                      </Tooltip>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`shrink-0 h-8 w-8 ${
                          copiedTransactionId
                            ? 'text-green-600 hover:text-green-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={copyTransactionId}
                        aria-label={t('myTicket.copy')}
                        title={t('myTicket.copy')}
                      >
                        {copiedTransactionId ? (
                          <Check className="w-4 h-4" aria-hidden />
                        ) : (
                          <Copy className="w-4 h-4" aria-hidden />
                        )}
                      </Button>
                      {copiedTransactionId && (
                        <span className="text-xs text-green-600 font-medium whitespace-nowrap">{t('myTicket.copied')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Timeline */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t('myTicket.ticketStatus')}</h2>

              {/* Status Timeline: hide when in dispute; buyer 3 steps (Pago, Transferida, Completada), seller 5 steps (Pago, Transferida, Recibida, Fondos liberados, Completado) */}
              {effectiveStatus !== TransactionStatus.Disputed && (
                <div className="mb-6">
                  <div className="relative">
                    <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
                      <div
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${maxSteps > 0 ? (statusStep / maxSteps) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="relative grid gap-2" style={{ gridTemplateColumns: `repeat(${maxSteps}, minmax(0, 1fr))` }}>
                      {isBuyer ? (
                        <>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${statusStep >= 1 ? 'bg-blue-600 text-white' : statusStep === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-400'}`}>
                              {statusStep >= 1 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <p className={`text-xs text-center font-medium ${statusStep >= 1 ? 'text-gray-900' : statusStep === 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{t('myTicket.statusStepPaid')}</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${statusStep >= 2 ? 'bg-blue-600 text-white' : statusStep === 1 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-400'}`}>
                              {statusStep >= 2 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <p className={`text-xs text-center font-medium ${statusStep >= 2 ? 'text-gray-900' : statusStep === 1 ? 'text-yellow-600' : 'text-gray-400'}`}>{t('myTicket.statusStepTransferred')}</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${statusStep >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                              {statusStep >= 3 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <p className={`text-xs text-center font-medium ${statusStep >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>{t('myTicket.statusStepCompleted')}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${statusStep >= 1 ? 'bg-blue-600 text-white' : statusStep === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-400'}`}>
                              {statusStep >= 1 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <p className={`text-xs text-center font-medium ${statusStep >= 1 ? 'text-gray-900' : statusStep === 0 ? 'text-yellow-600' : 'text-gray-400'}`}>{t('myTicket.statusStepPaid')}</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${statusStep >= 2 ? 'bg-blue-600 text-white' : statusStep === 1 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-400'}`}>
                              {statusStep >= 2 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <p className={`text-xs text-center font-medium ${statusStep >= 2 ? 'text-gray-900' : statusStep === 1 ? 'text-yellow-600' : 'text-gray-400'}`}>{t('myTicket.statusStepTransferred')}</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${statusStep >= 3 ? 'bg-blue-600 text-white' : statusStep === 2 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-400'}`}>
                              {statusStep >= 3 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <p className={`text-xs text-center font-medium ${statusStep >= 3 ? 'text-gray-900' : statusStep === 2 ? 'text-yellow-600' : 'text-gray-400'}`}>{t('myTicket.statusStepReceived')}</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${statusStep >= 4 ? 'bg-blue-600 text-white' : statusStep === 3 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-400'}`}>
                              {statusStep >= 4 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <p className={`text-xs text-center font-medium ${statusStep >= 4 ? 'text-gray-900' : statusStep === 3 ? 'text-yellow-600' : 'text-gray-400'}`}>{t('myTicket.statusStepFundsReleased')}</p>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${statusStep >= 5 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                              {statusStep >= 5 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <p className={`text-xs text-center font-medium ${statusStep >= 5 ? 'text-gray-900' : 'text-gray-400'}`}>{t('myTicket.statusStepCompleted')}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Current Status Description - one disclaimer: normal message if verified, orange verify CTA if seller unverified in DepositHold/TransferringFund */}
              {!(isBuyer && paymentConfirmation?.status === 'Pending' && transaction.status === TransactionStatus.PaymentPendingVerification) && !isBankTransferPendingUpload && (
                isSeller && (effectiveStatus === TransactionStatus.DepositHold || effectiveStatus === TransactionStatus.TransferringFund) && user && isSellerUnverified(user) ? (
                  <div className="p-4 rounded-lg mb-4 bg-amber-50 border border-amber-300">
                    <p className="text-sm text-amber-900 font-medium mb-1">
                      {effectiveStatus === TransactionStatus.DepositHold
                        ? t('myTicket.statusDepositHoldSeller')
                        : t('myTicket.sellerUnverifiedDisclaimer')}
                    </p>
                    <p className="text-sm text-amber-800 mb-2">
                      {effectiveStatus === TransactionStatus.DepositHold
                        ? t('myTicket.sellerUnverifiedDisclaimerDepositHoldDesc')
                        : t('myTicket.sellerUnverifiedDisclaimerDesc')}
                    </p>
                    <Link
                      to="/seller-verification"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                    >
                      {t('myTicket.sellerUnverifiedVerifyLink')}
                    </Link>
                  </div>
                ) : (
                  <div className={`p-4 rounded-lg mb-4 ${
                    statusInfo.color === 'yellow' ? 'bg-yellow-50 border border-yellow-200' :
                    statusInfo.color === 'blue' ? 'bg-blue-50 border border-blue-200' :
                    statusInfo.color === 'green' ? 'bg-green-50 border border-green-200' :
                    statusInfo.color === 'red' ? 'bg-red-50 border border-red-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <StatusIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        statusInfo.color === 'yellow' ? 'text-yellow-600' :
                        statusInfo.color === 'blue' ? 'text-blue-600' :
                        statusInfo.color === 'green' ? 'text-green-600' :
                        statusInfo.color === 'red' ? 'text-red-600' :
                        'text-gray-600'
                      }`} />
                      <div className="flex-1">
                        <p className={`font-semibold mb-1 ${
                          statusInfo.color === 'yellow' ? 'text-yellow-900' :
                          statusInfo.color === 'blue' ? 'text-blue-900' :
                          statusInfo.color === 'green' ? 'text-green-900' :
                          statusInfo.color === 'red' ? 'text-red-900' :
                          'text-gray-900'
                        }`}>
                          {statusInfo.label}
                        </p>
                        <p className={`text-sm ${
                          statusInfo.color === 'yellow' ? 'text-yellow-800' :
                          statusInfo.color === 'blue' ? 'text-blue-800' :
                          statusInfo.color === 'green' ? 'text-green-800' :
                          statusInfo.color === 'red' ? 'text-red-800' :
                          'text-gray-800'
                        }`}>
                          {statusInfo.description}
                        </p>
                        {effectiveStatus === TransactionStatus.Disputed && transaction.disputeId && (
                          <p className="mt-2">
                            <Link
                              to={`/support/${transaction.disputeId}`}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900 underline underline-offset-2"
                            >
                              {t('myTicket.viewSupportCase')}
                            </Link>
                          </p>
                        )}
                        {transaction.sellerSentPayloadType && (
                          <p className="text-xs mt-2 opacity-90">
                            {t('myTicket.sentAs')}:{' '}
                            {transaction.sellerSentPayloadType === 'ticketera'
                              ? t('myTicket.sentAsTicketera')
                              : transaction.sellerSentPayloadType === 'pdf_or_image'
                                ? t('myTicket.sentAsPdfOrImage')
                                : transaction.sellerSentPayloadType === 'other'
                                  ? (transaction.sellerSentPayloadTypeOtherText?.trim() || t('myTicket.sentAsOther'))
                                  : t('myTicket.sentAsOther')}
                          </p>
                        )}
                        {/* Countdown Timer - Show inside disclaimer when status is PendingPayment and not expired */}
                        {effectiveStatus === TransactionStatus.PendingPayment && (
                          <div className="mt-3 pt-3 border-t border-yellow-200">
                            <PaymentCountdown
                              expiresAt={transaction.paymentExpiresAt}
                              onExpired={() => setIsPaymentExpiredLocally(true)}
                              className="text-yellow-800"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Cancellation Reason - Show when transaction is cancelled */}
              {effectiveStatus === TransactionStatus.Cancelled && effectiveCancellationReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <div className="text-red-600 font-medium">
                    {t(`transaction.cancelled.${effectiveCancellationReason}`)}
                  </div>
                </div>
              )}

              {/* Cancel Button - Show when buyer is viewing and status is PendingPayment (not expired), not when unified bank transfer card is shown */}
              {isBuyer && effectiveStatus === TransactionStatus.PendingPayment && !isBankTransferPendingUpload && (
                <div className="mb-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isCancelling}>
                        {t('transaction.cancelButton')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('transaction.cancelButton')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('transaction.cancelConfirm')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('myTicket.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            setIsCancelling(true);
                            try {
                              await transactionsService.cancelTransaction(transaction.id);
                              await refetch();
                            } catch (err) {
                              console.error('Failed to cancel transaction:', err);
                            } finally {
                              setIsCancelling(false);
                            }
                          }}
                        >
                          {t('myTicket.confirm')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {/* Unified Bank Transfer Card - Single card when buyer must transfer and upload proof */}
              {isBankTransferPendingUpload && bankTransferConfig && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-blue-900 mb-1 break-words">
                        {t('myTicket.bankTransferCompletePaymentTitle')}
                      </p>
                      <p className="text-sm text-blue-800 mb-3">
                        {t('myTicket.bankTransferCompletePaymentDesc')}
                      </p>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <PaymentCountdown
                          expiresAt={transaction.paymentExpiresAt}
                          onExpired={() => setIsPaymentExpiredLocally(true)}
                          className="text-blue-800"
                        />
                      </div>
                      <div className="space-y-2 text-sm mt-3 p-3 bg-blue-100/50 rounded-lg">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-blue-700">{t('myTicket.bankName')}</span>
                          <span className="font-medium text-blue-900">{bankTransferConfig.bankName}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-blue-700">{t('myTicket.accountHolder')}</span>
                          <span className="font-medium text-blue-900">{bankTransferConfig.accountHolderName}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-blue-700">{t('myTicket.cuitCuil')}</span>
                          <span className="font-medium text-blue-900">{bankTransferConfig.cuitCuil}</span>
                        </div>
                        <div className="flex flex-col gap-1 pt-2 border-t border-blue-200 sm:flex-row sm:justify-between sm:items-center sm:gap-2">
                          <div className="flex items-center justify-between gap-2 sm:contents">
                            <span className="text-blue-700">{t('myTicket.cbu')}</span>
                            <button
                              onClick={() => handleCopyCbu(bankTransferConfig.cbu)}
                              className={`sm:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                                copiedCbu
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95'
                              }`}
                              title={t('myTicket.copyCbu')}
                            >
                              {copiedCbu ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  {t('myTicket.copied')}
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  {t('myTicket.copy')}
                                </>
                              )}
                            </button>
                          </div>
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                            <span className="font-mono font-medium text-blue-900 break-all">{bankTransferConfig.cbu}</span>
                            <button
                              onClick={() => handleCopyCbu(bankTransferConfig.cbu)}
                              className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                                copiedCbu
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95'
                              }`}
                              title={t('myTicket.copyCbu')}
                            >
                              {copiedCbu ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  {t('myTicket.copied')}
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  {t('myTicket.copy')}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,application/pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {isUploading ? (
                            <>
                              <LoadingSpinner size="sm" />
                              {t('myTicket.uploading')}
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 flex-shrink-0" />
                              {t('myTicket.uploadPaymentConfirmation')}
                            </>
                          )}
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isCancelling}>
                              {t('transaction.cancelButton')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('transaction.cancelButton')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('transaction.cancelConfirm')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('myTicket.cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  setIsCancelling(true);
                                  try {
                                    await transactionsService.cancelTransaction(transaction.id);
                                    await refetch();
                                  } catch (err) {
                                    console.error('Failed to cancel transaction:', err);
                                  } finally {
                                    setIsCancelling(false);
                                  }
                                }}
                              >
                                {t('myTicket.confirm')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      {uploadError && (
                        <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Transfer Details - Show when pending payment for bank transfer and no confirmation uploaded yet (non-unified view) */}
              {effectiveStatus === TransactionStatus.PendingPayment && 
               isBuyer && 
               bankTransferConfig &&
               !paymentConfirmation &&
               !isBankTransferPendingUpload && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-blue-900 mb-3 break-words">
                        {t('myTicket.bankTransferDetails')}
                      </p>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-blue-700">{t('myTicket.bankName')}</span>
                          <span className="font-medium text-blue-900">{bankTransferConfig.bankName}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-blue-700">{t('myTicket.accountHolder')}</span>
                          <span className="font-medium text-blue-900">{bankTransferConfig.accountHolderName}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-blue-700">{t('myTicket.cuitCuil')}</span>
                          <span className="font-medium text-blue-900">{bankTransferConfig.cuitCuil}</span>
                        </div>
                        <div className="flex flex-col gap-1 pt-2 border-t border-blue-200 sm:flex-row sm:justify-between sm:items-center sm:gap-2">
                          <div className="flex items-center justify-between gap-2 sm:contents">
                            <span className="text-blue-700">{t('myTicket.cbu')}</span>
                            <button
                              onClick={() => handleCopyCbu(bankTransferConfig.cbu)}
                              className={`sm:hidden flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                                copiedCbu
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95'
                              }`}
                              title={t('myTicket.copyCbu')}
                            >
                              {copiedCbu ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  {t('myTicket.copied')}
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  {t('myTicket.copy')}
                                </>
                              )}
                            </button>
                          </div>
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                            <span className="font-mono font-medium text-blue-900 break-all">{bankTransferConfig.cbu}</span>
                            <button
                              onClick={() => handleCopyCbu(bankTransferConfig.cbu)}
                              className={`hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                                copiedCbu
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95'
                              }`}
                              title={t('myTicket.copyCbu')}
                            >
                              {copiedCbu ? (
                                <>
                                  <Check className="w-4 h-4" />
                                  {t('myTicket.copied')}
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  {t('myTicket.copy')}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Confirmation Upload - Manual Payments (when not using unified bank transfer card) */}
              {needsPaymentConfirmation && !isBankTransferPendingUpload && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <Upload className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-orange-900 mb-2">
                        {t('myTicket.uploadPaymentConfirmation')}
                      </p>
                      <p className="text-sm text-orange-800 mb-3">
                        {t('myTicket.uploadPaymentConfirmationDesc')}
                      </p>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm sm:text-base bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                      >
                        {isUploading ? (
                          <>
                            <LoadingSpinner size="sm" />
                            {t('myTicket.uploading')}
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 flex-shrink-0" />
                            {t('myTicket.selectFile')}
                          </>
                        )}
                      </button>
                      
                      {uploadError && (
                        <p className="mt-2 text-sm text-red-600">{uploadError}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Confirmation Uploaded - Only visible to buyer while pending or rejected */}
              {paymentConfirmation && isBuyer && paymentConfirmation.status !== 'Accepted' && (
                <div className={`p-4 rounded-lg mb-4 ${
                  paymentConfirmation.status === 'Pending' ? 'bg-blue-50 border border-blue-200' :
                  paymentConfirmation.status === 'Accepted' ? 'bg-green-50 border border-green-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {paymentConfirmation.contentType.includes('pdf') ? (
                      <FileText className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        paymentConfirmation.status === 'Pending' ? 'text-blue-600' :
                        paymentConfirmation.status === 'Accepted' ? 'text-green-600' :
                        'text-red-600'
                      }`} />
                    ) : (
                      <Image className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        paymentConfirmation.status === 'Pending' ? 'text-blue-600' :
                        paymentConfirmation.status === 'Accepted' ? 'text-green-600' :
                        'text-red-600'
                      }`} />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-semibold ${
                          paymentConfirmation.status === 'Pending' ? 'text-blue-900' :
                          paymentConfirmation.status === 'Accepted' ? 'text-green-900' :
                          'text-red-900'
                        }`}>
                          {t('myTicket.paymentConfirmationUploaded')}
                        </p>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          paymentConfirmation.status === 'Pending' ? 'bg-blue-100 text-blue-800' :
                          paymentConfirmation.status === 'Accepted' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {t(`myTicket.confirmationStatus${paymentConfirmation.status}`)}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 ${
                        paymentConfirmation.status === 'Pending' ? 'text-blue-800' :
                        paymentConfirmation.status === 'Accepted' ? 'text-green-800' :
                        'text-red-800'
                      }`}>
                        {paymentConfirmation.originalFilename}
                      </p>

                      {paymentConfirmation.status === 'Pending' && (
                        <p className="text-sm text-blue-700 mt-2">
                          {t('myTicket.confirmationPendingDesc')}
                        </p>
                      )}
                      
                      <button
                        onClick={openPreviewModal}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium underline"
                      >
                        <Eye className="w-4 h-4" />
                        {t('myTicket.viewConfirmation')}
                      </button>

                      {paymentConfirmation.adminNotes && (
                        <p className="mt-2 text-sm italic">
                          {t('myTicket.adminNotes')}: {paymentConfirmation.adminNotes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {transaction.status === TransactionStatus.TicketTransferred && isBuyer && (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t('myTicket.confirmTicketReceived')}
                </button>
              )}

              {transaction.status === TransactionStatus.PaymentReceived && isSeller && (
                <>
                  <div className="mb-4 p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="font-medium mb-1">{t('myTicket.buyerDisclaimerTitle')}</p>
                    <p>{t('myTicket.buyerDisclaimerName', { name: transaction.buyerName })}</p>
                    {counterpartyEmail && (
                      <p className="mt-0.5">{t('myTicket.buyerDisclaimerEmail', { email: counterpartyEmail })}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmTransferModal(true);
                      setConfirmTransferModalStep(1);
                      setTransferProofFile(null);
                      setTransferProofError(null);
                    }}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {t('myTicket.confirmTicketTransferred')}
                  </button>
                </>
              )}

              {/* Seller: attach transfer proof (optional) after transfer is confirmed */}
              {transaction.status === TransactionStatus.TicketTransferred && isSeller && (
                <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('myTicket.attachTransferProofAfterTransfer')}
                  </label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setTransferProofFile(file ?? null);
                      setTransferProofError(null);
                    }}
                    className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {transferProofFile && (
                    <p className="mt-1 text-sm text-gray-500">{transferProofFile.name}</p>
                  )}
                  {transferProofError && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {transferProofError}
                    </p>
                  )}
                  {transaction.transferProofStorageKey && (
                    <p className="mt-2 text-sm text-green-700">
                      {t('myTicket.transferProofUploaded')}
                    </p>
                  )}
                  {transferProofFile && (
                    <button
                      type="button"
                      disabled={isUploadingTransferProof}
                      onClick={async () => {
                        const ACCEPTED_TYPES = ['image/', 'application/pdf'];
                        const MAX_SIZE_MB = 10;
                        const validType = ACCEPTED_TYPES.some(
                          (type) => transferProofFile.type === type || (type.endsWith('/') && transferProofFile.type.startsWith(type))
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
                          const data = await bffService.getTransactionDetails(transactionId!);
                          setTransaction(data.transaction);
                        } catch (err) {
                          console.error('Failed to upload transfer proof:', err);
                          setTransferProofError((err as ApiError).message ?? t('myTicket.proofUploadFailed'));
                        } finally {
                          setIsUploadingTransferProof(false);
                        }
                      }}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isUploadingTransferProof ? t('myTicket.confirmingTransfer') : t('myTicket.uploadTransferProof')}
                    </button>
                  )}
                </div>
              )}

              {/* Open dispute - buyer or seller when payment/ticket flow is active */}
              {canOpenDispute && (
                <button
                  type="button"
                  onClick={handleOpenDisputeClick}
                  className="w-full border border-red-300 text-red-700 py-3 px-4 rounded-lg font-semibold hover:bg-red-50 transition-colors"
                >
                  {t('myTicket.reportProblem')}
                </button>
              )}
            </div>

            {/* Leave a Review Section - Only show when transaction is completed */}
            {transaction.status === TransactionStatus.Completed && reviewData && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">{t('reviews.leaveReview')}</h2>
                </div>

                {reviewData.canReview ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">{t('reviews.leaveReviewDesc')}</p>

                    <div className="flex gap-3">
                      {(['positive', 'neutral', 'negative'] as ReviewRating[]).map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setSelectedRating(rating)}
                          className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                            getRatingColor(rating, selectedRating === rating)
                          } ${selectedRating === rating ? 'border-2' : 'border-transparent'}`}
                        >
                          {getRatingIcon(rating)}
                          <span className="text-sm font-medium">{t(`reviews.${rating}`)}</span>
                          <span className="text-xs text-center opacity-75">{t(`reviews.${rating}Desc`)}</span>
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder={t('reviews.commentPlaceholder')}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />

                    {reviewError && (
                      <p className="text-sm text-red-600">{reviewError}</p>
                    )}

                    <button
                      onClick={handleSubmitReview}
                      disabled={!selectedRating || isSubmittingReview}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingReview ? t('reviews.submitting') : t('reviews.submitReview')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-green-900">{t('reviews.reviewSubmitted')}</p>
                          <p className="text-sm text-green-800">{t('reviews.reviewSubmittedDesc')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Show user's own review */}
                    {(isBuyer ? reviewData.buyerReview : reviewData.sellerReview) && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{t('reviews.yourReview')}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium ${
                            (isBuyer ? reviewData.buyerReview : reviewData.sellerReview)?.rating === 'positive'
                              ? 'bg-green-100 text-green-700'
                              : (isBuyer ? reviewData.buyerReview : reviewData.sellerReview)?.rating === 'neutral'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {getRatingIcon((isBuyer ? reviewData.buyerReview : reviewData.sellerReview)!.rating)}
                            {t(`reviews.${(isBuyer ? reviewData.buyerReview : reviewData.sellerReview)!.rating}`)}
                          </span>
                        </div>
                        {(isBuyer ? reviewData.buyerReview : reviewData.sellerReview)?.comment && (
                          <p className="text-sm text-gray-600 italic">
                            "{(isBuyer ? reviewData.buyerReview : reviewData.sellerReview)?.comment}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Show other party's review if they left one */}
                    {(isBuyer ? reviewData.sellerReview : reviewData.buyerReview) && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-2">{t('reviews.otherPartyReview')}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium ${
                            (isBuyer ? reviewData.sellerReview : reviewData.buyerReview)?.rating === 'positive'
                              ? 'bg-green-100 text-green-700'
                              : (isBuyer ? reviewData.sellerReview : reviewData.buyerReview)?.rating === 'neutral'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {getRatingIcon((isBuyer ? reviewData.sellerReview : reviewData.buyerReview)!.rating)}
                            {t(`reviews.${(isBuyer ? reviewData.sellerReview : reviewData.buyerReview)!.rating}`)}
                          </span>
                        </div>
                        {(isBuyer ? reviewData.sellerReview : reviewData.buyerReview)?.comment ? (
                          <p className="text-sm text-gray-600 italic">
                            "{(isBuyer ? reviewData.sellerReview : reviewData.buyerReview)?.comment}"
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">{t('reviews.noComment')}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">{t('myTicket.paymentInfo')}</h2>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('myTicket.ticketPriceTotal')}</span>
                  <span className="text-gray-900">
                    {formatCurrency(transaction.ticketPrice.amount, transaction.ticketPrice.currency)}
                  </span>
                </div>
                {/* Price per unit and quantity detail */}
                <div className="text-xs text-gray-500 pl-0">
                  <span>
                    {t('myTicket.pricePerUnitDetail', {
                      price: formatCurrency(
                        Math.round(transaction.ticketPrice.amount / transaction.quantity),
                        transaction.ticketPrice.currency
                      ),
                      quantity: transaction.quantity,
                    })}
                  </span>
                  {ticketUnits.length > 0 && ticketUnits.some((u) => u.seat) && (
                    <div className="mt-1">
                      {t('myTicket.seatDetail')}:{' '}
                      {ticketUnits
                        .filter((u) => u.seat)
                        .map((u) => `${u.seat!.row}-${u.seat!.seatNumber}`)
                        .join(', ')}
                    </div>
                  )}
                </div>
                {isBuyer && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('myTicket.servicePrice')}</span>
                    <span className="text-gray-900">
                      {formatCurrency(transaction.servicePrice.amount, transaction.servicePrice.currency)}
                    </span>
                  </div>
                )}
                {isSeller && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('myTicket.sellerPlatformFee')}</span>
                    <span className="text-gray-900">
                      -{formatCurrency(transaction.sellerPlatformFee.amount, transaction.sellerPlatformFee.currency)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span className="text-gray-900">
                    {isBuyer ? t('myTicket.totalPaid') : t('myTicket.youReceive')}
                  </span>
                  <span className="text-gray-900">
                    {formatCurrency(
                      isBuyer ? transaction.totalPaid.amount : transaction.sellerReceives.amount,
                      isBuyer ? transaction.totalPaid.currency : transaction.sellerReceives.currency
                    )}
                  </span>
                </div>
              </div>

              {isBuyer && transaction.paymentMethodId && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('myTicket.paymentMethod')}</span>
                    <span className="text-gray-900">
                      {paymentMethodPublicName ??
                        (transaction.paymentMethodId.includes('bank_transfer')
                          ? t('myTicket.bankTransfer')
                          : transaction.paymentMethodId)}
                    </span>
                  </div>
                </div>
              )}

              {isBuyer && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-900">{t('myTicket.buyerProtection')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Counterparty Information */}
          <div className="space-y-6">
            {/* Counterparty Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {isBuyer ? t('myTicket.sellerInfo') : t('myTicket.buyerInfo')}
              </h2>

              <UserReviewsCard
                userId={isBuyer ? transaction.sellerId : transaction.buyerId}
                publicName={isBuyer ? transaction.sellerName : transaction.buyerName}
                role={isBuyer ? 'seller' : 'buyer'}
                showProfileLink={isBuyer}
              />

              {chatConfig && (
                <button
                  onClick={() => { setChatWasAutoOpened(false); setIsChatOpen(true); }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors mt-3"
                >
                  <MessageCircle className="w-4 h-4" />
                  {chatConfig.chatMode === 'only_read'
                    ? t('myTicket.readConversation')
                    : (isBuyer ? t('myTicket.contactSeller') : t('myTicket.contactBuyer'))}
                </button>
              )}
            </div>

            {/* Support Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('myTicket.needHelp')}</h2>
              
              <p className="text-sm text-gray-600 mb-4">
                {isBuyer ? t('myTicket.supportDescription') : t('myTicket.supportDescriptionSeller')}
              </p>

              <Link
                to={`/contact${transactionId ? `?transactionId=${encodeURIComponent(transactionId)}` : ''}`}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                <Mail className="w-4 h-4" />
                {t('myTicket.contactSupport')}
              </Link>
            </div>

            {/* Transaction Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('myTicket.transactionInfo')}</h2>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">{t('myTicket.createdAt')}</span>
                  <p className="font-semibold text-gray-900">
                    {formatDateTime(transaction.createdAt)}
                  </p>
                </div>
                {transaction.deliveryMethod && (
                  <div>
                    <span className="text-gray-600">{t('myTicket.deliveryMethod')}</span>
                    <p className="font-semibold text-gray-900 capitalize">{transaction.deliveryMethod}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm transfer modal: step 1 = how did you send the ticket; step 2 = optional upload proof (wizard). */}
      {showConfirmTransferModal && transaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {confirmTransferModalStep === 1 ? (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t('myTicket.confirmTransferTitle')}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {t('myTicket.confirmTransferPayloadHint')}
                </p>
                {counterpartyEmail && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                    {t('myTicket.transferDisclaimerBuyerEmail', { email: counterpartyEmail })}
                  </p>
                )}
                <div className="space-y-2 mb-4">
                  {(['ticketera', 'pdf_or_image', 'other'] as const).map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"
                    >
                      <input
                        type="radio"
                        name="payloadType"
                        value={type}
                        checked={confirmTransferPayloadType === type}
                        onChange={() => setConfirmTransferPayloadType(type)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="font-medium">{t(`myTicket.payloadType_${type}`)}</span>
                    </label>
                  ))}
                </div>
                {confirmTransferPayloadType === 'other' && (
                  <div className="mb-6">
                    <input
                      type="text"
                      value={confirmTransferPayloadTypeOtherText}
                      onChange={(e) => setConfirmTransferPayloadTypeOtherText(e.target.value)}
                      placeholder={t('myTicket.payloadTypeOtherPlaceholder')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmTransferModal(false);
                      setConfirmTransferPayloadTypeOtherText('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
                          ...(confirmTransferPayloadType === 'other' && confirmTransferPayloadTypeOtherText.trim() && {
                            payloadTypeOtherText: confirmTransferPayloadTypeOtherText.trim(),
                          }),
                        });
                        setTransaction(prev => prev ? { ...prev, ...updated } : null);
                        setConfirmTransferModalStep(2);
                        setConfirmTransferPayloadTypeOtherText('');
                      } catch (err) {
                        console.error('Failed to confirm transfer:', err);
                        setTransferProofError((err as ApiError).message ?? t('myTicket.proofUploadFailed'));
                      } finally {
                        setIsConfirmingTransfer(false);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isConfirmingTransfer ? t('myTicket.confirmingTransfer') : t('myTicket.confirmTransferSubmit')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t('myTicket.uploadTransferProof')}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {t('myTicket.attachTransferProofAfterTransfer')}
                </p>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setTransferProofFile(file ?? null);
                    setTransferProofError(null);
                  }}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2"
                />
                {transferProofFile && (
                  <p className="mt-1 text-sm text-gray-500 mb-2">{transferProofFile.name}</p>
                )}
                {transferProofError && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1 mb-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {transferProofError}
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmTransferModal(false);
                      setConfirmTransferModalStep(1);
                      setTransferProofFile(null);
                      setTransferProofError(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    {t('myTicket.skipTransferProofStep')}
                  </button>
                  <button
                    type="button"
                    disabled={!transferProofFile || isUploadingTransferProof}
                    onClick={async () => {
                      if (!transferProofFile || !transactionId) return;
                      const ACCEPTED_TYPES = ['image/', 'application/pdf'];
                      const MAX_SIZE_MB = 10;
                      const validType = ACCEPTED_TYPES.some(
                        (type) => transferProofFile.type === type || (type.endsWith('/') && transferProofFile.type.startsWith(type))
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
                        const data = await bffService.getTransactionDetails(transactionId);
                        setTransaction(data.transaction);
                        setShowConfirmTransferModal(false);
                        setConfirmTransferModalStep(1);
                        setTransferProofFile(null);
                      } catch (err) {
                        console.error('Failed to upload transfer proof:', err);
                        setTransferProofError((err as ApiError).message ?? t('myTicket.proofUploadFailed'));
                      } finally {
                        setIsUploadingTransferProof(false);
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isUploadingTransferProof ? t('myTicket.confirmingTransfer') : t('myTicket.uploadTransferProof')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Open dispute modal — step 1: choice (when chat enabled), step 2: form */}
      {showDisputeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            {disputeModalStep === 'choice' ? (
              <>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {t('myTicket.disputeTitle')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleCloseDisputeModal}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    aria-label={t('myTicket.cancel')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-700 mb-6">
                  {t('myTicket.disputeTryChatFirst')}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseDisputeModal();
                      setChatWasAutoOpened(false);
                      setIsChatOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5 flex-shrink-0" />
                    {isBuyer ? t('myTicket.contactSeller') : t('myTicket.contactBuyer')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisputeModalStep('form')}
                    className="flex-1 flex items-center justify-center gap-2 border-2 border-red-300 text-red-700 py-3 px-4 rounded-lg font-semibold hover:bg-red-50 transition-colors"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    {t('myTicket.reportProblem')}
                  </button>
                </div>
              </>
            ) : disputeModalStep === 'report_sent' ? (
              <>
                <div className="flex flex-col items-center text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    {t('myTicket.reportProblemSuccess')}
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <Link
                      to={reportSuccessTicketId ? `/support/${reportSuccessTicketId}` : '#'}
                      onClick={handleCloseDisputeModal}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      {t('myTicket.reportProblemSuccessLink')}
                    </Link>
                    <button
                      type="button"
                      onClick={handleCloseDisputeModal}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      {t('myTicket.close')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {t('myTicket.disputeTitle')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleCloseDisputeModal}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    aria-label={t('myTicket.cancel')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  {t('myTicket.disputeIntro')}
                </p>
                {!user?.phoneVerified && (
                  <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    <p className="mb-2">{t('myTicket.disputePhoneRequiredDisclaimer')}</p>
                    <Link
                      to="/phone-verification"
                      className="font-medium underline hover:no-underline"
                      onClick={() => handleCloseDisputeModal()}
                    >
                      {t('myTicket.disputeVerifyPhoneLink')}
                    </Link>
                  </div>
                )}
                {chatConfig?.chatMode === 'enabled' && chatConfig.hasExchangedMessages && (
                  <p className="text-sm text-gray-700 mb-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                    {t('myTicket.disputeAlreadyChatted')}
                  </p>
                )}
                <form onSubmit={handleSubmitDispute} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('myTicket.disputeReason')} <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={reportCategory}
                      onValueChange={(v) => setReportCategory(v as SupportCategory)}
                    >
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('myTicket.disputeSubject')}
                    </label>
                    <input
                      type="text"
                      value={disputeSubject}
                      onChange={(e) => setDisputeSubject(e.target.value)}
                      placeholder={t('myTicket.disputeSubjectPlaceholder')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      {t('myTicket.disputeDescription')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      placeholder={t('myTicket.disputeDescriptionPlaceholder')}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  {disputeError && (
                    <div className="text-sm text-red-600 space-y-1">
                      <p className="flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {disputeError}
                      </p>
                      {disputeExistingTicketId && (
                        <p>
                          <Link
                            to={`/support/${disputeExistingTicketId}`}
                            className="font-medium text-red-700 underline hover:no-underline"
                            onClick={() => handleCloseDisputeModal()}
                          >
                            {t('myTicket.reportProblemViewExistingCase')}
                          </Link>
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseDisputeModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {t('myTicket.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingDispute || !user?.phoneVerified}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {isSubmittingDispute ? t('myTicket.disputeSubmitting') : t('myTicket.disputeSubmit')}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t('myTicket.confirmReceiptTitle')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('myTicket.confirmReceiptMessage')}
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('myTicket.attachReceiptProof')}
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setReceiptProofFile(file ?? null);
                  setReceiptProofError(null);
                }}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {receiptProofFile && (
                <p className="mt-1 text-sm text-gray-500">{receiptProofFile.name}</p>
              )}
              {receiptProofError && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {receiptProofError}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setReceiptProofFile(null);
                  setReceiptProofError(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('myTicket.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmReceipt}
                disabled={isConfirmingReceipt}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isConfirmingReceipt ? t('myTicket.confirmingReceipt') : t('myTicket.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showPreviewModal && paymentConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {t('myTicket.paymentConfirmation')}
              </h3>
              <button
                onClick={closePreviewModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-80px)]">
              {previewLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : previewBlobUrl ? (
                paymentConfirmation.contentType.includes('pdf') ? (
                  <iframe
                    src={previewBlobUrl}
                    className="w-full h-[70vh]"
                    title={t('myTicket.paymentConfirmation')}
                  />
                ) : (
                  <img
                    src={previewBlobUrl}
                    alt={t('myTicket.paymentConfirmation')}
                    className="max-w-full mx-auto"
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-[400px] text-gray-500">
                  {t('common.errorLoading')}
                </div>
              )}
            </div>
          </div>
        </div>
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
    </div>
  );
}
