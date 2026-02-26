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
import { EventsRepository } from './events.repository';
import { ImagesRepository } from '../images/images.repository';
import { TicketsService } from '../tickets/tickets.service';
import { TransactionsService } from '../transactions/transactions.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { Image } from '../images/images.domain';
import type {
  Event,
  EventDate,
  EventSection,
  EventWithDates,
} from './events.domain';
import {
  EventStatus,
  EventDateStatus,
  EventSectionStatus,
  EventCategory,
} from './events.domain';
import type {
  CreateEventRequest,
  AddEventDateRequest,
  AddEventSectionRequest,
  ListEventsQuery,
  EventWithDatesResponse,
} from './events.api';
import type {
  AdminUpdateEventRequest,
  AdminUpdateEventResponse,
  AdminUpdateSectionRequest,
} from '../admin/admin.api';
import { Role, UserLevel } from '../users/users.domain';
import { SeatingType } from '../tickets/tickets.domain';

const DEFAULT_IMAGE: Image = {
  id: 'default',
  src: '/images/default/default.png',
};

@Injectable()
export class EventsService {
  private readonly logger = new ContextLogger(EventsService.name);

  constructor(
    @Inject(EventsRepository)
    private readonly eventsRepository: EventsRepository,
    @Inject(ImagesRepository)
    private readonly imagesRepository: ImagesRepository,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
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
   * Create a new event
   */
  async createEvent(
    ctx: Ctx,
    userId: string,
    userRole: Role,
    userLevel: UserLevel,
    data: CreateEventRequest,
  ): Promise<Event> {
    // Check permissions: Admin can create approved events, Sellers create pending
    const isAdmin = userRole === Role.Admin;
    const canCreate =
      isAdmin ||
      userLevel === UserLevel.Seller ||
      userLevel === UserLevel.VerifiedSeller;

    if (!canCreate) {
      throw new ForbiddenException('Only sellers and admins can create events');
    }

    const event: Event = {
      id: this.generateId('evt'),
      name: data.name,
      description: data.description,
      category: data.category,
      venue: data.venue,
      location: data.location,
      imageIds: data.imageIds || [],
      status: isAdmin ? EventStatus.Approved : EventStatus.Pending,
      createdBy: userId,
      approvedBy: isAdmin ? userId : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
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
   * List events with optional filters
   * Always includes pending and approved dates/sections (excludes rejected)
   */
  async listEvents(
    ctx: Ctx,
    query: ListEventsQuery,
    includeAllStatuses: boolean = false,
  ): Promise<EventWithDatesResponse[]> {
    let events: Event[];

    if (includeAllStatuses) {
      events = await this.eventsRepository.getAllEvents(ctx);
    } else {
      events = await this.eventsRepository.getApprovedEvents(ctx);
    }

    // Apply filters
    if (query.status && includeAllStatuses) {
      events = events.filter((e) => e.status === query.status);
    }

    if (query.category) {
      events = events.filter((e) => e.category === query.category);
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.description.toLowerCase().includes(searchLower) ||
          e.venue.toLowerCase().includes(searchLower),
      );
    }

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    events = events.slice(offset, offset + limit);

    // Add dates and sections to each event
    // Always include pending and approved (exclude rejected)
    const eventsWithDates: EventWithDates[] = await Promise.all(
      events.map(async (event) => {
        const [dates, sections] = await Promise.all([
          includeAllStatuses
            ? this.eventsRepository.getDatesByEventId(ctx, event.id)
            : this.eventsRepository.getDatesByEventIdAndStatus(ctx, event.id, [
                EventDateStatus.Pending,
                EventDateStatus.Approved,
              ]),
          includeAllStatuses
            ? this.eventsRepository.getSectionsByEventId(ctx, event.id)
            : this.eventsRepository.getSectionsByEventIdAndStatus(
                ctx,
                event.id,
                [EventSectionStatus.Pending, EventSectionStatus.Approved],
              ),
        ]);

        return { ...event, dates, sections };
      }),
    );

    return await this.attachImages(ctx, eventsWithDates);
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
    }

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
    }

    return updated;
  }

  /**
   * Get pending events for admin review
   */
  async getPendingEvents(ctx: Ctx): Promise<EventWithDatesResponse[]> {
    const events = await this.eventsRepository.getPendingEvents(ctx);

    const eventsWithDates: EventWithDates[] = await Promise.all(
      events.map(async (event) => {
        const [dates, sections] = await Promise.all([
          this.eventsRepository.getDatesByEventId(ctx, event.id),
          this.eventsRepository.getSectionsByEventId(ctx, event.id),
        ]);
        return { ...event, dates, sections };
      }),
    );

    return await this.attachImages(ctx, eventsWithDates);
  }

  /**
   * Get events created by a user
   */
  async getMyEvents(
    ctx: Ctx,
    userId: string,
  ): Promise<EventWithDatesResponse[]> {
    const events = await this.eventsRepository.getEventsByCreator(ctx, userId);

    const eventsWithDates: EventWithDates[] = await Promise.all(
      events.map(async (event) => {
        const [dates, sections] = await Promise.all([
          this.eventsRepository.getDatesByEventId(ctx, event.id),
          this.eventsRepository.getSectionsByEventId(ctx, event.id),
        ]);
        return { ...event, dates, sections };
      }),
    );

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
      ? await this.imagesRepository.getByIds(ctx, imageIds)
      : [];
    const imagesMap = new Map<string, Image>(
      images.map((image) => [image.id, image]),
    );

    return events.map((event) => ({
      ...event,
      images: this.resolveImages(event.imageIds || [], imagesMap),
    }));
  }

  private resolveImages(
    imageIds: string[],
    imagesMap: Map<string, Image>,
  ): Image[] {
    if (!imageIds.length) return [];
    return imageIds.map((id) => imagesMap.get(id) || DEFAULT_IMAGE);
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

    // 1. Handle date deletions first
    if (data.datesToDelete && data.datesToDelete.length > 0) {
      for (const dateId of data.datesToDelete) {
        const eventDate = await this.eventsRepository.findEventDateById(
          ctx,
          dateId,
        );
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
    if (data.description !== undefined)
      eventUpdates.description = data.description;
    if (data.category !== undefined)
      eventUpdates.category = data.category as EventCategory;
    if (data.venue !== undefined) eventUpdates.venue = data.venue;
    if (data.location !== undefined) eventUpdates.location = data.location;
    if (data.imageIds !== undefined) eventUpdates.imageIds = data.imageIds;

    let updatedEvent = event;
    if (Object.keys(eventUpdates).length > 0) {
      const result = await this.eventsRepository.updateEvent(
        ctx,
        eventId,
        eventUpdates,
      );
      if (!result) {
        throw new NotFoundException('Event not found after update');
      }
      updatedEvent = result;
    }

    // 3. Handle date updates and creations
    if (data.dates && data.dates.length > 0) {
      for (const dateUpdate of data.dates) {
        if (dateUpdate.id) {
          // Update existing date
          const existingDate = await this.eventsRepository.findEventDateById(
            ctx,
            dateUpdate.id,
          );
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
        name: finalEvent.name,
        description: finalEvent.description,
        category: finalEvent.category,
        venue: finalEvent.venue,
        location: finalEvent.location,
        imageIds: finalEvent.imageIds,
        status: finalEvent.status,
        createdBy: finalEvent.createdBy,
        approvedBy: finalEvent.approvedBy,
        createdAt: finalEvent.createdAt,
        updatedAt: finalEvent.updatedAt,
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
    options: { page: number; limit: number; search?: string },
  ): Promise<{ events: Event[]; total: number }> {
    return await this.eventsRepository.getAllEventsPaginated(ctx, options);
  }
}
