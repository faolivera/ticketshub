import { Injectable } from '@nestjs/common';
import {
  PaymentConfirmation as PrismaPaymentConfirmation,
  PaymentConfirmationStatus as PrismaPaymentConfirmationStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type { PaymentConfirmation } from './payment-confirmations.domain';
import {
  PaymentConfirmationStatus,
  type PaymentConfirmationMimeType,
} from './payment-confirmations.domain';
import type { IPaymentConfirmationsRepository } from './payment-confirmations.repository.interface';

/**
 * Extended fields stored in the `fields` JSON column
 */
interface PaymentConfirmationFields {
  storageKey?: string;
  originalFilename?: string;
  contentType?: PaymentConfirmationMimeType;
  sizeBytes?: number;
  adminNotes?: string;
}

@Injectable()
export class PaymentConfirmationsRepository implements IPaymentConfirmationsRepository {
  private readonly logger = new ContextLogger(PaymentConfirmationsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(_ctx: Ctx, id: string): Promise<PaymentConfirmation | null> {
    this.logger.debug(_ctx, 'findById', { id });
    const record = await this.prisma.paymentConfirmation.findUnique({
      where: { id },
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findByTransactionId(
    _ctx: Ctx,
    transactionId: string,
  ): Promise<PaymentConfirmation | null> {
    this.logger.debug(_ctx, 'findByTransactionId', { transactionId });
    const record = await this.prisma.paymentConfirmation.findUnique({
      where: { transactionId },
    });
    return record ? this.mapToDomain(record) : null;
  }

  async findAllPending(ctx: Ctx): Promise<PaymentConfirmation[]> {
    this.logger.debug(ctx, 'findAllPending');
    const records = await this.prisma.paymentConfirmation.findMany({
      where: { status: PrismaPaymentConfirmationStatus.pending },
    });
    return records.map((r) => this.mapToDomain(r));
  }

  async countPending(ctx: Ctx): Promise<number> {
    this.logger.debug(ctx, 'countPending');
    return this.prisma.paymentConfirmation.count({
      where: { status: PrismaPaymentConfirmationStatus.pending },
    });
  }

  async getPendingTransactionIds(ctx: Ctx): Promise<string[]> {
    this.logger.debug(ctx, 'getPendingTransactionIds');
    const records = await this.prisma.paymentConfirmation.findMany({
      where: { status: PrismaPaymentConfirmationStatus.pending },
      select: { transactionId: true },
    });
    return records.map((r) => r.transactionId);
  }

  async findByTransactionIds(
    _ctx: Ctx,
    transactionIds: string[],
  ): Promise<PaymentConfirmation[]> {
    this.logger.debug(_ctx, 'findByTransactionIds', { count: transactionIds.length });
    if (transactionIds.length === 0) return [];
    const records = await this.prisma.paymentConfirmation.findMany({
      where: { transactionId: { in: transactionIds } },
    });
    return records.map((r) => this.mapToDomain(r));
  }

  async save(
    _ctx: Ctx,
    confirmation: PaymentConfirmation,
  ): Promise<PaymentConfirmation> {
    this.logger.debug(_ctx, 'save', { id: confirmation.id, transactionId: confirmation.transactionId });
    const fields: Prisma.InputJsonObject = {
      storageKey: confirmation.storageKey,
      originalFilename: confirmation.originalFilename,
      contentType: confirmation.contentType,
      sizeBytes: confirmation.sizeBytes,
      adminNotes: confirmation.adminNotes ?? null,
    };

    const prismaStatus = this.mapStatusToPrisma(confirmation.status);

    const record = await this.prisma.paymentConfirmation.upsert({
      where: { id: confirmation.id },
      create: {
        id: confirmation.id,
        transactionId: confirmation.transactionId,
        paymentMethodId: 'bank_transfer',
        uploadedBy: confirmation.uploadedBy,
        status: prismaStatus,
        imageIds: [],
        fields,
        reviewedBy: confirmation.reviewedBy,
        reviewedAt: confirmation.reviewedAt,
        rejectionReason:
          confirmation.status === PaymentConfirmationStatus.Rejected
            ? confirmation.adminNotes
            : null,
        createdAt: confirmation.createdAt,
      },
      update: {
        status: prismaStatus,
        fields,
        reviewedBy: confirmation.reviewedBy,
        reviewedAt: confirmation.reviewedAt,
        rejectionReason:
          confirmation.status === PaymentConfirmationStatus.Rejected
            ? confirmation.adminNotes
            : null,
      },
    });

    return this.mapToDomain(record);
  }

  async delete(_ctx: Ctx, id: string): Promise<void> {
    this.logger.debug(_ctx, 'delete', { id });
    await this.prisma.paymentConfirmation.delete({
      where: { id },
    });
  }

  private mapToDomain(record: PrismaPaymentConfirmation): PaymentConfirmation {
    const fields = (record.fields as PaymentConfirmationFields | null) ?? {};

    return {
      id: record.id,
      transactionId: record.transactionId,
      uploadedBy: record.uploadedBy,
      storageKey: fields.storageKey ?? '',
      originalFilename: fields.originalFilename ?? '',
      contentType: fields.contentType ?? 'image/png',
      sizeBytes: fields.sizeBytes ?? 0,
      status: this.mapStatusToDomain(record.status),
      adminNotes: fields.adminNotes ?? record.rejectionReason ?? undefined,
      reviewedBy: record.reviewedBy ?? undefined,
      createdAt: record.createdAt,
      reviewedAt: record.reviewedAt ?? undefined,
    };
  }

  private mapStatusToDomain(
    status: PrismaPaymentConfirmationStatus,
  ): PaymentConfirmationStatus {
    switch (status) {
      case PrismaPaymentConfirmationStatus.pending:
        return PaymentConfirmationStatus.Pending;
      case PrismaPaymentConfirmationStatus.approved:
        return PaymentConfirmationStatus.Accepted;
      case PrismaPaymentConfirmationStatus.rejected:
        return PaymentConfirmationStatus.Rejected;
      default:
        return PaymentConfirmationStatus.Pending;
    }
  }

  private mapStatusToPrisma(
    status: PaymentConfirmationStatus,
  ): PrismaPaymentConfirmationStatus {
    switch (status) {
      case PaymentConfirmationStatus.Pending:
        return PrismaPaymentConfirmationStatus.pending;
      case PaymentConfirmationStatus.Accepted:
        return PrismaPaymentConfirmationStatus.approved;
      case PaymentConfirmationStatus.Rejected:
        return PrismaPaymentConfirmationStatus.rejected;
      default:
        return PrismaPaymentConfirmationStatus.pending;
    }
  }
}
