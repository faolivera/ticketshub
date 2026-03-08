import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  Event as PrismaEvent,
  EventDate as PrismaEventDate,
  EventSection as PrismaEventSection,
} from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import type { Event, EventDate, EventSection, EventBanners } from './events.domain';
import {
  EventStatus,
  EventDateStatus,
  EventSectionStatus,
  EventCategory,
} from './events.domain';
import type { IEventsRepository } from './events.repository.interface';
import type { Address } from '../shared/address.domain';
import { SeatingType } from '../tickets/tickets.domain';

@Injectable()
export class EventsRepository implements IEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Events ====================

  async createEvent(_ctx: Ctx, event: Event): Promise<Event> {
    const created = await this.prisma.event.create({
      data: {
        id: event.id,
        slug: event.slug,
        name: event.name,
        category: this.mapEventCategoryToDb(event.category),
        venue: event.venue,
        location: event.location as object,
        imageIds: event.imageIds,
        banners: event.banners ? (event.banners as object) : undefined,
        status: this.mapEventStatusToDb(event.status),
        rejectionReason: event.rejectionReason,
        createdById: event.createdBy,
        approvedById: event.approvedBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
    });
    return this.mapToEvent(created);
  }

  async findEventById(_ctx: Ctx, id: string): Promise<Event | undefined> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });
    return event ? this.mapToEvent(event) : undefined;
  }

  async findEventBySlug(_ctx: Ctx, slug: string): Promise<Event | undefined> {
    const event = await this.prisma.event.findUnique({
      where: { slug },
    });
    return event ? this.mapToEvent(event) : undefined;
  }

  async getAllEvents(_ctx: Ctx): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return events.map((e) => this.mapToEvent(e));
  }

  async findEventsByIds(_ctx: Ctx, ids: string[]): Promise<Event[]> {
    if (ids.length === 0) return [];
    const events = await this.prisma.event.findMany({
      where: { id: { in: ids } },
    });
    return events.map((e) => this.mapToEvent(e));
  }

  async getDatesByEventIds(_ctx: Ctx, eventIds: string[]): Promise<EventDate[]> {
    if (eventIds.length === 0) return [];
    const dates = await this.prisma.eventDate.findMany({
      where: { eventId: { in: eventIds } },
      orderBy: { date: 'asc' },
    });
    return dates.map((d) => this.mapToEventDate(d));
  }

  async getSectionsByEventIds(
    _ctx: Ctx,
    eventIds: string[],
  ): Promise<EventSection[]> {
    if (eventIds.length === 0) return [];
    const sections = await this.prisma.eventSection.findMany({
      where: { eventId: { in: eventIds } },
      orderBy: { name: 'asc' },
    });
    return sections.map((s) => this.mapToEventSection(s));
  }

  async getApprovedEvents(_ctx: Ctx): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: { status: 'approved' },
      orderBy: { createdAt: 'desc' },
    });
    return events.map((e) => this.mapToEvent(e));
  }

  async listEventsPaginated(
    _ctx: Ctx,
    opts: {
      approvedOnly: boolean;
      status?: EventStatus;
      category?: EventCategory;
      search?: string;
      limit: number;
      offset: number;
    },
  ): Promise<{ events: Event[]; total: number }> {
    const where: Record<string, unknown> = {};
    if (opts.approvedOnly) {
      where.status = 'approved';
    }
    if (opts.status !== undefined) {
      where.status = this.mapEventStatusToDb(opts.status);
    }
    if (opts.category !== undefined) {
      where.category = this.mapEventCategoryToDb(opts.category);
    }
    if (opts.search?.trim()) {
      const term = opts.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { venue: { contains: term, mode: 'insensitive' } },
      ];
    }
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: opts.offset,
        take: opts.limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    return {
      events: events.map((e) => this.mapToEvent(e)),
      total,
    };
  }

  async getPendingEvents(_ctx: Ctx): Promise<Event[]> {
    const [pendingEvents, pendingDates, pendingSections] = await Promise.all([
      this.prisma.event.findMany({
        where: { status: 'pending' },
      }),
      this.prisma.eventDate.findMany({
        where: { status: 'pending' },
        select: { eventId: true },
      }),
      this.prisma.eventSection.findMany({
        where: { status: 'pending' },
        select: { eventId: true },
      }),
    ]);

    const eventIdsWithPendingDates = new Set(pendingDates.map((d) => d.eventId));
    const eventIdsWithPendingSections = new Set(
      pendingSections.map((s) => s.eventId),
    );
    const pendingEventIds = new Set(pendingEvents.map((e) => e.id));

    const additionalEventIds = [
      ...eventIdsWithPendingDates,
      ...eventIdsWithPendingSections,
    ].filter((id) => !pendingEventIds.has(id));

    let allEvents = pendingEvents;
    if (additionalEventIds.length > 0) {
      const additionalEvents = await this.prisma.event.findMany({
        where: { id: { in: additionalEventIds } },
      });
      allEvents = [...pendingEvents, ...additionalEvents];
    }

    return allEvents.map((e) => this.mapToEvent(e));
  }

  async getEventsByCreator(_ctx: Ctx, userId: string): Promise<Event[]> {
    const events = await this.prisma.event.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
    });
    return events.map((e) => this.mapToEvent(e));
  }

  async updateEvent(
    _ctx: Ctx,
    id: string,
    updates: Partial<Event>,
  ): Promise<Event | undefined> {
    try {
      const data: Record<string, unknown> = {};

      if (updates.name !== undefined) data.name = updates.name;
      if (updates.slug !== undefined) data.slug = updates.slug;
      if (updates.category !== undefined) {
        data.category = this.mapEventCategoryToDb(updates.category);
      }
      if (updates.venue !== undefined) data.venue = updates.venue;
      if (updates.location !== undefined) data.location = updates.location as object;
      if (updates.imageIds !== undefined) data.imageIds = updates.imageIds;
      if (updates.banners !== undefined) {
        data.banners = updates.banners ? (updates.banners as object) : null;
      }
      if (updates.status !== undefined) {
        data.status = this.mapEventStatusToDb(updates.status);
      }
      if (updates.rejectionReason !== undefined) {
        data.rejectionReason = updates.rejectionReason;
      }
      if (updates.approvedBy !== undefined) data.approvedById = updates.approvedBy;

      const updated = await this.prisma.event.update({
        where: { id },
        data,
      });
      return this.mapToEvent(updated);
    } catch (error) {
      console.error('events.repository updateEvent failed:', error);
      return undefined;
    }
  }

  async deleteEvent(_ctx: Ctx, id: string): Promise<void> {
    await this.prisma.event.delete({
      where: { id },
    });
  }

  async getAllEventsPaginated(
    _ctx: Ctx,
    options: { page: number; limit: number; search?: string },
  ): Promise<{ events: Event[]; total: number }> {
    const where = options.search
      ? {
          name: {
            contains: options.search,
            mode: 'insensitive' as const,
          },
        }
      : {};

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      events: events.map((e) => this.mapToEvent(e)),
      total,
    };
  }

  async getApprovedEventsForSelection(
    _ctx: Ctx,
    options: { limit: number; offset: number; search?: string },
  ): Promise<{ events: Event[]; total: number }> {
    const where = {
      status: 'approved' as const,
      ...(options.search
        ? {
            OR: [
              {
                name: {
                  contains: options.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                venue: {
                  contains: options.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options.offset,
        take: options.limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      events: events.map((e) => this.mapToEvent(e)),
      total,
    };
  }

  // ==================== Event Dates ====================

  async createEventDate(_ctx: Ctx, date: EventDate): Promise<EventDate> {
    const created = await this.prisma.eventDate.create({
      data: {
        id: date.id,
        eventId: date.eventId,
        date: date.date,
        status: this.mapEventDateStatusToDb(date.status),
        rejectionReason: date.rejectionReason,
        createdById: date.createdBy,
        approvedById: date.approvedBy,
        createdAt: date.createdAt,
        updatedAt: date.updatedAt,
      },
    });
    return this.mapToEventDate(created);
  }

  async findEventDateById(_ctx: Ctx, id: string): Promise<EventDate | undefined> {
    const date = await this.prisma.eventDate.findUnique({
      where: { id },
    });
    return date ? this.mapToEventDate(date) : undefined;
  }

  async getDatesByEventId(_ctx: Ctx, eventId: string): Promise<EventDate[]> {
    const dates = await this.prisma.eventDate.findMany({
      where: { eventId },
      orderBy: { date: 'asc' },
    });
    return dates.map((d) => this.mapToEventDate(d));
  }

  async findEventDateByEventIdAndDate(
    _ctx: Ctx,
    eventId: string,
    date: Date,
  ): Promise<EventDate | undefined> {
    const found = await this.prisma.eventDate.findFirst({
      where: {
        eventId,
        date,
      },
    });
    return found ? this.mapToEventDate(found) : undefined;
  }

  async getApprovedDatesByEventId(
    _ctx: Ctx,
    eventId: string,
  ): Promise<EventDate[]> {
    const dates = await this.prisma.eventDate.findMany({
      where: {
        eventId,
        status: 'approved',
      },
      orderBy: { date: 'asc' },
    });
    return dates.map((d) => this.mapToEventDate(d));
  }

  async getDatesByEventIdAndStatus(
    _ctx: Ctx,
    eventId: string,
    statuses: EventDateStatus[],
  ): Promise<EventDate[]> {
    const dbStatuses = statuses.map((s) => this.mapEventDateStatusToDb(s));
    const dates = await this.prisma.eventDate.findMany({
      where: {
        eventId,
        status: { in: dbStatuses },
      },
      orderBy: { date: 'asc' },
    });
    return dates.map((d) => this.mapToEventDate(d));
  }

  async getPendingDates(_ctx: Ctx): Promise<EventDate[]> {
    const dates = await this.prisma.eventDate.findMany({
      where: { status: 'pending' },
      orderBy: { date: 'asc' },
    });
    return dates.map((d) => this.mapToEventDate(d));
  }

  async updateEventDate(
    _ctx: Ctx,
    id: string,
    updates: Partial<EventDate>,
  ): Promise<EventDate | undefined> {
    try {
      const data: Record<string, unknown> = {};

      if (updates.date !== undefined) data.date = updates.date;
      if (updates.status !== undefined) {
        data.status = this.mapEventDateStatusToDb(updates.status);
      }
      if (updates.rejectionReason !== undefined) {
        data.rejectionReason = updates.rejectionReason;
      }
      if (updates.approvedBy !== undefined) data.approvedById = updates.approvedBy;

      const updated = await this.prisma.eventDate.update({
        where: { id },
        data,
      });
      return this.mapToEventDate(updated);
    } catch (error) {
      console.error('events.repository updateEventDate failed:', error);
      return undefined;
    }
  }

  async deleteEventDate(_ctx: Ctx, id: string): Promise<void> {
    await this.prisma.eventDate.delete({
      where: { id },
    });
  }

  // ==================== Event Sections ====================

  async createEventSection(_ctx: Ctx, section: EventSection): Promise<EventSection> {
    const created = await this.prisma.eventSection.create({
      data: {
        id: section.id,
        eventId: section.eventId,
        name: section.name,
        seatingType: this.mapSeatingTypeToDb(section.seatingType),
        status: this.mapEventSectionStatusToDb(section.status),
        rejectionReason: section.rejectionReason,
        createdById: section.createdBy,
        approvedById: section.approvedBy,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
      },
    });
    return this.mapToEventSection(created);
  }

  async findEventSectionById(
    _ctx: Ctx,
    id: string,
  ): Promise<EventSection | undefined> {
    const section = await this.prisma.eventSection.findUnique({
      where: { id },
    });
    return section ? this.mapToEventSection(section) : undefined;
  }

  async getSectionsByEventId(
    _ctx: Ctx,
    eventId: string,
  ): Promise<EventSection[]> {
    const sections = await this.prisma.eventSection.findMany({
      where: { eventId },
      orderBy: { name: 'asc' },
    });
    return sections.map((s) => this.mapToEventSection(s));
  }

  async getApprovedSectionsByEventId(
    _ctx: Ctx,
    eventId: string,
  ): Promise<EventSection[]> {
    const sections = await this.prisma.eventSection.findMany({
      where: {
        eventId,
        status: 'approved',
      },
      orderBy: { name: 'asc' },
    });
    return sections.map((s) => this.mapToEventSection(s));
  }

  async getSectionsByEventIdAndStatus(
    _ctx: Ctx,
    eventId: string,
    statuses: EventSectionStatus[],
  ): Promise<EventSection[]> {
    const dbStatuses = statuses.map((s) => this.mapEventSectionStatusToDb(s));
    const sections = await this.prisma.eventSection.findMany({
      where: {
        eventId,
        status: { in: dbStatuses },
      },
      orderBy: { name: 'asc' },
    });
    return sections.map((s) => this.mapToEventSection(s));
  }

  async getPendingSections(_ctx: Ctx): Promise<EventSection[]> {
    const sections = await this.prisma.eventSection.findMany({
      where: { status: 'pending' },
      orderBy: { name: 'asc' },
    });
    return sections.map((s) => this.mapToEventSection(s));
  }

  async findSectionByEventAndName(
    _ctx: Ctx,
    eventId: string,
    name: string,
  ): Promise<EventSection | undefined> {
    const section = await this.prisma.eventSection.findFirst({
      where: {
        eventId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });
    return section ? this.mapToEventSection(section) : undefined;
  }

  async updateEventSection(
    _ctx: Ctx,
    id: string,
    updates: Partial<EventSection>,
  ): Promise<EventSection | undefined> {
    try {
      const data: Record<string, unknown> = {};

      if (updates.name !== undefined) data.name = updates.name;
      if (updates.seatingType !== undefined) {
        data.seatingType = this.mapSeatingTypeToDb(updates.seatingType);
      }
      if (updates.status !== undefined) {
        data.status = this.mapEventSectionStatusToDb(updates.status);
      }
      if (updates.rejectionReason !== undefined) {
        data.rejectionReason = updates.rejectionReason;
      }
      if (updates.approvedBy !== undefined) data.approvedById = updates.approvedBy;

      const updated = await this.prisma.eventSection.update({
        where: { id },
        data,
      });
      return this.mapToEventSection(updated);
    } catch (error) {
      console.error('events.repository updateEventSection failed:', error);
      return undefined;
    }
  }

  async deleteEventSection(_ctx: Ctx, id: string): Promise<void> {
    await this.prisma.eventSection.delete({
      where: { id },
    });
  }

  // ==================== Mappers ====================

  private mapToEvent(prismaEvent: PrismaEvent): Event {
    return {
      id: prismaEvent.id,
      slug: prismaEvent.slug,
      name: prismaEvent.name,
      category: this.mapEventCategoryFromDb(prismaEvent.category),
      venue: prismaEvent.venue,
      location: prismaEvent.location as unknown as Address,
      imageIds: prismaEvent.imageIds,
      banners: prismaEvent.banners
        ? (prismaEvent.banners as unknown as EventBanners)
        : undefined,
      status: this.mapEventStatusFromDb(prismaEvent.status),
      rejectionReason: prismaEvent.rejectionReason ?? undefined,
      createdBy: prismaEvent.createdById,
      approvedBy: prismaEvent.approvedById ?? undefined,
      createdAt: prismaEvent.createdAt,
      updatedAt: prismaEvent.updatedAt,
    };
  }

  private mapToEventDate(prismaDate: PrismaEventDate): EventDate {
    return {
      id: prismaDate.id,
      eventId: prismaDate.eventId,
      date: prismaDate.date,
      status: this.mapEventDateStatusFromDb(prismaDate.status),
      rejectionReason: prismaDate.rejectionReason ?? undefined,
      createdBy: prismaDate.createdById,
      approvedBy: prismaDate.approvedById ?? undefined,
      createdAt: prismaDate.createdAt,
      updatedAt: prismaDate.updatedAt,
    };
  }

  private mapToEventSection(prismaSection: PrismaEventSection): EventSection {
    return {
      id: prismaSection.id,
      eventId: prismaSection.eventId,
      name: prismaSection.name,
      seatingType: this.mapSeatingTypeFromDb(prismaSection.seatingType),
      status: this.mapEventSectionStatusFromDb(prismaSection.status),
      rejectionReason: prismaSection.rejectionReason ?? undefined,
      createdBy: prismaSection.createdById,
      approvedBy: prismaSection.approvedById ?? undefined,
      createdAt: prismaSection.createdAt,
      updatedAt: prismaSection.updatedAt,
    };
  }

  // ==================== Enum Mappers ====================

  private mapEventStatusToDb(
    status: EventStatus,
  ): 'pending' | 'approved' | 'rejected' {
    switch (status) {
      case EventStatus.Pending:
        return 'pending';
      case EventStatus.Approved:
        return 'approved';
      case EventStatus.Rejected:
        return 'rejected';
    }
  }

  private mapEventStatusFromDb(
    status: 'pending' | 'approved' | 'rejected',
  ): EventStatus {
    switch (status) {
      case 'pending':
        return EventStatus.Pending;
      case 'approved':
        return EventStatus.Approved;
      case 'rejected':
        return EventStatus.Rejected;
    }
  }

  private mapEventDateStatusToDb(
    status: EventDateStatus,
  ): 'pending' | 'approved' | 'rejected' | 'cancelled' {
    switch (status) {
      case EventDateStatus.Pending:
        return 'pending';
      case EventDateStatus.Approved:
        return 'approved';
      case EventDateStatus.Rejected:
        return 'rejected';
      case EventDateStatus.Cancelled:
        return 'cancelled';
    }
  }

  private mapEventDateStatusFromDb(
    status: 'pending' | 'approved' | 'rejected' | 'cancelled',
  ): EventDateStatus {
    switch (status) {
      case 'pending':
        return EventDateStatus.Pending;
      case 'approved':
        return EventDateStatus.Approved;
      case 'rejected':
        return EventDateStatus.Rejected;
      case 'cancelled':
        return EventDateStatus.Cancelled;
    }
  }

  private mapEventSectionStatusToDb(
    status: EventSectionStatus,
  ): 'pending' | 'approved' | 'rejected' {
    switch (status) {
      case EventSectionStatus.Pending:
        return 'pending';
      case EventSectionStatus.Approved:
        return 'approved';
      case EventSectionStatus.Rejected:
        return 'rejected';
    }
  }

  private mapEventSectionStatusFromDb(
    status: 'pending' | 'approved' | 'rejected',
  ): EventSectionStatus {
    switch (status) {
      case 'pending':
        return EventSectionStatus.Pending;
      case 'approved':
        return EventSectionStatus.Approved;
      case 'rejected':
        return EventSectionStatus.Rejected;
    }
  }

  private mapEventCategoryToDb(
    category: EventCategory,
  ): 'Concert' | 'Sports' | 'Theater' | 'Festival' | 'Conference' | 'Comedy' | 'Other' {
    switch (category) {
      case EventCategory.Concert:
        return 'Concert';
      case EventCategory.Sports:
        return 'Sports';
      case EventCategory.Theater:
        return 'Theater';
      case EventCategory.Festival:
        return 'Festival';
      case EventCategory.Conference:
        return 'Conference';
      case EventCategory.Comedy:
        return 'Comedy';
      case EventCategory.Other:
        return 'Other';
    }
  }

  private mapEventCategoryFromDb(
    category: 'Concert' | 'Sports' | 'Theater' | 'Festival' | 'Conference' | 'Comedy' | 'Other',
  ): EventCategory {
    switch (category) {
      case 'Concert':
        return EventCategory.Concert;
      case 'Sports':
        return EventCategory.Sports;
      case 'Theater':
        return EventCategory.Theater;
      case 'Festival':
        return EventCategory.Festival;
      case 'Conference':
        return EventCategory.Conference;
      case 'Comedy':
        return EventCategory.Comedy;
      case 'Other':
        return EventCategory.Other;
    }
  }

  private mapSeatingTypeToDb(seatingType: SeatingType): 'numbered' | 'unnumbered' {
    switch (seatingType) {
      case SeatingType.Numbered:
        return 'numbered';
      case SeatingType.Unnumbered:
        return 'unnumbered';
    }
  }

  private mapSeatingTypeFromDb(seatingType: 'numbered' | 'unnumbered'): SeatingType {
    switch (seatingType) {
      case 'numbered':
        return SeatingType.Numbered;
      case 'unnumbered':
        return SeatingType.Unnumbered;
    }
  }
}
