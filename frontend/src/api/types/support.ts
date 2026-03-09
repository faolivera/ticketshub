import type { PaginationParams } from './common';

/**
 * Support ticket category.
 * Transaction-related (TicketNotReceived, TicketDidntWork, BuyerDidNotConfirmReceipt)
 * are used for "report a problem"; only TicketDidntWork triggers a formal dispute.
 */
export enum SupportCategory {
  TicketNotReceived = 'TicketNotReceived',
  TicketDidntWork = 'TicketDidntWork',
  BuyerDidNotConfirmReceipt = 'BuyerDidNotConfirmReceipt',
  PaymentIssue = 'PaymentIssue',
  AccountIssue = 'AccountIssue',
  Other = 'Other',
}

/** Categories available in the transaction "report a problem" flow. */
export const REPORT_PROBLEM_CATEGORIES: SupportCategory[] = [
  SupportCategory.TicketNotReceived,
  SupportCategory.TicketDidntWork,
  SupportCategory.BuyerDidNotConfirmReceipt,
];

/** Message content key for system "verify identity" message (frontend renders with i18n + link). */
export const SUPPORT_MESSAGE_KEY_DISPUTE_VERIFY_IDENTITY = '{{DISPUTE_VERIFY_IDENTITY}}';

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
  BuyerWins = 'BuyerWins',
  SellerWins = 'SellerWins',
  SplitResolution = 'SplitResolution',
  NoResolution = 'NoResolution',
}

/**
 * Origin of the support ticket
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
  userId?: string;
  transactionId?: string;

  category: SupportCategory;
  source?: SupportTicketSource;

  subject: string;
  description: string;

  /** Guest contact when ticket is anonymous */
  guestName?: string;
  guestEmail?: string;
  /** Guest identifier: "guest:{client_ip}" */
  guestId?: string;

  status: SupportTicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Resolution details
  resolution?: DisputeResolution;
  resolutionNotes?: string;
  resolvedBy?: string;

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

// === API Types ===

/**
 * Request to create a support ticket (authenticated)
 */
export interface CreateSupportTicketRequest {
  transactionId?: string;
  category: SupportCategory;
  source?: SupportTicketSource;
  subject: string;
  description: string;
}

/**
 * Request for public contact form (no auth)
 */
export interface PublicContactRequest {
  name: string;
  email: string;
  subject: string;
  description: string;
  transactionId?: string;
}

/**
 * Response after creating a support ticket
 */
export type CreateSupportTicketResponse = SupportTicket;

/**
 * Request to add a message to a ticket
 */
export interface AddMessageRequest {
  message: string;
  attachmentUrls?: string[];
}

/**
 * Response after adding a message
 */
export interface AddMessageResponse {
  success: boolean;
  messageId: string;
}

/**
 * Request to resolve a dispute (admin only)
 */
export interface ResolveDisputeRequest {
  resolution: DisputeResolution;
  resolutionNotes: string;
}

/**
 * Response after resolving a dispute
 */
export type ResolveDisputeResponse = SupportTicket;

/**
 * Response for getting ticket details
 */
export type GetSupportTicketResponse = SupportTicketWithMessages;

/**
 * Response for listing tickets
 */
export type ListSupportTicketsResponse = SupportTicket[];

/**
 * Query params for listing tickets
 */
export interface ListSupportTicketsQuery extends PaginationParams {
  status?: string;
  category?: SupportCategory;
}
