import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
  CONFIG_REPOSITORY,
  type IConfigRepository,
} from './config.repository.interface';
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
  async getPlatformConfigForAdmin(
    ctx: Ctx,
  ): Promise<GetPlatformConfigResponse> {
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
      paymentTimeoutMinutes:
        body.paymentTimeoutMinutes ?? current.paymentTimeoutMinutes,
      adminReviewTimeoutHours:
        body.adminReviewTimeoutHours ?? current.adminReviewTimeoutHours,
      offerPendingExpirationMinutes:
        body.offerPendingExpirationMinutes ??
        current.offerPendingExpirationMinutes,
      offerAcceptedExpirationMinutes:
        body.offerAcceptedExpirationMinutes ??
        current.offerAcceptedExpirationMinutes,
      transactionChatPollIntervalSeconds:
        body.transactionChatPollIntervalSeconds ??
        current.transactionChatPollIntervalSeconds,
      transactionChatMaxMessages:
        body.transactionChatMaxMessages ?? current.transactionChatMaxMessages,
      minimumHoursToBuyTickets:
        body.minimumHoursToBuyTickets ?? current.minimumHoursToBuyTickets,
      riskEngine: body.riskEngine
        ? {
            buyer: body.riskEngine.buyer
              ? {
                  ...current.riskEngine.buyer,
                  ...body.riskEngine.buyer,
                  phoneRequiredAmount:
                    body.riskEngine.buyer.phoneRequiredAmount ??
                    current.riskEngine.buyer.phoneRequiredAmount,
                  dniRequiredAmount:
                    body.riskEngine.buyer.dniRequiredAmount ??
                    current.riskEngine.buyer.dniRequiredAmount,
                  phoneRequiredPaymentMethodTypes:
                    body.riskEngine.buyer.phoneRequiredPaymentMethodTypes ??
                    current.riskEngine.buyer.phoneRequiredPaymentMethodTypes,
                  dniRequiredPaymentMethodTypes:
                    body.riskEngine.buyer.dniRequiredPaymentMethodTypes ??
                    current.riskEngine.buyer.dniRequiredPaymentMethodTypes,
                }
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
              ? {
                  ticketNotReceived: {
                    ...current.riskEngine.claims.ticketNotReceived,
                    ...body.riskEngine.claims.ticketNotReceived,
                  },
                  ticketDidntWork: {
                    ...current.riskEngine.claims.ticketDidntWork,
                    ...body.riskEngine.claims.ticketDidntWork,
                  },
                }
              : current.riskEngine.claims,
          }
        : current.riskEngine,
      exchangeRates: body.exchangeRates
        ? { ...current.exchangeRates, ...body.exchangeRates }
        : current.exchangeRates,
    };
    this.validatePlatformConfig(merged);
    const updated = await this.configRepository.upsertPlatformConfig(
      ctx,
      merged,
    );
    this.logger.log(ctx, 'Updated platform config');
    return updated;
  }

  private getDefaultsFromHocon(): PlatformConfig {
    const get = (path: string) => this.nestConfigService.get<number>(path)!;
    const getPaymentTypes = (
      path: string,
      fallback: PlatformConfig['riskEngine']['buyer']['phoneRequiredPaymentMethodTypes'],
    ): PlatformConfig['riskEngine']['buyer']['phoneRequiredPaymentMethodTypes'] => {
      const val = this.nestConfigService.get<unknown>(path);
      if (
        Array.isArray(val) &&
        val.every((x) => x === 'payment_gateway' || x === 'manual_approval')
      ) {
        return val as PlatformConfig['riskEngine']['buyer']['phoneRequiredPaymentMethodTypes'];
      }
      return fallback;
    };
    const amountUsd = get(
      'platform.riskEngine.seller.unverifiedSellerMaxAmountUsd',
    );
    const phoneUsd = get('platform.riskEngine.buyer.phoneRequiredAmountUsd');
    const dniUsd = get('platform.riskEngine.buyer.dniRequiredAmountUsd');
    const riskEngine = {
      buyer: {
        phoneRequiredEventHours: get(
          'platform.riskEngine.buyer.phoneRequiredEventHours',
        ),
        phoneRequiredAmount: {
          amount: Math.round(phoneUsd * 100),
          currency: 'USD' as const,
        },
        phoneRequiredQtyTickets: get(
          'platform.riskEngine.buyer.phoneRequiredQtyTickets',
        ),
        newAccountDays: get('platform.riskEngine.buyer.newAccountDays'),
        phoneRequiredPaymentMethodTypes: getPaymentTypes(
          'platform.riskEngine.buyer.phoneRequiredPaymentMethodTypes',
          ['manual_approval'],
        ),
        dniRequiredEventHours: get(
          'platform.riskEngine.buyer.dniRequiredEventHours',
        ),
        dniRequiredAmount: {
          amount: Math.round(dniUsd * 100),
          currency: 'USD' as const,
        },
        dniRequiredQtyTickets: get(
          'platform.riskEngine.buyer.dniRequiredQtyTickets',
        ),
        dniNewAccountDays: get('platform.riskEngine.buyer.dniNewAccountDays'),
        dniRequiredPaymentMethodTypes: getPaymentTypes(
          'platform.riskEngine.buyer.dniRequiredPaymentMethodTypes',
          [],
        ),
      },
      seller: {
        unverifiedSellerMaxSales: get(
          'platform.riskEngine.seller.unverifiedSellerMaxSales',
        ),
        unverifiedSellerMaxAmount: {
          amount: Math.round(amountUsd * 100),
          currency: 'USD' as const,
        },
        payoutHoldHoursDefault: get(
          'platform.riskEngine.seller.payoutHoldHoursDefault',
        ),
        payoutHoldHoursUnverified: get(
          'platform.riskEngine.seller.payoutHoldHoursUnverified',
        ),
      },
      claims: {
        ticketNotReceived: {
          minimumClaimHours: get(
            'platform.riskEngine.claims.ticketNotReceived.minimumClaimHours',
          ),
          maximumClaimHours: get(
            'platform.riskEngine.claims.ticketNotReceived.maximumClaimHours',
          ),
        },
        ticketDidntWork: {
          minimumClaimHours: get(
            'platform.riskEngine.claims.ticketDidntWork.minimumClaimHours',
          ),
          maximumClaimHours: get(
            'platform.riskEngine.claims.ticketDidntWork.maximumClaimHours',
          ),
        },
      },
    };
    return {
      buyerPlatformFeePercentage: this.nestConfigService.get<number>(
        'platform.buyerPlatformFeePercentage',
      )!,
      sellerPlatformFeePercentage: this.nestConfigService.get<number>(
        'platform.sellerPlatformFeePercentage',
      )!,
      paymentTimeoutMinutes: this.nestConfigService.get<number>(
        'platform.paymentTimeoutMinutes',
      )!,
      adminReviewTimeoutHours: this.nestConfigService.get<number>(
        'platform.adminReviewTimeoutHours',
      )!,
      offerPendingExpirationMinutes: this.nestConfigService.get<number>(
        'platform.offerPendingExpirationMinutes',
      )!,
      offerAcceptedExpirationMinutes: this.nestConfigService.get<number>(
        'platform.offerAcceptedExpirationMinutes',
      )!,
      transactionChatPollIntervalSeconds: this.nestConfigService.get<number>(
        'platform.transactionChatPollIntervalSeconds',
      )!,
      transactionChatMaxMessages: this.nestConfigService.get<number>(
        'platform.transactionChatMaxMessages',
      )!,
      minimumHoursToBuyTickets: 0,
      riskEngine,
      exchangeRates: {
        usdToArs: this.nestConfigService.get<number>(
          'platform.exchangeRates.usdToArs',
        )!,
      },
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
      config.transactionChatPollIntervalSeconds <
        MIN_CHAT_POLL_INTERVAL_SECONDS ||
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
    if (
      !Number.isInteger(config.minimumHoursToBuyTickets) ||
      config.minimumHoursToBuyTickets < 0 ||
      config.minimumHoursToBuyTickets > 168
    ) {
      throw new BadRequestException(
        'minimumHoursToBuyTickets must be an integer between 0 and 168',
      );
    }
    const re = config.riskEngine;
    const b = re.buyer;
    if (b.phoneRequiredEventHours < 1 || b.phoneRequiredEventHours > 720) {
      throw new BadRequestException(
        'riskEngine.buyer.phoneRequiredEventHours must be between 1 and 720',
      );
    }
    if (
      b.phoneRequiredAmount.currency !== 'USD' &&
      b.phoneRequiredAmount.currency !== 'ARS'
    ) {
      throw new BadRequestException(
        'riskEngine.buyer.phoneRequiredAmount.currency must be USD or ARS',
      );
    }
    const phoneAmountMajor = b.phoneRequiredAmount.amount / 100;
    if (phoneAmountMajor < 0 || phoneAmountMajor > 100000) {
      throw new BadRequestException(
        'riskEngine.buyer.phoneRequiredAmount must be between 0 and 100000 (in major units)',
      );
    }
    if (b.phoneRequiredQtyTickets < 1 || b.phoneRequiredQtyTickets > 50) {
      throw new BadRequestException(
        'riskEngine.buyer.phoneRequiredQtyTickets must be between 1 and 50',
      );
    }
    if (b.newAccountDays < 0 || b.newAccountDays > 365) {
      throw new BadRequestException(
        'riskEngine.buyer.newAccountDays must be between 0 and 365',
      );
    }
    const validPaymentTypes = (arr: unknown): boolean =>
      Array.isArray(arr) &&
      arr.every((x) => x === 'payment_gateway' || x === 'manual_approval');
    if (!validPaymentTypes(b.phoneRequiredPaymentMethodTypes)) {
      throw new BadRequestException(
        'riskEngine.buyer.phoneRequiredPaymentMethodTypes must be an array of "payment_gateway" and/or "manual_approval"',
      );
    }
    if (!validPaymentTypes(b.dniRequiredPaymentMethodTypes)) {
      throw new BadRequestException(
        'riskEngine.buyer.dniRequiredPaymentMethodTypes must be an array of "payment_gateway" and/or "manual_approval"',
      );
    }
    if (b.dniRequiredEventHours < 1 || b.dniRequiredEventHours > 720) {
      throw new BadRequestException(
        'riskEngine.buyer.dniRequiredEventHours must be between 1 and 720',
      );
    }
    if (
      b.dniRequiredAmount.currency !== 'USD' &&
      b.dniRequiredAmount.currency !== 'ARS'
    ) {
      throw new BadRequestException(
        'riskEngine.buyer.dniRequiredAmount.currency must be USD or ARS',
      );
    }
    const dniAmountMajor = b.dniRequiredAmount.amount / 100;
    if (dniAmountMajor < 0 || dniAmountMajor > 100000) {
      throw new BadRequestException(
        'riskEngine.buyer.dniRequiredAmount must be between 0 and 100000 (in major units)',
      );
    }
    if (b.dniNewAccountDays < 0 || b.dniNewAccountDays > 365) {
      throw new BadRequestException(
        'riskEngine.buyer.dniNewAccountDays must be between 0 and 365',
      );
    }
    const s = re.seller;
    if (s.unverifiedSellerMaxSales < 0 || s.unverifiedSellerMaxSales > 100) {
      throw new BadRequestException(
        'riskEngine.seller.unverifiedSellerMaxSales must be between 0 and 100',
      );
    }
    const maxAmountMajor = s.unverifiedSellerMaxAmount.amount / 100;
    if (maxAmountMajor < 0 || maxAmountMajor > 100000) {
      throw new BadRequestException(
        'riskEngine.seller.unverifiedSellerMaxAmount must be between 0 and 100000 (in major units)',
      );
    }
    if (s.payoutHoldHoursDefault < 0 || s.payoutHoldHoursDefault > 168) {
      throw new BadRequestException(
        'riskEngine.seller.payoutHoldHoursDefault must be between 0 and 168',
      );
    }
    if (s.payoutHoldHoursUnverified < 0 || s.payoutHoldHoursUnverified > 168) {
      throw new BadRequestException(
        'riskEngine.seller.payoutHoldHoursUnverified must be between 0 and 168',
      );
    }
    const validateClaimWindow = (
      window: { minimumClaimHours: number; maximumClaimHours: number },
      prefix: string,
    ) => {
      if (window.minimumClaimHours < 0 || window.minimumClaimHours > 720) {
        throw new BadRequestException(
          `${prefix}.minimumClaimHours must be between 0 and 720`,
        );
      }
      if (window.maximumClaimHours < 1 || window.maximumClaimHours > 720) {
        throw new BadRequestException(
          `${prefix}.maximumClaimHours must be between 1 and 720`,
        );
      }
      if (window.minimumClaimHours >= window.maximumClaimHours) {
        throw new BadRequestException(
          `${prefix}.minimumClaimHours must be less than maximumClaimHours`,
        );
      }
    };
    validateClaimWindow(
      re.claims.ticketNotReceived,
      'riskEngine.claims.ticketNotReceived',
    );
    validateClaimWindow(
      re.claims.ticketDidntWork,
      'riskEngine.claims.ticketDidntWork',
    );
    const er = config.exchangeRates;
    if (er.usdToArs <= 0 || er.usdToArs > 1000000) {
      throw new BadRequestException(
        'exchangeRates.usdToArs must be between 1 and 1000000',
      );
    }
  }
}
