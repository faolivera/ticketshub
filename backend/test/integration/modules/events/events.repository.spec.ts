import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { EventsRepository } from '@/modules/events/events.repository';
import {
  EventStatus,
  EventDateStatus,
  EventSectionStatus,
  EventCategory,
} from '@/modules/events/events.domain';
import type { Event, EventDate, EventSection } from '@/modules/events/events.domain';
import { SeatingType } from '@/modules/tickets/tickets.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('EventsRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: EventsRepository;
  let ctx: Ctx;
  let testUserId: string;

  const createTestUser = async (): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: `user-${Date.now()}-${randomUUID()}@test.com`,
        firstName: 'Test',
        lastName: 'User',
        publicName: 'testuser',
        password: 'hashedpassword',
        role: 'User',
        level: 'Basic',
        status: 'Enabled',
        country: 'Germany',
        currency: 'EUR',
        language: 'en',
        emailVerified: true,
        phoneVerified: false,
      },
    });
    return user.id;
  };

  const createValidEvent = (overrides?: Partial<Event>): Event => ({
    id: randomUUID(),
    name: 'Test Event',
    category: EventCategory.Concert,
    venue: 'Test Venue',
    location: {
      street: '123 Main St',
      city: 'Berlin',
      state: 'Berlin',
      postalCode: '10115',
      country: 'Germany',
    },
    imageIds: [],
    status: EventStatus.Pending,
    createdBy: testUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createValidEventDate = (eventId: string, overrides?: Partial<EventDate>): EventDate => ({
    id: randomUUID(),
    eventId,
    date: new Date('2026-06-15T20:00:00Z'),
    status: EventDateStatus.Pending,
    createdBy: testUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createValidEventSection = (eventId: string, overrides?: Partial<EventSection>): EventSection => ({
    id: randomUUID(),
    eventId,
    name: 'General Admission',
    seatingType: SeatingType.Unnumbered,
    status: EventSectionStatus.Pending,
    createdBy: testUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new EventsRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
    testUserId = await createTestUser();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ==================== Events ====================

  describe('createEvent', () => {
    it('should create an event', async () => {
      const eventData = createValidEvent();

      const event = await repository.createEvent(ctx, eventData);

      expect(event).toBeDefined();
      expect(event.id).toBe(eventData.id);
      expect(event.name).toBe(eventData.name);
      expect(event.category).toBe(EventCategory.Concert);
      expect(event.status).toBe(EventStatus.Pending);
    });

    it('should create an event with banners', async () => {
      const eventData = createValidEvent({
        banners: {
          square: {
            type: 'square',
            filename: 'banner.jpg',
            originalFilename: 'mybanner.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 1024,
            width: 300,
            height: 300,
            uploadedBy: testUserId,
            uploadedAt: new Date(),
          },
        },
      });

      const event = await repository.createEvent(ctx, eventData);

      expect(event.banners).toBeDefined();
      expect(event.banners?.square?.filename).toBe('banner.jpg');
    });
  });

  describe('findEventById', () => {
    it('should return undefined when event does not exist', async () => {
      const event = await repository.findEventById(ctx, 'non-existent-id');
      expect(event).toBeUndefined();
    });

    it('should find event by id', async () => {
      const created = await repository.createEvent(ctx, createValidEvent());

      const found = await repository.findEventById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('getAllEvents', () => {
    it('should return empty array when no events exist', async () => {
      const events = await repository.getAllEvents(ctx);
      expect(events).toEqual([]);
    });

    it('should return all events ordered by createdAt desc', async () => {
      const event1 = await repository.createEvent(ctx, createValidEvent({ name: 'Event 1' }));
      const event2 = await repository.createEvent(ctx, createValidEvent({ name: 'Event 2' }));

      const events = await repository.getAllEvents(ctx);

      expect(events).toHaveLength(2);
      expect(events[0].id).toBe(event2.id);
      expect(events[1].id).toBe(event1.id);
    });
  });

  describe('findEventsByIds', () => {
    it('should return empty array when no ids provided', async () => {
      const events = await repository.findEventsByIds(ctx, []);
      expect(events).toEqual([]);
    });

    it('should find multiple events by ids', async () => {
      const event1 = await repository.createEvent(ctx, createValidEvent({ name: 'Event 1' }));
      const event2 = await repository.createEvent(ctx, createValidEvent({ name: 'Event 2' }));
      await repository.createEvent(ctx, createValidEvent({ name: 'Event 3' }));

      const events = await repository.findEventsByIds(ctx, [event1.id, event2.id]);

      expect(events).toHaveLength(2);
    });
  });

  describe('getDatesByEventIds', () => {
    it('should return empty array when no event ids provided', async () => {
      const dates = await repository.getDatesByEventIds(ctx, []);
      expect(dates).toEqual([]);
    });

    it('should get dates for multiple events', async () => {
      const event1 = await repository.createEvent(ctx, createValidEvent());
      const event2 = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventDate(ctx, createValidEventDate(event1.id));
      await repository.createEventDate(ctx, createValidEventDate(event2.id));

      const dates = await repository.getDatesByEventIds(ctx, [event1.id, event2.id]);

      expect(dates).toHaveLength(2);
    });
  });

  describe('getSectionsByEventIds', () => {
    it('should return empty array when no event ids provided', async () => {
      const sections = await repository.getSectionsByEventIds(ctx, []);
      expect(sections).toEqual([]);
    });

    it('should get sections for multiple events', async () => {
      const event1 = await repository.createEvent(ctx, createValidEvent());
      const event2 = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventSection(ctx, createValidEventSection(event1.id));
      await repository.createEventSection(ctx, createValidEventSection(event2.id));

      const sections = await repository.getSectionsByEventIds(ctx, [event1.id, event2.id]);

      expect(sections).toHaveLength(2);
    });
  });

  describe('getApprovedEvents', () => {
    it('should return only approved events', async () => {
      await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Pending }));
      const approved = await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Approved }));
      await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Rejected }));

      const events = await repository.getApprovedEvents(ctx);

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe(approved.id);
    });
  });

  describe('getPendingEvents', () => {
    it('should return pending events', async () => {
      await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Pending }));
      await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Approved }));

      const events = await repository.getPendingEvents(ctx);

      expect(events).toHaveLength(1);
      expect(events[0].status).toBe(EventStatus.Pending);
    });

    it('should include events with pending dates', async () => {
      const approvedEvent = await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Approved }));
      await repository.createEventDate(ctx, createValidEventDate(approvedEvent.id, { status: EventDateStatus.Pending }));

      const events = await repository.getPendingEvents(ctx);

      expect(events.some(e => e.id === approvedEvent.id)).toBe(true);
    });

    it('should include events with pending sections', async () => {
      const approvedEvent = await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Approved }));
      await repository.createEventSection(ctx, createValidEventSection(approvedEvent.id, { status: EventSectionStatus.Pending }));

      const events = await repository.getPendingEvents(ctx);

      expect(events.some(e => e.id === approvedEvent.id)).toBe(true);
    });
  });

  describe('getEventsByCreator', () => {
    it('should return events by creator', async () => {
      const anotherUserId = await createTestUser();
      await repository.createEvent(ctx, createValidEvent({ createdBy: testUserId }));
      await repository.createEvent(ctx, createValidEvent({ createdBy: anotherUserId }));

      const events = await repository.getEventsByCreator(ctx, testUserId);

      expect(events).toHaveLength(1);
      expect(events[0].createdBy).toBe(testUserId);
    });
  });

  describe('updateEvent', () => {
    it('should return undefined for non-existent event', async () => {
      const result = await repository.updateEvent(ctx, 'non-existent-id', { name: 'New Name' });
      expect(result).toBeUndefined();
    });

    it('should update event name', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());

      const updated = await repository.updateEvent(ctx, event.id, { name: 'Updated Name' });

      expect(updated?.name).toBe('Updated Name');
    });

    it('should update event status', async () => {
      const event = await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Pending }));

      const updated = await repository.updateEvent(ctx, event.id, { status: EventStatus.Approved });

      expect(updated?.status).toBe(EventStatus.Approved);
    });

    it('should update event category', async () => {
      const event = await repository.createEvent(ctx, createValidEvent({ category: EventCategory.Concert }));

      const updated = await repository.updateEvent(ctx, event.id, { category: EventCategory.Sports });

      expect(updated?.category).toBe(EventCategory.Sports);
    });
  });

  describe('deleteEvent', () => {
    it('should delete event', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());

      await repository.deleteEvent(ctx, event.id);

      const found = await repository.findEventById(ctx, event.id);
      expect(found).toBeUndefined();
    });
  });

  describe('getAllEventsPaginated', () => {
    it('should return paginated events', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.createEvent(ctx, createValidEvent({ name: `Event ${i}` }));
      }

      const result = await repository.getAllEventsPaginated(ctx, { page: 1, limit: 2 });

      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should filter by search term', async () => {
      await repository.createEvent(ctx, createValidEvent({ name: 'Rock Concert' }));
      await repository.createEvent(ctx, createValidEvent({ name: 'Jazz Night' }));

      const result = await repository.getAllEventsPaginated(ctx, { page: 1, limit: 10, search: 'rock' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].name).toBe('Rock Concert');
    });
  });

  describe('getApprovedEventsForSelection', () => {
    it('should return only approved events with pagination', async () => {
      await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Approved, name: 'Approved 1' }));
      await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Pending, name: 'Pending 1' }));

      const result = await repository.getApprovedEventsForSelection(ctx, { limit: 10, offset: 0 });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].status).toBe(EventStatus.Approved);
    });

    it('should search by name or venue', async () => {
      await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Approved, name: 'Concert', venue: 'Stadium' }));
      await repository.createEvent(ctx, createValidEvent({ status: EventStatus.Approved, name: 'Other', venue: 'Arena' }));

      const result = await repository.getApprovedEventsForSelection(ctx, { limit: 10, offset: 0, search: 'stadium' });

      expect(result.events).toHaveLength(1);
      expect(result.events[0].venue).toBe('Stadium');
    });
  });

  // ==================== Event Dates ====================

  describe('createEventDate', () => {
    it('should create an event date', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const dateData = createValidEventDate(event.id);

      const date = await repository.createEventDate(ctx, dateData);

      expect(date).toBeDefined();
      expect(date.id).toBe(dateData.id);
      expect(date.eventId).toBe(event.id);
    });
  });

  describe('findEventDateById', () => {
    it('should return undefined when date does not exist', async () => {
      const date = await repository.findEventDateById(ctx, 'non-existent-id');
      expect(date).toBeUndefined();
    });

    it('should find event date by id', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const created = await repository.createEventDate(ctx, createValidEventDate(event.id));

      const found = await repository.findEventDateById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('getDatesByEventId', () => {
    it('should return dates for event ordered by date', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventDate(ctx, createValidEventDate(event.id, { date: new Date('2026-07-01') }));
      await repository.createEventDate(ctx, createValidEventDate(event.id, { date: new Date('2026-06-01') }));

      const dates = await repository.getDatesByEventId(ctx, event.id);

      expect(dates).toHaveLength(2);
      expect(dates[0].date < dates[1].date).toBe(true);
    });
  });

  describe('findEventDateByEventIdAndDate', () => {
    it('should find date by event id and exact date', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const targetDate = new Date('2026-06-15T20:00:00Z');
      await repository.createEventDate(ctx, createValidEventDate(event.id, { date: targetDate }));

      const found = await repository.findEventDateByEventIdAndDate(ctx, event.id, targetDate);

      expect(found).toBeDefined();
    });

    it('should return undefined when date not found', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());

      const found = await repository.findEventDateByEventIdAndDate(ctx, event.id, new Date('2026-01-01'));

      expect(found).toBeUndefined();
    });
  });

  describe('getApprovedDatesByEventId', () => {
    it('should return only approved dates', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventDate(ctx, createValidEventDate(event.id, { status: EventDateStatus.Pending }));
      await repository.createEventDate(ctx, createValidEventDate(event.id, { status: EventDateStatus.Approved }));

      const dates = await repository.getApprovedDatesByEventId(ctx, event.id);

      expect(dates).toHaveLength(1);
      expect(dates[0].status).toBe(EventDateStatus.Approved);
    });
  });

  describe('getDatesByEventIdAndStatus', () => {
    it('should filter dates by multiple statuses', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventDate(ctx, createValidEventDate(event.id, { status: EventDateStatus.Pending }));
      await repository.createEventDate(ctx, createValidEventDate(event.id, { status: EventDateStatus.Approved }));
      await repository.createEventDate(ctx, createValidEventDate(event.id, { status: EventDateStatus.Rejected }));

      const dates = await repository.getDatesByEventIdAndStatus(ctx, event.id, [EventDateStatus.Pending, EventDateStatus.Approved]);

      expect(dates).toHaveLength(2);
    });
  });

  describe('getPendingDates', () => {
    it('should return all pending dates', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventDate(ctx, createValidEventDate(event.id, { status: EventDateStatus.Pending }));
      await repository.createEventDate(ctx, createValidEventDate(event.id, { status: EventDateStatus.Approved }));

      const dates = await repository.getPendingDates(ctx);

      expect(dates).toHaveLength(1);
      expect(dates[0].status).toBe(EventDateStatus.Pending);
    });
  });

  describe('updateEventDate', () => {
    it('should return undefined for non-existent date', async () => {
      const result = await repository.updateEventDate(ctx, 'non-existent-id', { status: EventDateStatus.Approved });
      expect(result).toBeUndefined();
    });

    it('should update event date status', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const date = await repository.createEventDate(ctx, createValidEventDate(event.id));

      const updated = await repository.updateEventDate(ctx, date.id, { status: EventDateStatus.Approved });

      expect(updated?.status).toBe(EventDateStatus.Approved);
    });
  });

  describe('deleteEventDate', () => {
    it('should delete event date', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const date = await repository.createEventDate(ctx, createValidEventDate(event.id));

      await repository.deleteEventDate(ctx, date.id);

      const found = await repository.findEventDateById(ctx, date.id);
      expect(found).toBeUndefined();
    });
  });

  // ==================== Event Sections ====================

  describe('createEventSection', () => {
    it('should create an event section', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const sectionData = createValidEventSection(event.id);

      const section = await repository.createEventSection(ctx, sectionData);

      expect(section).toBeDefined();
      expect(section.id).toBe(sectionData.id);
      expect(section.eventId).toBe(event.id);
      expect(section.seatingType).toBe(SeatingType.Unnumbered);
    });
  });

  describe('findEventSectionById', () => {
    it('should return undefined when section does not exist', async () => {
      const section = await repository.findEventSectionById(ctx, 'non-existent-id');
      expect(section).toBeUndefined();
    });

    it('should find section by id', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const created = await repository.createEventSection(ctx, createValidEventSection(event.id));

      const found = await repository.findEventSectionById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });
  });

  describe('getSectionsByEventId', () => {
    it('should return sections ordered by name', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventSection(ctx, createValidEventSection(event.id, { name: 'VIP' }));
      await repository.createEventSection(ctx, createValidEventSection(event.id, { name: 'General' }));

      const sections = await repository.getSectionsByEventId(ctx, event.id);

      expect(sections).toHaveLength(2);
      expect(sections[0].name).toBe('General');
      expect(sections[1].name).toBe('VIP');
    });
  });

  describe('getApprovedSectionsByEventId', () => {
    it('should return only approved sections', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventSection(ctx, createValidEventSection(event.id, { status: EventSectionStatus.Pending }));
      await repository.createEventSection(ctx, createValidEventSection(event.id, { status: EventSectionStatus.Approved, name: 'Approved Section' }));

      const sections = await repository.getApprovedSectionsByEventId(ctx, event.id);

      expect(sections).toHaveLength(1);
      expect(sections[0].status).toBe(EventSectionStatus.Approved);
    });
  });

  describe('getSectionsByEventIdAndStatus', () => {
    it('should filter sections by multiple statuses', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventSection(ctx, createValidEventSection(event.id, { status: EventSectionStatus.Pending, name: 'Section A' }));
      await repository.createEventSection(ctx, createValidEventSection(event.id, { status: EventSectionStatus.Approved, name: 'Section B' }));
      await repository.createEventSection(ctx, createValidEventSection(event.id, { status: EventSectionStatus.Rejected, name: 'Section C' }));

      const sections = await repository.getSectionsByEventIdAndStatus(ctx, event.id, [EventSectionStatus.Pending, EventSectionStatus.Approved]);

      expect(sections).toHaveLength(2);
    });
  });

  describe('getPendingSections', () => {
    it('should return all pending sections', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventSection(ctx, createValidEventSection(event.id, { status: EventSectionStatus.Pending }));
      await repository.createEventSection(ctx, createValidEventSection(event.id, { status: EventSectionStatus.Approved, name: 'Approved' }));

      const sections = await repository.getPendingSections(ctx);

      expect(sections).toHaveLength(1);
      expect(sections[0].status).toBe(EventSectionStatus.Pending);
    });
  });

  describe('findSectionByEventAndName', () => {
    it('should find section by name (case insensitive)', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      await repository.createEventSection(ctx, createValidEventSection(event.id, { name: 'VIP Section' }));

      const found = await repository.findSectionByEventAndName(ctx, event.id, 'vip section');

      expect(found).toBeDefined();
      expect(found?.name).toBe('VIP Section');
    });

    it('should return undefined when section not found', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());

      const found = await repository.findSectionByEventAndName(ctx, event.id, 'Non Existent');

      expect(found).toBeUndefined();
    });
  });

  describe('updateEventSection', () => {
    it('should return undefined for non-existent section', async () => {
      const result = await repository.updateEventSection(ctx, 'non-existent-id', { name: 'New Name' });
      expect(result).toBeUndefined();
    });

    it('should update section name', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const section = await repository.createEventSection(ctx, createValidEventSection(event.id));

      const updated = await repository.updateEventSection(ctx, section.id, { name: 'Updated Section' });

      expect(updated?.name).toBe('Updated Section');
    });

    it('should update section seating type', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const section = await repository.createEventSection(ctx, createValidEventSection(event.id, { seatingType: SeatingType.Unnumbered }));

      const updated = await repository.updateEventSection(ctx, section.id, { seatingType: SeatingType.Numbered });

      expect(updated?.seatingType).toBe(SeatingType.Numbered);
    });
  });

  describe('deleteEventSection', () => {
    it('should delete event section', async () => {
      const event = await repository.createEvent(ctx, createValidEvent());
      const section = await repository.createEventSection(ctx, createValidEventSection(event.id));

      await repository.deleteEventSection(ctx, section.id);

      const found = await repository.findEventSectionById(ctx, section.id);
      expect(found).toBeUndefined();
    });
  });
});
