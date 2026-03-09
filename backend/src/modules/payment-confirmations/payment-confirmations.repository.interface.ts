import type { Ctx } from '../../common/types/context';
import type { PaymentConfirmation } from './payment-confirmations.domain';

/**
 * Payment confirmations repository interface
 */
export interface IPaymentConfirmationsRepository {
  /**
   * Find payment confirmation by ID
   */
  findById(ctx: Ctx, id: string): Promise<PaymentConfirmation | null>;

  /**
   * Find payment confirmation by transaction ID
   */
  findByTransactionId(
    ctx: Ctx,
    transactionId: string,
  ): Promise<PaymentConfirmation | null>;

  /**
   * Find all pending payment confirmations
   */
  findAllPending(ctx: Ctx): Promise<PaymentConfirmation[]>;

  /**
   * Count pending payment confirmations
   */
  countPending(ctx: Ctx): Promise<number>;

  /**
   * Get transaction IDs that have pending payment confirmations
   */
  getPendingTransactionIds(ctx: Ctx): Promise<string[]>;

  /**
   * Find payment confirmations by transaction IDs (batch)
   */
  findByTransactionIds(
    ctx: Ctx,
    transactionIds: string[],
  ): Promise<PaymentConfirmation[]>;

  /**
   * Save a payment confirmation (create or update)
   */
  save(
    ctx: Ctx,
    confirmation: PaymentConfirmation,
  ): Promise<PaymentConfirmation>;

  /**
   * Delete a payment confirmation by ID
   */
  delete(ctx: Ctx, id: string): Promise<void>;
}

/**
 * Injection token for IPaymentConfirmationsRepository
 */
export const PAYMENT_CONFIRMATIONS_REPOSITORY = Symbol(
  'IPaymentConfirmationsRepository',
);
