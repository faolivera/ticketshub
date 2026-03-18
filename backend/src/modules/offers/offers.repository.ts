import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import type { Offer as PrismaOffer } from '@prisma/client';
import { OfferStatus as PrismaOfferStatus } from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Offer, OfferStatus, OfferTickets } from './offers.domain';
import type { Money } from '../tickets/tickets.domain';
import type { IOffersRepository } from './offers.repository.interface';

@Injectable()
export class OffersRepository
  extends BaseRepository
  implements IOffersRepository
{
  private readonly logger = new ContextLogger(OffersRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private mapStatusToDb(status: OfferStatus): PrismaOfferStatus {
    return status as PrismaOfferStatus;
  }

  private mapStatusFromDb(status: PrismaOfferStatus): OfferStatus {
    return status as OfferStatus;
  }

  private serializeMoney(money: Money): object {
    return { amount: money.amount, currency: money.currency };
  }

  private deserializeMoney(json: unknown): Money {
    const data = json as { amount: number; currency: string };
    return {
      amount: data.amount,
      currency: data.currency as Money['currency'],
    };
  }

  private mapToDomain(record: PrismaOffer): Offer {
    return {
      id: record.id,
      listingId: record.listingId,
      userId: record.userId,
      offeredPrice: this.deserializeMoney(record.offeredPrice),
      status: this.mapStatusFromDb(record.status),
      tickets: record.tickets as OfferTickets,
      expiresAt: record.expiresAt,
      acceptedAt: record.acceptedAt ?? undefined,
      acceptedExpiresAt: record.acceptedExpiresAt ?? undefined,
      rejectedAt: record.rejectedAt ?? undefined,
      convertedTransactionId: record.convertedTransactionId ?? undefined,
      cancelledAt: record.cancelledAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async create(ctx: Ctx, offer: Offer): Promise<Offer> {
    this.logger.debug(ctx, 'create', { offerId: offer.id, listingId: offer.listingId });
    const client = this.getClient(ctx);
    const created = await client.offer.create({
      data: {
        id: offer.id,
        listingId: offer.listingId,
        userId: offer.userId,
        offeredPrice: this.serializeMoney(offer.offeredPrice) as object,
        status: this.mapStatusToDb(offer.status),
        tickets: offer.tickets as object,
        expiresAt: offer.expiresAt,
        acceptedAt: offer.acceptedAt,
        acceptedExpiresAt: offer.acceptedExpiresAt,
        rejectedAt: offer.rejectedAt,
        convertedTransactionId: offer.convertedTransactionId,
        cancelledAt: offer.cancelledAt,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
      },
    });
    return this.mapToDomain(created);
  }

  async findById(ctx: Ctx, id: string): Promise<Offer | undefined> {
    this.logger.debug(ctx, 'findById', { id });
    const client = this.getClient(ctx);
    const row = await client.offer.findUnique({ where: { id } });
    return row ? this.mapToDomain(row) : undefined;
  }

  async findByIds(ctx: Ctx, ids: string[]): Promise<Offer[]> {
    this.logger.debug(ctx, 'findByIds', { count: ids.length });
    if (ids.length === 0) return [];
    const client = this.getClient(ctx);
    const rows = await client.offer.findMany({
      where: { id: { in: ids } },
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async findByListingId(ctx: Ctx, listingId: string): Promise<Offer[]> {
    this.logger.debug(ctx, 'findByListingId', { listingId });
    const client = this.getClient(ctx);
    const rows = await client.offer.findMany({
      where: { listingId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async findByListingIds(ctx: Ctx, listingIds: string[]): Promise<Offer[]> {
    this.logger.debug(ctx, 'findByListingIds', { count: listingIds.length });
    if (listingIds.length === 0) return [];
    const client = this.getClient(ctx);
    const rows = await client.offer.findMany({
      where: { listingId: { in: listingIds } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async findByUserId(ctx: Ctx, userId: string): Promise<Offer[]> {
    this.logger.debug(ctx, 'findByUserId', { userId });
    const client = this.getClient(ctx);
    const rows = await client.offer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async findActiveByUserAndListing(
    ctx: Ctx,
    userId: string,
    listingId: string,
  ): Promise<Offer | undefined> {
    this.logger.debug(ctx, 'findActiveByUserAndListing', { userId, listingId });
    const client = this.getClient(ctx);
    const row = await client.offer.findFirst({
      where: {
        userId,
        listingId,
        status: { in: [PrismaOfferStatus.pending, PrismaOfferStatus.accepted] },
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? this.mapToDomain(row) : undefined;
  }

  async update(
    ctx: Ctx,
    id: string,
    updates: Partial<
      Pick<
        Offer,
        | 'status'
        | 'acceptedAt'
        | 'acceptedExpiresAt'
        | 'rejectedAt'
        | 'convertedTransactionId'
        | 'cancelledAt'
      >
    >,
  ): Promise<Offer | undefined> {
    this.logger.debug(ctx, 'update', { id });
    const client = this.getClient(ctx);
    const data: Record<string, unknown> = {};
    if (updates.status !== undefined)
      data.status = this.mapStatusToDb(updates.status);
    if (updates.acceptedAt !== undefined) data.acceptedAt = updates.acceptedAt;
    if (updates.acceptedExpiresAt !== undefined)
      data.acceptedExpiresAt = updates.acceptedExpiresAt;
    if (updates.rejectedAt !== undefined) data.rejectedAt = updates.rejectedAt;
    if (updates.convertedTransactionId !== undefined)
      data.convertedTransactionId = updates.convertedTransactionId;
    if (updates.cancelledAt !== undefined)
      data.cancelledAt = updates.cancelledAt;
    data.updatedAt = new Date();

    const updated = await client.offer.update({
      where: { id },
      data: data as Parameters<typeof client.offer.update>[0]['data'],
    });
    return this.mapToDomain(updated);
  }

  async cancelExpiredPendingByIds(
    ctx: Ctx,
    ids: string[],
    cancelledAt: Date,
  ): Promise<number> {
    this.logger.debug(ctx, 'cancelExpiredPendingByIds', {
      count: ids.length,
    });
    if (ids.length === 0) return 0;
    const client = this.getClient(ctx);
    const result = await client.offer.updateMany({
      where: {
        id: { in: ids },
        status: PrismaOfferStatus.pending,
      },
      data: {
        status: PrismaOfferStatus.cancelled,
        cancelledAt,
        updatedAt: new Date(),
      },
    });
    return result.count;
  }

  async findPendingOrAcceptedByListingId(
    ctx: Ctx,
    listingId: string,
  ): Promise<Offer[]> {
    this.logger.debug(ctx, 'findPendingOrAcceptedByListingId', { listingId });
    const client = this.getClient(ctx);
    const rows = await client.offer.findMany({
      where: {
        listingId,
        status: { in: [PrismaOfferStatus.pending, PrismaOfferStatus.accepted] },
      },
    });
    return rows.map((r) => this.mapToDomain(r));
  }
}
