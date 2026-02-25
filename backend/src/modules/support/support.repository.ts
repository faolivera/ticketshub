import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { SupportTicket, SupportMessage } from './support.domain';
import { SupportTicketStatus } from './support.domain';

@Injectable()
export class SupportRepository implements OnModuleInit {
  private readonly ticketStorage: KeyValueFileStorage<SupportTicket>;
  private readonly messageStorage: KeyValueFileStorage<SupportMessage>;

  constructor() {
    this.ticketStorage = new KeyValueFileStorage<SupportTicket>(
      'support-tickets',
    );
    this.messageStorage = new KeyValueFileStorage<SupportMessage>(
      'support-messages',
    );
  }

  /**
   * Load data from file storage when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.ticketStorage.onModuleInit();
    await this.messageStorage.onModuleInit();
  }

  // ==================== Tickets ====================

  /**
   * Create a new support ticket
   */
  async createTicket(ctx: Ctx, ticket: SupportTicket): Promise<SupportTicket> {
    await this.ticketStorage.set(ctx, ticket.id, ticket);
    return ticket;
  }

  /**
   * Find ticket by ID
   */
  async findTicketById(
    ctx: Ctx,
    id: string,
  ): Promise<SupportTicket | undefined> {
    return await this.ticketStorage.get(ctx, id);
  }

  /**
   * Get all tickets
   */
  async getAllTickets(ctx: Ctx): Promise<SupportTicket[]> {
    return await this.ticketStorage.getAll(ctx);
  }

  /**
   * Get tickets by user
   */
  async getTicketsByUserId(ctx: Ctx, userId: string): Promise<SupportTicket[]> {
    const all = await this.ticketStorage.getAll(ctx);
    return all
      .filter((t) => t.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  /**
   * Get open/in-progress tickets (for admin)
   */
  async getActiveTickets(ctx: Ctx): Promise<SupportTicket[]> {
    const all = await this.ticketStorage.getAll(ctx);
    return all
      .filter(
        (t) =>
          t.status === SupportTicketStatus.Open ||
          t.status === SupportTicketStatus.InProgress ||
          t.status === SupportTicketStatus.WaitingForCustomer,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  /**
   * Get ticket by transaction ID
   */
  async getTicketByTransactionId(
    ctx: Ctx,
    transactionId: string,
  ): Promise<SupportTicket | undefined> {
    const all = await this.ticketStorage.getAll(ctx);
    return all.find((t) => t.transactionId === transactionId);
  }

  /**
   * Update ticket
   */
  async updateTicket(
    ctx: Ctx,
    id: string,
    updates: Partial<SupportTicket>,
  ): Promise<SupportTicket | undefined> {
    const existing = await this.ticketStorage.get(ctx, id);
    if (!existing) return undefined;

    const updated: SupportTicket = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date(),
    };
    await this.ticketStorage.set(ctx, id, updated);
    return updated;
  }

  // ==================== Messages ====================

  /**
   * Create a message
   */
  async createMessage(
    ctx: Ctx,
    message: SupportMessage,
  ): Promise<SupportMessage> {
    await this.messageStorage.set(ctx, message.id, message);
    return message;
  }

  /**
   * Get messages for a ticket
   */
  async getMessagesByTicketId(
    ctx: Ctx,
    ticketId: string,
  ): Promise<SupportMessage[]> {
    const all = await this.messageStorage.getAll(ctx);
    return all
      .filter((m) => m.ticketId === ticketId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }
}
