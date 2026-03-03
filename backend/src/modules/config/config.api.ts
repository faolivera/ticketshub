/**
 * Admin API types for platform config.
 */

/**
 * Response for GET /api/admin/config/platform
 */
export interface GetPlatformConfigResponse {
  buyerPlatformFeePercentage: number;
  sellerPlatformFeePercentage: number;
  paymentTimeoutMinutes: number;
  adminReviewTimeoutHours: number;
}

/**
 * Request body for PATCH /api/admin/config/platform
 */
export interface UpdatePlatformConfigRequest {
  buyerPlatformFeePercentage?: number;
  sellerPlatformFeePercentage?: number;
  paymentTimeoutMinutes?: number;
  adminReviewTimeoutHours?: number;
}

/**
 * Response for PATCH /api/admin/config/platform
 */
export type UpdatePlatformConfigResponse = GetPlatformConfigResponse;
