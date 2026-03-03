import type { Money } from '../payments.domain';

/**
 * Snapshot of a single payment method's commission at quote time
 */
export interface PaymentMethodCommissionSnapshot {
  paymentMethodId: string;
  paymentMethodName: string;
  commissionPercent: number | null;
}

/**
 * Pricing snapshot - immutable record of pricing at quote time
 */
export interface PricingSnapshot {
  id: string;
  listingId: string;

  pricePerTicket: Money;
  buyerPlatformFeePercentage: number;
  sellerPlatformFeePercentage: number;

  paymentMethodCommissions: PaymentMethodCommissionSnapshot[];

  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date;
  consumedByTransactionId?: string;
  selectedPaymentMethodId?: string;
}

/**
 * Error codes for pricing snapshot validation failures
 */
export enum PricingSnapshotError {
  NOT_FOUND = 'PRICING_SNAPSHOT_NOT_FOUND',
  EXPIRED = 'PRICING_SNAPSHOT_EXPIRED',
  ALREADY_CONSUMED = 'PRICING_SNAPSHOT_ALREADY_CONSUMED',
  LISTING_MISMATCH = 'PRICING_SNAPSHOT_LISTING_MISMATCH',
  PAYMENT_METHOD_NOT_AVAILABLE = 'PRICING_SNAPSHOT_PAYMENT_METHOD_NOT_AVAILABLE',
}

/**
 * Result of validating and consuming a pricing snapshot
 */
export interface ConsumedSnapshotResult {
  snapshot: PricingSnapshot;
  selectedCommissionPercent: number;
}
