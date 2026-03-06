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
const MIN_OFFER_EXPIRATION_MINUTES = 1;
const MAX_OFFER_EXPIRATION_MINUTES = 10080; // 7 days
const MIN_CHAT_POLL_INTERVAL_SECONDS = 5;
const MAX_CHAT_POLL_INTERVAL_SECONDS = 120;
const MIN_CHAT_MAX_MESSAGES = 10;
const MAX_CHAT_MAX_MESSAGES = 500;

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
      ...current,
      buyerPlatformFeePercentage:
        body.buyerPlatformFeePercentage ?? current.buyerPlatformFeePercentage,
      sellerPlatformFeePercentage:
        body.sellerPlatformFeePercentage ?? current.sellerPlatformFeePercentage,
      paymentTimeoutMinutes: body.paymentTimeoutMinutes ?? current.paymentTimeoutMinutes,
      adminReviewTimeoutHours:
        body.adminReviewTimeoutHours ?? current.adminReviewTimeoutHours,
      offerPendingExpirationMinutes:
        body.offerPendingExpirationMinutes ?? current.offerPendingExpirationMinutes,
      offerAcceptedExpirationMinutes:
        body.offerAcceptedExpirationMinutes ?? current.offerAcceptedExpirationMinutes,
      transactionChatPollIntervalSeconds:
        body.transactionChatPollIntervalSeconds ?? current.transactionChatPollIntervalSeconds,
      transactionChatMaxMessages:
        body.transactionChatMaxMessages ?? current.transactionChatMaxMessages,
      riskEngine: body.riskEngine
        ? {
            buyer: body.riskEngine.buyer
              ? { ...current.riskEngine.buyer, ...body.riskEngine.buyer }
              : current.riskEngine.buyer,
            seller: body.riskEngine.seller
              ? {
                  ...current.riskEngine.seller,
                  ...body.riskEngine.seller,
                  unverifiedSellerMaxAmount:
                    body.riskEngine.seller.unverifiedSellerMaxAmount ??
                    current.riskEngine.seller.unverifiedSellerMaxAmount,
                }
              : current.riskEngine.seller,
            claims: body.riskEngine.claims
              ? { ...current.riskEngine.claims, ...body.riskEngine.claims }
              : current.riskEngine.claims,
          }
        : current.riskEngine,
      exchangeRates: body.exchangeRates
        ? { ...current.exchangeRates, ...body.exchangeRates }
        : current.exchangeRates,
    };
    this.validatePlatformConfig(merged);
    const updated = await this.configRepository.upsertPlatformConfig(ctx, merged);
    this.logger.log(ctx, 'Updated platform config');
    return updated;
  }

  private getDefaultsFromHocon(): PlatformConfig {
    const get = (path: string, def: number) =>
      this.nestConfigService.get<number>(path) ?? def;
    const riskEngine = {
      buyer: {
        phoneRequiredEventHours: get('platform.riskEngine.buyer.phoneRequiredEventHours', 72),
        phoneRequiredAmountUsd: get('platform.riskEngine.buyer.phoneRequiredAmountUsd', 120),
        phoneRequiredQtyTickets: get('platform.riskEngine.buyer.phoneRequiredQtyTickets', 2),
        newAccountDays: get('platform.riskEngine.buyer.newAccountDays', 7),
      },
      seller: {
        unverifiedSellerMaxSales: get('platform.riskEngine.seller.unverifiedSellerMaxSales', 2),
        unverifiedSellerMaxAmount: (() => {
          const amountUsd = get('platform.riskEngine.seller.unverifiedSellerMaxAmountUsd', 200);
          return { amount: Math.round(amountUsd * 100), currency: 'USD' as const };
        })(),
        payoutHoldHoursDefault: get('platform.riskEngine.seller.payoutHoldHoursDefault', 24),
        payoutHoldHoursUnverified: get('platform.riskEngine.seller.payoutHoldHoursUnverified', 48),
      },
      claims: {
        claimKycDeadlineHours: get('platform.riskEngine.claims.claimKycDeadlineHours', 24),
        claimInvalidEntryWindowHours: get('platform.riskEngine.claims.claimInvalidEntryWindowHours', 2),
      },
    };
    const exchangeRates = {
      usdToArs: this.nestConfigService.get<number>('platform.exchangeRates.usdToArs') ?? 1000,
    };
    return {
      buyerPlatformFeePercentage:
        this.nestConfigService.get<number>('platform.buyerPlatformFeePercentage') ?? 10,
      sellerPlatformFeePercentage:
        this.nestConfigService.get<number>('platform.sellerPlatformFeePercentage') ?? 5,
      paymentTimeoutMinutes:
        this.nestConfigService.get<number>('platform.paymentTimeoutMinutes') ?? 10,
      adminReviewTimeoutHours:
        this.nestConfigService.get<number>('platform.adminReviewTimeoutHours') ?? 24,
      offerPendingExpirationMinutes:
        this.nestConfigService.get<number>('platform.offerPendingExpirationMinutes') ?? 1440,
      offerAcceptedExpirationMinutes:
        this.nestConfigService.get<number>('platform.offerAcceptedExpirationMinutes') ?? 1440,
      transactionChatPollIntervalSeconds:
        this.nestConfigService.get<number>('platform.transactionChatPollIntervalSeconds') ?? 15,
      transactionChatMaxMessages:
        this.nestConfigService.get<number>('platform.transactionChatMaxMessages') ?? 100,
      riskEngine,
      exchangeRates,
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
    if (
      config.offerPendingExpirationMinutes < MIN_OFFER_EXPIRATION_MINUTES ||
      config.offerPendingExpirationMinutes > MAX_OFFER_EXPIRATION_MINUTES
    ) {
      throw new BadRequestException(
        `offerPendingExpirationMinutes must be between ${MIN_OFFER_EXPIRATION_MINUTES} and ${MAX_OFFER_EXPIRATION_MINUTES}`,
      );
    }
    if (
      config.offerAcceptedExpirationMinutes < MIN_OFFER_EXPIRATION_MINUTES ||
      config.offerAcceptedExpirationMinutes > MAX_OFFER_EXPIRATION_MINUTES
    ) {
      throw new BadRequestException(
        `offerAcceptedExpirationMinutes must be between ${MIN_OFFER_EXPIRATION_MINUTES} and ${MAX_OFFER_EXPIRATION_MINUTES}`,
      );
    }
    if (
      config.transactionChatPollIntervalSeconds < MIN_CHAT_POLL_INTERVAL_SECONDS ||
      config.transactionChatPollIntervalSeconds > MAX_CHAT_POLL_INTERVAL_SECONDS
    ) {
      throw new BadRequestException(
        `transactionChatPollIntervalSeconds must be between ${MIN_CHAT_POLL_INTERVAL_SECONDS} and ${MAX_CHAT_POLL_INTERVAL_SECONDS}`,
      );
    }
    if (
      config.transactionChatMaxMessages < MIN_CHAT_MAX_MESSAGES ||
      config.transactionChatMaxMessages > MAX_CHAT_MAX_MESSAGES
    ) {
      throw new BadRequestException(
        `transactionChatMaxMessages must be between ${MIN_CHAT_MAX_MESSAGES} and ${MAX_CHAT_MAX_MESSAGES}`,
      );
    }
    const re = config.riskEngine;
    const b = re.buyer;
    if (b.phoneRequiredEventHours < 1 || b.phoneRequiredEventHours > 720) {
      throw new BadRequestException('riskEngine.buyer.phoneRequiredEventHours must be between 1 and 720');
    }
    if (b.phoneRequiredAmountUsd < 0 || b.phoneRequiredAmountUsd > 10000) {
      throw new BadRequestException('riskEngine.buyer.phoneRequiredAmountUsd must be between 0 and 10000');
    }
    if (b.phoneRequiredQtyTickets < 1 || b.phoneRequiredQtyTickets > 50) {
      throw new BadRequestException('riskEngine.buyer.phoneRequiredQtyTickets must be between 1 and 50');
    }
    if (b.newAccountDays < 0 || b.newAccountDays > 365) {
      throw new BadRequestException('riskEngine.buyer.newAccountDays must be between 0 and 365');
    }
    const s = re.seller;
    if (s.unverifiedSellerMaxSales < 0 || s.unverifiedSellerMaxSales > 100) {
      throw new BadRequestException('riskEngine.seller.unverifiedSellerMaxSales must be between 0 and 100');
    }
    const maxAmountMajor = s.unverifiedSellerMaxAmount.amount / 100;
    if (maxAmountMajor < 0 || maxAmountMajor > 100000) {
      throw new BadRequestException(
        'riskEngine.seller.unverifiedSellerMaxAmount must be between 0 and 100000 (in major units)',
      );
    }
    if (s.payoutHoldHoursDefault < 0 || s.payoutHoldHoursDefault > 168) {
      throw new BadRequestException('riskEngine.seller.payoutHoldHoursDefault must be between 0 and 168');
    }
    if (s.payoutHoldHoursUnverified < 0 || s.payoutHoldHoursUnverified > 168) {
      throw new BadRequestException('riskEngine.seller.payoutHoldHoursUnverified must be between 0 and 168');
    }
    const c = re.claims;
    if (c.claimKycDeadlineHours < 1 || c.claimKycDeadlineHours > 72) {
      throw new BadRequestException('riskEngine.claims.claimKycDeadlineHours must be between 1 and 72');
    }
    if (c.claimInvalidEntryWindowHours < 0 || c.claimInvalidEntryWindowHours > 24) {
      throw new BadRequestException('riskEngine.claims.claimInvalidEntryWindowHours must be between 0 and 24');
    }
    const er = config.exchangeRates;
    if (er.usdToArs <= 0 || er.usdToArs > 1000000) {
      throw new BadRequestException('exchangeRates.usdToArs must be between 1 and 1000000');
    }
  }
}
