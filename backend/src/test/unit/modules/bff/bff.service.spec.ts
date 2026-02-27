import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BffService } from '../../../../modules/bff/bff.service';
import { UsersService } from '../../../../modules/users/users.service';
import { TransactionsService } from '../../../../modules/transactions/transactions.service';
import { TicketsService } from '../../../../modules/tickets/tickets.service';
import { ReviewsService } from '../../../../modules/reviews/reviews.service';
import { PaymentConfirmationsService } from '../../../../modules/payment-confirmations/payment-confirmations.service';
import { PaymentMethodsService } from '../../../../modules/payments/payment-methods.service';
import { PricingService } from '../../../../modules/payments/pricing/pricing.service';
import {
  TransactionStatus,
  type TransactionWithDetails,
} from '../../../../modules/transactions/transactions.domain';
import {
  TicketType,
  TicketUnitStatus,
  ListingStatus,
  SeatingType,
  type TicketListingWithEvent,
} from '../../../../modules/tickets/tickets.domain';
import { Role, UserLevel, UserStatus } from '../../../../modules/users/users.domain';
import type { User } from '../../../../modules/users/users.domain';
import type { UserReviewMetrics } from '../../../../modules/reviews/reviews.domain';
import type { PublicPaymentMethodOption } from '../../../../modules/payments/payments.domain';
import type { PaymentConfirmation } from '../../../../modules/payment-confirmations/payment-confirmations.domain';
import { PaymentConfirmationStatus } from '../../../../modules/payment-confirmations/payment-confirmations.domain';
import type { Ctx } from '../../../../common/types/context';
import type { PricingSnapshot } from '../../../../modules/payments/pricing/pricing.domain';

describe('BffService', () => {
  let service: BffService;
  let usersService: jest.Mocked<UsersService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let ticketsService: jest.Mocked<TicketsService>;
  let paymentConfirmationsService: jest.Mocked<PaymentConfirmationsService>;
  let reviewsService: jest.Mocked<ReviewsService>;
  let paymentMethodsService: jest.Mocked<PaymentMethodsService>;
  let pricingService: jest.Mocked<PricingService>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockTransactionWithDetails: TransactionWithDetails = {
    id: 'txn_123',
    listingId: 'listing_123',
    buyerId: 'buyer_123',
    sellerId: 'seller_123',
    ticketType: TicketType.DigitalTransferable,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    eventName: 'Test Event',
    eventDate: new Date(),
    venue: 'Test Venue',
    buyerName: 'John Buyer',
    sellerName: 'Jane Seller',
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
    const mockUsersService = {
      findById: jest.fn(),
      getPublicUserInfoByIds: jest.fn(),
    };

    const mockTransactionsService = {
      getTransactionById: jest.fn(),
      getSellerCompletedSalesTotal: jest.fn(),
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
      getTransactionReviews: jest.fn(),
    };

    const mockPaymentConfirmationsService = {
      getConfirmationByTransaction: jest.fn(),
    };

    const mockPaymentMethodsService = {
      getPublicPaymentMethods: jest.fn(),
    };

    const mockPricingService = {
      createSnapshot: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BffService,
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
      ],
    }).compile();

    service = module.get<BffService>(BffService);
    usersService = module.get(UsersService);
    transactionsService = module.get(TransactionsService);
    ticketsService = module.get(TicketsService);
    paymentConfirmationsService = module.get(PaymentConfirmationsService);
    reviewsService = module.get(ReviewsService);
    paymentMethodsService = module.get(PaymentMethodsService);
    pricingService = module.get(PricingService);
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

      expect(result.transaction).toEqual(mockTransactionWithDetails);
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

      expect(result.transaction).toEqual(mockTransactionWithDetails);
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

      expect(result.transaction).toEqual(mockTransactionWithDetails);
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
      type: TicketType.DigitalTransferable,
      seatingType: SeatingType.Unnumbered,
      ticketUnits: [{ id: 'unit_1', status: TicketUnitStatus.Available }],
      sellTogether: false,
      pricePerTicket: { amount: 10000, currency: 'USD' },
      eventSectionId: 'section_123',
      status: ListingStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
      eventName: 'Test Event',
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
      level: UserLevel.VerifiedSeller,
      status: UserStatus.Enabled,
      publicName: 'Jane Seller',
      imageId: 'img_123',
      password: 'hashed',
      country: 'US',
      currency: 'USD',
      emailVerified: true,
      phoneVerified: false,
      tosAcceptedAt: new Date(),
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
      pricingModel: 'fixed',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };

    const mockPaymentMethods: PublicPaymentMethodOption[] = [
      { id: 'pm_1', name: 'Credit Card', type: 'payment_gateway', buyerCommissionPercent: 3 },
      { id: 'pm_2', name: 'Bank Transfer', type: 'manual_approval', buyerCommissionPercent: null },
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

    it('should return buy page data with buyerPlatformFeePercentage in pricing snapshot', async () => {
      ticketsService.getListingById.mockResolvedValue(mockListing);
      usersService.getPublicUserInfoByIds.mockResolvedValue([mockPublicUserInfo]);
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
      expect(result.pricingSnapshot.buyerPlatformFeePercentage).toBe(10);
      expect(result.paymentMethods).toHaveLength(2);
      expect(pricingService.createSnapshot).toHaveBeenCalledWith(
        mockCtx,
        'listing_123',
        mockListing.pricePerTicket,
      );
    });
  });
});
