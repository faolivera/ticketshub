import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentMethodsService } from '../../payments/payment-methods.service';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';
import type {
  GatewayProviderOrder,
  GatewayProviderOrderStatus,
  GatewayProviderMoney,
} from './gateway-provider.interface';
import type { PaymentMethodOption } from '../../payments/payments.domain';

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000; // 5 minutes

interface TokenCacheEntry {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class UalaBisProvider {
  private readonly logger = new ContextLogger(UalaBisProvider.name);
  private readonly tokenCache = new Map<string, TokenCacheEntry>();

  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly configService: ConfigService,
  ) {}

  private getBaseUrls(): { auth: string; checkout: string } {
    const isStaging =
      this.configService.get<string>('app.environment') !== 'production';
    return isStaging
      ? {
          auth: 'https://auth.stage.developers.ar.ua.la/v2/api/auth/token',
          checkout: 'https://checkout.stage.developers.ar.ua.la/v2/api',
        }
      : {
          auth: 'https://auth.developers.ar.ua.la/v2/api/auth/token',
          checkout: 'https://checkout.developers.ar.ua.la/v2/api',
        };
  }

  private isTokenValid(entry: TokenCacheEntry): boolean {
    return entry.expiresAt.getTime() - Date.now() > TOKEN_REFRESH_MARGIN_MS;
  }

  private async fetchToken(
    ctx: Ctx,
    paymentMethod: PaymentMethodOption,
  ): Promise<string> {
    const creds = this.paymentMethodsService.getGatewayCredentials(
      ctx,
      paymentMethod,
    );
    const { auth } = this.getBaseUrls();

    const response = await fetch(auth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: creds.username,
        client_id: creds.clientId,
        client_secret_id: creds.clientSecretId,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      this.logger.error(ctx, `Ualá auth failed: ${response.status}`, body);
      throw new Error(`Ualá authentication failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);
    this.tokenCache.set(paymentMethod.id, {
      token: data.access_token,
      expiresAt,
    });
    this.logger.log(ctx, `Ualá token refreshed for ${paymentMethod.id}`);
    return data.access_token;
  }

  private async getToken(
    ctx: Ctx,
    paymentMethod: PaymentMethodOption,
  ): Promise<string> {
    const cached = this.tokenCache.get(paymentMethod.id);
    if (cached && this.isTokenValid(cached)) {
      return cached.token;
    }
    return this.fetchToken(ctx, paymentMethod);
  }

  private centsToDecimalString(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  private mapStatus(ualaStatus: string): GatewayProviderOrderStatus {
    switch (ualaStatus) {
      case 'APPROVED':
      case 'PROCESSED':
        return 'approved';
      case 'REJECTED':
        return 'rejected';
      case 'REFUNDED':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  async createOrder(
    ctx: Ctx,
    transactionId: string,
    amount: GatewayProviderMoney,
    description: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrder> {
    const token = await this.getToken(ctx, paymentMethod);
    const { checkout } = this.getBaseUrls();
    const frontendBaseUrl =
      this.configService.get<string>('app.publicUrl') ?? '';
    const backendBaseUrl =
      this.configService.get<string>('app.backendUrl') ?? frontendBaseUrl;

    const body = {
      amount: this.centsToDecimalString(amount.amount),
      description,
      callback_success: `${frontendBaseUrl}/transaction/${transactionId}`,
      callback_fail: `${frontendBaseUrl}/transaction/${transactionId}`,
      notification_url: `${backendBaseUrl}/api/payments/webhook/uala-bis`,
      external_reference: transactionId,
    };

    const response = await fetch(`${checkout}/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(
        ctx,
        `Ualá create order failed: ${response.status}`,
        err,
      );
      throw new Error(`Ualá order creation failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      uuid: string;
      links: { checkout_link: string };
    };
    this.logger.log(
      ctx,
      `Ualá order created: ${data.uuid} for transaction ${transactionId}`,
    );
    return { providerOrderId: data.uuid, checkoutUrl: data.links.checkout_link };
  }

  async getOrder(
    ctx: Ctx,
    providerOrderId: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<GatewayProviderOrderStatus> {
    const token = await this.getToken(ctx, paymentMethod);
    const { checkout } = this.getBaseUrls();

    const response = await fetch(`${checkout}/orders/${providerOrderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      this.logger.error(
        ctx,
        `Ualá get order failed: ${response.status} for ${providerOrderId}`,
      );
      throw new Error(`Ualá get order failed: ${response.status}`);
    }

    const data = (await response.json()) as { status: string };
    return this.mapStatus(data.status);
  }

  async refundOrder(
    ctx: Ctx,
    providerOrderId: string,
    amount: GatewayProviderMoney,
    paymentMethod: PaymentMethodOption,
  ): Promise<void> {
    const token = await this.getToken(ctx, paymentMethod);
    const { checkout } = this.getBaseUrls();
    const backendBaseUrl =
      this.configService.get<string>('app.backendUrl') ?? '';

    const response = await fetch(
      `${checkout}/orders/${providerOrderId}/refund`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: this.centsToDecimalString(amount.amount),
          notification_url: `${backendBaseUrl}/api/payments/webhook/uala-bis`,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      this.logger.error(
        ctx,
        `Ualá refund failed: ${response.status} for ${providerOrderId}`,
        err,
      );
      throw new Error(
        `Ualá refund failed: ${response.status} — ${JSON.stringify(err)}`,
      );
    }

    this.logger.log(
      ctx,
      `Ualá refund initiated for order ${providerOrderId}`,
    );
  }
}
