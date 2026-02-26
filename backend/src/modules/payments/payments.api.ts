import type {
  Money,
  PaymentIntent,
  PaymentStatus,
  PaymentMethodOption,
  PaymentMethodType,
  PaymentGatewayProvider,
  BankTransferConfig,
  PublicPaymentMethodOption,
} from './payments.domain';

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
  clientSecret?: string;
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

/**
 * Request to create a payment method (admin)
 */
export interface CreatePaymentMethodRequest {
  name: string;
  publicName: string;
  type: PaymentMethodType;
  buyerCommissionPercent: number | null;
  gatewayProvider?: PaymentGatewayProvider;
  gatewayConfigEnvPrefix?: string;
  bankTransferConfig?: BankTransferConfig;
}

/**
 * Request to update a payment method (admin)
 */
export interface UpdatePaymentMethodRequest {
  name?: string;
  publicName?: string;
  status?: 'enabled' | 'disabled';
  buyerCommissionPercent?: number | null;
  gatewayProvider?: PaymentGatewayProvider;
  gatewayConfigEnvPrefix?: string;
  bankTransferConfig?: BankTransferConfig;
}

/**
 * Response for listing all payment methods (admin)
 */
export type GetPaymentMethodsResponse = PaymentMethodOption[];

/**
 * Response for getting a single payment method (admin)
 */
export type GetPaymentMethodResponse = PaymentMethodOption;

/**
 * Response for public payment methods (buy page)
 */
export type GetPublicPaymentMethodsResponse = PublicPaymentMethodOption[];
