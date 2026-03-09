import type { Ctx } from '../../common/types/context';

export type ChatMessageType = 'text' | 'delivery';

export interface TransactionChatMessageEntity {
  id: string;
  transactionId: string;
  senderId: string;
  content: string;
  messageType: ChatMessageType;
  payloadType: string | null;
  createdAt: Date;
  readByBuyerAt: Date | null;
  readBySellerAt: Date | null;
}

export interface ITransactionChatRepository {
  create(
    ctx: Ctx,
    transactionId: string,
    senderId: string,
    content: string,
    options?: { messageType?: ChatMessageType; payloadType?: string },
  ): Promise<TransactionChatMessageEntity>;

  findByTransaction(
    ctx: Ctx,
    transactionId: string,
    options?: { afterId?: string; limit?: number },
  ): Promise<TransactionChatMessageEntity[]>;

  countByTransaction(ctx: Ctx, transactionId: string): Promise<number>;

  /**
   * Count only user-written messages (messageType === 'text'), excluding system/delivery messages
   * (e.g. "ticket sent"). Used to determine if buyer and seller have actually exchanged messages.
   */
  countTextMessagesByTransaction(ctx: Ctx, transactionId: string): Promise<number>;

  /**
   * Mark messages from the other party as read for the given user (buyer or seller).
   */
  markAsReadForUser(
    ctx: Ctx,
    transactionId: string,
    userId: string,
    buyerId: string,
    sellerId: string,
  ): Promise<void>;

  /**
   * Count messages from the other party that the given user has not read.
   */
  countUnreadForUser(
    ctx: Ctx,
    transactionId: string,
    userId: string,
    buyerId: string,
    sellerId: string,
  ): Promise<number>;
}

export const TRANSACTION_CHAT_REPOSITORY = Symbol('ITransactionChatRepository');
