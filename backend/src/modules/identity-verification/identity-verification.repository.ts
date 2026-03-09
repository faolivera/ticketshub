import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  IdentityVerificationRequest as PrismaIdentityVerificationRequest,
  IdentityVerificationStatus as PrismaIdentityVerificationStatus,
} from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import type { IdentityVerificationRequest } from './identity-verification.domain';
import { IdentityVerificationStatus } from './identity-verification.domain';
import type { IIdentityVerificationRepository } from './identity-verification.repository.interface';

@Injectable()
export class IdentityVerificationRepository implements IIdentityVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(
    _ctx: Ctx,
    verification: IdentityVerificationRequest,
  ): Promise<void> {
    const data = this.mapToDbData(verification);

    await this.prisma.identityVerificationRequest.upsert({
      where: { id: verification.id },
      create: {
        id: verification.id,
        ...data,
      },
      update: data,
    });
  }

  async findById(
    _ctx: Ctx,
    id: string,
  ): Promise<IdentityVerificationRequest | undefined> {
    const record = await this.prisma.identityVerificationRequest.findUnique({
      where: { id },
    });
    return record ? this.mapToDomain(record) : undefined;
  }

  async findByUserId(
    _ctx: Ctx,
    userId: string,
  ): Promise<IdentityVerificationRequest | undefined> {
    const record = await this.prisma.identityVerificationRequest.findFirst({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });
    return record ? this.mapToDomain(record) : undefined;
  }

  async findAll(
    _ctx: Ctx,
    status?: IdentityVerificationStatus,
  ): Promise<IdentityVerificationRequest[]> {
    const records = await this.prisma.identityVerificationRequest.findMany({
      where: status ? { status: this.mapStatusToDb(status) } : undefined,
      orderBy: { submittedAt: 'desc' },
    });
    return records.map((r) => this.mapToDomain(r));
  }

  async findAllPending(ctx: Ctx): Promise<IdentityVerificationRequest[]> {
    void ctx;
    const records = await this.prisma.identityVerificationRequest.findMany({
      where: { status: 'pending' },
      orderBy: { submittedAt: 'desc' },
    });
    return records.map((r) => this.mapToDomain(r));
  }

  async countPending(ctx: Ctx): Promise<number> {
    void ctx;
    return this.prisma.identityVerificationRequest.count({
      where: { status: 'pending' },
    });
  }

  private mapStatusToDb(
    status: IdentityVerificationStatus,
  ): PrismaIdentityVerificationStatus {
    const statusMap: Record<
      IdentityVerificationStatus,
      PrismaIdentityVerificationStatus
    > = {
      [IdentityVerificationStatus.Pending]: 'pending',
      [IdentityVerificationStatus.Approved]: 'approved',
      [IdentityVerificationStatus.Rejected]: 'rejected',
    };
    return statusMap[status];
  }

  private mapStatusFromDb(
    status: PrismaIdentityVerificationStatus,
  ): IdentityVerificationStatus {
    const statusMap: Record<
      PrismaIdentityVerificationStatus,
      IdentityVerificationStatus
    > = {
      pending: IdentityVerificationStatus.Pending,
      approved: IdentityVerificationStatus.Approved,
      rejected: IdentityVerificationStatus.Rejected,
    };
    return statusMap[status];
  }

  private mapToDomain(
    record: PrismaIdentityVerificationRequest,
  ): IdentityVerificationRequest {
    const [frontKey = '', backKey = ''] = record.documentImageIds;
    const frontFilename = this.extractFilenameFromKey(frontKey);
    const backFilename = this.extractFilenameFromKey(backKey);

    return {
      id: record.id,
      userId: record.userId,
      legalFirstName: record.legalFirstName,
      legalLastName: record.legalLastName,
      dateOfBirth: record.dateOfBirth,
      governmentIdNumber: record.governmentIdNumber,
      documentFrontStorageKey: frontKey,
      documentFrontFilename: frontFilename,
      documentBackStorageKey: backKey,
      documentBackFilename: backFilename,
      selfieStorageKey: record.selfieImageId ?? '',
      selfieFilename: record.selfieImageId
        ? this.extractFilenameFromKey(record.selfieImageId)
        : '',
      status: this.mapStatusFromDb(record.status),
      adminNotes: record.rejectionReason ?? undefined,
      reviewedBy: record.reviewedBy ?? undefined,
      submittedAt: record.submittedAt,
      reviewedAt: record.reviewedAt ?? undefined,
    };
  }

  private mapToDbData(verification: IdentityVerificationRequest): {
    userId: string;
    status: PrismaIdentityVerificationStatus;
    legalFirstName: string;
    legalLastName: string;
    dateOfBirth: string;
    governmentIdNumber: string;
    documentImageIds: string[];
    selfieImageId: string | null;
    submittedAt: Date;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    rejectionReason: string | null;
  } {
    return {
      userId: verification.userId,
      status: this.mapStatusToDb(verification.status),
      legalFirstName: verification.legalFirstName,
      legalLastName: verification.legalLastName,
      dateOfBirth: verification.dateOfBirth,
      governmentIdNumber: verification.governmentIdNumber,
      documentImageIds: [
        verification.documentFrontStorageKey,
        verification.documentBackStorageKey,
      ],
      selfieImageId: verification.selfieStorageKey || null,
      submittedAt: verification.submittedAt,
      reviewedAt: verification.reviewedAt ?? null,
      reviewedBy: verification.reviewedBy ?? null,
      rejectionReason: verification.adminNotes ?? null,
    };
  }

  private extractFilenameFromKey(storageKey: string): string {
    if (!storageKey) return '';
    const parts = storageKey.split('/');
    return parts[parts.length - 1] || storageKey;
  }
}
