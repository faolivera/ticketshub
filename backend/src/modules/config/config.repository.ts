import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import type { Ctx } from '../../common/types/context';
import type {
  PlatformConfig,
  RiskEngineConfig,
  RiskEngineBuyerConfig,
  RiskEngineSellerConfig,
  RiskEngineClaimsConfig,
} from './config.domain';
import { PLATFORM_CONFIG_DEFAULT_ID } from './config.domain';
import type { IConfigRepository } from './config.repository.interface';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ConfigRepository extends BaseRepository implements IConfigRepository {
  constructor(
    prisma: PrismaService,
    private readonly nestConfigService: NestConfigService,
  ) {
    super(prisma);
  }

  async findPlatformConfig(ctx: Ctx): Promise<PlatformConfig | null> {
    const client = this.getClient(ctx);
    const row = await client.platformConfig.findUnique({
      where: { id: PLATFORM_CONFIG_DEFAULT_ID },
    });
    if (!row) return null;
    const riskEngine = this.resolveRiskEngine(row.riskEngine);
    return this.mergeWithVerificationDefaults(
      {
        buyerPlatformFeePercentage: row.buyerPlatformFeePercentage,
        sellerPlatformFeePercentage: row.sellerPlatformFeePercentage,
        paymentTimeoutMinutes: row.paymentTimeoutMinutes,
        adminReviewTimeoutHours: row.adminReviewTimeoutHours,
        offerPendingExpirationMinutes: row.offerPendingExpirationMinutes,
        offerAcceptedExpirationMinutes: row.offerAcceptedExpirationMinutes,
        transactionChatPollIntervalSeconds: row.transactionChatPollIntervalSeconds,
        transactionChatMaxMessages: row.transactionChatMaxMessages,
      },
      riskEngine,
    );
  }

  private getDefaultRiskEngine(): RiskEngineConfig {
    const get = (path: string) => this.nestConfigService.get<number>(path)!;
    const amountUsd = get('platform.riskEngine.seller.unverifiedSellerMaxAmountUsd');
    return {
      buyer: {
        phoneRequiredEventHours: get('platform.riskEngine.buyer.phoneRequiredEventHours'),
        phoneRequiredAmountUsd: get('platform.riskEngine.buyer.phoneRequiredAmountUsd'),
        phoneRequiredQtyTickets: get('platform.riskEngine.buyer.phoneRequiredQtyTickets'),
        newAccountDays: get('platform.riskEngine.buyer.newAccountDays'),
        dniRequiredEventHours: get('platform.riskEngine.buyer.dniRequiredEventHours'),
        dniRequiredAmountUsd: get('platform.riskEngine.buyer.dniRequiredAmountUsd'),
        dniRequiredQtyTickets: get('platform.riskEngine.buyer.dniRequiredQtyTickets'),
        dniNewAccountDays: get('platform.riskEngine.buyer.dniNewAccountDays'),
      },
      seller: {
        unverifiedSellerMaxSales: get('platform.riskEngine.seller.unverifiedSellerMaxSales'),
        unverifiedSellerMaxAmount: { amount: Math.round(amountUsd * 100), currency: 'USD' },
        payoutHoldHoursDefault: get('platform.riskEngine.seller.payoutHoldHoursDefault'),
        payoutHoldHoursUnverified: get('platform.riskEngine.seller.payoutHoldHoursUnverified'),
      },
      claims: {
        ticketNotReceived: {
          minimumClaimHours: get('platform.riskEngine.claims.ticketNotReceived.minimumClaimHours'),
          maximumClaimHours: get('platform.riskEngine.claims.ticketNotReceived.maximumClaimHours'),
        },
        ticketDidntWork: {
          minimumClaimHours: get('platform.riskEngine.claims.ticketDidntWork.minimumClaimHours'),
          maximumClaimHours: get('platform.riskEngine.claims.ticketDidntWork.maximumClaimHours'),
        },
      },
    };
  }

  /**
   * Merge stored JSON with defaults so missing keys (e.g. after adding DNI fields) get default values.
   */
  private resolveRiskEngine(stored: Prisma.JsonValue | null): RiskEngineConfig {
    const defaults = this.getDefaultRiskEngine();
    if (stored == null || typeof stored !== 'object' || Array.isArray(stored)) {
      return defaults;
    }
    const o = stored as Record<string, unknown>;
    return {
      buyer: this.mergeBuyerConfig(
        defaults.buyer,
        (o.buyer as Partial<RiskEngineBuyerConfig> | undefined),
      ),
      seller: this.mergeSellerConfig(
        defaults.seller,
        (o.seller as Partial<RiskEngineSellerConfig> | undefined),
      ),
      claims: this.mergeClaimsConfig(
        defaults.claims,
        (o.claims as Partial<RiskEngineClaimsConfig> | undefined),
      ),
    };
  }

  private mergeBuyerConfig(
    defaultCfg: RiskEngineBuyerConfig,
    stored?: Partial<RiskEngineBuyerConfig>,
  ): RiskEngineBuyerConfig {
    if (!stored) return defaultCfg;
    return {
      phoneRequiredEventHours:
        typeof stored.phoneRequiredEventHours === 'number'
          ? stored.phoneRequiredEventHours
          : defaultCfg.phoneRequiredEventHours,
      phoneRequiredAmountUsd:
        typeof stored.phoneRequiredAmountUsd === 'number'
          ? stored.phoneRequiredAmountUsd
          : defaultCfg.phoneRequiredAmountUsd,
      phoneRequiredQtyTickets:
        typeof stored.phoneRequiredQtyTickets === 'number'
          ? stored.phoneRequiredQtyTickets
          : defaultCfg.phoneRequiredQtyTickets,
      newAccountDays:
        typeof stored.newAccountDays === 'number'
          ? stored.newAccountDays
          : defaultCfg.newAccountDays,
      dniRequiredEventHours:
        typeof stored.dniRequiredEventHours === 'number'
          ? stored.dniRequiredEventHours
          : defaultCfg.dniRequiredEventHours,
      dniRequiredAmountUsd:
        typeof stored.dniRequiredAmountUsd === 'number'
          ? stored.dniRequiredAmountUsd
          : defaultCfg.dniRequiredAmountUsd,
      dniRequiredQtyTickets:
        typeof stored.dniRequiredQtyTickets === 'number'
          ? stored.dniRequiredQtyTickets
          : defaultCfg.dniRequiredQtyTickets,
      dniNewAccountDays:
        typeof stored.dniNewAccountDays === 'number'
          ? stored.dniNewAccountDays
          : defaultCfg.dniNewAccountDays,
    };
  }

  private mergeSellerConfig(
    defaultCfg: RiskEngineSellerConfig,
    stored?: Partial<RiskEngineSellerConfig>,
  ): RiskEngineSellerConfig {
    if (!stored) return defaultCfg;
    const amount = stored.unverifiedSellerMaxAmount;
    return {
      unverifiedSellerMaxSales:
        typeof stored.unverifiedSellerMaxSales === 'number'
          ? stored.unverifiedSellerMaxSales
          : defaultCfg.unverifiedSellerMaxSales,
      unverifiedSellerMaxAmount:
        amount &&
        typeof amount.amount === 'number' &&
        typeof amount.currency === 'string'
          ? { amount: amount.amount, currency: amount.currency as 'USD' | 'EUR' | 'GBP' | 'ARS' }
          : defaultCfg.unverifiedSellerMaxAmount,
      payoutHoldHoursDefault:
        typeof stored.payoutHoldHoursDefault === 'number'
          ? stored.payoutHoldHoursDefault
          : defaultCfg.payoutHoldHoursDefault,
      payoutHoldHoursUnverified:
        typeof stored.payoutHoldHoursUnverified === 'number'
          ? stored.payoutHoldHoursUnverified
          : defaultCfg.payoutHoldHoursUnverified,
    };
  }

  private mergeClaimTypeWindow(
    defaultCfg: { minimumClaimHours: number; maximumClaimHours: number },
    stored?: { minimumClaimHours?: number; maximumClaimHours?: number },
  ): { minimumClaimHours: number; maximumClaimHours: number } {
    if (!stored) return defaultCfg;
    return {
      minimumClaimHours:
        typeof stored.minimumClaimHours === 'number'
          ? stored.minimumClaimHours
          : defaultCfg.minimumClaimHours,
      maximumClaimHours:
        typeof stored.maximumClaimHours === 'number'
          ? stored.maximumClaimHours
          : defaultCfg.maximumClaimHours,
    };
  }

  private mergeClaimsConfig(
    defaultCfg: RiskEngineClaimsConfig,
    stored?: Partial<RiskEngineClaimsConfig>,
  ): RiskEngineClaimsConfig {
    if (!stored) return defaultCfg;
    const tnr = stored.ticketNotReceived;
    const tdw = stored.ticketDidntWork;
    return {
      ticketNotReceived: this.mergeClaimTypeWindow(
        defaultCfg.ticketNotReceived,
        tnr && typeof tnr === 'object' ? tnr : undefined,
      ),
      ticketDidntWork: this.mergeClaimTypeWindow(
        defaultCfg.ticketDidntWork,
        tdw && typeof tdw === 'object' ? tdw : undefined,
      ),
    };
  }

  private getDefaultExchangeRates(): PlatformConfig['exchangeRates'] {
    return { usdToArs: 1000 };
  }

  private mergeWithVerificationDefaults(
    base: Omit<PlatformConfig, 'riskEngine' | 'exchangeRates'>,
    riskEngine: RiskEngineConfig,
  ): PlatformConfig {
    return {
      ...base,
      riskEngine,
      exchangeRates: this.getDefaultExchangeRates(),
    };
  }

  async upsertPlatformConfig(ctx: Ctx, config: PlatformConfig): Promise<PlatformConfig> {
    const client = this.getClient(ctx);
    const riskEngineJson = config.riskEngine as unknown as Prisma.InputJsonValue;
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
        riskEngine: riskEngineJson,
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
        riskEngine: riskEngineJson,
      },
    });
    const riskEngine = this.resolveRiskEngine(row.riskEngine);
    return this.mergeWithVerificationDefaults(
      {
        buyerPlatformFeePercentage: row.buyerPlatformFeePercentage,
        sellerPlatformFeePercentage: row.sellerPlatformFeePercentage,
        paymentTimeoutMinutes: row.paymentTimeoutMinutes,
        adminReviewTimeoutHours: row.adminReviewTimeoutHours,
        offerPendingExpirationMinutes: row.offerPendingExpirationMinutes,
        offerAcceptedExpirationMinutes: row.offerAcceptedExpirationMinutes,
        transactionChatPollIntervalSeconds: row.transactionChatPollIntervalSeconds,
        transactionChatMaxMessages: row.transactionChatMaxMessages,
      },
      riskEngine,
    );
  }
}
