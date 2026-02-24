import type { 
  SupportCategory, 
  DisputeReason, 
  SupportTicket, 
  SupportTicketWithMessages,
  DisputeResolution,
} from './support.domain';

/**
 * Request to create a support ticket
 */
export interface CreateSupportTicketRequest {
  transactionId?: string;
  category: SupportCategory;
  disputeReason?: DisputeReason;
  subject: string;
  description: string;
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

/**
 * Response for POST /api/support/dev/seed-demo
 */
export interface SeedDemoResponse {
  credentials: {
    admin: { email: string; password: string };
    seller: { email: string; password: string };
    buyer: { email: string; password: string };
  };
  ids: {
    adminUserId: string;
    sellerUserId: string;
    buyerUserId: string;
    eventId: string;
    eventDateIds: string[];
    ticketListingIds: string[];
  };
  created: {
    eventDates: string[];
    ticketListings: string[];
  };
}
