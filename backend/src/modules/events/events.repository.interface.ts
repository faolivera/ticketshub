import type { Ctx } from '../../common/types/context';
import type { Event, EventDate, EventSection } from './events.domain';
import type {
  EventDateStatus,
  EventSectionStatus,
  EventStatus,
  EventCategory,
} from './events.domain';

/**
 * Events repository interface
 */
export interface IEventsRepository {
  // ==================== Events ====================

  /**
   * Create a new event
   */
  createEvent(ctx: Ctx, event: Event): Promise<Event>;

  /**
   * Find event by ID
   */
  findEventById(ctx: Ctx, id: string): Promise<Event | undefined>;

  /**
   * Find event by slug
   */
  findEventBySlug(ctx: Ctx, slug: string): Promise<Event | undefined>;

  /**
   * Get all events
   */
  getAllEvents(ctx: Ctx): Promise<Event[]>;

  /**
   * Find events by IDs (batch)
   */
  findEventsByIds(ctx: Ctx, ids: string[]): Promise<Event[]>;

  /**
   * Get set of existing import source keys ("sourceCode:sourceId") for events that have importInfo.
   * Used to dedupe import payloads against already-imported events.
   */
  getExistingImportSourceKeys(ctx: Ctx): Promise<Set<string>>;

  /**
   * Get dates for multiple events (batch)
   */
  getDatesByEventIds(ctx: Ctx, eventIds: string[]): Promise<EventDate[]>;

  /**
   * Get sections for multiple events (batch)
   */
  getSectionsByEventIds(ctx: Ctx, eventIds: string[]): Promise<EventSection[]>;

  /**
   * Get approved events
   */
  getApprovedEvents(ctx: Ctx): Promise<Event[]>;

  /**
   * List events with optional filters and pagination (DB-level).
   * When approvedOnly is true, only approved events; otherwise all.
   */
  listEventsPaginated(
    ctx: Ctx,
    opts: {
      approvedOnly: boolean;
      status?: EventStatus;
      category?: EventCategory;
      search?: string;
      limit: number;
      offset: number;
    },
  ): Promise<{ events: Event[]; total: number }>;

  /**
   * Get pending events (for admin)
   * Returns events that are pending OR have pending dates OR have pending sections
   */
  getPendingEvents(ctx: Ctx): Promise<Event[]>;

  /**
   * Get events by creator
   */
  getEventsByCreator(ctx: Ctx, userId: string): Promise<Event[]>;

  /**
   * Update event
   */
  updateEvent(
    ctx: Ctx,
    id: string,
    updates: Partial<Event>,
  ): Promise<Event | undefined>;

  /**
   * Get ranking-related components for many events in one go (active listings count, next event date).
   * Used by event-scoring job to avoid N+1.
   */
  getEventRankingComponentsBatch(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<Map<string, { hasActiveListings: boolean; activeListingsCount: number; nextEventDate: Date | null; isPopular: boolean }>>;

  /**
   * Update ranking score and updatedAt for multiple events. Used by event-scoring job.
   */
  updateEventRankingBatch(
    ctx: Ctx,
    updates: Array<{ eventId: string; rankingScore: number; rankingUpdatedAt: Date }>,
  ): Promise<void>;

  /**
   * Delete event
   */
  deleteEvent(ctx: Ctx, id: string): Promise<void>;

  /**
   * Get all events with optional search filter, returning paginated results
   */
  getAllEventsPaginated(
    ctx: Ctx,
    options: { page: number; limit: number; search?: string },
  ): Promise<{ events: Event[]; total: number }>;

  /**
   * Get approved events for selection UI with pagination
   */
  getApprovedEventsForSelection(
    ctx: Ctx,
    options: { limit: number; offset: number; search?: string },
  ): Promise<{ events: Event[]; total: number }>;

  // ==================== Event Dates ====================

  /**
   * Create a new event date
   */
  createEventDate(ctx: Ctx, date: EventDate): Promise<EventDate>;

  /**
   * Find event date by ID
   */
  findEventDateById(ctx: Ctx, id: string): Promise<EventDate | undefined>;

  /**
   * Find event dates by IDs (batch)
   */
  findEventDatesByIds(ctx: Ctx, ids: string[]): Promise<EventDate[]>;

  /**
   * Get dates for an event
   */
  getDatesByEventId(ctx: Ctx, eventId: string): Promise<EventDate[]>;

  /**
   * Find event date by eventId and date (for deduplication)
   */
  findEventDateByEventIdAndDate(
    ctx: Ctx,
    eventId: string,
    date: Date,
  ): Promise<EventDate | undefined>;

  /**
   * Get approved dates for an event
   */
  getApprovedDatesByEventId(ctx: Ctx, eventId: string): Promise<EventDate[]>;

  /**
   * Get dates for an event filtered by status
   */
  getDatesByEventIdAndStatus(
    ctx: Ctx,
    eventId: string,
    statuses: EventDateStatus[],
  ): Promise<EventDate[]>;

  /**
   * Get pending dates (for admin)
   */
  getPendingDates(ctx: Ctx): Promise<EventDate[]>;

  /**
   * Update event date
   */
  updateEventDate(
    ctx: Ctx,
    id: string,
    updates: Partial<EventDate>,
  ): Promise<EventDate | undefined>;

  /**
   * Delete event date
   */
  deleteEventDate(ctx: Ctx, id: string): Promise<void>;

  // ==================== Event Sections ====================

  /**
   * Create a new event section
   */
  createEventSection(ctx: Ctx, section: EventSection): Promise<EventSection>;

  /**
   * Find event section by ID
   */
  findEventSectionById(ctx: Ctx, id: string): Promise<EventSection | undefined>;

  /**
   * Get sections for an event
   */
  getSectionsByEventId(ctx: Ctx, eventId: string): Promise<EventSection[]>;

  /**
   * Get approved sections for an event
   */
  getApprovedSectionsByEventId(
    ctx: Ctx,
    eventId: string,
  ): Promise<EventSection[]>;

  /**
   * Get sections for an event filtered by status
   */
  getSectionsByEventIdAndStatus(
    ctx: Ctx,
    eventId: string,
    statuses: EventSectionStatus[],
  ): Promise<EventSection[]>;

  /**
   * Get pending sections (for admin)
   */
  getPendingSections(ctx: Ctx): Promise<EventSection[]>;

  /**
   * Find section by event ID and name (for uniqueness validation)
   */
  findSectionByEventAndName(
    ctx: Ctx,
    eventId: string,
    name: string,
  ): Promise<EventSection | undefined>;

  /**
   * Update event section
   */
  updateEventSection(
    ctx: Ctx,
    id: string,
    updates: Partial<EventSection>,
  ): Promise<EventSection | undefined>;

  /**
   * Delete event section
   */
  deleteEventSection(ctx: Ctx, id: string): Promise<void>;
}

/**
 * Injection token for IEventsRepository
 */
export const EVENTS_REPOSITORY = Symbol('IEventsRepository');
