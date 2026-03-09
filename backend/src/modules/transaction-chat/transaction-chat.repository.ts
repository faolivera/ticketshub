import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import type { Ctx } from '../../common/types/context';
import type {
  ITransactionChatRepository,
  TransactionChatMessageEntity,
} from './transaction-chat.repository.interface';

const DEFAULT_LIMIT = 100;

@Injectable()
export class TransactionChatRepository
  extends BaseRepository
  implements ITransactionChatRepository
{
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(
    ctx: Ctx,
    transactionId: string,
    senderId: string,
    content: string,
    options?: { messageType?: 'text' | 'delivery'; payloadType?: string },
  ): Promise<TransactionChatMessageEntity> {
    const client = this.getClient(ctx);
    const row = await client.transactionChatMessage.create({
      data: {
        transactionId,
        senderId,
        content,
        messageType: options?.messageType ?? 'text',
        payloadType: options?.payloadType ?? null,
      },
    });
    return this.mapToEntity(row);
  }

  async findByTransaction(
    ctx: Ctx,
    transactionId: string,
    options?: { afterId?: string; limit?: number },
  ): Promise<TransactionChatMessageEntity[]> {
    const client = this.getClient(ctx);
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const rows = await client.transactionChatMessage.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map((r) => this.mapToEntity(r));
  }

  async countByTransaction(ctx: Ctx, transactionId: string): Promise<number> {
    const client = this.getClient(ctx);
    return client.transactionChatMessage.count({
      where: { transactionId },
    });
  }

  async countTextMessagesByTransaction(
    ctx: Ctx,
    transactionId: string,
  ): Promise<number> {
    const client = this.getClient(ctx);
    return client.transactionChatMessage.count({
      where: { transactionId, messageType: 'text' },
    });
  }

  async markAsReadForUser(
    ctx: Ctx,
    transactionId: string,
    userId: string,
    buyerId: string,
    sellerId: string,
  ): Promise<void> {
    const client = this.getClient(ctx);
    const now = new Date();
    if (userId === buyerId) {
      await client.transactionChatMessage.updateMany({
        where: {
          transactionId,
          senderId: sellerId,
          readByBuyerAt: null,
        },
        data: { readByBuyerAt: now },
      });
    } else if (userId === sellerId) {
      await client.transactionChatMessage.updateMany({
        where: {
          transactionId,
          senderId: buyerId,
          readBySellerAt: null,
        },
        data: { readBySellerAt: now },
      });
    }
  }

  async countUnreadForUser(
    ctx: Ctx,
    transactionId: string,
    userId: string,
    buyerId: string,
    sellerId: string,
  ): Promise<number> {
    const client = this.getClient(ctx);
    if (userId === buyerId) {
      return client.transactionChatMessage.count({
        where: {
          transactionId,
          senderId: sellerId,
          readByBuyerAt: null,
        },
      });
    }
    if (userId === sellerId) {
      return client.transactionChatMessage.count({
        where: {
          transactionId,
          senderId: buyerId,
          readBySellerAt: null,
        },
      });
    }
    return 0;
  }

  private mapToEntity(row: {
    id: string;
    transactionId: string;
    senderId: string;
    content: string;
    messageType: string;
    payloadType: string | null;
    createdAt: Date;
    readByBuyerAt: Date | null;
    readBySellerAt: Date | null;
  }): TransactionChatMessageEntity {
    return {
      id: row.id,
      transactionId: row.transactionId,
      senderId: row.senderId,
      content: row.content,
      messageType: (row.messageType === 'delivery' ? 'delivery' : 'text') as TransactionChatMessageEntity['messageType'],
      payloadType: row.payloadType,
      createdAt: row.createdAt,
      readByBuyerAt: row.readByBuyerAt,
      readBySellerAt: row.readBySellerAt,
    };
  }
}
