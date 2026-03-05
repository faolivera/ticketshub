import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Transaction as PrismaTransaction } from '@prisma/client';
import { TicketType as PrismaTicketType } from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import type { Transaction, Money } from './transactions.domain';
import {
  TransactionStatus,
  RequiredActor,
  CancellationReason,
} from './transactions.domain';
import type { ITransactionsRepository } from './transactions.repository.interface';
import type { Address } from '../shared/address.domain';
import { TicketType, DeliveryMethod } from '../tickets/tickets.domain';
import { BaseRepository } from '../../common/repositories/base.repository';
import { OptimisticLockException } from '../../common/exceptions/optimistic-lock.exception';

@Injectable()
export class TransactionsRepository
  extends BaseRepository
  implements ITransactionsRepository
{
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(ctx: Ctx, transaction: Transaction): Promise<Transaction> {
    const client = this.getClient(ctx);
    const created = await client.transaction.create({
      data: {
        id: transaction.id,
        listingId: transaction.listingId,
        buyerId: transaction.buyerId,
        sellerId: transaction.sellerId,
        ticketType: this.mapTicketTypeToDb(transaction.ticketType),
        ticketUnitIds: transaction.ticketUnitIds,
        quantity: transaction.quantity,
        ticketPrice: transaction.ticketPrice as object,
        buyerPlatformFee: transaction.buyerPlatformFee as object,
        sellerPlatformFee: transaction.sellerPlatformFee as object,
        paymentMethodCommission: transaction.paymentMethodCommission as object,
        totalPaid: transaction.totalPaid as object,
        sellerReceives: transaction.sellerReceives as object,
        pricingSnapshotId: transaction.pricingSnapshotId,
        offerId: transaction.offerId ?? undefined,
        status: this.mapStatusToDb(transaction.status),
        requiredActor: this.mapRequiredActorToDb(transaction.requiredActor),
        paymentExpiresAt: transaction.paymentExpiresAt,
        adminReviewExpiresAt: transaction.adminReviewExpiresAt,
        deliveryMethod: transaction.deliveryMethod
          ? this.mapDeliveryMethodToDb(transaction.deliveryMethod)
          : undefined,
        pickupAddress: transaction.pickupAddress
          ? (transaction.pickupAddress as object)
          : undefined,
        depositReleaseAt: transaction.depositReleaseAt,
        disputeId: transaction.disputeId,
        paymentMethodId: transaction.paymentMethodId,
        paymentConfirmationId: transaction.paymentConfirmationId,
        paymentApprovedBy: transaction.paymentApprovedBy,
        paymentApprovedAt: transaction.paymentApprovedAt,
        cancelledBy: transaction.cancelledBy
          ? this.mapRequiredActorToDb(transaction.cancelledBy)
          : undefined,
        cancellationReason: transaction.cancellationReason
          ? this.mapCancellationReasonToDb(transaction.cancellationReason)
          : undefined,
        paymentReceivedAt: transaction.paymentReceivedAt,
        ticketTransferredAt: transaction.ticketTransferredAt,
        buyerConfirmedAt: transaction.buyerConfirmedAt,
        completedAt: transaction.completedAt,
        cancelledAt: transaction.cancelledAt,
        refundedAt: transaction.refundedAt,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
    return this.mapToTransaction(created);
  }

  async findById(ctx: Ctx, id: string): Promise<Transaction | undefined> {
    const client = this.getClient(ctx);
    const transaction = await client.transaction.findUnique({
      where: { id },
    });
    return transaction ? this.mapToTransaction(transaction) : undefined;
  }

  async getAll(ctx: Ctx): Promise<Transaction[]> {
    const client = this.getClient(ctx);
    const transactions = await client.transaction.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return transactions.map((t) => this.mapToTransaction(t));
  }

  async getByBuyerId(ctx: Ctx, buyerId: string): Promise<Transaction[]> {
    const client = this.getClient(ctx);
    const transactions = await client.transaction.findMany({
      where: { buyerId },
      orderBy: { createdAt: 'desc' },
    });
    return transactions.map((t) => this.mapToTransaction(t));
  }

  async getBySellerId(ctx: Ctx, sellerId: string): Promise<Transaction[]> {
    const client = this.getClient(ctx);
    const transactions = await client.transaction.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
    });
    return transactions.map((t) => this.mapToTransaction(t));
  }

  async getCompletedBySellerIds(
    _ctx: Ctx,
    sellerIds: string[],
  ): Promise<Transaction[]> {
    if (sellerIds.length === 0) return [];
    const client = this.getClient(_ctx);
    const transactions = await client.transaction.findMany({
      where: {
        sellerId: { in: sellerIds },
        status: 'Completed',
      },
    });
    return transactions.map((t) => this.mapToTransaction(t));
  }

  async getByListingId(ctx: Ctx, listingId: string): Promise<Transaction[]> {
    const client = this.getClient(ctx);
    const transactions = await client.transaction.findMany({
      where: { listingId },
    });
    return transactions.map((t) => this.mapToTransaction(t));
  }

  async getByListingIds(
    ctx: Ctx,
    listingIds: string[],
  ): Promise<Transaction[]> {
    if (listingIds.length === 0) return [];
    const client = this.getClient(ctx);
    const transactions = await client.transaction.findMany({
      where: { listingId: { in: listingIds } },
    });
    return transactions.map((t) => this.mapToTransaction(t));
  }

  async getPendingDepositRelease(ctx: Ctx): Promise<Transaction[]> {
    const client = this.getClient(ctx);
    const now = new Date();
    const transactions = await client.transaction.findMany({
      where: {
        status: { in: ['TicketTransferred', 'DepositHold'] },
        depositReleaseAt: { lte: now, not: null },
        disputeId: null,
      },
    });
    return transactions.map((t) => this.mapToTransaction(t));
  }

  async update(
    ctx: Ctx,
    id: string,
    updates: Partial<Transaction>,
  ): Promise<Transaction | undefined> {
    const client = this.getClient(ctx);
    try {
      const data = this.buildUpdateData(updates);

      const updated = await client.transaction.update({
        where: { id },
        data,
      });
      return this.mapToTransaction(updated);
    } catch (error) {
      console.error('transactions.repository update failed:', error);
      return undefined;
    }
  }

  private buildUpdateData(updates: Partial<Transaction>): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (updates.listingId !== undefined) data.listingId = updates.listingId;
    if (updates.buyerId !== undefined) data.buyerId = updates.buyerId;
    if (updates.sellerId !== undefined) data.sellerId = updates.sellerId;
    if (updates.ticketType !== undefined) {
      data.ticketType = this.mapTicketTypeToDb(updates.ticketType);
    }
    if (updates.ticketUnitIds !== undefined) {
      data.ticketUnitIds = updates.ticketUnitIds;
    }
    if (updates.quantity !== undefined) data.quantity = updates.quantity;
    if (updates.ticketPrice !== undefined) {
      data.ticketPrice = updates.ticketPrice as object;
    }
    if (updates.buyerPlatformFee !== undefined) {
      data.buyerPlatformFee = updates.buyerPlatformFee as object;
    }
    if (updates.sellerPlatformFee !== undefined) {
      data.sellerPlatformFee = updates.sellerPlatformFee as object;
    }
    if (updates.paymentMethodCommission !== undefined) {
      data.paymentMethodCommission = updates.paymentMethodCommission as object;
    }
    if (updates.totalPaid !== undefined) {
      data.totalPaid = updates.totalPaid as object;
    }
    if (updates.sellerReceives !== undefined) {
      data.sellerReceives = updates.sellerReceives as object;
    }
    if (updates.pricingSnapshotId !== undefined) {
      data.pricingSnapshotId = updates.pricingSnapshotId;
    }
    if (updates.status !== undefined) {
      data.status = this.mapStatusToDb(updates.status);
    }
    if (updates.requiredActor !== undefined) {
      data.requiredActor = this.mapRequiredActorToDb(updates.requiredActor);
    }
    if (updates.paymentExpiresAt !== undefined) {
      data.paymentExpiresAt = updates.paymentExpiresAt;
    }
    if (updates.adminReviewExpiresAt !== undefined) {
      data.adminReviewExpiresAt = updates.adminReviewExpiresAt;
    }
    if (updates.deliveryMethod !== undefined) {
      data.deliveryMethod = updates.deliveryMethod
        ? this.mapDeliveryMethodToDb(updates.deliveryMethod)
        : null;
    }
    if (updates.pickupAddress !== undefined) {
      data.pickupAddress = updates.pickupAddress
        ? (updates.pickupAddress as object)
        : null;
    }
    if (updates.depositReleaseAt !== undefined) {
      data.depositReleaseAt = updates.depositReleaseAt;
    }
    if (updates.disputeId !== undefined) {
      data.disputeId = updates.disputeId;
    }
    if (updates.paymentMethodId !== undefined) {
      data.paymentMethodId = updates.paymentMethodId;
    }
    if (updates.paymentConfirmationId !== undefined) {
      data.paymentConfirmationId = updates.paymentConfirmationId;
    }
    if (updates.paymentApprovedBy !== undefined) {
      data.paymentApprovedBy = updates.paymentApprovedBy;
    }
    if (updates.paymentApprovedAt !== undefined) {
      data.paymentApprovedAt = updates.paymentApprovedAt;
    }
    if (updates.cancelledBy !== undefined) {
      data.cancelledBy = updates.cancelledBy
        ? this.mapRequiredActorToDb(updates.cancelledBy)
        : null;
    }
    if (updates.cancellationReason !== undefined) {
      data.cancellationReason = updates.cancellationReason
        ? this.mapCancellationReasonToDb(updates.cancellationReason)
        : null;
    }
    if (updates.paymentReceivedAt !== undefined) {
      data.paymentReceivedAt = updates.paymentReceivedAt;
    }
    if (updates.ticketTransferredAt !== undefined) {
      data.ticketTransferredAt = updates.ticketTransferredAt;
    }
    if (updates.buyerConfirmedAt !== undefined) {
      data.buyerConfirmedAt = updates.buyerConfirmedAt;
    }
    if (updates.completedAt !== undefined) {
      data.completedAt = updates.completedAt;
    }
    if (updates.cancelledAt !== undefined) {
      data.cancelledAt = updates.cancelledAt;
    }
    if (updates.refundedAt !== undefined) {
      data.refundedAt = updates.refundedAt;
    }

    return data;
  }

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
    const client = this.getClient(ctx);
    let where = {};

    if (filters) {
      const { transactionIds, buyerIds, sellerIds } = filters;
      const orConditions: Array<Record<string, unknown>> = [];

      if (transactionIds?.length) {
        orConditions.push({ id: { in: transactionIds } });
      }
      if (buyerIds?.length) {
        orConditions.push({ buyerId: { in: buyerIds } });
      }
      if (sellerIds?.length) {
        orConditions.push({ sellerId: { in: sellerIds } });
      }

      if (orConditions.length > 0) {
        where = { OR: orConditions };
      }
    }

    const [transactions, total] = await Promise.all([
      client.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      client.transaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => this.mapToTransaction(t)),
      total,
    };
  }

  async findByIds(ctx: Ctx, ids: string[]): Promise<Transaction[]> {
    if (ids.length === 0) return [];
    const client = this.getClient(ctx);
    const transactions = await client.transaction.findMany({
      where: { id: { in: ids } },
    });
    return transactions.map((t) => this.mapToTransaction(t));
  }

  async countByStatuses(
    ctx: Ctx,
    statuses: TransactionStatus[],
  ): Promise<number> {
    if (statuses.length === 0) return 0;
    const client = this.getClient(ctx);
    const dbStatuses = statuses.map((s) => this.mapStatusToDb(s));
    return await client.transaction.count({
      where: { status: { in: dbStatuses } },
    });
  }

  async getIdsByStatuses(
    ctx: Ctx,
    statuses: TransactionStatus[],
  ): Promise<string[]> {
    if (statuses.length === 0) return [];
    const client = this.getClient(ctx);
    const dbStatuses = statuses.map((s) => this.mapStatusToDb(s));
    const transactions = await client.transaction.findMany({
      where: { status: { in: dbStatuses } },
      select: { id: true },
    });
    return transactions.map((t) => t.id);
  }

  async findExpiredPendingPayments(ctx: Ctx): Promise<Transaction[]> {
    const client = this.getClient(ctx);
    const now = new Date();
    const transactions = await client.transaction.findMany({
      where: {
        status: 'PendingPayment',
        paymentExpiresAt: { lt: now },
      },
    });
    return transactions.map((t) => this.mapToTransaction(t));
  }

  async findExpiredAdminReviews(ctx: Ctx): Promise<Transaction[]> {
    const client = this.getClient(ctx);
    const now = new Date();
    const transactions = await client.transaction.findMany({
      where: {
        status: 'PaymentPendingVerification',
        adminReviewExpiresAt: { lt: now },
      },
    });
    return transactions.map((t) => this.mapToTransaction(t));
  }

  async findByIdForUpdate(
    ctx: Ctx,
    id: string,
  ): Promise<Transaction | undefined> {
    const client = this.getClient(ctx);

    const [transaction] = await client.$queryRaw<PrismaTransaction[]>`
      SELECT * FROM transactions
      WHERE id = ${id}
      FOR UPDATE
    `;

    return transaction ? this.mapToTransaction(transaction) : undefined;
  }

  async updateWithVersion(
    ctx: Ctx,
    id: string,
    updates: Partial<Transaction>,
    expectedVersion: number,
  ): Promise<Transaction> {
    const client = this.getClient(ctx);

    const updateData = this.buildUpdateData(updates);

    const result = await client.transaction.updateMany({
      where: { id, version: expectedVersion },
      data: {
        ...updateData,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new OptimisticLockException('Transaction', id);
    }

    const updated = await this.findById(ctx, id);
    if (!updated) {
      throw new OptimisticLockException('Transaction', id);
    }

    return updated;
  }

  // ==================== Mappers ====================

  private mapToTransaction(prismaTransaction: PrismaTransaction): Transaction {
    return {
      id: prismaTransaction.id,
      listingId: prismaTransaction.listingId,
      buyerId: prismaTransaction.buyerId,
      sellerId: prismaTransaction.sellerId,
      ticketType: this.mapTicketTypeFromDb(prismaTransaction.ticketType),
      ticketUnitIds: prismaTransaction.ticketUnitIds,
      quantity: prismaTransaction.quantity,
      ticketPrice: prismaTransaction.ticketPrice as unknown as Money,
      buyerPlatformFee: prismaTransaction.buyerPlatformFee as unknown as Money,
      sellerPlatformFee: prismaTransaction.sellerPlatformFee as unknown as Money,
      paymentMethodCommission:
        prismaTransaction.paymentMethodCommission as unknown as Money,
      totalPaid: prismaTransaction.totalPaid as unknown as Money,
      sellerReceives: prismaTransaction.sellerReceives as unknown as Money,
      pricingSnapshotId: prismaTransaction.pricingSnapshotId,
      offerId: prismaTransaction.offerId ?? undefined,
      status: this.mapStatusFromDb(prismaTransaction.status),
      requiredActor: this.mapRequiredActorFromDb(prismaTransaction.requiredActor),
      createdAt: prismaTransaction.createdAt,
      paymentReceivedAt: prismaTransaction.paymentReceivedAt ?? undefined,
      ticketTransferredAt: prismaTransaction.ticketTransferredAt ?? undefined,
      buyerConfirmedAt: prismaTransaction.buyerConfirmedAt ?? undefined,
      completedAt: prismaTransaction.completedAt ?? undefined,
      cancelledAt: prismaTransaction.cancelledAt ?? undefined,
      cancelledBy: prismaTransaction.cancelledBy
        ? this.mapRequiredActorFromDb(prismaTransaction.cancelledBy)
        : undefined,
      cancellationReason: prismaTransaction.cancellationReason
        ? this.mapCancellationReasonFromDb(prismaTransaction.cancellationReason)
        : undefined,
      paymentExpiresAt: prismaTransaction.paymentExpiresAt,
      adminReviewExpiresAt: prismaTransaction.adminReviewExpiresAt ?? undefined,
      refundedAt: prismaTransaction.refundedAt ?? undefined,
      depositReleaseAt: prismaTransaction.depositReleaseAt ?? undefined,
      deliveryMethod: prismaTransaction.deliveryMethod
        ? this.mapDeliveryMethodFromDb(prismaTransaction.deliveryMethod)
        : undefined,
      pickupAddress: prismaTransaction.pickupAddress
        ? (prismaTransaction.pickupAddress as unknown as Address)
        : undefined,
      disputeId: prismaTransaction.disputeId ?? undefined,
      paymentMethodId: prismaTransaction.paymentMethodId ?? undefined,
      paymentConfirmationId:
        prismaTransaction.paymentConfirmationId ?? undefined,
      paymentApprovedBy: prismaTransaction.paymentApprovedBy ?? undefined,
      paymentApprovedAt: prismaTransaction.paymentApprovedAt ?? undefined,
      updatedAt: prismaTransaction.updatedAt,
      version: prismaTransaction.version,
    };
  }

  // ==================== Enum Mappers ====================

  private mapStatusToDb(
    status: TransactionStatus,
  ):
    | 'PendingPayment'
    | 'PaymentPendingVerification'
    | 'PaymentReceived'
    | 'TicketTransferred'
    | 'DepositHold'
    | 'TransferringFund'
    | 'Completed'
    | 'Disputed'
    | 'Refunded'
    | 'Cancelled' {
    switch (status) {
      case TransactionStatus.PendingPayment:
        return 'PendingPayment';
      case TransactionStatus.PaymentPendingVerification:
        return 'PaymentPendingVerification';
      case TransactionStatus.PaymentReceived:
        return 'PaymentReceived';
      case TransactionStatus.TicketTransferred:
        return 'TicketTransferred';
      case TransactionStatus.DepositHold:
        return 'DepositHold';
      case TransactionStatus.TransferringFund:
        return 'TransferringFund';
      case TransactionStatus.Completed:
        return 'Completed';
      case TransactionStatus.Disputed:
        return 'Disputed';
      case TransactionStatus.Refunded:
        return 'Refunded';
      case TransactionStatus.Cancelled:
        return 'Cancelled';
    }
  }

  private mapStatusFromDb(
    status:
      | 'PendingPayment'
      | 'PaymentPendingVerification'
      | 'PaymentReceived'
      | 'TicketTransferred'
      | 'DepositHold'
      | 'TransferringFund'
      | 'Completed'
      | 'Disputed'
      | 'Refunded'
      | 'Cancelled',
  ): TransactionStatus {
    switch (status) {
      case 'PendingPayment':
        return TransactionStatus.PendingPayment;
      case 'PaymentPendingVerification':
        return TransactionStatus.PaymentPendingVerification;
      case 'PaymentReceived':
        return TransactionStatus.PaymentReceived;
      case 'TicketTransferred':
        return TransactionStatus.TicketTransferred;
      case 'DepositHold':
        return TransactionStatus.DepositHold;
      case 'TransferringFund':
        return TransactionStatus.TransferringFund;
      case 'Completed':
        return TransactionStatus.Completed;
      case 'Disputed':
        return TransactionStatus.Disputed;
      case 'Refunded':
        return TransactionStatus.Refunded;
      case 'Cancelled':
        return TransactionStatus.Cancelled;
    }
  }

  private mapRequiredActorToDb(
    actor: RequiredActor,
  ): 'Buyer' | 'Seller' | 'Platform' | 'None' {
    switch (actor) {
      case RequiredActor.Buyer:
        return 'Buyer';
      case RequiredActor.Seller:
        return 'Seller';
      case RequiredActor.Platform:
        return 'Platform';
      case RequiredActor.None:
        return 'None';
    }
  }

  private mapRequiredActorFromDb(
    actor: 'Buyer' | 'Seller' | 'Platform' | 'None',
  ): RequiredActor {
    switch (actor) {
      case 'Buyer':
        return RequiredActor.Buyer;
      case 'Seller':
        return RequiredActor.Seller;
      case 'Platform':
        return RequiredActor.Platform;
      case 'None':
        return RequiredActor.None;
    }
  }

  private mapCancellationReasonToDb(
    reason: CancellationReason,
  ):
    | 'BuyerCancelled'
    | 'PaymentFailed'
    | 'PaymentTimeout'
    | 'AdminRejected'
    | 'AdminReviewTimeout' {
    switch (reason) {
      case CancellationReason.BuyerCancelled:
        return 'BuyerCancelled';
      case CancellationReason.PaymentFailed:
        return 'PaymentFailed';
      case CancellationReason.PaymentTimeout:
        return 'PaymentTimeout';
      case CancellationReason.AdminRejected:
        return 'AdminRejected';
      case CancellationReason.AdminReviewTimeout:
        return 'AdminReviewTimeout';
    }
  }

  private mapCancellationReasonFromDb(
    reason:
      | 'BuyerCancelled'
      | 'PaymentFailed'
      | 'PaymentTimeout'
      | 'AdminRejected'
      | 'AdminReviewTimeout',
  ): CancellationReason {
    switch (reason) {
      case 'BuyerCancelled':
        return CancellationReason.BuyerCancelled;
      case 'PaymentFailed':
        return CancellationReason.PaymentFailed;
      case 'PaymentTimeout':
        return CancellationReason.PaymentTimeout;
      case 'AdminRejected':
        return CancellationReason.AdminRejected;
      case 'AdminReviewTimeout':
        return CancellationReason.AdminReviewTimeout;
    }
  }

  private mapTicketTypeToDb(type: TicketType): PrismaTicketType {
    switch (type) {
      case TicketType.Physical:
        return PrismaTicketType.Physical;
      case TicketType.Digital:
        return PrismaTicketType.Digital;
    }
  }

  private mapTicketTypeFromDb(type: PrismaTicketType): TicketType {
    switch (type) {
      case PrismaTicketType.Physical:
        return TicketType.Physical;
      case PrismaTicketType.Digital:
        return TicketType.Digital;
    }
  }

  private mapDeliveryMethodToDb(
    method: DeliveryMethod,
  ): 'Pickup' | 'ArrangeWithSeller' {
    switch (method) {
      case DeliveryMethod.Pickup:
        return 'Pickup';
      case DeliveryMethod.ArrangeWithSeller:
        return 'ArrangeWithSeller';
    }
  }

  private mapDeliveryMethodFromDb(
    method: 'Pickup' | 'ArrangeWithSeller',
  ): DeliveryMethod {
    switch (method) {
      case 'Pickup':
        return DeliveryMethod.Pickup;
      case 'ArrangeWithSeller':
        return DeliveryMethod.ArrangeWithSeller;
    }
  }
}
