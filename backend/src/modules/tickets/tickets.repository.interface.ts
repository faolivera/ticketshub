import type { Ctx } from '../../common/types/context';
import type { TicketListing } from './tickets.domain';
import type { ListingStatus } from './tickets.domain';

/**
 * Tickets repository interface
 */
export interface ITicketsRepository {
  /**
   * Create a new listing
   */
  create(ctx: Ctx, listing: TicketListing): Promise<TicketListing>;

  /**
   * Find listing by ID
   */
  findById(ctx: Ctx, id: string): Promise<TicketListing | undefined>;

  /**
   * Get listings by IDs (batch)
   */
  getByIds(ctx: Ctx, ids: string[]): Promise<TicketListing[]>;

  /**
   * Get all listings
   */
  getAll(ctx: Ctx): Promise<TicketListing[]>;

  /**
   * Get active listings
   */
  getActiveListings(ctx: Ctx): Promise<TicketListing[]>;

  /**
   * Get listings by event (active only)
   */
  getByEventId(ctx: Ctx, eventId: string): Promise<TicketListing[]>;

  /**
   * Get listings by event date (active only)
   */
  getByEventDateId(ctx: Ctx, eventDateId: string): Promise<TicketListing[]>;

  /**
   * Get listings by seller
   */
  getBySellerId(ctx: Ctx, sellerId: string): Promise<TicketListing[]>;

  /**
   * Update listing
   */
  update(
    ctx: Ctx,
    id: string,
    updates: Partial<TicketListing>,
  ): Promise<TicketListing | undefined>;

  /**
   * Delete listing
   */
  delete(ctx: Ctx, id: string): Promise<void>;

  /**
   * Reserve units - atomically updates unit statuses to reserved
   */
  reserveUnits(
    ctx: Ctx,
    id: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing | undefined>;

  /**
   * Restore units - atomically updates reserved unit statuses back to available
   */
  restoreUnits(
    ctx: Ctx,
    id: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing | undefined>;

  /**
   * Get pending listings by event ID
   */
  getPendingByEventId(ctx: Ctx, eventId: string): Promise<TicketListing[]>;

  /**
   * Get pending listings by event date ID
   */
  getPendingByEventDateId(
    ctx: Ctx,
    eventDateId: string,
  ): Promise<TicketListing[]>;

  /**
   * Bulk update status for multiple listings
   */
  bulkUpdateStatus(
    ctx: Ctx,
    listingIds: string[],
    status: ListingStatus,
  ): Promise<number>;

  /**
   * Get all listings for an event date (including all statuses)
   */
  getAllByEventDateId(ctx: Ctx, eventDateId: string): Promise<TicketListing[]>;

  /**
   * Get pending listings by event section ID
   */
  getPendingByEventSectionId(
    ctx: Ctx,
    eventSectionId: string,
  ): Promise<TicketListing[]>;

  /**
   * Get all listings for an event section (including all statuses)
   */
  getAllByEventSectionId(
    ctx: Ctx,
    eventSectionId: string,
  ): Promise<TicketListing[]>;

  /**
   * Get all listings for an event (including all statuses)
   */
  getAllByEventId(ctx: Ctx, eventId: string): Promise<TicketListing[]>;

  /**
   * Get listing stats (count and available tickets) for multiple event IDs
   */
  getListingStatsByEventIds(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<
    Map<string, { listingsCount: number; availableTicketsCount: number }>
  >;
}

/**
 * Injection token for ITicketsRepository
 */
export const TICKETS_REPOSITORY = Symbol('ITicketsRepository');
