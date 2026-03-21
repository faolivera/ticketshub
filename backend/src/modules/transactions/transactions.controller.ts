import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Inject,
  forwardRef,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionsService } from './transactions.service';
import { TransactionChatService } from '../transaction-chat/transaction-chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import { Role } from '../users/users.domain';
import {
  RequiredActor,
  CancellationReason,
  PROOF_ALLOWED_MIME_TYPES,
  PROOF_FILE_MAX_SIZE_BYTES,
  type ProofFileMimeType,
} from './transactions.domain';
import type {
  InitiatePurchaseRequest,
  InitiatePurchaseResponse,
  ConfirmTransferRequest,
  ConfirmTransferResponse,
  ConfirmReceiptRequest,
  ConfirmReceiptResponse,
  UploadTransferProofResponse,
  UploadReceiptProofResponse,
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
    @Inject(forwardRef(() => TransactionChatService))
    private readonly transactionChatService: TransactionChatService,
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
      body.offerId,
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
   * Upload transfer proof file (seller only, status PaymentReceived).
   * Returns storageKey to send in confirmTransfer body.
   */
  @Post(':id/transfer-proof')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: PROOF_FILE_MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (
          PROOF_ALLOWED_MIME_TYPES.includes(file.mimetype as ProofFileMimeType)
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type. Allowed: ${PROOF_ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadTransferProof(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse<UploadTransferProofResponse>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const result = await this.transactionsService.uploadTransferProof(
      ctx,
      id,
      user.id,
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    );
    return { success: true, data: result };
  }

  /**
   * Confirm ticket transfer (seller). Optional payloadType and optional transferProof (from transfer-proof upload).
   */
  @Post(':id/transfer')
  @UseGuards(JwtAuthGuard)
  async confirmTransfer(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
    @Body() body: ConfirmTransferRequest,
  ): Promise<ApiResponse<ConfirmTransferResponse>> {
    const transaction = await this.transactionsService.confirmTransfer(
      ctx,
      id,
      user.id,
      body.payloadType,
      body.transferProof,
      body.transferProofOriginalFilename,
      body.payloadTypeOtherText,
    );
    if (body.payloadType) {
      this.transactionChatService
        .createDeliveryMessage(ctx, id, user.id, body.payloadType)
        .catch(() => {
          // Non-blocking: delivery event in chat is best-effort; transaction is already updated
        });
    }
    return { success: true, data: transaction };
  }

  /**
   * Upload receipt proof file (buyer only, status TicketTransferred).
   * Returns storageKey to send in confirmReceipt body.
   */
  @Post(':id/receipt-proof')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: PROOF_FILE_MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (
          PROOF_ALLOWED_MIME_TYPES.includes(file.mimetype as ProofFileMimeType)
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type. Allowed: ${PROOF_ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadReceiptProof(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ApiResponse<UploadReceiptProofResponse>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const result = await this.transactionsService.uploadReceiptProof(
      ctx,
      id,
      user.id,
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    );
    return { success: true, data: result };
  }

  /**
   * Confirm receipt (buyer). Optional receiptProof (from receipt-proof upload).
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
      throw new BadRequestException('Receipt must be confirmed');
    }
    const transaction = await this.transactionsService.confirmReceipt(
      ctx,
      id,
      user.id,
      body.receiptProof,
      body.receiptProofOriginalFilename,
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
