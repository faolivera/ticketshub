import { Injectable } from '@nestjs/common';
import type { GatewayRefund as PrismaGatewayRefund } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { GatewayRefundRecord, GatewayApiCallLog } from './gateways.domain';
import type { IGatewayRefundsRepository } from './gateway-refunds.repository.interface';

@Injectable()
export class GatewayRefundsRepository
  extends BaseRepository
  implements IGatewayRefundsRepository
{
  private readonly logger = new ContextLogger(GatewayRefundsRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(ctx: Ctx, refund: GatewayRefundRecord): Promise<GatewayRefundRecord> {
    this.logger.debug(ctx, 'create', { refundId: refund.id });
    const client = this.getClient(ctx);
    const created = await client.gatewayRefund.create({
      data: {
        id: refund.id,
        transactionId: refund.transactionId,
        gatewayOrderId: refund.gatewayOrderId,
        providerOrderId: refund.providerOrderId,
        paymentMethodId: refund.paymentMethodId,
        provider: refund.provider,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        apiCallLog: refund.apiCallLog as object | undefined,
        createdAt: refund.createdAt,
        updatedAt: refund.updatedAt,
      },
    });
    return this.map(created);
  }

  async findByTransactionId(
    ctx: Ctx,
    transactionId: string,
  ): Promise<GatewayRefundRecord[]> {
    this.logger.debug(ctx, 'findByTransactionId', { transactionId });
    const client = this.getClient(ctx);
    const rows = await client.gatewayRefund.findMany({ where: { transactionId } });
    return rows.map((r) => this.map(r));
  }

  async findPendingRefunds(ctx: Ctx): Promise<GatewayRefundRecord[]> {
    this.logger.debug(ctx, 'findPendingRefunds');
    const client = this.getClient(ctx);
    const rows = await client.gatewayRefund.findMany({ where: { status: 'Pending' } });
    return rows.map((r) => this.map(r));
  }

  async updateStatus(
    ctx: Ctx,
    id: string,
    status: GatewayRefundRecord['status'],
    apiCallLog?: GatewayRefundRecord['apiCallLog'],
  ): Promise<GatewayRefundRecord> {
    this.logger.debug(ctx, 'updateStatus', { id, status });
    const client = this.getClient(ctx);
    const data: Record<string, unknown> = { status, updatedAt: new Date() };
    if (apiCallLog !== undefined) {
      data.apiCallLog = apiCallLog as object;
    }
    const updated = await client.gatewayRefund.update({ where: { id }, data });
    return this.map(updated);
  }

  private map(row: PrismaGatewayRefund): GatewayRefundRecord {
    return {
      id: row.id,
      transactionId: row.transactionId,
      gatewayOrderId: row.gatewayOrderId,
      providerOrderId: row.providerOrderId,
      paymentMethodId: row.paymentMethodId,
      provider: row.provider,
      amount: row.amount,
      currency: row.currency,
      status: row.status as GatewayRefundRecord['status'],
      apiCallLog: row.apiCallLog
        ? (row.apiCallLog as unknown as GatewayApiCallLog)
        : undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
