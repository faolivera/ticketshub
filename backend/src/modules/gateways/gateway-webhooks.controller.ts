import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Context } from '../../common/decorators/ctx.decorator';
import { ContextLogger, redact } from '../../common/logger';
import type { Ctx } from '../../common/types/context';
import { GatewayPaymentsService } from './gateway-payments.service';

@SkipThrottle()
@Controller('api/payments/webhook')
export class GatewayWebhooksController {
  private readonly logger = new ContextLogger(GatewayWebhooksController.name);

  constructor(private readonly gatewayPaymentsService: GatewayPaymentsService) {}

  /**
   * Ualá Bis webhook.
   * Payload contains the order UUID — we verify by calling provider.getOrder()
   * (no signature to validate, per Ualá Bis API).
   */
  @Post('uala-bis')
  @HttpCode(HttpStatus.OK)
  async handleUalaBis(
    @Context() ctx: Ctx,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const providerOrderId = body['uuid'] as string | undefined;

    if (!providerOrderId) {
      this.logger.error(ctx, 'Ualá Bis webhook missing uuid', body);
      // Return 200 to prevent Ualá retrying — we log and ignore malformed payloads
      return { received: true };
    }

    this.logger.log(ctx, `Ualá Bis webhook received for order ${providerOrderId}`);

    await this.gatewayPaymentsService.handleOrderUpdate(ctx, providerOrderId).catch((err) => {
      this.logger.error(ctx, `Ualá Bis webhook processing failed for ${providerOrderId}`, err);
    });

    return { received: true };
  }

  /**
   * MercadoPago webhook.
   * MP sends: { type: "payment", data: { id: "paymentId" }, ... }
   * We only act on type=payment; other types (e.g. "test") are acknowledged and ignored.
   * No signature validation — MP webhook secret not configured.
   */
  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPago(
    @Context() ctx: Ctx,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    const type = body['type'] as string | undefined;
    const dataId = (body['data'] as Record<string, unknown> | undefined)?.['id'] as string | undefined;

    this.logger.log(ctx, "MP webhook " + JSON.stringify(body))

    if (type !== 'payment') {
      this.logger.log(ctx, `MP webhook received with type=${type ?? 'unknown'}, ignoring`, redact(body));
      return { received: true };
    }

    if (!dataId) {
      this.logger.error(ctx, 'MP webhook missing data.id', body);
      return { received: true };
    }

    this.logger.log(ctx, `MP webhook received for payment ${dataId}`);

    await this.gatewayPaymentsService.handleMercadoPagoWebhook(ctx, dataId).catch((err) => {
      this.logger.error(ctx, `MP webhook processing failed for payment ${dataId}`, err);
    });

    return { received: true };
  }
}
