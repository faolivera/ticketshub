import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Multer } from 'multer';
import { PaymentConfirmationsService } from './payment-confirmations.service';
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
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  type PaymentConfirmationMimeType,
} from './payment-confirmations.domain';
import type {
  UploadPaymentConfirmationResponse,
  GetPaymentConfirmationResponse,
  ListPaymentConfirmationsResponse,
  UpdateConfirmationStatusRequest,
  UpdateConfirmationStatusResponse,
} from './payment-confirmations.api';

@Controller('api')
export class PaymentConfirmationsController {
  constructor(
    @Inject(PaymentConfirmationsService)
    private readonly service: PaymentConfirmationsService,
  ) {}

  /**
   * Upload payment confirmation for a transaction.
   * Only the buyer can upload, and only when transaction is PendingPayment.
   */
  @Post('transactions/:transactionId/payment-confirmation')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (
          ALLOWED_MIME_TYPES.includes(
            file.mimetype as PaymentConfirmationMimeType,
          )
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadConfirmation(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('transactionId') transactionId: string,
    @UploadedFile() file: Multer.File,
  ): Promise<ApiResponse<UploadPaymentConfirmationResponse>> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const confirmation = await this.service.uploadConfirmation(
      ctx,
      transactionId,
      user.id,
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    );

    return { success: true, data: { confirmation } };
  }

  /**
   * Get payment confirmation metadata for a transaction.
   * Accessible by buyer, seller, or admin.
   */
  @Get('transactions/:transactionId/payment-confirmation')
  @UseGuards(JwtAuthGuard)
  async getConfirmation(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('transactionId') transactionId: string,
  ): Promise<ApiResponse<GetPaymentConfirmationResponse>> {
    const confirmation = await this.service.getConfirmationByTransaction(
      ctx,
      transactionId,
      user.id,
      user.role,
    );

    return { success: true, data: { confirmation } };
  }

  /**
   * Download/view the confirmation file.
   * Returns file stream. Accessible by buyer, seller, or admin.
   */
  @Get('transactions/:transactionId/payment-confirmation/file')
  @UseGuards(JwtAuthGuard)
  async downloadFile(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('transactionId') transactionId: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.service.getFileContent(
      ctx,
      transactionId,
      user.id,
      user.role,
    );

    if (!result) {
      res.status(404).json({ success: false, error: 'File not found' });
      return;
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${result.filename}"`,
    );
    res.send(result.buffer);
  }

  /**
   * List all pending payment confirmations (admin only).
   */
  @Get('admin/payment-confirmations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async listPendingConfirmations(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<ListPaymentConfirmationsResponse>> {
    const result = await this.service.listPendingConfirmations(ctx);
    return { success: true, data: result };
  }

  /**
   * Update confirmation status (admin only).
   * When updateTransaction is true (default), also approves/rejects the associated transaction.
   */
  @Patch('admin/payment-confirmations/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateStatus(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') confirmationId: string,
    @Body() body: UpdateConfirmationStatusRequest,
  ): Promise<ApiResponse<UpdateConfirmationStatusResponse>> {
    const confirmation = await this.service.updateStatus(
      ctx,
      confirmationId,
      user.id,
      body.status,
      body.adminNotes,
      body.updateTransaction ?? true,
    );

    return { success: true, data: confirmation };
  }
}
