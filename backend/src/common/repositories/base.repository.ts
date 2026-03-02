import { PrismaService } from '../prisma/prisma.service';
import { Ctx } from '../types/context';
import { PrismaTransactionClient, hasTx } from '../database/types';

/**
 * Base repository class that provides transaction-aware Prisma client access.
 * All repositories should extend this class to automatically support transactions.
 */
export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Get the appropriate Prisma client based on context.
   * Returns transaction client if in transaction, otherwise returns base PrismaService.
   *
   * @param ctx - The current context
   * @returns The Prisma client to use for database operations
   */
  protected getClient(ctx: Ctx): PrismaTransactionClient | PrismaService {
    if (hasTx(ctx)) {
      return ctx.tx;
    }
    return this.prisma;
  }
}
