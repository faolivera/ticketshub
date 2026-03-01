import type { Ctx } from '../../common/types/context';
import type { PaymentIntent } from './payments.domain';

/**
 * Payments repository interface
 */
export interface IPaymentsRepository {
  /**
   * Create a payment intent
   */
  create(ctx: Ctx, payment: PaymentIntent): Promise<PaymentIntent>;

  /**
   * Find payment intent by ID
   */
  findById(ctx: Ctx, id: string): Promise<PaymentIntent | undefined>;

  /**
   * Find payment intent by transaction ID
   */
  findByTransactionId(
    ctx: Ctx,
    transactionId: string,
  ): Promise<PaymentIntent | undefined>;

  /**
   * Find payment intent by provider payment ID
   */
  findByProviderPaymentId(
    ctx: Ctx,
    providerPaymentId: string,
  ): Promise<PaymentIntent | undefined>;

  /**
   * Update payment intent
   */
  update(
    ctx: Ctx,
    id: string,
    updates: Partial<PaymentIntent>,
  ): Promise<PaymentIntent | undefined>;
}

/**
 * Injection token for IPaymentsRepository
 */
export const PAYMENTS_REPOSITORY = Symbol('IPaymentsRepository');
