import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { ISupportRepository } from './support.repository.interface';
import { SUPPORT_REPOSITORY } from './support.repository.interface';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { PlatformConfigService } from '../config/config.service';
import { VerificationHelper } from '../../common/utils/verification-helper';
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
  SupportTicketSource,
} from './support.domain';
import { TransactionStatus } from '../transactions/transactions.domain';
import type { ListSupportTicketsQuery } from './support.api';
import { Role } from '../users/users.domain';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEventType } from '../notifications/notifications.domain';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class SupportService {
  private readonly logger = new ContextLogger(SupportService.name);

  constructor(
    @Inject(SUPPORT_REPOSITORY)
    private readonly supportRepository: ISupportRepository,
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(PlatformConfigService)
    private readonly platformConfigService: PlatformConfigService,
    private readonly notificationsService: NotificationsService,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
  ) {}

  /** Sentinel senderId for guest (anonymous) ticket messages */
  private static readonly GUEST_SENDER_ID = '__guest__';

  /**
   * Generate a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private priorityFromSource(
    source: SupportTicketSource,
  ): 'low' | 'medium' | 'high' | 'urgent' {
    switch (source) {
      case SupportTicketSource.Dispute:
        return 'high';
      case SupportTicketSource.ContactFromTransaction:
        return 'medium';
      case SupportTicketSource.ContactForm:
        return 'low';
      default:
        return 'medium';
    }
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
      source?: SupportTicketSource;
      subject: string;
      description: string;
    },
  ): Promise<SupportTicket> {
    this.logger.log(ctx, `Creating support ticket for user ${userId}`);

    // Verification gate: V1+V2 required to open a claim (dispute)
    if (data.category === SupportCategory.TicketDispute) {
      const user = await this.usersService.findById(ctx, userId);
      if (!user) {
        throw new ForbiddenException('User not found');
      }
      if (!VerificationHelper.hasV1(user)) {
        throw new ForbiddenException(
          'Email must be verified to open a claim. Please verify your email first.',
        );
      }
      if (!VerificationHelper.hasV2(user)) {
        throw new ForbiddenException(
          'Phone must be verified to open a claim. Please verify your phone number first.',
        );
      }
    }

    // If dispute with transaction, validate time windows and no duplicate
    if (data.category === SupportCategory.TicketDispute && data.transactionId) {
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

      const transaction = await this.transactionsService.findById(
        ctx,
        data.transactionId,
      );
      if (!transaction) {
        throw new BadRequestException('Transaction not found');
      }
      if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
        throw new ForbiddenException('You can only open a dispute for your own transaction');
      }

      const reason = data.disputeReason;
      if (
        reason !== DisputeReason.TicketNotReceived &&
        reason !== DisputeReason.TicketDidntWork
      ) {
        throw new BadRequestException(
          'Invalid dispute reason. Allowed: TicketNotReceived, TicketDidntWork.',
        );
      }

      let refDate: Date;

      if (reason === DisputeReason.TicketNotReceived) {
        if (!transaction.ticketTransferredAt) {
          throw new BadRequestException(
            'You can only open a "ticket not received" claim after the ticket has been transferred.',
          );
        }
        refDate = transaction.ticketTransferredAt;
      } else {
        if (!transaction.buyerConfirmedAt) {
          throw new BadRequestException(
            'You must confirm receipt of the ticket before opening a "ticket did not work" claim.',
          );
        }
        const listing = await this.ticketsService.getListingById(
          ctx,
          transaction.listingId,
        );
        const eventDate = listing?.eventDate;
        if (!eventDate) {
          throw new BadRequestException(
            'Cannot open a "ticket did not work" claim: event date could not be determined.',
          );
        }
        refDate = eventDate instanceof Date ? eventDate : new Date(eventDate);
      }

      const platformConfig =
        await this.platformConfigService.getPlatformConfig(ctx);
      const claimsConfig = platformConfig?.riskEngine?.claims;
      const windowConfig =
        reason === DisputeReason.TicketNotReceived
          ? claimsConfig?.ticketNotReceived
          : claimsConfig?.ticketDidntWork;
      const minHours = windowConfig?.minimumClaimHours ?? 1;
      const maxHours = windowConfig?.maximumClaimHours ?? 168;

      const now = new Date();
      const refTime = refDate.getTime();
      const minDeadline = new Date(refTime + minHours * 60 * 60 * 1000);
      const maxDeadline = new Date(refTime + maxHours * 60 * 60 * 1000);
      if (now < minDeadline) {
        throw new BadRequestException(
          `Claims can only be opened at least ${minHours} hours after the reference date. Please try again later.`,
        );
      }
      if (now > maxDeadline) {
        throw new BadRequestException(
          `Claims must be opened within ${maxHours} hours of the reference date. The deadline has passed.`,
        );
      }
    }

    // Source and priority: dispute is always high; contact flows use request or inferred source
    const source: SupportTicketSource =
      data.category === SupportCategory.TicketDispute
        ? SupportTicketSource.Dispute
        : data.source ??
          (data.transactionId
            ? SupportTicketSource.ContactFromTransaction
            : SupportTicketSource.ContactForm);
    const priority = this.priorityFromSource(source);

    const ticket: SupportTicket = {
      id: this.generateId('spt'),
      userId,
      transactionId: data.transactionId,
      category: data.category,
      disputeReason: data.disputeReason,
      source,
      subject: data.subject,
      description: data.description,
      status: SupportTicketStatus.Open,
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.supportRepository.createTicket(ctx, ticket);

    // If it's a dispute, mark the transaction as disputed and notify
    if (data.category === SupportCategory.TicketDispute && data.transactionId) {
      await this.transactionsService.markDisputed(
        ctx,
        data.transactionId,
        ticket.id,
      );

      // Get transaction details for notification and set buyerDisputed when buyer opens dispute
      const transaction = await this.transactionsService.findById(ctx, data.transactionId);
      if (transaction) {
        const openedBy: 'buyer' | 'seller' = transaction.buyerId === userId ? 'buyer' : 'seller';
        if (openedBy === 'buyer') {
          await this.usersService.setBuyerDisputed(ctx, userId);
        }
        this.notificationsService
          .emit(ctx, NotificationEventType.DISPUTE_OPENED, {
            transactionId: data.transactionId,
            disputeId: ticket.id,
            eventName: data.subject,
            buyerId: transaction.buyerId,
            sellerId: transaction.sellerId,
            openedBy,
            reason: data.disputeReason!,
          })
          .catch((err) => this.logger.error(ctx, `Failed to emit DISPUTE_OPENED: ${err}`));
      }
    }

    // Create initial message with description
    await this.addMessage(ctx, ticket.id, userId, false, data.description);

    this.logger.log(ctx, `Support ticket ${ticket.id} created`);
    return ticket;
  }

  /**
   * Create a support ticket from the public contact form (anonymous or unauthenticated).
   * Does not require auth; stores guest name, email, and guestId (guest:{clientIp}) on the ticket.
   */
  async createContactTicket(
    ctx: Ctx,
    data: {
      name: string;
      email: string;
      subject: string;
      description: string;
      transactionId?: string;
    },
    clientIp: string,
  ): Promise<SupportTicket> {
    this.logger.log(ctx, 'Creating contact ticket (anonymous)');

    const name = data.name?.trim();
    const email = data.email?.trim();
    const subject = data.subject?.trim();
    const description = data.description?.trim();
    if (!name) {
      throw new BadRequestException('Name is required');
    }
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    if (!subject) {
      throw new BadRequestException('Subject is required');
    }
    if (!description) {
      throw new BadRequestException('Description is required');
    }

    const source: SupportTicketSource = data.transactionId
      ? SupportTicketSource.ContactFromTransaction
      : SupportTicketSource.ContactForm;
    const priority = this.priorityFromSource(source);

    const guestId = `guest:${clientIp}`;

    const ticket: SupportTicket = {
      id: this.generateId('spt'),
      userId: undefined,
      guestId,
      guestName: name,
      guestEmail: email,
      transactionId: data.transactionId,
      category: SupportCategory.Other,
      source,
      subject,
      description,
      status: SupportTicketStatus.Open,
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.supportRepository.createTicket(ctx, ticket);

    // Create initial message with guest sentinel as sender
    await this.supportRepository.createMessage(ctx, {
      id: this.generateId('msg'),
      ticketId: ticket.id,
      userId: SupportService.GUEST_SENDER_ID,
      isAdmin: false,
      message: description,
      createdAt: new Date(),
    });

    this.logger.log(ctx, `Contact ticket ${ticket.id} created`);
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

    // Guest tickets: only admin can view. Owned tickets: owner or admin.
    if (!ticket.userId) {
      if (userRole !== Role.Admin) {
        throw new ForbiddenException('Access denied');
      }
    } else if (ticket.userId !== userId && userRole !== Role.Admin) {
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
      const transaction = await this.transactionsService.findById(
        ctx,
        ticket.transactionId,
      );
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }
      if (
        resolution === DisputeResolution.BuyerWins ||
        resolution === DisputeResolution.SplitResolution
      ) {
        const buyer = await this.usersService.findById(ctx, transaction.buyerId);
        if (!buyer) {
          throw new BadRequestException('Buyer not found');
        }
        if (!VerificationHelper.hasV3(buyer)) {
          throw new ForbiddenException(
            'Buyer must complete identity verification (KYC) before a refund can be processed. Ask the buyer to complete verification in Profile > Seller verification.',
          );
        }
        if (resolution === DisputeResolution.BuyerWins) {
          await this.transactionsService.refundTransaction(
            ctx,
            ticket.transactionId,
          );
        }
        // SplitResolution: partial refund could be implemented later; for now we only enforce V3
      } else if (resolution === DisputeResolution.SellerWins) {
        await this.transactionsService.resolveDisputeSellerWins(
          ctx,
          ticket.transactionId,
        );
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

    // Emit dispute resolved notification
    if (ticket.transactionId) {
      const transaction = await this.transactionsService.findById(ctx, ticket.transactionId);
      if (transaction) {
        const resolvedInFavorOf: 'buyer' | 'seller' = resolution === DisputeResolution.BuyerWins ? 'buyer' : 'seller';
        this.notificationsService
          .emit(ctx, NotificationEventType.DISPUTE_RESOLVED, {
            transactionId: ticket.transactionId,
            disputeId: ticketId,
            eventName: ticket.subject,
            buyerId: transaction.buyerId,
            sellerId: transaction.sellerId,
            resolution,
            resolvedInFavorOf,
          })
          .catch((err) => this.logger.error(ctx, `Failed to emit DISPUTE_RESOLVED: ${err}`));
      }
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
   * List tickets for admin with pagination and filters
   */
  async listTicketsAdmin(
    ctx: Ctx,
    params: {
      page: number;
      limit: number;
      status?: string;
      category?: string;
      source?: string;
    },
  ): Promise<{ tickets: SupportTicket[]; total: number }> {
    const page = Math.max(1, params.page);
    const limit = Math.min(100, Math.max(1, params.limit));
    return this.supportRepository.getTicketsAdmin(ctx, {
      page,
      limit,
      status: params.status,
      category: params.category,
      source: params.source,
    });
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
