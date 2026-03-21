import type { Ctx } from '../../common/types/context';
import type { GatewayRefundRecord } from './gateways.domain';

export interface IGatewayRefundsRepository {
  create(ctx: Ctx, refund: GatewayRefundRecord): Promise<GatewayRefundRecord>;

  findByTransactionId(
    ctx: Ctx,
    transactionId: string,
  ): Promise<GatewayRefundRecord[]>;

  findPendingRefunds(ctx: Ctx): Promise<GatewayRefundRecord[]>;

  updateStatus(
    ctx: Ctx,
    id: string,
    status: GatewayRefundRecord['status'],
    apiCallLog?: GatewayRefundRecord['apiCallLog'],
  ): Promise<GatewayRefundRecord>;
}

export const GATEWAY_REFUNDS_REPOSITORY = Symbol('IGatewayRefundsRepository');
