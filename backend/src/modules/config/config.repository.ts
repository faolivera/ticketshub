import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import type { Ctx } from '../../common/types/context';
import type { PlatformConfig } from './config.domain';
import { PLATFORM_CONFIG_DEFAULT_ID } from './config.domain';
import type { IConfigRepository } from './config.repository.interface';

@Injectable()
export class ConfigRepository extends BaseRepository implements IConfigRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async findPlatformConfig(ctx: Ctx): Promise<PlatformConfig | null> {
    const client = this.getClient(ctx);
    const row = await client.platformConfig.findUnique({
      where: { id: PLATFORM_CONFIG_DEFAULT_ID },
    });
    if (!row) return null;
    return {
      buyerPlatformFeePercentage: row.buyerPlatformFeePercentage,
      sellerPlatformFeePercentage: row.sellerPlatformFeePercentage,
      paymentTimeoutMinutes: row.paymentTimeoutMinutes,
      adminReviewTimeoutHours: row.adminReviewTimeoutHours,
      offerPendingExpirationMinutes: row.offerPendingExpirationMinutes,
      offerAcceptedExpirationMinutes: row.offerAcceptedExpirationMinutes,
    };
  }

  async upsertPlatformConfig(ctx: Ctx, config: PlatformConfig): Promise<PlatformConfig> {
    const client = this.getClient(ctx);
    const row = await client.platformConfig.upsert({
      where: { id: PLATFORM_CONFIG_DEFAULT_ID },
      create: {
        id: PLATFORM_CONFIG_DEFAULT_ID,
        buyerPlatformFeePercentage: config.buyerPlatformFeePercentage,
        sellerPlatformFeePercentage: config.sellerPlatformFeePercentage,
        paymentTimeoutMinutes: config.paymentTimeoutMinutes,
        adminReviewTimeoutHours: config.adminReviewTimeoutHours,
        offerPendingExpirationMinutes: config.offerPendingExpirationMinutes,
        offerAcceptedExpirationMinutes: config.offerAcceptedExpirationMinutes,
      },
      update: {
        buyerPlatformFeePercentage: config.buyerPlatformFeePercentage,
        sellerPlatformFeePercentage: config.sellerPlatformFeePercentage,
        paymentTimeoutMinutes: config.paymentTimeoutMinutes,
        adminReviewTimeoutHours: config.adminReviewTimeoutHours,
        offerPendingExpirationMinutes: config.offerPendingExpirationMinutes,
        offerAcceptedExpirationMinutes: config.offerAcceptedExpirationMinutes,
      },
    });
    return {
      buyerPlatformFeePercentage: row.buyerPlatformFeePercentage,
      sellerPlatformFeePercentage: row.sellerPlatformFeePercentage,
      paymentTimeoutMinutes: row.paymentTimeoutMinutes,
      adminReviewTimeoutHours: row.adminReviewTimeoutHours,
      offerPendingExpirationMinutes: row.offerPendingExpirationMinutes,
      offerAcceptedExpirationMinutes: row.offerAcceptedExpirationMinutes,
    };
  }
}
