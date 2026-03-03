import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { CONFIG_REPOSITORY, type IConfigRepository } from './config.repository.interface';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { PlatformConfig } from './config.domain';
import type {
  GetPlatformConfigResponse,
  UpdatePlatformConfigRequest,
  UpdatePlatformConfigResponse,
} from './config.api';

const MIN_FEE = 0;
const MAX_FEE = 100;
const MIN_PAYMENT_TIMEOUT_MINUTES = 1;
const MAX_PAYMENT_TIMEOUT_MINUTES = 1440; // 24h
const MIN_ADMIN_REVIEW_HOURS = 1;
const MAX_ADMIN_REVIEW_HOURS = 168; // 1 week

@Injectable()
export class PlatformConfigService {
  private readonly logger = new ContextLogger(PlatformConfigService.name);

  constructor(
    @Inject(CONFIG_REPOSITORY)
    private readonly configRepository: IConfigRepository,
    @Inject(NestConfigService)
    private readonly nestConfigService: NestConfigService,
  ) {}

  /**
   * Returns current platform config. If no row exists in DB, seeds from HOCON and returns.
   */
  async getPlatformConfig(ctx: Ctx): Promise<PlatformConfig> {
    let config = await this.configRepository.findPlatformConfig(ctx);
    if (!config) {
      config = this.getDefaultsFromHocon();
      await this.configRepository.upsertPlatformConfig(ctx, config);
      this.logger.log(ctx, 'Seeded platform config from HOCON defaults');
    }
    return config;
  }

  /**
   * Returns platform config for admin API (same as getPlatformConfig).
   */
  async getPlatformConfigForAdmin(ctx: Ctx): Promise<GetPlatformConfigResponse> {
    return this.getPlatformConfig(ctx);
  }

  /**
   * Updates platform config (admin only). Validates and merges with current values.
   */
  async updatePlatformConfig(
    ctx: Ctx,
    body: UpdatePlatformConfigRequest,
  ): Promise<UpdatePlatformConfigResponse> {
    const current = await this.getPlatformConfig(ctx);
    const merged: PlatformConfig = {
      buyerPlatformFeePercentage:
        body.buyerPlatformFeePercentage ?? current.buyerPlatformFeePercentage,
      sellerPlatformFeePercentage:
        body.sellerPlatformFeePercentage ?? current.sellerPlatformFeePercentage,
      paymentTimeoutMinutes: body.paymentTimeoutMinutes ?? current.paymentTimeoutMinutes,
      adminReviewTimeoutHours:
        body.adminReviewTimeoutHours ?? current.adminReviewTimeoutHours,
    };
    this.validatePlatformConfig(merged);
    const updated = await this.configRepository.upsertPlatformConfig(ctx, merged);
    this.logger.log(ctx, 'Updated platform config');
    return updated;
  }

  private getDefaultsFromHocon(): PlatformConfig {
    return {
      buyerPlatformFeePercentage:
        this.nestConfigService.get<number>('platform.buyerPlatformFeePercentage') ?? 10,
      sellerPlatformFeePercentage:
        this.nestConfigService.get<number>('platform.sellerPlatformFeePercentage') ?? 5,
      paymentTimeoutMinutes:
        this.nestConfigService.get<number>('platform.paymentTimeoutMinutes') ?? 10,
      adminReviewTimeoutHours:
        this.nestConfigService.get<number>('platform.adminReviewTimeoutHours') ?? 24,
    };
  }

  private validatePlatformConfig(config: PlatformConfig): void {
    if (
      config.buyerPlatformFeePercentage < MIN_FEE ||
      config.buyerPlatformFeePercentage > MAX_FEE
    ) {
      throw new BadRequestException(
        `buyerPlatformFeePercentage must be between ${MIN_FEE} and ${MAX_FEE}`,
      );
    }
    if (
      config.sellerPlatformFeePercentage < MIN_FEE ||
      config.sellerPlatformFeePercentage > MAX_FEE
    ) {
      throw new BadRequestException(
        `sellerPlatformFeePercentage must be between ${MIN_FEE} and ${MAX_FEE}`,
      );
    }
    if (
      config.paymentTimeoutMinutes < MIN_PAYMENT_TIMEOUT_MINUTES ||
      config.paymentTimeoutMinutes > MAX_PAYMENT_TIMEOUT_MINUTES
    ) {
      throw new BadRequestException(
        `paymentTimeoutMinutes must be between ${MIN_PAYMENT_TIMEOUT_MINUTES} and ${MAX_PAYMENT_TIMEOUT_MINUTES}`,
      );
    }
    if (
      config.adminReviewTimeoutHours < MIN_ADMIN_REVIEW_HOURS ||
      config.adminReviewTimeoutHours > MAX_ADMIN_REVIEW_HOURS
    ) {
      throw new BadRequestException(
        `adminReviewTimeoutHours must be between ${MIN_ADMIN_REVIEW_HOURS} and ${MAX_ADMIN_REVIEW_HOURS}`,
      );
    }
  }
}
