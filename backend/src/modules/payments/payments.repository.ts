import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { PaymentIntent as PrismaPaymentIntent } from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type { PaymentIntent, Money, PaymentMetadata } from './payments.domain';
import { PaymentStatus } from './payments.domain';
import type { IPaymentsRepository } from './payments.repository.interface';

@Injectable()
export class PaymentsRepository implements IPaymentsRepository {
  private readonly logger = new ContextLogger(PaymentsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(_ctx: Ctx, payment: PaymentIntent): Promise<PaymentIntent> {
    this.logger.debug(_ctx, 'create', { paymentId: payment.id });
    const created = await this.prisma.paymentIntent.create({
      data: {
        id: payment.id,
        transactionId: payment.transactionId,
        amount: payment.amount as object,
        status: this.mapStatusToDb(payment.status),
        provider: 'mock',
        providerPaymentId: payment.providerPaymentId,
        metadata: payment.metadata as object,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    });
    return this.mapToPaymentIntent(created);
  }

  async findById(_ctx: Ctx, id: string): Promise<PaymentIntent | undefined> {
    this.logger.debug(_ctx, 'findById', { id });
    const payment = await this.prisma.paymentIntent.findUnique({
      where: { id },
    });
    return payment ? this.mapToPaymentIntent(payment) : undefined;
  }

  async findByTransactionId(
    _ctx: Ctx,
    transactionId: string,
  ): Promise<PaymentIntent | undefined> {
    this.logger.debug(_ctx, 'findByTransactionId', { transactionId });
    const payment = await this.prisma.paymentIntent.findUnique({
      where: { transactionId },
    });
    return payment ? this.mapToPaymentIntent(payment) : undefined;
  }

  async findByProviderPaymentId(
    _ctx: Ctx,
    providerPaymentId: string,
  ): Promise<PaymentIntent | undefined> {
    this.logger.debug(_ctx, 'findByProviderPaymentId', { providerPaymentId });
    const payment = await this.prisma.paymentIntent.findFirst({
      where: { providerPaymentId },
    });
    return payment ? this.mapToPaymentIntent(payment) : undefined;
  }

  async update(
    _ctx: Ctx,
    id: string,
    updates: Partial<PaymentIntent>,
  ): Promise<PaymentIntent | undefined> {
    this.logger.debug(_ctx, 'update', { id });
    try {
      const data: Record<string, unknown> = {};

      if (updates.transactionId !== undefined) {
        data.transactionId = updates.transactionId;
      }
      if (updates.amount !== undefined) {
        data.amount = updates.amount as object;
      }
      if (updates.status !== undefined) {
        data.status = this.mapStatusToDb(updates.status);
      }
      if (updates.providerPaymentId !== undefined) {
        data.providerPaymentId = updates.providerPaymentId;
      }
      if (updates.metadata !== undefined) {
        data.metadata = updates.metadata as object;
      }

      const updated = await this.prisma.paymentIntent.update({
        where: { id },
        data,
      });
      return this.mapToPaymentIntent(updated);
    } catch (error) {
      this.logger.error(_ctx, 'payments.repository update failed:', error);
      return undefined;
    }
  }

  // ==================== Mappers ====================

  private mapToPaymentIntent(prisma: PrismaPaymentIntent): PaymentIntent {
    return {
      id: prisma.id,
      transactionId: prisma.transactionId,
      amount: prisma.amount as unknown as Money,
      status: this.mapStatusFromDb(prisma.status),
      providerPaymentId: prisma.providerPaymentId ?? undefined,
      metadata: (prisma.metadata as unknown as PaymentMetadata) ?? {
        buyerId: '',
        sellerId: '',
        listingId: '',
      },
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    };
  }

  // ==================== Enum Mappers ====================

  private mapStatusToDb(
    status: PaymentStatus,
  ): 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' {
    switch (status) {
      case PaymentStatus.Pending:
        return 'pending';
      case PaymentStatus.Processing:
        return 'processing';
      case PaymentStatus.Succeeded:
        return 'succeeded';
      case PaymentStatus.Failed:
        return 'failed';
      case PaymentStatus.Cancelled:
        return 'cancelled';
      case PaymentStatus.Refunded:
        return 'succeeded';
    }
  }

  private mapStatusFromDb(
    status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled',
  ): PaymentStatus {
    switch (status) {
      case 'pending':
        return PaymentStatus.Pending;
      case 'processing':
        return PaymentStatus.Processing;
      case 'succeeded':
        return PaymentStatus.Succeeded;
      case 'failed':
        return PaymentStatus.Failed;
      case 'cancelled':
        return PaymentStatus.Cancelled;
    }
  }
}
