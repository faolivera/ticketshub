import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  SupportTicket as PrismaSupportTicket,
  SupportMessage as PrismaSupportMessage,
  SupportTicketStatus as PrismaSupportTicketStatus,
  SupportTicketCategory as PrismaSupportTicketCategory,
  SupportTicketSource as PrismaSupportTicketSource,
  SupportMessageSender as PrismaSupportMessageSender,
} from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import type { SupportTicket, SupportMessage } from './support.domain';
import {
  SupportTicketStatus,
  SupportCategory,
  SupportTicketSource,
} from './support.domain';
import type { ISupportRepository } from './support.repository.interface';

@Injectable()
export class SupportRepository implements ISupportRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Tickets ====================

  async createTicket(_ctx: Ctx, ticket: SupportTicket): Promise<SupportTicket> {
    const prismaTicket = await this.prisma.supportTicket.create({
      data: {
        id: ticket.id,
        userId: ticket.userId ?? undefined,
        guestId: ticket.guestId ?? undefined,
        guestName: ticket.guestName ?? undefined,
        guestEmail: ticket.guestEmail ?? undefined,
        transactionId: ticket.transactionId,
        category: this.mapCategoryToDb(ticket.category),
        source: ticket.source ? this.mapSourceToDb(ticket.source) : undefined,
        subject: ticket.subject,
        status: this.mapStatusToDb(ticket.status),
        assignedTo: ticket.resolvedBy,
        resolvedAt: ticket.resolvedAt,
        closedAt:
          ticket.status === SupportTicketStatus.Closed
            ? ticket.updatedAt
            : undefined,
      },
    });
    return this.mapToTicket(prismaTicket, ticket);
  }

  async findTicketById(
    _ctx: Ctx,
    id: string,
  ): Promise<SupportTicket | undefined> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
    });
    return ticket ? this.mapToTicket(ticket) : undefined;
  }

  async getAllTickets(_ctx: Ctx): Promise<SupportTicket[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return tickets.map((t) => this.mapToTicket(t));
  }

  async getTicketsByUserId(
    _ctx: Ctx,
    userId: string,
  ): Promise<SupportTicket[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return tickets.map((t) => this.mapToTicket(t));
  }

  async getActiveTickets(_ctx: Ctx): Promise<SupportTicket[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        status: {
          in: [
            this.mapStatusToDb(SupportTicketStatus.Open),
            this.mapStatusToDb(SupportTicketStatus.InProgress),
            this.mapStatusToDb(SupportTicketStatus.WaitingForCustomer),
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return tickets.map((t) => this.mapToTicket(t));
  }

  async getTicketsAdmin(
    _ctx: Ctx,
    params: {
      page: number;
      limit: number;
      status?: string;
      category?: string;
      source?: string;
    },
  ): Promise<{ tickets: SupportTicket[]; total: number }> {
    const where: Parameters<typeof this.prisma.supportTicket.findMany>[0]['where'] = {};
    if (params.status) {
      const toDomainStatus: Record<string, SupportTicketStatus> = {
        open: SupportTicketStatus.Open,
        inProgress: SupportTicketStatus.InProgress,
        waitingForCustomer: SupportTicketStatus.WaitingForCustomer,
        resolved: SupportTicketStatus.Resolved,
        closed: SupportTicketStatus.Closed,
      };
      const domainStatus = toDomainStatus[params.status];
      if (domainStatus !== undefined) {
        where.status = this.mapStatusToDb(domainStatus);
      }
    }
    if (params.category) {
      const categoryMap: Record<string, PrismaSupportTicketCategory> = {
        TicketDispute: 'transaction',
        PaymentIssue: 'transaction',
        AccountIssue: 'account',
        Other: 'other',
      };
      const dbCategory = categoryMap[params.category];
      if (dbCategory !== undefined) {
        where.category = dbCategory;
      }
    }
    if (params.source) {
      const sourceMap: Record<string, PrismaSupportTicketSource> = {
        Dispute: 'dispute',
        ContactFromTransaction: 'contact_from_transaction',
        ContactForm: 'contact_form',
      };
      const dbSource = sourceMap[params.source];
      if (dbSource !== undefined) {
        where.source = dbSource;
      }
    }
    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return {
      tickets: tickets.map((t) => this.mapToTicket(t)),
      total,
    };
  }

  async getTicketByTransactionId(
    _ctx: Ctx,
    transactionId: string,
  ): Promise<SupportTicket | undefined> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { transactionId },
    });
    return ticket ? this.mapToTicket(ticket) : undefined;
  }

  async updateTicket(
    _ctx: Ctx,
    id: string,
    updates: Partial<SupportTicket>,
  ): Promise<SupportTicket | undefined> {
    const existing = await this.prisma.supportTicket.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const prismaTicket = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        ...(updates.status && { status: this.mapStatusToDb(updates.status) }),
        ...(updates.category && {
          category: this.mapCategoryToDb(updates.category),
        }),
        ...(updates.subject && { subject: updates.subject }),
        ...(updates.resolvedBy && { assignedTo: updates.resolvedBy }),
        ...(updates.resolvedAt && { resolvedAt: updates.resolvedAt }),
        ...(updates.status === SupportTicketStatus.Closed && {
          closedAt: new Date(),
        }),
      },
    });
    return this.mapToTicket(prismaTicket, updates);
  }

  // ==================== Messages ====================

  async createMessage(
    _ctx: Ctx,
    message: SupportMessage,
  ): Promise<SupportMessage> {
    const prismaMessage = await this.prisma.supportMessage.create({
      data: {
        id: message.id,
        ticketId: message.ticketId,
        senderId: message.userId,
        sender: this.mapSenderToDb(message.isAdmin),
        content: message.message,
      },
    });
    return this.mapToMessage(prismaMessage);
  }

  async getMessagesByTicketId(
    _ctx: Ctx,
    ticketId: string,
  ): Promise<SupportMessage[]> {
    const messages = await this.prisma.supportMessage.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });
    return messages.map((m) => this.mapToMessage(m));
  }

  // ==================== Mapping Helpers ====================

  private mapToTicket(
    prismaTicket: PrismaSupportTicket,
    domainOverrides?: Partial<SupportTicket>,
  ): SupportTicket {
    const source = domainOverrides?.source ?? this.mapSourceFromDb(prismaTicket.source);
    const priority =
      domainOverrides?.priority ?? this.priorityFromSource(source);
    return {
      id: prismaTicket.id,
      userId: prismaTicket.userId ?? undefined,
      guestId: prismaTicket.guestId ?? undefined,
      guestName: prismaTicket.guestName ?? undefined,
      guestEmail: prismaTicket.guestEmail ?? undefined,
      transactionId: prismaTicket.transactionId ?? undefined,
      category: domainOverrides?.category ?? this.mapCategoryFromDb(prismaTicket.category),
      disputeReason: domainOverrides?.disputeReason,
      source,
      subject: prismaTicket.subject,
      description: domainOverrides?.description ?? '',
      status: this.mapStatusFromDb(prismaTicket.status),
      priority,
      resolution: domainOverrides?.resolution,
      resolutionNotes: domainOverrides?.resolutionNotes,
      resolvedBy: prismaTicket.assignedTo ?? undefined,
      createdAt: prismaTicket.createdAt,
      updatedAt: prismaTicket.updatedAt,
      resolvedAt: prismaTicket.resolvedAt ?? undefined,
    };
  }

  private priorityFromSource(
    source: SupportTicketSource | undefined,
  ): 'low' | 'medium' | 'high' | 'urgent' {
    if (!source) return 'medium';
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

  private mapSourceToDb(
    source: SupportTicketSource,
  ): PrismaSupportTicketSource {
    const map: Record<SupportTicketSource, PrismaSupportTicketSource> = {
      [SupportTicketSource.Dispute]: 'dispute',
      [SupportTicketSource.ContactFromTransaction]: 'contact_from_transaction',
      [SupportTicketSource.ContactForm]: 'contact_form',
    };
    return map[source];
  }

  private mapSourceFromDb(
    source: PrismaSupportTicketSource | null | undefined,
  ): SupportTicketSource | undefined {
    if (!source) return undefined;
    const map: Record<PrismaSupportTicketSource, SupportTicketSource> = {
      dispute: SupportTicketSource.Dispute,
      contact_from_transaction: SupportTicketSource.ContactFromTransaction,
      contact_form: SupportTicketSource.ContactForm,
    };
    return map[source];
  }

  private mapToMessage(prismaMessage: PrismaSupportMessage): SupportMessage {
    return {
      id: prismaMessage.id,
      ticketId: prismaMessage.ticketId,
      userId: prismaMessage.senderId,
      isAdmin: prismaMessage.sender === 'admin',
      message: prismaMessage.content,
      attachmentUrls: undefined,
      createdAt: prismaMessage.createdAt,
    };
  }

  private mapStatusToDb(
    status: SupportTicketStatus,
  ): PrismaSupportTicketStatus {
    const map: Record<SupportTicketStatus, PrismaSupportTicketStatus> = {
      [SupportTicketStatus.Open]: 'open',
      [SupportTicketStatus.InProgress]: 'in_progress',
      [SupportTicketStatus.WaitingForCustomer]: 'waiting_for_customer',
      [SupportTicketStatus.Resolved]: 'resolved',
      [SupportTicketStatus.Closed]: 'closed',
    };
    return map[status];
  }

  private mapStatusFromDb(
    status: PrismaSupportTicketStatus,
  ): SupportTicketStatus {
    const map: Record<PrismaSupportTicketStatus, SupportTicketStatus> = {
      open: SupportTicketStatus.Open,
      in_progress: SupportTicketStatus.InProgress,
      waiting_for_customer: SupportTicketStatus.WaitingForCustomer,
      resolved: SupportTicketStatus.Resolved,
      closed: SupportTicketStatus.Closed,
    };
    return map[status];
  }

  private mapCategoryToDb(
    category: SupportCategory,
  ): PrismaSupportTicketCategory {
    const map: Record<SupportCategory, PrismaSupportTicketCategory> = {
      [SupportCategory.TicketDispute]: 'transaction',
      [SupportCategory.PaymentIssue]: 'transaction',
      [SupportCategory.AccountIssue]: 'account',
      [SupportCategory.Other]: 'other',
    };
    return map[category];
  }

  private mapCategoryFromDb(
    category: PrismaSupportTicketCategory,
  ): SupportCategory {
    const map: Record<PrismaSupportTicketCategory, SupportCategory> = {
      transaction: SupportCategory.TicketDispute,
      account: SupportCategory.AccountIssue,
      technical: SupportCategory.Other,
      other: SupportCategory.Other,
    };
    return map[category];
  }

  private mapSenderToDb(isAdmin: boolean): PrismaSupportMessageSender {
    return isAdmin ? 'admin' : 'user';
  }
}
