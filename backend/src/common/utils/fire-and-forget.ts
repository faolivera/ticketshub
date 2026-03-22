import { ContextLogger } from '../logger/context-logger';
import { Ctx } from '../types/context';
import { TxCtx } from '../database/types';

/**
 * Utility for fire-and-forget async calls.
 * Strips any active transaction from the context before invoking the callback,
 * ensuring side-effect operations (e.g. notifications) always run against the
 * global DB client and never fail because an outer transaction has already committed.
 */
export class FireAndForget {
  static run(
    ctx: Ctx,
    fn: (ctx: Ctx) => Promise<void>,
    logger: ContextLogger,
    errorMessage: string,
  ): void {
    const { tx: _tx, ...cleanCtx } = ctx as TxCtx;
    fn(cleanCtx).catch((err) => logger.error(cleanCtx, errorMessage, err));
  }
}
