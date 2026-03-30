import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethodsService } from '../../payments/payment-methods.service';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';
import type {
  GatewayProvider,
  GatewayProviderOrder,
  GatewayProviderOrderStatus,
  GatewayProviderMoney,
} from './gateway-provider.interface';
import type { PaymentMethodOption } from '../../payments/payments.domain';

const MP_API = 'https://api.mercadopago.com';

interface MpPayment {
  id: number;
  status: string;
  preference_id: string;
}

interface MpMerchantOrder {
  payments: Array<{ id: number; status: string }>;
}

@Injectable()
export class MercadoPagoProvider implements GatewayProvider {
  private readonly logger = new ContextLogger(MercadoPagoProvider.name);

  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly configService: ConfigService,
  ) {}

  private getAccessToken(ctx: Ctx, paymentMethod: PaymentMethodOption): string {
    const creds = this.paymentMethodsService.getGatewayCredentials(ctx, paymentMethod);
    if (!creds.accessToken) {
      throw new BadRequestException(
        `MercadoPago access token not configured for payment method ${paymentMethod.id}`,
      );
    }
    return creds.accessToken;
  }

  private isProduction(): boolean {
    return this.configService.get<string>('app.environment') === 'prod';
  }

  private mapStatus(mpStatus: string): GatewayProviderOrderStatus {
    switch (mpStatus) {
      case 'approved':
        return 'approved';
      case 'rejected':
      case 'cancelled':
        return 'rejected';
      case 'refunded':
      case 'charged_back':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  private centsToDecimal(cents: number): number {
    return cents / 100;
  }

  private resolveExternalUrl(url: string): string {
    if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
      return 'https://ticketshub-latest.onrender.com';
    }
    return url;
  }

  private async getMerchantOrder(
    ctx: Ctx,
    preferenceId: string,
    accessToken: string,
  ): Promise<MpMerchantOrder | null> {
    const url = `${MP_API}/merchant_orders/search?preference_id=${encodeURIComponent(preferenceId)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(ctx, `MP merchant_orders search failed: ${response.status}`, err);
      throw new Error(`MP merchant_orders search failed: ${response.status}`);
    }

    const data = (await response.json()) as { elements?: MpMerchantOrder[] };
    return data.elements?.[0] ?? null;
  }

  async createOrder(
    ctx: Ctx,
    transactionId: string,
    amount: GatewayProviderMoney,
    description: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrder> {
    const accessToken = this.getAccessToken(ctx, paymentMethod);
    const publicUrl = this.resolveExternalUrl(this.configService.get<string>('app.publicUrl') ?? '');
    const backendUrl = this.resolveExternalUrl(this.configService.get<string>('app.backendUrl') ?? publicUrl);
    const transactionUrl = `${publicUrl}/transaction/${transactionId}`;

    const body = {
      items: [
        {
          title: description,
          quantity: 1,
          unit_price: this.centsToDecimal(amount.amount),
          currency_id: amount.currency,
        },
      ],
      external_reference: transactionId,
      notification_url: `${backendUrl}/api/payments/webhook/mercadopago`,
      back_urls: {
        success: transactionUrl,
        failure: transactionUrl,
        pending: transactionUrl,
      },
      auto_return: 'approved',
    };

    const response = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(ctx, `MP create preference failed: ${response.status}`, err);
      throw new Error(`MP create preference failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      id: string;
      init_point: string;
      sandbox_init_point: string;
    };

    const checkoutUrl = this.isProduction() ? data.init_point : data.sandbox_init_point;

    this.logger.log(ctx, `MP preference created: ${data.id} for transaction ${transactionId}`);
    return { providerOrderId: data.id, checkoutUrl };
  }

  async getOrder(
    ctx: Ctx,
    preferenceId: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrderStatus> {
    const accessToken = this.getAccessToken(ctx, paymentMethod);
    const order = await this.getMerchantOrder(ctx, preferenceId, accessToken);

    if (!order || order.payments.length === 0) {
      return 'pending';
    }

    // Return the first non-pending resolved status
    for (const payment of order.payments) {
      const mapped = this.mapStatus(payment.status);
      if (mapped !== 'pending') {
        return mapped;
      }
    }
    return 'pending';
  }

  async refundOrder(
    ctx: Ctx,
    preferenceId: string,
    amount: GatewayProviderMoney,
    paymentMethod: PaymentMethodOption,
  ): Promise<void> {
    const accessToken = this.getAccessToken(ctx, paymentMethod);
    const order = await this.getMerchantOrder(ctx, preferenceId, accessToken);

    if (!order) {
      throw new NotFoundException(`No merchant order found for preference ${preferenceId}`);
    }

    const approvedPayment = order.payments.find((p) => p.status === 'approved');
    if (!approvedPayment) {
      throw new NotFoundException(`No approved payment found for preference ${preferenceId}`);
    }

    const refundBody = amount.amount > 0
      ? JSON.stringify({ amount: this.centsToDecimal(amount.amount) })
      : '{}';

    const response = await fetch(`${MP_API}/v1/payments/${approvedPayment.id}/refunds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: refundBody,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(ctx, `MP refund failed: ${response.status} for preference ${preferenceId}`, err);
      throw new Error(`MP refund failed: ${response.status}`);
    }

    this.logger.log(ctx, `MP refund initiated for preference ${preferenceId}`);
  }

  /**
   * Fetches a payment by ID and returns its preference_id.
   * Used by the webhook handler to map paymentId → preferenceId → handleOrderUpdate.
   */
  async fetchPayment(
    ctx: Ctx,
    paymentId: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<{ preferenceId: string }> {
    const accessToken = this.getAccessToken(ctx, paymentMethod);

    const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(ctx, `MP fetch payment failed: ${response.status} for payment ${paymentId}`, err);
      throw new Error(`MP fetch payment failed: ${response.status}`);
    }

    const data = (await response.json()) as MpPayment;
    this.logger.debug(ctx, 'fetchPayment', { paymentId, preferenceId: data.preference_id });
    return { preferenceId: data.preference_id };
  }
}
