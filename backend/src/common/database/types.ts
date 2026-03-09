import { Ctx } from '../types/context';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma transaction client type - excludes methods not available within transactions
 */
export type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Context with optional transaction support.
 * Extends the base Ctx interface with an optional Prisma transaction client.
 */
export interface TxCtx extends Ctx {
  tx?: PrismaTransactionClient;
}

/**
 * Type guard to check if context has an active transaction.
 * @param ctx - The context to check
 * @returns True if the context contains an active transaction client
 */
export function hasTx(
  ctx: Ctx,
): ctx is TxCtx & { tx: PrismaTransactionClient } {
  return 'tx' in ctx && ctx.tx !== undefined;
}
