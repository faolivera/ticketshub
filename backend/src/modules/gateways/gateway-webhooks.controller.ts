import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Context } from '../../common/decorators/ctx.decorator';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import { GatewayPaymentsService } from './gateway-payments.service';

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
   * MercadoPago webhook (placeholder — not yet implemented).
   */
  @Post('mercadopago')
  @HttpCode(HttpStatus.OK)
  async handleMercadoPago(
    @Context() ctx: Ctx,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    this.logger.log(ctx, 'MercadoPago webhook received (not yet implemented)', body);
    return { received: true };
  }
}
