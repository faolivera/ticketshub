/**
 * Platform configuration settings
 */
export interface PlatformConfig {
  /**
   * Minutes after event ends to auto-release payment for digital non-transferable tickets
   */
  digitalNonTransferableReleaseMinutes: number;

  /**
   * Buyer platform fee percentage (e.g., 10 = 10%)
   */
  buyerPlatformFeePercentage: number;

  /**
   * Seller platform fee percentage (e.g., 5 = 5%)
   */
  sellerPlatformFeePercentage: number;

  /**
   * Default currency for the platform
   */
  defaultCurrency: string;

  /**
   * Maximum days a listing can remain active
   */
  maxListingDurationDays: number;
}

/**
 * Default platform configuration values
 */
export const DEFAULT_PLATFORM_CONFIG: PlatformConfig = {
  digitalNonTransferableReleaseMinutes: 30,
  buyerPlatformFeePercentage: 10,
  sellerPlatformFeePercentage: 5,
  defaultCurrency: 'EUR',
  maxListingDurationDays: 90,
};
