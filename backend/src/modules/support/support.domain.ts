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
  TicketInvalid = 'TicketInvalid',
  TicketDuplicate = 'TicketDuplicate',
  WrongTicket = 'WrongTicket',
  EventCancelled = 'EventCancelled',
  Other = 'Other',
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
  BuyerWins = 'BuyerWins',    // Full refund to buyer
  SellerWins = 'SellerWins',  // Payment released to seller
  SplitResolution = 'SplitResolution', // Partial refund
  NoResolution = 'NoResolution', // Closed without resolution
}

/**
 * Support ticket entity
 */
export interface SupportTicket {
  id: string;
  userId: string;
  transactionId?: string; // If related to a transaction
  
  category: SupportCategory;
  disputeReason?: DisputeReason; // If category is TicketDispute
  
  subject: string;
  description: string;
  
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
