import type { ReactNode } from 'react';
import type {
  TransactionWithDetails,
  PaymentConfirmation,
  TransactionReviewsData,
  BankTransferConfig,
  ReviewRating,
} from '@/api/types';
import type { TransactionTicketUnit, TransactionDetailsChatConfig } from '@/api/types/bff';
import type { TransactionStatus, CancellationReason } from '@/api/types';
import type { SupportCategory } from '@/api/types/support';

export type TxRole = 'buyer' | 'seller';

export interface TransactionStepperProps {
  effectiveStatus: TransactionStatus;
  disputed: boolean;
  labels: [string, string, string, string];
}

export interface EscrowTimelineProps {
  role: TxRole;
  eventDateLabel: string;
  depositReleaseAtLabel: string | null;
}

export interface EventCardProps {
  eventName: string;
  eventDateLabel: string;
  venue: string;
  ticketTypeLabel: string;
  sectorLabel: string | null;
  squareUrl?: string | null;
  rectangleUrl?: string | null;
  quantity: number;
}

export interface TxMetaProps {
  transactionId: string;
  createdAtLabel: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
  copiedLabel: string;
  idLabel: string;
  createdLabel: string;
}

export type ActionHeroVariant = 'blue' | 'amber' | 'green' | 'violet' | 'muted' | 'red';

export interface ActionHeroProps {
  variant: ActionHeroVariant;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  children?: ReactNode;
}

export interface BankDetailsBlockProps {
  bankName: string;
  cbu: string;
  holderName: string;
  cuit: string;
  copiedCbu: boolean;
  onCopyCbu: () => void;
  labels: {
    bank: string;
    cbu: string;
    holder: string;
    cuit: string;
    copy: string;
    copied: string;
  };
}

export interface CounterpartCardProps {
  userId: string;
  name: string;
  roleLabel: string;
  contactLabel: string;
  onContact: () => void;
  contactDisabled: boolean;
  showProfileLink: boolean;
  counterpartRole: 'seller' | 'buyer';
}

export interface EscrowCardProps {
  message: string;
  title: string;
}

export interface HelpCardProps {
  title: string;
  body: string;
  supportLabel: string;
  supportTo: string;
}

export interface PaymentInfoBuyerProps {
  title?: string;
  subtotalLabel: string;
  subtotalAmount: string;
  subtotalDetail: string;
  feeLabel: string;
  feeAmount: string;
  feeDetail: string;
  totalLabel: string;
  totalFormatted: string;
  methodLabel: string;
  methodName: string | null;
  protectedNote: string;
}

export interface PaymentInfoSellerProps {
  title?: string;
  saleLabel: string;
  saleAmount: string;
  saleDetail: string;
  commissionLabel: string;
  commissionFormatted: string;
  netLabel: string;
  netFormatted: string;
  methodLabel: string;
  methodName: string | null;
}

export interface ModalOverlayProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export interface PaymentProofPreviewModalProps extends ModalOverlayProps {
  loading: boolean;
  blobUrl: string | null;
}

export interface TransferMethodModalProps {
  open: boolean;
  onClose: () => void;
  step: 1 | 2;
  payloadType: 'ticketera' | 'pdf_or_image' | 'other';
  onPayloadTypeChange: (v: 'ticketera' | 'pdf_or_image' | 'other') => void;
  payloadTypeOtherText: string;
  onPayloadTypeOtherTextChange: (v: string) => void;
  transferProofFile: File | null;
  onTransferProofChange: (f: File | null) => void;
  onNext: () => void;
  onBack: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
  transferProofError: string | null;
  isUploadingProof: boolean;
  labels: Record<string, string>;
}

export interface ConfirmReceiptModalProps {
  open: boolean;
  onClose: () => void;
  depositReleaseAtLabel: string | null;
  receiptProofFile: File | null;
  onReceiptProofChange: (f: File | null) => void;
  onConfirm: () => void;
  isConfirming: boolean;
  receiptProofError: string | null;
  labels: Record<string, string>;
}

export interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  step: 'choice' | 'form' | 'report_sent';
  showChoiceStep: boolean;
  counterpartWord: string;
  onChooseChat: () => void;
  onChooseReport: () => void;
  reportCategory: SupportCategory;
  onCategoryChange: (c: SupportCategory) => void;
  disputeSubject: string;
  onSubjectChange: (s: string) => void;
  disputeDescription: string;
  onDescriptionChange: (s: string) => void;
  disputeError: string | null;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  reportSuccessTicketId: string | null;
  disputeExistingTicketId: string | null;
  categories: { value: SupportCategory; label: string }[];
  labels: Record<string, string>;
}

/** Props bag for action blocks — parent (MyTicket) passes transaction slice + handlers */
export interface BuyerActionBlockProps {
  effectiveStatus: TransactionStatus;
  effectiveCancellationReason: CancellationReason | null | undefined;
  isManualPayment: boolean;
  paymentConfirmation: PaymentConfirmation | null;
  transaction: TransactionWithDetails;
  bankTransferConfig: BankTransferConfig | null;
  paymentExpiresAt: string | null | undefined;
  isPaymentExpiredLocally: boolean;
  isUploading: boolean;
  uploadError: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerUpload: () => void;
  onOpenPreview: () => void;
  isCancelling: boolean;
  onCancelTransaction: () => Promise<void>;
  canOpenDispute: boolean;
  onOpenDispute: () => void;
  onOpenConfirmReceipt: () => void;
  copiedCbu: boolean;
  onCopyCbu: (cbu: string) => void;
  reviewData: TransactionReviewsData | null;
  selectedRating: ReviewRating | null;
  onRatingSelect: (r: ReviewRating) => void;
  reviewComment: string;
  onReviewCommentChange: (s: string) => void;
  onSubmitReview: () => void;
  isSubmittingReview: boolean;
  reviewError: string | null;
  getRatingIcon: (r: ReviewRating) => ReactNode;
  getRatingColor: (r: ReviewRating, sel: boolean) => string;
  disputeId: string | null | undefined;
  onPaymentExpired: () => void;
}

export interface SellerActionBlockProps {
  effectiveStatus: TransactionStatus;
  transaction: TransactionWithDetails;
  counterpartyEmail: string | null;
  canOpenDispute: boolean;
  onOpenDispute: () => void;
  onOpenTransferModal: () => void;
  isSellerUnverifiedGate: boolean;
  reviewData: TransactionReviewsData | null;
  selectedRating: ReviewRating | null;
  onRatingSelect: (r: ReviewRating) => void;
  reviewComment: string;
  onReviewCommentChange: (s: string) => void;
  onSubmitReview: () => void;
  isSubmittingReview: boolean;
  reviewError: string | null;
  getRatingIcon: (r: ReviewRating) => ReactNode;
  getRatingColor: (r: ReviewRating, sel: boolean) => string;
  transferProofFile: File | null;
  isUploadingTransferProof: boolean;
  transferProofError: string | null;
  onTransferProofSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputTransferRef: React.RefObject<HTMLInputElement | null>;
  onUploadTransferProof: () => void;
  disputeId: string | null | undefined;
}

export interface TransactionLayoutProps {
  backButton: ReactNode;
  banner: ReactNode;
  mainColumn: ReactNode;
  sidebar: ReactNode;
}

export function transactionCurrentStep(status: TransactionStatus): number {
  const map: Partial<Record<TransactionStatus, number>> = {
    PendingPayment: 0,
    PaymentPendingVerification: 0,
    PaymentReceived: 1,
    TicketTransferred: 2,
    DepositHold: 2,
    TransferringFund: 3,
    Completed: 3,
    Disputed: 2,
    Refunded: 0,
    Cancelled: 0,
  };
  return map[status] ?? 0;
}
