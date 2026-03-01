import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { TicketListing as PrismaTicketListing } from '@prisma/client';
import {
  TicketType as PrismaTicketType,
  DeliveryMethod as PrismaDeliveryMethod,
  ListingStatus as PrismaListingStatus,
  TicketUnitStatus as PrismaTicketUnitStatus,
} from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import type { TicketListing, TicketUnit, Money } from './tickets.domain';
import {
  TicketType,
  DeliveryMethod,
  ListingStatus,
  TicketUnitStatus,
} from './tickets.domain';
import type { ITicketsRepository } from './tickets.repository.interface';
import type { Address } from '../shared/address.domain';

@Injectable()
export class TicketsRepository implements ITicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Enum Mappers ====================

  private mapTicketTypeToDb(type: TicketType): PrismaTicketType {
    switch (type) {
      case TicketType.Physical:
        return PrismaTicketType.Physical;
      case TicketType.DigitalTransferable:
        return PrismaTicketType.DigitalTransferable;
      case TicketType.DigitalNonTransferable:
        return PrismaTicketType.DigitalNonTransferable;
      default:
        return PrismaTicketType.Physical;
    }
  }

  private mapTicketTypeFromDb(type: PrismaTicketType): TicketType {
    switch (type) {
      case PrismaTicketType.Physical:
        return TicketType.Physical;
      case PrismaTicketType.DigitalTransferable:
        return TicketType.DigitalTransferable;
      case PrismaTicketType.DigitalNonTransferable:
        return TicketType.DigitalNonTransferable;
      default:
        return TicketType.Physical;
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

  private mapTicketUnitStatusFromDb(
    status: string,
  ): TicketUnitStatus {
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

  // ==================== JSON Serialization ====================

  private serializeTicketUnits(units: TicketUnit[]): object[] {
    return units.map((unit) => ({
      id: unit.id,
      status: this.mapTicketUnitStatusToDb(unit.status),
      seat: unit.seat,
    }));
  }

  private deserializeTicketUnits(json: unknown): TicketUnit[] {
    if (!Array.isArray(json)) return [];
    return json.map((unit: { id: string; status: string; seat?: { row: string; seatNumber: string } }) => ({
      id: unit.id,
      status: this.mapTicketUnitStatusFromDb(unit.status),
      seat: unit.seat,
    }));
  }

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

  // ==================== Domain Mapper ====================

  private mapToListing(record: PrismaTicketListing): TicketListing {
    return {
      id: record.id,
      sellerId: record.sellerId,
      eventId: record.eventId,
      eventDateId: record.eventDateId,
      eventSectionId: record.eventSectionId,
      type: this.mapTicketTypeFromDb(record.type),
      ticketUnits: this.deserializeTicketUnits(record.ticketUnits),
      sellTogether: record.sellTogether,
      pricePerTicket: this.deserializeMoney(record.pricePerTicket),
      deliveryMethod: this.mapDeliveryMethodFromDb(record.deliveryMethod),
      pickupAddress: record.pickupAddress
        ? (record.pickupAddress as unknown as Address)
        : undefined,
      description: record.description ?? undefined,
      status: this.mapListingStatusFromDb(record.status),
      expiresAt: record.expiresAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  // ==================== Repository Methods ====================

  async create(_ctx: Ctx, listing: TicketListing): Promise<TicketListing> {
    const created = await this.prisma.ticketListing.create({
      data: {
        id: listing.id,
        sellerId: listing.sellerId,
        eventId: listing.eventId,
        eventDateId: listing.eventDateId,
        eventSectionId: listing.eventSectionId,
        type: this.mapTicketTypeToDb(listing.type),
        ticketUnits: this.serializeTicketUnits(listing.ticketUnits),
        sellTogether: listing.sellTogether,
        pricePerTicket: this.serializeMoney(listing.pricePerTicket),
        deliveryMethod: this.mapDeliveryMethodToDb(listing.deliveryMethod),
        pickupAddress: listing.pickupAddress
          ? (listing.pickupAddress as object)
          : undefined,
        description: listing.description,
        status: this.mapListingStatusToDb(listing.status),
        expiresAt: listing.expiresAt,
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
      },
    });
    return this.mapToListing(created);
  }

  async findById(_ctx: Ctx, id: string): Promise<TicketListing | undefined> {
    const listing = await this.prisma.ticketListing.findUnique({
      where: { id },
    });
    return listing ? this.mapToListing(listing) : undefined;
  }

  async getByIds(_ctx: Ctx, ids: string[]): Promise<TicketListing[]> {
    if (ids.length === 0) return [];
    const listings = await this.prisma.ticketListing.findMany({
      where: { id: { in: ids } },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getAll(_ctx: Ctx): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getActiveListings(_ctx: Ctx): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      where: { status: PrismaListingStatus.Active },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getByEventId(_ctx: Ctx, eventId: string): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      where: {
        eventId,
        status: PrismaListingStatus.Active,
      },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getByEventDateId(
    _ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      where: {
        eventDateId,
        status: PrismaListingStatus.Active,
      },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getBySellerId(_ctx: Ctx, sellerId: string): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async update(
    _ctx: Ctx,
    id: string,
    updates: Partial<TicketListing>,
  ): Promise<TicketListing | undefined> {
    const existing = await this.prisma.ticketListing.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const data: Record<string, unknown> = {};

    if (updates.type !== undefined) {
      data.type = this.mapTicketTypeToDb(updates.type);
    }
    if (updates.ticketUnits !== undefined) {
      data.ticketUnits = this.serializeTicketUnits(updates.ticketUnits);
    }
    if (updates.sellTogether !== undefined) {
      data.sellTogether = updates.sellTogether;
    }
    if (updates.pricePerTicket !== undefined) {
      data.pricePerTicket = this.serializeMoney(updates.pricePerTicket);
    }
    if (updates.deliveryMethod !== undefined) {
      data.deliveryMethod = this.mapDeliveryMethodToDb(updates.deliveryMethod);
    }
    if (updates.pickupAddress !== undefined) {
      data.pickupAddress = updates.pickupAddress
        ? (updates.pickupAddress as object)
        : null;
    }
    if (updates.description !== undefined) {
      data.description = updates.description;
    }
    if (updates.status !== undefined) {
      data.status = this.mapListingStatusToDb(updates.status);
    }
    if (updates.expiresAt !== undefined) {
      data.expiresAt = updates.expiresAt;
    }

    data.updatedAt = new Date();

    const updated = await this.prisma.ticketListing.update({
      where: { id },
      data,
    });
    return this.mapToListing(updated);
  }

  async delete(_ctx: Ctx, id: string): Promise<void> {
    await this.prisma.ticketListing.delete({
      where: { id },
    });
  }

  async reserveUnits(
    _ctx: Ctx,
    id: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing | undefined> {
    const existing = await this.prisma.ticketListing.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const idSet = new Set(ticketUnitIds);
    if (idSet.size !== ticketUnitIds.length) {
      return undefined;
    }

    const currentUnits = this.deserializeTicketUnits(existing.ticketUnits);
    const unitsById = new Map(currentUnits.map((unit) => [unit.id, unit]));

    for (const unitId of ticketUnitIds) {
      const unit = unitsById.get(unitId);
      if (!unit || unit.status !== TicketUnitStatus.Available) {
        return undefined;
      }
    }

    const updatedUnits = currentUnits.map((unit) =>
      idSet.has(unit.id)
        ? { ...unit, status: TicketUnitStatus.Reserved }
        : unit,
    );

    const hasAvailable = updatedUnits.some(
      (unit) => unit.status === TicketUnitStatus.Available,
    );
    const nextStatus = hasAvailable ? ListingStatus.Active : ListingStatus.Sold;

    const updated = await this.prisma.ticketListing.update({
      where: { id },
      data: {
        ticketUnits: this.serializeTicketUnits(updatedUnits),
        status: this.mapListingStatusToDb(nextStatus),
        updatedAt: new Date(),
      },
    });

    return this.mapToListing(updated);
  }

  async restoreUnits(
    _ctx: Ctx,
    id: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing | undefined> {
    const existing = await this.prisma.ticketListing.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const idSet = new Set(ticketUnitIds);
    if (idSet.size !== ticketUnitIds.length) {
      return undefined;
    }

    const currentUnits = this.deserializeTicketUnits(existing.ticketUnits);
    const unitsById = new Map(currentUnits.map((unit) => [unit.id, unit]));

    for (const unitId of ticketUnitIds) {
      const unit = unitsById.get(unitId);
      if (!unit || unit.status !== TicketUnitStatus.Reserved) {
        return undefined;
      }
    }

    const updatedUnits = currentUnits.map((unit) =>
      idSet.has(unit.id)
        ? { ...unit, status: TicketUnitStatus.Available }
        : unit,
    );

    const hasAvailable = updatedUnits.some(
      (unit) => unit.status === TicketUnitStatus.Available,
    );

    const updated = await this.prisma.ticketListing.update({
      where: { id },
      data: {
        ticketUnits: this.serializeTicketUnits(updatedUnits),
        status: hasAvailable
          ? this.mapListingStatusToDb(ListingStatus.Active)
          : this.mapListingStatusToDb(ListingStatus.Sold),
        updatedAt: new Date(),
      },
    });

    return this.mapToListing(updated);
  }

  async getPendingByEventId(
    _ctx: Ctx,
    eventId: string,
  ): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      where: {
        eventId,
        status: PrismaListingStatus.Pending,
      },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getPendingByEventDateId(
    _ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      where: {
        eventDateId,
        status: PrismaListingStatus.Pending,
      },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async bulkUpdateStatus(
    _ctx: Ctx,
    listingIds: string[],
    status: ListingStatus,
  ): Promise<number> {
    if (listingIds.length === 0) return 0;

    const result = await this.prisma.ticketListing.updateMany({
      where: { id: { in: listingIds } },
      data: {
        status: this.mapListingStatusToDb(status),
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  async getAllByEventDateId(
    _ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      where: { eventDateId },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getPendingByEventSectionId(
    _ctx: Ctx,
    eventSectionId: string,
  ): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      where: {
        eventSectionId,
        status: PrismaListingStatus.Pending,
      },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getAllByEventSectionId(
    _ctx: Ctx,
    eventSectionId: string,
  ): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      where: { eventSectionId },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getAllByEventId(_ctx: Ctx, eventId: string): Promise<TicketListing[]> {
    const listings = await this.prisma.ticketListing.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.mapToListing(l));
  }

  async getListingStatsByEventIds(
    _ctx: Ctx,
    eventIds: string[],
  ): Promise<
    Map<string, { listingsCount: number; availableTicketsCount: number }>
  > {
    const statsMap = new Map<
      string,
      { listingsCount: number; availableTicketsCount: number }
    >();

    for (const eventId of eventIds) {
      statsMap.set(eventId, { listingsCount: 0, availableTicketsCount: 0 });
    }

    if (eventIds.length === 0) return statsMap;

    const listings = await this.prisma.ticketListing.findMany({
      where: { eventId: { in: eventIds } },
    });

    for (const listing of listings) {
      const stats = statsMap.get(listing.eventId);
      if (!stats) continue;

      stats.listingsCount++;

      if (listing.status === PrismaListingStatus.Active) {
        const units = this.deserializeTicketUnits(listing.ticketUnits);
        const availableUnits = units.filter(
          (unit) => unit.status === TicketUnitStatus.Available,
        ).length;
        stats.availableTicketsCount += availableUnits;
      }
    }

    return statsMap;
  }
}
