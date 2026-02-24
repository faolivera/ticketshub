import { Injectable } from '@nestjs/common';
import { PlatformConfig, DEFAULT_PLATFORM_CONFIG } from './config.domain';

/**
 * Service for managing platform configuration settings
 */
@Injectable()
export class ConfigService {
  private config: PlatformConfig = { ...DEFAULT_PLATFORM_CONFIG };

  /**
   * Get all platform configuration
   */
  getConfig(): PlatformConfig {
    return { ...this.config };
  }

  /**
   * Get digital non-transferable release minutes
   */
  getDigitalNonTransferableReleaseMinutes(): number {
    return this.config.digitalNonTransferableReleaseMinutes;
  }

  /**
   * Get buyer fee percentage
   */
  getBuyerFeePercentage(): number {
    return this.config.buyerFeePercentage;
  }

  /**
   * Get seller fee percentage
   */
  getSellerFeePercentage(): number {
    return this.config.sellerFeePercentage;
  }

  /**
   * Get default currency
   */
  getDefaultCurrency(): string {
    return this.config.defaultCurrency;
  }

  /**
   * Get max listing duration in days
   */
  getMaxListingDurationDays(): number {
    return this.config.maxListingDurationDays;
  }

  /**
   * Update platform configuration (for admin use)
   */
  updateConfig(updates: Partial<PlatformConfig>): PlatformConfig {
    this.config = {
      ...this.config,
      ...updates,
    };
    return { ...this.config };
  }
}
