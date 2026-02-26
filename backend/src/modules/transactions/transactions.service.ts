import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { TransactionsRepository } from './transactions.repository';
import { TicketsService } from '../tickets/tickets.service';
import { PaymentsService } from '../payments/payments.service';
import { WalletService } from '../wallet/wallet.service';
import { ConfigService } from '../config/config.service';
import { UsersService } from '../users/users.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  Transaction,
  TransactionWithDetails,
  Money,
} from './transactions.domain';
import { TransactionStatus } from './transactions.domain';
import { TicketType } from '../tickets/tickets.domain';
import type {
  ListTransactionsQuery,
  GetPendingPaymentsResponse,
  TransactionWithPaymentInfo,
} from './transactions.api';
import type { PaymentMethodId } from '../payments/payments.domain';
import { BUY_PAGE_PAYMENT_METHODS } from '../payments/payments.domain';

@Injectable()
export class TransactionsService {
  private readonly logger = new ContextLogger(TransactionsService.name);

  constructor(
    @Inject(TransactionsRepository)
    private readonly transactionsRepository: TransactionsRepository,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
    @Inject(WalletService)
    private readonly walletService: WalletService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `txn_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Calculate fees
   */
  private calculateFees(ticketPrice: Money): {
    buyerFee: Money;
    sellerFee: Money;
  } {
    const buyerFeePercentage = this.configService.getBuyerFeePercentage();
    const sellerFeePercentage = this.configService.getSellerFeePercentage();

    return {
      buyerFee: {
        amount: Math.round(ticketPrice.amount * (buyerFeePercentage / 100)),
        currency: ticketPrice.currency,
      },
      sellerFee: {
        amount: Math.round(ticketPrice.amount * (sellerFeePercentage / 100)),
        currency: ticketPrice.currency,
      },
    };
  }

  /**
   * Initiate a purchase
   */
  async initiatePurchase(
    ctx: Ctx,
    buyerId: string,
    listingId: string,
    ticketUnitIds: string[],
    paymentMethodId: PaymentMethodId,
  ): Promise<{ transaction: Transaction; paymentIntentId: string }> {
    this.logger.log(ctx, `Initiating purchase for listing ${listingId}`);

    // Get listing and validate
    const listing = await this.ticketsService.getListingById(ctx, listingId);

    if (listing.sellerId === buyerId) {
      throw new BadRequestException('Cannot buy your own listing');
    }

    if (!ticketUnitIds.length) {
      throw new BadRequestException(
        'At least one ticket unit must be selected',
      );
    }

    const quantity = ticketUnitIds.length;

    // Calculate prices
    const ticketPriceTotal: Money = {
      amount: listing.pricePerTicket.amount * quantity,
      currency: listing.pricePerTicket.currency,
    };

    const { buyerFee, sellerFee } = this.calculateFees(ticketPriceTotal);

    const totalPaid: Money = {
      amount: ticketPriceTotal.amount + buyerFee.amount,
      currency: ticketPriceTotal.currency,
    };

    const sellerReceives: Money = {
      amount: ticketPriceTotal.amount - sellerFee.amount,
      currency: ticketPriceTotal.currency,
    };

    // Calculate auto-release time for digital non-transferable tickets
    let autoReleaseAt: Date | undefined;
    if (listing.type === TicketType.DigitalNonTransferable) {
      const releaseMinutes =
        this.configService.getDigitalNonTransferableReleaseMinutes();
      const eventDate = new Date(listing.eventDate);
      autoReleaseAt = new Date(
        eventDate.getTime() + releaseMinutes * 60 * 1000,
      );
    }

    // Create transaction
    const transaction: Transaction = {
      id: this.generateId(),
      listingId,
      buyerId,
      sellerId: listing.sellerId,
      ticketType: listing.type,
      ticketUnitIds,
      quantity,
      ticketPrice: ticketPriceTotal,
      buyerFee,
      sellerFee,
      totalPaid,
      sellerReceives,
      status: TransactionStatus.PendingPayment,
      createdAt: new Date(),
      updatedAt: new Date(),
      eventDateTime: new Date(listing.eventDate),
      releaseAfterMinutes:
        listing.type === TicketType.DigitalNonTransferable
          ? this.configService.getDigitalNonTransferableReleaseMinutes()
          : undefined,
      autoReleaseAt,
      deliveryMethod: listing.deliveryMethod,
      pickupAddress: listing.pickupAddress,
      paymentMethodId,
    };

    await this.transactionsRepository.create(ctx, transaction);

    // Reserve tickets
    await this.ticketsService.reserveTickets(ctx, listingId, ticketUnitIds);

    // Create payment intent
    const paymentIntent = await this.paymentsService.createPaymentIntent(
      ctx,
      transaction.id,
      totalPaid,
      {
        buyerId,
        sellerId: listing.sellerId,
        listingId,
        eventName: listing.eventName,
        ticketDescription: listing.description,
      },
    );

    this.logger.log(ctx, `Transaction ${transaction.id} created`);

    return {
      transaction,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Handle payment received (called by payment webhook or after confirmation)
   */
  async handlePaymentReceived(
    ctx: Ctx,
    transactionId: string,
  ): Promise<Transaction> {
    this.logger.log(ctx, `Payment received for transaction ${transactionId}`);

    const transaction = await this.transactionsRepository.findById(
      ctx,
      transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PendingPayment) {
      throw new BadRequestException('Invalid transaction status');
    }

    // Hold funds in escrow for seller
    await this.walletService.holdFunds(
      ctx,
      transaction.sellerId,
      transaction.sellerReceives,
      transactionId,
      `Payment for ticket sale`,
    );

    // Update transaction status
    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: TransactionStatus.PaymentReceived,
        paymentReceivedAt: new Date(),
      },
    );

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    // TODO: Send notifications to buyer and seller

    this.logger.log(ctx, `Transaction ${transactionId} - payment received`);
    return updated;
  }

  /**
   * Seller confirms ticket transfer
   */
  async confirmTransfer(
    ctx: Ctx,
    transactionId: string,
    sellerId: string,
  ): Promise<Transaction> {
    this.logger.log(
      ctx,
      `Seller confirming transfer for transaction ${transactionId}`,
    );

    const transaction = await this.transactionsRepository.findById(
      ctx,
      transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.sellerId !== sellerId) {
      throw new ForbiddenException('Only seller can confirm transfer');
    }

    if (transaction.status !== TransactionStatus.PaymentReceived) {
      throw new BadRequestException('Invalid transaction status');
    }

    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: TransactionStatus.TicketTransferred,
        ticketTransferredAt: new Date(),
      },
    );

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    this.logger.log(ctx, `Transaction ${transactionId} - ticket transferred`);
    return updated;
  }

  /**
   * Buyer confirms receipt (for Physical and DigitalTransferable tickets)
   */
  async confirmReceipt(
    ctx: Ctx,
    transactionId: string,
    buyerId: string,
  ): Promise<Transaction> {
    this.logger.log(
      ctx,
      `Buyer confirming receipt for transaction ${transactionId}`,
    );

    const transaction = await this.transactionsRepository.findById(
      ctx,
      transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.buyerId !== buyerId) {
      throw new ForbiddenException('Only buyer can confirm receipt');
    }

    if (transaction.status !== TransactionStatus.TicketTransferred) {
      throw new BadRequestException('Invalid transaction status');
    }

    // Release payment to seller
    await this.walletService.releaseFunds(
      ctx,
      transaction.sellerId,
      transaction.sellerReceives,
      transactionId,
      `Payment released for ticket sale`,
    );

    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: TransactionStatus.Completed,
        buyerConfirmedAt: new Date(),
        completedAt: new Date(),
      },
    );

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    // TODO: Send completion notifications

    this.logger.log(ctx, `Transaction ${transactionId} - completed`);
    return updated;
  }

  /**
   * Auto-release payment for digital non-transferable tickets
   */
  async processAutoReleases(ctx: Ctx): Promise<number> {
    this.logger.log(ctx, 'Processing auto-releases');

    const pendingReleases =
      await this.transactionsRepository.getPendingAutoRelease(ctx);
    let released = 0;

    for (const transaction of pendingReleases) {
      try {
        // Release payment to seller
        await this.walletService.releaseFunds(
          ctx,
          transaction.sellerId,
          transaction.sellerReceives,
          transaction.id,
          `Auto-release for digital ticket`,
        );

        await this.transactionsRepository.update(ctx, transaction.id, {
          status: TransactionStatus.Completed,
          completedAt: new Date(),
        });

        released++;
        this.logger.log(ctx, `Auto-released transaction ${transaction.id}`);
      } catch (error) {
        this.logger.error(
          ctx,
          `Failed to auto-release transaction ${transaction.id}: ${error}`,
        );
      }
    }

    return released;
  }

  /**
   * Cancel transaction (before payment)
   */
  async cancelTransaction(
    ctx: Ctx,
    transactionId: string,
    userId: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findById(
      ctx,
      transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.buyerId !== userId) {
      throw new ForbiddenException('Only buyer can cancel');
    }

    if (transaction.status !== TransactionStatus.PendingPayment) {
      throw new BadRequestException(
        'Can only cancel pending payment transactions',
      );
    }

    // Restore tickets to listing
    await this.ticketsService.restoreTickets(
      ctx,
      transaction.listingId,
      transaction.ticketUnitIds,
    );

    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: TransactionStatus.Cancelled,
        cancelledAt: new Date(),
      },
    );

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    this.logger.log(ctx, `Transaction ${transactionId} - cancelled`);
    return updated;
  }

  /**
   * Get transaction by ID with details
   */
  async getTransactionById(
    ctx: Ctx,
    id: string,
    userId: string,
  ): Promise<TransactionWithDetails> {
    const transaction = await this.transactionsRepository.findById(ctx, id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Only buyer or seller can view transaction
    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return await this.enrichTransaction(ctx, transaction);
  }

  /**
   * Get raw transaction by ID (internal use only, no permission checks).
   * Use this for service-to-service communication.
   */
  async findById(ctx: Ctx, id: string): Promise<Transaction | null> {
    return this.transactionsRepository.findById(ctx, id);
  }

  /**
   * Enrich transaction with details
   */
  private async enrichTransaction(
    ctx: Ctx,
    transaction: Transaction,
  ): Promise<TransactionWithDetails> {
    const [listing, userInfos] = await Promise.all([
      this.ticketsService.getListingById(ctx, transaction.listingId),
      this.usersService.getPublicUserInfoByIds(ctx, [
        transaction.buyerId,
        transaction.sellerId,
      ]),
    ]);

    const userInfoMap = new Map(userInfos.map((u) => [u.id, u]));
    const buyerInfo = userInfoMap.get(transaction.buyerId);
    const sellerInfo = userInfoMap.get(transaction.sellerId);

    return {
      ...transaction,
      eventName: listing.eventName,
      eventDate: listing.eventDate,
      venue: listing.venue,
      buyerName: buyerInfo?.publicName ?? 'Unknown',
      sellerName: sellerInfo?.publicName ?? 'Unknown',
    };
  }

  /**
   * List user's transactions
   */
  async listTransactions(
    ctx: Ctx,
    userId: string,
    query: ListTransactionsQuery,
  ): Promise<TransactionWithDetails[]> {
    let transactions: Transaction[];

    if (query.role === 'seller') {
      transactions = await this.transactionsRepository.getBySellerId(
        ctx,
        userId,
      );
    } else if (query.role === 'buyer') {
      transactions = await this.transactionsRepository.getByBuyerId(
        ctx,
        userId,
      );
    } else {
      const asBuyer = await this.transactionsRepository.getByBuyerId(
        ctx,
        userId,
      );
      const asSeller = await this.transactionsRepository.getBySellerId(
        ctx,
        userId,
      );
      transactions = [...asBuyer, ...asSeller].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    // Apply filters
    if (query.status) {
      transactions = transactions.filter((t) => t.status === query.status);
    }

    // Pagination
    const offset = query.offset || 0;
    const limit = query.limit || 20;
    transactions = transactions.slice(offset, offset + limit);

    return await Promise.all(
      transactions.map((t) => this.enrichTransaction(ctx, t)),
    );
  }

  /**
   * Get total completed sales for a seller
   */
  async getSellerCompletedSalesTotal(
    ctx: Ctx,
    sellerId: string,
  ): Promise<number> {
    const transactions = await this.transactionsRepository.getBySellerId(
      ctx,
      sellerId,
    );
    return transactions
      .filter(
        (transaction) => transaction.status === TransactionStatus.Completed,
      )
      .reduce(
        (total, transaction) => total + transaction.ticketUnitIds.length,
        0,
      );
  }

  /**
   * Mark transaction as disputed
   */
  async markDisputed(
    ctx: Ctx,
    transactionId: string,
    disputeId: string,
  ): Promise<Transaction> {
    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: TransactionStatus.Disputed,
        disputeId,
      },
    );

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    return updated;
  }

  /**
   * Refund transaction (for dispute resolution)
   */
  async refundTransaction(
    ctx: Ctx,
    transactionId: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionsRepository.findById(
      ctx,
      transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Refund held funds
    await this.walletService.refundHeldFunds(
      ctx,
      transaction.sellerId,
      transaction.sellerReceives,
      transactionId,
      'Dispute refund',
    );

    // Refund payment to buyer via payment provider
    const payment = await this.paymentsService.getPaymentByTransactionId(
      ctx,
      transactionId,
    );
    if (payment) {
      await this.paymentsService.refundPayment(ctx, payment.id);
    }

    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: TransactionStatus.Refunded,
        refundedAt: new Date(),
      },
    );

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    return updated;
  }

  /**
   * Get transactions pending manual payment approval (admin)
   */
  async getPendingManualPayments(
    ctx: Ctx,
  ): Promise<GetPendingPaymentsResponse> {
    this.logger.log(ctx, 'Getting pending manual payments');

    const allTransactions = await this.transactionsRepository.getAll(ctx);

    // Filter for transactions that are pending payment and use manual approval method
    const manualPaymentMethodIds = BUY_PAGE_PAYMENT_METHODS.filter(
      (m) => m.type === 'manual_approval',
    ).map((m) => m.id);

    const pendingManual = allTransactions.filter(
      (t) =>
        t.status === TransactionStatus.PendingPayment &&
        t.paymentMethodId &&
        manualPaymentMethodIds.includes(t.paymentMethodId),
    );

    // Enrich with details
    const enriched: TransactionWithPaymentInfo[] = await Promise.all(
      pendingManual.map(async (t) => {
        const details = await this.enrichTransaction(ctx, t);
        const paymentMethod = BUY_PAGE_PAYMENT_METHODS.find(
          (m) => m.id === t.paymentMethodId,
        );
        return {
          ...details,
          paymentMethodId: t.paymentMethodId,
          paymentMethodName: paymentMethod?.name || 'Unknown',
        };
      }),
    );

    return {
      transactions: enriched,
      total: enriched.length,
    };
  }

  /**
   * Approve or reject manual payment (admin)
   */
  async approveManualPayment(
    ctx: Ctx,
    transactionId: string,
    adminId: string,
    approved: boolean,
    rejectionReason?: string,
  ): Promise<Transaction> {
    this.logger.log(
      ctx,
      `Admin ${adminId} ${approved ? 'approving' : 'rejecting'} payment for transaction ${transactionId}`,
    );

    const transaction = await this.transactionsRepository.findById(
      ctx,
      transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PendingPayment) {
      throw new BadRequestException(
        'Transaction is not pending payment approval',
      );
    }

    if (approved) {
      // Hold funds in escrow for seller
      await this.walletService.holdFunds(
        ctx,
        transaction.sellerId,
        transaction.sellerReceives,
        transactionId,
        `Payment for ticket sale (manual approval)`,
      );

      const updated = await this.transactionsRepository.update(
        ctx,
        transactionId,
        {
          status: TransactionStatus.PaymentReceived,
          paymentReceivedAt: new Date(),
          paymentApprovedBy: adminId,
          paymentApprovedAt: new Date(),
        },
      );

      if (!updated) {
        throw new NotFoundException('Transaction not found');
      }

      this.logger.log(
        ctx,
        `Transaction ${transactionId} - manual payment approved`,
      );
      return updated;
    } else {
      // Restore tickets to listing
      await this.ticketsService.restoreTickets(
        ctx,
        transaction.listingId,
        transaction.ticketUnitIds,
      );

      const updated = await this.transactionsRepository.update(
        ctx,
        transactionId,
        {
          status: TransactionStatus.Cancelled,
          cancelledAt: new Date(),
        },
      );

      if (!updated) {
        throw new NotFoundException('Transaction not found');
      }

      this.logger.log(
        ctx,
        `Transaction ${transactionId} - manual payment rejected: ${rejectionReason}`,
      );
      return updated;
    }
  }

  /**
   * Check if any listings have completed transactions.
   * Used by admin when attempting to delete event dates.
   */
  async hasCompletedTransactionsForListings(
    ctx: Ctx,
    listingIds: string[],
  ): Promise<boolean> {
    if (listingIds.length === 0) return false;

    const transactions = await this.transactionsRepository.getByListingIds(
      ctx,
      listingIds,
    );

    return transactions.some((t) => t.status === TransactionStatus.Completed);
  }
}
