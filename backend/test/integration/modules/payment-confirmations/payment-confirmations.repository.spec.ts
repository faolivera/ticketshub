import { PrismaClient, Role, SeatingType as PrismaSeatingType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PaymentConfirmationsRepository } from '@/modules/payment-confirmations/payment-confirmations.repository';
import {
  PaymentConfirmationStatus,
  type PaymentConfirmation,
  type PaymentConfirmationMimeType,
} from '@/modules/payment-confirmations/payment-confirmations.domain';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('PaymentConfirmationsRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: PaymentConfirmationsRepository;
  let ctx: Ctx;

  let testBuyerId: string;
  let testSellerId: string;
  let testListingId: string;
  let testEventId: string;
  let testEventDateId: string;
  let testEventSectionId: string;
  let testPricingSnapshotId: string;
  let testTransactionId: string;

  const createTestUser = async (overrides?: Partial<{
    email: string;
    role: Role;
    acceptedSellerTermsAt: Date | null;
  }>): Promise<string> => {
    const user = await prisma.user.create({
      data: {
        email: overrides?.email ?? `user-${Date.now()}-${randomUUID()}@test.com`,
        firstName: 'Test',
        lastName: 'User',
        publicName: `testuser-${randomUUID().slice(0, 8)}`,
        password: 'hashedpassword',
        role: overrides?.role ?? Role.User,
        acceptedSellerTermsAt: overrides?.acceptedSellerTermsAt ?? new Date(),
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

  const createTestEvent = async (createdBy: string): Promise<string> => {
    const slug = `test-event-${randomUUID().slice(0, 8)}`;
    const event = await prisma.event.create({
      data: {
        slug,
        name: `Test Event ${slug}`,
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
        createdBy: { connect: { id: createdBy } },
      },
    });
    return event.id;
  };

  const createTestEventDate = async (eventId: string, createdBy: string): Promise<string> => {
    const eventDate = await prisma.eventDate.create({
      data: {
        event: { connect: { id: eventId } },
        date: new Date('2026-06-15T20:00:00Z'),
        status: 'approved',
        createdBy: { connect: { id: createdBy } },
      },
    });
    return eventDate.id;
  };

  const createTestEventSection = async (eventId: string, createdBy: string): Promise<string> => {
    const section = await prisma.eventSection.create({
      data: {
        event: { connect: { id: eventId } },
        name: `Section ${randomUUID().slice(0, 8)}`,
        seatingType: PrismaSeatingType.unnumbered,
        status: 'approved',
        createdBy: { connect: { id: createdBy } },
      },
    });
    return section.id;
  };

  const createTestListing = async (sellerId: string): Promise<string> => {
    const listing = await prisma.ticketListing.create({
      data: {
        seller: { connect: { id: sellerId } },
        event: { connect: { id: testEventId } },
        eventDate: { connect: { id: testEventDateId } },
        eventSection: { connect: { id: testEventSectionId } },
        type: 'Physical',
        sellTogether: false,
        pricePerTicket: { amount: 5000, currency: 'EUR' },
        status: 'Active',
      },
    });
    return listing.id;
  };

  const createTestPricingSnapshot = async (listingId: string): Promise<string> => {
    const id = randomUUID();
    await prisma.pricingSnapshot.create({
      data: {
        id,
        listingId,
        pricePerTicket: { amount: 5000, currency: 'EUR' },
        buyerPlatformFeePercentage: 5,
        sellerPlatformFeePercentage: 10,
        paymentMethodCommissions: { card: 2.5, transfer: 0 },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    return id;
  };

  const createTestTransaction = async (buyerId: string, sellerId: string, listingId: string, pricingSnapshotId: string): Promise<string> => {
    const transaction = await prisma.transaction.create({
      data: {
        id: randomUUID(),
        listing: { connect: { id: listingId } },
        buyer: { connect: { id: buyerId } },
        seller: { connect: { id: sellerId } },
        ticketType: 'Physical',
        quantity: 2,
        ticketPrice: { amount: 10000, currency: 'EUR' },
        buyerPlatformFee: { amount: 500, currency: 'EUR' },
        sellerPlatformFee: { amount: 1000, currency: 'EUR' },
        paymentMethodCommission: { amount: 250, currency: 'EUR' },
        totalPaid: { amount: 10750, currency: 'EUR' },
        sellerReceives: { amount: 9000, currency: 'EUR' },
        pricingSnapshotId,
        status: 'PendingPayment',
        requiredActor: 'Buyer',
        ticketUnitIds: [],
        paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
        version: 1,
      },
    });
    return transaction.id;
  };

  const createValidPaymentConfirmation = (overrides?: Partial<PaymentConfirmation>): PaymentConfirmation => {
    const now = new Date();
    return {
      id: randomUUID(),
      transactionId: testTransactionId,
      uploadedBy: testBuyerId,
      storageKey: `confirmations/${randomUUID()}.png`,
      originalFilename: 'payment-receipt.png',
      contentType: 'image/png' as PaymentConfirmationMimeType,
      sizeBytes: 1024 * 100,
      status: PaymentConfirmationStatus.Pending,
      createdAt: now,
      ...overrides,
    };
  };

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new PaymentConfirmationsRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();

    testBuyerId = await createTestUser({ email: `buyer-${Date.now()}@test.com` });
    testSellerId = await createTestUser({ email: `seller-${Date.now()}@test.com` });
    testEventId = await createTestEvent(testSellerId);
    testEventDateId = await createTestEventDate(testEventId, testSellerId);
    testEventSectionId = await createTestEventSection(testEventId, testSellerId);
    testListingId = await createTestListing(testSellerId);
    testPricingSnapshotId = await createTestPricingSnapshot(testListingId);
    testTransactionId = await createTestTransaction(testBuyerId, testSellerId, testListingId, testPricingSnapshotId);
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  // ==================== save ====================

  describe('save', () => {
    it('should create a new payment confirmation', async () => {
      const confirmationData = createValidPaymentConfirmation();

      const confirmation = await repository.save(ctx, confirmationData);

      expect(confirmation).toBeDefined();
      expect(confirmation.id).toBe(confirmationData.id);
      expect(confirmation.transactionId).toBe(testTransactionId);
      expect(confirmation.uploadedBy).toBe(testBuyerId);
      expect(confirmation.status).toBe(PaymentConfirmationStatus.Pending);
    });

    it('should create a payment confirmation with all fields', async () => {
      const confirmationData = createValidPaymentConfirmation({
        storageKey: 'confirmations/custom-key.png',
        originalFilename: 'my-receipt.png',
        contentType: 'image/jpeg',
        sizeBytes: 2048 * 100,
      });

      const confirmation = await repository.save(ctx, confirmationData);

      expect(confirmation.storageKey).toBe('confirmations/custom-key.png');
      expect(confirmation.originalFilename).toBe('my-receipt.png');
      expect(confirmation.contentType).toBe('image/jpeg');
      expect(confirmation.sizeBytes).toBe(2048 * 100);
    });

    it('should update an existing payment confirmation', async () => {
      const confirmationData = createValidPaymentConfirmation();
      const created = await repository.save(ctx, confirmationData);

      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });
      const reviewedAt = new Date();

      const updated = await repository.save(ctx, {
        ...created,
        status: PaymentConfirmationStatus.Accepted,
        reviewedBy: adminId,
        reviewedAt,
        adminNotes: 'Payment verified successfully',
      });

      expect(updated.id).toBe(created.id);
      expect(updated.status).toBe(PaymentConfirmationStatus.Accepted);
      expect(updated.reviewedBy).toBe(adminId);
      expect(updated.reviewedAt).toEqual(reviewedAt);
      expect(updated.adminNotes).toBe('Payment verified successfully');
    });

    it('should update payment confirmation to rejected status with admin notes', async () => {
      const confirmationData = createValidPaymentConfirmation();
      const created = await repository.save(ctx, confirmationData);

      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });
      const reviewedAt = new Date();

      const updated = await repository.save(ctx, {
        ...created,
        status: PaymentConfirmationStatus.Rejected,
        reviewedBy: adminId,
        reviewedAt,
        adminNotes: 'Image is not legible',
      });

      expect(updated.status).toBe(PaymentConfirmationStatus.Rejected);
      expect(updated.adminNotes).toBe('Image is not legible');
    });

    it('should handle PDF content type', async () => {
      const confirmationData = createValidPaymentConfirmation({
        contentType: 'application/pdf',
        originalFilename: 'receipt.pdf',
        storageKey: 'confirmations/receipt.pdf',
      });

      const confirmation = await repository.save(ctx, confirmationData);

      expect(confirmation.contentType).toBe('application/pdf');
    });
  });

  // ==================== findById ====================

  describe('findById', () => {
    it('should return null when payment confirmation does not exist', async () => {
      const confirmation = await repository.findById(ctx, 'non-existent-id');
      expect(confirmation).toBeNull();
    });

    it('should find payment confirmation by id', async () => {
      const created = await repository.save(ctx, createValidPaymentConfirmation());

      const found = await repository.findById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.transactionId).toBe(testTransactionId);
      expect(found?.uploadedBy).toBe(testBuyerId);
    });

    it('should return all fields correctly', async () => {
      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });
      const reviewedAt = new Date();
      const confirmationData = createValidPaymentConfirmation({
        status: PaymentConfirmationStatus.Accepted,
        reviewedBy: adminId,
        reviewedAt,
        adminNotes: 'Verified',
      });
      const created = await repository.save(ctx, confirmationData);

      const found = await repository.findById(ctx, created.id);

      expect(found?.status).toBe(PaymentConfirmationStatus.Accepted);
      expect(found?.reviewedBy).toBe(adminId);
      expect(found?.reviewedAt).toEqual(reviewedAt);
      expect(found?.adminNotes).toBe('Verified');
    });
  });

  // ==================== findByTransactionId ====================

  describe('findByTransactionId', () => {
    it('should return null when no confirmation exists for transaction', async () => {
      const confirmation = await repository.findByTransactionId(ctx, 'non-existent-transaction');
      expect(confirmation).toBeNull();
    });

    it('should find payment confirmation by transaction id', async () => {
      const created = await repository.save(ctx, createValidPaymentConfirmation());

      const found = await repository.findByTransactionId(ctx, testTransactionId);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.transactionId).toBe(testTransactionId);
    });

    it('should return the correct confirmation when multiple exist', async () => {
      const transaction2Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );

      await repository.save(ctx, createValidPaymentConfirmation({ transactionId: testTransactionId }));
      await repository.save(ctx, createValidPaymentConfirmation({ transactionId: transaction2Id }));

      const found1 = await repository.findByTransactionId(ctx, testTransactionId);
      const found2 = await repository.findByTransactionId(ctx, transaction2Id);

      expect(found1?.transactionId).toBe(testTransactionId);
      expect(found2?.transactionId).toBe(transaction2Id);
      expect(found1?.id).not.toBe(found2?.id);
    });
  });

  // ==================== findAllPending ====================

  describe('findAllPending', () => {
    it('should return empty array when no pending confirmations exist', async () => {
      const confirmations = await repository.findAllPending(ctx);
      expect(confirmations).toEqual([]);
    });

    it('should return only pending confirmations', async () => {
      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });

      const transaction2Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );
      const transaction3Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );

      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: testTransactionId,
        status: PaymentConfirmationStatus.Pending,
      }));
      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: transaction2Id,
        status: PaymentConfirmationStatus.Accepted,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      }));
      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: transaction3Id,
        status: PaymentConfirmationStatus.Pending,
      }));

      const pending = await repository.findAllPending(ctx);

      expect(pending).toHaveLength(2);
      expect(pending.every(c => c.status === PaymentConfirmationStatus.Pending)).toBe(true);
    });

    it('should not return rejected confirmations', async () => {
      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });

      await repository.save(ctx, createValidPaymentConfirmation({
        status: PaymentConfirmationStatus.Rejected,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNotes: 'Invalid image',
      }));

      const pending = await repository.findAllPending(ctx);

      expect(pending).toHaveLength(0);
    });
  });

  // ==================== countPending ====================

  describe('countPending', () => {
    it('should return 0 when no pending confirmations exist', async () => {
      const count = await repository.countPending(ctx);
      expect(count).toBe(0);
    });

    it('should count only pending confirmations', async () => {
      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });

      const transaction2Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );
      const transaction3Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );

      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: testTransactionId,
        status: PaymentConfirmationStatus.Pending,
      }));
      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: transaction2Id,
        status: PaymentConfirmationStatus.Accepted,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      }));
      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: transaction3Id,
        status: PaymentConfirmationStatus.Pending,
      }));

      const count = await repository.countPending(ctx);

      expect(count).toBe(2);
    });

    it('should return correct count after status changes', async () => {
      const confirmation = await repository.save(ctx, createValidPaymentConfirmation({
        status: PaymentConfirmationStatus.Pending,
      }));

      let count = await repository.countPending(ctx);
      expect(count).toBe(1);

      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });
      await repository.save(ctx, {
        ...confirmation,
        status: PaymentConfirmationStatus.Accepted,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      });

      count = await repository.countPending(ctx);
      expect(count).toBe(0);
    });
  });

  // ==================== getPendingTransactionIds ====================

  describe('getPendingTransactionIds', () => {
    it('should return empty array when no pending confirmations exist', async () => {
      const ids = await repository.getPendingTransactionIds(ctx);
      expect(ids).toEqual([]);
    });

    it('should return transaction ids of pending confirmations', async () => {
      const transaction2Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );

      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: testTransactionId,
        status: PaymentConfirmationStatus.Pending,
      }));
      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: transaction2Id,
        status: PaymentConfirmationStatus.Pending,
      }));

      const ids = await repository.getPendingTransactionIds(ctx);

      expect(ids).toHaveLength(2);
      expect(ids).toContain(testTransactionId);
      expect(ids).toContain(transaction2Id);
    });

    it('should not include transaction ids of non-pending confirmations', async () => {
      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });

      const transaction2Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );

      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: testTransactionId,
        status: PaymentConfirmationStatus.Pending,
      }));
      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: transaction2Id,
        status: PaymentConfirmationStatus.Accepted,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      }));

      const ids = await repository.getPendingTransactionIds(ctx);

      expect(ids).toHaveLength(1);
      expect(ids).toContain(testTransactionId);
      expect(ids).not.toContain(transaction2Id);
    });
  });

  // ==================== findByTransactionIds ====================

  describe('findByTransactionIds', () => {
    it('should return empty array when no transaction ids provided', async () => {
      const confirmations = await repository.findByTransactionIds(ctx, []);
      expect(confirmations).toEqual([]);
    });

    it('should return empty array when no confirmations match', async () => {
      const confirmations = await repository.findByTransactionIds(ctx, ['non-existent-1', 'non-existent-2']);
      expect(confirmations).toEqual([]);
    });

    it('should find confirmations by multiple transaction ids', async () => {
      const transaction2Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );
      const transaction3Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );

      await repository.save(ctx, createValidPaymentConfirmation({ transactionId: testTransactionId }));
      await repository.save(ctx, createValidPaymentConfirmation({ transactionId: transaction2Id }));
      await repository.save(ctx, createValidPaymentConfirmation({ transactionId: transaction3Id }));

      const confirmations = await repository.findByTransactionIds(ctx, [testTransactionId, transaction2Id]);

      expect(confirmations).toHaveLength(2);
      expect(confirmations.map(c => c.transactionId)).toContain(testTransactionId);
      expect(confirmations.map(c => c.transactionId)).toContain(transaction2Id);
      expect(confirmations.map(c => c.transactionId)).not.toContain(transaction3Id);
    });

    it('should return confirmations regardless of status', async () => {
      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });

      const transaction2Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );

      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: testTransactionId,
        status: PaymentConfirmationStatus.Pending,
      }));
      await repository.save(ctx, createValidPaymentConfirmation({
        transactionId: transaction2Id,
        status: PaymentConfirmationStatus.Accepted,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      }));

      const confirmations = await repository.findByTransactionIds(ctx, [testTransactionId, transaction2Id]);

      expect(confirmations).toHaveLength(2);
    });
  });

  // ==================== delete ====================

  describe('delete', () => {
    it('should delete an existing payment confirmation', async () => {
      const created = await repository.save(ctx, createValidPaymentConfirmation());

      await repository.delete(ctx, created.id);

      const found = await repository.findById(ctx, created.id);
      expect(found).toBeNull();
    });

    it('should throw when trying to delete non-existent confirmation', async () => {
      await expect(
        repository.delete(ctx, 'non-existent-id'),
      ).rejects.toThrow();
    });

    it('should only delete the specified confirmation', async () => {
      const transaction2Id = await createTestTransaction(
        testBuyerId,
        testSellerId,
        testListingId,
        testPricingSnapshotId,
      );

      const confirmation1 = await repository.save(ctx, createValidPaymentConfirmation({ transactionId: testTransactionId }));
      const confirmation2 = await repository.save(ctx, createValidPaymentConfirmation({ transactionId: transaction2Id }));

      await repository.delete(ctx, confirmation1.id);

      const found1 = await repository.findById(ctx, confirmation1.id);
      const found2 = await repository.findById(ctx, confirmation2.id);

      expect(found1).toBeNull();
      expect(found2).toBeDefined();
      expect(found2?.id).toBe(confirmation2.id);
    });
  });

  // ==================== Edge Cases ====================

  describe('Edge Cases', () => {
    it('should handle all content types', async () => {
      const contentTypes: PaymentConfirmationMimeType[] = [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/pdf',
      ];

      for (let i = 0; i < contentTypes.length; i++) {
        const transactionId = await createTestTransaction(
          testBuyerId,
          testSellerId,
          testListingId,
          testPricingSnapshotId,
        );

        const confirmation = await repository.save(ctx, createValidPaymentConfirmation({
          transactionId,
          contentType: contentTypes[i],
        }));

        expect(confirmation.contentType).toBe(contentTypes[i]);
      }
    });

    it('should handle all payment confirmation statuses', async () => {
      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });
      const statuses = [
        PaymentConfirmationStatus.Pending,
        PaymentConfirmationStatus.Accepted,
        PaymentConfirmationStatus.Rejected,
      ];

      for (let i = 0; i < statuses.length; i++) {
        const transactionId = await createTestTransaction(
          testBuyerId,
          testSellerId,
          testListingId,
          testPricingSnapshotId,
        );

        const confirmationData: PaymentConfirmation = {
          ...createValidPaymentConfirmation({ transactionId, status: statuses[i] }),
        };

        if (statuses[i] !== PaymentConfirmationStatus.Pending) {
          confirmationData.reviewedBy = adminId;
          confirmationData.reviewedAt = new Date();
        }

        const confirmation = await repository.save(ctx, confirmationData);

        expect(confirmation.status).toBe(statuses[i]);
      }
    });

    it('should handle large file sizes', async () => {
      const largeFileSize = 10 * 1024 * 1024;
      const confirmation = await repository.save(ctx, createValidPaymentConfirmation({
        sizeBytes: largeFileSize,
      }));

      expect(confirmation.sizeBytes).toBe(largeFileSize);
    });

    it('should handle special characters in original filename', async () => {
      const specialFilename = 'receipt (copy) - 2026_März.png';
      const confirmation = await repository.save(ctx, createValidPaymentConfirmation({
        originalFilename: specialFilename,
      }));

      expect(confirmation.originalFilename).toBe(specialFilename);
    });

    it('should handle long storage keys', async () => {
      const longStorageKey = `confirmations/${randomUUID()}/${randomUUID()}/${randomUUID()}/very-long-filename-with-uuid-${randomUUID()}.png`;
      const confirmation = await repository.save(ctx, createValidPaymentConfirmation({
        storageKey: longStorageKey,
      }));

      expect(confirmation.storageKey).toBe(longStorageKey);
    });

    it('should handle admin notes with special characters', async () => {
      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });
      const adminNotes = 'Rejected: Image quality poor. Contains special chars: "quotes", <tags>, & ampersands, émojis: 📧';

      const confirmation = await repository.save(ctx, createValidPaymentConfirmation({
        status: PaymentConfirmationStatus.Rejected,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNotes,
      }));

      expect(confirmation.adminNotes).toBe(adminNotes);
    });

    it('should preserve createdAt timestamp on update', async () => {
      const originalCreatedAt = new Date('2026-01-15T10:00:00Z');
      const created = await repository.save(ctx, createValidPaymentConfirmation({
        createdAt: originalCreatedAt,
      }));

      const adminId = await createTestUser({ role: Role.Admin, email: `admin-${Date.now()}@test.com` });
      const updated = await repository.save(ctx, {
        ...created,
        status: PaymentConfirmationStatus.Accepted,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      });

      expect(updated.createdAt).toEqual(originalCreatedAt);
    });

    it('should handle confirmation without optional fields', async () => {
      const minimalConfirmation: PaymentConfirmation = {
        id: randomUUID(),
        transactionId: testTransactionId,
        uploadedBy: testBuyerId,
        storageKey: 'key.png',
        originalFilename: 'file.png',
        contentType: 'image/png',
        sizeBytes: 1000,
        status: PaymentConfirmationStatus.Pending,
        createdAt: new Date(),
      };

      const saved = await repository.save(ctx, minimalConfirmation);

      expect(saved.adminNotes).toBeUndefined();
      expect(saved.reviewedBy).toBeUndefined();
      expect(saved.reviewedAt).toBeUndefined();
    });
  });
});
