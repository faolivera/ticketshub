import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  forwardRef,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as sharp from 'sharp';
import type { IEventsRepository } from './events.repository.interface';
import { EVENTS_REPOSITORY } from './events.repository.interface';
import type { IImagesRepository } from '../images/images.repository.interface';
import { IMAGES_REPOSITORY } from '../images/images.repository.interface';
import { TicketsService } from '../tickets/tickets.service';
import { TransactionsService } from '../transactions/transactions.service';
import { EventBannerStorageService } from './event-banner-storage.service';
import { ContextLogger } from '../../common/logger/context-logger';
import { EventDateExpiredException } from '../../common/exceptions';
import type { Ctx } from '../../common/types/context';
import type { Image } from '../images/images.domain';
import type {
  Event,
  EventDate,
  EventSection,
  EventWithDates,
  EventBanner,
  EventBannerType,
  EventBanners,
} from './events.domain';
import {
  EventStatus,
  EventDateStatus,
  EventSectionStatus,
  EventCategory,
  BANNER_CONSTRAINTS,
  ALLOWED_BANNER_MIME_TYPES,
  generateEventSlug,
} from './events.domain';
import type {
  CreateEventRequest,
  AddEventDateRequest,
  AddEventSectionRequest,
  ListEventsQuery,
  EventWithDatesResponse,
  PublicListEventItem,
  UploadEventBannerResponse,
  GetEventBannersResponse,
  DeleteEventBannerResponse,
  EventSelectQuery,
  EventSelectResponse,
  EventSelectItem,
} from './events.api';
import type {
  AdminUpdateEventRequest,
  AdminUpdateEventResponse,
  AdminUpdateSectionRequest,
} from '../admin/admin.api';
import { Role } from '../users/users.domain';
import { SeatingType } from '../tickets/tickets.domain';
import { UsersService } from '../users/users.service';
import { VerificationHelper } from '../../common/utils/verification-helper';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEventType } from '../notifications/notifications.domain';
import { EventScoringService } from '../event-scoring/event-scoring.service';
import { PlatformConfigService } from '../config/config.service';
import { AddressService } from '../address/address.service';

@Injectable()
export class EventsService {
  private readonly logger = new ContextLogger(EventsService.name);

  constructor(
    @Inject(EVENTS_REPOSITORY)
    private readonly eventsRepository: IEventsRepository,
    @Inject(IMAGES_REPOSITORY)
    private readonly imagesRepository: IImagesRepository,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
    @Inject(EventBannerStorageService)
    private readonly bannerStorage: EventBannerStorageService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => EventScoringService))
    private readonly eventScoringService: EventScoringService,
    @Inject(PlatformConfigService)
    private readonly platformConfigService: PlatformConfigService,
    @Inject(AddressService)
    private readonly addressService: AddressService,
  ) {}

  /**
   * Generate a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Normalize datetime to minute precision (strip seconds and milliseconds).
   * Preserves timezone semantics from ISO input.
   */
  private normalizeDatetimeToMinute(isoOrDate: string | Date): Date {
    const d = new Date(isoOrDate);
    const ms = d.getTime();
    const truncated = Math.floor(ms / 60000) * 60000;
    return new Date(truncated);
  }

  /**
   * Compute the cutoff date for ticket purchasing.
   * Listings whose event date falls before this cutoff are unavailable.
   */
  async getTicketCutoffDate(ctx: Ctx): Promise<Date> {
    const config = await this.platformConfigService.getPlatformConfig(ctx);
    const offsetMs = config.minimumHoursToBuyTickets * 60 * 60 * 1000;
    return new Date(Date.now() + offsetMs);
  }

  /**
   * Assert that an event date is still available for purchase (not past the cutoff).
   * Throws BadRequestException if the date is expired or not found.
   */
  async assertEventDateNotExpired(
    ctx: Ctx,
    eventDateId: string,
  ): Promise<void> {
    const cutoff = await this.getTicketCutoffDate(ctx);
    const eventDate = await this.eventsRepository.findEventDateById(
      ctx,
      eventDateId,
    );
    if (!eventDate || eventDate.date < cutoff) {
      throw new EventDateExpiredException();
    }
  }

  /**
   * Create a new event
   */
  async createEvent(
    ctx: Ctx,
    userId: string,
    userRole: Role,
    data: CreateEventRequest,
  ): Promise<Event> {
    const isAdmin = userRole === Role.Admin;
    const user = await this.usersService.findById(ctx, userId);
    const canSell = user ? VerificationHelper.canSell(user) : false;
    const canCreate = isAdmin || canSell;

    if (!canCreate) {
      throw new ForbiddenException(
        'Only sellers (with email and phone verified) and admins can create events',
      );
    }

    const eventId = this.generateId('evt');
    let slug: string;
    if (data.slug != null && data.slug.trim() !== '') {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(data.slug.trim())) {
        throw new BadRequestException(
          'Slug must be lowercase letters, numbers, and hyphens only',
        );
      }
      const existing = await this.eventsRepository.findEventBySlug(
        ctx,
        data.slug.trim(),
      );
      if (existing) {
        throw new ConflictException(
          `Event with slug "${data.slug.trim()}" already exists`,
        );
      }
      slug = data.slug.trim();
    } else {
      slug = generateEventSlug(data.name, data.venue, eventId);
    }
    const event: Event = {
      id: eventId,
      slug,
      name: data.name,
      category: data.category,
      venue: data.venue,
      location: this.addressService.normalizeCity(data.location),
      imageIds: data.imageIds || [],
      importInfo: data.importInfo,
      status: isAdmin ? EventStatus.Approved : EventStatus.Pending,
      createdBy: userId,
      approvedBy: isAdmin ? userId : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPopular: data.isPopular ?? false,
      highlight: false,
      ticketApp: data.ticketApp,
      transferable: data.transferable,
      artists: data.artists ?? [],
    };

    return await this.eventsRepository.createEvent(ctx, event);
  }

  /**
   * Get event by ID with dates and sections
   */
  async getEventById(ctx: Ctx, id: string): Promise<EventWithDatesResponse> {
    const event = await this.eventsRepository.findEventById(ctx, id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const [dates, sections] = await Promise.all([
      this.eventsRepository.getDatesByEventId(ctx, id),
      this.eventsRepository.getSectionsByEventId(ctx, id),
    ]);
    const [eventWithImages] = await this.attachImages(ctx, [
      { ...event, dates, sections },
    ]);
    return eventWithImages;
  }

  /**
   * Get event date by ID
   */
  async findEventDateById(ctx: Ctx, id: string): Promise<EventDate | undefined> {
    return this.eventsRepository.findEventDateById(ctx, id);
  }

  /**
   * Get event by slug with dates and sections (for public event page URL)
   */
  async getEventBySlug(
    ctx: Ctx,
    slug: string,
  ): Promise<EventWithDatesResponse> {
    const event = await this.eventsRepository.findEventBySlug(ctx, slug);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const [dates, sections] = await Promise.all([
      this.eventsRepository.getDatesByEventId(ctx, event.id),
      this.eventsRepository.getSectionsByEventId(ctx, event.id),
    ]);
    const [eventWithImages] = await this.attachImages(ctx, [
      { ...event, dates, sections },
    ]);
    return eventWithImages;
  }

  /**
   * Get events by IDs with dates and sections (batch).
   * Returns empty array for missing IDs; does not throw.
   */
  async getEventsByIds(
    ctx: Ctx,
    ids: string[],
  ): Promise<EventWithDatesResponse[]> {
    if (ids.length === 0) return [];
    const events = await this.eventsRepository.findEventsByIds(ctx, ids);
    if (events.length === 0) return [];

    const [allDates, allSections] = await Promise.all([
      this.eventsRepository.getDatesByEventIds(ctx, ids),
      this.eventsRepository.getSectionsByEventIds(ctx, ids),
    ]);
    const datesByEvent = new Map<string, EventDate[]>();
    const sectionsByEvent = new Map<string, EventSection[]>();
    for (const d of allDates) {
      const arr = datesByEvent.get(d.eventId) ?? [];
      arr.push(d);
      datesByEvent.set(d.eventId, arr);
    }
    for (const s of allSections) {
      const arr = sectionsByEvent.get(s.eventId) ?? [];
      arr.push(s);
      sectionsByEvent.set(s.eventId, arr);
    }

    const eventsWithDates: EventWithDates[] = events.map((event) => ({
      ...event,
      dates: datesByEvent.get(event.id) ?? [],
      sections: sectionsByEvent.get(event.id) ?? [],
    }));

    return await this.attachImages(ctx, eventsWithDates);
  }

  /**
   * Get set of existing import source keys ("sourceCode:sourceId") for events that have importInfo.
   * Used by admin import to dedupe against already-imported events.
   */
  async getExistingImportSourceKeys(ctx: Ctx): Promise<Set<string>> {
    return this.eventsRepository.getExistingImportSourceKeys(ctx);
  }

  /**
   * Get ranking components (active listings, next date) for many events. Used by event-scoring job.
   */
  async getEventRankingComponentsBatch(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<
    Map<
      string,
      {
        hasActiveListings: boolean;
        activeListingsCount: number;
        nextEventDate: Date | null;
        isPopular: boolean;
        city: string;
      }
    >
  > {
    return this.eventsRepository.getEventRankingComponentsBatch(ctx, eventIds);
  }

  /**
   * Update ranking score for multiple events. Used by event-scoring job.
   */
  async updateEventRankingBatch(
    ctx: Ctx,
    updates: Array<{ eventId: string; rankingScore: number; rankingUpdatedAt: Date }>,
  ): Promise<void> {
    return this.eventsRepository.updateEventRankingBatch(ctx, updates);
  }

  /**
   * List events with optional filters
   * Always includes pending and approved dates/sections (excludes rejected)
   */
  async listEvents(
    ctx: Ctx,
    query: ListEventsQuery,
    includeAllStatuses: boolean = false,
  ): Promise<EventWithDatesResponse[]> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const isPublicListing = !includeAllStatuses && !query.search?.trim();
    const cutoffDate = includeAllStatuses
      ? undefined
      : await this.getTicketCutoffDate(ctx);
    const result = await this.eventsRepository.listEventsPaginated(ctx, {
      approvedOnly: !includeAllStatuses,
      status: query.status as EventStatus | undefined,
      category: query.category,
      search: query.search,
      limit,
      offset,
      orderBy: isPublicListing ? 'rankingScore' : 'createdAt',
      highlighted: query.highlighted,
      cutoffDate,
    });

    const events = result.events;
    if (events.length === 0) {
      return [];
    }

    const eventIds = events.map((e) => e.id);
    const [allDates, allSections] = await Promise.all([
      this.eventsRepository.getDatesByEventIds(ctx, eventIds),
      this.eventsRepository.getSectionsByEventIds(ctx, eventIds),
    ]);

    const allowedDateStatuses = includeAllStatuses
      ? undefined
      : [EventDateStatus.Pending, EventDateStatus.Approved];
    const allowedSectionStatuses = includeAllStatuses
      ? undefined
      : [EventSectionStatus.Pending, EventSectionStatus.Approved];

    const datesByEvent = new Map<string, EventDate[]>();
    const sectionsByEvent = new Map<string, EventSection[]>();
    for (const d of allDates) {
      if (
        allowedDateStatuses === undefined ||
        allowedDateStatuses.includes(d.status)
      ) {
        const arr = datesByEvent.get(d.eventId) ?? [];
        arr.push(d);
        datesByEvent.set(d.eventId, arr);
      }
    }
    for (const s of allSections) {
      if (
        allowedSectionStatuses === undefined ||
        allowedSectionStatuses.includes(s.status)
      ) {
        const arr = sectionsByEvent.get(s.eventId) ?? [];
        arr.push(s);
        sectionsByEvent.set(s.eventId, arr);
      }
    }

    const eventsWithDates: EventWithDates[] = events.map((event) => ({
      ...event,
      dates: datesByEvent.get(event.id) ?? [],
      sections: sectionsByEvent.get(event.id) ?? [],
    }));

    const withImages = await this.attachImages(ctx, eventsWithDates);
    const minByEvent =
      await this.ticketsService.getMinActiveListingPriceByEventIds(
        ctx,
        withImages.map((e) => e.id),
      );
    const mappedEvents = withImages.map((e) => {
      const lp = minByEvent.get(e.id);
      return lp ? { ...e, lowestListingPrice: lp } : e;
    });
    return mappedEvents;
  }

  /**
   * Add a date to an event
   */
  async addEventDate(
    ctx: Ctx,
    eventId: string,
    userId: string,
    userRole: Role,
    data: AddEventDateRequest,
  ): Promise<EventDate> {
    const event = await this.eventsRepository.findEventById(ctx, eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const normalizedDate = this.normalizeDatetimeToMinute(data.date);
    const existing = await this.eventsRepository.findEventDateByEventIdAndDate(
      ctx,
      eventId,
      normalizedDate,
    );
    if (existing) {
      throw new ConflictException(
        'An event date with this date already exists for this event',
      );
    }

    // Only event creator or admin can add dates
    const isAdmin = userRole === Role.Admin;

    const eventDate: EventDate = {
      id: this.generateId('edt'),
      eventId,
      date: normalizedDate,
      status: isAdmin ? EventDateStatus.Approved : EventDateStatus.Pending,
      createdBy: userId,
      approvedBy: isAdmin ? userId : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.eventsRepository.createEventDate(ctx, eventDate);
  }

  /**
   * Approve or reject an event (admin only)
   * When approved, activates pending listings for this event
   * Requires square banner to be uploaded for approval
   */
  async approveEvent(
    ctx: Ctx,
    eventId: string,
    adminId: string,
    approved: boolean,
    rejectionReason?: string,
  ): Promise<Event> {
    const event = await this.eventsRepository.findEventById(ctx, eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== EventStatus.Pending) {
      throw new BadRequestException('Event is not pending approval');
    }

    if (!approved && !rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    if (approved && !event.banners?.square) {
      throw new BadRequestException(
        'Square banner is required for event approval',
      );
    }

    const updated = await this.eventsRepository.updateEvent(ctx, eventId, {
      status: approved ? EventStatus.Approved : EventStatus.Rejected,
      approvedBy: approved ? adminId : undefined,
      rejectionReason: approved ? undefined : rejectionReason,
    });

    if (!updated) {
      throw new NotFoundException('Event not found');
    }

    if (approved) {
      await this.ticketsService.activatePendingListingsForEvent(ctx, eventId);
      void this.eventScoringService
        .requestScoring(ctx, eventId)
        .catch((err) =>
          this.logger.error(ctx, 'Event scoring enqueue failed', {
            eventId,
            error: err,
          }),
        );
    }

    await this.notificationsService.emit(
      ctx,
      approved
        ? NotificationEventType.EVENT_APPROVED
        : NotificationEventType.EVENT_REJECTED,
      {
        eventId: updated.id,
        eventSlug: updated.slug,
        eventName: updated.name,
        organizerId: updated.createdBy,
        ...(approved ? {} : { rejectionReason: rejectionReason ?? '' }),
      },
      adminId,
    );

    return updated;
  }

  /**
   * Approve or reject an event date (admin only)
   * When approved, activates pending listings for this date
   */
  async approveEventDate(
    ctx: Ctx,
    dateId: string,
    adminId: string,
    approved: boolean,
    rejectionReason?: string,
  ): Promise<EventDate> {
    const eventDate = await this.eventsRepository.findEventDateById(
      ctx,
      dateId,
    );
    if (!eventDate) {
      throw new NotFoundException('Event date not found');
    }

    if (eventDate.status !== EventDateStatus.Pending) {
      throw new BadRequestException('Event date is not pending approval');
    }

    if (!approved && !rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updated = await this.eventsRepository.updateEventDate(ctx, dateId, {
      status: approved ? EventDateStatus.Approved : EventDateStatus.Rejected,
      approvedBy: approved ? adminId : undefined,
      rejectionReason: approved ? undefined : rejectionReason,
    });

    if (!updated) {
      throw new NotFoundException('Event date not found');
    }

    if (approved) {
      await this.ticketsService.activatePendingListingsForEventDate(
        ctx,
        dateId,
        eventDate.eventId,
      );
      void this.eventScoringService
        .requestScoring(ctx, eventDate.eventId)
        .catch((err) =>
          this.logger.error(ctx, 'Event scoring enqueue failed', {
            eventId: eventDate.eventId,
            error: err,
          }),
        );
    }

    return updated;
  }

  /**
   * Get pending events for admin review
   */
  async getPendingEvents(ctx: Ctx): Promise<EventWithDatesResponse[]> {
    const events = await this.eventsRepository.getPendingEvents(ctx);

    if (events.length === 0) return [];

    const eventIds = events.map((e) => e.id);
    const [allDates, allSections] = await Promise.all([
      this.eventsRepository.getDatesByEventIds(ctx, eventIds),
      this.eventsRepository.getSectionsByEventIds(ctx, eventIds),
    ]);

    const datesByEvent = new Map<string, EventDate[]>();
    const sectionsByEvent = new Map<string, EventSection[]>();
    for (const d of allDates) {
      const arr = datesByEvent.get(d.eventId) ?? [];
      arr.push(d);
      datesByEvent.set(d.eventId, arr);
    }
    for (const s of allSections) {
      const arr = sectionsByEvent.get(s.eventId) ?? [];
      arr.push(s);
      sectionsByEvent.set(s.eventId, arr);
    }

    const eventsWithDates: EventWithDates[] = events.map((event) => ({
      ...event,
      dates: datesByEvent.get(event.id) ?? [],
      sections: sectionsByEvent.get(event.id) ?? [],
    }));

    return await this.attachImages(ctx, eventsWithDates);
  }

  // ==================== Event Sections ====================

  /**
   * Add a section to an event
   * Section names must be unique per event (case-insensitive)
   */
  async addEventSection(
    ctx: Ctx,
    eventId: string,
    userId: string,
    userRole: Role,
    data: AddEventSectionRequest,
  ): Promise<EventSection> {
    const event = await this.eventsRepository.findEventById(ctx, eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isAdmin = userRole === Role.Admin;

    const existingSections = await this.eventsRepository.getSectionsByEventId(
      ctx,
      eventId,
    );
    const normalizedName = data.name.toLowerCase();
    const duplicate = existingSections.find(
      (s) => s.name.toLowerCase() === normalizedName,
    );
    if (duplicate) {
      throw new BadRequestException(
        `Section "${data.name}" already exists for this event`,
      );
    }

    const section: EventSection = {
      id: this.generateId('sec'),
      eventId,
      name: data.name,
      seatingType: data.seatingType,
      status: isAdmin
        ? EventSectionStatus.Approved
        : EventSectionStatus.Pending,
      createdBy: userId,
      approvedBy: isAdmin ? userId : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return await this.eventsRepository.createEventSection(ctx, section);
  }

  /**
   * Approve or reject an event section (admin only)
   * When approved, activates pending listings for this section
   */
  async approveEventSection(
    ctx: Ctx,
    sectionId: string,
    adminId: string,
    approved: boolean,
    rejectionReason?: string,
  ): Promise<EventSection> {
    const section = await this.eventsRepository.findEventSectionById(
      ctx,
      sectionId,
    );
    if (!section) {
      throw new NotFoundException('Event section not found');
    }

    if (section.status !== EventSectionStatus.Pending) {
      throw new BadRequestException('Event section is not pending approval');
    }

    if (!approved && !rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updated = await this.eventsRepository.updateEventSection(
      ctx,
      sectionId,
      {
        status: approved
          ? EventSectionStatus.Approved
          : EventSectionStatus.Rejected,
        approvedBy: approved ? adminId : undefined,
        rejectionReason: approved ? undefined : rejectionReason,
      },
    );

    if (!updated) {
      throw new NotFoundException('Event section not found');
    }

    if (approved) {
      await this.ticketsService.activatePendingListingsForEventSection(
        ctx,
        sectionId,
        section.eventId,
      );
      void this.eventScoringService
        .requestScoring(ctx, section.eventId)
        .catch((err) =>
          this.logger.error(ctx, 'Event scoring enqueue failed', {
            eventId: section.eventId,
            error: err,
          }),
        );
    }

    return updated;
  }

  /**
   * Get sections for an event
   */
  async getSectionsByEventId(
    ctx: Ctx,
    eventId: string,
  ): Promise<EventSection[]> {
    return await this.eventsRepository.getSectionsByEventId(ctx, eventId);
  }

  /**
   * Get approved sections for an event
   */
  async getApprovedSectionsByEventId(
    ctx: Ctx,
    eventId: string,
  ): Promise<EventSection[]> {
    return await this.eventsRepository.getApprovedSectionsByEventId(
      ctx,
      eventId,
    );
  }

  /**
   * Get pending sections for admin review
   */
  async getPendingSections(ctx: Ctx): Promise<EventSection[]> {
    return await this.eventsRepository.getPendingSections(ctx);
  }

  /**
   * Find section by ID
   */
  async findSectionById(
    ctx: Ctx,
    sectionId: string,
  ): Promise<EventSection | undefined> {
    return await this.eventsRepository.findEventSectionById(ctx, sectionId);
  }

  /**
   * Update an event section (admin only).
   * Updates name and/or seating type. At least one field must be provided.
   */
  async adminUpdateEventSection(
    ctx: Ctx,
    sectionId: string,
    data: AdminUpdateSectionRequest,
  ): Promise<EventSection> {
    const section = await this.eventsRepository.findEventSectionById(
      ctx,
      sectionId,
    );
    if (!section) {
      throw new NotFoundException('Event section not found');
    }

    const updates: Partial<EventSection> = {};

    if (data.name !== undefined) {
      const existingSections = await this.eventsRepository.getSectionsByEventId(
        ctx,
        section.eventId,
      );
      const normalizedName = data.name.toLowerCase();
      const duplicate = existingSections.find(
        (s) => s.id !== sectionId && s.name.toLowerCase() === normalizedName,
      );
      if (duplicate) {
        throw new BadRequestException(
          `Section "${data.name}" already exists for this event`,
        );
      }
      updates.name = data.name;
    }

    if (data.seatingType !== undefined) {
      updates.seatingType =
        data.seatingType === 'numbered'
          ? (SeatingType.Numbered as EventSection['seatingType'])
          : (SeatingType.Unnumbered as EventSection['seatingType']);
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException(
        'At least one of name or seatingType must be provided',
      );
    }

    const updated = await this.eventsRepository.updateEventSection(
      ctx,
      sectionId,
      updates,
    );

    if (!updated) {
      throw new NotFoundException('Event section not found');
    }

    return updated;
  }

  /**
   * Delete an event section (admin only).
   * Throws if section has any listings.
   */
  async deleteEventSection(ctx: Ctx, sectionId: string): Promise<void> {
    const section = await this.eventsRepository.findEventSectionById(
      ctx,
      sectionId,
    );
    if (!section) {
      throw new NotFoundException('Event section not found');
    }

    const listings = await this.ticketsService.getListingsBySectionId(
      ctx,
      sectionId,
    );

    if (listings.length > 0) {
      throw new BadRequestException(
        `Cannot delete section: has ${listings.length} listing(s). Remove listings first.`,
      );
    }

    await this.eventsRepository.deleteEventSection(ctx, sectionId);
    this.logger.log(ctx, `Deleted event section ${sectionId}`);
  }

  private async attachImages(
    ctx: Ctx,
    events: EventWithDates[],
  ): Promise<EventWithDatesResponse[]> {
    const imageIds = Array.from(
      new Set(events.flatMap((event) => event.imageIds || [])),
    );
    const images = imageIds.length
      ? await this.imagesRepository.findByIds(ctx, imageIds)
      : [];
    const imagesMap = new Map<string, Image>(
      images.map((image) => [image.id, image]),
    );

    return Promise.all(
      events.map(async (event) => {
        const { importInfo: _importInfo, ...eventPublic } = event;
        const result: EventWithDatesResponse = {
          ...eventPublic,
          images: this.resolveImages(event.imageIds || [], imagesMap),
        };

        if (event.banners) {
          const bannerUrls: { square?: string; rectangle?: string; og_image?: string } = {};
          if (event.banners.square) {
            bannerUrls.square = this.bannerStorage.getPublicUrl(
              event.id,
              event.banners.square.filename,
            );
          }
          if (event.banners.rectangle) {
            bannerUrls.rectangle = this.bannerStorage.getPublicUrl(
              event.id,
              event.banners.rectangle.filename,
            );
          }
          if (event.banners.og_image) {
            bannerUrls.og_image = this.bannerStorage.getPublicUrl(
              event.id,
              event.banners.og_image.filename,
            );
          }
          if (Object.keys(bannerUrls).length > 0) {
            result.bannerUrls = bannerUrls;
          }
        }

        return result;
      }),
    );
  }

  /**
   * Map full event to public shape (no sensitive or internal fields).
   * Used by GET /api/events (list), GET /api/events/:id, and BFF event-page.
   */
  toPublicEventItem(
    event: EventWithDatesResponse,
    options?: { includeStatus?: boolean; cutoffDate?: Date },
  ): PublicListEventItem {
    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      category: event.category,
      venue: event.venue,
      location: {
        city: event.location?.city ?? '',
        countryCode: event.location?.countryCode ?? '',
      },
      createdAt:
        event.createdAt instanceof Date
          ? event.createdAt.toISOString()
          : String(event.createdAt),
      ...(options?.includeStatus !== false && { status: event.status }),
      bannerUrls: event.bannerUrls,
      images: (event.images ?? []).map((img) => ({ src: img.src })),
      dates: (event.dates ?? [])
        .filter(
          (d) =>
            options?.cutoffDate === undefined ||
            new Date(d.date) >= options.cutoffDate!,
        )
        .map((d) => ({
          id: d.id,
          date: d.date instanceof Date ? d.date.toISOString() : String(d.date),
          status: d.status,
        })),
      sections: (event.sections ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        seatingType: s.seatingType,
      })),
      ...(event.lowestListingPrice != null && {
        lowestListingPrice: {
          amount: event.lowestListingPrice.amount,
          currency: event.lowestListingPrice.currency,
        },
      }),
    };
  }

  private resolveImages(
    imageIds: string[],
    imagesMap: Map<string, Image>,
  ): Image[] {
    if (!imageIds.length) return [];
    return imageIds
      .map((id) => imagesMap.get(id))
      .filter((img): img is Image => img != null);
  }

  /**
   * Admin update event with dates.
   * Supports updating event fields, adding/updating/deleting dates.
   */
  async adminUpdateEventWithDates(
    ctx: Ctx,
    eventId: string,
    data: AdminUpdateEventRequest,
    adminId: string,
  ): Promise<AdminUpdateEventResponse> {
    this.logger.log(ctx, `Admin updating event ${eventId}`);

    const event = await this.eventsRepository.findEventById(ctx, eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const warnings: string[] = [];
    const deletedDateIds: string[] = [];

    // 1. Handle date deletions first (batch load dates to avoid N+1)
    if (data.datesToDelete && data.datesToDelete.length > 0) {
      const datesToDelete = await this.eventsRepository.findEventDatesByIds(
        ctx,
        data.datesToDelete,
      );
      const dateMap = new Map(datesToDelete.map((d) => [d.id, d]));

      for (const dateId of data.datesToDelete) {
        const eventDate = dateMap.get(dateId);
        if (!eventDate) {
          this.logger.warn(ctx, `Date ${dateId} not found, skipping deletion`);
          continue;
        }

        if (eventDate.eventId !== eventId) {
          throw new BadRequestException(
            `Date ${dateId} does not belong to event ${eventId}`,
          );
        }

        // Check for listings on this date
        const listings = await this.ticketsService.getListingsByDateId(
          ctx,
          dateId,
        );

        if (listings.length > 0) {
          const listingIds = listings.map((l) => l.id);

          // Check for completed transactions
          const hasCompletedTransactions =
            await this.transactionsService.hasCompletedTransactionsForListings(
              ctx,
              listingIds,
            );

          if (hasCompletedTransactions) {
            throw new BadRequestException(
              `Cannot delete date ${dateId}: has completed transactions`,
            );
          }

          // Cancel pending/active listings
          const { cancelledCount } =
            await this.ticketsService.cancelListingsByDateId(ctx, dateId);

          if (cancelledCount > 0) {
            warnings.push(
              `Cancelled ${cancelledCount} listing(s) for deleted date ${dateId}`,
            );
          }
        }

        // Delete the date
        await this.eventsRepository.deleteEventDate(ctx, dateId);
        deletedDateIds.push(dateId);
        this.logger.log(ctx, `Deleted event date ${dateId}`);
      }
    }

    // 2. Update event fields
    const eventUpdates: Partial<Event> = {};
    if (data.name !== undefined) eventUpdates.name = data.name;
    if (data.slug !== undefined) eventUpdates.slug = data.slug;
    if (data.category !== undefined)
      eventUpdates.category = data.category as EventCategory;
    if (data.venue !== undefined) eventUpdates.venue = data.venue;
    if (data.location !== undefined) eventUpdates.location = data.location;
    if (data.imageIds !== undefined) eventUpdates.imageIds = data.imageIds;
    if (data.isPopular !== undefined) eventUpdates.isPopular = data.isPopular;
    if (data.highlight !== undefined) {
      eventUpdates.highlight = data.highlight;
    }

    if (Object.keys(eventUpdates).length > 0) {
      const result = await this.eventsRepository.updateEvent(
        ctx,
        eventId,
        eventUpdates,
      );
      if (!result) {
        throw new NotFoundException('Event not found after update');
      }
    }

    // 3. Handle date updates and creations (batch load existing dates to avoid N+1)
    if (data.dates && data.dates.length > 0) {
      const existingDateIds = data.dates
        .map((d) => d.id)
        .filter((id): id is string => Boolean(id));
      const existingDates =
        existingDateIds.length > 0
          ? await this.eventsRepository.findEventDatesByIds(
              ctx,
              existingDateIds,
            )
          : [];
      const existingDateMap = new Map(existingDates.map((d) => [d.id, d]));

      for (const dateUpdate of data.dates) {
        if (dateUpdate.id) {
          // Update existing date
          const existingDate = existingDateMap.get(dateUpdate.id);
          if (!existingDate) {
            throw new NotFoundException(
              `Event date ${dateUpdate.id} not found`,
            );
          }
          if (existingDate.eventId !== eventId) {
            throw new BadRequestException(
              `Date ${dateUpdate.id} does not belong to event ${eventId}`,
            );
          }

          const normalizedDate = this.normalizeDatetimeToMinute(
            dateUpdate.date,
          );
          const existingWithDate =
            await this.eventsRepository.findEventDateByEventIdAndDate(
              ctx,
              eventId,
              normalizedDate,
            );
          if (existingWithDate && existingWithDate.id !== dateUpdate.id) {
            throw new ConflictException(
              'An event date with this date already exists for this event',
            );
          }

          const dateUpdates: Partial<EventDate> = {
            date: normalizedDate,
          };

          if (dateUpdate.status !== undefined) {
            dateUpdates.status = dateUpdate.status as EventDateStatus;
            if (
              dateUpdate.status === EventDateStatus.Approved &&
              !existingDate.approvedBy
            ) {
              dateUpdates.approvedBy = adminId;
            }
          }

          await this.eventsRepository.updateEventDate(
            ctx,
            dateUpdate.id,
            dateUpdates,
          );
        } else {
          // Create new date
          const normalizedDate = this.normalizeDatetimeToMinute(
            dateUpdate.date,
          );
          const existing =
            await this.eventsRepository.findEventDateByEventIdAndDate(
              ctx,
              eventId,
              normalizedDate,
            );
          if (existing) {
            throw new ConflictException(
              'An event date with this date already exists for this event',
            );
          }

          const newDate: EventDate = {
            id: this.generateId('edt'),
            eventId,
            date: normalizedDate,
            status:
              (dateUpdate.status as EventDateStatus) ||
              EventDateStatus.Approved,
            createdBy: adminId,
            approvedBy:
              !dateUpdate.status ||
              dateUpdate.status === EventDateStatus.Approved
                ? adminId
                : undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          await this.eventsRepository.createEventDate(ctx, newDate);
        }
      }
    }

    // 4. Get final state
    const finalEvent = await this.eventsRepository.findEventById(ctx, eventId);
    if (!finalEvent) {
      throw new NotFoundException('Event not found after update');
    }

    const finalDates = await this.eventsRepository.getDatesByEventId(
      ctx,
      eventId,
    );

    return {
      event: {
        id: finalEvent.id,
        slug: finalEvent.slug,
        name: finalEvent.name,
        category: finalEvent.category,
        venue: finalEvent.venue,
        location: finalEvent.location,
        imageIds: finalEvent.imageIds,
        status: finalEvent.status,
        createdBy: finalEvent.createdBy,
        approvedBy: finalEvent.approvedBy,
        createdAt: finalEvent.createdAt,
        updatedAt: finalEvent.updatedAt,
        isPopular: finalEvent.isPopular,
        highlight: finalEvent.highlight,
      },
      dates: finalDates.map((d) => ({
        id: d.id,
        eventId: d.eventId,
        date: d.date,
        status: d.status,
        createdBy: d.createdBy,
        approvedBy: d.approvedBy,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      deletedDateIds,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get all events with pagination and optional search filter.
   * Used for admin views.
   */
  async getAllEventsPaginated(
    ctx: Ctx,
    options: { page: number; limit: number; search?: string; highlighted?: boolean },
  ): Promise<{ events: Event[]; total: number }> {
    return await this.eventsRepository.getAllEventsPaginated(ctx, options);
  }

  /**
   * Get all dates for the given event IDs in a single query.
   * Used by admin views that need dates without fetching full EventWithDates objects.
   */
  async getDatesByEventIds(ctx: Ctx, eventIds: string[]): Promise<EventDate[]> {
    return this.eventsRepository.getDatesByEventIds(ctx, eventIds);
  }

  /**
   * Get the public URL for a banner stored under a given event.
   * Used by admin views that need to expose banner URLs without direct
   * access to EventBannerStorageService.
   */
  getBannerPublicUrl(eventId: string, filename: string): string {
    return this.bannerStorage.getPublicUrl(eventId, filename);
  }

  /**
   * Retrieve the square banner file content for a given event.
   * Returns null if the event has no square banner or the file is missing in storage.
   * Used by the admin proxy endpoint to stream the image without CORS issues.
   */
  async getSquareBannerContent(
    ctx: Ctx,
    eventId: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
    this.logger.debug(ctx, 'getSquareBannerContent', { eventId });
    const event = await this.eventsRepository.findEventById(ctx, eventId);
    if (!event?.banners?.square) {
      return null;
    }
    const { filename, contentType } = event.banners.square;
    const buffer = await this.bannerStorage.readFile(eventId, filename);
    if (!buffer) {
      this.logger.warn(ctx, `Square banner not found in storage: ${filename}`);
      return null;
    }
    return { buffer, contentType, filename };
  }

  /**
   * Get approved events for selection UI with pagination.
   * Returns minimal event data optimized for grid display.
   */
  async getEventsForSelection(
    ctx: Ctx,
    query: EventSelectQuery,
  ): Promise<EventSelectResponse> {
    const limit = query.limit ?? 12;
    const offset = query.offset ?? 0;

    const { events, total } =
      await this.eventsRepository.getApprovedEventsForSelection(ctx, {
        limit: limit + 1,
        offset,
        search: query.search,
      });

    const hasMore = events.length > limit;
    const resultEvents = hasMore ? events.slice(0, limit) : events;

    const selectItems: EventSelectItem[] = await Promise.all(
      resultEvents.map(async (event) => {
        const item: EventSelectItem = {
          id: event.id,
          name: event.name,
          venue: event.venue,
          category: event.category,
        };

        if (event.banners?.square) {
          item.squareBannerUrl = this.bannerStorage.getPublicUrl(
            event.id,
            event.banners.square.filename,
          );
        }

        if (event.banners?.rectangle) {
          item.rectangleBannerUrl = this.bannerStorage.getPublicUrl(
            event.id,
            event.banners.rectangle.filename,
          );
        }

        return item;
      }),
    );

    return {
      events: selectItems,
      total,
      hasMore,
    };
  }

  // ==================== Event Banners ====================

  /**
   * Upload a banner for an event.
   * Only event creator or admin can upload.
   */
  async uploadBanner(
    ctx: Ctx,
    eventId: string,
    userId: string,
    userRole: Role,
    bannerType: EventBannerType,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ): Promise<UploadEventBannerResponse> {
    this.logger.log(ctx, `Uploading ${bannerType} banner for event ${eventId}`);

    const event = await this.eventsRepository.findEventById(ctx, eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isAdmin = userRole === Role.Admin;
    const isCreator = event.createdBy === userId;
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        'Only event creator or admin can upload banners',
      );
    }

    if (!ALLOWED_BANNER_MIME_TYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: PNG, JPEG, WebP',
      );
    }

    if (file.size > BANNER_CONSTRAINTS.maxSizeBytes) {
      throw new BadRequestException('File exceeds maximum size (5MB)');
    }

    const metadata = await sharp(file.buffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new BadRequestException('Could not read image dimensions');
    }

    // og_image has no dimension/aspect validation (optional, admin-only)
    if (bannerType !== 'og_image') {
      const constraints = BANNER_CONSTRAINTS[bannerType];

      // TODO: Re-enable aspect ratio validation when ready for production
    // const actualRatio = metadata.width / metadata.height;
    // const ratioDiff = Math.abs(actualRatio - constraints.aspectRatio);
    //
    // if (ratioDiff > constraints.aspectTolerance) {
    //   if (bannerType === 'square') {
    //     throw new BadRequestException(
    //       'Square banner must have 1:1 aspect ratio (min 300x300)',
    //     );
    //   } else {
    //     throw new BadRequestException(
    //       'Rectangle banner must have 16:9 aspect ratio (min 640x360)',
    //     );
    //   }
    // }

    // TODO: Re-enable minimum dimensions validation when ready for production
    // if (metadata.width < constraints.minWidth || metadata.height < constraints.minHeight) {
    //   if (bannerType === 'square') {
    //     throw new BadRequestException(
    //       'Square banner must have 1:1 aspect ratio (min 300x300)',
    //     );
    //   } else {
    //     throw new BadRequestException(
    //       'Rectangle banner must have 16:9 aspect ratio (min 640x360)',
    //     );
    //   }
    // }

      void constraints;
    }

    const existingBanner = event.banners?.[bannerType];
    if (existingBanner) {
      await this.bannerStorage.deleteByFilename(
        eventId,
        existingBanner.filename,
      );
    }

    const filename = await this.bannerStorage.store(
      eventId,
      bannerType,
      file.buffer,
      file.mimetype,
    );

    const banner: EventBanner = {
      type: bannerType,
      filename,
      originalFilename: file.originalname,
      contentType: file.mimetype,
      sizeBytes: file.size,
      width: metadata.width,
      height: metadata.height,
      uploadedBy: userId,
      uploadedAt: new Date(),
    };

    const updatedBanners: EventBanners = {
      ...event.banners,
      [bannerType]: banner,
    };

    await this.eventsRepository.updateEvent(ctx, eventId, {
      banners: updatedBanners,
    });

    const url = this.bannerStorage.getPublicUrl(eventId, filename);

    this.logger.log(
      ctx,
      `${bannerType} banner uploaded for event ${eventId}: ${filename}`,
    );

    return {
      eventId,
      bannerType,
      url,
      banner,
    };
  }

  /**
   * Delete a banner from an event.
   * Only event creator or admin can delete.
   */
  async deleteBanner(
    ctx: Ctx,
    eventId: string,
    userId: string,
    userRole: Role,
    bannerType: EventBannerType,
  ): Promise<DeleteEventBannerResponse> {
    this.logger.log(ctx, `Deleting ${bannerType} banner for event ${eventId}`);

    const event = await this.eventsRepository.findEventById(ctx, eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const isAdmin = userRole === Role.Admin;
    const isCreator = event.createdBy === userId;
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException(
        'Only event creator or admin can delete banners',
      );
    }

    const existingBanner = event.banners?.[bannerType];
    if (!existingBanner) {
      throw new NotFoundException(
        `No ${bannerType} banner exists for this event`,
      );
    }

    await this.bannerStorage.deleteByFilename(eventId, existingBanner.filename);

    const updatedBanners: EventBanners = { ...event.banners };
    delete updatedBanners[bannerType];

    const updatePayload: { banners?: EventBanners } = {
      banners:
        Object.keys(updatedBanners).length > 0 ? updatedBanners : undefined,
    };
    await this.eventsRepository.updateEvent(ctx, eventId, updatePayload);

    this.logger.log(ctx, `${bannerType} banner deleted for event ${eventId}`);

    return {
      eventId,
      bannerType,
      deleted: true,
    };
  }

  /**
   * Get banners for an event with URLs.
   */
  async getBanners(
    ctx: Ctx,
    eventId: string,
  ): Promise<GetEventBannersResponse> {
    const event = await this.eventsRepository.findEventById(ctx, eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const response: GetEventBannersResponse = { eventId };

    if (event.banners?.square) {
      response.square = {
        url: this.bannerStorage.getPublicUrl(
          eventId,
          event.banners.square.filename,
        ),
        banner: event.banners.square,
      };
    }

    if (event.banners?.rectangle) {
      response.rectangle = {
        url: this.bannerStorage.getPublicUrl(
          eventId,
          event.banners.rectangle.filename,
        ),
        banner: event.banners.rectangle,
      };
    }

    if (event.banners?.og_image) {
      response.og_image = {
        url: this.bannerStorage.getPublicUrl(
          eventId,
          event.banners.og_image.filename,
        ),
        banner: event.banners.og_image,
      };
    }

    return response;
  }

  /**
   * Internal method to add banner URLs to an event response.
   */
  private async addBannerUrlsToEvent(event: EventWithDates): Promise<
    EventWithDatesResponse & {
      bannerUrls?: { square?: string; rectangle?: string; og_image?: string };
    }
  > {
    const { importInfo: _importInfo, ...eventPublic } = event;
    const result: EventWithDatesResponse & {
      bannerUrls?: { square?: string; rectangle?: string; og_image?: string };
    } = {
      ...eventPublic,
      images: [],
    };

    if (event.banners) {
      const bannerUrls: { square?: string; rectangle?: string; og_image?: string } = {};
      if (event.banners.square) {
        bannerUrls.square = this.bannerStorage.getPublicUrl(
          event.id,
          event.banners.square.filename,
        );
      }
      if (event.banners.rectangle) {
        bannerUrls.rectangle = this.bannerStorage.getPublicUrl(
          event.id,
          event.banners.rectangle.filename,
        );
      }
      if (event.banners.og_image) {
        bannerUrls.og_image = this.bannerStorage.getPublicUrl(
          event.id,
          event.banners.og_image.filename,
        );
      }
      if (Object.keys(bannerUrls).length > 0) {
        result.bannerUrls = bannerUrls;
      }
    }

    return result;
  }
}
