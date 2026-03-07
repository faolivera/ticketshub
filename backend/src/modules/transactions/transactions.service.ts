import {
  Injectable,
  Inject,
  forwardRef,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { ITransactionsRepository } from './transactions.repository.interface';
import { TRANSACTIONS_REPOSITORY } from './transactions.repository.interface';
import { TicketsService } from '../tickets/tickets.service';
import { PaymentsService } from '../payments/payments.service';
import { WalletService } from '../wallet/wallet.service';
import { PlatformConfigService } from '../config/config.service';
import { UsersService } from '../users/users.service';
import { PricingService } from '../payments/pricing/pricing.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  Transaction,
  TransactionWithDetails,
  Money,
} from './transactions.domain';
import {
  TransactionStatus,
  RequiredActor,
  STATUS_REQUIRED_ACTOR,
  CancellationReason,
} from './transactions.domain';
import { TicketUnitStatus } from '../tickets/tickets.domain';
import type { TicketListingWithEvent } from '../tickets/tickets.domain';
import type {
  ListTransactionsQuery,
  GetPendingPaymentsResponse,
  TransactionWithPaymentInfo,
} from './transactions.api';
import { PaymentMethodsService } from '../payments/payment-methods.service';
import type { PricingSnapshot } from '../payments/pricing/pricing.domain';
import { NotificationsService } from '../notifications/notifications.service';
import { OffersService } from '../offers/offers.service';
import type { Offer, OfferTickets } from '../offers/offers.domain';
import { NotificationEventType } from '../notifications/notifications.domain';
import { TransactionManager } from '../../common/database';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { VerificationHelper } from '../../common/utils/verification-helper';

@Injectable()
export class TransactionsService {
  private readonly logger = new ContextLogger(TransactionsService.name);

  constructor(
    @Inject(TRANSACTIONS_REPOSITORY)
    private readonly transactionsRepository: ITransactionsRepository,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
    @Inject(WalletService)
    private readonly walletService: WalletService,
    @Inject(PlatformConfigService)
    private readonly platformConfigService: PlatformConfigService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(PaymentMethodsService)
    private readonly paymentMethodsService: PaymentMethodsService,
    @Inject(PricingService)
    private readonly pricingService: PricingService,
    private readonly notificationsService: NotificationsService,
    @Inject(OffersService)
    private readonly offersService: OffersService,
    @Inject(RiskEngineService)
    private readonly riskEngine: RiskEngineService,
    private readonly txManager: TransactionManager,
  ) {}

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `txn_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Calculate fees from pricing snapshot
   */
  private calculateFeesFromSnapshot(
    ticketPrice: Money,
    snapshot: PricingSnapshot,
    selectedCommissionPercent: number,
  ): {
    buyerPlatformFee: Money;
    sellerPlatformFee: Money;
    paymentMethodCommission: Money;
  } {
    return {
      buyerPlatformFee: {
        amount: Math.round(
          ticketPrice.amount * (snapshot.buyerPlatformFeePercentage / 100),
        ),
        currency: ticketPrice.currency,
      },
      sellerPlatformFee: {
        amount: Math.round(
          ticketPrice.amount * (snapshot.sellerPlatformFeePercentage / 100),
        ),
        currency: ticketPrice.currency,
      },
      paymentMethodCommission: {
        amount: Math.round(
          ticketPrice.amount * (selectedCommissionPercent / 100),
        ),
        currency: ticketPrice.currency,
      },
    };
  }

  /**
   * Resolve offer tickets to listing ticket unit ids (available units matching seats or count).
   */
  private resolveOfferToUnitIds(
    listing: TicketListingWithEvent,
    tickets: OfferTickets,
  ): string[] {
    const available = listing.ticketUnits.filter(
      (u) => u.status === TicketUnitStatus.Available,
    );
    if (tickets.type === 'numbered') {
      const ids: string[] = [];
      for (const seat of tickets.seats) {
        const unit = available.find(
          (u) =>
            u.seat &&
            u.seat.row === seat.row &&
            u.seat.seatNumber === seat.seatNumber,
        );
        if (!unit) {
          throw new BadRequestException(
            `Seat ${seat.row}-${seat.seatNumber} is no longer available`,
          );
        }
        ids.push(unit.id);
      }
      return ids;
    }
    if (available.length < tickets.count) {
      throw new BadRequestException(
        `Not enough tickets available (need ${tickets.count}, ${available.length} left)`,
      );
    }
    return available.slice(0, tickets.count).map((u) => u.id);
  }

  /**
   * Initiate a purchase (atomic - all-or-nothing).
   * When offerId is set, price and ticket selection come from the accepted offer; otherwise listing price and ticketUnitIds/pricingSnapshotId are used.
   */
  async initiatePurchase(
    ctx: Ctx,
    buyerId: string,
    listingId: string,
    ticketUnitIds: string[] | undefined,
    paymentMethodId: string,
    pricingSnapshotId: string | undefined,
    offerId: string | undefined,
  ): Promise<{ transaction: Transaction; paymentIntentId: string }> {
    this.logger.log(ctx, `Initiating purchase for listing ${listingId}${offerId ? ` (offer ${offerId})` : ''}`);

    const listing = await this.ticketsService.getListingById(ctx, listingId);

    if (listing.sellerId === buyerId) {
      throw new BadRequestException('Cannot buy your own listing');
    }

    const [buyer, seller, platformConfig, paymentMethod] = await Promise.all([
      this.usersService.findById(ctx, buyerId),
      this.usersService.findById(ctx, listing.sellerId),
      this.platformConfigService.getPlatformConfig(ctx),
      this.paymentMethodsService.findById(ctx, paymentMethodId).catch(() => null),
    ]);
    if (!buyer) {
      throw new ForbiddenException('User not found');
    }
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
    if (!VerificationHelper.hasV1(buyer)) {
      throw new ForbiddenException('Email must be verified to purchase');
    }

    let quantityForRisk = ticketUnitIds?.length ?? 0;
    const offer = offerId ? await this.getAndValidateOffer(ctx, offerId, buyerId, listingId) : undefined;
    if (offer) {
      if (offer?.tickets) {
        quantityForRisk =
          offer.tickets.type === 'numbered'
            ? offer.tickets.seats.length : offer.tickets.count;
      }
    }
    const amountMajor =
      quantityForRisk > 0
        ? (listing.pricePerTicket.amount * quantityForRisk) / 100
        : 0;
    const risk = this.riskEngine.evaluate(
      {
        quantity: quantityForRisk || 1,
        amountUsd: amountMajor,
        eventStartsAt: listing.eventDate,
        paymentMethodType: paymentMethod?.type,
        buyerCreatedAt: buyer.createdAt,
        seller,
      },
      platformConfig?.riskEngine?.buyer,
    );
    if (risk.requireV2 && !VerificationHelper.hasV2(buyer)) {
      throw new ForbiddenException(
        'Phone verification is required for this purchase. Please verify your phone number.',
      );
    }
    if (risk.requireV3 && !VerificationHelper.hasV3(buyer)) {
      throw new ForbiddenException(
        'Identity verification is required for this purchase. Please verify your identity (ID document).',
      );
    }

    let resolvedTicketUnitIds: string[];
    let resolvedPricingSnapshotId: string;

    if (offer) {
      resolvedTicketUnitIds = this.resolveOfferToUnitIds(listing, offer.tickets);
      const snapshot = await this.pricingService.createSnapshot(ctx, listing, {
        offeredPricePerTicket: offer.offeredPrice,
      });
      resolvedPricingSnapshotId = snapshot.id;
    } else {
      if (!ticketUnitIds?.length) {
        throw new BadRequestException(
          'At least one ticket unit must be selected',
        );
      }
      if (!pricingSnapshotId) {
        throw new BadRequestException('pricingSnapshotId is required when not using an offer');
      }
      resolvedTicketUnitIds = ticketUnitIds;
      resolvedPricingSnapshotId = pricingSnapshotId;
    }

    const quantity = resolvedTicketUnitIds.length;
    const transactionId = this.generateId();

    const { transaction, totalPaid } = await this.txManager.executeInTransaction(
      ctx,
      async (txCtx) => {
        const { snapshot, selectedCommissionPercent } =
          await this.pricingService.validateAndConsume(
            txCtx,
            resolvedPricingSnapshotId,
            listingId,
            paymentMethodId,
            transactionId,
          );

        const ticketPriceTotal: Money = {
          amount: snapshot.pricePerTicket.amount * quantity,
          currency: snapshot.pricePerTicket.currency,
        };

        const { buyerPlatformFee, sellerPlatformFee, paymentMethodCommission } =
          this.calculateFeesFromSnapshot(
            ticketPriceTotal,
            snapshot,
            selectedCommissionPercent,
          );

        const calculatedTotalPaid: Money = {
          amount:
            ticketPriceTotal.amount +
            buyerPlatformFee.amount +
            paymentMethodCommission.amount,
          currency: ticketPriceTotal.currency,
        };

        const sellerReceives: Money = {
          amount: ticketPriceTotal.amount - sellerPlatformFee.amount,
          currency: ticketPriceTotal.currency,
        };

        const tier = seller ? VerificationHelper.sellerTier(seller) : 0;
        await this.ticketsService.reserveTickets(
          txCtx,
          listingId,
          resolvedTicketUnitIds,
        );

        const holdHours =
          tier === 2
            ? (platformConfig?.riskEngine?.seller?.payoutHoldHoursDefault ?? 24)
            : (platformConfig?.riskEngine?.seller?.payoutHoldHoursUnverified ?? 48);
        const eventDate = new Date(listing.eventDate);
        const depositReleaseAt = new Date(
          eventDate.getTime() + holdHours * 60 * 60 * 1000,
        );

        const initialStatus = TransactionStatus.PendingPayment;
        const txn: Transaction = {
          id: transactionId,
          listingId,
          buyerId,
          sellerId: listing.sellerId,
          ticketType: listing.type,
          ticketUnitIds: resolvedTicketUnitIds,
          quantity,
          ticketPrice: ticketPriceTotal,
          buyerPlatformFee,
          sellerPlatformFee,
          paymentMethodCommission,
          totalPaid: calculatedTotalPaid,
          sellerReceives,
          pricingSnapshotId: resolvedPricingSnapshotId,
          offerId,
          status: initialStatus,
          requiredActor: STATUS_REQUIRED_ACTOR[initialStatus],
          createdAt: new Date(),
          paymentExpiresAt: new Date(
            Date.now() + platformConfig.paymentTimeoutMinutes * 60 * 1000,
          ),
          updatedAt: new Date(),
          depositReleaseAt,
          deliveryMethod: listing.deliveryMethod,
          pickupAddress: listing.pickupAddress,
          paymentMethodId,
          version: 1,
        };

        const createdTransaction =
          await this.transactionsRepository.create(txCtx, txn);

        if (offerId) {
          await this.offersService.markConverted(txCtx, offerId, transactionId);
        }

        return {
          transaction: createdTransaction,
          totalPaid: calculatedTotalPaid,
        };
      },
      { isolationLevel: 'Serializable' },
    );

    await this.offersService.cancelAffectedOffers(ctx, listingId);

    // Payment intent creation is outside the DB transaction
    const paymentIntent = await this.paymentsService.createPaymentIntent(
      ctx,
      transaction.id,
      totalPaid,
      {
        buyerId,
        sellerId: listing.sellerId,
        listingId,
        eventName: listing.eventName,
      },
    );

    this.logger.log(ctx, `Transaction ${transaction.id} created`);

    // PAYMENT_REQUIRED emission disabled for now; event and processors remain for future logic.
    // const seller = await this.usersService.findById(ctx, listing.sellerId);
    // this.notificationsService
    //   .emit(ctx, NotificationEventType.PAYMENT_REQUIRED, {
    //     transactionId: transaction.id,
    //     ticketId: listing.id,
    //     eventName: listing.eventName,
    //     amount: totalPaid.amount,
    //     currency: totalPaid.currency,
    //     expiresAt: transaction.paymentExpiresAt?.toISOString() || '',
    //     buyerId,
    //     sellerId: listing.sellerId,
    //     sellerName: seller?.publicName || 'Seller',
    //   })
    //   .catch((err) => this.logger.error(ctx, `Failed to emit PAYMENT_REQUIRED: ${err}`));

    return {
      transaction,
      paymentIntentId: paymentIntent.id,
    };
  }
  private async getAndValidateOffer(ctx: Ctx, offerId: string, buyerId: string, listingId: string): Promise<Offer> {
    const offer = await this.offersService.getOfferById(ctx, offerId);
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    if (offer.listingId !== listingId) {
      throw new BadRequestException('Offer does not match listing');
    }
    if (offer.userId !== buyerId) {
      throw new ForbiddenException('This offer belongs to another user');
    }
    if (offer.status !== 'accepted') {
      throw new BadRequestException('Offer is not accepted or has expired');
    }
    const now = new Date();
    if (offer.acceptedExpiresAt && offer.acceptedExpiresAt < now) {
      throw new BadRequestException('Offer has expired; complete purchase before the deadline');
    }
    return offer;
  }
  /**
   * Handle payment received (called by payment webhook or after confirmation)
   * Atomic with pessimistic lock to prevent double escrow hold
   */
  async handlePaymentReceived(
    ctx: Ctx,
    transactionId: string,
  ): Promise<Transaction> {
    this.logger.log(ctx, `Payment received for transaction ${transactionId}`);

    const updated = await this.txManager.executeInTransaction(ctx, async (txCtx) => {
      // Lock transaction row first to prevent concurrent processing
      const transaction = await this.transactionsRepository.findByIdForUpdate(
        txCtx,
        transactionId,
      );
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      // Validate status (prevents double processing)
      const validStatuses = [
        TransactionStatus.PendingPayment,
        TransactionStatus.PaymentPendingVerification,
      ];
      if (!validStatuses.includes(transaction.status)) {
        throw new BadRequestException('Invalid transaction status');
      }

      // Hold funds in escrow for seller (atomic, same DB transaction)
      await this.walletService.holdFunds(
        txCtx,
        transaction.sellerId,
        transaction.sellerReceives,
        transactionId,
        `Payment for ticket sale`,
      );

      // Update transaction status with version check
      const newStatus = TransactionStatus.PaymentReceived;
      return this.transactionsRepository.updateWithVersion(
        txCtx,
        transactionId,
        {
          status: newStatus,
          requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
          paymentReceivedAt: new Date(),
        },
        transaction.version,
      );
    });

    // Emit notification (fire-and-forget, outside transaction)
    const listing = await this.ticketsService.getListingById(ctx, updated.listingId);
    const seller = await this.usersService.findById(ctx, updated.sellerId);
    // Notify both buyer and seller: buyer = "seller will transfer you the ticket", seller = "payment processed, transfer the ticket"
    this.notificationsService
      .emit(ctx, NotificationEventType.BUYER_PAYMENT_APPROVED, {
        transactionId: updated.id,
        ticketId: listing.id,
        eventName: listing.eventName,
        buyerId: updated.buyerId,
        sellerId: updated.sellerId,
        sellerName: seller?.publicName || 'Seller',
      })
      .catch((err) => this.logger.error(ctx, `Failed to emit BUYER_PAYMENT_APPROVED: ${err}`));

    this.logger.log(ctx, `Transaction ${transactionId} - payment received`);
    return updated;
  }

  /**
   * Handle payment failure from gateway webhook.
   * Delegates to cancelTransaction which handles locking atomically.
   */
  async handlePaymentFailed(ctx: Ctx, transactionId: string): Promise<Transaction> {
    this.logger.log(ctx, `Payment failed for transaction ${transactionId}`);

    return this.cancelTransaction(
      ctx,
      transactionId,
      RequiredActor.Platform,
      CancellationReason.PaymentFailed,
    );
  }

  /**
   * Handle payment confirmation uploaded (for manual payments).
   * Transitions from PendingPayment to PaymentPendingVerification.
   * Atomic with lock to prevent race with scheduler cancellation.
   */
  async handlePaymentConfirmationUploaded(
    ctx: Ctx,
    transactionId: string,
  ): Promise<Transaction> {
    this.logger.log(
      ctx,
      `Payment confirmation uploaded for transaction ${transactionId}`,
    );

    const updated = await this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const transaction = await this.transactionsRepository.findByIdForUpdate(
        txCtx,
        transactionId,
      );
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (transaction.status !== TransactionStatus.PendingPayment) {
        throw new BadRequestException('Invalid transaction status');
      }

      const platformConfig = await this.platformConfigService.getPlatformConfig(ctx);
      const newStatus = TransactionStatus.PaymentPendingVerification;
      const adminReviewExpiresAt = new Date(
        Date.now() + platformConfig.adminReviewTimeoutHours * 60 * 60 * 1000,
      );

      return this.transactionsRepository.updateWithVersion(
        txCtx,
        transactionId,
        {
          status: newStatus,
          requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
          adminReviewExpiresAt,
        },
        transaction.version,
      );
    });

    this.logger.log(
      ctx,
      `Transaction ${transactionId} - payment pending verification`,
    );
    return updated;
  }

  /**
   * Seller confirms ticket transfer (atomic). Optionally records how the ticket was sent (payload type).
   */
  async confirmTransfer(
    ctx: Ctx,
    transactionId: string,
    sellerId: string,
    payloadType?: 'qr' | 'pdf' | 'text',
  ): Promise<Transaction> {
    this.logger.log(
      ctx,
      `Seller confirming transfer for transaction ${transactionId}`,
    );

    const updated = await this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const transaction = await this.transactionsRepository.findByIdForUpdate(
        txCtx,
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

      const newStatus = TransactionStatus.TicketTransferred;
      return this.transactionsRepository.updateWithVersion(
        txCtx,
        transactionId,
        {
          status: newStatus,
          requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
          ticketTransferredAt: new Date(),
          ...(payloadType && { sellerSentPayloadType: payloadType }),
        },
        transaction.version,
      );
    });

    this.logger.log(ctx, `Transaction ${transactionId} - ticket transferred`);

    // Emit notification (fire-and-forget, outside transaction)
    const listing = await this.ticketsService.getListingById(ctx, updated.listingId);
    const eventDateStr = listing.eventDate instanceof Date 
      ? listing.eventDate.toISOString() 
      : listing.eventDate;
    this.notificationsService
      .emit(ctx, NotificationEventType.TICKET_TRANSFERRED, {
        transactionId: updated.id,
        ticketId: listing.id,
        eventName: listing.eventName,
        eventDate: eventDateStr,
        venue: listing.venue || '',
        buyerId: updated.buyerId,
        sellerId: updated.sellerId,
      })
      .catch((err) => this.logger.error(ctx, `Failed to emit TICKET_TRANSFERRED: ${err}`));

    return updated;
  }

  /**
   * Buyer confirms receipt (for Physical and Digital tickets)
   * Atomic with lock to prevent concurrent updates
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

    const updated = await this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const transaction = await this.transactionsRepository.findByIdForUpdate(
        txCtx,
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

      // Transition to DepositHold only; funds stay in escrow until depositReleaseAt then TransferringFund, then admin completes
      const newStatus = TransactionStatus.DepositHold;
      return this.transactionsRepository.updateWithVersion(
        txCtx,
        transactionId,
        {
          status: newStatus,
          requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
          buyerConfirmedAt: new Date(),
        },
        transaction.version,
      );
    });

    if (updated.status !== TransactionStatus.DepositHold) {
      this.logger.error(
        ctx,
        `confirmReceipt expected DepositHold but got ${updated.status} for transaction ${transactionId}`,
      );
      throw new Error('Unexpected status after confirm receipt');
    }
    this.logger.log(ctx, `Transaction ${transactionId} - buyer confirmed receipt, now DepositHold`);
    return updated;
  }

  /**
   * Transition transactions to TransferringFund when depositReleaseAt has passed.
   * Does not release funds; admin pays manually then calls completePayout.
   */
  async processDepositReleases(ctx: Ctx): Promise<number> {
    this.logger.log(ctx, 'Processing deposit releases (to TransferringFund)');

    const pending =
      await this.transactionsRepository.getPendingDepositRelease(ctx);
    let count = 0;

    for (const transaction of pending) {
      try {
        const didTransition = await this.txManager.executeInTransaction(
          ctx,
          async (txCtx) => {
            const txn = await this.transactionsRepository.findByIdForUpdate(
              txCtx,
              transaction.id,
            );
            if (
              !txn ||
              txn.status === TransactionStatus.Disputed ||
              (txn.status !== TransactionStatus.TicketTransferred &&
                txn.status !== TransactionStatus.DepositHold)
            ) {
              return false;
            }

            const newStatus = TransactionStatus.TransferringFund;
            await this.transactionsRepository.updateWithVersion(
              txCtx,
              txn.id,
              {
                status: newStatus,
                requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
              },
              txn.version,
            );
            return true;
          },
        );
        if (didTransition) {
          count++;
          this.logger.log(ctx, `Transaction ${transaction.id} -> TransferringFund`);
        }
      } catch (error) {
        this.logger.error(
          ctx,
          `Failed to transition transaction ${transaction.id}: ${error}`,
        );
      }
    }

    return count;
  }

  /**
   * Admin marks payout done: release funds to seller wallet and set status to Completed.
   * Allowed only when status is TransferringFund.
   */
  async completePayout(
    ctx: Ctx,
    transactionId: string,
  ): Promise<Transaction> {
    this.logger.log(ctx, `Completing payout for transaction ${transactionId}`);

    const updated = await this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const transaction = await this.transactionsRepository.findByIdForUpdate(
        txCtx,
        transactionId,
      );
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }
      if (transaction.status !== TransactionStatus.TransferringFund) {
        throw new BadRequestException(
          'Transaction must be in TransferringFund status to complete payout',
        );
      }

      const seller = await this.usersService.findById(txCtx, transaction.sellerId);
      if (!seller || !VerificationHelper.canReceivePayout(seller)) {
        throw new ForbiddenException(
          'Seller must have completed identity verification (KYC) and bank account verification to receive payout',
        );
      }

      await this.walletService.releaseFunds(
        txCtx,
        transaction.sellerId,
        transaction.sellerReceives,
        transactionId,
        `Payment released for ticket sale`,
      );

      const newStatus = TransactionStatus.Completed;
      return this.transactionsRepository.updateWithVersion(
        txCtx,
        transactionId,
        {
          status: newStatus,
          requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
          completedAt: new Date(),
        },
        transaction.version,
      );
    });

    const listing = await this.ticketsService.getListingById(ctx, updated.listingId);
    this.notificationsService
      .emit(ctx, NotificationEventType.TRANSACTION_COMPLETED, {
        transactionId: updated.id,
        ticketId: listing.id,
        eventName: listing.eventName,
        amount: updated.sellerReceives.amount,
        currency: updated.sellerReceives.currency,
        buyerId: updated.buyerId,
        sellerId: updated.sellerId,
      })
      .catch((err) =>
        this.logger.error(ctx, `Failed to emit TRANSACTION_COMPLETED: ${err}`),
      );

    this.logger.log(ctx, `Transaction ${transactionId} - payout completed`);
    return updated;
  }

  /**
   * Cancel transaction and restore tickets (atomic)
   */
  async cancelTransaction(
    ctx: Ctx,
    transactionId: string,
    cancelledBy: RequiredActor,
    cancellationReason: CancellationReason,
  ): Promise<Transaction> {
    const updated = await this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const transaction = await this.transactionsRepository.findByIdForUpdate(
        txCtx,
        transactionId,
      );
      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const cancellableStatuses = [
        TransactionStatus.PendingPayment,
        TransactionStatus.PaymentPendingVerification,
      ];
      if (!cancellableStatuses.includes(transaction.status)) {
        throw new BadRequestException(
          'Transaction cannot be cancelled in current status',
        );
      }

      // Restore tickets to listing (atomic)
      await this.ticketsService.restoreTickets(
        txCtx,
        transaction.listingId,
        transaction.ticketUnitIds,
      );

      const newStatus = TransactionStatus.Cancelled;
      return this.transactionsRepository.updateWithVersion(
        txCtx,
        transactionId,
        {
          status: newStatus,
          requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
          cancelledAt: new Date(),
          cancelledBy,
          cancellationReason,
        },
        transaction.version,
      );
    });

    this.logger.log(
      ctx,
      `Transaction ${transactionId} cancelled by ${cancelledBy}: ${cancellationReason}`,
    );
    return updated;
  }

  /**
   * Cancel all transactions with expired payment window (called by scheduler)
   */
  async cancelExpiredPendingPayments(ctx: Ctx): Promise<number> {
    this.logger.log(ctx, 'Cancelling expired pending payments');

    const expired =
      await this.transactionsRepository.findExpiredPendingPayments(ctx);
    let cancelled = 0;

    for (const transaction of expired) {
      try {
        await this.cancelTransaction(
          ctx,
          transaction.id,
          RequiredActor.Platform,
          CancellationReason.PaymentTimeout,
        );
        cancelled++;
      } catch (error) {
        this.logger.error(
          ctx,
          `Failed to cancel expired transaction ${transaction.id}: ${error}`,
        );
      }
    }

    if (cancelled > 0) {
      this.logger.log(ctx, `Cancelled ${cancelled} expired pending payments`);
    }
    return cancelled;
  }

  /**
   * Cancel all transactions with expired admin review window (called by scheduler)
   */
  async cancelExpiredAdminReviews(ctx: Ctx): Promise<number> {
    this.logger.log(ctx, 'Cancelling expired admin reviews');

    const expired =
      await this.transactionsRepository.findExpiredAdminReviews(ctx);
    let cancelled = 0;

    for (const transaction of expired) {
      try {
        await this.cancelTransaction(
          ctx,
          transaction.id,
          RequiredActor.Platform,
          CancellationReason.AdminReviewTimeout,
        );
        cancelled++;
      } catch (error) {
        this.logger.error(
          ctx,
          `Failed to cancel expired admin review ${transaction.id}: ${error}`,
        );
      }
    }

    if (cancelled > 0) {
      this.logger.log(ctx, `Cancelled ${cancelled} expired admin reviews`);
    }
    return cancelled;
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
    const transaction = await this.transactionsRepository.findById(ctx, id);
    return transaction ?? null;
  }

  /**
   * Get paginated transactions with optional filters (admin use).
   */
  async getPaginated(
    ctx: Ctx,
    page: number,
    limit: number,
    filters?: {
      transactionIds?: string[];
      buyerIds?: string[];
      sellerIds?: string[];
    },
  ): Promise<{ transactions: Transaction[]; total: number }> {
    return this.transactionsRepository.getPaginated(ctx, page, limit, filters);
  }

  /**
   * Count transactions by status values (admin use).
   */
  async countByStatuses(
    ctx: Ctx,
    statuses: TransactionStatus[],
  ): Promise<number> {
    return this.transactionsRepository.countByStatuses(ctx, statuses);
  }

  /**
   * Get transaction IDs by status values (admin use).
   */
  async getIdsByStatuses(
    ctx: Ctx,
    statuses: TransactionStatus[],
  ): Promise<string[]> {
    return this.transactionsRepository.getIdsByStatuses(ctx, statuses);
  }

  /**
   * Get transactions by IDs (batch, admin use).
   */
  async findByIds(ctx: Ctx, ids: string[]): Promise<Transaction[]> {
    if (ids.length === 0) return [];
    return this.transactionsRepository.findByIds(ctx, ids);
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
      bannerUrls: listing.bannerUrls,
    };
  }

  /**
   * Enrich multiple transactions with details (batch: 2 queries total).
   */
  private async enrichTransactions(
    ctx: Ctx,
    transactions: Transaction[],
  ): Promise<TransactionWithDetails[]> {
    if (transactions.length === 0) return [];

    const listingIds = [...new Set(transactions.map((t) => t.listingId))];
    const userIds = [
      ...new Set(transactions.flatMap((t) => [t.buyerId, t.sellerId])),
    ];

    const [listings, userInfos] = await Promise.all([
      this.ticketsService.getListingsByIds(ctx, listingIds),
      this.usersService.getPublicUserInfoByIds(ctx, userIds),
    ]);

    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const userInfoMap = new Map(userInfos.map((u) => [u.id, u]));

    return transactions.map((t) => {
      const listing = listingMap.get(t.listingId);
      const buyerInfo = userInfoMap.get(t.buyerId);
      const sellerInfo = userInfoMap.get(t.sellerId);
      return {
        ...t,
        eventName: listing?.eventName ?? 'Unknown',
        eventDate: listing?.eventDate ?? new Date(),
        venue: listing?.venue ?? 'Unknown',
        buyerName: buyerInfo?.publicName ?? 'Unknown',
        sellerName: sellerInfo?.publicName ?? 'Unknown',
        bannerUrls: listing?.bannerUrls,
      };
    });
  }

  /**
   * List user's transactions
   */
  async listTransactions(
    ctx: Ctx,
    userId: string,
    query: ListTransactionsQuery,
  ): Promise<TransactionWithDetails[]> {
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const status =
      query.status !== undefined
        ? (query.status as TransactionStatus)
        : undefined;

    let result: { transactions: Transaction[]; total: number };

    if (query.role === 'seller') {
      result = await this.transactionsRepository.getBySellerIdPaginated(
        ctx,
        userId,
        { status, limit, offset },
      );
    } else if (query.role === 'buyer') {
      result = await this.transactionsRepository.getByBuyerIdPaginated(
        ctx,
        userId,
        { status, limit, offset },
      );
    } else {
      result = await this.transactionsRepository.getByUserIdPaginated(
        ctx,
        userId,
        { status, limit, offset },
      );
    }

    return this.enrichTransactions(ctx, result.transactions);
  }

  /**
   * Get total completed sales (ticket count) for a seller.
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
   * Get total completed sales (ticket units sold) for multiple sellers (batch).
   * Mirrors getSellerCompletedSalesTotal but for many sellers in a single query.
   */
  async getCompletedSalesTotalBatch(
    ctx: Ctx,
    sellerIds: string[],
  ): Promise<Map<string, number>> {
    const transactions = await this.transactionsRepository.getCompletedBySellerIds(
      ctx,
      sellerIds,
    );
    const map = new Map<string, number>();
    for (const tx of transactions) {
      const prev = map.get(tx.sellerId) ?? 0;
      map.set(tx.sellerId, prev + tx.ticketUnitIds.length);
    }
    return map;
  }

  /**
   * Mark transaction as disputed
   */
  async markDisputed(
    ctx: Ctx,
    transactionId: string,
    disputeId: string,
  ): Promise<Transaction> {
    const newStatus = TransactionStatus.Disputed;
    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: newStatus,
        requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
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

    const newStatus = TransactionStatus.Refunded;
    const updated = await this.transactionsRepository.update(
      ctx,
      transactionId,
      {
        status: newStatus,
        requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
        refundedAt: new Date(),
      },
    );

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    return updated;
  }

  /**
   * Resolve dispute in favor of seller: transition from Disputed to DepositHold
   * so the scheduler can release funds at depositReleaseAt. Used by support when
   * admin resolves with SellerWins.
   */
  async resolveDisputeSellerWins(
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
    if (transaction.status !== TransactionStatus.Disputed) {
      throw new BadRequestException(
        'Transaction is not in Disputed status. Only disputed transactions can be resolved in favor of the seller.',
      );
    }

    const newStatus = TransactionStatus.DepositHold;
    const updated = await this.transactionsRepository.update(ctx, transactionId, {
      status: newStatus,
      requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
      disputeId: null as unknown as string,
    });

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    this.logger.log(
      ctx,
      `Dispute resolved in favor of seller: transaction ${transactionId} -> DepositHold`,
    );
    return updated;
  }

  /**
   * Get transactions pending manual payment approval (admin)
   */
  async getPendingManualPayments(
    ctx: Ctx,
  ): Promise<GetPendingPaymentsResponse> {
    this.logger.log(ctx, 'Getting pending manual payments');

    const allPaymentMethods = await this.paymentMethodsService.findAll(ctx);
    const manualPaymentMethodIds = allPaymentMethods
      .filter((m) => m.type === 'manual_approval')
      .map((m) => m.id);

    const pendingManual = await this.transactionsRepository.getByStatusAndPaymentMethodIds(
      ctx,
      TransactionStatus.PaymentPendingVerification,
      manualPaymentMethodIds,
    );

    if (pendingManual.length === 0) {
      return { transactions: [], total: 0 };
    }

    const paymentMethodMap = new Map(
      allPaymentMethods.map((m) => [m.id, m]),
    );

    const [listings, userInfos] = await Promise.all([
      this.ticketsService.getListingsByIds(
        ctx,
        [...new Set(pendingManual.map((t) => t.listingId))],
      ),
      this.usersService.getPublicUserInfoByIds(ctx, [
        ...new Set(
          pendingManual.flatMap((t) => [t.buyerId, t.sellerId]),
        ),
      ]),
    ]);
    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const userInfoMap = new Map(userInfos.map((u) => [u.id, u]));

    const enriched: TransactionWithPaymentInfo[] = pendingManual.map((t) => {
      const listing = listingMap.get(t.listingId);
      const buyerInfo = userInfoMap.get(t.buyerId);
      const sellerInfo = userInfoMap.get(t.sellerId);
      const paymentMethod = t.paymentMethodId
        ? paymentMethodMap.get(t.paymentMethodId)
        : undefined;
      return {
        ...t,
        eventName: listing?.eventName ?? 'Unknown',
        eventDate: listing?.eventDate ?? new Date(),
        venue: listing?.venue ?? 'Unknown',
        buyerName: buyerInfo?.publicName ?? 'Unknown',
        sellerName: sellerInfo?.publicName ?? 'Unknown',
        bannerUrls: listing?.bannerUrls,
        paymentMethodId: t.paymentMethodId ?? undefined,
        paymentMethodName: paymentMethod?.name ?? 'Unknown',
      };
    });

    return {
      transactions: enriched,
      total: enriched.length,
    };
  }

  /**
   * Approve or reject manual payment (admin) - atomic
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

    if (approved) {
      const updated = await this.txManager.executeInTransaction(ctx, async (txCtx) => {
        const transaction = await this.transactionsRepository.findByIdForUpdate(
          txCtx,
          transactionId,
        );
        if (!transaction) {
          throw new NotFoundException('Transaction not found');
        }

        if (transaction.status !== TransactionStatus.PaymentPendingVerification) {
          throw new BadRequestException(
            'Transaction is not pending payment verification',
          );
        }

        // Hold funds in escrow for seller (atomic)
        await this.walletService.holdFunds(
          txCtx,
          transaction.sellerId,
          transaction.sellerReceives,
          transactionId,
          `Payment for ticket sale (manual approval)`,
        );

        const newStatus = TransactionStatus.PaymentReceived;
        return this.transactionsRepository.updateWithVersion(
          txCtx,
          transactionId,
          {
            status: newStatus,
            requiredActor: STATUS_REQUIRED_ACTOR[newStatus],
            paymentReceivedAt: new Date(),
            paymentApprovedBy: adminId,
            paymentApprovedAt: new Date(),
          },
          transaction.version,
        );
      });

      this.logger.log(
        ctx,
        `Transaction ${transactionId} - manual payment approved`,
      );

      // Emit seller notification (payment available, transfer ticket)
      const listing = await this.ticketsService.getListingById(ctx, updated.listingId);
      this.notificationsService
        .emit(ctx, NotificationEventType.SELLER_PAYMENT_RECEIVED, {
          transactionId: updated.id,
          ticketId: listing.id,
          eventName: listing.eventName,
          amount: updated.sellerReceives.amount,
          currency: updated.sellerReceives.currency,
          sellerId: updated.sellerId,
          buyerId: updated.buyerId,
        })
        .catch((err) => this.logger.error(ctx, `Failed to emit SELLER_PAYMENT_RECEIVED: ${err}`));

      return updated;
    } else {
      // Admin rejected - cancel the transaction (already atomic)
      const updated = await this.cancelTransaction(
        ctx,
        transactionId,
        RequiredActor.Platform,
        CancellationReason.AdminRejected,
      );

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
