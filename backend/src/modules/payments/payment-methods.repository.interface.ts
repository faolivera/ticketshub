import type { Ctx } from '../../common/types/context';
import type { PaymentMethodOption } from './payments.domain';

/**
 * Payment methods repository interface
 */
export interface IPaymentMethodsRepository {
  /**
   * Find all payment methods
   */
  findAll(ctx: Ctx): Promise<PaymentMethodOption[]>;

  /**
   * Find payment method by ID
   */
  findById(ctx: Ctx, id: string): Promise<PaymentMethodOption | undefined>;

  /**
   * Find all enabled payment methods
   */
  findEnabled(ctx: Ctx): Promise<PaymentMethodOption[]>;

  /**
   * Create a new payment method
   */
  create(
    ctx: Ctx,
    paymentMethod: PaymentMethodOption,
  ): Promise<PaymentMethodOption>;

  /**
   * Update a payment method
   */
  update(
    ctx: Ctx,
    id: string,
    updates: Partial<PaymentMethodOption>,
  ): Promise<PaymentMethodOption | undefined>;

  /**
   * Delete a payment method
   */
  delete(ctx: Ctx, id: string): Promise<boolean>;
}

/**
 * Injection token for IPaymentMethodsRepository
 */
export const PAYMENT_METHODS_REPOSITORY = Symbol('IPaymentMethodsRepository');
