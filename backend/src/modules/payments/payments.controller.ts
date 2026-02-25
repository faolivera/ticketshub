import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
  UseGuards,
  Inject,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { WebhookResponse, GetPaymentStatusResponse } from './payments.api';

@Controller('api/payments')
export class PaymentsController {
  constructor(
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Webhook endpoint for payment provider
   * Note: In production, implement signature verification
   */
  @Post('webhook')
  async handleWebhook(
    @Context() ctx: Ctx,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-signature') signature?: string,
  ): Promise<ApiResponse<WebhookResponse>> {
    const payload = req.body;

    const result = await this.paymentsService.processWebhook(ctx, payload);

    return {
      success: true,
      data: {
        received: true,
        processed: result.processed,
        error: result.error,
      },
    };
  }

  /**
   * Get payment status by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getPaymentStatus(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetPaymentStatusResponse>> {
    const payment = await this.paymentsService.getPaymentIntent(ctx, id);
    return { success: true, data: payment };
  }

  /**
   * Mock endpoint to simulate payment confirmation (for testing)
   * In production, this would be handled by the webhook
   */
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmPayment(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetPaymentStatusResponse>> {
    const payment = await this.paymentsService.confirmPayment(ctx, id);
    return { success: true, data: payment };
  }
}
