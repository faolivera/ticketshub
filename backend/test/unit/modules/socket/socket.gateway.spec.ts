import { Test, TestingModule } from '@nestjs/testing';
import { SocketGateway } from '../../../../src/modules/socket/socket.gateway';
import { UsersService } from '../../../../src/modules/users/users.service';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { TransactionChatService } from '../../../../src/modules/transaction-chat/transaction-chat.service';
import { InMemoryRealtimeBroadcaster } from '../../../../src/common/realtime';
import { ForbiddenException } from '@nestjs/common';

describe('SocketGateway', () => {
  let gateway: SocketGateway;
  let usersService: jest.Mocked<UsersService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let transactionChatService: jest.Mocked<TransactionChatService>;
  let broadcaster: jest.Mocked<InMemoryRealtimeBroadcaster>;

  const mockUser = {
    id: 'user_1',
    email: 'u@test.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'User' as const,
    level: 'Buyer' as const,
    imageUrl: '/img.png',
    language: 'en' as const,
    imageId: 'img_1',
  };

  function createMockClient(overrides: Partial<{ handshake: any; data: any; join: jest.Mock; leave: jest.Mock; disconnect: jest.Mock }> = {}) {
    return {
      handshake: { auth: { token: 'valid_token' }, query: {} },
      data: undefined,
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
      ...overrides,
    } as any;
  }

  beforeEach(async () => {
    const mockUsersService = {
      verifyToken: jest.fn().mockReturnValue({ userId: 'user_1' }),
      getAuthenticatedUserInfo: jest.fn().mockResolvedValue(mockUser),
    };
    const mockTransactionsService = {
      getTransactionById: jest.fn().mockResolvedValue({ id: 'txn_1' }),
    };
    const mockTransactionChatService = {
      sendMessage: jest.fn().mockResolvedValue({
        id: 'msg_1',
        senderId: 'user_1',
        senderRole: 'buyer' as const,
        content: 'Hello',
        createdAt: new Date(),
      }),
    };
    const mockBroadcaster = {
      setServer: jest.fn(),
      emitToRoom: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGateway,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: TransactionChatService, useValue: mockTransactionChatService },
        { provide: InMemoryRealtimeBroadcaster, useValue: mockBroadcaster },
      ],
    }).compile();

    gateway = module.get(SocketGateway);
    usersService = module.get(UsersService);
    transactionsService = module.get(TransactionsService);
    transactionChatService = module.get(TransactionChatService);
    broadcaster = module.get(InMemoryRealtimeBroadcaster);
  });

  describe('afterInit', () => {
    it('should call broadcaster.setServer with the server', () => {
      const server = {} as any;
      gateway.afterInit(server);
      expect(broadcaster.setServer).toHaveBeenCalledWith(server);
    });
  });

  describe('handleConnection', () => {
    it('should disconnect client when no token is provided', async () => {
      const client = createMockClient({ handshake: { auth: {}, query: {} } });
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
      expect(usersService.getAuthenticatedUserInfo).not.toHaveBeenCalled();
    });

    it('should disconnect client when token is invalid', async () => {
      usersService.verifyToken.mockReturnValue(null);
      const client = createMockClient();
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should join user room and set client data when auth succeeds', async () => {
      const client = createMockClient();
      await gateway.handleConnection(client);
      expect(client.disconnect).not.toHaveBeenCalled();
      expect(usersService.verifyToken).toHaveBeenCalledWith('valid_token');
      expect(usersService.getAuthenticatedUserInfo).toHaveBeenCalled();
      expect(client.join).toHaveBeenCalledWith('user:user_1');
      expect(client.data).toEqual({ userId: 'user_1', user: mockUser });
    });

    it('should disconnect when getAuthenticatedUserInfo returns null', async () => {
      usersService.getAuthenticatedUserInfo.mockResolvedValue(null);
      const client = createMockClient();
      await gateway.handleConnection(client);
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleChatJoin', () => {
    it('should join transaction room when user has access', async () => {
      const client = createMockClient();
      client.data = { userId: 'user_1', user: mockUser };
      await gateway.handleChatJoin(client, { transactionId: 'txn_1' });
      expect(transactionsService.getTransactionById).toHaveBeenCalled();
      expect(client.join).toHaveBeenCalledWith('transaction:txn_1');
    });

    it('should not join when payload has no transactionId', async () => {
      const client = createMockClient();
      client.data = { userId: 'user_1', user: mockUser };
      await gateway.handleChatJoin(client, {});
      expect(transactionsService.getTransactionById).not.toHaveBeenCalled();
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should not join when getTransactionById throws', async () => {
      transactionsService.getTransactionById.mockRejectedValue(new ForbiddenException());
      const client = createMockClient();
      client.data = { userId: 'user_1', user: mockUser };
      await gateway.handleChatJoin(client, { transactionId: 'txn_1' });
      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('handleChatLeave', () => {
    it('should leave transaction room', () => {
      const client = createMockClient();
      gateway.handleChatLeave(client, { transactionId: 'txn_1' });
      expect(client.leave).toHaveBeenCalledWith('transaction:txn_1');
    });

    it('should not leave when payload has no transactionId', () => {
      const client = createMockClient();
      gateway.handleChatLeave(client, {});
      expect(client.leave).not.toHaveBeenCalled();
    });
  });

  describe('handleChatMessage', () => {
    it('should call transactionChatService.sendMessage and emit to room', async () => {
      const client = createMockClient();
      client.data = { userId: 'user_1', user: mockUser };
      const message = {
        id: 'msg_1',
        senderId: 'user_1',
        senderRole: 'buyer' as const,
        content: 'Hi',
        createdAt: new Date(),
      };
      transactionChatService.sendMessage.mockResolvedValue(message);
      await gateway.handleChatMessage(client, {
        transactionId: 'txn_1',
        content: 'Hi',
      });
      expect(transactionChatService.sendMessage).toHaveBeenCalledWith(
        expect.any(Object),
        'txn_1',
        'user_1',
        'Hi',
      );
      expect(broadcaster.emitToRoom).toHaveBeenCalledWith(
        'transaction:txn_1',
        'chat:message',
        expect.objectContaining({
          id: 'msg_1',
          content: 'Hi',
          transactionId: 'txn_1',
        }),
      );
    });

    it('should do nothing when client has no auth data', async () => {
      const client = createMockClient();
      client.data = undefined;
      await gateway.handleChatMessage(client, {
        transactionId: 'txn_1',
        content: 'Hi',
      });
      expect(transactionChatService.sendMessage).not.toHaveBeenCalled();
      expect(broadcaster.emitToRoom).not.toHaveBeenCalled();
    });

    it('should do nothing when payload is incomplete', async () => {
      const client = createMockClient();
      client.data = { userId: 'user_1', user: mockUser };
      await gateway.handleChatMessage(client, { transactionId: 'txn_1' });
      expect(transactionChatService.sendMessage).not.toHaveBeenCalled();
    });
  });
});
