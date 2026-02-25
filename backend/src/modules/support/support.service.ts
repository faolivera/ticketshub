import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SupportRepository } from './support.repository';
import { TransactionsService } from '../transactions/transactions.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  SupportTicket,
  SupportMessage,
  SupportTicketWithMessages,
} from './support.domain';
import {
  SupportCategory,
  DisputeReason,
  SupportTicketStatus,
  DisputeResolution,
} from './support.domain';
import { TransactionStatus } from '../transactions/transactions.domain';
import type { ListSupportTicketsQuery } from './support.api';
import { Role } from '../users/users.domain';

@Injectable()
export class SupportService {
  private readonly logger = new ContextLogger(SupportService.name);

  constructor(
    @Inject(SupportRepository)
    private readonly supportRepository: SupportRepository,
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Generate a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Create a support ticket
   */
  async createTicket(
    ctx: Ctx,
    userId: string,
    data: {
      transactionId?: string;
      category: SupportCategory;
      disputeReason?: DisputeReason;
      subject: string;
      description: string;
    },
  ): Promise<SupportTicket> {
    this.logger.log(ctx, `Creating support ticket for user ${userId}`);

    // If dispute, mark transaction as disputed
    if (data.category === SupportCategory.TicketDispute && data.transactionId) {
      // Check if dispute already exists for this transaction
      const existingDispute =
        await this.supportRepository.getTicketByTransactionId(
          ctx,
          data.transactionId,
        );
      if (
        existingDispute &&
        existingDispute.status !== SupportTicketStatus.Closed
      ) {
        throw new BadRequestException(
          'A dispute already exists for this transaction',
        );
      }
    }

    // Determine priority based on category
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    if (data.category === SupportCategory.TicketDispute) {
      priority = 'high';
    }

    const ticket: SupportTicket = {
      id: this.generateId('spt'),
      userId,
      transactionId: data.transactionId,
      category: data.category,
      disputeReason: data.disputeReason,
      subject: data.subject,
      description: data.description,
      status: SupportTicketStatus.Open,
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.supportRepository.createTicket(ctx, ticket);

    // If it's a dispute, mark the transaction as disputed
    if (data.category === SupportCategory.TicketDispute && data.transactionId) {
      await this.transactionsService.markDisputed(
        ctx,
        data.transactionId,
        ticket.id,
      );
    }

    // Create initial message with description
    await this.addMessage(ctx, ticket.id, userId, false, data.description);

    this.logger.log(ctx, `Support ticket ${ticket.id} created`);
    return ticket;
  }

  /**
   * Get ticket by ID with messages
   */
  async getTicketById(
    ctx: Ctx,
    ticketId: string,
    userId: string,
    userRole: Role,
  ): Promise<SupportTicketWithMessages> {
    const ticket = await this.supportRepository.findTicketById(ctx, ticketId);
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Only owner or admin can view
    if (ticket.userId !== userId && userRole !== Role.Admin) {
      throw new ForbiddenException('Access denied');
    }

    const messages = await this.supportRepository.getMessagesByTicketId(
      ctx,
      ticketId,
    );
    return { ...ticket, messages };
  }

  /**
   * Add message to ticket
   */
  async addMessage(
    ctx: Ctx,
    ticketId: string,
    userId: string,
    isAdmin: boolean,
    message: string,
    attachmentUrls?: string[],
  ): Promise<SupportMessage> {
    const ticket = await this.supportRepository.findTicketById(ctx, ticketId);
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const supportMessage: SupportMessage = {
      id: this.generateId('msg'),
      ticketId,
      userId,
      isAdmin,
      message,
      attachmentUrls,
      createdAt: new Date(),
    };

    await this.supportRepository.createMessage(ctx, supportMessage);

    // Update ticket status
    if (isAdmin) {
      await this.supportRepository.updateTicket(ctx, ticketId, {
        status: SupportTicketStatus.WaitingForCustomer,
      });
    } else {
      await this.supportRepository.updateTicket(ctx, ticketId, {
        status: SupportTicketStatus.InProgress,
      });
    }

    return supportMessage;
  }

  /**
   * Resolve a dispute (admin only)
   */
  async resolveDispute(
    ctx: Ctx,
    ticketId: string,
    adminId: string,
    resolution: DisputeResolution,
    resolutionNotes: string,
  ): Promise<SupportTicket> {
    this.logger.log(ctx, `Resolving dispute ${ticketId}`);

    const ticket = await this.supportRepository.findTicketById(ctx, ticketId);
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    if (ticket.category !== SupportCategory.TicketDispute) {
      throw new BadRequestException('This ticket is not a dispute');
    }

    if (
      ticket.status === SupportTicketStatus.Resolved ||
      ticket.status === SupportTicketStatus.Closed
    ) {
      throw new BadRequestException('Dispute already resolved');
    }

    // Handle resolution based on outcome
    if (ticket.transactionId) {
      if (resolution === DisputeResolution.BuyerWins) {
        // Refund buyer
        await this.transactionsService.refundTransaction(
          ctx,
          ticket.transactionId,
        );
      } else if (resolution === DisputeResolution.SellerWins) {
        // Complete transaction (release payment to seller)
        // This would require adding a method to complete a disputed transaction
      }
    }

    const updated = await this.supportRepository.updateTicket(ctx, ticketId, {
      status: SupportTicketStatus.Resolved,
      resolution,
      resolutionNotes,
      resolvedBy: adminId,
      resolvedAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException('Support ticket not found');
    }

    this.logger.log(ctx, `Dispute ${ticketId} resolved: ${resolution}`);
    return updated;
  }

  /**
   * List user's tickets
   */
  async listUserTickets(
    ctx: Ctx,
    userId: string,
    query: ListSupportTicketsQuery,
  ): Promise<SupportTicket[]> {
    let tickets = await this.supportRepository.getTicketsByUserId(ctx, userId);

    // Apply filters
    if (query.status) {
      tickets = tickets.filter((t) => t.status === query.status);
    }

    if (query.category) {
      tickets = tickets.filter((t) => t.category === query.category);
    }

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    return tickets.slice(offset, offset + limit);
  }

  /**
   * List all active tickets (admin)
   */
  async listActiveTickets(ctx: Ctx): Promise<SupportTicket[]> {
    return await this.supportRepository.getActiveTickets(ctx);
  }

  /**
   * Update ticket status (admin)
   */
  async updateTicketStatus(
    ctx: Ctx,
    ticketId: string,
    status: SupportTicketStatus,
  ): Promise<SupportTicket> {
    const updated = await this.supportRepository.updateTicket(ctx, ticketId, {
      status,
    });
    if (!updated) {
      throw new NotFoundException('Support ticket not found');
    }
    return updated;
  }

  /**
   * Close ticket
   */
  async closeTicket(
    ctx: Ctx,
    ticketId: string,
    userId: string,
    userRole: Role,
  ): Promise<SupportTicket> {
    const ticket = await this.supportRepository.findTicketById(ctx, ticketId);
    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    // Only owner or admin can close
    if (ticket.userId !== userId && userRole !== Role.Admin) {
      throw new ForbiddenException('Access denied');
    }

    const updated = await this.supportRepository.updateTicket(ctx, ticketId, {
      status: SupportTicketStatus.Closed,
    });

    if (!updated) {
      throw new NotFoundException('Support ticket not found');
    }

    return updated;
  }
}
