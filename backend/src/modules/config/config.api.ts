import type { RiskEngineConfig, ExchangeRatesConfig } from './config.domain';

/**
 * Admin API types for platform config.
 */

/**
 * Response for GET /api/config/seller-pricing (authenticated, non-admin).
 * Used by the sell-ticket flow to display platform commission.
 */
export interface GetSellerPricingResponse {
  sellerPlatformFeePercentage: number;
}

/**
 * Response for GET /api/admin/config/platform
 */
export interface GetPlatformConfigResponse {
  buyerPlatformFeePercentage: number;
  sellerPlatformFeePercentage: number;
  paymentTimeoutMinutes: number;
  adminReviewTimeoutHours: number;
  offerPendingExpirationMinutes: number;
  offerAcceptedExpirationMinutes: number;
  transactionChatPollIntervalSeconds: number;
  transactionChatMaxMessages: number;
  riskEngine: RiskEngineConfig;
  exchangeRates: ExchangeRatesConfig;
}

/**
 * Request body for PATCH /api/admin/config/platform
 */
export interface UpdatePlatformConfigRequest {
  buyerPlatformFeePercentage?: number;
  sellerPlatformFeePercentage?: number;
  paymentTimeoutMinutes?: number;
  adminReviewTimeoutHours?: number;
  offerPendingExpirationMinutes?: number;
  offerAcceptedExpirationMinutes?: number;
  transactionChatPollIntervalSeconds?: number;
  transactionChatMaxMessages?: number;
  riskEngine?: {
    buyer?: Partial<RiskEngineConfig['buyer']>;
    seller?: Partial<RiskEngineConfig['seller']> & {
      unverifiedSellerMaxAmount?: RiskEngineConfig['seller']['unverifiedSellerMaxAmount'];
    };
    claims?: Partial<RiskEngineConfig['claims']>;
  };
  exchangeRates?: Partial<ExchangeRatesConfig>;
}

/**
 * Response for PATCH /api/admin/config/platform
 */
export type UpdatePlatformConfigResponse = GetPlatformConfigResponse;
