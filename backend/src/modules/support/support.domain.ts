/**
 * Support ticket category
 */
export enum SupportCategory {
  TicketDispute = 'TicketDispute',
  PaymentIssue = 'PaymentIssue',
  AccountIssue = 'AccountIssue',
  Other = 'Other',
}

/**
 * Dispute reason - specific reasons for ticket disputes
 */
export enum DisputeReason {
  TicketNotReceived = 'TicketNotReceived',
  TicketDidntWork = 'TicketDidntWork',
}

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
  disputeReason?: DisputeReason; // If category is TicketDispute
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
