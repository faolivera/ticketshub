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
}

/**
 * Response for PATCH /api/admin/config/platform
 */
export type UpdatePlatformConfigResponse = GetPlatformConfigResponse;
