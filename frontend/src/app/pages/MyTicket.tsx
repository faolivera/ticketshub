import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, CheckCircle, CreditCard, Shield, MessageCircle, Mail, Upload, FileText, Image, AlertCircle, Eye, X, ThumbsUp, ThumbsDown, Minus, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TicketChat } from '@/app/components/TicketChat';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorAlert } from '@/app/components/ErrorMessage';
import { UserReviewsCard } from '@/app/components/UserReviewsCard';
import { transactionsService, paymentConfirmationsService, reviewsService, bffService } from '@/api/services';
import { useUser } from '../contexts/UserContext';
import type { TransactionWithDetails, PaymentConfirmation, ReviewRating, TransactionReviewsData } from '@/api/types';
import { TransactionStatus } from '@/api/types';

export function MyTicket() {
  const { t } = useTranslation();
  const { transactionId } = useParams();
  const { user } = useUser();
  
  const [transaction, setTransaction] = useState<TransactionWithDetails | null>(null);
  const [paymentConfirmation, setPaymentConfirmation] = useState<PaymentConfirmation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      } catch (err) {
        console.error('Failed to fetch transaction:', err);
        setError(t('common.errorLoading'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [transactionId, t]);

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

  const getStatusStep = (status: TransactionStatus): number => {
    switch (status) {
      case TransactionStatus.PendingPayment:
        return 0;
      case TransactionStatus.PaymentReceived:
        return 1;
      case TransactionStatus.TicketTransferred:
        return 2;
      case TransactionStatus.Completed:
        return 4;
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

    try {
      const updated = await transactionsService.confirmReceipt(transactionId, { confirmed: true });
      setTransaction(prev => prev ? { ...prev, ...updated } : null);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Failed to confirm receipt:', err);
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

  const isManualPayment = transaction?.paymentMethodId?.includes('bank_transfer');
  const needsPaymentConfirmation = isManualPayment && 
    transaction?.status === TransactionStatus.PendingPayment && 
    isBuyer && 
    !paymentConfirmation;

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

  const statusInfo = getStatusInfo(transaction.status, isBuyer ? 'buyer' : 'seller');
  const StatusIcon = statusInfo.icon;
  const statusStep = getStatusStep(transaction.status);
  const eventDate = new Date(transaction.eventDate);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link 
          to="/my-tickets"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('myTicket.backToMyTickets')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Transaction Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">{transaction.eventName}</h1>
                    <div className="flex items-center gap-2 text-blue-100">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {eventDate.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                    <span className="text-xs font-semibold">{transaction.ticketType}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-blue-100">
                  <MapPin className="w-4 h-4" />
                  <span>{transaction.venue}</span>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.quantity')}</p>
                    <p className="font-semibold text-gray-900">{transaction.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.ticketType')}</p>
                    <p className="font-semibold text-gray-900">{transaction.ticketType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.role')}</p>
                    <p className="font-semibold text-gray-900">
                      {isBuyer ? t('myTicket.buyer') : t('myTicket.seller')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('myTicket.transactionId')}</p>
                    <p className="font-mono text-xs text-gray-900 truncate">{transaction.id}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status & Timeline */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">{t('myTicket.ticketStatus')}</h2>

              {/* Status Timeline */}
              <div className="mb-6">
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${(statusStep / 4) * 100}%` }}
                    />
                  </div>

                  {/* Status Steps */}
                  <div className="relative grid grid-cols-4 gap-2">
                    {/* Step 1: Paid */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        statusStep >= 1 ? 'bg-blue-600 text-white' : 
                        statusStep === 0 ? 'bg-yellow-100 text-yellow-600' : 
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {statusStep >= 1 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <p className={`text-xs text-center font-medium ${
                        statusStep >= 1 ? 'text-gray-900' : 
                        statusStep === 0 ? 'text-yellow-600' : 'text-gray-400'
                      }`}>
                        {t('myTicket.statusStepPaid')}
                      </p>
                    </div>

                    {/* Step 2: Payment Received */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        statusStep >= 2 ? 'bg-blue-600 text-white' : 
                        statusStep === 1 ? 'bg-yellow-100 text-yellow-600' : 
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {statusStep >= 2 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <p className={`text-xs text-center font-medium ${
                        statusStep >= 2 ? 'text-gray-900' : 
                        statusStep === 1 ? 'text-yellow-600' : 'text-gray-400'
                      }`}>
                        {t('myTicket.statusStepTransferred')}
                      </p>
                    </div>

                    {/* Step 3: Confirmed */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        statusStep >= 3 ? 'bg-blue-600 text-white' : 
                        statusStep === 2 ? 'bg-yellow-100 text-yellow-600' : 
                        'bg-gray-200 text-gray-400'
                      }`}>
                        {statusStep >= 3 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <p className={`text-xs text-center font-medium ${
                        statusStep >= 3 ? 'text-gray-900' : 
                        statusStep === 2 ? 'text-yellow-600' : 'text-gray-400'
                      }`}>
                        {t('myTicket.statusStepConfirmed')}
                      </p>
                    </div>

                    {/* Step 4: Completed */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        statusStep >= 4 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {statusStep >= 4 ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <p className={`text-xs text-center font-medium ${
                        statusStep >= 4 ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {t('myTicket.statusStepReleased')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Status Description */}
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
                  <div>
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
                  </div>
                </div>
              </div>

              {/* Payment Confirmation Upload - Manual Payments */}
              {needsPaymentConfirmation && (
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
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                      >
                        {isUploading ? (
                          <>
                            <LoadingSpinner size="sm" />
                            {t('myTicket.uploading')}
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
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

              {/* Payment Confirmation Uploaded */}
              {paymentConfirmation && (
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
                <button
                  onClick={async () => {
                    try {
                      const updated = await transactionsService.confirmTransfer(transaction.id);
                      setTransaction(prev => prev ? { ...prev, ...updated } : null);
                    } catch (err) {
                      console.error('Failed to confirm transfer:', err);
                    }
                  }}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  {t('myTicket.confirmTicketTransferred')}
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
                  <span className="text-gray-600">{t('myTicket.ticketPrice')}</span>
                  <span className="text-gray-900">
                    ${(transaction.ticketPrice.amount / 100).toFixed(2)} {transaction.ticketPrice.currency}
                  </span>
                </div>
                {isBuyer && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('myTicket.buyerPlatformFee')}</span>
                      <span className="text-gray-900">
                        ${(transaction.buyerPlatformFee.amount / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('myTicket.paymentMethodCommission')}</span>
                      <span className="text-gray-900">
                        ${(transaction.paymentMethodCommission.amount / 100).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                {isSeller && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('myTicket.sellerPlatformFee')}</span>
                    <span className="text-gray-900">
                      -${(transaction.sellerPlatformFee.amount / 100).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span className="text-gray-900">
                    {isBuyer ? t('myTicket.totalPaid') : t('myTicket.youReceive')}
                  </span>
                  <span className="text-gray-900">
                    ${((isBuyer ? transaction.totalPaid.amount : transaction.sellerReceives.amount) / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              {transaction.paymentMethodId && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('myTicket.paymentMethod')}</span>
                    <span className="text-gray-900">
                      {transaction.paymentMethodId.includes('bank_transfer') 
                        ? t('myTicket.bankTransfer') 
                        : transaction.paymentMethodId}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-900">{t('myTicket.buyerProtection')}</p>
              </div>
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

              {isBuyer && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors mt-3"
                >
                  <MessageCircle className="w-4 h-4" />
                  {t('myTicket.contactSeller')}
                </button>
              )}
            </div>

            {/* Support Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('myTicket.needHelp')}</h2>
              
              <p className="text-sm text-gray-600 mb-4">
                {t('myTicket.supportDescription')}
              </p>

              <button
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                <Mail className="w-4 h-4" />
                {t('myTicket.contactSupport')}
              </button>
            </div>

            {/* Transaction Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">{t('myTicket.transactionInfo')}</h2>
              
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">{t('myTicket.createdAt')}</span>
                  <p className="font-semibold text-gray-900">
                    {new Date(transaction.createdAt).toLocaleString()}
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {t('myTicket.confirmReceiptTitle')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('myTicket.confirmReceiptMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('myTicket.cancel')}
              </button>
              <button
                onClick={handleConfirmReceipt}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('myTicket.confirm')}
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

      {/* Chat Component */}
      {isBuyer && (
        <TicketChat
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          sellerName={transaction.sellerName}
          sellerImage=""
          sellerRating={0}
          sellerLevel={1}
          ticketTitle={`${transaction.eventName} - ${transaction.ticketType}`}
        />
      )}
    </div>
  );
}
