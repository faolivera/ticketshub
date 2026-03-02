import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Ctx } from '../types/context';
import { TxCtx, PrismaTransactionClient, hasTx } from './types';

export interface TransactionOptions {
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
  timeout?: number;
}

@Injectable()
export class TransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a function within a database transaction.
   * If the context already has a transaction, reuses it (nested transaction support).
   * Otherwise, creates a new transaction.
   *
   * @param ctx - The current context
   * @param fn - The function to execute within the transaction
   * @param options - Optional transaction configuration
   * @returns The result of the function execution
   */
  async executeInTransaction<T>(
    ctx: Ctx,
    fn: (txCtx: TxCtx) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    // If already in a transaction, reuse it
    if (hasTx(ctx)) {
      return fn(ctx);
    }

    // Create new transaction
    return this.prisma.$transaction(
      async (tx) => {
        const txCtx: TxCtx = {
          ...ctx,
          tx: tx as PrismaTransactionClient,
        };
        return fn(txCtx);
      },
      {
        isolationLevel: options?.isolationLevel,
        timeout: options?.timeout,
      },
    );
  }

  /**
   * Get the Prisma client from context.
   * Returns transaction client if in transaction, otherwise returns base PrismaService.
   *
   * @param ctx - The current context
   * @returns The appropriate Prisma client
   */
  getClient(ctx: Ctx): PrismaTransactionClient | PrismaService {
    if (hasTx(ctx)) {
      return ctx.tx;
    }
    return this.prisma;
  }
}
