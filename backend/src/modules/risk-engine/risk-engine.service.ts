import { Injectable, Inject } from '@nestjs/common';
import { PlatformConfigService } from '../config/config.service';
import { UsersService } from '../users/users.service';
import { VerificationHelper } from '../../common/utils/verification-helper';
import type { Ctx } from '../../common/types/context';
import type { User } from '../users/users.domain';
import type { PaymentMethodType } from '../payments/payments.domain';
import { RiskLevel, type RiskEvaluation } from './risk-engine.domain';
import { ConfigService as NestConfigService } from '@nestjs/config';

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
  /**
   * Payment method type when known (e.g. from PaymentMethodOption.type).
   * When 'manual_approval' (e.g. bank transfer), phone (V2) is required.
   * Callers with a selected method should pass this; BFF may omit it when method not selected yet.
   */
  paymentMethodType?: PaymentMethodType;
}

/** Full buyer risk config (phone + DNI thresholds). */
export type RiskEngineBuyerConfigInput = {
  phoneRequiredEventHours: number;
  phoneRequiredAmountUsd: number;
  phoneRequiredQtyTickets: number;
  newAccountDays: number;
  dniRequiredEventHours: number;
  dniRequiredAmountUsd: number;
  dniRequiredQtyTickets: number;
  dniNewAccountDays: number;
};

/**
 * Deterministic risk engine for checkout.
 * Returns whether V2 (phone) and/or V3 (DNI) are required in addition to V1 (email).
 * Same condition types for phone and DNI; DNI uses stricter thresholds (e.g. higher amount, fewer hours).
 */
@Injectable()
export class RiskEngineService {
  constructor(
    @Inject(PlatformConfigService)
    private readonly configService: PlatformConfigService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    private readonly nestConfigService: NestConfigService,
  ) {}

  /**
   * Evaluate checkout risk for a buyer. V1 is always required; V2/V3 when triggers fire.
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
      return this.requireV2AndV3Result(RiskLevel.HIGH);
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
   * Checks DNI conditions first (stricter thresholds); if any fire, requires V2+V3.
   * Then checks phone conditions; if any fire, requires V2 only.
   */
  evaluate(
    input: CheckoutRiskInput,
    buyerConfig?: RiskEngineBuyerConfigInput,
  ): RiskEvaluation {
    const cfg = buyerConfig ?? this.getConfig();
    const now = new Date();
    const eventHours = (input.eventStartsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    const accountAgeDays =
      (now.getTime() - input.buyerCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

    // --- DNI conditions (stricter thresholds): same types, require V2 + V3 ---
    if (eventHours >= 0 && eventHours <= cfg.dniRequiredEventHours) {
      return this.requireV2AndV3Result(RiskLevel.MED);
    }
    if (input.amountUsd >= cfg.dniRequiredAmountUsd) {
      return this.requireV2AndV3Result(RiskLevel.MED);
    }
    if (input.quantity >= cfg.dniRequiredQtyTickets) {
      return this.requireV2AndV3Result(RiskLevel.MED);
    }
    if (accountAgeDays < cfg.dniNewAccountDays) {
      return this.requireV2AndV3Result(RiskLevel.MED);
    }

    // --- Phone-only conditions: require V2 ---
    // Manual approval (e.g. bank transfer) is higher risk; require phone verification.
    if (input.paymentMethodType === 'manual_approval') {
      return this.requireV2OnlyResult(RiskLevel.MED);
    }
    if (eventHours >= 0 && eventHours <= cfg.phoneRequiredEventHours) {
      return this.requireV2OnlyResult(RiskLevel.MED);
    }
    if (input.amountUsd >= cfg.phoneRequiredAmountUsd) {
      return this.requireV2OnlyResult(RiskLevel.MED);
    }
    if (input.quantity >= cfg.phoneRequiredQtyTickets) {
      return this.requireV2OnlyResult(RiskLevel.MED);
    }
    if (accountAgeDays < cfg.newAccountDays) {
      return this.requireV2OnlyResult(RiskLevel.MED);
    }
    if (!VerificationHelper.hasV3(input.seller)) {
      return this.requireV2OnlyResult(RiskLevel.MED);
    }

    return {
      riskLevel: RiskLevel.LOW,
      requireV1: true,
      requireV2: false,
      requireV3: false,
    };
  }

  private requireV2OnlyResult(level: RiskLevel): RiskEvaluation {
    return {
      riskLevel: level,
      requireV1: true,
      requireV2: true,
      requireV3: false,
    };
  }

  private requireV2AndV3Result(level: RiskLevel): RiskEvaluation {
    return {
      riskLevel: level,
      requireV1: true,
      requireV2: true,
      requireV3: true,
    };
  }

  private getConfig(): RiskEngineBuyerConfigInput {
    const get = (path: string) => this.nestConfigService.get<number>(path)!;
    return {
      phoneRequiredEventHours: get('platform.riskEngine.buyer.phoneRequiredEventHours'),
      phoneRequiredAmountUsd: get('platform.riskEngine.buyer.phoneRequiredAmountUsd'),
      phoneRequiredQtyTickets: get('platform.riskEngine.buyer.phoneRequiredQtyTickets'),
      newAccountDays: get('platform.riskEngine.buyer.newAccountDays'),
      dniRequiredEventHours: get('platform.riskEngine.buyer.dniRequiredEventHours'),
      dniRequiredAmountUsd: get('platform.riskEngine.buyer.dniRequiredAmountUsd'),
      dniRequiredQtyTickets: get('platform.riskEngine.buyer.dniRequiredQtyTickets'),
      dniNewAccountDays: get('platform.riskEngine.buyer.dniNewAccountDays'),
    };
  }
}
