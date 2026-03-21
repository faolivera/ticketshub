import { Injectable } from '@nestjs/common';
import type { GatewayOrder as PrismaGatewayOrder } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { GatewayOrderRecord, GatewayOrderStatus } from './gateways.domain';
import type { IGatewayOrdersRepository } from './gateway-orders.repository.interface';

@Injectable()
export class GatewayOrdersRepository
  extends BaseRepository
  implements IGatewayOrdersRepository
{
  private readonly logger = new ContextLogger(GatewayOrdersRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(ctx: Ctx, order: GatewayOrderRecord): Promise<GatewayOrderRecord> {
    this.logger.debug(ctx, 'create', { orderId: order.id });
    const client = this.getClient(ctx);
    const created = await client.gatewayOrder.create({
      data: {
        id: order.id,
        transactionId: order.transactionId,
        paymentMethodId: order.paymentMethodId,
        provider: order.provider,
        providerOrderId: order.providerOrderId,
        checkoutUrl: order.checkoutUrl,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
    return this.map(created);
  }

  async findByTransactionId(
    ctx: Ctx,
    transactionId: string,
  ): Promise<GatewayOrderRecord | undefined> {
    this.logger.debug(ctx, 'findByTransactionId', { transactionId });
    const client = this.getClient(ctx);
    const row = await client.gatewayOrder.findUnique({ where: { transactionId } });
    return row ? this.map(row) : undefined;
  }

  async findByProviderOrderId(
    ctx: Ctx,
    providerOrderId: string,
  ): Promise<GatewayOrderRecord | undefined> {
    this.logger.debug(ctx, 'findByProviderOrderId', { providerOrderId });
    const client = this.getClient(ctx);
    const row = await client.gatewayOrder.findUnique({ where: { providerOrderId } });
    return row ? this.map(row) : undefined;
  }

  async findByProviderOrderIdForUpdate(
    ctx: Ctx,
    providerOrderId: string,
  ): Promise<GatewayOrderRecord | undefined> {
    this.logger.debug(ctx, 'findByProviderOrderIdForUpdate', { providerOrderId });
    const client = this.getClient(ctx);
    const [row] = await client.$queryRaw<PrismaGatewayOrder[]>`
      SELECT * FROM gateway_orders
      WHERE provider_order_id = ${providerOrderId}
      FOR UPDATE
    `;
    return row ? this.map(row) : undefined;
  }

  async findPendingOrders(ctx: Ctx): Promise<GatewayOrderRecord[]> {
    this.logger.debug(ctx, 'findPendingOrders');
    const client = this.getClient(ctx);
    const rows = await client.gatewayOrder.findMany({ where: { status: 'pending' } });
    return rows.map((r) => this.map(r));
  }

  async updateStatus(
    ctx: Ctx,
    id: string,
    status: GatewayOrderStatus,
  ): Promise<GatewayOrderRecord> {
    this.logger.debug(ctx, 'updateStatus', { id, status });
    const client = this.getClient(ctx);
    const updated = await client.gatewayOrder.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });
    return this.map(updated);
  }

  private map(row: PrismaGatewayOrder): GatewayOrderRecord {
    return {
      id: row.id,
      transactionId: row.transactionId,
      paymentMethodId: row.paymentMethodId,
      provider: row.provider,
      providerOrderId: row.providerOrderId,
      checkoutUrl: row.checkoutUrl,
      status: row.status as GatewayOrderStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
