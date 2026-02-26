import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BffService } from '../../../../modules/bff/bff.service';
import { UsersService } from '../../../../modules/users/users.service';
import { TransactionsService } from '../../../../modules/transactions/transactions.service';
import { TicketsService } from '../../../../modules/tickets/tickets.service';
import { ReviewsService } from '../../../../modules/reviews/reviews.service';
import { PaymentConfirmationsService } from '../../../../modules/payment-confirmations/payment-confirmations.service';
import {
  TransactionStatus,
  type TransactionWithDetails,
} from '../../../../modules/transactions/transactions.domain';
import { TicketType } from '../../../../modules/tickets/tickets.domain';
import { Role } from '../../../../modules/users/users.domain';
import type { PaymentConfirmation } from '../../../../modules/payment-confirmations/payment-confirmations.domain';
import { PaymentConfirmationStatus } from '../../../../modules/payment-confirmations/payment-confirmations.domain';
import type { Ctx } from '../../../../common/types/context';

describe('BffService', () => {
  let service: BffService;
  let transactionsService: jest.Mocked<TransactionsService>;
  let paymentConfirmationsService: jest.Mocked<PaymentConfirmationsService>;
  let reviewsService: jest.Mocked<ReviewsService>;

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
    buyerFee: { amount: 1000, currency: 'USD' },
    sellerFee: { amount: 500, currency: 'USD' },
    totalPaid: { amount: 11000, currency: 'USD' },
    sellerReceives: { amount: 9500, currency: 'USD' },
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
      ],
    }).compile();

    service = module.get<BffService>(BffService);
    transactionsService = module.get(TransactionsService);
    paymentConfirmationsService = module.get(PaymentConfirmationsService);
    reviewsService = module.get(ReviewsService);
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
});
