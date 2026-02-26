import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { TicketListing } from './tickets.domain';
import { ListingStatus, TicketUnitStatus } from './tickets.domain';

@Injectable()
export class TicketsRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<TicketListing>;

  constructor() {
    this.storage = new KeyValueFileStorage<TicketListing>('tickets');
  }

  /**
   * Load data from file storage when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  /**
   * Create a new listing
   */
  async create(ctx: Ctx, listing: TicketListing): Promise<TicketListing> {
    await this.storage.set(ctx, listing.id, listing);
    return listing;
  }

  /**
   * Find listing by ID
   */
  async findById(ctx: Ctx, id: string): Promise<TicketListing | undefined> {
    return await this.storage.get(ctx, id);
  }

  /**
   * Get listings by IDs (batch).
   */
  async getByIds(
    ctx: Ctx,
    ids: string[],
  ): Promise<TicketListing[]> {
    if (ids.length === 0) return [];
    return await this.storage.getMany(ctx, ids);
  }

  /**
   * Get all listings
   */
  async getAll(ctx: Ctx): Promise<TicketListing[]> {
    return await this.storage.getAll(ctx);
  }

  /**
   * Get active listings
   */
  async getActiveListings(ctx: Ctx): Promise<TicketListing[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter((l) => l.status === ListingStatus.Active);
  }

  /**
   * Get listings by event
   */
  async getByEventId(ctx: Ctx, eventId: string): Promise<TicketListing[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter(
      (l) => l.eventId === eventId && l.status === ListingStatus.Active,
    );
  }

  /**
   * Get listings by event date
   */
  async getByEventDateId(
    ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter(
      (l) => l.eventDateId === eventDateId && l.status === ListingStatus.Active,
    );
  }

  /**
   * Get listings by seller
   */
  async getBySellerId(ctx: Ctx, sellerId: string): Promise<TicketListing[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter((l) => l.sellerId === sellerId);
  }

  /**
   * Update listing
   */
  async update(
    ctx: Ctx,
    id: string,
    updates: Partial<TicketListing>,
  ): Promise<TicketListing | undefined> {
    const existing = await this.storage.get(ctx, id);
    if (!existing) return undefined;

    const { seatingType: _omit, ...existingWithoutSeatingType } =
      existing as TicketListing & { seatingType?: string };
    const updated: TicketListing = {
      ...existingWithoutSeatingType,
      ...updates,
      id: existing.id, // Ensure ID can't be changed
      sellerId: existing.sellerId, // Seller can't be changed
      updatedAt: new Date(),
    };
    await this.storage.set(ctx, id, updated);
    return updated;
  }

  /**
   * Delete listing
   */
  async delete(ctx: Ctx, id: string): Promise<void> {
    await this.storage.delete(ctx, id);
  }

  async reserveUnits(
    ctx: Ctx,
    id: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing | undefined> {
    const existing = await this.storage.get(ctx, id);
    if (!existing) return undefined;

    const idSet = new Set(ticketUnitIds);
    if (idSet.size !== ticketUnitIds.length) {
      return undefined;
    }

    const unitsById = new Map(
      existing.ticketUnits.map((unit) => [unit.id, unit]),
    );
    for (const unitId of ticketUnitIds) {
      const unit = unitsById.get(unitId);
      if (!unit || unit.status !== TicketUnitStatus.Available) {
        return undefined;
      }
    }

    const updatedUnits = existing.ticketUnits.map((unit) =>
      idSet.has(unit.id)
        ? { ...unit, status: TicketUnitStatus.Reserved }
        : unit,
    );
    const hasAvailable = updatedUnits.some(
      (unit) => unit.status === TicketUnitStatus.Available,
    );
    const nextStatus = hasAvailable ? ListingStatus.Active : ListingStatus.Sold;

    const { seatingType: _s, ...rest } = existing as TicketListing & {
      seatingType?: string;
    };
    const updated: TicketListing = {
      ...rest,
      ticketUnits: updatedUnits,
      status: nextStatus,
      updatedAt: new Date(),
    };
    await this.storage.set(ctx, id, updated);
    return updated;
  }

  async restoreUnits(
    ctx: Ctx,
    id: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing | undefined> {
    const existing = await this.storage.get(ctx, id);
    if (!existing) return undefined;

    const idSet = new Set(ticketUnitIds);
    if (idSet.size !== ticketUnitIds.length) {
      return undefined;
    }

    const unitsById = new Map(
      existing.ticketUnits.map((unit) => [unit.id, unit]),
    );
    for (const unitId of ticketUnitIds) {
      const unit = unitsById.get(unitId);
      if (!unit || unit.status !== TicketUnitStatus.Reserved) {
        return undefined;
      }
    }

    const updatedUnits = existing.ticketUnits.map((unit) =>
      idSet.has(unit.id)
        ? { ...unit, status: TicketUnitStatus.Available }
        : unit,
    );
    const hasAvailable = updatedUnits.some(
      (unit) => unit.status === TicketUnitStatus.Available,
    );

    const { seatingType: _s, ...rest } = existing as TicketListing & {
      seatingType?: string;
    };
    const updated: TicketListing = {
      ...rest,
      ticketUnits: updatedUnits,
      status: hasAvailable ? ListingStatus.Active : ListingStatus.Sold,
      updatedAt: new Date(),
    };
    await this.storage.set(ctx, id, updated);
    return updated;
  }

  /**
   * Get pending listings by event ID
   */
  async getPendingByEventId(
    ctx: Ctx,
    eventId: string,
  ): Promise<TicketListing[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter(
      (l) => l.eventId === eventId && l.status === ListingStatus.Pending,
    );
  }

  /**
   * Get pending listings by event date ID
   */
  async getPendingByEventDateId(
    ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter(
      (l) =>
        l.eventDateId === eventDateId && l.status === ListingStatus.Pending,
    );
  }

  /**
   * Bulk update status for multiple listings
   */
  async bulkUpdateStatus(
    ctx: Ctx,
    listingIds: string[],
    status: ListingStatus,
  ): Promise<number> {
    let updatedCount = 0;

    for (const id of listingIds) {
      const existing = await this.storage.get(ctx, id);
      if (existing) {
        const { seatingType: _s, ...rest } = existing as TicketListing & {
          seatingType?: string;
        };
        const updated: TicketListing = {
          ...rest,
          status,
          updatedAt: new Date(),
        };
        await this.storage.set(ctx, id, updated);
        updatedCount++;
      }
    }

    return updatedCount;
  }

  /**
   * Get all listings for an event date (including all statuses)
   */
  async getAllByEventDateId(
    ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter((l) => l.eventDateId === eventDateId);
  }

  /**
   * Get pending listings by event section ID
   */
  async getPendingByEventSectionId(
    ctx: Ctx,
    eventSectionId: string,
  ): Promise<TicketListing[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter(
      (l) =>
        l.eventSectionId === eventSectionId &&
        l.status === ListingStatus.Pending,
    );
  }

  /**
   * Get all listings for an event section (including all statuses)
   */
  async getAllByEventSectionId(
    ctx: Ctx,
    eventSectionId: string,
  ): Promise<TicketListing[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter((l) => l.eventSectionId === eventSectionId);
  }

  /**
   * Get all listings for an event (including all statuses)
   */
  async getAllByEventId(ctx: Ctx, eventId: string): Promise<TicketListing[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter((l) => l.eventId === eventId);
  }

  /**
   * Get listing stats (count and available tickets) for multiple event IDs.
   * Returns a map of eventId -> { listingsCount, availableTicketsCount }
   */
  async getListingStatsByEventIds(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<
    Map<string, { listingsCount: number; availableTicketsCount: number }>
  > {
    const all = await this.storage.getAll(ctx);
    const eventIdSet = new Set(eventIds);

    const statsMap = new Map<
      string,
      { listingsCount: number; availableTicketsCount: number }
    >();

    for (const eventId of eventIds) {
      statsMap.set(eventId, { listingsCount: 0, availableTicketsCount: 0 });
    }

    for (const listing of all) {
      if (!eventIdSet.has(listing.eventId)) continue;

      const stats = statsMap.get(listing.eventId);
      if (!stats) continue;

      stats.listingsCount++;

      if (listing.status === ListingStatus.Active) {
        const availableUnits = listing.ticketUnits.filter(
          (unit) => unit.status === TicketUnitStatus.Available,
        ).length;
        stats.availableTicketsCount += availableUnits;
      }
    }

    return statsMap;
  }
}
