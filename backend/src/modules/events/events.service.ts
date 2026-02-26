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
import type { Ctx } from '../../common/types/context';
import type { Image } from '../images/images.domain';
import type { Event, EventDate, EventWithDates } from './events.domain';
import { EventStatus, EventDateStatus } from './events.domain';
import type {
  CreateEventRequest,
  AddEventDateRequest,
  ListEventsQuery,
  EventWithDatesResponse,
} from './events.api';
import { Role, UserLevel } from '../users/users.domain';

const DEFAULT_IMAGE: Image = {
  id: 'default',
  src: '/images/default/default.png',
};

@Injectable()
export class EventsService {
  constructor(
    @Inject(EventsRepository)
    private readonly eventsRepository: EventsRepository,
    @Inject(ImagesRepository)
    private readonly imagesRepository: ImagesRepository,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
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
}
