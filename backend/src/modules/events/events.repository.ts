import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  Event as PrismaEvent,
  EventDate as PrismaEventDate,
  EventSection as PrismaEventSection,
} from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type {
  Event,
  EventDate,
  EventSection,
  EventBanners,
} from './events.domain';
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
  private readonly logger = new ContextLogger(EventsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Events ====================

  async createEvent(_ctx: Ctx, event: Event): Promise<Event> {
    this.logger.debug(_ctx, 'createEvent', { eventId: event.id });
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
        importInfo: event.importInfo ? (event.importInfo as object) : undefined,
        status: this.mapEventStatusToDb(event.status),
        rejectionReason: event.rejectionReason,
        createdById: event.createdBy,
        approvedById: event.approvedBy,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        isPopular: event.isPopular ?? false,
        highlight: event.highlight ?? false,
      },
    });
    return this.mapToEvent(created);
  }

  async findEventById(_ctx: Ctx, id: string): Promise<Event | undefined> {
    this.logger.debug(_ctx, 'findEventById', { id });
    const event = await this.prisma.event.findUnique({
      where: { id },
    });
    return event ? this.mapToEvent(event) : undefined;
  }

  async findEventBySlug(_ctx: Ctx, slug: string): Promise<Event | undefined> {
    this.logger.debug(_ctx, 'findEventBySlug', { slug });
    const event = await this.prisma.event.findUnique({
      where: { slug },
    });
    return event ? this.mapToEvent(event) : undefined;
  }

  async getAllEvents(ctx: Ctx): Promise<Event[]> {
    this.logger.debug(ctx, 'getAllEvents');
    const events = await this.prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return events.map((e) => this.mapToEvent(e));
  }

  async findEventsByIds(ctx: Ctx, ids: string[]): Promise<Event[]> {
    this.logger.debug(ctx, 'findEventsByIds', { count: ids.length });
    if (ids.length === 0) return [];
    const events = await this.prisma.event.findMany({
      where: { id: { in: ids } },
    });
    return events.map((e) => this.mapToEvent(e));
  }

  async getExistingImportSourceKeys(ctx: Ctx): Promise<Set<string>> {
    this.logger.debug(ctx, 'getExistingImportSourceKeys');
    const events = await this.prisma.event.findMany({
      where: { importInfo: { not: null } },
      select: { importInfo: true },
    });
    const keys = new Set<string>();
    for (const row of events) {
      const info = row.importInfo as { sourceCode?: string; sourceId?: string } | null;
      if (info?.sourceCode != null && info?.sourceId != null) {
        keys.add(`${info.sourceCode}:${info.sourceId}`);
      }
    }
    return keys;
  }

  async getDatesByEventIds(ctx: Ctx, eventIds: string[]): Promise<EventDate[]> {
    this.logger.debug(ctx, 'getDatesByEventIds', { count: eventIds.length });
    if (eventIds.length === 0) return [];
    const dates = await this.prisma.eventDate.findMany({
      where: { eventId: { in: eventIds } },
      orderBy: { date: 'asc' },
    });
    return dates.map((d) => this.mapToEventDate(d));
  }

  async getSectionsByEventIds(
    ctx: Ctx,
    eventIds: string[],
  ): Promise<EventSection[]> {
    this.logger.debug(ctx, 'getSectionsByEventIds', { count: eventIds.length });
    if (eventIds.length === 0) return [];
    const sections = await this.prisma.eventSection.findMany({
      where: { eventId: { in: eventIds } },
      orderBy: { name: 'asc' },
    });
    return sections.map((s) => this.mapToEventSection(s));
  }

  async getApprovedEvents(ctx: Ctx): Promise<Event[]> {
    this.logger.debug(ctx, 'getApprovedEvents');
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
      orderBy?: 'createdAt' | 'rankingScore';
    },
  ): Promise<{ events: Event[]; total: number }> {
    this.logger.debug(_ctx, 'listEventsPaginated', {
      limit: opts.limit,
      offset: opts.offset,
      orderBy: opts.orderBy ?? 'createdAt',
    });
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
    const orderBy =
      opts.orderBy === 'rankingScore'
        ? { rankingScore: { sort: 'desc' as const, nulls: 'last' as const } }
        : { createdAt: 'desc' as const };
    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy,
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

  async getPendingEvents(ctx: Ctx): Promise<Event[]> {
    this.logger.debug(ctx, 'getPendingEvents');
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

    const eventIdsWithPendingDates = new Set(
      pendingDates.map((d) => d.eventId),
    );
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
      if (updates.location !== undefined)
        data.location = updates.location as object;
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
      if (updates.approvedBy !== undefined)
        data.approvedById = updates.approvedBy;
      if (updates.isPopular !== undefined) data.isPopular = updates.isPopular;
      if (updates.highlight !== undefined) data.highlight = updates.highlight;

      const updated = await this.prisma.event.update({
        where: { id },
        data,
      });
      return this.mapToEvent(updated);
    } catch (error) {
      this.logger.error(_ctx, 'events.repository updateEvent failed:', error);
      return undefined;
    }
  }

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
    this.logger.debug(ctx, 'getEventRankingComponentsBatch', { count: eventIds.length });
    if (eventIds.length === 0) {
      return new Map();
    }
    const now = new Date();
    const events = await this.prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: {
        id: true,
        isPopular: true,
        location: true,
        listings: {
          where: { status: 'Active' },
          select: { id: true },
        },
        dates: {
          where: { status: 'approved', date: { gte: now } },
          orderBy: { date: 'asc' },
          take: 1,
          select: { date: true },
        },
      },
    });
    const map = new Map<
      string,
      {
        hasActiveListings: boolean;
        activeListingsCount: number;
        nextEventDate: Date | null;
        isPopular: boolean;
        city: string;
      }
    >();
    for (const e of events) {
      const activeListingsCount = e.listings.length;
      const location = e.location as { city?: string } | null;
      const city = (location?.city && String(location.city).trim()) || '';
      map.set(e.id, {
        hasActiveListings: activeListingsCount > 0,
        activeListingsCount,
        nextEventDate: e.dates[0]?.date ?? null,
        isPopular: e.isPopular ?? false,
        city,
      });
    }
    return map;
  }

  async updateEventRankingBatch(
    ctx: Ctx,
    updates: Array<{ eventId: string; rankingScore: number; rankingUpdatedAt: Date }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    this.logger.debug(ctx, 'updateEventRankingBatch', { count: updates.length });
    await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.event.update({
          where: { id: u.eventId },
          data: { rankingScore: u.rankingScore, rankingUpdatedAt: u.rankingUpdatedAt },
        }),
      ),
    );
  }

  async deleteEvent(_ctx: Ctx, id: string): Promise<void> {
    this.logger.debug(_ctx, 'deleteEvent', { id });
    await this.prisma.event.delete({
      where: { id },
    });
  }

  async getAllEventsPaginated(
    _ctx: Ctx,
    options: { page: number; limit: number; search?: string },
  ): Promise<{ events: Event[]; total: number }> {
    this.logger.debug(_ctx, 'getAllEventsPaginated', { page: options.page, limit: options.limit });
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
    this.logger.debug(_ctx, 'getApprovedEventsForSelection', { limit: options.limit, offset: options.offset });
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
        orderBy: { rankingScore: { sort: 'desc' as const, nulls: 'last' as const }},
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
    this.logger.debug(_ctx, 'createEventDate', { dateId: date.id, eventId: date.eventId });
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

  async findEventDateById(
    _ctx: Ctx,
    id: string,
  ): Promise<EventDate | undefined> {
    this.logger.debug(_ctx, 'findEventDateById', { id });
    const date = await this.prisma.eventDate.findUnique({
      where: { id },
    });
    return date ? this.mapToEventDate(date) : undefined;
  }

  async findEventDatesByIds(
    _ctx: Ctx,
    ids: string[],
  ): Promise<EventDate[]> {
    this.logger.debug(_ctx, 'findEventDatesByIds', { count: ids.length });
    if (ids.length === 0) return [];
    const dates = await this.prisma.eventDate.findMany({
      where: { id: { in: ids } },
    });
    return dates.map((d) => this.mapToEventDate(d));
  }

  async getDatesByEventId(_ctx: Ctx, eventId: string): Promise<EventDate[]> {
    this.logger.debug(_ctx, 'getDatesByEventId', { eventId });
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
    this.logger.debug(_ctx, 'findEventDateByEventIdAndDate', { eventId });
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
    this.logger.debug(_ctx, 'getApprovedDatesByEventId', { eventId });
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
    this.logger.debug(_ctx, 'getDatesByEventIdAndStatus', { eventId });
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

  async getPendingDates(ctx: Ctx): Promise<EventDate[]> {
    this.logger.debug(ctx, 'getPendingDates');
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
      if (updates.approvedBy !== undefined)
        data.approvedById = updates.approvedBy;

      const updated = await this.prisma.eventDate.update({
        where: { id },
        data,
      });
      return this.mapToEventDate(updated);
    } catch (error) {
      this.logger.error(
        _ctx,
        'events.repository updateEventDate failed:',
        error,
      );
      return undefined;
    }
  }

  async deleteEventDate(_ctx: Ctx, id: string): Promise<void> {
    this.logger.debug(_ctx, 'deleteEventDate', { id });
    await this.prisma.eventDate.delete({
      where: { id },
    });
  }

  // ==================== Event Sections ====================

  async createEventSection(
    _ctx: Ctx,
    section: EventSection,
  ): Promise<EventSection> {
    this.logger.debug(_ctx, 'createEventSection', { sectionId: section.id, eventId: section.eventId });
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
    this.logger.debug(_ctx, 'findEventSectionById', { id });
    const section = await this.prisma.eventSection.findUnique({
      where: { id },
    });
    return section ? this.mapToEventSection(section) : undefined;
  }

  async getSectionsByEventId(
    _ctx: Ctx,
    eventId: string,
  ): Promise<EventSection[]> {
    this.logger.debug(_ctx, 'getSectionsByEventId', { eventId });
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
    this.logger.debug(_ctx, 'getApprovedSectionsByEventId', { eventId });
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
    this.logger.debug(_ctx, 'getSectionsByEventIdAndStatus', { eventId });
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

  async getPendingSections(ctx: Ctx): Promise<EventSection[]> {
    this.logger.debug(ctx, 'getPendingSections');
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
    this.logger.debug(_ctx, 'findSectionByEventAndName', { eventId, name });
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
      if (updates.approvedBy !== undefined)
        data.approvedById = updates.approvedBy;

      const updated = await this.prisma.eventSection.update({
        where: { id },
        data,
      });
      return this.mapToEventSection(updated);
    } catch (error) {
      this.logger.error(
        _ctx,
        'events.repository updateEventSection failed:',
        error,
      );
      return undefined;
    }
  }

  async deleteEventSection(_ctx: Ctx, id: string): Promise<void> {
    this.logger.debug(_ctx, 'deleteEventSection', { id });
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
      importInfo: prismaEvent.importInfo
        ? (prismaEvent.importInfo as { sourceCode: string; sourceId: string })
        : undefined,
      status: this.mapEventStatusFromDb(prismaEvent.status),
      rejectionReason: prismaEvent.rejectionReason ?? undefined,
      createdBy: prismaEvent.createdById,
      approvedBy: prismaEvent.approvedById ?? undefined,
      createdAt: prismaEvent.createdAt,
      updatedAt: prismaEvent.updatedAt,
      isPopular: prismaEvent.isPopular ?? false,
      highlight: prismaEvent.highlight ?? false,
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
  ):
    | 'Concert'
    | 'Sports'
    | 'Theater'
    | 'Festival'
    | 'Conference'
    | 'Comedy'
    | 'Other' {
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
    category:
      | 'Concert'
      | 'Sports'
      | 'Theater'
      | 'Festival'
      | 'Conference'
      | 'Comedy'
      | 'Other',
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

  private mapSeatingTypeToDb(
    seatingType: SeatingType,
  ): 'numbered' | 'unnumbered' {
    switch (seatingType) {
      case SeatingType.Numbered:
        return 'numbered';
      case SeatingType.Unnumbered:
        return 'unnumbered';
    }
  }

  private mapSeatingTypeFromDb(
    seatingType: 'numbered' | 'unnumbered',
  ): SeatingType {
    switch (seatingType) {
      case 'numbered':
        return SeatingType.Numbered;
      case 'unnumbered':
        return SeatingType.Unnumbered;
    }
  }
}
