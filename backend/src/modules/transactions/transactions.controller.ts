import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { JWTPayload } from '../users/users.domain';
import type {
  InitiatePurchaseRequest,
  InitiatePurchaseResponse,
  ConfirmTransferResponse,
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
  GetTransactionResponse,
} from './transactions.api';

@Controller('api/transactions')
export class TransactionsController {
  constructor(
    @Inject(TransactionsService)
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Initiate a purchase
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async initiatePurchase(
    @Context() ctx: Ctx,
    @User() user: JWTPayload,
    @Body() body: InitiatePurchaseRequest,
  ): Promise<ApiResponse<InitiatePurchaseResponse>> {
    const result = await this.transactionsService.initiatePurchase(
      ctx,
      user.userId,
      body.listingId,
      body.ticketUnitIds,
    );
    return { success: true, data: result };
  }

  /**
   * Get transaction by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTransaction(
    @Context() ctx: Ctx,
    @User() user: JWTPayload,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetTransactionResponse>> {
    const transaction = await this.transactionsService.getTransactionById(ctx, id, user.userId);
    return { success: true, data: transaction };
  }

  /**
   * Confirm ticket transfer (seller)
   */
  @Post(':id/transfer')
  @UseGuards(JwtAuthGuard)
  async confirmTransfer(
    @Context() ctx: Ctx,
    @User() user: JWTPayload,
    @Param('id') id: string,
  ): Promise<ApiResponse<ConfirmTransferResponse>> {
    const transaction = await this.transactionsService.confirmTransfer(ctx, id, user.userId);
    return { success: true, data: transaction };
  }

  /**
   * Confirm receipt (buyer)
   */
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmReceipt(
    @Context() ctx: Ctx,
    @User() user: JWTPayload,
    @Param('id') id: string,
    @Body() body: ConfirmReceiptRequest,
  ): Promise<ApiResponse<ConfirmReceiptResponse>> {
    if (!body.confirmed) {
      throw new Error('Receipt must be confirmed');
    }
    const transaction = await this.transactionsService.confirmReceipt(ctx, id, user.userId);
    return { success: true, data: transaction };
  }

  /**
   * Cancel transaction
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelTransaction(
    @Context() ctx: Ctx,
    @User() user: JWTPayload,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ cancelled: boolean }>> {
    await this.transactionsService.cancelTransaction(ctx, id, user.userId);
    return { success: true, data: { cancelled: true } };
  }

  /**
   * Handle payment confirmation (for testing - in production use webhook)
   */
  @Post(':id/payment-received')
  @UseGuards(JwtAuthGuard)
  async handlePaymentReceived(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetTransactionResponse>> {
    const transaction = await this.transactionsService.handlePaymentReceived(ctx, id);
    return { success: true, data: transaction as any };
  }
}
