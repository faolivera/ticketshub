import type { CurrencyCode } from '../shared/money.domain';
import type { Ctx } from '../../common/types/context';

/**
 * Money representation
 */
export interface Money {
  amount: number; // in cents
  currency: CurrencyCode;
}

/**
 * Payment status
 */
export enum PaymentStatus {
  Pending = 'pending',
  Processing = 'processing',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

/**
 * Payment intent - represents a payment attempt
 */
export interface PaymentIntent {
  id: string;
  transactionId: string;
  amount: Money;
  status: PaymentStatus;
  providerPaymentId?: string; // ID from external provider (Stripe, etc.)
  metadata: PaymentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment metadata
 */
export interface PaymentMetadata {
  buyerId: string;
  sellerId: string;
  listingId: string;
  eventName?: string;
  ticketDescription?: string;
}

/**
 * Webhook event from payment provider
 */
export interface WebhookEvent {
  type: string;
  paymentIntentId: string;
  status: PaymentStatus;
  timestamp: Date;
}

/**
 * Webhook processing result
 */
export interface WebhookResult {
  processed: boolean;
  transactionId?: string;
  error?: string;
}

/**
 * Payout request for sellers
 */
export interface PayoutRequest {
  id: string;
  userId: string;
  amount: Money;
  bankAccountId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  providerPayoutId?: string;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Payout result
 */
export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  error?: string;
}

/**
 * Abstract payment provider interface
 * Implement this for specific providers (Stripe, PayPal, etc.)
 */
export interface PaymentProvider {
  /**
   * Create a payment intent
   */
  createPaymentIntent(
    ctx: Ctx,
    transactionId: string,
    amount: Money,
    metadata: PaymentMetadata,
  ): Promise<PaymentIntent>;

  /**
   * Confirm a payment intent
   */
  confirmPayment(ctx: Ctx, paymentIntentId: string): Promise<PaymentIntent>;

  /**
   * Cancel a payment intent
   */
  cancelPayment(ctx: Ctx, paymentIntentId: string): Promise<PaymentIntent>;

  /**
   * Refund a payment
   */
  refundPayment(ctx: Ctx, paymentIntentId: string, amount?: Money): Promise<PaymentIntent>;

  /**
   * Process webhook from provider
   */
  processWebhook(ctx: Ctx, payload: unknown, signature?: string): Promise<WebhookResult>;
}

/**
 * Abstract payout provider interface
 */
export interface PayoutProvider {
  /**
   * Create a payout to seller's bank account
   */
  createPayout(ctx: Ctx, userId: string, amount: Money, bankAccountId: string): Promise<PayoutResult>;
}
