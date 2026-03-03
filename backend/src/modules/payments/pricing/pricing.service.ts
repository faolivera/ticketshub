import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PRICING_REPOSITORY, type IPricingRepository } from './pricing.repository.interface';
import { PaymentMethodsService } from '../payment-methods.service';
import { PlatformConfigService } from '../../config/config.service';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';
import type { Money } from '../payments.domain';
import type {
  PricingSnapshot,
  PaymentMethodCommissionSnapshot,
  ConsumedSnapshotResult,
} from './pricing.domain';
import { PricingSnapshotError } from './pricing.domain';

const SNAPSHOT_EXPIRATION_MINUTES = 15;

@Injectable()
export class PricingService {
  private readonly logger = new ContextLogger(PricingService.name);

  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: IPricingRepository,
    @Inject(PlatformConfigService)
    private readonly platformConfigService: PlatformConfigService,
    @Inject(PaymentMethodsService)
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  private generateId(): string {
    return `ps_${Date.now()}_${randomBytes(6).toString('hex')}`;
  }

  async createSnapshot(
    ctx: Ctx,
    listingId: string,
    pricePerTicket: Money,
  ): Promise<PricingSnapshot> {
    this.logger.log(ctx, `Creating pricing snapshot for listing ${listingId}`);

    const platformConfig = await this.platformConfigService.getPlatformConfig(ctx);
    const { buyerPlatformFeePercentage, sellerPlatformFeePercentage } = platformConfig;

    const enabledPaymentMethods =
      await this.paymentMethodsService.findEnabled(ctx);

    const paymentMethodCommissions: PaymentMethodCommissionSnapshot[] =
      enabledPaymentMethods.map((pm) => ({
        paymentMethodId: pm.id,
        paymentMethodName: pm.publicName,
        commissionPercent: pm.buyerCommissionPercent,
      }));

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + SNAPSHOT_EXPIRATION_MINUTES * 60 * 1000,
    );

    const snapshot: PricingSnapshot = {
      id: this.generateId(),
      listingId,
      pricePerTicket,
      buyerPlatformFeePercentage,
      sellerPlatformFeePercentage,
      paymentMethodCommissions,
      pricingModel: 'fixed',
      createdAt: now,
      expiresAt,
    };

    await this.repository.create(ctx, snapshot);

    this.logger.log(
      ctx,
      `Created pricing snapshot ${snapshot.id} for listing ${listingId}, expires at ${expiresAt.toISOString()}`,
    );

    return snapshot;
  }

  async validateAndConsume(
    ctx: Ctx,
    snapshotId: string,
    listingId: string,
    paymentMethodId: string,
    transactionId: string,
  ): Promise<ConsumedSnapshotResult> {
    this.logger.log(ctx, `Validating and consuming snapshot ${snapshotId}`);

    const snapshot = await this.repository.findById(ctx, snapshotId);

    if (!snapshot) {
      throw new BadRequestException({
        code: PricingSnapshotError.NOT_FOUND,
        message: 'Pricing snapshot not found. Please refresh to get current prices.',
      });
    }

    const paymentMethodSnapshot = snapshot.paymentMethodCommissions.find(
      (pm) => pm.paymentMethodId === paymentMethodId,
    );

    if (!paymentMethodSnapshot) {
      throw new BadRequestException({
        code: PricingSnapshotError.PAYMENT_METHOD_NOT_AVAILABLE,
        message: 'Selected payment method is no longer available. Please refresh to get current prices.',
      });
    }

    const consumed = await this.repository.consumeAtomic(
      ctx,
      snapshotId,
      listingId,
      transactionId,
      paymentMethodId,
    );

    if (!consumed) {
      const current = await this.repository.findById(ctx, snapshotId);

      if (!current) {
        throw new BadRequestException({
          code: PricingSnapshotError.NOT_FOUND,
          message: 'Pricing snapshot not found. Please refresh to get current prices.',
        });
      }

      if (current.consumedByTransactionId) {
        throw new BadRequestException({
          code: PricingSnapshotError.ALREADY_CONSUMED,
          message: 'Pricing snapshot has already been used. Please refresh to get current prices.',
        });
      }

      const now = new Date();
      if (new Date(current.expiresAt) < now) {
        throw new BadRequestException({
          code: PricingSnapshotError.EXPIRED,
          message: 'Pricing snapshot has expired. Please refresh to get current prices.',
        });
      }

      if (current.listingId !== listingId) {
        throw new BadRequestException({
          code: PricingSnapshotError.LISTING_MISMATCH,
          message: 'Pricing snapshot does not match this listing. Please refresh to get current prices.',
        });
      }

      throw new BadRequestException({
        code: PricingSnapshotError.ALREADY_CONSUMED,
        message: 'Unable to use pricing snapshot. Please refresh to get current prices.',
      });
    }

    this.logger.log(
      ctx,
      `Consumed snapshot ${snapshotId} for transaction ${transactionId}`,
    );

    return {
      snapshot: consumed,
      selectedCommissionPercent: paymentMethodSnapshot.commissionPercent ?? 0,
    };
  }

  async findById(ctx: Ctx, id: string): Promise<PricingSnapshot | undefined> {
    return await this.repository.findById(ctx, id);
  }
}
