/**
 * Platform configuration domain.
 * Values are stored in DB (singleton) and can be overridden by admin; HOCON provides defaults when no row exists.
 */
export interface PlatformConfig {
  buyerPlatformFeePercentage: number;
  sellerPlatformFeePercentage: number;
  paymentTimeoutMinutes: number;
  adminReviewTimeoutHours: number;
}

export const PLATFORM_CONFIG_DEFAULT_ID = 'default';
