import type { Money, PaymentIntent, PaymentStatus } from './payments.domain';

/**
 * Request to create a payment intent
 */
export interface CreatePaymentIntentRequest {
  transactionId: string;
  amount: Money;
  metadata: {
    buyerId: string;
    sellerId: string;
    listingId: string;
    eventName?: string;
    ticketDescription?: string;
  };
}

/**
 * Response after creating payment intent
 */
export interface CreatePaymentIntentResponse {
  paymentIntentId: string;
  clientSecret?: string; // For client-side payment confirmation (e.g., Stripe)
  status: PaymentStatus;
}

/**
 * Webhook payload (generic structure)
 */
export interface WebhookPayload {
  type: string;
  data: Record<string, unknown>;
  signature?: string;
}

/**
 * Response for webhook processing
 */
export interface WebhookResponse {
  received: boolean;
  processed: boolean;
  error?: string;
}

/**
 * Response for getting payment status
 */
export type GetPaymentStatusResponse = PaymentIntent;
