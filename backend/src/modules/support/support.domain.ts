/**
 * Support ticket category.
 * Transaction-related categories (TicketNotReceived, TicketDidntWork, BuyerDidNotConfirmReceipt)
 * are used for "report a problem" from a transaction; only TicketDidntWork triggers a formal dispute.
 */
export enum SupportCategory {
  /** Buyer: did not receive the ticket(s). Reference: payment date. Does not set transaction to Disputed. */
  TicketNotReceived = 'TicketNotReceived',
  /** Buyer: ticket did not work. Reference: event date. Sets transaction to Disputed. */
  TicketDidntWork = 'TicketDidntWork',
  /** Seller: buyer has not confirmed receipt. Only when status is TicketTransferred. Does not set transaction to Disputed. */
  BuyerDidNotConfirmReceipt = 'BuyerDidNotConfirmReceipt',
  PaymentIssue = 'PaymentIssue',
  AccountIssue = 'AccountIssue',
  Other = 'Other',
}

/** Categories that trigger a formal dispute: transaction → Disputed, buyer flag set. */
export const DISPUTE_TRIGGERING_CATEGORIES: SupportCategory[] = [
  SupportCategory.TicketDidntWork,
];

/** Categories available in the transaction "report a problem" flow. */
export const REPORT_PROBLEM_CATEGORIES: SupportCategory[] = [
  SupportCategory.TicketNotReceived,
  SupportCategory.TicketDidntWork,
  SupportCategory.BuyerDidNotConfirmReceipt,
];

export function isDisputeTriggeringCategory(
  category: SupportCategory,
): boolean {
  return DISPUTE_TRIGGERING_CATEGORIES.includes(category);
}

export function isReportProblemCategory(category: SupportCategory): boolean {
  return REPORT_PROBLEM_CATEGORIES.includes(category);
}

export type SupportPriority = 'low' | 'medium' | 'high' | 'urgent';

/** Priority derived from support category (used for ticket prioritization). */
export function getPriorityForCategory(
  category: SupportCategory,
): SupportPriority {
  if (isDisputeTriggeringCategory(category)) return 'high';
  if (
    category === SupportCategory.TicketNotReceived ||
    category === SupportCategory.BuyerDidNotConfirmReceipt ||
    category === SupportCategory.PaymentIssue
  ) {
    return 'medium';
  }
  return 'low';
}

/** Message content key for frontend to render "verify identity" system message with link. */
export const SUPPORT_MESSAGE_KEY_DISPUTE_VERIFY_IDENTITY =
  '{{DISPUTE_VERIFY_IDENTITY}}';

/**
 * Support ticket status
 */
export enum SupportTicketStatus {
  Open = 'open',
  InProgress = 'inProgress',
  WaitingForCustomer = 'waitingForCustomer',
  Resolved = 'resolved',
  Closed = 'closed',
}

/**
 * Dispute resolution outcome
 */
export enum DisputeResolution {
  BuyerWins = 'BuyerWins', // Full refund to buyer
  SellerWins = 'SellerWins', // Payment released to seller
  SplitResolution = 'SplitResolution', // Partial refund
  NoResolution = 'NoResolution', // Closed without resolution
}

/**
 * Origin of the support ticket (for prioritization and filtering)
 */
export enum SupportTicketSource {
  Dispute = 'Dispute',
  ContactFromTransaction = 'ContactFromTransaction',
  ContactForm = 'ContactForm',
}

/**
 * Support ticket entity
 */
export interface SupportTicket {
  id: string;
  userId?: string; // Optional for anonymous (guest) tickets
  transactionId?: string; // If related to a transaction

  category: SupportCategory;
  /** Origin of the ticket: dispute, contact from /transaction, or contact form */
  source?: SupportTicketSource;

  subject: string;
  description: string;

  /** Guest contact info when userId is not set (anonymous contact) */
  guestName?: string;
  guestEmail?: string;
  /** Guest identifier for anonymous tickets: "guest:{client_ip}" */
  guestId?: string;

  status: SupportTicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Resolution details
  resolution?: DisputeResolution;
  resolutionNotes?: string;
  resolvedBy?: string; // Admin userId

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

/**
 * Support ticket message
 */
export interface SupportMessage {
  id: string;
  ticketId: string;
  userId: string;
  isAdmin: boolean;
  message: string;
  attachmentUrls?: string[];
  createdAt: Date;
}

/**
 * Support ticket with messages
 */
export interface SupportTicketWithMessages extends SupportTicket {
  messages: SupportMessage[];
}
