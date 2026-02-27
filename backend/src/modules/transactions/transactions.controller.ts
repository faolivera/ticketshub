import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import { Role } from '../users/users.domain';
import { RequiredActor, CancellationReason } from './transactions.domain';
import type {
  InitiatePurchaseRequest,
  InitiatePurchaseResponse,
  ConfirmTransferResponse,
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
  GetTransactionResponse,
  GetPendingPaymentsResponse,
  ApprovePaymentRequest,
  ApprovePaymentResponse,
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
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: InitiatePurchaseRequest,
  ): Promise<ApiResponse<InitiatePurchaseResponse>> {
    const result = await this.transactionsService.initiatePurchase(
      ctx,
      user.id,
      body.listingId,
      body.ticketUnitIds,
      body.paymentMethodId,
      body.pricingSnapshotId,
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
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetTransactionResponse>> {
    const transaction = await this.transactionsService.getTransactionById(
      ctx,
      id,
      user.id,
    );
    return { success: true, data: transaction };
  }

  /**
   * Confirm ticket transfer (seller)
   */
  @Post(':id/transfer')
  @UseGuards(JwtAuthGuard)
  async confirmTransfer(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
  ): Promise<ApiResponse<ConfirmTransferResponse>> {
    const transaction = await this.transactionsService.confirmTransfer(
      ctx,
      id,
      user.id,
    );
    return { success: true, data: transaction };
  }

  /**
   * Confirm receipt (buyer)
   */
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  async confirmReceipt(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
    @Body() body: ConfirmReceiptRequest,
  ): Promise<ApiResponse<ConfirmReceiptResponse>> {
    if (!body.confirmed) {
      throw new Error('Receipt must be confirmed');
    }
    const transaction = await this.transactionsService.confirmReceipt(
      ctx,
      id,
      user.id,
    );
    return { success: true, data: transaction };
  }

  /**
   * Cancel transaction
   */
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelTransaction(
    @Context() ctx: Ctx,
    @Param('id') id: string,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<{ cancelled: boolean }>> {
    // Verify user is the buyer
    const transaction = await this.transactionsService.findById(ctx, id);
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    if (transaction.buyerId !== user.id) {
      throw new ForbiddenException('Only buyer can cancel transaction');
    }

    await this.transactionsService.cancelTransaction(
      ctx,
      id,
      RequiredActor.Buyer,
      CancellationReason.BuyerCancelled,
    );
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
    const transaction = await this.transactionsService.handlePaymentReceived(
      ctx,
      id,
    );
    return { success: true, data: transaction as any };
  }

  /**
   * Get transactions pending manual payment approval (admin only)
   */
  @Get('admin/pending-payments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getPendingManualPayments(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<GetPendingPaymentsResponse>> {
    const result = await this.transactionsService.getPendingManualPayments(ctx);
    return { success: true, data: result };
  }

  /**
   * Approve or reject manual payment (admin only)
   */
  @Patch(':id/approve-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async approveManualPayment(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') transactionId: string,
    @Body() body: ApprovePaymentRequest,
  ): Promise<ApiResponse<ApprovePaymentResponse>> {
    const transaction = await this.transactionsService.approveManualPayment(
      ctx,
      transactionId,
      user.id,
      body.approved,
      body.rejectionReason,
    );
    return { success: true, data: transaction };
  }
}
