import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { Event, EventDate } from './events.domain';
import { EventStatus, EventDateStatus } from './events.domain';

@Injectable()
export class EventsRepository implements OnModuleInit {
  private readonly eventStorage: KeyValueFileStorage<Event>;
  private readonly dateStorage: KeyValueFileStorage<EventDate>;

  constructor() {
    this.eventStorage = new KeyValueFileStorage<Event>('events');
    this.dateStorage = new KeyValueFileStorage<EventDate>('event-dates');
  }

  /**
   * Load data from file storage when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.eventStorage.onModuleInit();
    await this.dateStorage.onModuleInit();
  }

  // ==================== Events ====================

  /**
   * Create a new event
   */
  async createEvent(ctx: Ctx, event: Event): Promise<Event> {
    await this.eventStorage.set(ctx, event.id, event);
    return event;
  }

  /**
   * Find event by ID
   */
  async findEventById(ctx: Ctx, id: string): Promise<Event | undefined> {
    return await this.eventStorage.get(ctx, id);
  }

  /**
   * Get all events
   */
  async getAllEvents(ctx: Ctx): Promise<Event[]> {
    return await this.eventStorage.getAll(ctx);
  }

  /**
   * Get approved events
   */
  async getApprovedEvents(ctx: Ctx): Promise<Event[]> {
    const all = await this.eventStorage.getAll(ctx);
    return all.filter((e) => e.status === EventStatus.Approved);
  }

  /**
   * Get pending events (for admin)
   */
  async getPendingEvents(ctx: Ctx): Promise<Event[]> {
    const all = await this.eventStorage.getAll(ctx);
    return all.filter((e) => e.status === EventStatus.Pending);
  }

  /**
   * Get events by creator
   */
  async getEventsByCreator(ctx: Ctx, userId: string): Promise<Event[]> {
    const all = await this.eventStorage.getAll(ctx);
    return all.filter((e) => e.createdBy === userId);
  }

  /**
   * Update event
   */
  async updateEvent(ctx: Ctx, id: string, updates: Partial<Event>): Promise<Event | undefined> {
    const existing = await this.eventStorage.get(ctx, id);
    if (!existing) return undefined;

    const updated: Event = {
      ...existing,
      ...updates,
      id: existing.id, // Ensure ID can't be changed
      updatedAt: new Date(),
    };
    await this.eventStorage.set(ctx, id, updated);
    return updated;
  }

  /**
   * Delete event
   */
  async deleteEvent(ctx: Ctx, id: string): Promise<void> {
    await this.eventStorage.delete(ctx, id);
  }

  // ==================== Event Dates ====================

  /**
   * Create a new event date
   */
  async createEventDate(ctx: Ctx, date: EventDate): Promise<EventDate> {
    await this.dateStorage.set(ctx, date.id, date);
    return date;
  }

  /**
   * Find event date by ID
   */
  async findEventDateById(ctx: Ctx, id: string): Promise<EventDate | undefined> {
    return await this.dateStorage.get(ctx, id);
  }

  /**
   * Get dates for an event
   */
  async getDatesByEventId(ctx: Ctx, eventId: string): Promise<EventDate[]> {
    const all = await this.dateStorage.getAll(ctx);
    return all.filter((d) => d.eventId === eventId);
  }

  /**
   * Get approved dates for an event
   */
  async getApprovedDatesByEventId(ctx: Ctx, eventId: string): Promise<EventDate[]> {
    const all = await this.dateStorage.getAll(ctx);
    return all.filter(
      (d) => d.eventId === eventId && d.status === EventDateStatus.Approved,
    );
  }

  /**
   * Get pending dates (for admin)
   */
  async getPendingDates(ctx: Ctx): Promise<EventDate[]> {
    const all = await this.dateStorage.getAll(ctx);
    return all.filter((d) => d.status === EventDateStatus.Pending);
  }

  /**
   * Update event date
   */
  async updateEventDate(
    ctx: Ctx,
    id: string,
    updates: Partial<EventDate>,
  ): Promise<EventDate | undefined> {
    const existing = await this.dateStorage.get(ctx, id);
    if (!existing) return undefined;

    const updated: EventDate = {
      ...existing,
      ...updates,
      id: existing.id,
      eventId: existing.eventId,
      updatedAt: new Date(),
    };
    await this.dateStorage.set(ctx, id, updated);
    return updated;
  }

  /**
   * Delete event date
   */
  async deleteEventDate(ctx: Ctx, id: string): Promise<void> {
    await this.dateStorage.delete(ctx, id);
  }
}
