import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TransactionChatService } from '../../../../src/modules/transaction-chat/transaction-chat.service';
import { TRANSACTION_CHAT_REPOSITORY } from '../../../../src/modules/transaction-chat/transaction-chat.repository.interface';
import type { ITransactionChatRepository } from '../../../../src/modules/transaction-chat/transaction-chat.repository.interface';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
import { TransactionStatus } from '../../../../src/modules/transactions/transactions.domain';
import type { Ctx } from '../../../../src/common/types/context';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

function createMockTransaction(overrides: {
  id?: string;
  buyerId?: string;
  sellerId?: string;
  status?: TransactionStatus;
} = {}) {
  return {
    id: 'txn_1',
    buyerId: 'buyer_1',
    sellerId: 'seller_1',
    status: TransactionStatus.PaymentReceived,
    ...overrides,
  } as any;
}

describe('TransactionChatService', () => {
  let service: TransactionChatService;
  let chatRepository: jest.Mocked<ITransactionChatRepository>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let platformConfigService: jest.Mocked<PlatformConfigService>;

  beforeEach(async () => {
    const mockChatRepository = {
      create: jest.fn(),
      findByTransaction: jest.fn(),
      countByTransaction: jest.fn(),
      countTextMessagesByTransaction: jest.fn(),
      markAsReadForUser: jest.fn().mockResolvedValue(undefined),
      countUnreadForUser: jest.fn(),
    };
    const mockTransactionsService = {
      getTransactionById: jest.fn(),
    };
    const mockPlatformConfigService = {
      getPlatformConfig: jest.fn().mockResolvedValue({
        transactionChatMaxMessages: 100,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionChatService,
        { provide: TRANSACTION_CHAT_REPOSITORY, useValue: mockChatRepository },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: PlatformConfigService, useValue: mockPlatformConfigService },
      ],
    }).compile();

    service = module.get(TransactionChatService);
    chatRepository = module.get(TRANSACTION_CHAT_REPOSITORY);
    transactionsService = module.get(TransactionsService);
    platformConfigService = module.get(PlatformConfigService);
  });

  describe('getMessages', () => {
    it('should return messages when transaction allows chat', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);
      chatRepository.findByTransaction.mockResolvedValue([
        {
          id: 'msg_1',
          transactionId: 'txn_1',
          senderId: 'buyer_1',
          content: 'Hello',
          messageType: 'text',
          payloadType: null,
          createdAt: new Date(),
          readByBuyerAt: null,
          readBySellerAt: null,
        },
      ]);

      const result = await service.getMessages(
        mockCtx,
        'txn_1',
        'buyer_1',
      );

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].senderRole).toBe('buyer');
      expect(result.messages[0].content).toBe('Hello');
      expect(chatRepository.markAsReadForUser).toHaveBeenCalledWith(
        mockCtx,
        'txn_1',
        'buyer_1',
        'buyer_1',
        'seller_1',
      );
    });

    it('should throw Forbidden when status does not allow chat', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PendingPayment,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);

      await expect(
        service.getMessages(mockCtx, 'txn_1', 'buyer_1'),
      ).rejects.toThrow(ForbiddenException);

      expect(chatRepository.findByTransaction).not.toHaveBeenCalled();
    });

    it('should throw Forbidden when user is not participant (getTransactionById throws)', async () => {
      transactionsService.getTransactionById.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        service.getMessages(mockCtx, 'txn_1', 'other_user'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('sendMessage', () => {
    it('should create message when under limit and content valid', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);
      chatRepository.countByTransaction.mockResolvedValue(10);
      chatRepository.create.mockResolvedValue({
        id: 'msg_new',
        transactionId: 'txn_1',
        senderId: 'seller_1',
        content: 'Here is the ticket',
        messageType: 'text',
        payloadType: null,
        createdAt: new Date(),
        readByBuyerAt: null,
        readBySellerAt: null,
      });

      const result = await service.sendMessage(
        mockCtx,
        'txn_1',
        'seller_1',
        '  Here is the ticket  ',
      );

      expect(result.senderRole).toBe('seller');
      expect(result.content).toBe('Here is the ticket');
      expect(chatRepository.create).toHaveBeenCalledWith(
        mockCtx,
        'txn_1',
        'seller_1',
        'Here is the ticket',
      );
    });

    it('should throw when at max messages', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);
      chatRepository.countByTransaction.mockResolvedValue(100);

      await expect(
        service.sendMessage(mockCtx, 'txn_1', 'buyer_1', 'Hello'),
      ).rejects.toThrow(BadRequestException);

      expect(chatRepository.create).not.toHaveBeenCalled();
    });

    it('should throw when content empty after trim', async () => {
      const transaction = createMockTransaction();
      transactionsService.getTransactionById.mockResolvedValue(transaction);
      chatRepository.countByTransaction.mockResolvedValue(0);

      await expect(
        service.sendMessage(mockCtx, 'txn_1', 'buyer_1', '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when content too long', async () => {
      const transaction = createMockTransaction();
      transactionsService.getTransactionById.mockResolvedValue(transaction);
      chatRepository.countByTransaction.mockResolvedValue(0);

      await expect(
        service.sendMessage(mockCtx, 'txn_1', 'buyer_1', 'x'.repeat(2001)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw Forbidden when status does not allow chat', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.Completed,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);

      await expect(
        service.sendMessage(mockCtx, 'txn_1', 'buyer_1', 'Hi'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('hasExchangedMessages', () => {
    it('should return true when there is at least one user-written (text) message', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);
      chatRepository.countTextMessagesByTransaction.mockResolvedValue(1);

      const result = await service.hasExchangedMessages(
        mockCtx,
        'txn_1',
        'buyer_1',
      );

      expect(result).toBe(true);
      expect(chatRepository.countTextMessagesByTransaction).toHaveBeenCalledWith(
        mockCtx,
        'txn_1',
      );
    });

    it('should return false when there are no text messages (only delivery or none)', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.TicketTransferred,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);
      chatRepository.countTextMessagesByTransaction.mockResolvedValue(0);

      const result = await service.hasExchangedMessages(
        mockCtx,
        'txn_1',
        'seller_1',
      );

      expect(result).toBe(false);
    });

    it('should return false when transaction status does not allow chat', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PendingPayment,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);

      const result = await service.hasExchangedMessages(
        mockCtx,
        'txn_1',
        'buyer_1',
      );

      expect(result).toBe(false);
      expect(chatRepository.countTextMessagesByTransaction).not.toHaveBeenCalled();
    });
  });

  describe('hasUnreadMessages', () => {
    it('should return true when buyer has unread messages from seller', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);
      chatRepository.countUnreadForUser.mockResolvedValue(2);

      const result = await service.hasUnreadMessages(
        mockCtx,
        'txn_1',
        'buyer_1',
      );

      expect(result).toBe(true);
      expect(chatRepository.countUnreadForUser).toHaveBeenCalledWith(
        mockCtx,
        'txn_1',
        'buyer_1',
        'buyer_1',
        'seller_1',
      );
    });

    it('should return false when user has no unread messages', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PaymentReceived,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);
      chatRepository.countUnreadForUser.mockResolvedValue(0);

      const result = await service.hasUnreadMessages(
        mockCtx,
        'txn_1',
        'seller_1',
      );

      expect(result).toBe(false);
    });

    it('should return false when transaction status does not allow chat', async () => {
      const transaction = createMockTransaction({
        status: TransactionStatus.PendingPayment,
      });
      transactionsService.getTransactionById.mockResolvedValue(transaction);

      const result = await service.hasUnreadMessages(
        mockCtx,
        'txn_1',
        'buyer_1',
      );

      expect(result).toBe(false);
      expect(chatRepository.countUnreadForUser).not.toHaveBeenCalled();
    });
  });
});
