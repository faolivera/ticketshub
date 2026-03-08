import {
  Injectable,
  Inject,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Ctx } from '../../common/types/context';
import type {
  TransactionChatMessageItem,
  ChatSenderRole,
  GetTransactionChatMessagesResponse,
  PostTransactionChatMessageResponse,
} from './transaction-chat.api';
import type {
  ITransactionChatRepository,
  TransactionChatMessageEntity,
} from './transaction-chat.repository.interface';
import { TRANSACTION_CHAT_REPOSITORY } from './transaction-chat.repository.interface';
import { TransactionsService } from '../transactions/transactions.service';
import { PlatformConfigService } from '../config/config.service';
import {
  canReadTransactionChat,
  canSendTransactionChat,
} from '../transactions/transactions.domain';

const MAX_CONTENT_LENGTH = 2000;

@Injectable()
export class TransactionChatService {
  constructor(
    @Inject(TRANSACTION_CHAT_REPOSITORY)
    private readonly chatRepository: ITransactionChatRepository,
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
    @Inject(PlatformConfigService)
    private readonly platformConfigService: PlatformConfigService,
  ) {}

  async getMessages(
    ctx: Ctx,
    transactionId: string,
    userId: string,
    afterId?: string,
    options?: { markRead?: boolean },
  ): Promise<GetTransactionChatMessagesResponse> {
    const transaction =
      await this.transactionsService.getTransactionById(
        ctx,
        transactionId,
        userId,
      );
    if (!canReadTransactionChat(transaction.status)) {
      throw new ForbiddenException('Chat is not available for this transaction');
    }
    const config = await this.platformConfigService.getPlatformConfig(ctx);
    const entities = await this.chatRepository.findByTransaction(ctx, transactionId, {
      afterId,
      limit: config.transactionChatMaxMessages,
    });
    const markRead = options?.markRead !== false;
    if (markRead) {
      await this.chatRepository.markAsReadForUser(
        ctx,
        transactionId,
        userId,
        transaction.buyerId,
        transaction.sellerId,
      );
    }
    const messages: TransactionChatMessageItem[] = entities.map((e) =>
      this.toMessageItem(e, transaction.buyerId, transaction.sellerId),
    );
    return { messages };
  }

  /**
   * Mark all messages in this transaction as read for the current user.
   * Used when the user interacts with an auto-opened chat (without re-fetching messages).
   */
  async markAsRead(
    ctx: Ctx,
    transactionId: string,
    userId: string,
  ): Promise<void> {
    const transaction =
      await this.transactionsService.getTransactionById(
        ctx,
        transactionId,
        userId,
      );
    if (!canReadTransactionChat(transaction.status)) {
      return;
    }
    await this.chatRepository.markAsReadForUser(
      ctx,
      transactionId,
      userId,
      transaction.buyerId,
      transaction.sellerId,
    );
  }

  /**
   * Returns whether the current user has unread messages in this transaction's chat.
   * Used by BFF to include hasUnreadMessages in transaction details.
   */
  async hasUnreadMessages(
    ctx: Ctx,
    transactionId: string,
    userId: string,
  ): Promise<boolean> {
    const transaction =
      await this.transactionsService.getTransactionById(
        ctx,
        transactionId,
        userId,
      );
    if (!canReadTransactionChat(transaction.status)) {
      return false;
    }
    const count = await this.chatRepository.countUnreadForUser(
      ctx,
      transactionId,
      userId,
      transaction.buyerId,
      transaction.sellerId,
    );
    return count > 0;
  }

  async sendMessage(
    ctx: Ctx,
    transactionId: string,
    userId: string,
    content: string,
  ): Promise<PostTransactionChatMessageResponse> {
    const transaction =
      await this.transactionsService.getTransactionById(
        ctx,
        transactionId,
        userId,
      );
    if (!canSendTransactionChat(transaction.status)) {
      throw new ForbiddenException('Chat is not available for this transaction');
    }
    if (content == null || typeof content !== 'string') {
      throw new BadRequestException('Message content is required');
    }
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      throw new BadRequestException('Message content is required');
    }
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      throw new BadRequestException(
        `Message must not exceed ${MAX_CONTENT_LENGTH} characters`,
      );
    }
    const config = await this.platformConfigService.getPlatformConfig(ctx);
    const count = await this.chatRepository.countByTransaction(ctx, transactionId);
    if (count >= config.transactionChatMaxMessages) {
      throw new BadRequestException(
        `Maximum number of messages (${config.transactionChatMaxMessages}) reached for this transaction`,
      );
    }
    const entity = await this.chatRepository.create(
      ctx,
      transactionId,
      userId,
      trimmed,
    );
    return this.toMessageItem(
      entity,
      transaction.buyerId,
      transaction.sellerId,
    );
  }

  /**
   * Create a structured delivery event in chat (system message when seller confirms transfer with payload type).
   * Called after confirmTransfer when payloadType is provided. Does not count toward message limit for user messages.
   */
  async createDeliveryMessage(
    ctx: Ctx,
    transactionId: string,
    sellerId: string,
    payloadType: string,
  ): Promise<TransactionChatMessageItem> {
    const transaction =
      await this.transactionsService.getTransactionById(
        ctx,
        transactionId,
        sellerId,
      );
    if (transaction.sellerId !== sellerId) {
      throw new ForbiddenException('Only seller can create delivery message');
    }
    const entity = await this.chatRepository.create(
      ctx,
      transactionId,
      sellerId,
      '', // no text content for delivery event
      { messageType: 'delivery', payloadType },
    );
    return this.toMessageItem(
      entity,
      transaction.buyerId,
      transaction.sellerId,
    );
  }

  private toMessageItem(
    entity: TransactionChatMessageEntity,
    buyerId: string,
    sellerId: string,
  ): TransactionChatMessageItem {
    const senderRole: ChatSenderRole =
      entity.senderId === buyerId ? 'buyer' : 'seller';
    return {
      id: entity.id,
      senderId: entity.senderId,
      senderRole,
      content: entity.content,
      messageType: entity.messageType,
      payloadType: entity.payloadType ?? undefined,
      createdAt: entity.createdAt,
    };
  }
}
