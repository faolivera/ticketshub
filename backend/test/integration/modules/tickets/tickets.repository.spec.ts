import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { TicketsRepository } from '@/modules/tickets/tickets.repository';
import {
  TicketType,
  DeliveryMethod,
  ListingStatus,
  TicketUnitStatus,
} from '@/modules/tickets/tickets.domain';
import type { TicketListing, TicketUnit, Money } from '@/modules/tickets/tickets.domain';
import { SeatingType } from '@/modules/tickets/tickets.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('TicketsRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: TicketsRepository;
  let ctx: Ctx;

  let testUserId: string;
  let testEventId: string;
  let testEventDateId: string;
  let testEventSectionId: string;

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

  const createTestEvent = async (createdById: string): Promise<string> => {
    const event = await prisma.event.create({
      data: {
        name: `Test Event ${Date.now()}`,
        category: 'Concert',
        venue: 'Test Venue',
        location: {
          street: '123 Main St',
          city: 'Berlin',
          state: 'Berlin',
          postalCode: '10115',
          country: 'Germany',
        },
        imageIds: [],
        status: 'approved',
        createdById,
      },
    });
    return event.id;
  };

  const createTestEventDate = async (eventId: string, createdById: string): Promise<string> => {
    const eventDate = await prisma.eventDate.create({
      data: {
        eventId,
        date: new Date('2026-06-15T20:00:00Z'),
        status: 'approved',
        createdById,
      },
    });
    return eventDate.id;
  };

  const createTestEventSection = async (
    eventId: string,
    createdById: string,
    seatingType: 'numbered' | 'unnumbered' = 'unnumbered',
  ): Promise<string> => {
    const eventSection = await prisma.eventSection.create({
      data: {
        eventId,
        name: `Section ${Date.now()}-${randomUUID().slice(0, 8)}`,
        seatingType,
        status: 'approved',
        createdById,
      },
    });
    return eventSection.id;
  };

  const createValidMoney = (amount = 5000, currency = 'EUR'): Money => ({
    amount,
    currency: currency as Money['currency'],
  });

  const createValidTicketUnit = (listingId: string, overrides?: Partial<TicketUnit>): TicketUnit => ({
    id: randomUUID(),
    listingId,
    status: TicketUnitStatus.Available,
    version: 1,
    ...overrides,
  });

  const createValidListing = (overrides?: Partial<TicketListing>): TicketListing => {
    const id = randomUUID();
    return {
      id,
      sellerId: testUserId,
      eventId: testEventId,
      eventDateId: testEventDateId,
      eventSectionId: testEventSectionId,
      type: TicketType.DigitalTransferable,
      ticketUnits: [createValidTicketUnit(id), createValidTicketUnit(id)],
      sellTogether: false,
      pricePerTicket: createValidMoney(),
      status: ListingStatus.Active,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  };

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new TicketsRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
    testUserId = await createTestUser();
    testEventId = await createTestEvent(testUserId);
    testEventDateId = await createTestEventDate(testEventId, testUserId);
    testEventSectionId = await createTestEventSection(testEventId, testUserId);
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ==================== create ====================

  describe('create', () => {
    it('should create a listing with ticket units', async () => {
      const listingData = createValidListing();

      const listing = await repository.create(ctx, listingData);

      expect(listing).toBeDefined();
      expect(listing.id).toBe(listingData.id);
      expect(listing.sellerId).toBe(testUserId);
      expect(listing.eventId).toBe(testEventId);
      expect(listing.eventDateId).toBe(testEventDateId);
      expect(listing.eventSectionId).toBe(testEventSectionId);
      expect(listing.type).toBe(TicketType.DigitalTransferable);
      expect(listing.ticketUnits).toHaveLength(2);
      expect(listing.status).toBe(ListingStatus.Active);
      expect(listing.pricePerTicket.amount).toBe(5000);
    });

    it('should create a physical ticket with delivery method and address', async () => {
      const listingData = createValidListing({
        type: TicketType.Physical,
        deliveryMethod: DeliveryMethod.Pickup,
        pickupAddress: {
          line1: '123 Main St',
          city: 'Berlin',
          state: 'Berlin',
          postalCode: '10115',
          countryCode: 'DE',
        },
      });

      const listing = await repository.create(ctx, listingData);

      expect(listing.type).toBe(TicketType.Physical);
      expect(listing.deliveryMethod).toBe(DeliveryMethod.Pickup);
      expect(listing.pickupAddress).toBeDefined();
      expect(listing.pickupAddress?.city).toBe('Berlin');
    });

    it('should create a listing with seat information', async () => {
      const numberedSectionId = await createTestEventSection(testEventId, testUserId, 'numbered');
      const id = randomUUID();
      const listingData = createValidListing({
        id,
        eventSectionId: numberedSectionId,
        ticketUnits: [
          createValidTicketUnit(id, { seat: { row: 'A', seatNumber: '1' } }),
          createValidTicketUnit(id, { seat: { row: 'A', seatNumber: '2' } }),
        ],
      });

      const listing = await repository.create(ctx, listingData);

      expect(listing.ticketUnits[0].seat).toBeDefined();
      expect(listing.ticketUnits[0].seat?.row).toBe('A');
    });

    it('should create a listing with sellTogether flag', async () => {
      const listingData = createValidListing({ sellTogether: true });

      const listing = await repository.create(ctx, listingData);

      expect(listing.sellTogether).toBe(true);
    });

    it('should create a listing with expiration date', async () => {
      const expiresAt = new Date('2026-06-14T20:00:00Z');
      const listingData = createValidListing({ expiresAt });

      const listing = await repository.create(ctx, listingData);

      expect(listing.expiresAt).toBeDefined();
      expect(listing.expiresAt?.toISOString()).toBe(expiresAt.toISOString());
    });
  });

  // ==================== findById ====================

  describe('findById', () => {
    it('should return undefined when listing does not exist', async () => {
      const listing = await repository.findById(ctx, 'non-existent-id');
      expect(listing).toBeUndefined();
    });

    it('should find listing by id with ticket units', async () => {
      const created = await repository.create(ctx, createValidListing());

      const found = await repository.findById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.ticketUnits).toHaveLength(2);
    });
  });

  // ==================== getByIds ====================

  describe('getByIds', () => {
    it('should return empty array when no ids provided', async () => {
      const listings = await repository.getByIds(ctx, []);
      expect(listings).toEqual([]);
    });

    it('should return empty array when no listings match', async () => {
      const listings = await repository.getByIds(ctx, ['non-existent-1', 'non-existent-2']);
      expect(listings).toEqual([]);
    });

    it('should find multiple listings by ids', async () => {
      const listing1 = await repository.create(ctx, createValidListing());
      const listing2 = await repository.create(ctx, createValidListing());
      await repository.create(ctx, createValidListing());

      const listings = await repository.getByIds(ctx, [listing1.id, listing2.id]);

      expect(listings).toHaveLength(2);
      expect(listings.map(l => l.id)).toContain(listing1.id);
      expect(listings.map(l => l.id)).toContain(listing2.id);
    });
  });

  // ==================== getAll ====================

  describe('getAll', () => {
    it('should return empty array when no listings exist', async () => {
      const listings = await repository.getAll(ctx);
      expect(listings).toEqual([]);
    });

    it('should return all listings ordered by createdAt desc', async () => {
      const listing1 = await repository.create(ctx, createValidListing());
      const listing2 = await repository.create(ctx, createValidListing());

      const listings = await repository.getAll(ctx);

      expect(listings).toHaveLength(2);
      expect(listings[0].id).toBe(listing2.id);
      expect(listings[1].id).toBe(listing1.id);
    });
  });

  // ==================== getActiveListings ====================

  describe('getActiveListings', () => {
    it('should return only active listings', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));
      const activeListing = await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Sold }));

      const listings = await repository.getActiveListings(ctx);

      expect(listings).toHaveLength(1);
      expect(listings[0].id).toBe(activeListing.id);
    });

    it('should return empty array when no active listings', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));

      const listings = await repository.getActiveListings(ctx);

      expect(listings).toEqual([]);
    });
  });

  // ==================== getByEventId ====================

  describe('getByEventId', () => {
    it('should return active listings for event', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));

      const listings = await repository.getByEventId(ctx, testEventId);

      expect(listings).toHaveLength(1);
      expect(listings[0].status).toBe(ListingStatus.Active);
    });

    it('should return empty array for event with no active listings', async () => {
      const otherEventId = await createTestEvent(testUserId);

      const listings = await repository.getByEventId(ctx, otherEventId);

      expect(listings).toEqual([]);
    });
  });

  // ==================== getByEventDateId ====================

  describe('getByEventDateId', () => {
    it('should return active listings for event date', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Sold }));

      const listings = await repository.getByEventDateId(ctx, testEventDateId);

      expect(listings).toHaveLength(1);
      expect(listings[0].status).toBe(ListingStatus.Active);
    });

    it('should return empty array for event date with no listings', async () => {
      const otherDateId = await createTestEventDate(testEventId, testUserId);

      const listings = await repository.getByEventDateId(ctx, otherDateId);

      expect(listings).toEqual([]);
    });
  });

  // ==================== getBySellerId ====================

  describe('getBySellerId', () => {
    it('should return all listings for seller', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Sold }));

      const listings = await repository.getBySellerId(ctx, testUserId);

      expect(listings).toHaveLength(3);
    });

    it('should return empty array for seller with no listings', async () => {
      const otherUserId = await createTestUser();

      const listings = await repository.getBySellerId(ctx, otherUserId);

      expect(listings).toEqual([]);
    });

    it('should not return other sellers listings', async () => {
      const otherUserId = await createTestUser();
      await repository.create(ctx, createValidListing({ sellerId: otherUserId }));
      await repository.create(ctx, createValidListing({ sellerId: testUserId }));

      const listings = await repository.getBySellerId(ctx, testUserId);

      expect(listings).toHaveLength(1);
      expect(listings[0].sellerId).toBe(testUserId);
    });
  });

  // ==================== update ====================

  describe('update', () => {
    it('should return undefined for non-existent listing', async () => {
      const result = await repository.update(ctx, 'non-existent-id', { description: 'Updated' });
      expect(result).toBeUndefined();
    });

    it('should update listing status', async () => {
      const listing = await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));

      const updated = await repository.update(ctx, listing.id, { status: ListingStatus.Active });

      expect(updated?.status).toBe(ListingStatus.Active);
    });

    it('should update listing description', async () => {
      const listing = await repository.create(ctx, createValidListing());

      const updated = await repository.update(ctx, listing.id, { description: 'New description' });

      expect(updated?.description).toBe('New description');
    });

    it('should update price', async () => {
      const listing = await repository.create(ctx, createValidListing());

      const updated = await repository.update(ctx, listing.id, {
        pricePerTicket: createValidMoney(7500),
      });

      expect(updated?.pricePerTicket.amount).toBe(7500);
    });

    it('should update ticket type', async () => {
      const listing = await repository.create(ctx, createValidListing({ type: TicketType.DigitalTransferable }));

      const updated = await repository.update(ctx, listing.id, { type: TicketType.Physical });

      expect(updated?.type).toBe(TicketType.Physical);
    });

    it('should update sellTogether flag', async () => {
      const listing = await repository.create(ctx, createValidListing({ sellTogether: false }));

      const updated = await repository.update(ctx, listing.id, { sellTogether: true });

      expect(updated?.sellTogether).toBe(true);
    });
  });

  // ==================== delete ====================

  describe('delete', () => {
    it('should delete listing', async () => {
      const listing = await repository.create(ctx, createValidListing());

      await repository.delete(ctx, listing.id);

      const found = await repository.findById(ctx, listing.id);
      expect(found).toBeUndefined();
    });

    it('should delete listing and cascade to ticket units', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitIds = listing.ticketUnits.map(u => u.id);

      await repository.delete(ctx, listing.id);

      const units = await prisma.ticketUnit.findMany({
        where: { id: { in: unitIds } },
      });
      expect(units).toHaveLength(0);
    });
  });

  // ==================== reserveUnits ====================

  describe('reserveUnits', () => {
    it('should reserve available units', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitToReserve = listing.ticketUnits[0];

      const updated = await repository.reserveUnits(ctx, listing.id, [unitToReserve.id]);

      expect(updated).toBeDefined();
      const reservedUnit = updated?.ticketUnits.find(u => u.id === unitToReserve.id);
      expect(reservedUnit?.status).toBe(TicketUnitStatus.Reserved);
    });

    it('should return undefined when unit not found', async () => {
      const listing = await repository.create(ctx, createValidListing());

      const result = await repository.reserveUnits(ctx, listing.id, ['non-existent-unit']);

      expect(result).toBeUndefined();
    });

    it('should return undefined when unit already reserved', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitId = listing.ticketUnits[0].id;
      await repository.reserveUnits(ctx, listing.id, [unitId]);

      const result = await repository.reserveUnits(ctx, listing.id, [unitId]);

      expect(result).toBeUndefined();
    });

    it('should return undefined when duplicate unit ids provided', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitId = listing.ticketUnits[0].id;

      const result = await repository.reserveUnits(ctx, listing.id, [unitId, unitId]);

      expect(result).toBeUndefined();
    });

    it('should mark listing as Sold when all units reserved', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const allUnitIds = listing.ticketUnits.map(u => u.id);

      const updated = await repository.reserveUnits(ctx, listing.id, allUnitIds);

      expect(updated?.status).toBe(ListingStatus.Sold);
    });

    it('should keep listing Active when some units remain available', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const oneUnitId = [listing.ticketUnits[0].id];

      const updated = await repository.reserveUnits(ctx, listing.id, oneUnitId);

      expect(updated?.status).toBe(ListingStatus.Active);
    });
  });

  // ==================== restoreUnits ====================

  describe('restoreUnits', () => {
    it('should restore reserved units to available', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitId = listing.ticketUnits[0].id;
      await repository.reserveUnits(ctx, listing.id, [unitId]);

      const updated = await repository.restoreUnits(ctx, listing.id, [unitId]);

      expect(updated).toBeDefined();
      const restoredUnit = updated?.ticketUnits.find(u => u.id === unitId);
      expect(restoredUnit?.status).toBe(TicketUnitStatus.Available);
    });

    it('should return undefined when unit not found', async () => {
      const listing = await repository.create(ctx, createValidListing());

      const result = await repository.restoreUnits(ctx, listing.id, ['non-existent-unit']);

      expect(result).toBeUndefined();
    });

    it('should return undefined when unit not reserved', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitId = listing.ticketUnits[0].id;

      const result = await repository.restoreUnits(ctx, listing.id, [unitId]);

      expect(result).toBeUndefined();
    });

    it('should return undefined when duplicate unit ids provided', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitId = listing.ticketUnits[0].id;
      await repository.reserveUnits(ctx, listing.id, [unitId]);

      const result = await repository.restoreUnits(ctx, listing.id, [unitId, unitId]);

      expect(result).toBeUndefined();
    });

    it('should update listing status to Active when units restored', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const allUnitIds = listing.ticketUnits.map(u => u.id);
      await repository.reserveUnits(ctx, listing.id, allUnitIds);

      const updated = await repository.restoreUnits(ctx, listing.id, [allUnitIds[0]]);

      expect(updated?.status).toBe(ListingStatus.Active);
    });
  });

  // ==================== getPendingByEventId ====================

  describe('getPendingByEventId', () => {
    it('should return pending listings for event', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));

      const listings = await repository.getPendingByEventId(ctx, testEventId);

      expect(listings).toHaveLength(1);
      expect(listings[0].status).toBe(ListingStatus.Pending);
    });

    it('should return empty array when no pending listings', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));

      const listings = await repository.getPendingByEventId(ctx, testEventId);

      expect(listings).toEqual([]);
    });
  });

  // ==================== getPendingByEventDateId ====================

  describe('getPendingByEventDateId', () => {
    it('should return pending listings for event date', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));

      const listings = await repository.getPendingByEventDateId(ctx, testEventDateId);

      expect(listings).toHaveLength(1);
      expect(listings[0].status).toBe(ListingStatus.Pending);
    });

    it('should return empty array when no pending listings for date', async () => {
      const otherDateId = await createTestEventDate(testEventId, testUserId);

      const listings = await repository.getPendingByEventDateId(ctx, otherDateId);

      expect(listings).toEqual([]);
    });
  });

  // ==================== bulkUpdateStatus ====================

  describe('bulkUpdateStatus', () => {
    it('should return 0 when no ids provided', async () => {
      const count = await repository.bulkUpdateStatus(ctx, [], ListingStatus.Cancelled);
      expect(count).toBe(0);
    });

    it('should update status for multiple listings', async () => {
      const listing1 = await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));
      const listing2 = await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));

      const count = await repository.bulkUpdateStatus(
        ctx,
        [listing1.id, listing2.id],
        ListingStatus.Active,
      );

      expect(count).toBe(2);

      const updated1 = await repository.findById(ctx, listing1.id);
      const updated2 = await repository.findById(ctx, listing2.id);
      expect(updated1?.status).toBe(ListingStatus.Active);
      expect(updated2?.status).toBe(ListingStatus.Active);
    });

    it('should handle non-existent ids gracefully', async () => {
      const listing = await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));

      const count = await repository.bulkUpdateStatus(
        ctx,
        [listing.id, 'non-existent-id'],
        ListingStatus.Cancelled,
      );

      expect(count).toBe(1);
    });
  });

  // ==================== getAllByEventDateId ====================

  describe('getAllByEventDateId', () => {
    it('should return all listings for event date regardless of status', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Sold }));

      const listings = await repository.getAllByEventDateId(ctx, testEventDateId);

      expect(listings).toHaveLength(3);
    });

    it('should return empty array for event date with no listings', async () => {
      const otherDateId = await createTestEventDate(testEventId, testUserId);

      const listings = await repository.getAllByEventDateId(ctx, otherDateId);

      expect(listings).toEqual([]);
    });
  });

  // ==================== getPendingByEventSectionId ====================

  describe('getPendingByEventSectionId', () => {
    it('should return pending listings for section', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));

      const listings = await repository.getPendingByEventSectionId(ctx, testEventSectionId);

      expect(listings).toHaveLength(1);
      expect(listings[0].status).toBe(ListingStatus.Pending);
    });

    it('should return empty array when no pending listings for section', async () => {
      const otherSectionId = await createTestEventSection(testEventId, testUserId);

      const listings = await repository.getPendingByEventSectionId(ctx, otherSectionId);

      expect(listings).toEqual([]);
    });
  });

  // ==================== getAllByEventSectionId ====================

  describe('getAllByEventSectionId', () => {
    it('should return all listings for section regardless of status', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Cancelled }));

      const listings = await repository.getAllByEventSectionId(ctx, testEventSectionId);

      expect(listings).toHaveLength(3);
    });

    it('should return empty array for section with no listings', async () => {
      const otherSectionId = await createTestEventSection(testEventId, testUserId);

      const listings = await repository.getAllByEventSectionId(ctx, otherSectionId);

      expect(listings).toEqual([]);
    });
  });

  // ==================== getAllByEventId ====================

  describe('getAllByEventId', () => {
    it('should return all listings for event regardless of status', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Sold }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Expired }));

      const listings = await repository.getAllByEventId(ctx, testEventId);

      expect(listings).toHaveLength(4);
    });

    it('should return empty array for event with no listings', async () => {
      const otherEventId = await createTestEvent(testUserId);

      const listings = await repository.getAllByEventId(ctx, otherEventId);

      expect(listings).toEqual([]);
    });
  });

  // ==================== getListingStatsByEventIds ====================

  describe('getListingStatsByEventIds', () => {
    it('should return empty map entries when no listings exist', async () => {
      const stats = await repository.getListingStatsByEventIds(ctx, [testEventId]);

      expect(stats.get(testEventId)).toEqual({ listingsCount: 0, availableTicketsCount: 0 });
    });

    it('should return correct stats for events with listings', async () => {
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));

      const stats = await repository.getListingStatsByEventIds(ctx, [testEventId]);

      const eventStats = stats.get(testEventId);
      expect(eventStats?.listingsCount).toBe(3);
      expect(eventStats?.availableTicketsCount).toBe(4);
    });

    it('should return stats for multiple events', async () => {
      const otherEventId = await createTestEvent(testUserId);
      const otherDateId = await createTestEventDate(otherEventId, testUserId);
      const otherSectionId = await createTestEventSection(otherEventId, testUserId);

      await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.create(ctx, createValidListing({
        eventId: otherEventId,
        eventDateId: otherDateId,
        eventSectionId: otherSectionId,
        status: ListingStatus.Active,
      }));

      const stats = await repository.getListingStatsByEventIds(ctx, [testEventId, otherEventId]);

      expect(stats.get(testEventId)?.listingsCount).toBe(1);
      expect(stats.get(otherEventId)?.listingsCount).toBe(1);
    });

    it('should return empty map when no event ids provided', async () => {
      const stats = await repository.getListingStatsByEventIds(ctx, []);

      expect(stats.size).toBe(0);
    });

    it('should only count available units in active listings', async () => {
      const listing = await repository.create(ctx, createValidListing({ status: ListingStatus.Active }));
      await repository.reserveUnits(ctx, listing.id, [listing.ticketUnits[0].id]);

      const stats = await repository.getListingStatsByEventIds(ctx, [testEventId]);

      expect(stats.get(testEventId)?.availableTicketsCount).toBe(1);
    });
  });

  // ==================== findByIdForUpdate ====================

  describe('findByIdForUpdate', () => {
    it('should return undefined when listing does not exist', async () => {
      const listing = await repository.findByIdForUpdate(ctx, 'non-existent-id');
      expect(listing).toBeUndefined();
    });

    it('should find listing by id with ticket units', async () => {
      const created = await repository.create(ctx, createValidListing());

      const found = await repository.findByIdForUpdate(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.ticketUnits).toHaveLength(2);
    });
  });

  // ==================== reserveUnitsWithLock ====================

  describe('reserveUnitsWithLock', () => {
    it('should reserve units with lock', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitId = listing.ticketUnits[0].id;

      const updated = await repository.reserveUnitsWithLock(ctx, listing.id, [unitId]);

      expect(updated).toBeDefined();
      const reservedUnit = updated.ticketUnits.find(u => u.id === unitId);
      expect(reservedUnit?.status).toBe(TicketUnitStatus.Reserved);
    });

    it('should throw when unit not found', async () => {
      const listing = await repository.create(ctx, createValidListing());

      await expect(
        repository.reserveUnitsWithLock(ctx, listing.id, ['non-existent-unit']),
      ).rejects.toThrow('Some ticket units not found');
    });

    it('should throw when unit not available', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitId = listing.ticketUnits[0].id;
      await repository.reserveUnitsWithLock(ctx, listing.id, [unitId]);

      await expect(
        repository.reserveUnitsWithLock(ctx, listing.id, [unitId]),
      ).rejects.toThrow('Some tickets are no longer available');
    });

    it('should mark listing as Sold when all units reserved', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const allUnitIds = listing.ticketUnits.map(u => u.id);

      const updated = await repository.reserveUnitsWithLock(ctx, listing.id, allUnitIds);

      expect(updated.status).toBe(ListingStatus.Sold);
    });
  });

  // ==================== restoreUnitsWithLock ====================

  describe('restoreUnitsWithLock', () => {
    it('should restore reserved units with lock', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitId = listing.ticketUnits[0].id;
      await repository.reserveUnitsWithLock(ctx, listing.id, [unitId]);

      const updated = await repository.restoreUnitsWithLock(ctx, listing.id, [unitId]);

      expect(updated).toBeDefined();
      const restoredUnit = updated.ticketUnits.find(u => u.id === unitId);
      expect(restoredUnit?.status).toBe(TicketUnitStatus.Available);
    });

    it('should throw when unit not found', async () => {
      const listing = await repository.create(ctx, createValidListing());

      await expect(
        repository.restoreUnitsWithLock(ctx, listing.id, ['non-existent-unit']),
      ).rejects.toThrow('Some ticket units not found');
    });

    it('should throw when unit not reserved', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const unitId = listing.ticketUnits[0].id;

      await expect(
        repository.restoreUnitsWithLock(ctx, listing.id, [unitId]),
      ).rejects.toThrow('Some tickets are not in reserved state');
    });

    it('should update listing status to Active when units restored', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const allUnitIds = listing.ticketUnits.map(u => u.id);
      await repository.reserveUnitsWithLock(ctx, listing.id, allUnitIds);

      const updated = await repository.restoreUnitsWithLock(ctx, listing.id, allUnitIds);

      expect(updated.status).toBe(ListingStatus.Active);
    });
  });

  // ==================== updateWithVersion ====================

  describe('updateWithVersion', () => {
    it('should update listing when version matches', async () => {
      const listing = await repository.create(ctx, createValidListing());

      const updated = await repository.updateWithVersion(
        ctx,
        listing.id,
        { description: 'Updated description' },
        listing.version,
      );

      expect(updated.description).toBe('Updated description');
      expect(updated.version).toBe(listing.version + 1);
    });

    it('should throw OptimisticLockException when version mismatch', async () => {
      const listing = await repository.create(ctx, createValidListing());
      const wrongVersion = listing.version + 100;

      await expect(
        repository.updateWithVersion(
          ctx,
          listing.id,
          { description: 'Updated' },
          wrongVersion,
        ),
      ).rejects.toThrow('was modified by another process');
    });

    it('should throw OptimisticLockException for non-existent listing', async () => {
      await expect(
        repository.updateWithVersion(
          ctx,
          'non-existent-id',
          { description: 'Updated' },
          1,
        ),
      ).rejects.toThrow('was modified by another process');
    });

    it('should update status with version check', async () => {
      const listing = await repository.create(ctx, createValidListing({ status: ListingStatus.Pending }));

      const updated = await repository.updateWithVersion(
        ctx,
        listing.id,
        { status: ListingStatus.Active },
        listing.version,
      );

      expect(updated.status).toBe(ListingStatus.Active);
    });

    it('should update price with version check', async () => {
      const listing = await repository.create(ctx, createValidListing());

      const updated = await repository.updateWithVersion(
        ctx,
        listing.id,
        { pricePerTicket: createValidMoney(10000) },
        listing.version,
      );

      expect(updated.pricePerTicket.amount).toBe(10000);
    });
  });

  // ==================== Enum Mapping Tests ====================

  describe('enum mapping', () => {
    it('should correctly map all TicketType values', async () => {
      for (const type of [TicketType.Physical, TicketType.DigitalTransferable, TicketType.DigitalNonTransferable]) {
        const listing = await repository.create(ctx, createValidListing({ type }));
        const found = await repository.findById(ctx, listing.id);
        expect(found?.type).toBe(type);
      }
    });

    it('should correctly map all ListingStatus values', async () => {
      for (const status of [ListingStatus.Pending, ListingStatus.Active, ListingStatus.Sold, ListingStatus.Cancelled, ListingStatus.Expired]) {
        const listing = await repository.create(ctx, createValidListing({ status }));
        const found = await repository.findById(ctx, listing.id);
        expect(found?.status).toBe(status);
      }
    });

    it('should correctly map all DeliveryMethod values', async () => {
      for (const deliveryMethod of [DeliveryMethod.Pickup, DeliveryMethod.ArrangeWithSeller]) {
        const listing = await repository.create(ctx, createValidListing({
          type: TicketType.Physical,
          deliveryMethod,
        }));
        const found = await repository.findById(ctx, listing.id);
        expect(found?.deliveryMethod).toBe(deliveryMethod);
      }
    });

    it('should handle undefined deliveryMethod', async () => {
      const listing = await repository.create(ctx, createValidListing({
        type: TicketType.DigitalTransferable,
        deliveryMethod: undefined,
      }));
      const found = await repository.findById(ctx, listing.id);
      expect(found?.deliveryMethod).toBeUndefined();
    });
  });
});
