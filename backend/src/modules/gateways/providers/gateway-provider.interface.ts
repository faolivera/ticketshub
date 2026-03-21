import type { Ctx } from '../../../common/types/context';
import type { PaymentMethodOption } from '../../payments/payments.domain';

export interface GatewayProviderOrder {
  providerOrderId: string;
  checkoutUrl: string;
}

export type GatewayProviderOrderStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'cancelled';

export interface GatewayProviderMoney {
  amount: number; // cents
  currency: string;
}

export interface GatewayProvider {
  createOrder(
    ctx: Ctx,
    transactionId: string,
    amount: GatewayProviderMoney,
    description: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrder>;

  getOrder(
    ctx: Ctx,
    providerOrderId: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrderStatus>;

  refundOrder(
    ctx: Ctx,
    providerOrderId: string,
    amount: GatewayProviderMoney,
    paymentMethod: PaymentMethodOption,
  ): Promise<void>;
}
