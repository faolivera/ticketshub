import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { SupportRepository } from '@/modules/support/support.repository';
import {
  SupportTicketStatus,
  SupportCategory,
} from '@/modules/support/support.domain';
import type { SupportTicket, SupportMessage } from '@/modules/support/support.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('SupportRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: SupportRepository;
  let ctx: Ctx;
  let testUserId: string;

  async function createTestUser(): Promise<string> {
    const user = await prisma.user.create({
      data: {
        email: `user-${Date.now()}-${randomUUID()}@test.com`,
        firstName: 'Test',
        lastName: 'User',
        publicName: 'testuser',
        password: 'hash',
        role: 'User',
        level: 'Basic',
        status: 'Enabled',
        country: 'Germany',
        currency: 'EUR',
        language: 'en',
        emailVerified: true,
        phoneVerified: false,
      },
    });
    return user.id;
  }

  const createValidTicket = (overrides?: Partial<SupportTicket>): SupportTicket => ({
    id: randomUUID(),
    userId: testUserId,
    category: SupportCategory.TicketDispute,
    subject: 'Test subject',
    description: 'Test description',
    status: SupportTicketStatus.Open,
    priority: 'medium',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new SupportRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  describe('createTicket', () => {
    it('should create a support ticket', async () => {
      const ticket = createValidTicket();

      const created = await repository.createTicket(ctx, ticket);

      expect(created.id).toBe(ticket.id);
      expect(created.subject).toBe(ticket.subject);
      expect(created.status).toBe(SupportTicketStatus.Open);
    });

    it('should create ticket with transaction id', async () => {
      const ticket = createValidTicket({ transactionId: randomUUID() });
      const created = await repository.createTicket(ctx, ticket);
      expect(created.transactionId).toBe(ticket.transactionId);
    });
  });

  describe('findTicketById', () => {
    it('should return undefined when not found', async () => {
      const found = await repository.findTicketById(ctx, 'non-existent-id');
      expect(found).toBeUndefined();
    });

    it('should find ticket by id', async () => {
      const created = await repository.createTicket(ctx, createValidTicket());
      const found = await repository.findTicketById(ctx, created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('getAllTickets', () => {
    it('should return empty array when no tickets', async () => {
      const all = await repository.getAllTickets(ctx);
      expect(all).toEqual([]);
    });

    it('should return all tickets ordered by createdAt desc', async () => {
      await repository.createTicket(ctx, createValidTicket({ id: randomUUID(), subject: 'First' }));
      await repository.createTicket(ctx, createValidTicket({ id: randomUUID(), subject: 'Second' }));
      const all = await repository.getAllTickets(ctx);
      expect(all).toHaveLength(2);
      expect(all[0].subject).toBe('Second');
    });
  });

  describe('getTicketsByUserId', () => {
    it('should return tickets for user', async () => {
      await repository.createTicket(ctx, createValidTicket());
      const tickets = await repository.getTicketsByUserId(ctx, testUserId);
      expect(tickets).toHaveLength(1);
    });

    it('should return empty for user with no tickets', async () => {
      const otherId = await createTestUser();
      const tickets = await repository.getTicketsByUserId(ctx, otherId);
      expect(tickets).toEqual([]);
    });
  });

  describe('getActiveTickets', () => {
    it('should return only open, in progress, waiting for customer', async () => {
      await repository.createTicket(ctx, createValidTicket({ status: SupportTicketStatus.Open }));
      await repository.createTicket(ctx, createValidTicket({ id: randomUUID(), status: SupportTicketStatus.Resolved }));
      const active = await repository.getActiveTickets(ctx);
      expect(active).toHaveLength(1);
      expect(active[0].status).toBe(SupportTicketStatus.Open);
    });
  });

  describe('getTicketByTransactionId', () => {
    it('should return undefined when no ticket for transaction', async () => {
      const found = await repository.getTicketByTransactionId(ctx, randomUUID());
      expect(found).toBeUndefined();
    });

    it('should find ticket by transaction id', async () => {
      const txId = randomUUID();
      const created = await repository.createTicket(ctx, createValidTicket({ transactionId: txId }));
      const found = await repository.getTicketByTransactionId(ctx, txId);
      expect(found?.id).toBe(created.id);
    });
  });

  describe('updateTicket', () => {
    it('should return undefined for non-existent ticket', async () => {
      const result = await repository.updateTicket(ctx, 'non-existent-id', { status: SupportTicketStatus.Resolved });
      expect(result).toBeUndefined();
    });

    it('should update ticket status', async () => {
      const ticket = await repository.createTicket(ctx, createValidTicket());
      const updated = await repository.updateTicket(ctx, ticket.id, { status: SupportTicketStatus.InProgress });
      expect(updated?.status).toBe(SupportTicketStatus.InProgress);
    });

    it('should update subject', async () => {
      const ticket = await repository.createTicket(ctx, createValidTicket());
      const updated = await repository.updateTicket(ctx, ticket.id, { subject: 'Updated subject' });
      expect(updated?.subject).toBe('Updated subject');
    });
  });

  describe('createMessage', () => {
    it('should create a message', async () => {
      const ticket = await repository.createTicket(ctx, createValidTicket());
      const message: SupportMessage = {
        id: randomUUID(),
        ticketId: ticket.id,
        userId: testUserId,
        isAdmin: false,
        message: 'Hello',
        createdAt: new Date(),
      };

      const created = await repository.createMessage(ctx, message);

      expect(created.id).toBe(message.id);
      expect(created.message).toBe('Hello');
      expect(created.isAdmin).toBe(false);
    });

    it('should create admin message', async () => {
      const ticket = await repository.createTicket(ctx, createValidTicket());
      const adminId = await createTestUser();
      const message: SupportMessage = {
        id: randomUUID(),
        ticketId: ticket.id,
        userId: adminId,
        isAdmin: true,
        message: 'Admin reply',
        createdAt: new Date(),
      };
      const created = await repository.createMessage(ctx, message);
      expect(created.isAdmin).toBe(true);
    });
  });

  describe('getMessagesByTicketId', () => {
    it('should return empty array when no messages', async () => {
      const ticket = await repository.createTicket(ctx, createValidTicket());
      const messages = await repository.getMessagesByTicketId(ctx, ticket.id);
      expect(messages).toEqual([]);
    });

    it('should return messages ordered by createdAt asc', async () => {
      const ticket = await repository.createTicket(ctx, createValidTicket());
      await repository.createMessage(ctx, {
        id: randomUUID(),
        ticketId: ticket.id,
        userId: testUserId,
        isAdmin: false,
        message: 'First',
        createdAt: new Date(),
      });
      await repository.createMessage(ctx, {
        id: randomUUID(),
        ticketId: ticket.id,
        userId: testUserId,
        isAdmin: false,
        message: 'Second',
        createdAt: new Date(Date.now() + 1000),
      });
      const messages = await repository.getMessagesByTicketId(ctx, ticket.id);
      expect(messages).toHaveLength(2);
      expect(messages[0].message).toBe('First');
    });
  });
});
