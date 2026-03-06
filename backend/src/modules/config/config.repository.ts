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
    return this.mergeWithVerificationDefaults({
      buyerPlatformFeePercentage: row.buyerPlatformFeePercentage,
      sellerPlatformFeePercentage: row.sellerPlatformFeePercentage,
      paymentTimeoutMinutes: row.paymentTimeoutMinutes,
      adminReviewTimeoutHours: row.adminReviewTimeoutHours,
      offerPendingExpirationMinutes: row.offerPendingExpirationMinutes,
      offerAcceptedExpirationMinutes: row.offerAcceptedExpirationMinutes,
      transactionChatPollIntervalSeconds: row.transactionChatPollIntervalSeconds,
      transactionChatMaxMessages: row.transactionChatMaxMessages,
    });
  }

  private getDefaultRiskEngine(): PlatformConfig['riskEngine'] {
    return {
      buyer: {
        phoneRequiredEventHours: 72,
        phoneRequiredAmountUsd: 120,
        phoneRequiredQtyTickets: 2,
        newAccountDays: 7,
      },
      seller: {
        unverifiedSellerMaxSales: 2,
        unverifiedSellerMaxAmount: { amount: 20000, currency: 'USD' }, // 200 USD in cents
        payoutHoldHoursDefault: 24,
        payoutHoldHoursUnverified: 48,
      },
      claims: {
        claimKycDeadlineHours: 24,
        claimInvalidEntryWindowHours: 2,
        claimNotReceivedWindowHours: 24,
      },
    };
  }

  private getDefaultExchangeRates(): PlatformConfig['exchangeRates'] {
    return { usdToArs: 1000 };
  }

  private mergeWithVerificationDefaults(
    base: Omit<PlatformConfig, 'riskEngine' | 'exchangeRates'>,
  ): PlatformConfig {
    return {
      ...base,
      riskEngine: this.getDefaultRiskEngine(),
      exchangeRates: this.getDefaultExchangeRates(),
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
        transactionChatPollIntervalSeconds: config.transactionChatPollIntervalSeconds,
        transactionChatMaxMessages: config.transactionChatMaxMessages,
      },
      update: {
        buyerPlatformFeePercentage: config.buyerPlatformFeePercentage,
        sellerPlatformFeePercentage: config.sellerPlatformFeePercentage,
        paymentTimeoutMinutes: config.paymentTimeoutMinutes,
        adminReviewTimeoutHours: config.adminReviewTimeoutHours,
        offerPendingExpirationMinutes: config.offerPendingExpirationMinutes,
        offerAcceptedExpirationMinutes: config.offerAcceptedExpirationMinutes,
        transactionChatPollIntervalSeconds: config.transactionChatPollIntervalSeconds,
        transactionChatMaxMessages: config.transactionChatMaxMessages,
      },
    });
    return this.mergeWithVerificationDefaults({
      buyerPlatformFeePercentage: row.buyerPlatformFeePercentage,
      sellerPlatformFeePercentage: row.sellerPlatformFeePercentage,
      paymentTimeoutMinutes: row.paymentTimeoutMinutes,
      adminReviewTimeoutHours: row.adminReviewTimeoutHours,
      offerPendingExpirationMinutes: row.offerPendingExpirationMinutes,
      offerAcceptedExpirationMinutes: row.offerAcceptedExpirationMinutes,
      transactionChatPollIntervalSeconds: row.transactionChatPollIntervalSeconds,
      transactionChatMaxMessages: row.transactionChatMaxMessages,
    });
  }
}
