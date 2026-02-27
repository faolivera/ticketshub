import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { Multer } from 'multer';
import { IdentityVerificationService } from './identity-verification.service';
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
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  IdentityVerificationStatus,
  type IdentityDocumentMimeType,
} from './identity-verification.domain';
import type {
  SubmitIdentityVerificationResponse,
  GetMyVerificationResponse,
  ListIdentityVerificationsResponse,
  UpdateVerificationStatusRequest,
  UpdateVerificationStatusResponse,
} from './identity-verification.api';

@Controller('api')
export class IdentityVerificationController {
  constructor(
    @Inject(IdentityVerificationService)
    private readonly service: IdentityVerificationService,
  ) {}

  /**
   * Submit identity verification request.
   * Requires two images: documentFront and documentBack
   */
  @Post('users/identity-verification')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'documentFront', maxCount: 1 },
        { name: 'documentBack', maxCount: 1 },
      ],
      {
        limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES },
        fileFilter: (_req, file, cb) => {
          if (
            ALLOWED_DOCUMENT_MIME_TYPES.includes(
              file.mimetype as IdentityDocumentMimeType,
            )
          ) {
            cb(null, true);
          } else {
            cb(
              new BadRequestException(
                `Invalid file type. Allowed: ${ALLOWED_DOCUMENT_MIME_TYPES.join(', ')}`,
              ),
              false,
            );
          }
        },
      },
    ),
  )
  async submitVerification(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: { legalFirstName: string; legalLastName: string; dateOfBirth: string; governmentIdNumber: string },
    @UploadedFiles()
    files: {
      documentFront?: Multer.File[];
      documentBack?: Multer.File[];
    },
  ): Promise<ApiResponse<SubmitIdentityVerificationResponse>> {
    if (!files?.documentFront?.[0]) {
      throw new BadRequestException('Front of ID document is required');
    }
    if (!files?.documentBack?.[0]) {
      throw new BadRequestException('Back of ID document is required');
    }

    const frontFile = files.documentFront[0];
    const backFile = files.documentBack[0];

    const verification = await this.service.submitVerification(
      ctx,
      user.id,
      {
        legalFirstName: body.legalFirstName,
        legalLastName: body.legalLastName,
        dateOfBirth: body.dateOfBirth,
        governmentIdNumber: body.governmentIdNumber,
      },
      {
        buffer: frontFile.buffer,
        originalname: frontFile.originalname,
        mimetype: frontFile.mimetype,
        size: frontFile.size,
      },
      {
        buffer: backFile.buffer,
        originalname: backFile.originalname,
        mimetype: backFile.mimetype,
        size: backFile.size,
      },
    );

    return { success: true, data: { verification } };
  }

  /**
   * Get current user's identity verification status
   */
  @Get('users/identity-verification')
  @UseGuards(JwtAuthGuard)
  async getMyVerification(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<GetMyVerificationResponse>> {
    const verification = await this.service.getMyVerification(ctx, user.id);
    return { success: true, data: { verification } };
  }

  /**
   * List all identity verifications (admin only)
   */
  @Get('admin/identity-verifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async listVerifications(
    @Context() ctx: Ctx,
    @Query('status') status?: string,
  ): Promise<ApiResponse<ListIdentityVerificationsResponse>> {
    let statusFilter: IdentityVerificationStatus | undefined;
    if (status && Object.values(IdentityVerificationStatus).includes(status as IdentityVerificationStatus)) {
      statusFilter = status as IdentityVerificationStatus;
    }

    const result = await this.service.listVerifications(ctx, statusFilter);
    return { success: true, data: result };
  }

  /**
   * Get document file for a verification (admin only)
   */
  @Get('admin/identity-verifications/:id/document/:type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getDocumentFile(
    @Context() ctx: Ctx,
    @Param('id') verificationId: string,
    @Param('type') documentType: string,
    @Res() res: Response,
  ): Promise<void> {
    if (documentType !== 'front' && documentType !== 'back') {
      res.status(400).json({ success: false, error: 'Invalid document type' });
      return;
    }

    const result = await this.service.getDocumentFile(
      ctx,
      verificationId,
      documentType,
    );

    if (!result) {
      res.status(404).json({ success: false, error: 'Document not found' });
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
   * Update verification status (admin only)
   */
  @Patch('admin/identity-verifications/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateStatus(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') verificationId: string,
    @Body() body: UpdateVerificationStatusRequest,
  ): Promise<ApiResponse<UpdateVerificationStatusResponse>> {
    if (body.status !== 'approved' && body.status !== 'rejected') {
      throw new BadRequestException('Status must be "approved" or "rejected"');
    }

    const verification = await this.service.updateStatus(
      ctx,
      verificationId,
      user.id,
      body.status,
      body.adminNotes,
    );

    return { success: true, data: verification };
  }
}
