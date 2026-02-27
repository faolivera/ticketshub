import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PricingRepository } from './pricing.repository';
import { ConfigService } from '../../config/config.service';
import { PaymentMethodsService } from '../payment-methods.service';
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
    @Inject(PricingRepository)
    private readonly repository: PricingRepository,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
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

    const buyerPlatformFeePercentage = this.configService.getBuyerPlatformFeePercentage();
    const sellerPlatformFeePercentage = this.configService.getSellerPlatformFeePercentage();

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

    if (snapshot.consumedByTransactionId) {
      throw new BadRequestException({
        code: PricingSnapshotError.ALREADY_CONSUMED,
        message: 'Pricing snapshot has already been used. Please refresh to get current prices.',
      });
    }

    const now = new Date();
    const expiresAt = new Date(snapshot.expiresAt);
    if (expiresAt < now) {
      throw new BadRequestException({
        code: PricingSnapshotError.EXPIRED,
        message: 'Pricing snapshot has expired. Please refresh to get current prices.',
      });
    }

    if (snapshot.listingId !== listingId) {
      throw new BadRequestException({
        code: PricingSnapshotError.LISTING_MISMATCH,
        message: 'Pricing snapshot does not match this listing. Please refresh to get current prices.',
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

    await this.repository.update(ctx, snapshotId, {
      consumedAt: now,
      consumedByTransactionId: transactionId,
      selectedPaymentMethodId: paymentMethodId,
    });

    this.logger.log(
      ctx,
      `Consumed snapshot ${snapshotId} for transaction ${transactionId}`,
    );

    return {
      snapshot,
      selectedCommissionPercent: paymentMethodSnapshot.commissionPercent ?? 0,
    };
  }

  async findById(ctx: Ctx, id: string): Promise<PricingSnapshot | undefined> {
    return await this.repository.findById(ctx, id);
  }
}
