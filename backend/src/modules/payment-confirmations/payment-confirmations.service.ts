import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PaymentConfirmationsRepository } from './payment-confirmations.repository';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { TicketsService } from '../tickets/tickets.service';
import {
  FILE_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../../common/storage/file-storage-provider.interface';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { PaymentConfirmation } from './payment-confirmations.domain';
import {
  PaymentConfirmationStatus,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  type PaymentConfirmationMimeType,
} from './payment-confirmations.domain';
import type {
  PaymentConfirmationWithTransaction,
  ListPaymentConfirmationsResponse,
} from './payment-confirmations.api';
import { TransactionStatus } from '../transactions/transactions.domain';
import { Role } from '../users/users.domain';

@Injectable()
export class PaymentConfirmationsService {
  private readonly logger = new ContextLogger(PaymentConfirmationsService.name);

  constructor(
    @Inject(PaymentConfirmationsRepository)
    private readonly repository: PaymentConfirmationsRepository,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storageProvider: FileStorageProvider,
  ) {}

  private generateId(): string {
    return `pc_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private generateStorageKey(
    transactionId: string,
    originalFilename: string,
  ): string {
    const timestamp = Date.now();
    const uuid = randomBytes(6).toString('hex');
    const ext = originalFilename.split('.').pop() || 'bin';
    return `${transactionId}_${timestamp}_${uuid}.${ext}`;
  }

  /**
   * Upload a payment confirmation for a transaction.
   * Only the buyer can upload, and only when transaction is PendingPayment
   * with a manual_approval payment method.
   */
  async uploadConfirmation(
    ctx: Ctx,
    transactionId: string,
    userId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ): Promise<PaymentConfirmation> {
    this.logger.log(
      ctx,
      `Uploading payment confirmation for transaction ${transactionId}`,
    );

    const transaction = await this.transactionsService.findById(
      ctx,
      transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.buyerId !== userId) {
      throw new ForbiddenException(
        'Only the buyer can upload payment confirmation',
      );
    }

    if (transaction.status !== TransactionStatus.PendingPayment) {
      throw new BadRequestException(
        'Payment confirmation can only be uploaded for pending payment transactions',
      );
    }

    if (
      !transaction.paymentMethodId ||
      !transaction.paymentMethodId.includes('bank_transfer')
    ) {
      throw new BadRequestException(
        'Payment confirmation is only required for manual payment methods',
      );
    }

    const existing = await this.repository.findByTransactionId(
      ctx,
      transactionId,
    );
    if (existing) {
      throw new BadRequestException(
        'Payment confirmation already uploaded for this transaction',
      );
    }

    if (
      !ALLOWED_MIME_TYPES.includes(file.mimetype as PaymentConfirmationMimeType)
    ) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File too large. Maximum size: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
      );
    }

    const storageKey = this.generateStorageKey(
      transactionId,
      file.originalname,
    );

    await this.storageProvider.store(storageKey, file.buffer, {
      contentType: file.mimetype,
      contentLength: file.size,
      originalFilename: file.originalname,
    });

    const confirmation: PaymentConfirmation = {
      id: this.generateId(),
      transactionId,
      uploadedBy: userId,
      storageKey,
      originalFilename: file.originalname,
      contentType: file.mimetype as PaymentConfirmationMimeType,
      sizeBytes: file.size,
      status: PaymentConfirmationStatus.Pending,
      createdAt: new Date(),
    };

    await this.repository.save(ctx, confirmation);

    this.logger.log(
      ctx,
      `Payment confirmation ${confirmation.id} uploaded for transaction ${transactionId}`,
    );

    return confirmation;
  }

  /**
   * Get payment confirmation by transaction ID.
   * Access restricted to buyer, seller, or admin.
   */
  async getConfirmationByTransaction(
    ctx: Ctx,
    transactionId: string,
    userId: string,
    userRole: string,
  ): Promise<PaymentConfirmation | null> {
    const transaction = await this.transactionsService.findById(
      ctx,
      transactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    const isAuthorized =
      transaction.buyerId === userId ||
      transaction.sellerId === userId ||
      userRole === Role.Admin;

    if (!isAuthorized) {
      throw new ForbiddenException(
        'You are not authorized to view this payment confirmation',
      );
    }

    return this.repository.findByTransactionId(ctx, transactionId);
  }

  /**
   * Stream file content for download.
   * Access restricted to buyer, seller, or admin.
   */
  async getFileContent(
    ctx: Ctx,
    transactionId: string,
    userId: string,
    userRole: string,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
    const confirmation = await this.getConfirmationByTransaction(
      ctx,
      transactionId,
      userId,
      userRole,
    );

    if (!confirmation) {
      return null;
    }

    const buffer = await this.storageProvider.retrieve(confirmation.storageKey);
    if (!buffer) {
      this.logger.warn(
        ctx,
        `File not found in storage for confirmation ${confirmation.id}`,
      );
      return null;
    }

    return {
      buffer,
      contentType: confirmation.contentType,
      filename: confirmation.originalFilename,
    };
  }

  /**
   * Find payment confirmations by transaction IDs (batch).
   */
  async findByTransactionIds(
    ctx: Ctx,
    transactionIds: string[],
  ): Promise<PaymentConfirmation[]> {
    if (transactionIds.length === 0) return [];
    return this.repository.findByTransactionIds(ctx, transactionIds);
  }

  /**
   * Get count of pending payment confirmations (admin use).
   */
  async getPendingCount(ctx: Ctx): Promise<number> {
    return this.repository.countPending(ctx);
  }

  /**
   * List all pending payment confirmations (admin only).
   */
  async listPendingConfirmations(
    ctx: Ctx,
  ): Promise<ListPaymentConfirmationsResponse> {
    const pending = await this.repository.findAllPending(ctx);

    const confirmationsWithDetails: PaymentConfirmationWithTransaction[] = [];

    for (const confirmation of pending) {
      const transaction = await this.transactionsService.findById(
        ctx,
        confirmation.transactionId,
      );
      if (!transaction) continue;

      const [buyer, seller] = await Promise.all([
        this.usersService.findById(ctx, transaction.buyerId),
        this.usersService.findById(ctx, transaction.sellerId),
      ]);

      const listing = await this.ticketsService.getListingById(
        ctx,
        transaction.listingId,
      );

      confirmationsWithDetails.push({
        ...confirmation,
        buyerName: buyer?.publicName ?? 'Unknown',
        sellerName: seller?.publicName ?? 'Unknown',
        eventName: listing?.eventName ?? 'Unknown Event',
        transactionAmount: transaction.totalPaid.amount,
        transactionCurrency: transaction.totalPaid.currency,
      });
    }

    return {
      confirmations: confirmationsWithDetails,
      total: confirmationsWithDetails.length,
    };
  }

  /**
   * Update confirmation status (admin only).
   * When updateTransaction is true (default), also approves/rejects the associated transaction.
   */
  async updateStatus(
    ctx: Ctx,
    confirmationId: string,
    adminId: string,
    status: 'Accepted' | 'Rejected',
    adminNotes?: string,
    updateTransaction: boolean = true,
  ): Promise<PaymentConfirmation> {
    const confirmation = await this.repository.findById(ctx, confirmationId);
    if (!confirmation) {
      throw new NotFoundException('Payment confirmation not found');
    }

    if (confirmation.status !== PaymentConfirmationStatus.Pending) {
      throw new BadRequestException(
        'Only pending confirmations can be reviewed',
      );
    }

    if (updateTransaction) {
      const approved = status === 'Accepted';
      this.logger.log(
        ctx,
        `Coordinating transaction ${confirmation.transactionId} ${approved ? 'approval' : 'rejection'} with confirmation ${confirmationId}`,
      );

      await this.transactionsService.approveManualPayment(
        ctx,
        confirmation.transactionId,
        adminId,
        approved,
        approved ? undefined : adminNotes,
      );
    }

    const updatedConfirmation: PaymentConfirmation = {
      ...confirmation,
      status:
        status === 'Accepted'
          ? PaymentConfirmationStatus.Accepted
          : PaymentConfirmationStatus.Rejected,
      adminNotes,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    };

    await this.repository.save(ctx, updatedConfirmation);

    this.logger.log(
      ctx,
      `Payment confirmation ${confirmationId} ${status.toLowerCase()} by admin ${adminId}`,
    );

    return updatedConfirmation;
  }
}
