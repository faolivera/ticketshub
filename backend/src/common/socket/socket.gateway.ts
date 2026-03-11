import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import type { AuthenticatedUserPublicInfo } from '../../modules/users/users.domain';
import { UsersService } from '../../modules/users/users.service';
import { TransactionsService } from '../../modules/transactions/transactions.service';
import { TransactionChatService } from '../../modules/transaction-chat/transaction-chat.service';
import { InMemoryRealtimeBroadcaster } from '../realtime';
import type { Ctx } from '../types/context';
import { CHAT_JOIN, CHAT_LEAVE, CHAT_MESSAGE } from './socket.events';

const USER_ROOM_PREFIX = 'user:';
const TRANSACTION_ROOM_PREFIX = 'transaction:';

interface AuthenticatedSocket {
  userId: string;
  user: AuthenticatedUserPublicInfo;
}

function toWsCtx(requestId: string): Ctx {
  return {
    source: 'WS',
    requestId,
    timestamp: new Date(),
    userId: undefined,
    metadata: {},
  };
}

@WebSocketGateway({
  cors: { origin: 'http://localhost:5173' },
  transports: ['websocket', 'polling'],
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SocketGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly usersService: UsersService,
    private readonly transactionsService: TransactionsService,
    private readonly transactionChatService: TransactionChatService,
    private readonly broadcaster: InMemoryRealtimeBroadcaster,
  ) {}

  afterInit(server: Server): void {
    this.broadcaster.setServer(server);
  }

  async handleConnection(client: any): Promise<void> {
    const token =
      client.handshake?.auth?.token ?? client.handshake?.query?.token;
    if (!token || typeof token !== 'string') {
      this.logger.debug('Socket connection rejected: no token');
      client.disconnect();
      return;
    }

    const payload = this.usersService.verifyToken(token);
    if (!payload) {
      this.logger.debug('Socket connection rejected: invalid token');
      client.disconnect();
      return;
    }

    const requestId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ctx: Ctx = toWsCtx(requestId);

    const user = await this.usersService.getAuthenticatedUserInfo(
      ctx,
      payload.userId,
    );
    if (!user) {
      this.logger.debug('Socket connection rejected: user not found');
      client.disconnect();
      return;
    }

    (client as any).data = { userId: user.id, user } as AuthenticatedSocket;
    client.join(USER_ROOM_PREFIX + user.id);
    this.logger.debug(`Socket connected: user ${user.id}`);
  }

  handleDisconnect(client: any): void {
    const data = (client as any).data as AuthenticatedSocket | undefined;
    if (data?.userId) {
      this.logger.debug(`Socket disconnected: user ${data.userId}`);
    }
  }

  private getAuth(client: any): AuthenticatedSocket | null {
    const data = (client as any).data as AuthenticatedSocket | undefined;
    return data ?? null;
  }

  @SubscribeMessage(CHAT_JOIN)
  async handleChatJoin(
    client: any,
    payload: { transactionId?: string },
  ): Promise<void> {
    const auth = this.getAuth(client);
    if (!auth) return;

    const transactionId = payload?.transactionId;
    if (!transactionId || typeof transactionId !== 'string') {
      return;
    }

    const requestId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ctx = toWsCtx(requestId);

    try {
      await this.transactionsService.getTransactionById(
        ctx,
        transactionId,
        auth.userId,
      );
      client.join(TRANSACTION_ROOM_PREFIX + transactionId);
    } catch {
      // Forbidden or not found - do not join
    }
  }

  @SubscribeMessage(CHAT_LEAVE)
  handleChatLeave(client: any, payload: { transactionId?: string }): void {
    const transactionId = payload?.transactionId;
    if (transactionId && typeof transactionId === 'string') {
      client.leave(TRANSACTION_ROOM_PREFIX + transactionId);
    }
  }

  @SubscribeMessage(CHAT_MESSAGE)
  async handleChatMessage(
    client: any,
    payload: { transactionId?: string; content?: string },
  ): Promise<void> {
    const auth = this.getAuth(client);
    if (!auth) return;

    const transactionId = payload?.transactionId;
    const content = payload?.content;
    if (
      !transactionId ||
      typeof transactionId !== 'string' ||
      content === undefined ||
      typeof content !== 'string'
    ) {
      return;
    }

    const requestId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const ctx = toWsCtx(requestId);

    try {
      const message = await this.transactionChatService.sendMessage(
        ctx,
        transactionId,
        auth.userId,
        content,
      );
      const roomId = TRANSACTION_ROOM_PREFIX + transactionId;
      await this.broadcaster.emitToRoom(roomId, CHAT_MESSAGE, {
        ...message,
        transactionId,
      });
    } catch (err) {
      this.logger.warn(
        `Chat message failed for user ${auth.userId}, transaction ${transactionId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      // Optionally emit an error event to the client
    }
  }
}
