import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../common/repositories/base.repository';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import type { PricingSnapshot as PrismaPricingSnapshot } from '@prisma/client';
import type { Ctx } from '../../../common/types/context';
import type {
  PricingSnapshot,
  PaymentMethodCommissionSnapshot,
} from './pricing.domain';
import type { Money } from '../payments.domain';
import type { IPricingRepository } from './pricing.repository.interface';

@Injectable()
export class PricingRepository extends BaseRepository implements IPricingRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(ctx: Ctx, snapshot: PricingSnapshot): Promise<PricingSnapshot> {
    const client = this.getClient(ctx);
    const prismaSnapshot = await client.pricingSnapshot.create({
      data: {
        id: snapshot.id,
        listingId: snapshot.listingId,
        pricePerTicket: snapshot.pricePerTicket as unknown as Prisma.InputJsonValue,
        buyerPlatformFeePercentage: snapshot.buyerPlatformFeePercentage,
        sellerPlatformFeePercentage: snapshot.sellerPlatformFeePercentage,
        paymentMethodCommissions:
          snapshot.paymentMethodCommissions as unknown as Prisma.InputJsonValue,
        expiresAt: snapshot.expiresAt,
        consumedAt: snapshot.consumedAt ?? null,
        consumedByTransactionId: snapshot.consumedByTransactionId ?? null,
        selectedPaymentMethodId: snapshot.selectedPaymentMethodId ?? null,
        createdAt: snapshot.createdAt,
      },
    });
    return this.mapToDomain(prismaSnapshot);
  }

  async findById(ctx: Ctx, id: string): Promise<PricingSnapshot | undefined> {
    const client = this.getClient(ctx);
    const snapshot = await client.pricingSnapshot.findUnique({
      where: { id },
    });
    return snapshot ? this.mapToDomain(snapshot) : undefined;
  }

  async update(
    ctx: Ctx,
    id: string,
    updates: Partial<PricingSnapshot>,
  ): Promise<PricingSnapshot | undefined> {
    const client = this.getClient(ctx);
    const existing = await client.pricingSnapshot.findUnique({
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

    const updated = await client.pricingSnapshot.update({
      where: { id },
      data,
    });

    return this.mapToDomain(updated);
  }

  async deleteExpired(ctx: Ctx): Promise<number> {
    const client = this.getClient(ctx);
    const now = new Date();

    const result = await client.pricingSnapshot.deleteMany({
      where: {
        expiresAt: { lt: now },
        consumedByTransactionId: null,
      },
    });

    return result.count;
  }

  async consumeAtomic(
    ctx: Ctx,
    snapshotId: string,
    listingId: string,
    transactionId: string,
    selectedPaymentMethodId: string,
  ): Promise<PricingSnapshot | undefined> {
    const client = this.getClient(ctx);
    const now = new Date();

    const result = await client.pricingSnapshot.updateMany({
      where: {
        id: snapshotId,
        listingId: listingId,
        consumedByTransactionId: null,
        expiresAt: { gt: now },
      },
      data: {
        consumedAt: now,
        consumedByTransactionId: transactionId,
        selectedPaymentMethodId: selectedPaymentMethodId,
      },
    });

    if (result.count === 0) {
      return undefined;
    }

    return await this.findById(ctx, snapshotId);
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
      createdAt: prisma.createdAt,
      expiresAt: prisma.expiresAt,
      consumedAt: prisma.consumedAt ?? undefined,
      consumedByTransactionId: prisma.consumedByTransactionId ?? undefined,
      selectedPaymentMethodId: prisma.selectedPaymentMethodId ?? undefined,
    };
  }
}
