import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  IDENTITY_VERIFICATION_REPOSITORY,
  type IIdentityVerificationRepository,
} from './identity-verification.repository.interface';
import { UsersService } from '../users/users.service';
import {
  PRIVATE_STORAGE_PROVIDER,
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
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationEventType } from '../notifications/notifications.domain';
import type {
  IdentityVerificationPublic,
  IdentityVerificationWithUser,
  ListIdentityVerificationsResponse,
} from './identity-verification.api';
import { VerificationHelper } from '../../common/utils/verification-helper';

@Injectable()
export class IdentityVerificationService {
  private readonly logger = new ContextLogger(IdentityVerificationService.name);

  constructor(
    @Inject(IDENTITY_VERIFICATION_REPOSITORY)
    private readonly repository: IIdentityVerificationRepository,
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(PRIVATE_STORAGE_PROVIDER)
    private readonly storageProvider: FileStorageProvider,
    private readonly notificationsService: NotificationsService,
  ) {}

  private generateId(): string {
    return `idv_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private generateStorageKey(
    userId: string,
    side: 'front' | 'back' | 'selfie',
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
    selfie: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ): Promise<IdentityVerificationPublic> {
    this.logger.log(ctx, `Submitting identity verification for user ${userId}`);

    const user = await this.usersService.findById(ctx, userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (VerificationHelper.hasV3(user)) {
      throw new ConflictException('Your identity is already verified');
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
    this.validateFile(selfie, 'selfie');

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
    const selfieStorageKey = this.generateStorageKey(
      userId,
      'selfie',
      selfie.originalname,
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
      this.storageProvider.store(selfieStorageKey, selfie.buffer, {
        contentType: selfie.mimetype,
        contentLength: selfie.size,
        originalFilename: selfie.originalname,
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
      selfieStorageKey,
      selfieFilename: selfie.originalname,
      status: IdentityVerificationStatus.Pending,
      submittedAt: new Date(),
    };

    await this.repository.save(ctx, verification);

    this.logger.log(
      ctx,
      `Identity verification ${verification.id} submitted for user ${userId}`,
    );

    this.notificationsService
      .emit(ctx, NotificationEventType.IDENTITY_SUBMITTED, {
        userId,
        userName: `${data.legalFirstName} ${data.legalLastName}`.trim(),
      })
      .catch((err) =>
        this.logger.error(
          ctx,
          `Failed to emit IDENTITY_SUBMITTED: ${String(err)}`,
        ),
      );

    return this.toPublic(verification);
  }

  private toPublic(
    verification: IdentityVerificationRequest,
  ): IdentityVerificationPublic {
    const maskedGovId =
      verification.governmentIdNumber.length >= 4
        ? `••••••${verification.governmentIdNumber.slice(-4)}`
        : '••••';
    return {
      id: verification.id,
      status: verification.status,
      legalFirstName: verification.legalFirstName,
      legalLastName: verification.legalLastName,
      dateOfBirth: verification.dateOfBirth,
      governmentIdNumber: maskedGovId,
      submittedAt:
        verification.submittedAt instanceof Date
          ? verification.submittedAt.toISOString()
          : String(verification.submittedAt),
      reviewedAt: verification.reviewedAt
        ? verification.reviewedAt instanceof Date
          ? verification.reviewedAt.toISOString()
          : String(verification.reviewedAt)
        : undefined,
    };
  }

  /**
   * Get current user's verification request (public shape: no document keys, masked government ID).
   */
  async getMyVerification(
    ctx: Ctx,
    userId: string,
  ): Promise<IdentityVerificationPublic | null> {
    const verification = await this.repository.findByUserId(ctx, userId);
    return verification ? this.toPublic(verification) : null;
  }

  /**
   * Get identity verification status for a user (for GET /me). Returns 'none' when no request exists.
   */
  async getVerificationStatusForUser(
    ctx: Ctx,
    userId: string,
  ): Promise<'none' | 'pending' | 'approved' | 'rejected'> {
    const verification = await this.repository.findByUserId(ctx, userId);
    if (!verification) return 'none';
    return verification.status as 'none' | 'pending' | 'approved' | 'rejected';
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
        const bankAccountSummary = user?.bankAccount
          ? {
              verified: user.bankAccount.verified,
              holderName: user.bankAccount.holderName,
              cbuLast4:
                user.bankAccount.cbuOrCvu?.length >= 4
                  ? user.bankAccount.cbuOrCvu.slice(-4)
                  : undefined,
            }
          : null;
        return {
          ...v,
          userEmail: user?.email ?? 'Unknown',
          userPublicName: user?.publicName ?? 'Unknown',
          bankAccountSummary: bankAccountSummary ?? undefined,
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
   * Get document file content (admin only). Supports front, back, and selfie.
   */
  async getDocumentFile(
    ctx: Ctx,
    verificationId: string,
    documentType: 'front' | 'back' | 'selfie',
  ): Promise<{ buffer: Buffer; contentType: string; filename: string } | null> {
    const verification = await this.repository.findById(ctx, verificationId);
    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    const storageKey =
      documentType === 'front'
        ? verification.documentFrontStorageKey
        : documentType === 'back'
          ? verification.documentBackStorageKey
          : verification.selfieStorageKey;

    const filename =
      documentType === 'front'
        ? verification.documentFrontFilename
        : documentType === 'back'
          ? verification.documentBackFilename
          : verification.selfieFilename;

    if (!storageKey && documentType === 'selfie') {
      return null;
    }

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
      await this.usersService.setIdentityVerificationApproved(
        ctx,
        verification.userId,
        {
          legalFirstName: verification.legalFirstName,
          legalLastName: verification.legalLastName,
          dateOfBirth: verification.dateOfBirth,
          governmentIdNumber: verification.governmentIdNumber,
        },
      );

      // Emit identity verified notification
      this.notificationsService
        .emit(ctx, NotificationEventType.IDENTITY_VERIFIED, {
          userId: verification.userId,
          userName: `${verification.legalFirstName} ${verification.legalLastName}`,
        })
        .catch((err) =>
          this.logger.error(ctx, `Failed to emit IDENTITY_VERIFIED: ${err}`),
        );

      // If bank is already approved, seller verification is complete
      const userAfter = await this.usersService.findById(
        ctx,
        verification.userId,
      );
      if (userAfter?.bankAccount?.verified === true) {
        this.notificationsService
          .emit(ctx, NotificationEventType.SELLER_VERIFICATION_COMPLETE, {
            userId: verification.userId,
            userName: `${verification.legalFirstName} ${verification.legalLastName}`,
          })
          .catch((err) =>
            this.logger.error(
              ctx,
              `Failed to emit SELLER_VERIFICATION_COMPLETE: ${String(err)}`,
            ),
          );
      }
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
