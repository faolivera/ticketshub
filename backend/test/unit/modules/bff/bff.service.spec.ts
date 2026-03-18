import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BffService } from '../../../../src/modules/bff/bff.service';
import { EventsService } from '../../../../src/modules/events/events.service';
import { UsersService } from '../../../../src/modules/users/users.service';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { TicketsService } from '../../../../src/modules/tickets/tickets.service';
import { ReviewsService } from '../../../../src/modules/reviews/reviews.service';
import { PaymentConfirmationsService } from '../../../../src/modules/payment-confirmations/payment-confirmations.service';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import { PricingService } from '../../../../src/modules/payments/pricing/pricing.service';
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
import { PromotionsService } from '../../../../src/modules/promotions/promotions.service';
import { TransactionChatService } from '../../../../src/modules/transaction-chat/transaction-chat.service';
import { RiskEngineService } from '../../../../src/modules/risk-engine/risk-engine.service';
import { RiskLevel } from '../../../../src/modules/risk-engine/risk-engine.domain';
import {
  TransactionStatus,
  RequiredActor,
  type TransactionWithDetails,
} from '../../../../src/modules/transactions/transactions.domain';
import {
  TicketType,
  TicketUnitStatus,
  ListingStatus,
  SeatingType,
  type TicketListingWithEvent,
} from '../../../../src/modules/tickets/tickets.domain';
import {
  Language,
  Role,
  UserStatus,
  IdentityVerificationStatus,
} from '../../../../src/modules/users/users.domain';
import type { User } from '../../../../src/modules/users/users.domain';
import type { UserReviewMetrics } from '../../../../src/modules/reviews/reviews.domain';
import type { PublicPaymentMethodOption } from '../../../../src/modules/payments/payments.domain';
import type { PaymentConfirmation } from '../../../../src/modules/payment-confirmations/payment-confirmations.domain';
import { PaymentConfirmationStatus } from '../../../../src/modules/payment-confirmations/payment-confirmations.domain';
import type { Ctx } from '../../../../src/common/types/context';
import type { PricingSnapshot } from '../../../../src/modules/payments/pricing/pricing.domain';

describe('BffService', () => {
  let service: BffService;
  let eventsService: jest.Mocked<EventsService>;
  let usersService: jest.Mocked<UsersService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let ticketsService: jest.Mocked<TicketsService>;
  let paymentConfirmationsService: jest.Mocked<PaymentConfirmationsService>;
  let reviewsService: jest.Mocked<ReviewsService>;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;
  let pricingService: jest.Mocked<PricingService>;
  let riskEngine: jest.Mocked<RiskEngineService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockTransactionWithDetails: TransactionWithDetails = {
    id: 'txn_123',
    listingId: 'listing_123',
    buyerId: 'buyer_123',
    sellerId: 'seller_123',
    ticketType: TicketType.Digital,
    ticketUnitIds: ['unit_1'],
    quantity: 1,
    ticketPrice: { amount: 10000, currency: 'USD' },
    buyerPlatformFee: { amount: 1000, currency: 'USD' },
    sellerPlatformFee: { amount: 500, currency: 'USD' },
    paymentMethodCommission: { amount: 1200, currency: 'USD' },
    totalPaid: { amount: 12200, currency: 'USD' },
    sellerReceives: { amount: 9500, currency: 'USD' },
    pricingSnapshotId: 'ps_123',
    status: TransactionStatus.Completed,
    requiredActor: RequiredActor.None,
    createdAt: new Date(),
    updatedAt: new Date(),
    paymentExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    eventName: 'Test Event',
    eventDate: new Date(),
    venue: 'Test Venue',
    sectionName: 'GA',
    buyerName: 'John Buyer',
    sellerName: 'Jane Seller',
    version: 1,
  };

  const mockPaymentConfirmation: PaymentConfirmation = {
    id: 'pc_123',
    transactionId: 'txn_123',
    uploadedBy: 'buyer_123',
    storageKey: 'test_file.png',
    originalFilename: 'receipt.png',
    contentType: 'image/png',
    sizeBytes: 1024,
    status: PaymentConfirmationStatus.Pending,
    createdAt: new Date(),
  };

  const mockTransactionReviews = {
    buyerReview: null,
    sellerReview: null,
    canReview: true,
  };

  beforeEach(async () => {
    const mockEventsService = {
      getEventById: jest.fn(),
      getEventBySlug: jest.fn(),
    };

    const mockUsersService = {
      findById: jest.fn(),
      getPublicUserInfoByIds: jest.fn(),
    };

    const mockTransactionsService = {
      getTransactionById: jest.fn(),
      getSellerCompletedSalesTotal: jest.fn(),
      getCompletedSalesTotalBatch: jest.fn(),
      findById: jest.fn(),
      listTransactions: jest.fn(),
    };

    const mockTicketsService = {
      listListings: jest.fn(),
      getListingById: jest.fn(),
      getMyListings: jest.fn(),
    };

    const mockReviewsService = {
      getSellerProfileReviews: jest.fn(),
      getSellerMetrics: jest.fn(),
      getSellerMetricsBatch: jest.fn(),
      getTransactionReviews: jest.fn(),
    };

    const mockPaymentConfirmationsService = {
      getConfirmationByTransaction: jest.fn(),
    };

    const mockPaymentMethodsService = {
      getPublicPaymentMethods: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        publicName: 'Test Method',
        type: 'payment_gateway',
        bankTransferConfig: null,
      }),
    };

    const mockPricingService = {
      createSnapshot: jest.fn(),
    };

    const mockPlatformConfigService = {
      getPlatformConfig: jest.fn().mockResolvedValue({
        sellerPlatformFeePercentage: 5,
        buyerPlatformFeePercentage: 10,
        paymentTimeoutMinutes: 15,
        adminReviewTimeoutHours: 24,
        offerPendingExpirationMinutes: 1440,
        offerAcceptedExpirationMinutes: 1440,
      }),
    };

    const mockPromotionsService = {
      getActivePromotionSummary: jest.fn().mockResolvedValue(null),
    };

    const mockTransactionChatService = {
      hasUnreadMessages: jest.fn().mockResolvedValue(false),
      hasExchangedMessages: jest.fn().mockResolvedValue(false),
    };

    const mockRiskEngineService = {
      evaluateCheckoutRisk: jest.fn().mockResolvedValue({
        riskLevel: 'LOW',
        requireV1: true,
        requireV2: false,
        requireV3: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BffService,
        { provide: EventsService, useValue: mockEventsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: TransactionsService, useValue: mockTransactionsService },
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: ReviewsService, useValue: mockReviewsService },
        {
          provide: PaymentConfirmationsService,
          useValue: mockPaymentConfirmationsService,
        },
        { provide: PaymentMethodsService, useValue: mockPaymentMethodsService },
        { provide: PricingService, useValue: mockPricingService },
        { provide: PlatformConfigService, useValue: mockPlatformConfigService },
        { provide: PromotionsService, useValue: mockPromotionsService },
        {
          provide: TransactionChatService,
          useValue: mockTransactionChatService,
        },
        { provide: RiskEngineService, useValue: mockRiskEngineService },
      ],
    }).compile();

    service = module.get<BffService>(BffService);
    eventsService = module.get(EventsService);
    usersService = module.get(UsersService);
    transactionsService = module.get(TransactionsService);
    ticketsService = module.get(TicketsService);
    paymentConfirmationsService = module.get(PaymentConfirmationsService);
    reviewsService = module.get(ReviewsService);
    paymentMethodsService = module.get(PaymentMethodsService);
    pricingService = module.get(PricingService);
    riskEngine = module.get(RiskEngineService);
  });

  describe('getTransactionDetails', () => {
    it('should return transaction details for buyer', async () => {
      transactionsService.getTransactionById.mockResolvedValue(
        mockTransactionWithDetails,
      );
      reviewsService.getTransactionReviews.mockResolvedValue(
        mockTransactionReviews,
      );

      const result = await service.getTransactionDetails(
        mockCtx,
        'txn_123',
        'buyer_123',
        Role.User,
      );

      expect(result.transaction.servicePrice).toEqual({
        amount: 2200,
        currency: 'USD',
      });
      expect(result.transaction).not.toHaveProperty('buyerPlatformFee');
      expect(result.transaction).not.toHaveProperty('paymentMethodCommission');
      expect(result.paymentConfirmation).toBeNull();
      expect(result.reviews).toEqual(mockTransactionReviews);
      expect(transactionsService.getTransactionById).toHaveBeenCalledWith(
        mockCtx,
        'txn_123',
        'buyer_123',
      );
    });

    it('should return transaction details for seller', async () => {
      transactionsService.getTransactionById.mockResolvedValue(
        mockTransactionWithDetails,
      );
      reviewsService.getTransactionReviews.mockResolvedValue(
        mockTransactionReviews,
      );

      const result = await service.getTransactionDetails(
        mockCtx,
        'txn_123',
        'seller_123',
        Role.User,
      );

      expect(result.transaction.servicePrice).toEqual({
        amount: 2200,
        currency: 'USD',
      });
      expect(result.reviews).toEqual(mockTransactionReviews);
    });

    it('should return transaction details for admin', async () => {
      transactionsService.getTransactionById.mockResolvedValue(
        mockTransactionWithDetails,
      );
      reviewsService.getTransactionReviews.mockResolvedValue(
        mockTransactionReviews,
      );

      const result = await service.getTransactionDetails(
        mockCtx,
        'txn_123',
        'admin_123',
        Role.Admin,
      );

      expect(result.transaction.servicePrice).toEqual({
        amount: 2200,
        currency: 'USD',
      });
      expect(result.transaction).not.toHaveProperty('buyerPlatformFee');
      expect(result.transaction).not.toHaveProperty('paymentMethodCommission');
    });

    it('should throw NotFoundException when transaction not found', async () => {
      transactionsService.getTransactionById.mockResolvedValue(
        null as unknown as TransactionWithDetails,
      );

      await expect(
        service.getTransactionDetails(
          mockCtx,
          'nonexistent',
          'buyer_123',
          Role.User,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not participant or admin', async () => {
      transactionsService.getTransactionById.mockResolvedValue(
        mockTransactionWithDetails,
      );

      await expect(
        service.getTransactionDetails(
          mockCtx,
          'txn_123',
          'random_user',
          Role.User,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should include payment confirmation for bank transfer transactions', async () => {
      const bankTransferTransaction: TransactionWithDetails = {
        ...mockTransactionWithDetails,
        paymentMethodId: 'bank_transfer',
        status: TransactionStatus.PendingPayment,
      };

      transactionsService.getTransactionById.mockResolvedValue(
        bankTransferTransaction,
      );
      paymentConfirmationsService.getConfirmationByTransaction.mockResolvedValue(
        mockPaymentConfirmation,
      );

      const result = await service.getTransactionDetails(
        mockCtx,
        'txn_123',
        'buyer_123',
        Role.User,
      );

      expect(result.paymentConfirmation).toEqual(mockPaymentConfirmation);
      expect(
        paymentConfirmationsService.getConfirmationByTransaction,
      ).toHaveBeenCalledWith(mockCtx, 'txn_123', 'buyer_123', Role.User);
    });

    it('should return null paymentConfirmation when none exists', async () => {
      const bankTransferTransaction: TransactionWithDetails = {
        ...mockTransactionWithDetails,
        paymentMethodId: 'bank_transfer',
        status: TransactionStatus.PendingPayment,
      };

      transactionsService.getTransactionById.mockResolvedValue(
        bankTransferTransaction,
      );
      paymentConfirmationsService.getConfirmationByTransaction.mockRejectedValue(
        new NotFoundException('Not found'),
      );

      const result = await service.getTransactionDetails(
        mockCtx,
        'txn_123',
        'buyer_123',
        Role.User,
      );

      expect(result.paymentConfirmation).toBeNull();
    });

    it('should not fetch payment confirmation for non-bank-transfer transactions', async () => {
      const cardTransaction: TransactionWithDetails = {
        ...mockTransactionWithDetails,
        paymentMethodId: 'payway',
      };

      transactionsService.getTransactionById.mockResolvedValue(cardTransaction);
      reviewsService.getTransactionReviews.mockResolvedValue(
        mockTransactionReviews,
      );

      await service.getTransactionDetails(
        mockCtx,
        'txn_123',
        'buyer_123',
        Role.User,
      );

      expect(
        paymentConfirmationsService.getConfirmationByTransaction,
      ).not.toHaveBeenCalled();
    });

    it('should include reviews for completed transactions', async () => {
      transactionsService.getTransactionById.mockResolvedValue(
        mockTransactionWithDetails,
      );
      reviewsService.getTransactionReviews.mockResolvedValue(
        mockTransactionReviews,
      );

      const result = await service.getTransactionDetails(
        mockCtx,
        'txn_123',
        'buyer_123',
        Role.User,
      );

      expect(result.reviews).toEqual(mockTransactionReviews);
      expect(reviewsService.getTransactionReviews).toHaveBeenCalledWith(
        mockCtx,
        'txn_123',
        'buyer_123',
      );
    });

    it('should not fetch reviews for non-completed transactions', async () => {
      const pendingTransaction: TransactionWithDetails = {
        ...mockTransactionWithDetails,
        status: TransactionStatus.PendingPayment,
      };

      transactionsService.getTransactionById.mockResolvedValue(
        pendingTransaction,
      );

      const result = await service.getTransactionDetails(
        mockCtx,
        'txn_123',
        'buyer_123',
        Role.User,
      );

      expect(result.reviews).toBeNull();
      expect(reviewsService.getTransactionReviews).not.toHaveBeenCalled();
    });

    it('should return null reviews when reviews fetch fails', async () => {
      transactionsService.getTransactionById.mockResolvedValue(
        mockTransactionWithDetails,
      );
      reviewsService.getTransactionReviews.mockRejectedValue(
        new Error('Reviews service error'),
      );

      const result = await service.getTransactionDetails(
        mockCtx,
        'txn_123',
        'buyer_123',
        Role.User,
      );

      expect(result.reviews).toBeNull();
    });
  });

  describe('getBuyPageData', () => {
    const mockListing: TicketListingWithEvent = {
      id: 'listing_123',
      sellerId: 'seller_123',
      eventId: 'event_123',
      eventDateId: 'date_123',
      type: TicketType.Digital,
      seatingType: SeatingType.Unnumbered,
      ticketUnits: [
        {
          id: 'unit_1',
          listingId: 'listing_123',
          status: TicketUnitStatus.Available,
          version: 1,
        },
      ],
      sellTogether: false,
      pricePerTicket: { amount: 10000, currency: 'USD' },
      eventSectionId: 'section_123',
      status: ListingStatus.Active,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      eventName: 'Test Event',
      eventSlug: 'test-event-event_123',
      eventDate: new Date(),
      venue: 'Test Venue',
      sectionName: 'VIP Section',
    };

    const mockPublicUserInfo = {
      id: 'seller_123',
      publicName: 'Jane Seller',
      pic: { id: 'pic_123', src: '/images/seller.png' },
    };

    const mockUser: User = {
      id: 'seller_123',
      email: 'seller@example.com',
      firstName: 'Jane',
      lastName: 'Seller',
      role: Role.User,
      identityVerification: {
        status: IdentityVerificationStatus.Approved,
        legalFirstName: 'A',
        legalLastName: 'B',
        dateOfBirth: '1990-01-01',
        governmentIdNumber: '1',
        submittedAt: new Date(),
        reviewedAt: new Date(),
      },
      status: UserStatus.Enabled,
      publicName: 'Jane Seller',
      imageId: 'img_123',
      password: 'hashed',
      country: 'US',
      currency: 'USD',
      language: Language.ES,
      emailVerified: true,
      phoneVerified: false,
      tosAcceptedAt: new Date(),
      buyerDisputed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPricingSnapshot: PricingSnapshot = {
      id: 'ps_123',
      listingId: 'listing_123',
      pricePerTicket: { amount: 10000, currency: 'USD' },
      buyerPlatformFeePercentage: 10,
      sellerPlatformFeePercentage: 5,
      paymentMethodCommissions: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };

    const mockPaymentMethods: PublicPaymentMethodOption[] = [
      {
        id: 'pm_1',
        name: 'Credit Card',
        type: 'payment_gateway',
        buyerCommissionPercent: 3,
      },
      {
        id: 'pm_2',
        name: 'Bank Transfer',
        type: 'manual_approval',
        buyerCommissionPercent: null,
      },
    ];

    const mockSellerMetrics: UserReviewMetrics = {
      userId: 'seller_123',
      role: 'seller',
      totalTransactions: 50,
      totalReviews: 20,
      positiveReviews: 19,
      negativeReviews: 0,
      neutralReviews: 1,
      positivePercent: 95,
      badges: ['verified'],
    };

    it('should return buy page data with serviceFeePercent per payment method', async () => {
      ticketsService.getListingById.mockResolvedValue(mockListing);
      usersService.getPublicUserInfoByIds.mockResolvedValue([
        mockPublicUserInfo,
      ]);
      usersService.findById.mockResolvedValue(mockUser);
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(50);
      reviewsService.getSellerMetrics.mockResolvedValue(mockSellerMetrics);
      paymentMethodsService.getPublicPaymentMethods.mockResolvedValue(
        mockPaymentMethods,
      );
      pricingService.createSnapshot.mockResolvedValue(mockPricingSnapshot);

      const result = await service.getBuyPageData(mockCtx, 'listing_123');

      expect(result.listing).toEqual(mockListing);
      expect(result.seller.id).toBe('seller_123');
      expect(result.seller.publicName).toBe('Jane Seller');
      expect(result.seller.badges).toContain('verified');
      expect(result.pricingSnapshot.id).toBe('ps_123');
      expect(result.pricingSnapshot.expiresAt).toEqual(
        mockPricingSnapshot.expiresAt,
      );
      expect(result.pricingSnapshot).not.toHaveProperty(
        'buyerPlatformFeePercentage',
      );
      expect(result.paymentMethods).toHaveLength(2);
      expect(result.paymentMethods[0].serviceFeePercent).toBe(13); // 10 + 3
      expect(result.paymentMethods[1].serviceFeePercent).toBe(10); // 10 + 0
      expect(pricingService.createSnapshot).toHaveBeenCalledWith(mockCtx, {
        id: mockListing.id,
        pricePerTicket: mockListing.pricePerTicket,
        promotionSnapshot: mockListing.promotionSnapshot,
      });
    });

    it('should include checkoutRisk with missingV1/missingV2/missingV3 when buyerId is provided', async () => {
      const mockBuyer: User = {
        ...mockUser,
        id: 'buyer_123',
        email: 'buyer@example.com',
        emailVerified: false,
        phoneVerified: false,
        identityVerification: undefined,
      };
      ticketsService.getListingById.mockResolvedValue(mockListing);
      usersService.getPublicUserInfoByIds.mockResolvedValue([
        mockPublicUserInfo,
      ]);
      usersService.findById
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockBuyer);
      transactionsService.getSellerCompletedSalesTotal.mockResolvedValue(50);
      reviewsService.getSellerMetrics.mockResolvedValue(mockSellerMetrics);
      paymentMethodsService.getPublicPaymentMethods.mockResolvedValue(
        mockPaymentMethods,
      );
      pricingService.createSnapshot.mockResolvedValue(mockPricingSnapshot);
      riskEngine.evaluateCheckoutRisk.mockResolvedValue({
        riskLevel: RiskLevel.MED,
        requireV1: true,
        requireV2: true,
        requireV3: true,
      });

      const result = await service.getBuyPageData(
        mockCtx,
        'listing_123',
        'buyer_123',
      );

      expect(result.checkoutRisk).toBeDefined();
      expect(result.checkoutRisk?.requireV1).toBe(true);
      expect(result.checkoutRisk?.requireV2).toBe(true);
      expect(result.checkoutRisk?.requireV3).toBe(true);
      expect(result.checkoutRisk?.missingV1).toBe(true);
      expect(result.checkoutRisk?.missingV2).toBe(true);
      expect(result.checkoutRisk?.missingV3).toBe(true);
    });
  });

  describe('getEventListings', () => {
    const mockListing: TicketListingWithEvent = {
      id: 'listing_1',
      sellerId: 'seller_123',
      eventId: 'event_123',
      eventDateId: 'date_123',
      type: TicketType.Digital,
      seatingType: SeatingType.Unnumbered,
      ticketUnits: [
        {
          id: 'unit_1',
          listingId: 'listing_1',
          status: TicketUnitStatus.Available,
          version: 1,
        },
      ],
      sellTogether: false,
      pricePerTicket: { amount: 5000, currency: 'EUR' },
      eventSectionId: 'section_1',
      status: ListingStatus.Active,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      eventName: 'Test Event',
      eventSlug: 'test-event-event_123',
      eventDate: new Date(),
      venue: 'Test Venue',
      sectionName: 'General',
    };

    const mockPublicUserInfo = {
      id: 'seller_123',
      publicName: 'Jane Seller',
      pic: { id: 'pic_1', src: '/img.png' },
    };

    const mockPaymentMethods: PublicPaymentMethodOption[] = [
      {
        id: 'pm_1',
        name: 'Card',
        type: 'payment_gateway',
        buyerCommissionPercent: 3,
      },
      {
        id: 'pm_2',
        name: 'Transfer',
        type: 'manual_approval',
        buyerCommissionPercent: 0,
      },
    ];

    it('should return listings with commissionPercentRange = platform + payment method (min/max)', async () => {
      const mockSellerMetricsMap = new Map<string, UserReviewMetrics>([
        [
          'seller_123',
          {
            userId: 'seller_123',
            role: 'seller' as const,
            totalTransactions: 5,
            totalReviews: 3,
            positiveReviews: 2,
            negativeReviews: 0,
            neutralReviews: 1,
            positivePercent: 100,
            badges: ['verified'],
          },
        ],
      ]);
      ticketsService.listListings.mockResolvedValue([mockListing]);
      usersService.getPublicUserInfoByIds.mockResolvedValue([
        mockPublicUserInfo,
      ]);
      paymentMethodsService.getPublicPaymentMethods.mockResolvedValue(
        mockPaymentMethods,
      );
      reviewsService.getSellerMetricsBatch.mockResolvedValue(
        mockSellerMetricsMap,
      );

      const result = await service.getEventListings(mockCtx, 'event_123');

      expect(result).toHaveLength(1);
      expect(result[0].commissionPercentRange).toEqual({ min: 10, max: 13 }); // platform 10% + 0% and 10% + 3%
      expect(result[0].sellerReputation).toEqual({
        totalSales: 5,
        totalReviews: 3,
        positivePercent: 100,
        badges: ['verified'],
      });
      expect(reviewsService.getSellerMetricsBatch).toHaveBeenCalledWith(
        mockCtx,
        ['seller_123'],
      );
    });

    it('should return single commission value when only platform (no payment methods with numeric commission)', async () => {
      const mockSellerMetricsMap = new Map<string, UserReviewMetrics>([
        [
          'seller_123',
          {
            userId: 'seller_123',
            role: 'seller' as const,
            totalTransactions: 5,
            totalReviews: 3,
            positiveReviews: 2,
            negativeReviews: 0,
            neutralReviews: 1,
            positivePercent: 100,
            badges: ['verified'],
          },
        ],
      ]);
      ticketsService.listListings.mockResolvedValue([mockListing]);
      usersService.getPublicUserInfoByIds.mockResolvedValue([
        mockPublicUserInfo,
      ]);
      paymentMethodsService.getPublicPaymentMethods.mockResolvedValue([
        {
          id: 'pm_1',
          name: 'Manual',
          type: 'manual_approval',
          buyerCommissionPercent: null,
        },
      ]);
      reviewsService.getSellerMetricsBatch.mockResolvedValue(
        mockSellerMetricsMap,
      );

      const result = await service.getEventListings(mockCtx, 'event_123');

      expect(result[0].commissionPercentRange).toEqual({ min: 10, max: 10 });
    });

    it('should return empty array when no active listings', async () => {
      ticketsService.listListings.mockResolvedValue([]);

      const result = await service.getEventListings(mockCtx, 'event_123');

      expect(result).toEqual([]);
      expect(reviewsService.getSellerMetricsBatch).not.toHaveBeenCalled();
    });

    it('should use default reputation when seller has no metrics', async () => {
      ticketsService.listListings.mockResolvedValue([mockListing]);
      usersService.getPublicUserInfoByIds.mockResolvedValue([
        mockPublicUserInfo,
      ]);
      paymentMethodsService.getPublicPaymentMethods.mockResolvedValue(
        mockPaymentMethods,
      );
      reviewsService.getSellerMetricsBatch.mockResolvedValue(new Map());

      const result = await service.getEventListings(mockCtx, 'event_123');

      expect(result[0].sellerReputation).toEqual({
        totalSales: 0,
        totalReviews: 0,
        positivePercent: null,
        badges: [],
      });
    });
  });

  describe('getEventPageData', () => {
    const mockEvent = {
      id: 'event_123',
      name: 'Test Event',
      dates: [],
      sections: [],
      images: [],
    };

    const mockListing: TicketListingWithEvent = {
      id: 'listing_1',
      sellerId: 'seller_123',
      eventId: 'event_123',
      eventDateId: 'date_123',
      type: TicketType.Digital,
      seatingType: SeatingType.Unnumbered,
      ticketUnits: [
        {
          id: 'unit_1',
          listingId: 'listing_1',
          status: TicketUnitStatus.Available,
          version: 1,
        },
      ],
      sellTogether: false,
      pricePerTicket: { amount: 5000, currency: 'EUR' },
      eventSectionId: 'section_1',
      status: ListingStatus.Active,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      eventName: 'Test Event',
      eventSlug: 'test-event-event_123',
      eventDate: new Date(),
      venue: 'Test Venue',
      sectionName: 'General',
    };

    const mockPublicUserInfo = {
      id: 'seller_123',
      publicName: 'Jane Seller',
      pic: { id: 'pic_1', src: '/img.png' },
    };

    const mockPaymentMethods: PublicPaymentMethodOption[] = [
      {
        id: 'pm_1',
        name: 'Card',
        type: 'payment_gateway',
        buyerCommissionPercent: 3,
      },
      {
        id: 'pm_2',
        name: 'Transfer',
        type: 'manual_approval',
        buyerCommissionPercent: 0,
      },
    ];

    const mockSellerMetricsMap = new Map<string, UserReviewMetrics>([
      [
        'seller_123',
        {
          userId: 'seller_123',
          role: 'seller' as const,
          totalTransactions: 5,
          totalReviews: 3,
          positiveReviews: 2,
          negativeReviews: 0,
          neutralReviews: 1,
          positivePercent: 100,
          badges: ['verified'],
        },
      ],
    ]);

    it('should return event and listings combined', async () => {
      eventsService.getEventBySlug.mockResolvedValue(mockEvent as any);
      ticketsService.listListings.mockResolvedValue([mockListing]);
      usersService.getPublicUserInfoByIds.mockResolvedValue([
        mockPublicUserInfo,
      ]);
      paymentMethodsService.getPublicPaymentMethods.mockResolvedValue(
        mockPaymentMethods,
      );
      reviewsService.getSellerMetricsBatch.mockResolvedValue(
        mockSellerMetricsMap,
      );

      const result = await service.getEventPageData(mockCtx, 'event_123');

      expect(result.event).toEqual(mockEvent);
      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].sellerPublicName).toBe('Jane Seller');
      expect(eventsService.getEventBySlug).toHaveBeenCalledWith(
        mockCtx,
        'event_123',
      );
    });

    it('should propagate NotFoundException when event not found', async () => {
      eventsService.getEventBySlug.mockRejectedValue(
        new NotFoundException('Event not found'),
      );

      await expect(
        service.getEventPageData(mockCtx, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
