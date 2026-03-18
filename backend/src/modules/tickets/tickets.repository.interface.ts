import type { Ctx } from '../../common/types/context';
import type {
  TicketListing,
  ListingStatus,
  TicketType,
} from './tickets.domain';

/**
 * Options for paginated listing list with DB-level filters
 */
export interface ListListingsPaginatedOpts {
  eventId?: string;
  eventDateId?: string;
  sellerId?: string;
  /** When none of eventId/eventDateId/sellerId set, scope is active listings */
  type?: TicketType;
  minPrice?: number;
  maxPrice?: number;
  limit: number;
  offset: number;
}

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
   * Find listings by IDs (batch)
   */
  findByIds(ctx: Ctx, ids: string[]): Promise<TicketListing[]>;

  /**
   * Get all listings
   */
  getAll(ctx: Ctx): Promise<TicketListing[]>;

  /**
   * List listings with optional filters and pagination (DB-level).
   * Exactly one of eventId, eventDateId, sellerId may be set, or none for all active.
   */
  listListingsPaginated(
    ctx: Ctx,
    opts: ListListingsPaginatedOpts,
  ): Promise<{ listings: TicketListing[]; total: number }>;

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
   * Get pending listings for multiple event IDs (batch, status = Pending).
   */
  getPendingByEventIds(ctx: Ctx, eventIds: string[]): Promise<TicketListing[]>;

  /**
   * Minimum pricePerTicket.amount (cents) per event among Active listings
   * that have at least one available ticket unit.
   */
  getMinActiveListingPriceByEventIds(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<Map<string, { amount: number; currency: string }>>;

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

  /**
   * Find listing by ID with pessimistic lock (FOR UPDATE)
   */
  findByIdForUpdate(ctx: Ctx, id: string): Promise<TicketListing | undefined>;

  /**
   * Reserve units with pessimistic locking
   * @throws BadRequestException if units not available
   */
  reserveUnitsWithLock(
    ctx: Ctx,
    listingId: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing>;

  /**
   * Restore units with pessimistic locking
   * @throws BadRequestException if units not reserved
   */
  restoreUnitsWithLock(
    ctx: Ctx,
    listingId: string,
    ticketUnitIds: string[],
  ): Promise<TicketListing>;

  /**
   * Update listing with version check (optimistic locking pattern)
   * Should be used within a transaction after acquiring pessimistic lock
   * @throws OptimisticLockException on version mismatch
   */
  updateWithVersion(
    ctx: Ctx,
    id: string,
    updates: Partial<TicketListing>,
    expectedVersion: number,
  ): Promise<TicketListing>;
}

/**
 * Injection token for ITicketsRepository
 */
export const TICKETS_REPOSITORY = Symbol('ITicketsRepository');
