import { Injectable, NotImplementedException } from '@nestjs/common';
import type { Ctx } from '../../../common/types/context';
import type { PaymentMethodOption } from '../../payments/payments.domain';
import type {
  GatewayProviderOrder,
  GatewayProviderOrderStatus,
  GatewayProviderMoney,
} from './gateway-provider.interface';

@Injectable()
export class MercadoPagoProvider {
  async createOrder(
    _ctx: Ctx,
    _transactionId: string,
    _amount: GatewayProviderMoney,
    _description: string,
    _paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrder> {
    throw new NotImplementedException('MercadoPago integration not yet implemented');
  }

  async getOrder(
    _ctx: Ctx,
    _providerOrderId: string,
    _paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrderStatus> {
    throw new NotImplementedException('MercadoPago integration not yet implemented');
  }

  async refundOrder(
    _ctx: Ctx,
    _providerOrderId: string,
    _amount: GatewayProviderMoney,
    _paymentMethod: PaymentMethodOption,
  ): Promise<void> {
    throw new NotImplementedException('MercadoPago integration not yet implemented');
  }
}
