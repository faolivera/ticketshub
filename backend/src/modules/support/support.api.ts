import type {
  SupportCategory,
  SupportTicket,
  SupportTicketWithMessages,
  DisputeResolution,
  SupportTicketSource,
} from './support.domain';

/**
 * Request to create a support ticket (authenticated)
 */
export interface CreateSupportTicketRequest {
  transactionId?: string;
  category: SupportCategory;
  /** Origin of the ticket (optional). */
  source?: SupportTicketSource;
  subject: string;
  description: string;
}

/**
 * Request for public (anonymous) contact form - no auth
 */
export interface PublicContactRequest {
  name: string;
  email: string;
  subject: string;
  description: string;
  transactionId?: string;
  source?: SupportTicketSource;
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
export interface ListSupportTicketsQuery {
  status?: string;
  category?: SupportCategory;
  limit?: number;
  offset?: number;
}

