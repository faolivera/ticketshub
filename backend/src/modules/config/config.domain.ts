/**
 * Platform configuration settings
 */
export interface PlatformConfig {
  /**
   * Minutes after event ends to auto-release payment for digital non-transferable tickets
   */
  digitalNonTransferableReleaseMinutes: number;

  /**
   * Buyer fee percentage (e.g., 10 = 10%)
   */
  buyerFeePercentage: number;

  /**
   * Seller fee percentage (e.g., 5 = 5%)
   */
  sellerFeePercentage: number;

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
  buyerFeePercentage: 10,
  sellerFeePercentage: 5,
  defaultCurrency: 'EUR',
  maxListingDurationDays: 90,
};
