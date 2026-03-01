import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { PricingSnapshot as PrismaPricingSnapshot } from '@prisma/client';
import type { Ctx } from '../../../common/types/context';
import type {
  PricingSnapshot,
  PricingModelType,
  PaymentMethodCommissionSnapshot,
  BestOfferConfig,
} from './pricing.domain';
import type { Money } from '../payments.domain';
import type { IPricingRepository } from './pricing.repository.interface';

@Injectable()
export class PricingRepository implements IPricingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(_ctx: Ctx, snapshot: PricingSnapshot): Promise<PricingSnapshot> {
    const prismaSnapshot = await this.prisma.pricingSnapshot.create({
      data: {
        id: snapshot.id,
        listingId: snapshot.listingId,
        pricePerTicket: snapshot.pricePerTicket as unknown as Prisma.InputJsonValue,
        buyerPlatformFeePercentage: snapshot.buyerPlatformFeePercentage,
        sellerPlatformFeePercentage: snapshot.sellerPlatformFeePercentage,
        paymentMethodCommissions:
          snapshot.paymentMethodCommissions as unknown as Prisma.InputJsonValue,
        pricingModel: snapshot.pricingModel,
        bestOfferConfig: snapshot.bestOfferConfig
          ? (snapshot.bestOfferConfig as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        expiresAt: snapshot.expiresAt,
        consumedAt: snapshot.consumedAt ?? null,
        consumedByTransactionId: snapshot.consumedByTransactionId ?? null,
        selectedPaymentMethodId: snapshot.selectedPaymentMethodId ?? null,
        createdAt: snapshot.createdAt,
      },
    });
    return this.mapToDomain(prismaSnapshot);
  }

  async findById(_ctx: Ctx, id: string): Promise<PricingSnapshot | undefined> {
    const snapshot = await this.prisma.pricingSnapshot.findUnique({
      where: { id },
    });
    return snapshot ? this.mapToDomain(snapshot) : undefined;
  }

  async update(
    _ctx: Ctx,
    id: string,
    updates: Partial<PricingSnapshot>,
  ): Promise<PricingSnapshot | undefined> {
    const existing = await this.prisma.pricingSnapshot.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const data: Prisma.PricingSnapshotUpdateInput = {};

    if (updates.listingId !== undefined) {
      data.listingId = updates.listingId;
    }
    if (updates.pricePerTicket !== undefined) {
      data.pricePerTicket = updates.pricePerTicket as unknown as Prisma.InputJsonValue;
    }
    if (updates.buyerPlatformFeePercentage !== undefined) {
      data.buyerPlatformFeePercentage = updates.buyerPlatformFeePercentage;
    }
    if (updates.sellerPlatformFeePercentage !== undefined) {
      data.sellerPlatformFeePercentage = updates.sellerPlatformFeePercentage;
    }
    if (updates.paymentMethodCommissions !== undefined) {
      data.paymentMethodCommissions =
        updates.paymentMethodCommissions as unknown as Prisma.InputJsonValue;
    }
    if (updates.pricingModel !== undefined) {
      data.pricingModel = updates.pricingModel;
    }
    if (updates.bestOfferConfig !== undefined) {
      data.bestOfferConfig = updates.bestOfferConfig
        ? (updates.bestOfferConfig as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    }
    if (updates.expiresAt !== undefined) {
      data.expiresAt = updates.expiresAt;
    }
    if (updates.consumedAt !== undefined) {
      data.consumedAt = updates.consumedAt;
    }
    if (updates.consumedByTransactionId !== undefined) {
      data.consumedByTransactionId = updates.consumedByTransactionId;
    }
    if (updates.selectedPaymentMethodId !== undefined) {
      data.selectedPaymentMethodId = updates.selectedPaymentMethodId;
    }

    const updated = await this.prisma.pricingSnapshot.update({
      where: { id },
      data,
    });

    return this.mapToDomain(updated);
  }

  async deleteExpired(_ctx: Ctx): Promise<number> {
    const now = new Date();

    const result = await this.prisma.pricingSnapshot.deleteMany({
      where: {
        expiresAt: { lt: now },
        consumedByTransactionId: null,
      },
    });

    return result.count;
  }

  private mapToDomain(prisma: PrismaPricingSnapshot): PricingSnapshot {
    return {
      id: prisma.id,
      listingId: prisma.listingId,
      pricePerTicket: prisma.pricePerTicket as unknown as Money,
      buyerPlatformFeePercentage: prisma.buyerPlatformFeePercentage,
      sellerPlatformFeePercentage: prisma.sellerPlatformFeePercentage,
      paymentMethodCommissions:
        prisma.paymentMethodCommissions as unknown as PaymentMethodCommissionSnapshot[],
      pricingModel: prisma.pricingModel as PricingModelType,
      bestOfferConfig: prisma.bestOfferConfig
        ? (prisma.bestOfferConfig as unknown as BestOfferConfig)
        : undefined,
      createdAt: prisma.createdAt,
      expiresAt: prisma.expiresAt,
      consumedAt: prisma.consumedAt ?? undefined,
      consumedByTransactionId: prisma.consumedByTransactionId ?? undefined,
      selectedPaymentMethodId: prisma.selectedPaymentMethodId ?? undefined,
    };
  }
}
