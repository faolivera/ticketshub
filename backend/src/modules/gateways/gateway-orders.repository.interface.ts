import type { Ctx } from '../../common/types/context';
import type { GatewayOrderRecord, GatewayOrderStatus } from './gateways.domain';

export interface IGatewayOrdersRepository {
  create(ctx: Ctx, order: GatewayOrderRecord): Promise<GatewayOrderRecord>;

  findByTransactionId(
    ctx: Ctx,
    transactionId: string,
  ): Promise<GatewayOrderRecord | undefined>;

  findByProviderOrderId(
    ctx: Ctx,
    providerOrderId: string,
  ): Promise<GatewayOrderRecord | undefined>;

  /**
   * Find by providerOrderId with a row-level lock (SELECT FOR UPDATE).
   * Must be called inside a transaction.
   */
  findByProviderOrderIdForUpdate(
    ctx: Ctx,
    providerOrderId: string,
  ): Promise<GatewayOrderRecord | undefined>;

  findPendingOrders(ctx: Ctx): Promise<GatewayOrderRecord[]>;

  updateStatus(
    ctx: Ctx,
    id: string,
    status: GatewayOrderStatus,
  ): Promise<GatewayOrderRecord>;
}

export const GATEWAY_ORDERS_REPOSITORY = Symbol('IGatewayOrdersRepository');
