import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { IdentityVerificationRepository } from './identity-verification.repository';
import { UsersService } from '../users/users.service';
import {
  FILE_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../../common/storage/file-storage-provider.interface';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { IdentityVerificationRequest } from './identity-verification.domain';
import {
  IdentityVerificationStatus,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  type IdentityDocumentMimeType,
} from './identity-verification.domain';
import type {
  IdentityVerificationWithUser,
  ListIdentityVerificationsResponse,
} from './identity-verification.api';
import { UserLevel } from '../users/users.domain';

@Injectable()
export class IdentityVerificationService {
  private readonly logger = new ContextLogger(IdentityVerificationService.name);

  constructor(
    @Inject(IdentityVerificationRepository)
    private readonly repository: IdentityVerificationRepository,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(FILE_STORAGE_PROVIDER)
    private readonly storageProvider: FileStorageProvider,
  ) {}

  private generateId(): string {
    return `idv_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private generateStorageKey(
    userId: string,
    side: 'front' | 'back',
    originalFilename: string,
  ): string {
    const timestamp = Date.now();
    const uuid = randomBytes(6).toString('hex');
    const ext = originalFilename.split('.').pop() || 'jpg';
    return `identity-docs/${userId}_${side}_${timestamp}_${uuid}.${ext}`;
  }

  private validateFile(
    file: { mimetype: string; size: number },
    fieldName: string,
  ): void {
    if (
      !ALLOWED_DOCUMENT_MIME_TYPES.includes(
        file.mimetype as IdentityDocumentMimeType,
      )
    ) {
      throw new BadRequestException(
        `Invalid file type for ${fieldName}. Allowed: ${ALLOWED_DOCUMENT_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new BadRequestException(
        `File ${fieldName} too large. Maximum size: ${MAX_DOCUMENT_SIZE_BYTES / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * Submit identity verification request
   */
  async submitVerification(
    ctx: Ctx,
    userId: string,
    data: {
      legalFirstName: string;
      legalLastName: string;
      dateOfBirth: string;
      governmentIdNumber: string;
    },
    documentFront: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    documentBack: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ): Promise<IdentityVerificationRequest> {
    this.logger.log(ctx, `Submitting identity verification for user ${userId}`);

    const user = await this.usersService.findById(ctx, userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.level === UserLevel.VerifiedSeller) {
      throw new ConflictException('User is already a verified seller');
    }

    const existing = await this.repository.findByUserId(ctx, userId);
    if (existing) {
      if (existing.status === IdentityVerificationStatus.Pending) {
        throw new ConflictException(
          'You already have a pending verification request',
        );
      }
      if (existing.status === IdentityVerificationStatus.Approved) {
        throw new ConflictException('Your identity is already verified');
      }
    }

    this.validateFile(documentFront, 'documentFront');
    this.validateFile(documentBack, 'documentBack');

    if (
      !data.legalFirstName ||
      !data.legalLastName ||
      !data.dateOfBirth ||
      !data.governmentIdNumber
    ) {
      throw new BadRequestException('All identity fields are required');
    }

    const frontStorageKey = this.generateStorageKey(
      userId,
      'front',
      documentFront.originalname,
    );
    const backStorageKey = this.generateStorageKey(
      userId,
      'back',
      documentBack.originalname,
    );

    await Promise.all([
      this.storageProvider.store(frontStorageKey, documentFront.buffer, {
        contentType: documentFront.mimetype,
        contentLength: documentFront.size,
        originalFilename: documentFront.originalname,
      }),
      this.storageProvider.store(backStorageKey, documentBack.buffer, {
        contentType: documentBack.mimetype,
        contentLength: documentBack.size,
        originalFilename: documentBack.originalname,
      }),
    ]);

    const verification: IdentityVerificationRequest = {
      id: this.generateId(),
      userId,
      legalFirstName: data.legalFirstName,
      legalLastName: data.legalLastName,
      dateOfBirth: data.dateOfBirth,
      governmentIdNumber: data.governmentIdNumber,
      documentFrontStorageKey: frontStorageKey,
      documentFrontFilename: documentFront.originalname,
      documentBackStorageKey: backStorageKey,
      documentBackFilename: documentBack.originalname,
      status: IdentityVerificationStatus.Pending,
      submittedAt: new Date(),
    };

    await this.repository.save(ctx, verification);

    this.logger.log(
      ctx,
      `Identity verification ${verification.id} submitted for user ${userId}`,
    );

    return verification;
  }

  /**
   * Get current user's verification request
   */
  async getMyVerification(
    ctx: Ctx,
    userId: string,
  ): Promise<IdentityVerificationRequest | null> {
    const verification = await this.repository.findByUserId(ctx, userId);
    return verification || null;
  }

  /**
   * List all verifications with optional status filter (admin only)
   */
  async listVerifications(
    ctx: Ctx,
    status?: IdentityVerificationStatus,
  ): Promise<ListIdentityVerificationsResponse> {
    const verifications = await this.repository.findAll(ctx, status);

    const userIds = [...new Set(verifications.map((v) => v.userId))];
    const users = await this.usersService.findByIds(ctx, userIds);
    const usersMap = new Map(users.map((u) => [u.id, u]));

    const verificationsWithUsers: IdentityVerificationWithUser[] =
      verifications.map((v) => {
        const user = usersMap.get(v.userId);
        return {
          ...v,
          userEmail: user?.email ?? 'Unknown',
          userPublicName: user?.publicName ?? 'Unknown',
        };
      });

    verificationsWithUsers.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );

    return {
      verifications: verificationsWithUsers,
      total: verificationsWithUsers.length,
    };
  }

  /**
   * Get document file content (admin only)
   */
  async getDocumentFile(
    ctx: Ctx,
    verificationId: string,
    documentType: 'front' | 'back',
  ): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
    const verification = await this.repository.findById(ctx, verificationId);
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    const storageKey =
      documentType === 'front'
        ? verification.documentFrontStorageKey
        : verification.documentBackStorageKey;

    const filename =
      documentType === 'front'
        ? verification.documentFrontFilename
        : verification.documentBackFilename;

    const buffer = await this.storageProvider.retrieve(storageKey);
    if (!buffer) {
      this.logger.warn(
        ctx,
        `Document file not found in storage for verification ${verificationId}`,
      );
      return null;
    }

    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    return {
      buffer,
      contentType,
      filename,
    };
  }

  /**
   * Update verification status (admin only)
   */
  async updateStatus(
    ctx: Ctx,
    verificationId: string,
    adminId: string,
    status: 'approved' | 'rejected',
    adminNotes?: string,
  ): Promise<IdentityVerificationRequest> {
    const verification = await this.repository.findById(ctx, verificationId);
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    if (verification.status !== IdentityVerificationStatus.Pending) {
      throw new BadRequestException(
        'Only pending verifications can be reviewed',
      );
    }

    const newStatus =
      status === 'approved'
        ? IdentityVerificationStatus.Approved
        : IdentityVerificationStatus.Rejected;

    const updatedVerification: IdentityVerificationRequest = {
      ...verification,
      status: newStatus,
      adminNotes,
      reviewedBy: adminId,
      reviewedAt: new Date(),
    };

    await this.repository.save(ctx, updatedVerification);

    if (status === 'approved') {
      await this.usersService.upgradeToVerifiedSeller(
        ctx,
        verification.userId,
        {
          legalFirstName: verification.legalFirstName,
          legalLastName: verification.legalLastName,
          dateOfBirth: verification.dateOfBirth,
          governmentIdNumber: verification.governmentIdNumber,
        },
      );
    }

    this.logger.log(
      ctx,
      `Identity verification ${verificationId} ${status} by admin ${adminId}`,
    );

    return updatedVerification;
  }

  /**
   * Get count of pending verifications (admin use)
   */
  async getPendingCount(ctx: Ctx): Promise<number> {
    return this.repository.countPending(ctx);
  }
}
