import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
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
import type { Event, EventDate, EventWithDates } from './events.domain';
import { EventStatus, EventDateStatus, EventCategory } from './events.domain';
import type {
  CreateEventRequest,
  AddEventDateRequest,
  ListEventsQuery,
  EventWithDatesResponse,
} from './events.api';
import type {
  AdminUpdateEventRequest,
  AdminUpdateEventResponse,
} from '../admin/admin.api';
import { Role, UserLevel } from '../users/users.domain';

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
   * Get event by ID with dates
   */
  async getEventById(ctx: Ctx, id: string): Promise<EventWithDatesResponse> {
    const event = await this.eventsRepository.findEventById(ctx, id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const dates = await this.eventsRepository.getDatesByEventId(ctx, id);
    const [eventWithImages] = await this.attachImages(ctx, [
      { ...event, dates },
    ]);
    return eventWithImages;
  }

  /**
   * List events with optional filters
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

    // Add dates to each event
    const eventsWithDates: EventWithDates[] = await Promise.all(
      events.map(async (event) => {
        const dates = includeAllStatuses
          ? await this.eventsRepository.getDatesByEventId(ctx, event.id)
          : await this.eventsRepository.getApprovedDatesByEventId(
              ctx,
              event.id,
            );
        return { ...event, dates };
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

    // Only event creator or admin can add dates
    const isAdmin = userRole === Role.Admin;
    if (!isAdmin && event.createdBy !== userId) {
      throw new ForbiddenException('Only event creator or admin can add dates');
    }

    const eventDate: EventDate = {
      id: this.generateId('edt'),
      eventId,
      date: new Date(data.date),
      doorsOpenAt: data.doorsOpenAt ? new Date(data.doorsOpenAt) : undefined,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
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
        const dates = await this.eventsRepository.getDatesByEventId(
          ctx,
          event.id,
        );
        return { ...event, dates };
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
        const dates = await this.eventsRepository.getDatesByEventId(
          ctx,
          event.id,
        );
        return { ...event, dates };
      }),
    );

    return await this.attachImages(ctx, eventsWithDates);
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

          const dateUpdates: Partial<EventDate> = {
            date: new Date(dateUpdate.date),
            doorsOpenAt: dateUpdate.doorsOpenAt
              ? new Date(dateUpdate.doorsOpenAt)
              : existingDate.doorsOpenAt,
            startTime: dateUpdate.startTime
              ? new Date(dateUpdate.startTime)
              : existingDate.startTime,
            endTime: dateUpdate.endTime
              ? new Date(dateUpdate.endTime)
              : existingDate.endTime,
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
          const newDate: EventDate = {
            id: this.generateId('edt'),
            eventId,
            date: new Date(dateUpdate.date),
            doorsOpenAt: dateUpdate.doorsOpenAt
              ? new Date(dateUpdate.doorsOpenAt)
              : undefined,
            startTime: dateUpdate.startTime
              ? new Date(dateUpdate.startTime)
              : undefined,
            endTime: dateUpdate.endTime
              ? new Date(dateUpdate.endTime)
              : undefined,
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
        doorsOpenAt: d.doorsOpenAt,
        startTime: d.startTime,
        endTime: d.endTime,
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
}
