import { Injectable, Inject } from '@nestjs/common';
import { PlatformConfigService } from '../config/config.service';
import { UsersService } from '../users/users.service';
import { VerificationHelper } from '../../common/utils/verification-helper';
import type { Ctx } from '../../common/types/context';
import type { User } from '../users/users.domain';
import { RiskLevel, type RiskEvaluation } from './risk-engine.domain';

export interface CheckoutRiskInput {
  /** Listing quantity (tickets). */
  quantity: number;
  /** Total amount in listing currency (for threshold we use USD equivalent or amount as number). */
  amountUsd: number;
  /** Event start date (for proximity trigger). */
  eventStartsAt: Date;
  /** Buyer account creation date (for new-account trigger). */
  buyerCreatedAt: Date;
  /** Seller user (for seller trust / tier). */
  seller: User;
  /** Payment method id (e.g. mercadopago, bank_transfer). */
  paymentMethodId: string;
}

/**
 * Deterministic risk engine for checkout.
 * Returns whether V2 (phone) is required in addition to V1 (email).
 */
@Injectable()
export class RiskEngineService {
  constructor(
    @Inject(PlatformConfigService)
    private readonly configService: PlatformConfigService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  /**
   * Evaluate checkout risk for a buyer. V1 is always required; V2 is required when triggers fire.
   */
  async evaluateCheckoutRisk(
    ctx: Ctx,
    buyerId: string,
    input: Omit<CheckoutRiskInput, 'buyerCreatedAt' | 'seller'> & {
      buyerCreatedAt?: Date;
      sellerId: string;
    },
  ): Promise<RiskEvaluation> {
    const [buyer, seller, config] = await Promise.all([
      this.usersService.findById(ctx, buyerId),
      this.usersService.findById(ctx, input.sellerId),
      this.configService.getPlatformConfig(ctx),
    ]);
    if (!buyer) {
      return this.requireV2Result(RiskLevel.HIGH);
    }
    const buyerCreatedAt = input.buyerCreatedAt ?? buyer.createdAt;
    const fullInput: CheckoutRiskInput = {
      ...input,
      buyerCreatedAt,
      seller: seller!,
    };
    return this.evaluate(fullInput, config?.riskEngine?.buyer);
  }

  /**
   * Evaluate from already-loaded buyer and seller (e.g. when BFF already has them).
   */
  evaluate(
    input: CheckoutRiskInput,
    buyerConfig?: {
      phoneRequiredEventHours: number;
      phoneRequiredAmountUsd: number;
      phoneRequiredQtyTickets: number;
      newAccountDays: number;
    },
  ): RiskEvaluation {
    const cfg = buyerConfig ?? this.getConfig();
    const now = new Date();

    // Bank transfer: always require V1+V2
    if (input.paymentMethodId?.toLowerCase().includes('bank_transfer') ||
        input.paymentMethodId?.toLowerCase().includes('transfer')) {
      return this.requireV2Result(RiskLevel.MED);
    }

    // Event proximity: event within N hours
    const eventHours = (input.eventStartsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (eventHours >= 0 && eventHours <= cfg.phoneRequiredEventHours) {
      return this.requireV2Result(RiskLevel.MED);
    }

    // Amount above threshold (USD)
    if (input.amountUsd >= cfg.phoneRequiredAmountUsd) {
      return this.requireV2Result(RiskLevel.MED);
    }

    // Quantity above threshold
    if (input.quantity >= cfg.phoneRequiredQtyTickets) {
      return this.requireV2Result(RiskLevel.MED);
    }

    // New account: created within last N days
    const accountAgeDays =
      (now.getTime() - input.buyerCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (accountAgeDays < cfg.newAccountDays) {
      return this.requireV2Result(RiskLevel.MED);
    }

    // Seller not fully verified (no V3) — higher risk
    if (!VerificationHelper.hasV3(input.seller)) {
      return this.requireV2Result(RiskLevel.MED);
    }

    return {
      riskLevel: RiskLevel.LOW,
      requireV1: true,
      requireV2: false,
    };
  }

  private requireV2Result(level: RiskLevel): RiskEvaluation {
    return {
      riskLevel: level,
      requireV1: true,
      requireV2: true,
    };
  }

  private getConfig(): {
    phoneRequiredEventHours: number;
    phoneRequiredAmountUsd: number;
    phoneRequiredQtyTickets: number;
    newAccountDays: number;
  } {
    return {
      phoneRequiredEventHours: 72,
      phoneRequiredAmountUsd: 120,
      phoneRequiredQtyTickets: 2,
      newAccountDays: 7,
    };
  }
}
