import type { Ctx } from '../../common/types/context';
import type { SupportTicket, SupportMessage } from './support.domain';

/**
 * Support repository interface
 * Handles both SupportTicket and SupportMessage entities
 */
export interface ISupportRepository {
  // ==================== Tickets ====================

  /**
   * Create a new support ticket
   */
  createTicket(ctx: Ctx, ticket: SupportTicket): Promise<SupportTicket>;

  /**
   * Find ticket by ID
   */
  findTicketById(ctx: Ctx, id: string): Promise<SupportTicket | undefined>;

  /**
   * Get all tickets
   */
  getAllTickets(ctx: Ctx): Promise<SupportTicket[]>;

  /**
   * Get tickets by user ID
   */
  getTicketsByUserId(ctx: Ctx, userId: string): Promise<SupportTicket[]>;

  /**
   * Get open/in-progress tickets (for admin)
   */
  getActiveTickets(ctx: Ctx): Promise<SupportTicket[]>;

  /**
   * Get ticket by transaction ID
   */
  getTicketByTransactionId(
    ctx: Ctx,
    transactionId: string,
  ): Promise<SupportTicket | undefined>;

  /**
   * Update ticket
   */
  updateTicket(
    ctx: Ctx,
    id: string,
    updates: Partial<SupportTicket>,
  ): Promise<SupportTicket | undefined>;

  // ==================== Messages ====================

  /**
   * Create a message
   */
  createMessage(ctx: Ctx, message: SupportMessage): Promise<SupportMessage>;

  /**
   * Get messages for a ticket
   */
  getMessagesByTicketId(ctx: Ctx, ticketId: string): Promise<SupportMessage[]>;
}

/**
 * Injection token for ISupportRepository
 */
export const SUPPORT_REPOSITORY = Symbol('ISupportRepository');
