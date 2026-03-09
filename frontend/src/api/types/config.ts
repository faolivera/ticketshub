/**
 * Response for GET /api/config/app-environment (public).
 * Used to decide e.g. whether to load analytics (only in prod).
 */
export interface GetAppEnvironmentResponse {
  environment: 'dev' | 'test' | 'staging' | 'prod';
}

/**
 * Response for GET /api/config/seller-pricing (seller platform fee for pricing summary).
 */
export interface GetSellerPricingResponse {
  sellerPlatformFeePercentage: number;
}
