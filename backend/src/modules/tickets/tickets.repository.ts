import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import { OptimisticLockException } from '../../common/exceptions/optimistic-lock.exception';
import type {
  TicketListing as PrismaTicketListing,
  TicketUnit as PrismaTicketUnit,
} from '@prisma/client';
import {
  Prisma,
  TicketType as PrismaTicketType,
  DeliveryMethod as PrismaDeliveryMethod,
  ListingStatus as PrismaListingStatus,
  TicketUnitStatus as PrismaTicketUnitStatus,
} from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type { TicketListing, TicketUnit, Money } from './tickets.domain';
import {
  TicketType,
  DeliveryMethod,
  ListingStatus,
  TicketUnitStatus,
} from './tickets.domain';
import type { ITicketsRepository } from './tickets.repository.interface';
import type { ListListingsPaginatedOpts } from './tickets.repository.interface';
import type { Address } from '../shared/address.domain';

type PrismaTicketListingWithUnits = PrismaTicketListing & {
  ticketUnits: PrismaTicketUnit[];
};

@Injectable()
export class TicketsRepository
  extends BaseRepository
  implements ITicketsRepository
{
  private readonly logger = new ContextLogger(TicketsRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ==================== Enum Mappers ====================

  private mapTicketTypeToDb(type: TicketType): PrismaTicketType {
    switch (type) {
      case TicketType.Physical:
        return PrismaTicketType.Physical;
      case TicketType.Digital:
        return PrismaTicketType.Digital;
    }
  }

  private mapTicketTypeFromDb(type: PrismaTicketType): TicketType {
    switch (type) {
      case PrismaTicketType.Physical:
        return TicketType.Physical;
      case PrismaTicketType.Digital:
        return TicketType.Digital;
    }
  }

  private mapDeliveryMethodToDb(
    method: DeliveryMethod | undefined,
  ): PrismaDeliveryMethod | null {
    if (!method) return null;
    switch (method) {
      case DeliveryMethod.Pickup:
        return PrismaDeliveryMethod.Pickup;
      case DeliveryMethod.ArrangeWithSeller:
        return PrismaDeliveryMethod.ArrangeWithSeller;
      default:
        return null;
    }
  }

  private mapDeliveryMethodFromDb(
    method: PrismaDeliveryMethod | null,
  ): DeliveryMethod | undefined {
    if (!method) return undefined;
    switch (method) {
      case PrismaDeliveryMethod.Pickup:
        return DeliveryMethod.Pickup;
      case PrismaDeliveryMethod.ArrangeWithSeller:
        return DeliveryMethod.ArrangeWithSeller;
      default:
        return undefined;
    }
  }

  private mapListingStatusToDb(status: ListingStatus): PrismaListingStatus {
    switch (status) {
      case ListingStatus.Pending:
        return PrismaListingStatus.Pending;
      case ListingStatus.Active:
        return PrismaListingStatus.Active;
      case ListingStatus.Sold:
        return PrismaListingStatus.Sold;
      case ListingStatus.Cancelled:
        return PrismaListingStatus.Cancelled;
      case ListingStatus.Expired:
        return PrismaListingStatus.Expired;
      default:
        return PrismaListingStatus.Pending;
    }
  }

  private mapListingStatusFromDb(status: PrismaListingStatus): ListingStatus {
    switch (status) {
      case PrismaListingStatus.Pending:
        return ListingStatus.Pending;
      case PrismaListingStatus.Active:
        return ListingStatus.Active;
      case PrismaListingStatus.Sold:
        return ListingStatus.Sold;
      case PrismaListingStatus.Cancelled:
        return ListingStatus.Cancelled;
      case PrismaListingStatus.Expired:
        return ListingStatus.Expired;
      default:
        return ListingStatus.Pending;
    }
  }

  private mapTicketUnitStatusToDb(
    status: TicketUnitStatus,
  ): PrismaTicketUnitStatus {
    switch (status) {
      case TicketUnitStatus.Available:
        return PrismaTicketUnitStatus.available;
      case TicketUnitStatus.Reserved:
        return PrismaTicketUnitStatus.reserved;
      case TicketUnitStatus.Sold:
        return PrismaTicketUnitStatus.sold;
      default:
        return PrismaTicketUnitStatus.available;
    }
  }

  private mapTicketUnitStatusFromDb(status: string): TicketUnitStatus {
    switch (status) {
      case 'available':
        return TicketUnitStatus.Available;
      case 'reserved':
        return TicketUnitStatus.Reserved;
      case 'sold':
        return TicketUnitStatus.Sold;
      default:
        return TicketUnitStatus.Available;
    }
  }

  // ==================== Money Serialization ====================

  private serializeMoney(money: Money): object {
    return {
      amount: money.amount,
      currency: money.currency,
    };
  }

  private deserializeMoney(json: unknown): Money {
    const data = json as { amount: number; currency: string };
    return {
      amount: data.amount,
      currency: data.currency as Money['currency'],
    };
  }

  // ==================== TicketUnit Mapper ====================

  private mapTicketUnitFromDb(unit: PrismaTicketUnit): TicketUnit {
    return {
      id: unit.id,
      listingId: unit.listingId,
      status: this.mapTicketUnitStatusFromDb(unit.status),
      seat:
        unit.seatRow && unit.seatNumber
          ? { row: unit.seatRow, seatNumber: unit.seatNumber }
          : undefined,
      version: unit.version,
    };
  }

  // ==================== Domain Mapper ====================

  private mapToListing(record: PrismaTicketListingWithUnits): TicketListing {
    return {
      id: record.id,
      sellerId: record.sellerId,
      eventId: record.eventId,
      eventDateId: record.eventDateId,
      eventSectionId: record.eventSectionId,
      type: this.mapTicketTypeFromDb(record.type),
      ticketUnits: record.ticketUnits.map((unit) =>
        this.mapTicketUnitFromDb(unit),
      ),
      sellTogether: record.sellTogether,
      pricePerTicket: this.deserializeMoney(record.pricePerTicket),
      bestOfferConfig: record.bestOfferConfig
        ? (record.bestOfferConfig as unknown as TicketListing['bestOfferConfig'])
        : undefined,
      deliveryMethod: this.mapDeliveryMethodFromDb(record.deliveryMethod),
      pickupAddress: record.pickupAddress
        ? (record.pickupAddress as unknown as Address)
        : undefined,
      promotionSnapshot: record.promotionSnapshot
        ? (record.promotionSnapshot as unknown as TicketListing['promotionSnapshot'])
        : undefined,
      status: this.mapListingStatusFromDb(record.status),
      version: record.version,
      expiresAt: record.expiresAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  // ==================== Update Data Builder ====================

  private buildUpdateData(
    updates: Partial<TicketListing>,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (updates.type !== undefined) {
      data.type = this.mapTicketTypeToDb(updates.type);
    }
    if (updates.sellTogether !== undefined) {
      data.sellTogether = updates.sellTogether;
    }
    if (updates.pricePerTicket !== undefined) {
      data.pricePerTicket = this.serializeMoney(updates.pricePerTicket);
    }
    if (updates.bestOfferConfig !== undefined) {
      data.bestOfferConfig = updates.bestOfferConfig
        ? (updates.bestOfferConfig as object)
        : null;
    }
    if (updates.deliveryMethod !== undefined) {
      data.deliveryMethod = this.mapDeliveryMethodToDb(updates.deliveryMethod);
    }
    if (updates.pickupAddress !== undefined) {
      data.pickupAddress = updates.pickupAddress
        ? (updates.pickupAddress as object)
        : null;
    }
    if (updates.status !== undefined) {
      data.status = this.mapListingStatusToDb(updates.status);
    }
    if (updates.expiresAt !== undefined) {
      data.expiresAt = updates.expiresAt;
    }

    return data;
  }

  // ==================== Repository Methods ====================

  async create(ctx: Ctx, listing: TicketListing): Promise<TicketListing> {
    this.logger.debug(ctx, 'create', { listingId: listing.id, eventId: listing.eventId });
    const client = this.getClient(ctx);
    const created = await client.ticketListing.create({
      data: {
        id: listing.id,
        sellerId: listing.sellerId,
        eventId: listing.eventId,
        eventDateId: listing.eventDateId,
        eventSectionId: listing.eventSectionId,
        type: this.mapTicketTypeToDb(listing.type),
        ticketUnits: {
          create: listing.ticketUnits.map((unit) => ({
            id: unit.id,
            seatRow: unit.seat?.row,
            seatNumber: unit.seat?.seatNumber,
            status: this.mapTicketUnitStatusToDb(unit.status),
          })),
        },
        sellTogether: listing.sellTogether,
        pricePerTicket: this.serializeMoney(listing.pricePerTicket),
        bestOfferConfig: listing.bestOfferConfig
          ? (listing.bestOfferConfig as object)
          : undefined,
        deliveryMethod: this.mapDeliveryMethodToDb(listing.deliveryMethod),
        pickupAddress: listing.pickupAddress
          ? (listing.pickupAddress as object)
          : undefined,
        promotionSnapshot: listing.promotionSnapshot
          ? (listing.promotionSnapshot as object)
          : undefined,
        status: this.mapListingStatusToDb(listing.status),
        expiresAt: listing.expiresAt,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      },
      include: { ticketUnits: true },
    });
    return this.mapToListing(created);
  }

  async findById(ctx: Ctx, id: string): Promise<TicketListing | undefined> {
    this.logger.debug(ctx, 'findById', { id });
    const client = this.getClient(ctx);
    const listing = await client.ticketListing.findUnique({
      where: { id },
      include: { ticketUnits: true },
    });
    return listing ? this.mapToListing(listing) : undefined;
  }

  async findByIds(ctx: Ctx, ids: string[]): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'findByIds', { count: ids.length });
    if (ids.length === 0) return [];
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: { id: { in: ids } },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getActiveListings(ctx: Ctx): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getActiveListings');
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: { status: PrismaListingStatus.Active },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async listListingsPaginated(
    ctx: Ctx,
    opts: ListListingsPaginatedOpts,
  ): Promise<{ listings: TicketListing[]; total: number }> {
    const client = this.getClient(ctx);
    const baseWhere: Record<string, unknown> = {};
    if (opts.eventId) {
      baseWhere.eventId = opts.eventId;
      baseWhere.status = PrismaListingStatus.Active;
    } else if (opts.eventDateId) {
      baseWhere.eventDateId = opts.eventDateId;
      baseWhere.status = PrismaListingStatus.Active;
    } else if (opts.sellerId) {
      baseWhere.sellerId = opts.sellerId;
    } else {
      baseWhere.status = PrismaListingStatus.Active;
    }
    if (opts.type !== undefined) {
      baseWhere.type = this.mapTicketTypeToDb(opts.type);
    }
    const priceFilters: Record<string, unknown>[] = [];
    if (opts.minPrice != null) {
      priceFilters.push({
        pricePerTicket: { path: ['amount'], gte: opts.minPrice },
      });
    }
    if (opts.maxPrice != null) {
      priceFilters.push({
        pricePerTicket: { path: ['amount'], lte: opts.maxPrice },
      });
    }
    const where =
      priceFilters.length > 0
        ? { AND: [baseWhere, ...priceFilters] }
        : baseWhere;

    const [listings, total] = await Promise.all([
      client.ticketListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: opts.offset,
        take: opts.limit,
        include: { ticketUnits: true },
      }),
      client.ticketListing.count({ where }),
    ]);
    return {
      listings: listings.map((l) => this.mapToListing(l)),
      total,
    };
  }

  async getMinActiveListingPriceByEventIds(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<Map<string, { amount: number; currency: string }>> {
    this.logger.debug(ctx, 'getMinActiveListingPriceByEventIds', {
      count: eventIds.length,
    });
    if (eventIds.length === 0) {
      return new Map();
    }
    const client = this.getClient(ctx);
    const rows = await client.$queryRaw<
      Array<{ eventId: string; minAmount: number; currency: string | null }>
    >`
      SELECT DISTINCT ON (l."eventId")
        l."eventId" AS "eventId",
        (l."pricePerTicket"->>'amount')::int AS "minAmount",
        l."pricePerTicket"->>'currency' AS currency
      FROM ticket_listings l
      INNER JOIN ticket_units u ON u."listingId" = l.id AND u.status = 'available'
      WHERE l.status = 'Active'
        AND l."eventId" IN (${Prisma.join(eventIds)})
      ORDER BY l."eventId", (l."pricePerTicket"->>'amount')::int ASC, l.id ASC
    `;
    const map = new Map<string, { amount: number; currency: string }>();
    for (const row of rows) {
      if (row.minAmount == null || Number.isNaN(row.minAmount)) {
        continue;
      }
      map.set(row.eventId, {
        amount: row.minAmount,
        currency: row.currency?.trim() || 'ARS',
      });
    }
    return map;
  }

  async getByEventId(ctx: Ctx, eventId: string): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getByEventId', { eventId });
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: {
        eventId,
        status: PrismaListingStatus.Active,
      },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getByEventDateId(
    ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getByEventDateId', { eventDateId });
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: {
        eventDateId,
        status: PrismaListingStatus.Active,
      },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getBySellerId(ctx: Ctx, sellerId: string): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getBySellerId', { sellerId });
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getActiveListingsSummaryBySellerId(
    ctx: Ctx,
    sellerId: string,
    excludeListingId?: string,
  ): Promise<{ amount: number; currency: string }[]> {
    this.logger.debug(ctx, 'getActiveListingsSummaryBySellerId', { sellerId });
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: {
        sellerId,
        status: PrismaListingStatus.Active,
        ...(excludeListingId ? { NOT: { id: excludeListingId } } : {}),
      },
      select: { pricePerTicket: true },
    });
    return listings.map((l) => this.deserializeMoney(l.pricePerTicket));
  }

  async update(
    ctx: Ctx,
    id: string,
    updates: Partial<TicketListing>,
  ): Promise<TicketListing | undefined> {
    this.logger.debug(ctx, 'update', { id });
    const client = this.getClient(ctx);
    const existing = await client.ticketListing.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const data = this.buildUpdateData(updates);
    data.updatedAt = new Date();

    const updated = await client.ticketListing.update({
      where: { id },
      data,
      include: { ticketUnits: true },
    });
    return this.mapToListing(updated);
  }

  async delete(ctx: Ctx, id: string): Promise<void> {
    this.logger.debug(ctx, 'delete', { id });
    const client = this.getClient(ctx);
    await client.ticketListing.delete({
      where: { id },
    });
  }

  async reserveUnits(
    ctx: Ctx,
    id: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing | undefined> {
    this.logger.debug(ctx, 'reserveUnits', { id, ticketUnitIdsCount: ticketUnitIds.length });
    const client = this.getClient(ctx);
    const idSet = new Set(ticketUnitIds);
    if (idSet.size !== ticketUnitIds.length) {
      return undefined;
    }

    const units = await client.ticketUnit.findMany({
      where: { id: { in: ticketUnitIds }, listingId: id },
    });

    if (units.length !== ticketUnitIds.length) {
      return undefined;
    }

    if (units.some((u) => u.status !== PrismaTicketUnitStatus.available)) {
      return undefined;
    }

    await client.ticketUnit.updateMany({
      where: { id: { in: ticketUnitIds } },
      data: { status: PrismaTicketUnitStatus.reserved, updatedAt: new Date() },
    });

    const remainingAvailable = await client.ticketUnit.count({
      where: { listingId: id, status: PrismaTicketUnitStatus.available },
    });

    const nextStatus =
      remainingAvailable === 0
        ? PrismaListingStatus.Sold
        : PrismaListingStatus.Active;

    const updated = await client.ticketListing.update({
      where: { id },
      data: { status: nextStatus, updatedAt: new Date() },
      include: { ticketUnits: true },
    });

    return this.mapToListing(updated);
  }

  async restoreUnits(
    ctx: Ctx,
    id: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing | undefined> {
    this.logger.debug(ctx, 'restoreUnits', { id, ticketUnitIdsCount: ticketUnitIds.length });
    const client = this.getClient(ctx);
    const idSet = new Set(ticketUnitIds);
    if (idSet.size !== ticketUnitIds.length) {
      return undefined;
    }

    const units = await client.ticketUnit.findMany({
      where: { id: { in: ticketUnitIds }, listingId: id },
    });

    if (units.length !== ticketUnitIds.length) {
      return undefined;
    }

    if (units.some((u) => u.status !== PrismaTicketUnitStatus.reserved)) {
      return undefined;
    }

    await client.ticketUnit.updateMany({
      where: { id: { in: ticketUnitIds } },
      data: { status: PrismaTicketUnitStatus.available, updatedAt: new Date() },
    });

    const hasAvailable = await client.ticketUnit.count({
      where: { listingId: id, status: PrismaTicketUnitStatus.available },
    });

    const updated = await client.ticketListing.update({
      where: { id },
      data: {
        status:
          hasAvailable > 0
            ? PrismaListingStatus.Active
            : PrismaListingStatus.Sold,
        updatedAt: new Date(),
      },
      include: { ticketUnits: true },
    });

    return this.mapToListing(updated);
  }

  async getPendingByEventId(
    ctx: Ctx,
    eventId: string,
  ): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getPendingByEventId', { eventId });
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: {
        eventId,
        status: PrismaListingStatus.Pending,
      },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getPendingByEventIds(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getPendingByEventIds', { count: eventIds.length });
    if (eventIds.length === 0) return [];
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: {
        eventId: { in: eventIds },
        status: PrismaListingStatus.Pending,
      },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getPendingByEventDateId(
    ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getPendingByEventDateId', { eventDateId });
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: {
        eventDateId,
        status: PrismaListingStatus.Pending,
      },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async bulkUpdateStatus(
    ctx: Ctx,
    listingIds: string[],
    status: ListingStatus,
  ): Promise<number> {
    this.logger.debug(ctx, 'bulkUpdateStatus', { count: listingIds.length, status });
    if (listingIds.length === 0) return 0;
    const client = this.getClient(ctx);

    const result = await client.ticketListing.updateMany({
      where: { id: { in: listingIds } },
      data: {
        status: this.mapListingStatusToDb(status),
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  async getAllByEventDateId(
    ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getAllByEventDateId', { eventDateId });
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: { eventDateId },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getPendingByEventSectionId(
    ctx: Ctx,
    eventSectionId: string,
  ): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getPendingByEventSectionId', { eventSectionId });
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: {
        eventSectionId,
        status: PrismaListingStatus.Pending,
      },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getAllByEventSectionId(
    ctx: Ctx,
    eventSectionId: string,
  ): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getAllByEventSectionId', { eventSectionId });
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: { eventSectionId },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getAllByEventId(ctx: Ctx, eventId: string): Promise<TicketListing[]> {
    this.logger.debug(ctx, 'getAllByEventId', { eventId });
    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      include: { ticketUnits: true },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getListingStatsByEventIds(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<
    Map<string, { listingsCount: number; availableTicketsCount: number }>
  > {
    this.logger.debug(ctx, 'getListingStatsByEventIds', { count: eventIds.length });
    const statsMap = new Map<
      string,
      { listingsCount: number; availableTicketsCount: number }
    >();

    for (const eventId of eventIds) {
      statsMap.set(eventId, { listingsCount: 0, availableTicketsCount: 0 });
    }

    if (eventIds.length === 0) return statsMap;

    const client = this.getClient(ctx);
    const listings = await client.ticketListing.findMany({
      where: { eventId: { in: eventIds } },
      include: { ticketUnits: true },
    });

    for (const listing of listings) {
      const stats = statsMap.get(listing.eventId);
      if (!stats) continue;

      stats.listingsCount++;

      if (listing.status === PrismaListingStatus.Active) {
        const availableUnits = listing.ticketUnits.filter(
          (unit) => unit.status === PrismaTicketUnitStatus.available,
        ).length;
        stats.availableTicketsCount += availableUnits;
      }
    }

    return statsMap;
  }

  // ==================== Locking Methods ====================

  /**
   * Find listing by ID with pessimistic lock (FOR UPDATE)
   * Blocks other transactions from modifying this row until current transaction commits
   */
  async findByIdForUpdate(
    ctx: Ctx,
    id: string,
  ): Promise<TicketListing | undefined> {
    this.logger.debug(ctx, 'findByIdForUpdate', { id });
    const client = this.getClient(ctx);

    const results = await client.$queryRaw<PrismaTicketListingWithUnits[]>`
      SELECT tl.*
      FROM ticket_listings tl
      WHERE tl.id = ${id}
      FOR UPDATE
    `;

    if (results.length === 0) {
      return undefined;
    }

    const listing = results[0];

    const units = await client.ticketUnit.findMany({
      where: { listingId: id },
    });

    return this.mapToListing({ ...listing, ticketUnits: units });
  }

  /**
   * Reserve ticket units with pessimistic locking (FOR UPDATE)
   * Acquires row-level locks on ticket units to prevent double-booking,
   * then updates their status to 'reserved'
   * @throws BadRequestException if units not found or not available
   */
  async reserveUnitsWithLock(
    ctx: Ctx,
    listingId: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing> {
    this.logger.debug(ctx, 'reserveUnitsWithLock', { listingId, ticketUnitIdsCount: ticketUnitIds.length });
    const client = this.getClient(ctx);

    const units = await client.$queryRaw<PrismaTicketUnit[]>`
      SELECT * FROM ticket_units
      WHERE id = ANY(${ticketUnitIds}::text[])
      AND "listingId" = ${listingId}
      FOR UPDATE
    `;

    if (units.length !== ticketUnitIds.length) {
      throw new BadRequestException('Some ticket units not found');
    }

    const unavailable = units.filter((u) => u.status !== 'available');
    if (unavailable.length > 0) {
      throw new BadRequestException('Some tickets are no longer available');
    }

    await client.$executeRaw`
      UPDATE ticket_units
      SET status = 'reserved',
          version = version + 1,
          "updatedAt" = NOW()
      WHERE id = ANY(${ticketUnitIds}::text[])
    `;

    const remainingAvailable = await client.ticketUnit.count({
      where: { listingId, status: PrismaTicketUnitStatus.available },
    });

    const nextStatus =
      remainingAvailable === 0
        ? PrismaListingStatus.Sold
        : PrismaListingStatus.Active;

    await client.ticketListing.update({
      where: { id: listingId },
      data: {
        status: nextStatus,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    const updated = await this.findById(ctx, listingId);
    return updated!;
  }

  /**
   * Restore ticket units with pessimistic locking (FOR UPDATE)
   * Acquires row-level locks on ticket units to prevent concurrent modifications,
   * then updates their status back to 'available'
   * @throws BadRequestException if units not found or not in reserved state
   */
  async restoreUnitsWithLock(
    ctx: Ctx,
    listingId: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing> {
    this.logger.debug(ctx, 'restoreUnitsWithLock', { listingId, ticketUnitIdsCount: ticketUnitIds.length });
    const client = this.getClient(ctx);

    const units = await client.$queryRaw<PrismaTicketUnit[]>`
      SELECT * FROM ticket_units
      WHERE id = ANY(${ticketUnitIds}::text[])
      AND "listingId" = ${listingId}
      FOR UPDATE
    `;

    if (units.length !== ticketUnitIds.length) {
      throw new BadRequestException('Some ticket units not found');
    }

    const notReserved = units.filter((u) => u.status !== 'reserved');
    if (notReserved.length > 0) {
      throw new BadRequestException('Some tickets are not in reserved state');
    }

    await client.$executeRaw`
      UPDATE ticket_units
      SET status = 'available',
          version = version + 1,
          "updatedAt" = NOW()
      WHERE id = ANY(${ticketUnitIds}::text[])
    `;

    await client.ticketListing.update({
      where: { id: listingId },
      data: {
        status: 'Active',
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    const updated = await this.findById(ctx, listingId);
    return updated!;
  }

  /**
   * Update listing with version check (optimistic locking pattern)
   * Fails if the listing has been modified since it was read (version mismatch)
   * @throws OptimisticLockException on version mismatch
   */
  async updateWithVersion(
    ctx: Ctx,
    id: string,
    updates: Partial<TicketListing>,
    expectedVersion: number,
  ): Promise<TicketListing> {
    this.logger.debug(ctx, 'updateWithVersion', { id, expectedVersion });
    const client = this.getClient(ctx);

    const data: Record<string, unknown> = { ...this.buildUpdateData(updates) };
    data.version = { increment: 1 };
    data.updatedAt = new Date();

    try {
      const updated = await client.ticketListing.update({
        where: { id, version: expectedVersion },
        data,
        include: { ticketUnits: true },
      });
      return this.mapToListing(updated);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2025'
      ) {
        throw new OptimisticLockException('TicketListing', id);
      }
      throw error;
    }
  }
}
